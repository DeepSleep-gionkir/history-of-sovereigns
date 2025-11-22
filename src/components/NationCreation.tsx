"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  FaCrown,
  FaGlobeAmericas,
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
} from "react-icons/fa";

interface Props {
  uid: string;
}

type FoundingForm = {
  name: string;
  ruler_title: string;
  climate: string;
  politics: string;
  economy_type: string;
  social_atmosphere: string;
  origin: string;
  weakness: string;
};

export default function NationCreation({ uid }: Props) {
  const [formData, setFormData] = useState<FoundingForm>({
    name: "",
    ruler_title: "",
    climate: "Temperate (온대 - 밸런스)",
    politics: "Monarchy (전제 군주정)",
    economy_type: "Agriculture (농업 중심)",
    social_atmosphere: "",
    origin: "",
    weakness: "",
  });
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const questions: { key: keyof FoundingForm; title: string; placeholder: string; type?: "select" | "textarea" | "text"; options?: string[] }[] = [
    {
      key: "name",
      title: "국가명 (필수)",
      placeholder: "예: 에테르나 제국",
      type: "text",
    },
    {
      key: "ruler_title",
      title: "지도자 칭호",
      placeholder: "예: 대제, 총통, 족장",
      type: "text",
    },
    {
      key: "climate",
      title: "기후/지형",
      placeholder: "선택하세요",
      type: "select",
      options: [
        "Temperate (온대 - 밸런스)",
        "Desert (사막 - 자재/에너지)",
        "Tundra (설원 - 방어/기술)",
        "Jungle (정글 - 식량/인구)",
        "Archipelago (군도 - 무역/영향력)",
        "Subterranean (지하 - 안전/자재)",
      ],
    },
    {
      key: "politics",
      title: "정치 체제",
      placeholder: "선택하세요",
      type: "select",
      options: [
        "Monarchy (전제 군주정)",
        "Democracy (민주 공화정)",
        "Theocracy (신정 일치)",
        "AI Governance (AI 통제)",
      ],
    },
    {
      key: "economy_type",
      title: "경제 중점",
      placeholder: "선택하세요",
      type: "select",
      options: [
        "Agriculture (농업 중심)",
        "Industry (공업 중심)",
        "Military (군수 산업)",
        "Trade (무역 중심)",
      ],
    },
    {
      key: "social_atmosphere",
      title: "사회적 분위기 (50자)",
      placeholder: "예: 엄격하고 규율을 중시함",
      type: "text",
    },
    {
      key: "origin",
      title: "국가의 기원 (100자)",
      placeholder: "이 국가는 어떻게 시작되었습니까?",
      type: "textarea",
    },
    {
      key: "weakness",
      title: "치명적 약점",
      placeholder: "예: 해상 전력이 전무함, 식량 부족",
      type: "text",
    },
  ];

  const currentQuestion = questions[step];

  const updateAnswer = (key: keyof FoundingForm, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const goNext = () => {
    if (!formData[currentQuestion.key].trim()) {
      setError("필수 질문입니다. 내용을 입력하세요.");
      return;
    }
    setStep((prev) => Math.min(prev + 1, questions.length - 1));
  };

  const goPrev = () => setStep((prev) => Math.max(prev - 1, 0));

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError("국가명을 입력하세요.");
      return;
    }
    // 모든 질문이 비어있지 않은지 확인
    const emptyKey = questions.find(
      (q) => !String(formData[q.key] || "").trim()
    );
    if (emptyKey) {
      setError("모든 질문에 답변해야 건국할 수 있습니다.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    setServerMessage(null);
    setError(null);

    try {
      // 토큰을 강제로 갱신해 만료/유효성 오류를 방지
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) {
        throw new Error("인증 토큰을 찾을 수 없습니다. 다시 로그인해주세요.");
      }

      const res = await fetch("/api/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid, answers: formData }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setServerMessage("건국 완료! AI가 초기 프로필을 설정했습니다.");
        // 약간의 안내 후 대시보드로 이동
        setTimeout(() => {
          router.push("/");
        }, 800);
      } else {
        throw new Error(json.error || "건국에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("건국 실패:", error);
      setError(error.message || "건국 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "24px" }}>
      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        <FaCrown size={48} color="var(--accent-gold)" style={{ marginBottom: "10px" }} />
        <h1 style={{ color: "var(--text-main)", letterSpacing: "0.08em" }}>THE FOUNDING</h1>
        <p style={{ color: "var(--text-sub)", lineHeight: 1.6 }}>
          새로운 역사가 시작됩니다. 신중하게 결정하십시오.
          <br />
          <span style={{ fontSize: "0.85rem", color: "var(--accent-rose)" }}>
            * 생성 후에는 되돌리거나 다시 뽑을 수 없습니다 (No Reroll).
          </span>
        </p>
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span style={{ color: "var(--text-sub)", fontSize: "0.85rem" }}>
            질문 {step + 1} / {questions.length}
          </span>
          <span style={{ color: "var(--accent-gold)", fontWeight: "bold" }}>
            인터뷰 모드
          </span>
        </div>

        <label style={{ fontWeight: "bold" }}>{currentQuestion.title}</label>
        {currentQuestion.type === "select" ? (
          <select
            value={formData[currentQuestion.key]}
            onChange={(e) => updateAnswer(currentQuestion.key, e.target.value)}
          >
            {currentQuestion.options?.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        ) : currentQuestion.type === "textarea" ? (
          <textarea
            rows={3}
            placeholder={currentQuestion.placeholder}
            value={formData[currentQuestion.key]}
            onChange={(e) => updateAnswer(currentQuestion.key, e.target.value)}
          />
        ) : (
          <input
            placeholder={currentQuestion.placeholder}
            value={formData[currentQuestion.key]}
            onChange={(e) => updateAnswer(currentQuestion.key, e.target.value)}
          />
        )}
        {error && (
          <div
            style={{ color: "var(--accent-danger)", marginTop: "6px", fontSize: "0.9rem" }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
            marginTop: "10px",
          }}
        >
          <button
            onClick={goPrev}
            disabled={step === 0}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.03)",
              color: "var(--text-sub)",
              borderRadius: "8px",
              padding: "10px",
              border: "1px solid var(--stroke-soft)",
              cursor: step === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <FaArrowLeft /> 이전
          </button>
          <button
            onClick={goNext}
            disabled={step === questions.length - 1}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-main)",
              borderRadius: "8px",
              padding: "10px",
              border: "1px solid var(--stroke-soft)",
              cursor: step === questions.length - 1 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            다음 <FaArrowRight />
          </button>
        </div>

        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "8px",
            border: "1px solid var(--stroke-soft)",
            color: "var(--text-sub)",
            fontSize: "0.9rem",
          }}
        >
          AI가 여러분의 답변을 바탕으로 초기 스탯/자원/태그를 설계합니다.
          입력이 탄탄할수록 국가 서사가 매끄럽게 생성됩니다.
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={handleCreate}
        disabled={
          !formData.name.trim() ||
          !formData.ruler_title.trim() ||
          questions.some((q) => !String(formData[q.key] || "").trim()) ||
          isSubmitting
        }
        style={{
          opacity:
            !formData.name.trim() ||
            !formData.ruler_title.trim() ||
            questions.some((q) => !String(formData[q.key] || "").trim()) ||
            isSubmitting
              ? 0.5
              : 1,
          cursor:
            !formData.name.trim() ||
            !formData.ruler_title.trim() ||
            questions.some((q) => !String(formData[q.key] || "").trim()) ||
            isSubmitting
              ? "not-allowed"
              : "pointer",
        }}
      >
        <FaGlobeAmericas style={{ marginRight: "8px" }} />
        {isSubmitting ? "건국 처리 중..." : "건국 선포 (Establish Nation)"}
      </button>
      {serverMessage && (
        <div
          style={{
            marginTop: "12px",
            color: "var(--accent-gold)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FaCheckCircle /> {serverMessage}
          </span>
          <button
            onClick={() => router.push("/")}
            className="btn-primary"
            style={{ padding: "8px 16px", fontSize: "0.9rem" }}
          >
            대시보드로 이동
          </button>
        </div>
      )}
      <div style={{ height: "50px" }}></div>
    </div>
  );
}
