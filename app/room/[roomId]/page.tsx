'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Pusher from 'pusher-js';
import { Message } from '@/types/chat';

export default function ChatRoomPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const roomId = params.roomId;
  const username = searchParams.get('username') || 'Anonymous';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 1. Double check your browser console for this log. If either is undefined, 
    // your keys are missing from your .env.local file!
    console.log("Pusher Client Connection Request:", {
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    });

    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
      console.error("❌ Environment variables are missing!");
      return;
    }

    // 2. Initialize Pusher with explicit security and activity timeouts
    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      forceTLS: true,          // Forces wss:// instead of ws://
      enabledTransports: ['ws', 'wss'] // Prevents Firefox from lagging out on fallback HTTP pooling
    });

    const channel = pusherClient.subscribe(`room-${roomId}`);

    pusherClient.connection.bind('connected', () => setIsConnected(true));
    pusherClient.connection.bind('disconnected', () => setIsConnected(false));
    pusherClient.connection.bind('unavailable', () => setIsConnected(false));

    channel.bind('new-message', (data: Message) => {
      setMessages((prev) => [...prev, data]);
    });

    // 3. Firefox Clean-up: This block is absolutely critical.
    // When Firefox unmounts the component, we cleanly shut down the socket channel.
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusherClient.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const messageText = input;
    setInput('');

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: roomId,
        user: username,
        text: messageText,
      }),
    });
  };

  return (
    <div className="flex h-screen max-w-4xl mx-auto flex-col bg-white md:my-6 md:h-[calc(100vh-48px)] md:rounded-2xl md:border md:border-slate-200 md:shadow-xl overflow-hidden">
      
      {/* Top Header Panel */}
      <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
            ← Leave
          </button>
          <div className="h-2 w-2 rounded-full bg-slate-700" />
          <div>
            <h2 className="text-lg font-bold capitalize tracking-tight">#{roomId}</h2>
            <p className="text-xs text-slate-400">User: <span className="text-amber-400 font-semibold">{username}</span></p>
          </div>
        </div>
        
        {/* Connection Status Badge */}
        <div className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium">
          <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-slate-300">{isConnected ? 'Serverless Live' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Main Message History Bay */}
      <div className="flex-grow overflow-y-auto bg-slate-50 p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <span className="text-3xl mb-2">👋</span>
            <p className="text-sm font-medium text-slate-500">Welcome to the beginning of the #{roomId} channel!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user === username;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2 px-1 mb-1">
                  <span className="text-xs font-semibold text-slate-600">{msg.user}</span>
                  <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm font-normal break-words
                  ${isMe ? 'bg-amber-400 text-slate-900 rounded-tr-none font-medium' : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'}`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Form Action Box */}
      <div className="border-t border-slate-100 p-4 bg-white">
        <form onSubmit={sendMessage} className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${roomId}...`}
            className="flex-grow rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
          />
          <button type="submit" disabled={!input.trim()} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-30">
            Send
          </button>
        </form>
      </div>

    </div>
  );
}