import { Factions } from "@/types/db";
import { FaChessRook, FaCrown, FaUsers, FaBook } from "react-icons/fa";

interface Props {
  factions: Factions;
}

export default function FactionList({ factions }: Props) {
  if (!factions) return null;

  const getIcon = (key: string) => {
    switch (key) {
      case "military":
        return <FaChessRook />;
      case "nobility":
        return <FaCrown />;
      case "commoners":
        return <FaUsers />;
      case "intelligentsia":
        return <FaBook />;
      default:
        return <FaUsers />;
    }
  };

  const getLabel = (key: string) => {
    switch (key) {
      case "military":
        return "군부 (Military)";
      case "nobility":
        return "귀족 (Nobility)";
      case "commoners":
        return "평민 (Commoners)";
      case "intelligentsia":
        return "지식인 (Intelligentsia)";
      default:
        return key;
    }
  };

  return (
    <div className="card" style={{ marginBottom: "16px" }}>
      <h3
        className="headline"
        style={{ fontSize: "1.1rem", marginBottom: "12px" }}
      >
        내부 파벌 (Internal Factions)
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {Object.entries(factions).map(([key, data]) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(255,255,255,0.03)",
              padding: "10px",
              borderRadius: "6px",
              borderLeft: `3px solid ${data.loyalty < 40 ? "var(--accent-danger)" : "var(--accent-gold)"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ color: "var(--accent-gold)", opacity: 0.8 }}>
                {getIcon(key)}
              </div>
              <div>
                <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
                  {getLabel(key)}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-sub)" }}>
                  영향력: {data.power}
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "bold",
                  color:
                    data.loyalty < 40
                      ? "var(--accent-danger)"
                      : "var(--accent-success)",
                }}
              >
                충성도 {data.loyalty}
              </div>
              {data.loyalty < 30 && (
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--accent-danger)",
                    marginTop: "2px",
                  }}
                >
                  ! 반란 위험 !
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
