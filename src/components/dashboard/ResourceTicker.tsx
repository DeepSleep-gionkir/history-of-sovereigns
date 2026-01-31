import React, { memo } from "react";
import { NationData } from "@/types/db";
import { FaCoins, FaBreadSlice, FaCube, FaBolt } from "react-icons/fa";

interface Props {
  resources: NationData["resources"];
}

const TickerItem = ({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) => (
  <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm min-w-[140px]">
    <div className="text-xl">{icon}</div>
    <div className="flex flex-col">
      <span className="text-xs text-gray-400 uppercase tracking-wider">
        {label}
      </span>
      <span className="font-display font-bold text-white tracking-widest">
        {value.toLocaleString()}
      </span>
    </div>
  </div>
);

const ResourceTicker = memo(function ResourceTicker({ resources }: Props) {
  return (
    <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
      <TickerItem
        icon={<FaCoins className="text-accent-gold" />}
        value={resources.gold}
        label="Treasury"
      />
      <TickerItem
        icon={<FaBreadSlice className="text-orange-300" />}
        value={resources.food}
        label="Rations"
      />
      <TickerItem
        icon={<FaCube className="text-gray-400" />}
        value={resources.materials}
        label="Materials"
      />
      <TickerItem
        icon={<FaBolt className="text-accent-cyan" />}
        value={resources.energy}
        label="Energy"
      />
      <div className="h-8 w-px bg-white/10 mx-2" />
      <div className="text-xs text-gray-500 uppercase tracking-widest">
        Net Income: <span className="text-green-400">+12%</span>
      </div>
    </div>
  );
});

export default ResourceTicker;
