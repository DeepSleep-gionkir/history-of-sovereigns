import { useState } from "react";
import { PolicyWeb } from "@/types/db";
import {
  POLICY_DEFINITIONS,
  PolicyCategory,
  PolicyOptionDef,
} from "@/constants/policies";
import { FaGavel, FaInfoCircle, FaCheck } from "react-icons/fa";

interface Props {
  policies: PolicyWeb;
  uid: string;
}

export default function PolicyPanel({ policies, uid }: Props) {
  const [selectedCategory, setSelectedCategory] =
    useState<PolicyCategory>("tax");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const defs = POLICY_DEFINITIONS[selectedCategory];
  const currentOptionKey = policies?.[selectedCategory] || "standard";

  const handlePolicyChange = async (newOptionKey: string) => {
    if (newOptionKey === currentOptionKey) return;
    if (
      !window.confirm(
        `'${defs.options[newOptionKey].label}' 정책을 채택하시겠습니까?`,
      )
    )
      return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const idToken = await import("@/lib/firebase").then((m) =>
        m.auth.currentUser?.getIdToken(),
      );

      const res = await fetch("/api/nation/policy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid,
          category: selectedCategory,
          value: newOptionKey,
        }),
      });

      if (!res.ok) throw new Error("정책 변경 실패");

      setMessage("정책이 변경되었습니다. (다음 갱신 시 반영)");
    } catch (e) {
      console.error(e);
      alert("정책 변경 중 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        background: "var(--bg-card-strong)",
        border: "1px solid var(--stroke-soft)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <FaGavel color="var(--accent-gold)" size={20} />
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>국정 과제 (Policies)</h3>
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "8px",
          borderBottom: "1px solid var(--stroke-soft)",
          marginBottom: "16px",
        }}
      >
        {(Object.keys(POLICY_DEFINITIONS) as PolicyCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              background:
                selectedCategory === cat
                  ? "rgba(255,255,255,0.1)"
                  : "transparent",
              border: "none",
              padding: "6px 12px",
              borderRadius: "6px",
              color:
                selectedCategory === cat
                  ? "var(--accent-gold)"
                  : "var(--text-sub)",
              cursor: "pointer",
              fontWeight: selectedCategory === cat ? "bold" : "normal",
              whiteSpace: "nowrap",
            }}
          >
            {POLICY_DEFINITIONS[cat].label.split("(")[0]}
          </button>
        ))}
      </div>

      {/* Current Selection Info */}
      <h4 style={{ marginBottom: "10px", color: "var(--text-main)" }}>
        {defs.label}
      </h4>

      <div style={{ display: "grid", gap: "10px" }}>
        {Object.entries(defs.options).map(
          ([key, option]: [string, PolicyOptionDef]) => {
            const isActive = currentOptionKey === key;

            return (
              <div
                key={key}
                onClick={() => !isUpdating && handlePolicyChange(key)}
                style={{
                  border: `1px solid ${isActive ? "var(--accent-gold)" : "var(--stroke-soft)"}`,
                  background: isActive
                    ? "rgba(212, 175, 55, 0.05)"
                    : "rgba(255,255,255,0.02)",
                  borderRadius: "8px",
                  padding: "12px",
                  cursor: isUpdating ? "wait" : "pointer",
                  opacity: isUpdating ? 0.6 : 1,
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      color: isActive
                        ? "var(--accent-gold)"
                        : "var(--text-main)",
                    }}
                  >
                    {option.label}
                  </span>
                  {isActive && <FaCheck color="var(--accent-gold)" />}
                </div>

                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-sub)",
                    marginBottom: "8px",
                  }}
                >
                  {option.description}
                </div>

                {option.effects.length > 0 && (
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                  >
                    {option.effects.map((eff, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: "0.75rem",
                          background:
                            eff.value > 0
                              ? "rgba(74, 222, 128, 0.1)"
                              : "rgba(248, 113, 113, 0.1)",
                          color: eff.value > 0 ? "#4ade80" : "#f87171",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {eff.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>

      {message && (
        <div
          style={{
            marginTop: "12px",
            padding: "8px",
            background: "rgba(59, 130, 246, 0.1)",
            color: "#60a5fa",
            borderRadius: "6px",
            fontSize: "0.9rem",
            textAlign: "center",
          }}
        >
          <FaInfoCircle
            style={{ marginRight: "6px", verticalAlign: "middle" }}
          />
          {message}
        </div>
      )}
    </div>
  );
}
