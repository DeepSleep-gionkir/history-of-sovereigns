import React, { useState } from "react";
import { FoundingForm, FoundingFormSchema, FoundingStep } from "@/types/nation";
import { FaCrown, FaScroll, FaChevronRight, FaCheck } from "react-icons/fa";
import { z } from "zod";

interface Props {
  onCancel: () => void;
  onComplete: (data: FoundingForm) => void;
}

export default function FoundingWizard({ onCancel, onComplete }: Props) {
  const [step, setStep] = useState<FoundingStep>("INTRO");
  const [formData, setFormData] = useState<Partial<FoundingForm>>({
    policies: { militaristic: false, isolationist: false },
  });
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setError(null);
    try {
      if (step === "IDENTITY") {
        z.object({
          name: FoundingFormSchema.shape.name,
          rulerTitle: FoundingFormSchema.shape.rulerTitle,
        }).parse(formData);
        setStep("IDEOLOGY");
      } else if (step === "IDEOLOGY") {
        z.object({
          ideology: FoundingFormSchema.shape.ideology,
        }).parse(formData);
        setStep("CONFIRM");
      }
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        setError((e as any).errors[0].message);
      }
    }
  };

  const submit = () => {
    try {
      const validData = FoundingFormSchema.parse(formData);
      setStep("RITUAL");
      // Simulate ritual delay
      setTimeout(() => {
        onComplete(validData);
      }, 3000);
    } catch {
      setError("Data is invalid.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f1a15]/80 to-[#0f1a15] pointer-events-none" />

      <div className="relative w-full max-w-2xl min-h-[500px] flex flex-col items-center justify-center p-8">
        {/* Progress Indicator */}
        {step !== "RITUAL" && (
          <div className="absolute top-0 left-0 right-0 flex justify-center gap-2 p-4">
            {["INTRO", "IDENTITY", "IDEOLOGY", "CONFIRM"].map((s, i) => {
              const activeIndex = [
                "INTRO",
                "IDENTITY",
                "IDEOLOGY",
                "CONFIRM",
              ].indexOf(step);
              const myIndex = i;
              return (
                <div
                  key={s}
                  className={`h-1 w-12 rounded-full transition-all duration-500 ${myIndex <= activeIndex ? "bg-accent-gold" : "bg-gray-800"}`}
                />
              );
            })}
          </div>
        )}

        {/* STEP: INTRO */}
        {step === "INTRO" && (
          <div className="text-center space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <div className="w-24 h-24 mx-auto rounded-full bg-accent-gold/10 flex items-center justify-center border border-accent-gold/30 shadow-[0_0_30px_rgba(231,198,118,0.2)]">
              <FaCrown size={40} className="text-accent-gold" />
            </div>
            <h1 className="headline text-4xl text-white">The Coronation</h1>
            <p className="text-text-sub text-lg max-w-md mx-auto leading-relaxed">
              You have claimed a territory. Now you must define the soul of your
              nation. History awaits your command.
            </p>
            <div className="pt-8">
              <button
                onClick={() => setStep("IDENTITY")}
                className="btn-primary w-64 mx-auto"
              >
                Begin the Rite
              </button>
              <button
                onClick={onCancel}
                className="mt-4 text-sm text-gray-500 hover:text-gray-300"
              >
                Abandon Claim
              </button>
            </div>
          </div>
        )}

        {/* STEP: IDENTITY */}
        {step === "IDENTITY" && (
          <div className="w-full space-y-6 animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-2xl font-display text-accent-gold text-center mb-8">
              Identify of the Sovereign
            </h2>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Nation Name
              </label>
              <input
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xl text-white focus:border-accent-gold focus:outline-none transition-colors"
                placeholder="e.g. The Etherian Empire"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Ruler Title
              </label>
              <input
                value={formData.rulerTitle || ""}
                onChange={(e) =>
                  setFormData({ ...formData, rulerTitle: e.target.value })
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xl text-white focus:border-accent-gold focus:outline-none transition-colors"
                placeholder="e.g. High King, Prime Archon"
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setStep("INTRO")}
                className="flex-1 bg-transparent border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/5"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-2 bg-accent-gold text-black font-bold py-3 rounded-xl hover:bg-white flex items-center justify-center gap-2 w-full"
              >
                Next <FaChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* STEP: IDEOLOGY */}
        {step === "IDEOLOGY" && (
          <div className="w-full space-y-6 animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-2xl font-display text-accent-gold text-center mb-8">
              Core Ideology
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  id: "AUTHORITY",
                  label: "Authority",
                  desc: "Order, Strength, Control",
                  icon: "⚔️",
                },
                {
                  id: "LIBERTY",
                  label: "Liberty",
                  desc: "Trade, Freedom, Wealth",
                  icon: "🕊️",
                },
                {
                  id: "TRADITION",
                  label: "Tradition",
                  desc: "Heritage, Faith, Stability",
                  icon: "🕍",
                },
                {
                  id: "PROGRESS",
                  label: "Progress",
                  desc: "Innovation, Future, Logic",
                  icon: "🔮",
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() =>
                    setFormData({ ...formData, ideology: opt.id as any })
                  }
                  className={`
                                cursor-pointer p-4 rounded-xl border transition-all duration-300
                                ${
                                  formData.ideology === opt.id
                                    ? "bg-accent-gold/20 border-accent-gold shadow-[0_0_15px_rgba(231,198,118,0.3)]"
                                    : "bg-white/5 border-white/10 hover:border-white/30"
                                }
                            `}
                >
                  <div className="text-2xl mb-2">{opt.icon}</div>
                  <div className="font-bold text-white">{opt.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{opt.desc}</div>
                </div>
              ))}
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setStep("IDENTITY")}
                className="flex-1 bg-transparent border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/5"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-2 bg-accent-gold text-black font-bold py-3 rounded-xl hover:bg-white flex items-center justify-center gap-2 w-full"
              >
                Next <FaChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* STEP: CONFIRM */}
        {step === "CONFIRM" && (
          <div className="w-full space-y-6 animate-in slide-in-from-right-8 duration-500 text-center">
            <h2 className="text-2xl font-display text-accent-gold mb-2">
              The Decree
            </h2>
            <div className="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#1a1a1a] border border-accent-gold/30 p-8 rounded-lg shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-gold to-transparent opacity-50" />

              <p className="text-gray-400 text-sm uppercase mb-4">
                Official Proclamation
              </p>

              <h1 className="text-3xl font-display text-white mb-2">
                {formData.name}
              </h1>
              <p className="text-accent-gold italic mb-6">
                ruled by {formData.rulerTitle}
              </p>

              <div className="h-px w-16 bg-gray-700 mx-auto mb-6" />

              <div className="flex justify-center gap-4 text-sm text-gray-300">
                <span className="px-3 py-1 bg-white/5 rounded border border-white/10">
                  {formData.ideology}
                </span>
              </div>
            </div>

            <div className="flex gap-4 pt-8">
              <button
                onClick={() => setStep("IDEOLOGY")}
                className="flex-1 bg-transparent border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/5"
              >
                Back
              </button>
              <button
                onClick={submit}
                className="flex-2 bg-accent-gold text-black font-bold py-3 rounded-xl hover:bg-white flex items-center justify-center gap-2 w-full shadow-[0_0_20px_rgba(231,198,118,0.4)]"
              >
                <FaScroll /> Sign Decree
              </button>
            </div>
          </div>
        )}

        {/* STEP: RITUAL (Loading) */}
        {step === "RITUAL" && (
          <div className="text-center space-y-8 animate-in fade-in duration-1000">
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-accent-gold/30 rounded-full animate-ping" />
              <div className="absolute inset-0 border-4 border-t-accent-gold border-r-transparent border-b-accent-gold border-l-transparent rounded-full animate-spin" />
              <FaCheck className="text-accent-gold text-4xl animate-pulse" />
            </div>
            <h2 className="text-2xl font-display text-white">
              Establishing Sovereignty...
            </h2>
            <p className="text-gray-500">
              The scribes are recording your name in the eternal archives.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
