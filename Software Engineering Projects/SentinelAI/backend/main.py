from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
import hashlib
import html
import json
import secrets
import sqlite3
import time
from cryptography.fernet import InvalidToken
from urllib.parse import urlparse
from fastapi import FastAPI, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import JSONResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware
from .config import Config, ROOT
from .db import Database, now, uid, encode
from .storage import Storage
from .security import user, require, scope, case_access, public_user, token_hash, verify_password, hash_password, REVIEWERS, RESPONDERS
from .schemas import Login, DemoLogin, Note, Decision, AlertAction, UserCreate, UserUpdate, Device, Phrase, SettingsUpdate, Reason, Hold
from .pipeline import Processor, STAGES, create_alert
from .intelligence import capabilities
from .seed import seed


def case_dict(row):
    d = dict(row)
    d["assessment"] = json.loads(d.get("assessment", "{}"))
    d["stages"] = json.loads(d.get("stages", "[]"))
    d.pop("sha256", None)
    return d


def detail(con, actor, case_id):
    case = case_dict(case_access(con, actor, case_id))
    case["evidence"] = [dict(r) for r in con.execute("SELECT id,kind,mime,size,sha256,source,start,end,created_at FROM evidence WHERE case_id=? AND kind!='original'", (case_id,))]
    case["segments"] = [dict(r) for r in con.execute("SELECT * FROM segments WHERE case_id=? ORDER BY start", (case_id,))]
    case["events"] = [dict(r) for r in con.execute("SELECT * FROM events WHERE case_id=? ORDER BY start", (case_id,))]
    for event in case["events"]:
        event["references"] = json.loads(event.pop("references_json"))
        event["signals"] = json.loads(event["signals"])
    case["notes"] = [dict(r) for r in con.execute("SELECT n.*,u.name AS author FROM notes n JOIN users u ON u.id=n.actor_id WHERE n.case_id=? ORDER BY created_at DESC", (case_id,))]
    case["reviews"] = [dict(r) for r in con.execute("SELECT r.*,u.name AS author FROM reviews r JOIN users u ON u.id=r.actor_id WHERE r.case_id=? ORDER BY created_at DESC", (case_id,))]
    case["alerts"] = [dict(r) for r in con.execute("SELECT * FROM alerts WHERE case_id=?", (case_id,))]
    visible, params = scope(actor)
    case["related"] = [dict(r) for r in con.execute(f"SELECT c.id,c.title,c.status,c.processing_status,CASE WHEN l.parent_id=? THEN 'supplement' ELSE 'parent' END AS relation FROM case_links l JOIN cases c ON c.id=CASE WHEN l.parent_id=? THEN l.child_id ELSE l.parent_id END WHERE (l.parent_id=? OR l.child_id=?) AND {visible}", [case_id,case_id,case_id,case_id,*params])]
    case["audit"] = [dict(r) for r in con.execute("SELECT a.seq,a.action,a.created_at,u.name AS author FROM audit a LEFT JOIN users u ON u.id=a.actor_id WHERE resource=? ORDER BY seq DESC LIMIT 100", (case_id,))]
    case["summary"] = {
        "observed": [{"text": f"{e['kind'].title()} artifact available ({e['source']}).", "references": [e["id"]]} for e in case["evidence"]],
        "interpretations": [{"text": e["detail"], "references": [e["id"], *e["references"]], "source": e["source"]} for e in case["events"]],
        "uncertainty": "These are review indicators, not findings of guilt. Read surrounding context and consider conflicting evidence.",
        "missing": case["assessment"].get("missing", ["Assessment not completed"]),
        "human_conclusions": [{"text": r["reason"], "action": r["action"], "author": r["author"], "reference": r["id"]} for r in case["reviews"] if r["action"] != "assign"],
    }
    case["can_retry"] = (actor["role"] in REVIEWERS or case["owner_id"] == actor["id"]) and case["processing_status"] == "failed" and bool(con.execute("SELECT 1 FROM evidence WHERE case_id=? AND kind='original'", (case_id,)).fetchone())
    return case


