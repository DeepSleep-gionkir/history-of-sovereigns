"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNation } from "@/hooks/useNation";
import NationCreation from "@/components/NationCreation";
import Dashboard from "@/components/Dashboard";
import WorldMap from "@/components/WorldMap";
import RankingBoard from "@/components/RankingBoard";
import GameOver from "@/components/GameOver"; // 추가
import {
  FaGoogle,
  FaFortAwesome,
  FaGlobeAmericas,
  FaTrophy,
  FaUserShield,
} from "react-icons/fa";
import Link from "next/link"; // 페이지 이동용 링크
import { useRouter } from "next/navigation";

// ★ 여기에 본인의 관리자 UID를 넣으세요 (버튼 보여주기용)
const ADMIN_UIDS = (
  process.env.NEXT_PUBLIC_ADMIN_UIDS || "EoC0epp9QOae5GUxFyHFeX2Bfln1"
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const { nation, loading: nationLoading } = useNation(user?.uid || null);

  if (authLoading || (user && nationLoading)) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#666",
        }}
      >
        역사를 불러오는 중...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "70vh",
          color: "var(--text-sub)",
        }}
      >
        로그인 페이지로 이동 중...
      </div>
    );
  }

  if (!nation) {
    const accountBar = (
      <div
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 9999,
        }}
      >
        {ADMIN_UIDS.includes(user.uid) && (
          <Link
            href="/admin"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-main)",
              padding: "10px 14px",
              borderRadius: "14px",
              fontSize: "0.85rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
              border: "1px solid var(--stroke-soft)",
            }}
          >
            <FaUserShield /> Admin
          </Link>
        )}
        <div
          title={user.displayName || "계정"}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            overflow: "hidden",
            border: "1px solid var(--stroke-soft)",
            background: "rgba(255,255,255,0.06)",
            display: "grid",
            placeItems: "center",
            color: "var(--text-main)",
            fontWeight: "bold",
            fontSize: "0.9rem",
          }}
        >
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.displayName || "프로필"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            (user.displayName || "U").slice(0, 1)
          )}
        </div>
      </div>
    );

    return (
      <div className="page-shell" style={{ position: "relative" }}>
        {accountBar}
        <NationCreation uid={user.uid} />
      </div>
    );
  }

  // 3-1. 국가는 있는데 멸망한 상태면 -> 게임 오버 화면
  // is_alive가 명시적으로 false일 때만 죽은 것 (undefined는 산 것)
  if (nation.status.is_alive === false) {
    const accountBar = (
      <div
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 9999,
        }}
      >
        {ADMIN_UIDS.includes(user.uid) && (
          <Link
            href="/admin"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-main)",
              padding: "10px 14px",
              borderRadius: "14px",
              fontSize: "0.85rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
              border: "1px solid var(--stroke-soft)",
            }}
          >
            <FaUserShield /> Admin
          </Link>
        )}
        <div
          title={user.displayName || "계정"}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            overflow: "hidden",
            border: "1px solid var(--stroke-soft)",
            background: "rgba(255,255,255,0.06)",
            display: "grid",
            placeItems: "center",
            color: "var(--text-main)",
            fontWeight: "bold",
            fontSize: "0.9rem",
          }}
        >
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.displayName || "프로필"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            (user.displayName || "U").slice(0, 1)
          )}
        </div>
      </div>
    );

    return (
      <div className="page-shell" style={{ position: "relative" }}>
        {accountBar}
        <GameOver nationName={nation.identity.name} />
      </div>
    );
  }

  const accountBar = (
    <div
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        zIndex: 9999,
      }}
    >
      {ADMIN_UIDS.includes(user.uid) && (
        <Link
          href="/admin"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "var(--text-main)",
            padding: "10px 14px",
            borderRadius: "14px",
            fontSize: "0.85rem",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
            border: "1px solid var(--stroke-soft)",
          }}
        >
          <FaUserShield /> Admin
        </Link>
      )}
      <div
        title={user.displayName || "계정"}
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          overflow: "hidden",
          border: "1px solid var(--stroke-soft)",
          background: "rgba(255,255,255,0.06)",
          display: "grid",
          placeItems: "center",
          color: "var(--text-main)",
          fontWeight: "bold",
          fontSize: "0.9rem",
        }}
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt={user.displayName || "프로필"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          (user.displayName || "U").slice(0, 1)
        )}
      </div>
    </div>
  );

  return (
    <div className="page-shell">
      {accountBar}

      <div style={{ paddingBottom: "90px" }}>
        {currentTab === "dashboard" && (
          <Dashboard data={nation} uid={user.uid} />
        )}

        {currentTab === "map" && (
          <div
            className="card"
            style={{ borderColor: "var(--stroke-soft)", background: "var(--bg-card-strong)" }}
          >
            <h2
              className="headline"
              style={{
                fontSize: "1.5rem",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              <FaGlobeAmericas /> 세계 지도
            </h2>
            <p
              className="subhead"
              style={{ marginBottom: "12px", color: "var(--text-sub)" }}
            >
              10,000 타일의 서사 지도. 영토를 선택해 개척, 침공, 정찰을 실행하세요.
            </p>
            <WorldMap myNation={nation} />
          </div>
        )}

        {currentTab === "ranking" && (
          <div
            className="card"
            style={{ borderColor: "var(--stroke-soft)", background: "var(--bg-card-strong)" }}
          >
            <RankingBoard />
          </div>
        )}
      </div>

      <div className="nav-bar">
        <button
          onClick={() => setCurrentTab("dashboard")}
          className={`nav-btn ${currentTab === "dashboard" ? "active" : ""}`}
        >
          <FaFortAwesome size={18} />
          <span style={{ fontSize: "0.85rem" }}>본국</span>
        </button>
        <button
          onClick={() => setCurrentTab("map")}
          className={`nav-btn ${currentTab === "map" ? "active" : ""}`}
        >
          <FaGlobeAmericas size={18} />
          <span style={{ fontSize: "0.85rem" }}>세계지도</span>
        </button>
        <button
          onClick={() => setCurrentTab("ranking")}
          className={`nav-btn ${currentTab === "ranking" ? "active" : ""}`}
        >
          <FaTrophy size={18} />
          <span style={{ fontSize: "0.85rem" }}>랭킹</span>
        </button>
      </div>
    </div>
  );
}
