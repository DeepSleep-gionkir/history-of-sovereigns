"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { FaGoogle, FaShieldAlt } from "react-icons/fa";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (e: unknown) {
      console.error(e);
      setError("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="page-shell"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "28px 24px",
          textAlign: "center",
          background: "var(--bg-card-strong)",
          border: "1px solid var(--stroke-soft)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 12px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--stroke-soft)",
            marginBottom: "16px",
            color: "var(--text-sub)",
            fontSize: "0.9rem",
          }}
        >
          <FaShieldAlt color="var(--accent-cyan)" />
          <span>AI 서사 그랜드 전략</span>
        </div>
        <h1
          className="headline"
          style={{ fontSize: "2.1rem", letterSpacing: "0.08em", marginBottom: "10px" }}
        >
          HISTORY OF <span style={{ color: "var(--accent-gold)" }}>SOVEREIGNS</span>
        </h1>
        <p className="subhead" style={{ marginBottom: "18px", color: "var(--text-sub)" }}>
          Google 계정으로 로그인하여 건국을 시작하세요.
        </p>

        <div
          style={{
            margin: "0 auto 16px",
            maxWidth: "440px",
            textAlign: "left",
            fontSize: "0.95rem",
            color: "var(--text-sub)",
            background: "rgba(255,255,255,0.03)",
            padding: "12px 14px",
            borderRadius: "12px",
            border: "1px solid var(--stroke-soft)",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "var(--accent-gold)" }}>플레이 규칙</strong>
          <ul style={{ margin: "8px 0 0 18px", padding: 0, lineHeight: 1.5 }}>
            <li>1인 1국가 — 리롤/재생성 불가</li>
            <li>건국 후 모든 명령은 되돌릴 수 없습니다</li>
            <li>관리자는 별도 승인된 UID만 가능합니다</li>
          </ul>
        </div>

        <button
          onClick={handleLogin}
          className="btn-primary"
          disabled={isLoading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            maxWidth: "360px",
            margin: "0 auto",
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          <FaGoogle /> {isLoading ? "로그인 중..." : "Google로 로그인"}
        </button>
        {error && (
          <div style={{ marginTop: "10px", color: "var(--accent-danger)", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
