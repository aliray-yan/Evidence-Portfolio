"""Original architectural test drawings; shared geometry drives PDF and JSON."""
from pathlib import Path
import json, math, collections
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/architectural-blueprints';OUT.mkdir(parents=True,exist_ok=True)
PDF=ROOT/'output/pdf';PDF.mkdir(parents=True,exist_ok=True)
FT=.3048;PW,PH=A3;OX=82;TOP=1030;DPI=200
def rect(x,y,x2,y2):return [(x,y),(x2,y),(x2,y2),(x,y2)]
def room(name,poly,out=False,label=None):return {'name':name,'poly':poly,'out':out,'label':label}
def r(name,x,y,x2,y2,out=False,label=None):return room(name,rect(x,y,x2,y2),out,label)
def area(poly):return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1])))/2
def inside(p,poly):
    x,y=p;hit=False
    for a,b in zip(poly,poly[1:]+poly[:1]):
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:hit=not hit
    return hit
def box(poly):
    xs,ys=zip(*poly);return min(xs),min(ys),max(xs),max(ys)
def center(poly):
    x,y,x2,y2=box(poly);p=((x+x2)/2,(y+y2)/2)
    if inside(p,poly):return p
    for j in range(1,20):
        for i in range(1,20):
            p=(x+(x2-x)*i/20,y+(y2-y)*j/20)
            if inside(p,poly):return p
def dim(v):
    n=round(v*24);feet=n//24;inch=(n%24)//2;half='½' if n%2 else ''
    return f"{feet}'-{inch}{half}\""
def point(p):return {'x':round(p[0]*FT,6),'y':round(p[1]*FT,6)}

