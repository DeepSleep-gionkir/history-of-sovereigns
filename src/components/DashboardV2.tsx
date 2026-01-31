import React, { useState } from "react";
import { NationData } from "@/types/db";
import { ActionResponse, LogEntry } from "@/types/api";
import { auth } from "@/lib/firebase";
import DashboardShell from "./dashboard/DashboardShell";
import ResourceTicker from "./dashboard/ResourceTicker";
import SovereignCard from "./dashboard/SovereignCard";
import ActionCenter from "./dashboard/ActionCenter";
import PolicyTree from "./dashboard/PolicyTree";
import FactionCourt from "./dashboard/FactionCourt";

interface Props {
  data: NationData;
}

export default function DashboardV2({ data }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const handleCommand = async (cmd: string) => {
    setIsProcessing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Authentication lost. Please reload.");

      const res = await fetch("/api/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: data.uid,
          command: cmd,
        }),
      });

      const json: ActionResponse = await res.json();

      if (json.success && json.result) {
        const newLog: LogEntry = {
          id: Date.now().toString(),
          timestamp: new Date(),
          command: cmd,
          result: json.result.narrative,
          headline: json.result.news_headline,
        };
        setLogs((prev) => [...prev, newLog]);
      } else {
        const errorLog: LogEntry = {
          id: Date.now().toString(),
          timestamp: new Date(),
          command: cmd,
          result: `ERROR: ${json.error || "Unknown Failure"}`,
          headline: "System Alert",
        };
        setLogs((prev) => [...prev, errorLog]);
      }
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "Unknown System Failure";
      const errorLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date(),
        command: cmd,
        result: `CRITICAL FAILURE: ${errorMessage}`,
        headline: "Connection Lost",
      };
      setLogs((prev) => [...prev, errorLog]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardShell>
      {/* Top Bar: Resources */}
      <header className="animate-in slide-in-from-top-4 duration-700">
        <ResourceTicker resources={data.resources} />
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column: Identity & Stats (4 cols) */}
        <div className="lg:col-span-4 space-y-6 animate-in slide-in-from-left-4 duration-700 delay-100">
          <SovereignCard identity={data.identity} />

          {/* Placeholder for Quick Stats */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[200px]">
            <h3 className="text-gray-400 text-sm font-bold uppercase mb-4">
              State Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Stat Items */}
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {data.stats.stability}%
                </div>
                <div className="text-xs text-gray-500">Stability</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {data.stats.legitimacy}%
                </div>
                <div className="text-xs text-gray-500">Legitimacy</div>
              </div>
            </div>
          </div>

          <FactionCourt factions={data.factions} />
        </div>

        {/* Right Column: Action Center & Content (8 cols) */}
        <div className="lg:col-span-8 space-y-6 animate-in slide-in-from-right-4 duration-700 delay-200">
          <ActionCenter
            onCommand={handleCommand}
            isProcessing={isProcessing}
            logs={logs}
          />
          <PolicyTree policies={data.policies} />
        </div>
      </main>
    </DashboardShell>
  );
}
