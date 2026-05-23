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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  // Real-time tracking arrays for active members
  const [memberCount, setMemberCount] = useState<number>(1);
  const [memberList, setMemberList] = useState<string[]>([]);
  
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const remoteTypingTimeoutsRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) return;

    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      forceTLS: true,
      channelAuthorization: {
        endpoint: '/api/pusher/auth',
        transport: 'ajax',
        params: { username }
      }
    });

    const channel = pusherClient.subscribe(`presence-room-${roomId}`);
    channelRef.current = channel;

    pusherClient.connection.bind('connected', () => setIsConnected(true));
    pusherClient.connection.bind('disconnected', () => setIsConnected(false));

    channel.bind('pusher:subscription_error', (status: any) => {
      if (status.status === 403) {
        router.push('/?error=taken');
      }
    });

    // Handle initial successful room load
    channel.bind('pusher:subscription_succeeded', (members: any) => {
      setMemberCount(members.count);
      const names: string[] = [];
      members.each((member: any) => names.push(member.id));
      setMemberList(names);
    });

    // Handle a new person joining
    channel.bind('pusher:member_added', (member: any) => {
      setMemberCount((prev) => prev + 1);
      setMemberList((prev) => [...prev, member.id]);
    });

    // Handle someone leaving or closing the tab
    channel.bind('pusher:member_removed', (member: any) => {
      setMemberCount((prev) => Math.max(1, prev - 1));
      setMemberList((prev) => prev.filter(name => name !== member.id));
      setTypingUsers((prev) => prev.filter(u => u !== member.id));
    });

    channel.bind('new-message', (data: Message) => {
      setMessages((prev) => [...prev, data]);
      setTypingUsers((prev) => prev.filter(u => u !== data.user));
    });

    channel.bind('client-typing', (data: { user: string }) => {
      if (data.user === username) return;
      setTypingUsers((prev) => prev.includes(data.user) ? prev : [...prev, data.user]);

      if (remoteTypingTimeoutsRef.current[data.user]) clearTimeout(remoteTypingTimeoutsRef.current[data.user]);
      remoteTypingTimeoutsRef.current[data.user] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter(u => u !== data.user));
      }, 2500); // 2.5 second expiration window
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusherClient.disconnect();
      Object.values(remoteTypingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [roomId, username, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleInputChange = (text: string) => {
    setInput(text);
    if (!channelRef.current || !isConnected) return;

    // If there's no active timeout cooldown, fire a typing notification immediately
    if (!typingTimeoutRef.current) {
      channelRef.current.trigger('client-typing', { user: username });
    
      // Set up a 1-second cooldown. After 1 second, if you are STILL typing, 
      // it clears itself and allows the next keystroke to send a fresh heartbeat.
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 1000); 
    }
  }

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
    <div className="flex h-screen max-w-5xl mx-auto md:my-6 md:h-[calc(100vh-48px)] gap-4 px-4 font-sans">
      
      {/* LEFT AREA: Chat Panel */}
      <div className="flex grow flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Header */}
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
          
          <div className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300">{memberCount} Online</span>
          </div>
        </div>

        {/* Message Bay */}
        <div className="grow overflow-y-auto bg-slate-50 p-6 space-y-4">
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
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm font-normal wrap-break-word
                    ${isMe ? 'bg-amber-400 text-slate-900 rounded-tr-none font-medium' : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'}`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}

          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500 italic bg-slate-200/50 rounded-lg px-3 py-1.5 w-fit">
              <div className="flex gap-0.5 items-center justify-center pt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Action Box */}
        <div className="border-t border-slate-100 p-4 bg-white">
          <form onSubmit={sendMessage} className="flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={`Message #${roomId}...`}
              className="grow rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
            <button type="submit" disabled={!input.trim()} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-30">
              Send
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT AREA: Active Member Sidebar (Hidden on mobile) */}
      <div className="hidden md:flex w-64 flex-col bg-white rounded-2xl border border-slate-200 p-5 shadow-xl overflow-hidden">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
          Active Members ({memberCount})
        </h3>
        <div className="grow overflow-y-auto space-y-2.5">
          {memberList.map((name) => (
            <div key={name} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700 uppercase border border-slate-200">
                  {name.charAt(0)}
                </div>
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <span className="text-sm font-medium text-slate-700 truncate max-w-35">
                {name} {name === username && <span className="text-xs text-slate-400 font-normal">(you)</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}