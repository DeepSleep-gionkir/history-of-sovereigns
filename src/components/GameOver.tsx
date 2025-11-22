"use client";

import { FaSkull, FaRedo } from "react-icons/fa";

export default function GameOver({ nationName }: { nationName: string }) {
  const handleRestart = () => {
    if (confirm("모든 데이터를 초기화하고 새로 건국하시겠습니까?")) {
      // 여기에 재시작 로직이 들어가야 함 (유저 데이터 삭제 API 호출 등)
      alert(
        "재시작 기능은 곧 업데이트됩니다. (관리자에게 문의하여 계정 초기화를 요청하세요)"
      );
    }
  };

  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "20px",
        color: "var(--text-main)",
        background:
          "radial-gradient(circle at 22% 18%, rgba(226,199,138,0.08), transparent 35%), radial-gradient(circle at 76% 16%, rgba(138,183,199,0.08), transparent 32%)",
      }}
    >
      <div
        style={{
          border: "1px solid var(--stroke-soft)",
          borderRadius: "20px",
          padding: "18px",
          backdropFilter: "blur(10px)",
          boxShadow: "0 14px 30px rgba(0,0,0,0.18)",
          marginBottom: "18px",
          }}
      >
        <FaSkull size={80} style={{ marginBottom: "0px", opacity: 0.9 }} />
      </div>

      <h1
        style={{
        fontSize: "3rem",
        margin: 0,
        textTransform: "uppercase",
        letterSpacing: "5px",
      }}
    >
        멸망
      </h1>

      <h2 style={{ color: "#cfd6e3", marginTop: "10px", fontSize: "1.2rem" }}>
        {nationName}
      </h2>

      <p
        style={{
        maxWidth: "420px",
        margin: "30px 0",
        lineHeight: "1.6",
        color: "var(--text-sub)",
      }}
    >
        수도가 함락되어 국가가 멸망했습니다.
        <br />
        당신의 통치는 여기서 끝났지만, 역사는 승자에 의해 기억될 것입니다.
      </p>

      <button
        onClick={handleRestart}
        style={{
          background: "linear-gradient(120deg, rgba(226,199,138,0.18), rgba(138,183,199,0.18))",
          border: "1px solid var(--stroke-soft)",
          color: "var(--text-main)",
          padding: "15px 30px",
          borderRadius: "10px",
          fontSize: "1rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        <FaRedo /> 새로운 역사 시작하기
      </button>
    </div>
  );
}
