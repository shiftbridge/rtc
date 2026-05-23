'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeEntryPage() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('general');
  const router = useRouter();

  const handleJoin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim() || !room.trim()) return;
    router.push(`/room/${room.toLowerCase().trim()}?username=${encodeURIComponent(username)}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 font-bold text-slate-900 shadow-sm mb-3 text-xl">
            💬
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Join a Chat Hub</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your details to start chatting in real-time</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
            <input 
              type="text" 
              required
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="e.g., Alice"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Room Name</label>
            <input 
              type="text" 
              required
              value={room} 
              onChange={(e) => setRoom(e.target.value)} 
              placeholder="e.g., general, gaming"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <button 
            type="submit" 
            className="w-full rounded-xl bg-amber-400 py-3.5 text-sm font-semibold text-slate-900 shadow-md shadow-amber-400/20 transition-all hover:bg-amber-500 hover:shadow-lg active:scale-[0.98]"
          >
            Enter Chat Room
          </button>
        </form>
      </div>
    </div>
  );
}