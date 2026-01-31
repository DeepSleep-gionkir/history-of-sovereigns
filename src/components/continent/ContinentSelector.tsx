import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, getDocs, limit } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Continent } from "@/types/db";
import ContinentCard from "./ContinentCard";
import { FaPlus, FaSearchLocation, FaSpinner } from "react-icons/fa";

interface Props {
  uid: string;
  onSelect: (continentId: string) => void;
}

export default function ContinentSelector({ uid, onSelect }: Props) {
  const [continents, setContinents] = useState<Continent[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchContinents = async () => {
      try {
        const q = query(
          collection(db, "continents"),
          orderBy("isSystem", "desc"),
          orderBy("createdAt", "asc"),
          limit(20),
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Continent,
        );
        setContinents(list);
        if (list.length > 0) {
          // Default select the first one if not selected
          setSelectedId(list[0].id);
          onSelect(list[0].id);
        }
      } catch (e) {
        console.error("Failed to fetch continents:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchContinents();
  }, [onSelect]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelect(id);
  };

  const handleDiscover = async () => {
    if (discovering) return;
    const confirm = window.confirm("새로운 대륙을 발견하시겠습니까? (AI 생성)");
    if (!confirm) return;

    setDiscovering(true);
    try {
      // Force refresh token
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error("Authentication failed");

      const res = await fetch("/api/generate/continent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid }),
      });

      const json = await res.json();
      if (json.success && json.continent) {
        setContinents((prev) => [...prev, json.continent]);
        handleSelect(json.continent.id);
        // Scroll to end
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
          }
        }, 100);
      } else {
        alert("대륙 발견 실패: " + (json.error || "Unknown error"));
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      alert("Error: " + err.message);
    } finally {
      setDiscovering(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        대륙 지도 펼치는 중...
      </div>
    );

  return (
    <div className="continent-selector">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h2 className="headline" style={{ fontSize: "1.5rem" }}>
          <FaSearchLocation style={{ marginRight: "8px" }} />
          대륙 선택
        </h2>
        <span className="text-sub" style={{ fontSize: "0.9rem" }}>
          국가를 건설할 대륙을 선택하세요.
        </span>
      </div>

      <div
        ref={scrollRef}
        style={{
          display: "flex",
          gap: "16px",
          overflowX: "auto",
          padding: "4px 4px 20px 4px",
          scrollBehavior: "smooth",
          // Hide scrollbar for cleaner look (optional)
          scrollbarWidth: "thin",
        }}
      >
        {continents.map((cont) => (
          <ContinentCard
            key={cont.id}
            continent={cont}
            isSelected={selectedId === cont.id}
            onSelect={() => handleSelect(cont.id)}
          />
        ))}

        {/* Discover New Continent Card */}
        <div
          onClick={handleDiscover}
          className="card"
          style={{
            width: "280px",
            flexShrink: 0,
            cursor: discovering ? "wait" : "pointer",
            background: "rgba(231, 198, 118, 0.05)",
            border: "1px dashed var(--accent-gold)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            textAlign: "center",
            transition: "all 0.2s ease",
            minHeight: "340px", // Approximate height of regular card
            opacity: discovering ? 0.7 : 1,
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              border: "2px solid var(--accent-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-gold)",
            }}
          >
            {discovering ? (
              <FaSpinner className="animate-spin" size={24} />
            ) : (
              <FaPlus size={24} />
            )}
          </div>
          <div>
            <h3 style={{ color: "var(--accent-gold)", marginBottom: "6px" }}>
              {discovering ? "탐험 중..." : "신대륙 발견"}
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-sub)" }}>
              {discovering
                ? "AI가 새 땅을 찾고 있습니다."
                : "새로운 땅을 찾고 계신가요?\n미지의 대륙을 탐험하세요."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
