import React from "react";

interface Props {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: Props) {
  return (
    <div className="relative min-h-screen pb-32 overflow-x-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[#0f1a15] pointer-events-none -z-20" />
      <div
        className="absolute inset-0 opacity-10 pointer-events-none -z-10"
        style={{
          backgroundImage: "radial-gradient(#e7c676 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">
        {children}
      </div>
    </div>
  );
}