SPECS=[
dict(id='compact-5-marla',title='5 MARLA / COMPACT FAMILY HOUSE',subtitle='Two bedrooms - separate drawing room - U stair',w=27.5,h=49.5,scale=50,beds=2,xs=[.5,12.5,15.5,27],ys=[.5,5,15,22,32,45.5,49],
rooms=[r('BATH 01',.5,.5,6.5,5),r('DRESSING',6.5,.5,12.5,5),r('BEDROOM 01',.5,5,12.5,15),r('LIGHT WELL',12.5,.5,15.5,5,True),r('PRIVATE PASSAGE',12.5,5,15.5,15),r('BATH 02',21,.5,27,5),room('MASTER BEDROOM',[(15.5,.5),(21,.5),(21,5),(27,5),(27,15),(15.5,15)],label=(21,10)),r('KITCHEN',.5,15,9.5,27),r('WASH / UTILITY',.5,27,9.5,32),r('STAIR HALL',9.5,22,15.5,32),room('TV LOUNGE',[(9.5,15),(27,15),(27,32),(15.5,32),(15.5,22),(9.5,22)],label=(21,25)),r('DRAWING ROOM',.5,32,11.5,45.5),r('ENTRANCE LOBBY',11.5,32,14.5,45.5),r('CAR PORCH',14.5,32,27,49,True),r('FRONT APPROACH',.5,45.5,14.5,49,True)],stair=(9.8,22.3,15.2,31.7,'u-shaped')),
dict(id='family-7-marla',title='7 MARLA / THREE-BEDROOM HOUSE',subtitle='Private rear suites - guest bedroom - front drawing room',w=33,h=57.75,scale=60,beds=3,xs=[.5,15.5,19.5,32.5],ys=[.5,6,17,26,36.75,48.75,52.75,57.25],
rooms=[r('MASTER BATH',.5,.5,7.5,6),r('DRESSING',7.5,.5,10,6),room('MASTER BEDROOM',[(10,.5),(15.5,.5),(15.5,17),(.5,17),(.5,6),(10,6)],label=(8.3,11.5)),r('LIGHT WELL',15.5,.5,19.5,6,True),r('PRIVATE HALL',15.5,6,19.5,17),r('BATH 02',25.5,.5,32.5,6),room('BEDROOM 02',[(19.5,.5),(25.5,.5),(25.5,6),(32.5,6),(32.5,17),(19.5,17)],label=(26,11.5)),r('BEDROOM 03',.5,17,12.5,31),r('GUEST BATH',.5,31,6.5,36.75),r('LAUNDRY',6.5,31,12.5,36.75),room('LIVING / DINING',[(12.5,17),(32.5,17),(32.5,26),(23,26),(23,36.75),(12.5,36.75)],label=(18,24)),r('KITCHEN',23,26,32.5,36.75),r('STAIR HALL',.5,36.75,8.5,48.75),r('DRAWING ROOM',8.5,36.75,19.5,52.75),r('SIT OUT',.5,48.75,8.5,52.75,True),r('FRONT GARDEN',.5,52.75,19.5,57.25,True),r('CAR PORCH',19.5,36.75,32.5,57.25,True)],stair=(.8,37.05,8.2,48.45,'u-shaped')),
dict(id='courtyard-10-marla',title='10 MARLA / COURTYARD HOUSE',subtitle='Three bedrooms - central courtyard - curved stair lobby',w=41.25,h=66,scale=75,beds=3,xs=[.5,14.5,27.5,40.75],ys=[.5,6.5,20.5,24.5,37.5,43.5,47.5,61.5,65.5],
rooms=[r('MASTER BATH',.5,.5,7,6.5),r('DRESSING',7,.5,10,6.5),room('MASTER BEDROOM',[(10,.5),(14.5,.5),(14.5,20.5),(.5,20.5),(.5,6.5),(10,6.5)],label=(7.5,13)),r('BATH 03',22,.5,27.5,6.5),room('BEDROOM 03',[(14.5,.5),(22,.5),(22,6.5),(27.5,6.5),(27.5,17.5),(14.5,17.5)],label=(21,12)),r('BATH 02',34.75,.5,40.75,6.5),room('BEDROOM 02',[(27.5,.5),(34.75,.5),(34.75,6.5),(40.75,6.5),(40.75,20.5),(27.5,20.5)],label=(34,13)),room('PRIVATE GALLERY',[(14.5,17.5),(27.5,17.5),(27.5,20.5),(40.75,20.5),(40.75,24.5),(.5,24.5),(.5,20.5),(14.5,20.5)],label=(20,22.5)),r('TV LOUNGE',.5,24.5,14.5,43.5),r('OPEN COURTYARD',14.5,24.5,27.5,37.5,True),r('DINING ROOM',27.5,24.5,40.75,37.5),r('KITCHEN',27.5,37.5,40.75,47.5),r('POWDER',14.5,37.5,20.5,43.5),r('LAUNDRY',20.5,37.5,27.5,43.5),r('ENTRY GALLERY',14.5,43.5,27.5,47.5),r('DRAWING ROOM',.5,43.5,14.5,61.5),r('ENTRANCE / STAIR LOBBY',14.5,47.5,28,61.5,label=(21.25,58)),r('CAR PORCH',28,47.5,40.75,65.5,True),r('FRONT APPROACH',.5,61.5,28,65.5,True)],stair=(14.85,49.25,24.85,54.25,'curved')),
dict(id='grand-20-marla',title='20 MARLA / GARDEN RESIDENCE',subtitle='Four bedrooms - garden court - study - two-car porch',w=55,h=99,scale=100,beds=4,xs=[.5,3,17.5,25.5,29.5,38,52,54.5],ys=[.5,5.5,12.5,28.5,33.5,52.5,69.5,83.5,98.5],
rooms=[r('REAR GARDEN',.5,.5,54.5,5.5,True),r('WEST SIDE PASSAGE',.5,5.5,3,78.5,True),r('EAST SIDE PASSAGE',52,5.5,54.5,98.5,True),r('MASTER BATH',3,5.5,11.5,12.5),r('DRESSING',11.5,5.5,17.5,12.5),room('MASTER BEDROOM',[(17.5,5.5),(25.5,5.5),(25.5,28.5),(3,28.5),(3,12.5),(17.5,12.5)],label=(14.5,21)),r('LIGHT WELL',25.5,5.5,29.5,12.5,True),r('PRIVATE PASSAGE',25.5,12.5,29.5,28.5),r('BATH 02',44,5.5,52,12.5),room('BEDROOM 02',[(29.5,5.5),(44,5.5),(44,12.5),(52,12.5),(52,28.5),(29.5,28.5)],label=(41,21)),r('PRIVATE GALLERY',3,28.5,52,33.5),r('BATH 03',3,33.5,9.5,39.5),room('BEDROOM 03',[(9.5,33.5),(17.5,33.5),(17.5,52.5),(3,52.5),(3,39.5),(9.5,39.5)],label=(10,46)),r('GARDEN COURT',17.5,33.5,38,52.5,True),r('BATH 04',45.5,33.5,52,39.5),room('BEDROOM 04',[(38,33.5),(45.5,33.5),(45.5,39.5),(52,39.5),(52,52.5),(38,52.5)],label=(45,46)),r('DINING ROOM',3,52.5,17.5,67.5),r('KITCHEN',3,67.5,17.5,78.5),r('TV LOUNGE',17.5,52.5,38,69.5),r('STUDY',38,52.5,52,64.5),r('POWDER',38,64.5,44.5,69.5),r('LAUNDRY',44.5,64.5,52,69.5),r('DRAWING ROOM',38,69.5,52,87.5),r('STAIR HALL',17.5,69.5,27.5,83.5),r('ENTRANCE LOBBY',27.5,69.5,38,83.5),room('CAR PORCH / 2 CARS',[(3,78.5),(17.5,78.5),(17.5,83.5),(27.5,83.5),(27.5,98.5),(3,98.5)],True,label=(15,87)),room('FRONT LAWN',[(27.5,83.5),(38,83.5),(38,87.5),(52,87.5),(52,98.5),(27.5,98.5)],True,label=(40,94))],stair=(17.85,69.85,27.15,83.15,'u-shaped'))
]

