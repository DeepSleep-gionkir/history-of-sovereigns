import React from "react";
import { NationData } from "@/types/db";
import { FaCrown } from "react-icons/fa";

interface Props {
  identity: NationData["identity"];
}

export default function SovereignCard({ identity }: Props) {
  return (
    <div className="bg-[#1a1a1a]/80 backdrop-blur-md border border-accent-gold/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
      {/* Decorative Glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent-gold/10 blur-[50px] rounded-full group-hover:bg-accent-gold/20 transition-all duration-700" />

      <div className="relative z-10 flex items-start gap-6">
        <div className="w-20 h-20 rounded-full border-2 border-accent-gold/50 flex items-center justify-center bg-black shadow-[0_0_20px_rgba(231,198,118,0.2)]">
          <FaCrown size={32} className="text-accent-gold" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-bold text-accent-gold border border-accent-gold/30 px-2 py-0.5 rounded uppercase tracking-widest">
              {identity.type}
            </span>
            <div className="h-px bg-white/10 flex-1" />
          </div>
          <h1 className="font-display text-3xl text-white font-bold leading-tight mb-1">
            {identity.name}
          </h1>
          <p className="text-gray-400 text-sm">
            Under the reign of{" "}
            <span className="text-white font-semibold">
              {identity.ruler_title}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
