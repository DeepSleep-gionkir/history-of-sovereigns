import React from "react";
import { NationData } from "@/types/db";
import { FaCheckCircle, FaLock } from "react-icons/fa";

interface Props {
  policies: NationData["policies"];
}

export default function PolicyTree({ policies }: Props) {
  return (
    <div className="bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
      <h3 className="font-display text-lg text-white mb-4 border-b border-white/10 pb-2">
        State Policies
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(policies || {}).map(([key, active]) => (
          <div
            key={key}
            className={`
                relative p-4 rounded-xl border transition-all duration-300
                ${
                  active
                    ? "bg-accent-gold/10 border-accent-gold/50 shadow-[0_0_15px_rgba(231,198,118,0.1)]"
                    : "bg-white/5 border-white/5 opacity-50 grayscale hover:grayscale-0 hover:bg-white/10"
                }
            `}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-gray-200 capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
              {active ? (
                <FaCheckCircle className="text-accent-gold" />
              ) : (
                <FaLock className="text-gray-600" />
              )}
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Effects of this policy would be described here.
            </p>

            {/* Visual Activation Line */}
            {active && (
              <div className="absolute bottom-0 left-0 h-1 bg-accent-gold w-full rounded-b-xl" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
