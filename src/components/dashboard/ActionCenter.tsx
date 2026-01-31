import React, { useState, useRef, useEffect } from "react";
import { FaTerminal, FaChevronRight } from "react-icons/fa";
import { LogEntry } from "@/types/api";

interface Props {
  onCommand: (cmd: string) => void;
  isProcessing: boolean;
  logs: LogEntry[];
}

export default function ActionCenter({ onCommand, isProcessing, logs }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onCommand(input);
    setInput("");
  };

  return (
    <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col gap-4 min-h-[400px] h-full">
      <h2 className="font-display text-xl text-white flex items-center gap-3">
        <FaTerminal className="text-gray-500" />
        Royal Decree
      </h2>

      <div
        ref={scrollRef}
        className="flex-1 bg-black/50 rounded-xl p-4 border border-white/5 font-mono text-sm text-gray-300 overflow-y-auto custom-scrollbar h-[300px]"
      >
        {logs.length === 0 && (
          <div className="text-gray-600 italic">
            &gt; Awaiting your command, my liege...
          </div>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="text-gray-500 text-xs mb-1">
              [{log.timestamp.toLocaleTimeString()}] &gt; {log.command}
            </div>
            <div className="text-accent-gold/90 mb-1 font-bold">
              {log.headline}
            </div>
            <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {log.result}
            </div>
            <div className="h-px bg-white/5 w-full mt-2" />
          </div>
        ))}
        {isProcessing && (
          <div className="text-accent-cyan animate-pulse">
            &gt; Transmitting decree to the council...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Issue a command to your council..."
          className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-4 pr-14 text-white placeholder-gray-600 focus:outline-none focus:border-accent-gold transition-colors"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={isProcessing}
          className="absolute right-2 top-2 bottom-2 bg-accent-gold/10 hover:bg-accent-gold text-accent-gold hover:text-black rounded-lg px-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaChevronRight />
        </button>
      </form>
    </div>
  );
}
