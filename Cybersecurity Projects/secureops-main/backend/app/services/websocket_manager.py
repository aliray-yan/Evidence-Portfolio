import json
from datetime import date, datetime
from enum import Enum
from typing import Any

from fastapi import WebSocket


def _json_default(value: Any) -> str:
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    return str(value)


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, subprotocol: str | None = None) -> None:
        await websocket.accept(subprotocol=subprotocol)
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    async def broadcast(self, event_type: str, payload: dict) -> None:
        if not self._connections:
            return
        message = json.dumps({"type": event_type, "payload": payload}, default=_json_default)
        stale: list[WebSocket] = []
        for connection in list(self._connections):
            try:
                await connection.send_text(message)
            except Exception:
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)


websocket_manager = WebSocketManager()
