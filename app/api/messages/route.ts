import { NextResponse } from 'next/server';
import Pusher from 'pusher';
import { Message } from '@/types/chat';

// Initialize the server-side Pusher client
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { room, user, text } = body;

    if (!room || !user || !text.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const payload: Message = {
      id: crypto.randomUUID(),
      room,
      user,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Trigger an event named 'new-message' on a channel dedicated to this specific room
    await pusher.trigger(`private-room-${room}`, 'new-message', payload);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}