def build(spec):
    rooms=spec['rooms'];segments=collections.defaultdict(list)
    for i,rm in enumerate(rooms):
        rm['id']=f"room-{i+1:02d}"
        for a,b in zip(rm['poly'],rm['poly'][1:]+rm['poly'][:1]):
            horizontal=a[1]==b[1];axis=a[1] if horizontal else a[0]
            lo,hi=sorted((a[0],b[0]) if horizontal else (a[1],b[1]))
            segments[('h' if horizontal else 'v',axis)].append((lo,hi,i))
    walls=[]
    for (direction,axis),spans in segments.items():
        cuts=sorted(set(v for a,b,_ in spans for v in (a,b)))
        for a,b in zip(cuts,cuts[1:]):
            owners=sorted(set(i for lo,hi,i in spans if lo<=a+1e-6 and hi>=b-1e-6))
            if not any(not rooms[i]['out'] for i in owners):continue
            exterior=len(owners)==1 or any(rooms[i]['out'] for i in owners)
            walls.append({'id':f"wall-{len(walls)+1:03d}",'a':(a,axis) if direction=='h' else (axis,a),'b':(b,axis) if direction=='h' else (axis,b),'owners':owners,'t':.75 if exterior else .5,'height':9.5,'exterior':exterior})
    # Shared room edges form an explicit circulation graph. Public rooms are
    # preferred so private bedrooms do not become passageways when avoidable.
    def privacy(i):
        name=rooms[i]['name'];return 30 if 'BEDROOM' in name else 12 if 'BATH' in name or name=='POWDER' else 7 if 'DRESS' in name else 0
    graph=[]
    for w in walls:
        if len(w['owners'])!=2:continue
        i,j=w['owners'];length=math.dist(w['a'],w['b'])
        if any(rooms[k]['out'] and not any(v in rooms[k]['name'] for v in ['PORCH','COURT','FRONT','LAWN','SIT OUT']) for k in (i,j)):continue
        width=2.5 if any(any(v in rooms[k]['name'] for v in ['BATH','POWDER','DRESS','PASSAGE']) for k in (i,j)) or length<3.4 else 3
        if length>=width+.25:graph.append((privacy(i)+privacy(j),-length,i,j,w,width))
    reached={i for i,rm in enumerate(rooms) if 'PORCH' in rm['name']};doors=[]
    while True:
        eligible=[e for e in graph if (e[2] in reached)!=(e[3] in reached)]
        if not eligible:break
        _,_,i,j,w,width=min(eligible,key=lambda e:(e[0],e[1],e[4]['id']))
        reached|={i,j};doors.append({'wall':w,'width':width,'center':.5,'swing':'left','code':'D2' if width==2.5 else 'D1','height':7,'sill':0})
    for d in doors:
        names={rooms[k]['name'] for k in d['wall']['owners']}
        if 'ENTRY GALLERY' in names and 'ENTRANCE / STAIR LOBBY' in names:d['center']=.8
    missing=[rm['name'] for i,rm in enumerate(rooms) if not rm['out'] and i not in reached]
    if missing:raise ValueError('Unconnected rooms: '+str(missing))
    # Window positions are designed here and explicitly appear in the drawing.
    windows=[]
    for i,rm in enumerate(rooms):
        if rm['out'] or any(v in rm['name'] for v in ['PASSAGE','HALL','GALLERY','LOBBY','DRESS']):continue
        small='BATH' in rm['name'] or rm['name']=='POWDER';width=2 if small else 4
        candidates=sorted([w for w in walls if i in w['owners'] and w['exterior'] and math.dist(w['a'],w['b'])>=width+.5],key=lambda w:-math.dist(w['a'],w['b']))
        for w in candidates[:1]:
            length=math.dist(w['a'],w['b']);pos=.5
            existing=[d for d in doors if d['wall'] is w]
            for option in [.5,.2,.8]:
                if option*length-width/2<.15 or option*length+width/2>length-.15:continue
                if not any(abs((option-d['center'])*length)<(width+d['width'])/2+.2 for d in existing):pos=option;break
            else:continue
            windows.append({'wall':w,'width':width,'center':pos,'code':'V1' if small else 'W1','height':2.5 if small else 4,'sill':4.5 if small else 3})
    gate={'id':'wall-front-gate','a':(.5,spec['h']-.5),'b':(spec['w']-.5,spec['h']-.5),'owners':[],'t':.5,'height':5,'exterior':True};walls.append(gate)
    porch=next(rm for rm in rooms if 'PORCH' in rm['name']);px,py,px2,py2=box(porch['poly']);gate_width=20 if spec['beds']==4 else 10
    center_gate=(px+px2)/2;gate_width=min(gate_width,px2-px-1)
    doors.append({'wall':gate,'width':gate_width,'center':(center_gate-.5)/(spec['w']-1),'swing':'sliding','code':'G1','height':4.5,'sill':0})
    def clear_poly(rm):
        poly=rm['poly']
        if rm['out']:return poly
        result=[]
        def offset(a,b):
            t=.5
            for w in walls:
                if rm['id'] not in [rooms[i]['id'] for i in w['owners']]:continue
                if a[1]==b[1]==w['a'][1]==w['b'][1] or a[0]==b[0]==w['a'][0]==w['b'][0]:t=max(t,w['t'])
            length=math.dist(a,b);return (-(b[1]-a[1])/length*t/2,(b[0]-a[0])/length*t/2)
        for k,p in enumerate(poly):
            n1=offset(poly[k-1],p);n2=offset(p,poly[(k+1)%len(poly)])
            result.append((p[0]+n1[0]+n2[0],p[1]+n1[1]+n2[1]))
        return result
    plan_rooms=[]
    for rm in rooms:
        rm['clear']=clear_poly(rm);x,y,x2,y2=box(rm['clear']);label=dim(x2-x)+' × '+dim(y2-y)
        rm['dimension']=label
        plan_rooms.append({'id':rm['id'],'name':rm['name'].title(),'boundary':[point(p) for p in rm['clear']],'floorMaterialKey':'tile' if rm['out'] or any(v in rm['name'] for v in ['BATH','KITCHEN','POWDER','LAUNDRY']) else 'wood','outdoor':rm['out'],'ceilingHeight':9.5*FT,'source':'manual','declaredSize':{'width':(x2-x)*FT,'length':(y2-y)*FT,'sourceText':label+(' MAX' if len(rm['poly'])>4 else ''),'confidence':1},'dimensionStatus':'confirmed'})
    def opening(o,i,window=False):
        w=o['wall'];length=math.dist(w['a'],w['b'])
        return {'id':('window-' if window else 'door-')+f'{i+1:02d}','wallId':w['id'],'offset':(o['center']*length-o['width']/2)*FT,'width':o['width']*FT,'height':o['height']*FT,'sillHeight':o['sill']*FT,'swing':None if window else o.get('swing','left'),'openAngle':0 if o.get('swing')=='sliding' else 80,'color':'#b5d1dc' if window else '#ae8761','frameColor':'#64736a','source':'manual','confidence':1}
    jswindows=[opening(o,i,True) for i,o in enumerate(windows)]
    for o in jswindows:o.pop('swing')
    sx,sy,sx2,sy2,shape=spec['stair']
    stairs=[{'id':'stair-main','boundary':[point(p) for p in rect(sx,sy,sx2,sy2)],'fromLevel':0,'toLevel':1,'direction':'up','shape':shape,'height':9.5*FT,'steps':17,'rotation':0,'color':'#c6b598','source':'manual'}]
    plan={'schemaVersion':1,'unit':'ft','plot':{'width':spec['w']*FT,'length':spec['h']*FT,'marlaSquareFeet':272.25},'walls':[{'id':w['id'],'start':point(w['a']),'end':point(w['b']),'height':w['height']*FT,'thickness':w['t']*FT,'type':'exterior' if w['exterior'] else 'interior','source':'manual','color':'#f0ede5'} for w in walls],'rooms':plan_rooms,'doors':[opening(o,i) for i,o in enumerate(doors)],'windows':jswindows,'stairs':stairs,'columns':[],'furniture':[],'metadata':{'accuracyStatus':'reviewed','analysisNotes':['Original generated architectural test layout. PNG and JSON use the same wall and opening coordinates.','Room dimensions are clear bounding extents; MAX identifies irregular rooms. Outer dimension chains use wall centre lines.','Single ground floor only. Stair rise and upper-floor connection are concept assumptions.'],'dimensions':[{'id':f'dim-{i}','text':r['declaredSize']['sourceText'],'axis':'room','valueMeters':r['declaredSize']['width'],'lengthMeters':r['declaredSize']['length'],'roomId':r['id'],'confidence':1,'status':'confirmed'} for i,r in enumerate(plan_rooms)],'imageRegistration':{'width':math.ceil(PW*DPI/72),'height':math.ceil(PH*DPI/72),'left':OX*DPI/72,'top':(PH-TOP)*DPI/72,'pixelsPerMeter':864/spec['scale']*DPI/72/FT}}}
    spec.update(walls=walls,doors=doors,windows=windows,plan=plan)
    return plan

