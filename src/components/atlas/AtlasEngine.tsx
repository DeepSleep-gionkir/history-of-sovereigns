import React, { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Continent } from "@/types/db";
import {
  FaGlobeAmericas,
  FaMapMarkedAlt,
  FaPlus,
  FaCrown,
} from "react-icons/fa";
import ContinentDiscoveryModal from "./ContinentDiscoveryModal";
import FoundingWizard from "@/components/nation/FoundingWizard";

interface Props {
  uid: string;
  onSelect: (continentId: string) => void;
}

export default function AtlasEngine({ uid, onSelect }: Props) {
  const [continents, setContinents] = useState<Continent[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFounding, setIsFounding] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch Logic
  useEffect(() => {
    const fetchWorld = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "continents"),
          orderBy("createdAt", "desc"),
          limit(50),
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Continent,
        );
        setContinents(data);

        if (data.length > 0) {
          setFocusedId(data[0].id);
        }
      } catch (e) {
        console.error("Atlas Load Failed:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchWorld();
  }, []);

  // Scroll to focused item on change
  useEffect(() => {
    if (!scrollRef.current || !focusedId || continents.length === 0) return;

    const index = continents.findIndex((c) => c.id === focusedId);
    if (index === -1) return;

    // Card width (280) + Gap (32/2rem) = roughly 312px per item stride
    // But exact math with snap is better handled by browser if we just scroll to offset
    // However, with snap-center and correct padding, scrollTo usually works best by index.

    const cardWidth = 280;
    const gap = 32;
    const offset = index * (cardWidth + gap);

    scrollRef.current.scrollTo({
      left: offset,
      behavior: "smooth",
    });
  }, [focusedId, continents]);

  if (loading)
    return (
      <div className="w-full h-[600px] flex items-center justify-center text-accent-gold animate-pulse">
        <FaGlobeAmericas size={48} />
        <span className="ml-4 text-xl font-display">
          Reshaping Tectonic Plates...
        </span>
      </div>
    );

  return (
    <div className="relative w-full h-[70vh] overflow-hidden bg-[#0f1a15] rounded-[24px] border border-stroke-soft shadow-2xl group">
      {/* Background Grid / Texture */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#e7c676 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Header HUD */}
      <div className="absolute top-6 left-8 z-10 pointer-events-none select-none">
        <h2 className="headline text-accent-gold flex items-center gap-3">
          <FaMapMarkedAlt />
          ATLAS V2.0
        </h2>
        <p className="text-text-sub text-sm tracking-widest uppercase">
          Select Territory for Sovereignty
        </p>
      </div>

      {/* Horizontal Scroll Area (The "Reel") */}
      <div
        ref={scrollRef}
        className="absolute bottom-0 left-0 right-0 h-[450px] flex items-center overflow-x-auto gap-8 pb-8 scrollbar-hide snap-x snap-mandatory"
        style={{
          scrollBehavior: "smooth",
          // Center the first item: 50vw - Half Card Width (140px)
          paddingLeft: "calc(50vw - 140px)",
          paddingRight: "calc(50vw - 140px)",
        }}
      >
        {continents.map((cont) => {
          const isFocused = focusedId === cont.id;
          return (
            <div
              key={cont.id}
              onClick={() => handleFocus(cont.id)}
              className={`
                        snap-center shrink-0 w-[280px] h-[340px] 
                        transition-all duration-500 ease-out cursor-pointer
                        flex flex-col items-center justify-end pb-8
                        border border-white/5 rounded-[20px] relative
                        ${isFocused ? "scale-110 bg-white/5 border-accent-gold shadow-[0_0_30px_rgba(231,198,118,0.2)] z-10" : "scale-90 opacity-50 grayscale hover:opacity-80"}
                    `}
            >
              {/* Map Visual (Vector Path) */}
              <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
                <svg
                  viewBox="0 0 600 600"
                  className={`transition-all duration-700 ${isFocused ? "drop-shadow-[0_0_15px_rgba(231,198,118,0.4)]" : ""}`}
                >
                  <path
                    d={cont.vectorPath}
                    fill={isFocused ? "#1a2e25" : "#1a1a1a"}
                    stroke={isFocused ? cont.themeColor || "#e7c676" : "#444"}
                    strokeWidth={isFocused ? 10 : 4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Metadata */}
              <div className="text-center z-10 bg-black/40 backdrop-blur-md p-4 rounded-xl w-[90%] border border-white/10">
                <h3
                  className={`font-display font-bold text-lg ${isFocused ? "text-accent-gold" : "text-gray-500"}`}
                >
                  {cont.name}
                </h3>
                <div className="mt-2 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-cyan transition-all duration-1000"
                    style={{
                      width: `${((cont.capacity?.current || 0) / (cont.capacity?.max || 1)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1 text-gray-400">
                  <span>Occupancy</span>
                  <span>
                    {cont.capacity?.current || 0} / {cont.capacity?.max || 0}
                  </span>
                </div>
              </div>

              {/* Action Overlay for Focused Item */}
              {isFocused && (
                <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFounding(true);
                    }}
                    className="bg-accent-gold text-black font-bold px-8 py-3 rounded-full shadow-[0_0_20px_rgba(231,198,118,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <FaCrown /> ESTABLISH SOVEREIGNTY
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Create New Continent Logic Placeholder */}
        <div
          onClick={() => setIsModalOpen(true)}
          className="snap-center shrink-0 w-[200px] h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-[20px] cursor-pointer hover:border-accent-gold hover:text-accent-gold transition-colors text-gray-600"
        >
          <FaPlus size={32} />
          <span className="mt-4 font-bold">DISCOVER NEW</span>
        </div>
      </div>

      <ContinentDiscoveryModal
        uid={uid}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDiscover={(newCont) => {
          setContinents((prev) => [newCont, ...prev]);
          setFocusedId(newCont.id);
          // Scroll to start
          if (scrollRef.current)
            scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        }}
      />

      {isFounding && focusedId && (
        <FoundingWizard
          onCancel={() => setIsFounding(false)}
          onComplete={async (data) => {
            // Determine API call here or inside wizard?
            // Wizard usually handles its own submission, but here we passed onComplete.
            // Let's assume Wizard handles submission internally or we handle it here.
            // Re-reading Wizard code: it expects onComplete(data). It does NOT call API.
            // So we must handle API here.

            try {
              const token = await import("@/lib/firebase").then((m) =>
                m.auth.currentUser?.getIdToken(),
              );
              if (!token) throw new Error("No Auth");

              const res = await fetch("/api/nation/found", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ uid, continentId: focusedId, ...data }),
              });

              if (res.ok) {
                window.location.reload(); // Simple reload to refresh app state to Dashboard
              } else {
                alert("Foundation Failed");
              }
            } catch (e) {
              console.error(e);
              alert("System Error during Coronation");
            }
          }}
        />
      )}
    </div>
  );
}
