import { Continent } from "@/types/db";
import { FaUsers, FaGlobeAmericas } from "react-icons/fa";

interface Props {
  continent: Continent;
  isSelected: boolean;
  onSelect: () => void;
}

export default function ContinentCard({
  continent,
  isSelected,
  onSelect,
}: Props) {
  const fullness = continent.currentNations / continent.maxNations;
  const isFull = continent.currentNations >= continent.maxNations;

  return (
    <div
      onClick={onSelect}
      className={`card ${isSelected ? "selected" : ""}`}
      style={{
        width: "280px",
        flexShrink: 0,
        cursor: "pointer",
        transition: "all 0.3s ease",
        transform: isSelected ? "scale(1.05)" : "scale(1)",
        border: isSelected
          ? "2px solid var(--accent-gold)"
          : "1px solid var(--stroke-soft)",
        position: "relative",
        overflow: "hidden",
        background: isSelected
          ? "linear-gradient(145deg, rgba(231,198,118,0.1), rgba(0,0,0,0.4))"
          : "var(--bg-card)",
      }}
    >
      <div
        style={{
          height: "160px",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.2)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 600 600"
          style={{
            width: "100%",
            height: "100%",
            filter: isSelected
              ? "drop-shadow(0 0 10px rgba(231,198,118,0.5))"
              : "opacity(0.7)",
            transition: "all 0.3s ease",
          }}
        >
          {/* Background indicating Ocean */}
          <rect width="600" height="600" fill="none" />
          <path
            d={continent.imagePath}
            fill={isSelected ? "#3a6b4f" : "#2f4a3e"}
            stroke={isSelected ? "#e7c676" : "#557"}
            strokeWidth={isSelected ? "8" : "3"}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <h3
        style={{
          margin: "0 0 6px 0",
          color: isSelected ? "var(--accent-gold)" : "var(--text-main)",
          fontSize: "1.2rem",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {continent.name}
        {continent.isSystem && (
          <FaGlobeAmericas
            size={14}
            color="var(--text-sub)"
            title="System Continent"
          />
        )}
      </h3>

      <p
        style={{
          fontSize: "0.9rem",
          color: "var(--text-sub)",
          lineHeight: 1.4,
          marginBottom: "12px",
          height: "40px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {continent.description}
      </p>

      {/* Population / Capacity Bar */}
      <div style={{ marginTop: "auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            color: "var(--text-sub)",
            marginBottom: "4px",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <FaUsers /> 인구
          </span>
          <span
            style={{
              color: isFull ? "var(--accent-danger)" : "var(--accent-cyan)",
            }}
          >
            {continent.currentNations} / {continent.maxNations}
          </span>
        </div>
        <div
          style={{
            height: "6px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "3px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(fullness * 100, 100)}%`,
              background: isFull
                ? "var(--accent-danger)"
                : "linear-gradient(90deg, var(--accent-cyan), var(--accent-lime))",
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
