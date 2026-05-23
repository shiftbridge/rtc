import { ServerWebSocket } from "bun";

const room = "chat-room";

interface WebSocketData {
  id: string;
}

const server = Bun.serve<WebSocketData>({
  port: 3001,
  fetch(req, server) {
    const upgraded = server.upgrade(req, {
      data: { id: crypto.randomUUID() }
    });
    if (upgraded) return;
    return new Response("Upgrade failed", { status: 400 });
  },
  websocket: {
    open(ws: ServerWebSocket<WebSocketData>) {
      ws.subscribe(room);
      console.log(`User connected: ${ws.data.id}`);
    },
    message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
      try {
        const messageString = typeof message === "string" ? message : message.toString();
        const parsed = JSON.parse(messageString);
        
        console.log(`[Room: ${parsed.room}] ${parsed.user}: ${parsed.text}`);
        
        // Broadcast the message to all connected clients
        server.publish(room, messageString);
      } catch (error) {
        console.error("Failed to process message:", error);
      }
    },
    close(ws: ServerWebSocket<WebSocketData>) {
      ws.unsubscribe(room);
      console.log(`User disconnected: ${ws.data.id}`);
    },
  },
});

console.log(`🚀 Bun TS WebSocket server running on ws://localhost:3001`);