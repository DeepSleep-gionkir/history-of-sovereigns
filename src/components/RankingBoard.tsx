"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FaCrown, FaTrophy } from "react-icons/fa";

interface Ranker {
  uid: string;
  name: string;
  title: string;
  territory: number;
  military: number;
  gold: number;
}

export default function RankingBoard() {
  const [rankers, setRankers] = useState<Ranker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        // 영토(territory)가 많은 순서대로 상위 10개 정렬
        // 주의: Firestore에서 정렬하려면 색인(Index)이 필요할 수 있음.
        // 에러가 나면 콘솔에 뜨는 링크를 클릭해서 색인을 만들어주면 됨.
        const q = query(
          collection(db, "nations"),
          orderBy("resources.territory", "desc"),
          limit(10)
        );

        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            uid: doc.id,
            name: d.identity.name,
            title: d.identity.ruler_title,
            territory: d.resources.territory || 1,
            military: d.stats.military,
            gold: d.resources.gold,
          };
        });
        setRankers(data);
      } catch (e) {
        console.error("랭킹 로드 실패:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, []);

  if (loading)
    return (
      <div style={{ padding: 20, color: "var(--text-sub)", textAlign: "center" }}>
        랭킹 불러오는 중...
      </div>
    );

  return (
    <div style={{ padding: "6px" }}>
      <h2
        style={{
          color: "var(--text-main)",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "1.4rem",
        }}
      >
        <FaTrophy color="#e3c96f" /> 주권자 전당
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {rankers.map((r, index) => (
          <div
            key={r.uid}
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px",
              borderLeft:
                index === 0
                  ? "4px solid rgba(227,201,111,0.9)"
                  : "4px solid rgba(255,255,255,0.08)",
              background:
                index === 0
                  ? "linear-gradient(120deg, rgba(227,201,111,0.12), rgba(138,183,199,0.08))"
                  : "rgba(255,255,255,0.03)",
              boxShadow: "none",
              border: "1px solid var(--stroke-soft)",
            }}
          >
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                width: "42px",
                textAlign: "center",
                color: index < 3 ? "var(--accent-gold)" : "#8a94ad",
              }}
            >
              {index + 1}
            </div>

            <div style={{ flex: 1, paddingLeft: "10px" }}>
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "1.05rem",
                  color: "var(--text-main)",
                }}
              >
                {r.name}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-sub)" }}>
                {r.title} • 영토 {r.territory}칸 • 군사 {r.military}
              </div>
            </div>

            {index === 0 && <FaCrown color="#FFD700" size={22} />}
          </div>
        ))}
      </div>

      <p
        style={{
          textAlign: "center",
          color: "var(--text-sub)",
          fontSize: "0.85rem",
          marginTop: "18px",
        }}
      >
        * 랭킹은 영토 크기를 기준으로 산정됩니다.
      </p>
    </div>
  );
}
