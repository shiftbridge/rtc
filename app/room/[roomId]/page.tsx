"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Pusher from "pusher-js";
import { Message } from "@/types/chat";

export default function ChatRoomPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId;
  const username = searchParams.get("username") || "Anonymous";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const [memberCount, setMemberCount] = useState<number>(1);
  const [memberList, setMemberList] = useState<string[]>([]);

  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const remoteTypingTimeoutsRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_PUSHER_KEY ||
      !process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    )
      return;

    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      forceTLS: true,
      channelAuthorization: {
        endpoint: "/api/pusher/auth",
        transport: "ajax",
        params: { username },
      },
    });

    const channel = pusherClient.subscribe(`presence-room-${roomId}`);
    channelRef.current = channel;

    pusherClient.connection.bind("connected", () => setIsConnected(true));
    pusherClient.connection.bind("disconnected", () => setIsConnected(false));

    channel.bind("pusher:subscription_error", (status: any) => {
      if (status.status === 403) {
        router.push("/?error=taken");
      }
    });

    channel.bind("pusher:subscription_succeeded", (members: any) => {
      setMemberCount(members.count);
      const names: string[] = [];
      members.each((member: any) => names.push(member.id));
      setMemberList(names);
    });

    channel.bind("pusher:member_added", (member: any) => {
      setMemberCount((prev) => prev + 1);
      setMemberList((prev) => [...prev, member.id]);
    });

    channel.bind("pusher:member_removed", (member: any) => {
      setMemberCount((prev) => Math.max(1, prev - 1));
      setMemberList((prev) => prev.filter((name) => name !== member.id));
      setTypingUsers((prev) => prev.filter((u) => u !== member.id));
    });

    channel.bind("new-message", (data: Message) => {
      setMessages((prev) => [...prev, data]);
      setTypingUsers((prev) => prev.filter((u) => u !== data.user));
    });

    channel.bind("client-typing", (data: { user: string }) => {
      if (data.user === username) return;
      setTypingUsers((prev) =>
        prev.includes(data.user) ? prev : [...prev, data.user],
      );

      if (remoteTypingTimeoutsRef.current[data.user])
        clearTimeout(remoteTypingTimeoutsRef.current[data.user]);
      remoteTypingTimeoutsRef.current[data.user] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== data.user));
      }, 2500);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusherClient.disconnect();
      Object.values(remoteTypingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [roomId, username, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const handleInputChange = (text: string) => {
    setInput(text);
    if (!channelRef.current || !isConnected) return;

    if (!typingTimeoutRef.current) {
      channelRef.current.trigger("client-typing", { user: username });
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 1000);
    }
  };

  const sendMessage = async (formData: FormData) => {
    const messageText = formData.get("message")?.toString().trim();
    if (!messageText) return;

    setInput("");

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room: roomId,
        user: username,
        text: messageText,
      }),
    });
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 font-sans antialiased text-slate-200 overflow-hidden relative">
      {/* LEFT AREA: Main Chat Dashboard */}
      <div className="flex grow flex-col min-w-0 border-r border-white/6 bg-slate-900/20 backdrop-blur-md h-full">
        {/* Nav Header Bar */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/6 px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors duration-200"
            >
              <span>←</span> <span className="hidden sm:inline">Leave</span>
            </button>
            <div className="h-4 w-px bg-white/8" />
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-slate-400">#</span>
              <h2 className="text-sm sm:text-base font-bold capitalize tracking-tight text-white truncate max-w-25 sm:max-w-none">
                {roomId}
              </h2>
            </div>
          </div>

          {/* Trigger button for mobile sidebar panel drawer */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2 rounded-full border border-white/6 bg-white/2 px-3 py-1.5 text-xs font-medium hover:bg-white/5 active:scale-95 transition-all md:pointer-events-none"
          >
            <span
              className={`h-2 w-2 rounded-full ring-4 ${
                isConnected
                  ? "bg-emerald-500 ring-emerald-500/10 animate-pulse"
                  : "bg-rose-500 ring-rose-500/10"
              }`}
            />
            <span className="text-slate-400">
              {memberCount} <span className="hidden sm:inline">online</span>
            </span>
          </button>
        </div>

        {/* Dynamic Messaging Window */}
        <div className="grow overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
              <div className="h-11 w-11 rounded-2xl bg-white/2 border border-white/6 flex items-center justify-center text-lg shadow-inner mb-4">
                👋
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Welcome to #{roomId}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This is the absolute beginning of your real-time chat history.
                Send a message to break the ice!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.user === username;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col group ${isMe ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-slate-300">
                      {isMe ? "You" : msg.user}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {msg.timestamp}
                    </span>
                  </div>
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-lg wrap-break-word transition-all duration-200
                    ${
                      isMe
                        ? "bg-white text-slate-950 rounded-tr-none font-medium shadow-white/5"
                        : "bg-white/3 text-slate-200 border border-white/6 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-slate-400 bg-white/2 border border-white/4 rounded-xl px-3.5 py-2 w-fit animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex gap-1 items-center justify-center">
                <span className="h-1 w-1 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1 w-1 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1 w-1 rounded-full bg-amber-400 animate-bounce" />
              </div>
              <span className="font-medium text-[11px] sm:text-xs">
                {typingUsers.join(", ")}{" "}
                {typingUsers.length === 1 ? "is" : "are"} typing...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Text Form Area */}
        <div className="p-3 sm:p-4 border-t border-white/6 bg-slate-900/40 backdrop-blur-lg shrink-0 pb-safe">
          <form
            action={sendMessage}
            className="flex gap-2 items-center max-w-4xl mx-auto w-full"
          >
            <div className="relative flex-1">
              <input
                type="text"
                name="message"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={`Message #${roomId}...`}
                autoComplete="off"
                className="w-full rounded-xl border border-white/5 bg-white/3 px-3.5 py-3 text-sm text-white placeholder-slate-500 outline-hidden transition-all duration-300 focus:border-white/20 focus:bg-white/5 focus:ring-4 focus:ring-white/5"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-xl bg-white px-4 sm:px-5 py-3 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-amber-400 disabled:bg-white/2 disabled:text-slate-600 disabled:border disabled:border-white/4 shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* MOBILE DRAWER OVERLAY BACKGROUND BARRIER */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* RIGHT AREA: Sidebar Channel Member Roster (Responsive Panel) */}
      <div
        className={`
        fixed inset-y-0 right-0 w-64 bg-slate-950 p-6 space-y-4 z-50 transform transition-transform duration-300 ease-in-out border-l border-white/6
        md:static md:translate-x-0 md:flex md:h-full md:flex-col shrink-0
        ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}
      `}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Members
          </h3>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white/4 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 ring-1 ring-white/6">
              {memberCount}
            </span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-slate-400 hover:text-white font-medium text-sm md:hidden p-1"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="grow overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {memberList.map((name) => {
            const isMe = name === username;
            return (
              <div
                key={name}
                className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/2 transition-colors duration-150 group"
              >
                <div className="relative">
                  <div className="h-7 w-7 rounded-xl bg-linear-to-b from-slate-800 to-slate-900 border border-white/8 flex items-center justify-center text-[11px] font-bold text-slate-200 uppercase tracking-wider group-hover:border-white/20 transition-colors">
                    {name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                </div>
                <span className="text-xs font-medium text-slate-300 truncate max-w-35">
                  {name}
                  {isMe && (
                    <span className="ml-1 text-[10px] text-slate-500 font-normal">
                      (you)
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
