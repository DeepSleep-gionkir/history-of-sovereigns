import React from "react";
import { NationData } from "@/types/db";
import { FaUsers, FaArrowUp, FaArrowDown } from "react-icons/fa";

interface Props {
  factions: NationData["factions"];
}

const TrendIcon = ({ val }: { val: number }) => {
  if (val > 0) return <FaArrowUp className="text-green-400 text-[10px]" />;
  if (val < 0) return <FaArrowDown className="text-red-400 text-[10px]" />;
  return <span className="text-gray-500 text-[10px]">-</span>;
};

export default function FactionCourt({ factions }: Props) {
  if (!factions) return null;

  return (
    <div className="bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
      <h3 className="font-display text-lg text-white mb-4 flex items-center gap-2">
        <FaUsers className="text-gray-400" />
        Royal Court & Factions
      </h3>

      <div className="space-y-3">
        {Object.entries(factions).map(([id, f]) => (
          <div
            key={id}
            className="group relative bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-4 transition-all overflow-hidden"
          >
            {/* Power Bar Background */}
            <div className="absolute bottom-0 left-0 h-1 bg-gray-800 w-full">
              <div
                className="h-full bg-accent-cyan transition-all duration-1000"
                style={{ width: `${f.power}%` }}
              />
            </div>

            <div className="flex justify-between items-center relative z-10">
              <div>
                <h4 className="font-bold text-gray-200 text-sm group-hover:text-white transition-colors capitalize">
                  {id}
                </h4>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span
                    className={
                      f.loyalty > 50 ? "text-green-400" : "text-red-400"
                    }
                  >
                    Loyalty: {f.loyalty}%
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold text-white flex items-center justify-end gap-1">
                  {f.power}%
                  <TrendIcon val={0} />
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">
                  Influence
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
