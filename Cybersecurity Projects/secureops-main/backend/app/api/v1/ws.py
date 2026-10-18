from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.database import SessionLocal
from app.models.user import User
from app.services.websocket_manager import websocket_manager
from app.utils.security import decode_token


router = APIRouter()
WS_TOKEN_PROTOCOL = "secureops.jwt"


def _user_from_token(token: str | None) -> User | None:
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    db = SessionLocal()
    try:
        user = db.get(User, payload.get("sub"))
        if not user or not user.is_active:
            return None
        return user
    finally:
        db.close()


def _token_from_subprotocol(websocket: WebSocket) -> str | None:
    raw_protocols = websocket.headers.get("sec-websocket-protocol") or ""
    protocols = [item.strip() for item in raw_protocols.split(",") if item.strip()]
    if len(protocols) >= 2 and protocols[0] == WS_TOKEN_PROTOCOL:
        return protocols[1]
    return None


@router.websocket("/alerts")
async def alerts_ws(websocket: WebSocket) -> None:
    token = _token_from_subprotocol(websocket) or websocket.query_params.get("token")
    user = _user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await websocket_manager.connect(websocket, subprotocol=WS_TOKEN_PROTOCOL if _token_from_subprotocol(websocket) else None)
    await websocket_manager.broadcast("presence", {"message": "analyst_connected"})
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
