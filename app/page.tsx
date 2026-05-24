"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function HomeEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("error") === "taken") {
      setErrorMsg("That username is already active in that room.");
    }
  }, [searchParams]);

  const handleJoin = (formData: FormData) => {
    setErrorMsg(null);

    const username = formData.get("username")?.toString().trim();
    const room = formData.get("room")?.toString().trim().toLowerCase();

    if (!username || !room) return;

    router.push(`/room/${room}?username=${encodeURIComponent(username)}`);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 antialiased selection:bg-amber-500/30 overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/3 h-64 w-64 md:h-72 md:w-72 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/3 h-64 w-64 md:h-72 md:w-72 rounded-full bg-orange-600/5 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/6 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-b from-amber-400 to-amber-500 text-lg shadow-lg shadow-amber-500/20 mb-4 ring-1 ring-white/20">
            💬
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            HiChat
          </h2>
          <p className="mt-1.5 text-xs text-slate-400 max-w-70 mx-auto sm:max-w-none">
            Enter a room and jump into the conversation.
          </p>
        </div>

        {/* Modern Alert Box */}
        {errorMsg && (
          <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-xs font-medium text-rose-400 animate-in fade-in duration-300">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form action={handleJoin} className="space-y-5 sm:space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              maxLength={15}
              autoComplete="off"
              placeholder="e.g., Alice"
              className="w-full rounded-2xl border border-white/5 bg-white/3 px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-hidden transition-all duration-300 focus:border-amber-500/50 focus:bg-white/6 focus:ring-4 focus:ring-amber-500/10"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="room"
              className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400"
            >
              Room Name
            </label>
            <input
              id="room"
              name="room"
              type="text"
              required
              maxLength={20}
              autoComplete="off"
              defaultValue="general"
              placeholder="e.g., general"
              className="w-full rounded-2xl border border-white/5 bg-white/3 px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-hidden transition-all duration-300 focus:border-amber-500/50 focus:bg-white/6 focus:ring-4 focus:ring-amber-500/10"
            />
          </div>

          <button
            type="submit"
            className="group relative w-full mt-2 overflow-hidden rounded-2xl bg-white py-3.5 text-sm font-semibold text-slate-950 shadow-xl transition-all duration-300 hover:bg-amber-400 active:scale-[0.98]"
          >
            Enter Chat Room
          </button>
        </form>
      </div>
    </div>
  );
}

export default function HomeEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-800 border-t-amber-400" />
        </div>
      }
    >
      <HomeEntryForm />
    </Suspense>
  );
}
