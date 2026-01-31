import React, { useState } from "react";
import { FaMagic, FaTimes, FaCheck } from "react-icons/fa";
import { auth } from "@/lib/firebase";
import { Continent } from "@/types/db";

interface Props {
  uid: string;
  isOpen: boolean;
  onClose: () => void;
  onDiscover: (continent: Continent) => void;
}

export default function ContinentDiscoveryModal({
  uid,
  isOpen,
  onClose,
  onDiscover,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "generating" | "complete">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setStep("generating");
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error("Authentication Required");

      const res = await fetch("/api/generate/continent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid }),
      });

      const json = await res.json();

      if (!json.success || !json.continent) {
        throw new Error(json.error || "Failed to manifest continent.");
      }

      setStep("complete");

      // Allow user to see the success state for a moment before callback
      setTimeout(() => {
        onDiscover(json.continent);
        onClose();
        setStep("idle");
        setLoading(false);
      }, 1500);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unknown Rift Error");
      setStep("idle");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-[#1a1a1a] border border-stroke-soft rounded-2xl p-8 shadow-2xl overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-accent-gold blur-md opacity-50" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <FaTimes />
        </button>

        <div className="text-center">
          {/* Icon Stage */}
          <div className="relative mx-auto mb-6 w-20 h-20 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
            {step === "generating" ? (
              <div className="absolute inset-0 rounded-full border-2 border-accent-gold border-t-transparent animate-spin" />
            ) : null}

            <div
              className={`text-3xl transition-all duration-500 ${step === "complete" ? "text-green-500 scale-110" : "text-accent-gold"}`}
            >
              {step === "complete" ? <FaCheck /> : <FaMagic />}
            </div>
          </div>

          {/* Typography */}
          <h2 className="headline text-2xl font-bold mb-2 text-white">
            {step === "generating" && "Fabricating Reality..."}
            {step === "complete" && "New Land Discovered"}
            {step === "idle" && "Manifest New Continent"}
          </h2>

          <p className="text-sm text-text-sub mb-8 leading-relaxed">
            {step === "generating"
              ? "The AI is sculpting mountains and carving rivers from the void."
              : step === "complete"
                ? "The cartographers have finished their work."
                : "Do you wish to expend energy to discover a new land beyond the mist? This action cannot be undone."}
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Action Button */}
          {step === "idle" && (
            <button
              onClick={handleGenerate}
              className="btn-primary w-full py-4 text-black font-bold text-lg tracking-wide hover:brightness-110"
            >
              INITIATE DISCOVERY
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
