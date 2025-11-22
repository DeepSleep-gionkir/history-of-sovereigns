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
    <div
      style={{
        backgroundColor: "#8B0000",
        color: "white",
        padding: "8px",
        fontSize: "0.9rem",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        borderBottom: "1px solid #ff4d4d",
      }}
    >
      <FaBullhorn />
      <div
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {news}
      </div>
    </div>
  );
}
