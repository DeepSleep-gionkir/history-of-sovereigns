"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FaBullhorn } from "react-icons/fa";

export default function NewsTicker() {
  const [news, setNews] = useState<string>(
    "세계 정세 데이터를 수신 중입니다..."
  );

  useEffect(() => {
    // 가장 최근 뉴스 1개만 가져옴
    const q = query(
      collection(db, "news"),
      orderBy("created_at", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setNews(data.message);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "10px 6px" }}>
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          alignItems: "center",
          gap: "12px",
          padding: "12px 14px",
          borderRadius: "16px",
          background:
            "linear-gradient(120deg, rgba(255,105,105,0.16), rgba(255,225,170,0.1) 55%, rgba(255,255,255,0.08))",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
          backdropFilter: "blur(6px)",
          color: "var(--text-main)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            borderRadius: "12px",
            background: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "var(--accent-gold)",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          <FaBullhorn />
          <span>속보</span>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--accent-rose)",
              boxShadow: "0 0 0 6px rgba(255,117,117,0.15)",
            }}
          />
        </div>
        <div
          style={{
            minHeight: "22px",
            fontSize: "0.95rem",
            lineHeight: 1.4,
            color: "var(--text-main)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {news}
        </div>
      </div>
    </div>
  );
}
