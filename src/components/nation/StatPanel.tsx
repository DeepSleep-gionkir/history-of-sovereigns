import {
  FaBalanceScale,
  FaBuilding,
  FaHandHoldingUsd,
  FaGlobe,
} from "react-icons/fa";

interface Props {
  stats: {
    admin_cap: number;
    corruption: number;
    stability: number;
    legitimacy: number;
    reputation: number;
  };
}

export default function StatPanel({ stats }: Props) {
  // Helper to determine color based on value
  const getColor = (val: number, isReverse = false) => {
    if (isReverse) {
      if (val < 30) return "var(--accent-success)";
      if (val < 60) return "var(--accent-gold)";
      return "var(--accent-danger)";
    }
    if (val > 70) return "var(--accent-success)";
    if (val > 40) return "var(--accent-gold)";
    return "var(--accent-danger)";
  };

  return (
    <div className="card" style={{ marginBottom: "16px" }}>
      <h3
        className="headline"
        style={{ fontSize: "1.1rem", marginBottom: "12px" }}
      >
        국정 지표 (Governance)
      </h3>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        {/* Admin Capacity */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            padding: "10px",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <FaBuilding color="var(--accent-gold)" />
            <span style={{ fontSize: "0.9rem", color: "var(--text-sub)" }}>
              행정 역량
            </span>
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
            {stats.admin_cap || 50}
          </div>
        </div>

        {/* Corruption */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            padding: "10px",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <FaHandHoldingUsd color={getColor(stats.corruption, true)} />
            <span style={{ fontSize: "0.9rem", color: "var(--text-sub)" }}>
              부패도
            </span>
          </div>
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              color: getColor(stats.corruption, true),
            }}
          >
            {stats.corruption || 0}%
          </div>
        </div>

        {/* Stability */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            padding: "10px",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <FaBalanceScale color={getColor(stats.stability)} />
            <span style={{ fontSize: "0.9rem", color: "var(--text-sub)" }}>
              안정도
            </span>
          </div>
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              color: getColor(stats.stability),
            }}
          >
            {stats.stability || 50}
          </div>
        </div>

        {/* Legitimacy */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            padding: "10px",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <FaGlobe color={getColor(stats.legitimacy)} />
            <span style={{ fontSize: "0.9rem", color: "var(--text-sub)" }}>
              정통성
            </span>
          </div>
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              color: getColor(stats.reputation),
            }}
          >
            {stats.legitimacy || 50}
          </div>
        </div>
      </div>
    </div>
  );
}