def draw(c,spec,index):
    scale=864/spec['scale'];H=spec['h'];W=spec['w']
    def xy(p):return OX+p[0]*scale,TOP-p[1]*scale
    def line(a,b,width=.5,color='#242424'):
        c.setStrokeColor(color);c.setLineWidth(width);c.line(*a,*b)
    def path(poly,fill=None,stroke='#222222',width=.5):
        p=c.beginPath();p.moveTo(*xy(poly[0]))
        for a in poly[1:]:p.lineTo(*xy(a))
        p.close();c.setStrokeColor(stroke);c.setLineWidth(width)
        if fill:c.setFillColor(fill)
        c.drawPath(p,stroke=1,fill=bool(fill))
    def text(x,y,txt,size=8,font='Times-Roman',color='#18344e',align='center'):
        c.setFillColor(color);c.setFont(font,size)
        (c.drawCentredString if align=='center' else c.drawString)(x,y,txt)
    def arrow(a,b):
        line(a,b,.45);dx=b[0]-a[0];dy=b[1]-a[1];n=math.hypot(dx,dy);ux,uy=dx/n,dy/n
        for p,sgn in [(a,1),(b,-1)]:line((p[0]-uy*2+ux*sgn*4,p[1]+ux*2+uy*sgn*4),p,.45);line((p[0]+uy*2+ux*sgn*4,p[1]-ux*2+uy*sgn*4),p,.45)
    def hdim(a,b,y,label):
        x=xy((a,0))[0];x2=xy((b,0))[0];arrow((x,y),(x2,y));text((x+x2)/2,y+4,label,8)
        line((x,y-5),(x,y+5),.35);line((x2,y-5),(x2,y+5),.35)
    def vdim(a,b,x,label):
        y=xy((0,a))[1];y2=xy((0,b))[1];arrow((x,y),(x,y2));c.saveState();c.translate(x-4,(y+y2)/2);c.rotate(90);text(0,0,label,7.5);c.restoreState()
        line((x-5,y),(x+5,y),.35);line((x-5,y2),(x+5,y2),.35)
    c.setStrokeColor('#222222');c.setLineWidth(.8);c.rect(18,18,PW-36,PH-36)
    text(36,PH-44,'BLUEPRINT3D  /  ARCHITECTURAL TEST SERIES',10,'Helvetica-Bold',align='left',color='#222222')
    text(36,PH-67,spec['title'],17,'Times-Bold',align='left');text(36,PH-84,spec['subtitle'],9,align='left',color='#555555')
    line((18,PH-101),(PW-18,PH-101),.7);line((650,18),(650,PH-101),.7)
    path(rect(0,0,W,H),stroke='#888888',width=.4)
    for rm in spec['rooms']:
        if rm['out']:
            p=rm['poly'];path(p,fill='#f6f6f3',stroke='#c4c4c0',width=.25)
    for w in spec['walls']:line(xy(w['a']),xy(w['b']),w['t']*scale,'#222222')
    for w in spec['walls']:line(xy(w['a']),xy(w['b']),max(.5,w['t']*scale-1.15),'#ffffff')
    for o in spec['doors']+spec['windows']:
        w=o['wall'];a=w['a'];b=w['b'];length=math.dist(a,b);ux=(b[0]-a[0])/length;uy=(b[1]-a[1])/length
        start=(a[0]+ux*(length*o['center']-o['width']/2),a[1]+uy*(length*o['center']-o['width']/2));end=(start[0]+ux*o['width'],start[1]+uy*o['width'])
        line(xy(start),xy(end),(w['t']+.08)*scale,'#ffffff')
        is_window='swing' not in o
        if is_window:
            for offset in [-w['t']/2,0,w['t']/2]:line(xy((start[0]-uy*offset,start[1]+ux*offset)),xy((end[0]-uy*offset,end[1]+ux*offset)),.55,'#333333')
            for p in [start,end]:line(xy((p[0]-uy*w['t']/2,p[1]+ux*w['t']/2)),xy((p[0]+uy*w['t']/2,p[1]-ux*w['t']/2)),.5)
        elif o['swing']=='sliding':
            line(xy(start),xy(end),1.2);mid=((start[0]+end[0])/2,(start[1]+end[1])/2);line(xy((mid[0],mid[1]-.35)),xy((end[0],end[1]-.35)),.5)
        else:
            leaf=(start[0]+uy*o['width'],start[1]-ux*o['width']);line(xy(start),xy(leaf),.75)
            points=[(start[0]+o['width']*(ux*math.cos(t)+uy*math.sin(t)),start[1]+o['width']*(uy*math.cos(t)-ux*math.sin(t))) for t in [math.pi/2*i/24 for i in range(25)]]
            for p,q in zip(points,points[1:]):line(xy(p),xy(q),.35,'#777777')
        mid=((start[0]+end[0])/2,(start[1]+end[1])/2);mx,my=xy(mid);text(mx-uy*8,my-ux*8,o['code'],5.5,'Helvetica',color='#696969')
    # Plumbing symbols and kitchen worktops, deliberately lighter than walls.
    for rm in spec['rooms']:
        x,y,x2,y2=box(rm['clear']);name=rm['name']
        if 'BATH' in name or name=='POWDER':
            px,py=xy((x+1.2,y+1.5));c.setStrokeColor('#6d6d6d');c.setLineWidth(.5);c.ellipse(px-.65*scale,py-.8*scale,px+.65*scale,py+.8*scale);c.rect(px-.7*scale,py+.55*scale,1.4*scale,.55*scale)
            bx,by=xy((x2-1,y+1));c.ellipse(bx-.65*scale,by-.4*scale,bx+.65*scale,by+.4*scale)
        elif name=='KITCHEN':
            path(rect(x+.1,y+.1,x2-.1,y+1.9),stroke='#888888',width=.4)
            px,py=xy((x+1.4,y+1));c.setStrokeColor('#777777');c.circle(px,py,.45*scale)
            px,py=xy((x2-2,y+1));c.roundRect(px-.7*scale,py-.45*scale,1.4*scale,.9*scale,2)
            text(*xy(((x+x2)/2,y+2.6)),'COUNTER / SINK / HOB',5.8,color='#777777')
    # Stair geometry has its own outline, treads, walking line and UP marker.
    x,y,x2,y2,shape=spec['stair'];path(rect(x,y,x2,y2),stroke='#777777',width=.45)
    if shape=='curved':
        cx=(x+x2)/2;cy=y2;rad=(x2-x)/2;inner=rad*.38
        for k in range(18):
            a=math.pi*k/17;line(xy((cx+inner*math.cos(a),cy-inner*math.sin(a))),xy((cx+rad*math.cos(a),cy-rad*math.sin(a))),.45)
        for rr in [inner,rad]:
            pp=[(cx+rr*math.cos(math.pi*k/60),cy-rr*math.sin(math.pi*k/60)) for k in range(61)]
            for p,q in zip(pp,pp[1:]):line(xy(p),xy(q),.6)
        text(*xy((cx,y2-inner/2)),'UP',7,'Times-Bold')
    else:
        landing=(x2-x)/2;run=y2-y-landing;mid=(x+x2)/2
        for k in range(10):line(xy((x,y+landing+run*k/9)),xy((mid-.2,y+landing+run*k/9)),.45)
        for k in range(9):line(xy((mid+.2,y+landing+run*k/8)),xy((x2,y+landing+run*k/8)),.45)
        line(xy((mid-.2,y+landing)),xy((mid-.2,y2)),.5);line(xy((mid+.2,y+landing)),xy((mid+.2,y2)),.5)
        arrow(xy((x+(mid-x)/2,y2-.7)),xy((x+(mid-x)/2,y+landing+.5)));text(*xy((mid,y+.6)),'UP  /  17 RISERS',6,'Helvetica')
    for rm in spec['rooms']:
        if 'STAIR HALL' in rm['name']:continue
        p=rm['label'] or center(rm['clear']);x,y,x2,y2=box(rm['clear']);p=((x+x2)/2,y+(y2-y)*.77) if 'BATH' in rm['name'] or rm['name']=='POWDER' else p;px,py=xy(p);rotate=(x2-x)<5 and (y2-y)>(x2-x)*1.6
        c.saveState();c.translate(px,py)
        if rotate:c.rotate(90)
        available=((y2-y) if rotate else (x2-x))*scale-8;name=rm['name'];fs=8.7
        while stringWidth(name,'Times-Bold',fs)>available and fs>5.5:fs-=.3
        label=rm['dimension'];ds=min(8,max(5.5,available/max(1,stringWidth(label,'Times-Roman',8))*8))
        c.setFillColor('#f6f6f3' if rm['out'] else '#ffffff');mask=max(stringWidth(name,'Times-Bold',fs),stringWidth(label,'Times-Roman',ds))+4;c.rect(-mask/2,-10,mask,fs+17,stroke=0,fill=1);text(0,4,name,fs,'Times-Bold');text(0,-8,label,ds);text(0,-18,'MAX. EXTENT' if len(rm['poly'])>4 else 'OPEN TO SKY' if rm['out'] and 'PORCH' not in name else '',5.5,'Helvetica',color='#777777');c.restoreState()
    hdim(0,W,TOP+42,dim(W));hdim(spec['xs'][0],spec['xs'][-1],TOP+19,'')
    for a,b in zip(spec['xs'],spec['xs'][1:]):hdim(a,b,TOP+19,dim(b-a))
    vdim(0,H,46,dim(H))
    for a,b in zip(spec['ys'],spec['ys'][1:]):vdim(a,b,OX+W*scale+24,dim(b-a))
    bottom=TOP-H*scale;hdim(0,W,bottom-32,dim(W));text(OX+W*scale/2,bottom-61,'ROAD / STREET FRONT',10,'Times-Bold',color='#444444')
    # North marker, graphical scale and conventional technical title column.
    nx,ny=606,TOP-20;arrow((nx,ny-20),(nx,ny+18));text(nx,ny+25,'N',10,'Times-Bold');line((nx-11,ny-2),(nx+11,ny-2),.5)
    tx=664;right=PW-30
    def side(y,txt,size=8,bold=False):text(tx,y,txt,size,'Helvetica-Bold' if bold else 'Helvetica',align='left',color='#333333')
    side(1080,'GROUND FLOOR',12,True);side(1063,'DIMENSIONED PLAN',9,True)
    side(1032,'DRAWING  GF-0'+str(index+1),9,True);side(1015,'REV A  |  15 OCT 2026',7)
    side(988,'PLOT SCHEDULE',8,True)
    for k,t in enumerate([dim(W)+' x '+dim(H),f'{W*H:,.2f} sq ft',f'{W*H/272.25:.2f} MARLA',f'{spec["beds"]} BEDROOMS',f'{len(spec["rooms"])} NAMED SPACES',f'SCALE  1:{spec["scale"]}  ON A3']):side(970-k*16,t,7.5)
    line((tx,863),(right,863),.5);side(845,'GENERAL NOTES',8,True)
    notes=['All dimensions in feet/inches.','Room labels: clear floor extents.','MAX: irregular room envelope.','Outer chains: wall centre lines.','External walls: 9 inches.','Internal partitions: 6 inches.','Wall height: 9 feet 6 inches.','D1: 3 feet x 7 feet.','D2: 2 feet 6 inches x 7 feet.','W1: 4 feet x 4 feet.','W1 sill: 3 feet above floor.','V1: 2 feet x 2 feet 6 inches.','V1 sill: 4 feet 6 inches.','G1: sliding front gate.','Stair: 17 risers to upper level.','Upper-floor plan not included.']
    for k,t in enumerate(notes):side(827-k*13.5,t,6.7)
    sy=588;line((tx,sy),(right,sy),.5);side(sy-19,'OPENING SCHEDULE',8,True)
    counts=collections.Counter(o['code'] for o in spec['doors']+spec['windows'])
    for k,(code,n) in enumerate(sorted(counts.items())):side(sy-40-k*17,f'{code}      QUANTITY {n}',7.5)
    side(421,'ROOM INDEX',8,True)
    for k,rm in enumerate(spec['rooms']):
        name=rm['name'];size=6.2
        while stringWidth(name,'Helvetica',size)>right-tx-23:size-=.2
        side(404-k*10.4,f'{k+1:02d}',5.8);text(tx+20,404-k*10.4,name,size,'Helvetica',align='left',color='#444444')
    line((tx,91),(right,91),.5);side(74,'ORIGINAL CONCEPT',8,True);side(60,'APP TEST DRAWING',7,True);side(43,'SHEET '+str(index+1)+' OF 4',7)
    text(35,76,'ARCHITECTURAL RECOGNITION TEST SET',9,'Helvetica-Bold',align='left',color='#333333')
    text(35,60,'Doors, windows, fixtures, stairs, service spaces and dimension chains are deliberately included.',7.5,align='left',color='#555555')
    text(35,45,'Concept layouts for app testing. Dimensions and symbols share the supplied editable JSON geometry.',7.5,align='left',color='#555555')
    # Scale bar: correct only at the stated A3 print size.
    bx,by=35,111
    for k in range(4):c.setFillColor('#222222' if k%2==0 else '#ffffff');c.setStrokeColor('#222222');c.rect(bx+k*2.5*scale,by,2.5*scale,5,fill=1)
    for k in range(5):text(bx+k*2.5*scale,by-10,str(k*2.5),6,'Helvetica',color='#444444')
    text(bx+10*scale+12,by-1,'FEET',6,'Helvetica',align='left',color='#444444')
    c.showPage()

if __name__=='__main__':
    c=canvas.Canvas(str(PDF/'architectural-blueprints.pdf'),pagesize=A3,pageCompression=1)
    c.setTitle('Four detailed architectural house blueprints');c.setAuthor('Blueprint3D - Original test layouts')
    manifest=[]
    for i,spec in enumerate(SPECS):
        plan=build(spec);(OUT/(spec['id']+'.json')).write_text(json.dumps(plan,indent=2),encoding='utf-8');draw(c,spec,i)
        manifest.append({k:spec[k] for k in ['id','title','subtitle','w','h','beds','scale']})
        print(spec['id'],len(plan['rooms']),'spaces;',len(plan['walls']),'walls;',len(plan['doors']),'doors;',len(plan['windows']),'windows')
    c.save();(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print('Saved',PDF/'architectural-blueprints.pdf')
