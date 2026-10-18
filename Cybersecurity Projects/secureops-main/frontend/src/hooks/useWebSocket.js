import { useEffect } from 'react';

export function useWebSocket(url, handlers = {}, protocols = undefined) {
  useEffect(() => {
    if (!url) return undefined;
    let socket;
    let retryTimer;
    let closed = false;

    const connect = () => {
      socket = protocols ? new WebSocket(url, protocols) : new WebSocket(url);
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handlers[message.type]?.(message.payload, message);
          handlers.message?.(message);
        } catch {
          handlers.message?.({ type: 'raw', payload: event.data });
        }
      };
      socket.onclose = () => {
        if (!closed) {
          retryTimer = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [url, protocols?.join('|')]);
}