def create_app(config=None):
    config = config or Config.from_env()
    storage = Storage(config)
    db = Database(config.data_dir / "sentinel.db", storage.audit_key)
    processor = Processor(db, storage, config)

    @asynccontextmanager
    async def lifespan(app):
        seed(db, storage, config)
        if config.workers:
            processor.start()
        yield
        processor.stop()

    app = FastAPI(title="SentinelAI", version="1.0.0", lifespan=lifespan, docs_url="/api/docs" if config.demo else None, redoc_url=None)
    app.state.db, app.state.storage, app.state.config, app.state.processor = db, storage, config, processor
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=list(config.allowed_hosts))

    @app.middleware("http")
    async def security_headers(request, call_next):
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            origin = request.headers.get("origin")
            if origin and urlparse(origin).netloc != request.headers.get("host"):
                return JSONResponse({"detail": "Cross-origin requests are not allowed."}, status_code=403)
        try:
            size = int(request.headers.get("content-length", "0"))
        except ValueError:
            return JSONResponse({"detail": "Invalid content length."}, status_code=400)
        if size > config.max_upload + 1024 * 1024:
            return JSONResponse({"detail": "Upload exceeds the 100 MB limit."}, status_code=413)
        response = await call_next(request)
        if request.url.path.startswith('/api/') and response.status_code in (401,403,404) and request.url.path!='/api/auth/me':
            with db.transaction() as con:
                db.audit(con,None,'access.denied',request.url.path[:240],{'status':response.status_code})
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=(self)"
        if request.url.path.startswith("/api"):
            response.headers["Cache-Control"] = "no-store"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        if config.secure_cookie:
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        return response

    @app.exception_handler(sqlite3.IntegrityError)
    async def integrity_error(request, exc):
        return JSONResponse({"detail": "This record conflicts with an existing record. Refresh and try again."}, status_code=409)

    @app.get("/api/public/config")
    def public_config():
        return {"demo": config.demo, "max_upload_mb": config.max_upload // 1024**2, "max_duration_seconds": config.max_duration}

    @app.get("/api/auth/demo-users")
    def demo_users(request: Request):
        if not config.demo or request.client.host not in ("127.0.0.1", "::1", "testclient"):
            raise HTTPException(404, "Local demo is unavailable.")
        with db.connect() as con:
            return [public_user(r) for r in con.execute("SELECT * FROM users WHERE demo=1 AND active=1")]

    def new_session(con, actor):
        token, csrf = secrets.token_urlsafe(48), secrets.token_urlsafe(32)
        con.execute("DELETE FROM sessions WHERE expires_at<?", (now(),))
        con.execute("INSERT INTO sessions VALUES (?,?,?,?)", (token_hash(token), actor["id"], csrf, (datetime.now(timezone.utc)+timedelta(hours=8)).isoformat()))
        db.audit(con, actor["id"], "auth.login", actor["id"], {"demo": bool(actor["demo"])})
        response = JSONResponse({"user": public_user(actor), "csrf": csrf})
        response.set_cookie("sentinel_session", token, httponly=True, secure=config.secure_cookie, samesite="strict", max_age=28800, path="/")
        return response

    @app.post("/api/auth/demo")
    def demo_login(body: DemoLogin, request: Request):
        if not config.demo or request.client.host not in ("127.0.0.1", "::1", "testclient"):
            raise HTTPException(403, "Demo access is restricted to this local demonstration host.")
        with db.transaction() as con:
            row = con.execute("SELECT * FROM users WHERE id=? AND demo=1 AND active=1", (body.user_id,)).fetchone()
            if not row:
                raise HTTPException(400, "Choose an available demo account.")
            return new_session(con, row)

    @app.post("/api/auth/login")
    def login(body: Login, request: Request):
        key = token_hash(request.client.host + ":" + body.email.casefold())
        with db.transaction() as con:
            attempt = con.execute("SELECT * FROM login_attempts WHERE key=?", (key,)).fetchone()
            if attempt and attempt["blocked_until"] > time.time():
                raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
            actor = con.execute("SELECT * FROM users WHERE lower(email)=? AND active=1 AND demo=0", (body.email.casefold(),)).fetchone()
            valid = verify_password(body.password, actor["password_hash"] if actor else "")
            if not valid:
                # Perform the KDF even for unknown users to reduce account enumeration.
                if not actor:
                    hash_password(body.password)
                failures = (attempt["failures"] if attempt and attempt["blocked_until"] > time.time()-900 else 0) + 1
                con.execute("INSERT OR REPLACE INTO login_attempts VALUES (?,?,?)", (key, failures, time.time()+900 if failures>=5 else time.time()))
                db.audit(con, None, "auth.failed", "session", {"attempt_key": key[:12]})
            else:
                con.execute("DELETE FROM login_attempts WHERE key=?", (key,))
                return new_session(con, actor)
        raise HTTPException(401, "Email or password is incorrect.")

    @app.get("/api/auth/me")
    def me(actor=Depends(user)):
        return {"user": public_user(actor), "csrf": actor["csrf"]}

    @app.post("/api/auth/logout")
    def logout(request: Request, actor=Depends(user)):
        with db.transaction() as con:
            con.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash(request.cookies.get("sentinel_session", "")),))
            db.audit(con, actor["id"], "auth.logout", actor["id"])
        response = JSONResponse({"ok": True})
        response.delete_cookie("sentinel_session", path="/")
        return response

    @app.get("/api/team")
    def team(actor=Depends(user)):
        require(actor, RESPONDERS)
        with db.connect() as con:
            return [dict(r) for r in con.execute("SELECT id,name,role FROM users WHERE active=1 AND role IN ('supervisor','admin','responder') ORDER BY name")]

    def filters(actor, q="", risk="", status="", location="", category="", assigned="", since=""):
        clause, params = scope(actor)
        clauses = [clause]
        for column, value in (("risk_label", risk), ("status", status), ("category", category), ("assigned_to", assigned)):
            if value:
                clauses.append(f"c.{column}=?")
                params.append(value)
        if q:
            clauses.append("(c.title LIKE ? ESCAPE '\\' OR c.id LIKE ? ESCAPE '\\')")
            pattern = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
            params.extend([pattern, pattern])
        if location:
            clauses.append("c.location LIKE ?")
            params.append("%" + location + "%")
        if since:
            try:
                date = datetime.fromisoformat(since).date().isoformat()
            except ValueError:
                raise HTTPException(422, "Choose a valid start date.")
            clauses.append("c.created_at>=?")
            params.append(date)
        return " AND ".join(clauses), params

    @app.get("/api/cases")
    def cases(q: str = Query("",max_length=100), risk: str="", status: str="", location: str="", category: str="", assigned: str="", since: str="", sort: str="risk", page: int=Query(1,ge=1), page_size: int=Query(10,ge=1,le=100), actor=Depends(user)):
        where, params = filters(actor,q,risk,status,location,category,assigned,since)
        order = {"risk":"c.risk_score DESC,c.created_at DESC", "newest":"c.created_at DESC", "oldest":"c.created_at ASC"}.get(sort)
        if not order:
            raise HTTPException(422,"Choose a supported sort order.")
        with db.transaction() as con:
            total=con.execute(f"SELECT COUNT(*) FROM cases c WHERE {where}",params).fetchone()[0]
            rows=con.execute(f"SELECT c.*,u.name AS assigned_name FROM cases c LEFT JOIN users u ON u.id=c.assigned_to WHERE {where} ORDER BY {order} LIMIT ? OFFSET ?",[*params,page_size,(page-1)*page_size]).fetchall()
            db.audit(con,actor["id"],"cases.search","cases",{"query_hash":token_hash(q),"page":page,"filters":[k for k,v in [("risk",risk),("status",status),("location",location),("category",category),("assigned",assigned),("since",since)] if v]})
            return {"items":[case_dict(r) for r in rows],"total":total,"page":page,"page_size":page_size}

    @app.get("/api/dashboard")
    def dashboard(since: str="",location: str="",category: str="",assigned: str="",status: str="",actor=Depends(user)):
        where,params=filters(actor,location=location,category=category,assigned=assigned,since=since,status=status)
        with db.transaction() as con:
            rows=[case_dict(r) for r in con.execute(f"SELECT c.* FROM cases c WHERE {where} ORDER BY created_at DESC",params)]
            distribution={k:sum(c["risk_label"]==k for c in rows) for k in ["Normal","Low Risk","Ambiguous","High Risk","Emergency","Unassessed"]}
            days=[(datetime.now(timezone.utc)-timedelta(days=i)).date().isoformat() for i in range(6,-1,-1)]
            trend=[{"date":d,"total":sum(c["created_at"].startswith(d) for c in rows),"review":sum(c["created_at"].startswith(d) and c["risk_label"] in ("Ambiguous","High Risk","Emergency") for c in rows)} for d in days]
            alerts=[dict(r) for r in con.execute(f"SELECT a.*,c.title,c.location,c.synthetic FROM alerts a JOIN cases c ON c.id=a.case_id WHERE {where} AND a.status!='resolved' ORDER BY a.created_at DESC",params)]
            latencies=[]
            for c in rows:
                if c["synthetic"] or c["processing_status"] not in ("partial","completed"):
                    continue
                stages=c["stages"]
                if stages:
                    latencies.append((datetime.fromisoformat(stages[-1]["at"])-datetime.fromisoformat(c["created_at"])).total_seconds())
            db.audit(con,actor["id"],"dashboard.view","dashboard")
            return {"total":len(rows),"awaiting_review":sum(c["status"] in ("awaiting_review","appealed","escalated") for c in rows),"active_alerts":len(alerts),"failed":sum(c["processing_status"]=='failed' for c in rows),"incomplete":sum(c["processing_status"] in ('failed','partial','queued','processing') for c in rows),"distribution":distribution,"trend":trend,"recent":rows[:6],"alerts":alerts[:4],"processing_seconds":round(sum(latencies)/len(latencies),1) if latencies else None,"processing_samples":len(latencies)}

    @app.post("/api/cases/upload")
    async def upload(request: Request, file: UploadFile=File(...), title: str=Form(...), location: str=Form(""), consent: bool=Form(False), category: str=Form("interaction"), captured_at: str=Form(""), latitude: float|None=Form(None), longitude: float|None=Form(None), parent_case_id: str=Form(""), actor=Depends(user)):
        require(actor,{"citizen","officer","supervisor","admin"})
        title,location=title.strip(),location.strip()
        if not consent:
            raise HTTPException(422,"Confirm that you have consent and authorization to upload this recording.")
        if not 5<=len(title)<=160 or len(location)>200 or category not in ("interaction","traffic","payment","coercion","officer_safety","violence","weapon","gesture","procedure"):
            raise HTTPException(422,"Provide a title of 5–160 characters and valid case metadata.")
        if (latitude is None)!=(longitude is None) or (latitude is not None and (not -90<=latitude<=90 or not -180<=longitude<=180)):
            raise HTTPException(422,"Location coordinates are invalid.")
        if captured_at:
            try:
                parsed=datetime.fromisoformat(captured_at.replace("Z","+00:00"))
                if parsed.tzinfo is None or parsed>datetime.now(timezone.utc)+timedelta(minutes=5):
                    raise ValueError()
            except ValueError:
                raise HTTPException(422,"Capture time must include a timezone and cannot be in the future.")
        ext=Path(file.filename or "").suffix.casefold()
        if ext not in (".mp4",".webm"):
            raise HTTPException(415,"Choose MP4 video or a WebM browser recording.")
        chunks,total=[],0
        while chunk:=await file.read(1024*1024):
            total+=len(chunk)
            if total>config.max_upload:
                raise HTTPException(413,"Video exceeds 100 MB. Export a smaller recording.")
            chunks.append(chunk)
        data=b"".join(chunks)
        if len(data)<16 or not ((ext==".mp4" and data[4:8]==b"ftyp") or (ext==".webm" and data[:4]==b"\x1aE\xdf\xa3")):
            raise HTTPException(415,"File contents do not match a supported video container.")
        digest=hashlib.sha256(data).hexdigest()
        with db.transaction() as con:
            owner_id=actor["id"]
            if parent_case_id:
                parent=case_access(con,actor,parent_case_id)
                if parent["status"]!='evidence_requested':
                    raise HTTPException(409,"Additional evidence must be requested on this case before linking a recording.")
                owner_id=parent["owner_id"]
            def link_recording(child_id):
                if not parent_case_id:
                    return
                if child_id==parent_case_id:
                    raise HTTPException(409,"This is the original recording. Submit a different recording as additional evidence.")
                added=con.execute("INSERT OR IGNORE INTO case_links VALUES (?,?,?,?)",(parent_case_id,child_id,actor["id"],now())).rowcount
                if added:
                    con.execute("UPDATE cases SET version=version+1,updated_at=? WHERE id=?",(now(),parent_case_id))
                    db.audit(con,actor["id"],"evidence.supplement_received",parent_case_id,{"related_case_id":child_id})
            existing=con.execute("SELECT id FROM cases WHERE owner_id=? AND sha256=?",(owner_id,digest)).fetchone()
            if existing:
                link_recording(existing[0])
                db.audit(con,actor["id"],"upload.duplicate",existing[0])
                return {"id":existing[0],"duplicate":True}
            case_id="SA-"+datetime.now().strftime("%y")+"-"+secrets.token_hex(4).upper()
            stamp=now()
            stages=[{"name":STAGES[0],"status":"completed","at":stamp,"detail":"Encrypted source received. Consent declared by uploader."}]
            con.execute("INSERT INTO cases(id,title,owner_id,location,latitude,longitude,category,created_at,captured_at,updated_at,sha256,stages) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",(case_id,title,owner_id,location,latitude,longitude,category,stamp,captured_at or None,stamp,digest,encode(stages)))
            link_recording(case_id)
            storage.put(con,case_id,"original",data,"video/mp4" if ext==".mp4" else "video/webm","upload")
            con.execute("INSERT INTO jobs(id,case_id,created_at,updated_at) VALUES (?,?,?,?)",(uid("job_"),case_id,stamp,stamp))
            db.audit(con,actor["id"],"upload.received",case_id,{"bytes":total,"consent":True})
        processor.wake_event.set()
        return JSONResponse({"id":case_id,"duplicate":False},status_code=201)

    @app.get("/api/cases/{case_id}")
    def get_case(case_id: str,actor=Depends(user)):
        with db.transaction() as con:
            case_access(con,actor,case_id)
            db.audit(con,actor["id"],"case.view",case_id)
            return detail(con,actor,case_id)

    @app.post("/api/cases/{case_id}/notes")
    def add_note(case_id: str,body: Note,actor=Depends(user)):
        with db.transaction() as con:
            c=case_access(con,actor,case_id)
            if c["status"]=='deleted':
                raise HTTPException(409,"This case has been deleted under retention policy.")
            con.execute("INSERT INTO notes VALUES (?,?,?,?,?)",(uid("no_"),case_id,actor["id"],body.body,now()))
            db.audit(con,actor["id"],"case.note",case_id)
        return {"ok":True}

    @app.post("/api/cases/{case_id}/review")
    def review(case_id: str,body: Decision,actor=Depends(user)):
        with db.transaction() as con:
            c=case_access(con,actor,case_id)
            if c["version"]!=body.version:
                raise HTTPException(409,"This case changed. Refresh before submitting your decision.")
            if c["status"] in ('deleted','processing'):
                raise HTTPException(409,"Case is not ready for a review decision.")
            if body.action=='appeal':
                require(actor,{"citizen","officer"})
                if c["owner_id"]!=actor["id"] or c["status"] not in ('confirmed','dismissed'):
                    raise HTTPException(409,"You can contest a completed decision on your own case.")
                target="appealed"
            else:
                require(actor,REVIEWERS)
                if c["status"] in ('confirmed','dismissed') and body.action!='assign':
                    raise HTTPException(409,"A completed decision must be appealed before re-review.")
                if c["status"]=='appealed' and body.action in ('confirm','dismiss'):
                    previous=con.execute("SELECT actor_id FROM reviews WHERE case_id=? AND action IN ('confirm','dismiss') ORDER BY created_at DESC LIMIT 1",(case_id,)).fetchone()
                    if previous and previous[0]==actor["id"]:
                        raise HTTPException(403,"An appeal must be decided by a different authorized reviewer.")
                target={"confirm":"confirmed","dismiss":"dismissed","escalate":"escalated","request_evidence":"evidence_requested","assign":c["status"]}[body.action]
            if body.action=='assign':
                assigned=con.execute("SELECT id FROM users WHERE id=? AND role IN ('supervisor','admin') AND active=1",(body.assigned_to,)).fetchone()
                if not assigned:
                    raise HTTPException(422,"Select an active supervisor or administrator.")
                con.execute("UPDATE cases SET assigned_to=? WHERE id=?",(body.assigned_to,case_id))
            con.execute("UPDATE cases SET status=?,version=version+1,updated_at=? WHERE id=?",(target,now(),case_id))
            con.execute("INSERT INTO reviews VALUES (?,?,?,?,?,?,?,?)",(uid("rv_"),case_id,actor["id"],body.action,body.reason,c["status"],target,now()))
            if body.action=='escalate':
                create_alert(con,db,case_id,None,"human_escalation",c["risk_label"])
            if body.action=='appeal':
                con.execute("UPDATE cases SET assigned_to=NULL WHERE id=?",(case_id,))
            db.audit(con,actor["id"],"review."+body.action,case_id,{"from":c["status"],"to":target,"assigned_to":body.assigned_to})
        return {"ok":True,"status":target}

    @app.post("/api/cases/{case_id}/retry")
    def retry(case_id: str,actor=Depends(user)):
        with db.transaction() as con:
            c=case_access(con,actor,case_id)
            if actor["role"] not in REVIEWERS and c["owner_id"]!=actor["id"]:
                raise HTTPException(403,"Only the uploader or reviewer may retry.")
            if c["processing_status"]!='failed' or not con.execute("SELECT 1 FROM evidence WHERE case_id=? AND kind='original'",(case_id,)).fetchone():
                raise HTTPException(409,"No retryable source remains. Upload a new recording.")
            con.execute("UPDATE jobs SET status='queued',updated_at=? WHERE case_id=?",(now(),case_id))
            con.execute("UPDATE cases SET processing_status='queued',processing_error=NULL WHERE id=?",(case_id,))
            db.audit(con,actor["id"],"processing.retry",case_id)
        processor.wake_event.set()
        return {"ok":True}

    @app.get("/api/evidence/{evidence_id}")
    def media(evidence_id: str,request: Request,actor=Depends(user)):
        with db.transaction() as con:
            evidence=con.execute("SELECT * FROM evidence WHERE id=? AND kind!='original'",(evidence_id,)).fetchone()
            if not evidence:
                raise HTTPException(404,"Evidence is unavailable or access is restricted.")
            c=case_access(con,actor,evidence["case_id"])
            if c["privacy_status"] not in ('full_frame_blurred','synthetic_no_people') or c["status"]=='deleted':
                raise HTTPException(423,"Evidence is held until privacy processing completes.")
            try:
                data=storage.read(evidence)
            except InvalidToken:
                raise HTTPException(503,"Evidence integrity verification failed. An administrator must check the storage key and artifact.")
            except (FileNotFoundError,ValueError):
                raise HTTPException(410,"The evidence artifact is no longer available.")
            db.audit(con,actor["id"],"evidence.view",c["id"],{"evidence_id":evidence_id})
        headers={"Accept-Ranges":"bytes","Content-Disposition":"inline","Cache-Control":"no-store"}
        byte_range=request.headers.get("range")
        if byte_range:
            import re
            match=re.fullmatch(r"bytes=(\d*)-(\d*)",byte_range)
            if not match or not any(match.groups()):
                return Response(status_code=416,headers={"Content-Range":f"bytes */{len(data)}"})
            a,b=match.groups()
            start=int(a) if a else max(0,len(data)-int(b))
            end=min(int(b) if a and b else len(data)-1,len(data)-1)
            if start>end or start>=len(data):
                return Response(status_code=416,headers={"Content-Range":f"bytes */{len(data)}"})
            headers["Content-Range"]=f"bytes {start}-{end}/{len(data)}"
            return Response(data[start:end+1],status_code=206,media_type=evidence["mime"],headers=headers)
        return Response(data,media_type=evidence["mime"],headers=headers)

    @app.get("/api/cases/{case_id}/report")
    def report(case_id: str,format: str="json",actor=Depends(user)):
        if format not in ('json','html'):
            raise HTTPException(422,"Choose JSON or HTML report format.")
        with db.transaction() as con:
            data=detail(con,actor,case_id)
            if data["status"]=='deleted':
                raise HTTPException(410,"Case content has expired.")
            db.audit(con,actor["id"],"case.export",case_id,{"format":format})
        # Minimize exported identity/location: no owner IDs or exact coordinates.
        exported={k:data[k] for k in ('id','title','synthetic','created_at','status','processing_status','privacy_status','risk_label','risk_score','assessment','evidence','segments','events','reviews','summary','related')}
        exported["notice"]="Decision support only. Not a legal determination. Synthetic records are not genuine model outputs."
        if format=='json':
            return Response(json.dumps(exported,ensure_ascii=False,indent=2),media_type="application/json",headers={"Content-Disposition":f'attachment; filename="{case_id}.json"'})
        text=html.escape(json.dumps(exported,ensure_ascii=False,indent=2))
        content=f'<!doctype html><html lang="en"><meta charset="utf-8"><title>{case_id} report</title><style>body{{font:15px/1.6 system-ui;max-width:1000px;margin:40px auto;padding:24px;color:#172d38}}pre{{white-space:pre-wrap;overflow-wrap:anywhere}}h1{{font-size:28px}}@media print{{body{{margin:0}}}}</style><h1>SentinelAI · {case_id}</h1><p>Evidence report. Use your browser’s Print command to save a PDF.</p><pre>{text}</pre></html>'
        return Response(content,media_type="text/html",headers={"Content-Disposition":f'attachment; filename="{case_id}.html"'})

    @app.get("/api/alerts")
    def alerts(status: str="",page: int=Query(1,ge=1),actor=Depends(user)):
        require(actor,RESPONDERS)
        with db.transaction() as con:
            where="a.status=?" if status else "1=1"
            params=[status] if status else []
            total=con.execute(f"SELECT COUNT(*) FROM alerts a WHERE {where}",params).fetchone()[0]
            rows=[dict(r) for r in con.execute(f"SELECT a.*,c.title,c.location,c.synthetic,c.risk_score,u.name AS assigned_name,(SELECT count(*) FROM evidence e WHERE e.case_id=c.id AND kind!='original') AS evidence_count FROM alerts a JOIN cases c ON c.id=a.case_id LEFT JOIN users u ON u.id=a.assigned_to WHERE {where} ORDER BY CASE WHEN a.status='resolved' THEN 1 ELSE 0 END, CASE WHEN severity='Emergency' THEN 0 ELSE 1 END,a.created_at DESC LIMIT 20 OFFSET ?",[*params,(page-1)*20])]
            for a in rows:
                a["history"]=[dict(r) for r in con.execute("SELECT h.*,u.name AS author FROM alert_history h LEFT JOIN users u ON u.id=h.actor_id WHERE alert_id=? ORDER BY created_at DESC",(a["id"],))]
                a["notifications"]=[dict(r) for r in con.execute("SELECT * FROM notifications WHERE alert_id=?",(a["id"],))]
            db.audit(con,actor["id"],"alerts.search","alerts",{"status":status,"page":page})
            return {"items":rows,"total":total,"page":page}

    @app.post("/api/alerts/{alert_id}/action")
    def alert_action(alert_id: str,body: AlertAction,actor=Depends(user)):
        require(actor,RESPONDERS)
        with db.transaction() as con:
            a=con.execute("SELECT * FROM alerts WHERE id=?",(alert_id,)).fetchone()
            if not a:
                raise HTTPException(404,"Alert not found.")
            if a["version"]!=body.version or a["status"]=='resolved':
                raise HTTPException(409,"Alert changed or is already resolved. Refresh to see its current state.")
            if body.action=='acknowledge' and a["status"]!='open':
                raise HTTPException(409,"Only an open alert can be acknowledged.")
            if body.action=='resolve' and a["status"]=='open':
                raise HTTPException(409,"Acknowledge or escalate the alert before resolving it.")
            assigned=a["assigned_to"]
            if body.action=='assign':
                if not con.execute("SELECT 1 FROM users WHERE id=? AND role IN ('responder','supervisor','admin') AND active=1",(body.assigned_to,)).fetchone():
                    raise HTTPException(422,"Select an active responder or reviewer.")
                assigned=body.assigned_to
            target={"acknowledge":"acknowledged","escalate":"escalated","resolve":"resolved","assign":a["status"]}[body.action]
            con.execute("UPDATE alerts SET status=?,assigned_to=?,version=version+1,updated_at=? WHERE id=?",(target,assigned,now(),alert_id))
            con.execute("INSERT INTO alert_history VALUES (?,?,?,?,?,?)",(uid("ah_"),alert_id,actor["id"],body.action,body.reason,now()))
            db.audit(con,actor["id"],"alert."+body.action,a["case_id"],{"alert_id":alert_id,"assigned_to":assigned})
        return {"ok":True}

    @app.get("/api/health")
    def health(actor=Depends(user)):
        with db.connect() as con:
            where,params=scope(actor)
            jobs=[dict(r) for r in con.execute(f"SELECT j.id,j.case_id,j.status,j.attempts,j.updated_at,c.processing_error,c.title FROM jobs j JOIN cases c ON c.id=j.case_id WHERE {where} ORDER BY j.updated_at DESC LIMIT 30",params)]
            return {"database":"available","worker":"running" if processor.thread and processor.thread.is_alive() else "stopped", "demo":config.demo,"capabilities":capabilities(config),"jobs":jobs,"media_encryption":"Fernet authenticated encryption","database_encryption":"Requires encrypted host volume; SQLite is not encrypted by the application.","transport":"Secure cookie enabled; terminate HTTPS at reverse proxy." if config.secure_cookie else "Local HTTP demonstration. Use HTTPS before any remote or real-data deployment."}

    @app.get("/api/admin/users")
    def users(actor=Depends(user)):
        require(actor,{"admin"})
        with db.transaction() as con:
            db.audit(con,actor["id"],"users.view","users")
            return [public_user(r) for r in con.execute("SELECT * FROM users ORDER BY created_at")]

    @app.post("/api/admin/users")
    def create_user(body: UserCreate,actor=Depends(user)):
        require(actor,{"admin"})
        with db.transaction() as con:
            ident=uid("usr_")
            con.execute("INSERT INTO users(id,name,email,role,password_hash,created_at) VALUES (?,?,?,?,?,?)",(ident,body.name,body.email.casefold(),body.role,hash_password(body.password),now()))
            db.audit(con,actor["id"],"user.created",ident,{"role":body.role})
        return {"id":ident}

    @app.patch("/api/admin/users/{user_id}")
    def update_user(user_id: str,body: UserUpdate,actor=Depends(user)):
        require(actor,{"admin"})
        with db.transaction() as con:
            old=con.execute("SELECT * FROM users WHERE id=?",(user_id,)).fetchone()
            if not old:
                raise HTTPException(404,"User not found.")
            if user_id==actor["id"] and (not body.active or body.role!='admin'):
                raise HTTPException(409,"You cannot remove your own administrative access.")
            if old["demo"]:
                raise HTTPException(409,"Demo personas are fixed. Create a real local account to test role changes.")
            con.execute("UPDATE users SET role=?,active=? WHERE id=?",(body.role,int(body.active),user_id))
            con.execute("DELETE FROM sessions WHERE user_id=?",(user_id,))
            db.audit(con,actor["id"],"user.updated",user_id,{"old_role":old["role"],"role":body.role,"active":body.active,"reason":body.reason})
        return {"ok":True}

    @app.get("/api/admin/devices")
    def devices(actor=Depends(user)):
        require(actor,{"admin"})
        with db.connect() as con:
            return [dict(r) for r in con.execute("SELECT * FROM devices ORDER BY created_at DESC")]

    @app.post("/api/admin/devices")
    def create_device(body: Device,actor=Depends(user)):
        require(actor,{"admin"})
        with db.transaction() as con:
            ident=uid("dev_")
            if body.owner_id and not con.execute("SELECT 1 FROM users WHERE id=? AND active=1",(body.owner_id,)).fetchone():
                raise HTTPException(422,"Device owner is unavailable.")
            con.execute("INSERT INTO devices VALUES (?,?,?,?,?,?)",(ident,body.name,body.identifier,body.owner_id,"active",now()))
            db.audit(con,actor["id"],"device.registered",ident)
        return {"id":ident}

    @app.post("/api/admin/devices/{device_id}/revoke")
    def revoke(device_id: str,body: Reason,actor=Depends(user)):
        require(actor,{"admin"})
        with db.transaction() as con:
            if not con.execute("SELECT 1 FROM devices WHERE id=? AND status='active'",(device_id,)).fetchone():
                raise HTTPException(409,"Device is unavailable or already revoked.")
            con.execute("UPDATE devices SET status='revoked' WHERE id=?",(device_id,))
            db.audit(con,actor["id"],"device.revoked",device_id,{"reason":body.reason})
        return {"ok":True}

    @app.get("/api/admin/settings")
    def settings(actor=Depends(user)):
        require(actor,{"admin"})
        with db.connect() as con:
            return {r["key"]:{"value":json.loads(r["value"]),"version":r["version"]} for r in con.execute("SELECT * FROM settings")}

    @app.put("/api/admin/settings/{key}")
    def update_setting(key: str,body: SettingsUpdate,actor=Depends(user)):
        require(actor,{"admin"})
        value=body.value
        def ensure(condition):
            if not condition:
                raise ValueError('Invalid policy')
        try:
            if key=='thresholds':
                ensure(set(value)=={'low','ambiguous','high','emergency','weights'})
                ensure(all(type(value[k]) in (int,float) for k in ('low','ambiguous','high','emergency')))
                ensure(0<value['low']<value['ambiguous']<value['high']<value['emergency']<=100)
                ensure(set(value['weights'])=={'speech','gesture','body','context','temporal'})
                ensure(all(type(v) in (int,float) and 0<=v<=1 for v in value['weights'].values()))
                ensure(abs(sum(value['weights'].values())-1)<.0001)
            elif key=='retention':
                ensure(set(value)=={'days','quarantine_days','preserve_original'})
                ensure(type(value['days']) is int and 1<=value['days']<=365)
                ensure(type(value['quarantine_days']) is int and 1<=value['quarantine_days']<=7)
                ensure(value['preserve_original'] is False)
            elif key=='categories':
                ensure(set(value)=={'languages','gestures'})
                ensure(all(isinstance(v,list) and 1<=len(v)<=30 and all(isinstance(x,str) and 1<=len(x)<=60 for x in v) for v in value.values()))
            else:
                raise HTTPException(404,"Unknown setting.")
        except (ValueError,KeyError,TypeError):
            raise HTTPException(422,"Invalid policy. Thresholds must increase; weights must sum to 1; retention must be within allowed limits. Originals cannot be preserved in this build.")
        with db.transaction() as con:
            old=db.setting(con,key)
            if body.version!=old["version"]:
                raise HTTPException(409,"Policy changed. Refresh before saving.")
            con.execute("UPDATE settings SET value=?,version=version+1 WHERE key=?",(encode(value),key))
            db.audit(con,actor["id"],"policy.updated",key,{"version":body.version+1,"previous":old["value"],"value":value,"reason":body.reason})
        return {"ok":True}

    @app.get("/api/admin/phrases")
    def phrases(actor=Depends(user)):
        require(actor,{"admin"})
        with db.connect() as con:
            return [dict(r) for r in con.execute("SELECT * FROM phrases ORDER BY category,phrase")]

    @app.post("/api/admin/phrases")
    def add_phrase(body: Phrase,actor=Depends(user)):
        require(actor,{"admin"})
        with db.transaction() as con:
            ident=uid("ph_")
            con.execute("INSERT INTO phrases VALUES (?,?,?,?,?,1)",(ident,body.phrase,body.category,body.language,body.explanation))
            db.audit(con,actor["id"],"phrase.created",ident,{"category":body.category})
        return {"id":ident}

    @app.post("/api/admin/phrases/{phrase_id}/toggle")
    def toggle_phrase(phrase_id: str,body: Reason,actor=Depends(user)):
        require(actor,{"admin"})
        with db.transaction() as con:
            row=con.execute("SELECT active FROM phrases WHERE id=?",(phrase_id,)).fetchone()
            if not row:
                raise HTTPException(404,"Phrase not found.")
            con.execute("UPDATE phrases SET active=? WHERE id=?",(1-row[0],phrase_id))
            db.audit(con,actor["id"],"phrase.updated",phrase_id,{"active":not row[0],"reason":body.reason})
        return {"ok":True}

    @app.get("/api/admin/audit")
    def audit(q: str=Query("",max_length=100),page: int=Query(1,ge=1),actor=Depends(user)):
        require(actor,{"admin"})
        with db.transaction() as con:
            db.audit(con,actor["id"],"audit.search","audit",{"query_hash":token_hash(q),"page":page})
            pattern="%"+q+"%"
            total=con.execute("SELECT COUNT(*) FROM audit WHERE action LIKE ? OR resource LIKE ?",(pattern,pattern)).fetchone()[0]
            rows=[dict(r) for r in con.execute("SELECT a.*,u.name AS author FROM audit a LEFT JOIN users u ON u.id=a.actor_id WHERE action LIKE ? OR resource LIKE ? ORDER BY seq DESC LIMIT 30 OFFSET ?",(pattern,pattern,(page-1)*30))]
            return {"items":rows,"total":total,"page":page,"integrity":db.verify_audit(con)}

    @app.post("/api/cases/{case_id}/hold")
    def hold(case_id: str,body: Hold,actor=Depends(user)):
        require(actor,{"admin"})
        with db.transaction() as con:
            c=case_access(con,actor,case_id)
            if c['status']=='deleted':
                raise HTTPException(409,"Deleted evidence cannot be placed on hold.")
            con.execute("UPDATE cases SET legal_hold=? WHERE id=?",(int(body.enabled),case_id))
            db.audit(con,actor["id"],"retention.hold",case_id,{"enabled":body.enabled,"reason":body.reason})
        return {"ok":True}

    def retention_candidates(con):
        policy=db.setting(con,'retention')['value']
        cutoff=(datetime.now(timezone.utc)-timedelta(days=policy['days'])).isoformat()
        quarantine=(datetime.now(timezone.utc)-timedelta(days=policy['quarantine_days'])).isoformat()
        expired=[dict(r) for r in con.execute("SELECT id,title,created_at FROM cases WHERE created_at<? AND legal_hold=0 AND status!='deleted' AND processing_status NOT IN ('processing','queued')",(cutoff,))]
        raw=[dict(r) for r in con.execute("SELECT e.* FROM evidence e JOIN cases c ON c.id=e.case_id WHERE e.kind='original' AND e.created_at<? AND c.legal_hold=0 AND c.processing_status='failed'",(quarantine,))]
        return expired,raw

    @app.get("/api/admin/retention-preview")
    def retention_preview(actor=Depends(user)):
        require(actor,{'admin'})
        with db.connect() as con:
            expired,raw=retention_candidates(con)
            return {"cases":expired,"quarantined_originals":len(raw)}

    @app.post("/api/admin/retention-run")
    def retention_run(body: Reason,actor=Depends(user)):
        require(actor,{'admin'})
        with db.transaction() as con:
            expired,raw=retention_candidates(con)
            for c in expired:
                for e in con.execute("SELECT * FROM evidence WHERE case_id=?",(c['id'],)).fetchall():
                    storage.delete(e)
                # Keep operational tombstones and audit identifiers, erase content.
                con.execute("UPDATE alerts SET event_id=NULL,status='resolved' WHERE case_id=?",(c['id'],))
                for table in ('evidence','segments','events','notes','reviews','jobs'):
                    con.execute(f"DELETE FROM {table} WHERE case_id=?",(c['id'],))
                con.execute("UPDATE cases SET title='Deleted under retention policy',description='',location='',latitude=NULL,longitude=NULL,status='deleted',assessment='{}',stages='[]',sha256=NULL,privacy_status='deleted',risk_label='Unassessed',risk_score=NULL,processing_status='deleted' WHERE id=?",(c['id'],))
                db.audit(con,actor['id'],'retention.deleted',c['id'],{'reason':body.reason})
            for e in raw:
                storage.delete(e)
                con.execute("DELETE FROM evidence WHERE id=?",(e['id'],))
                db.audit(con,actor['id'],'retention.quarantine_deleted',e['case_id'])
            db.audit(con,actor['id'],'retention.run','retention',{'cases':len(expired),'originals':len(raw),'reason':body.reason})
            return {'deleted_cases':len(expired),'deleted_originals':len(raw)}

    dist=ROOT/'dist'
    if dist.exists():
        app.mount('/assets',StaticFiles(directory=dist/'assets'),name='assets')

        @app.get('/{path:path}',include_in_schema=False)
        def spa(path: str):
            if path.startswith('api/'):
                raise HTTPException(404,'API route not found.')
            return FileResponse(dist/'index.html')
    return app


app = create_app()
