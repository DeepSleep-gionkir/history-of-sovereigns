"use client";

import { useState, useEffect } from "react";
import { NationData } from "@/hooks/useNation";
import {
  FaCoins,
  FaBreadSlice,
  FaCube,
  FaBolt,
  FaShieldAlt,
  FaBalanceScale,
  FaChartLine,
  FaScroll,
  FaCheckCircle,
  FaHashtag, // 아이콘 추가
  FaUsers,
  FaMapMarkerAlt,
} from "react-icons/fa";
import {
  GiHeartInside,
  GiTechnoHeart,
  GiTreeGrowth,
  GiShakingHands,
} from "react-icons/gi";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface Props {
  data: NationData;
  uid: string;
}

interface LogData {
  id: string;
  created_at: string;
  command: string;
  narrative: string;
  changes?: Record<string, number>;
  intent?: string;
}

export default function Dashboard({ data, uid }: Props) {
  const [cmdInput, setCmdInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [lastHeadline, setLastHeadline] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [selectedIntent, setSelectedIntent] = useState("general");
  const playbookTemplates = [
    {
      intent: "policy",
      title: "내정: 복지/세금",
      prompt:
        "도시별 복지 예산을 늘리고 진보적 세율을 적용해 행복도와 안정도를 높여라.",
    },
    {
      intent: "diplomacy",
      title: "외교: 상호방위",
      prompt:
        "이웃 국가와 상호방위·무역 조약을 제안하고 문화 교류 대표단을 파견한다.",
    },
    {
      intent: "war",
      title: "전쟁: 포위/기습",
      prompt:
        "북쪽 국경의 적 요새를 포위하고 보급로를 차단한 뒤, 측면 기습을 감행한다.",
    },
    {
      intent: "science",
      title: "기술/문화 투자",
      prompt:
        "AI 의회 연구비를 증액하고 도서관-연구소 복합 단지를 건설해 기술을 진척시켜라.",
    },
    {
      intent: "intel",
      title: "첩보/정찰",
      prompt:
        "서쪽 국가의 병력 배치와 식량 상황을 정찰하고, 허위 정보를 흘려 사기를 떨어뜨린다.",
    },
  ];

  const resourceRoutes = [
    {
      title: "동해 해상무역",
      reward: "금화 80 / 영향력 +3",
      intent: "diplomacy",
      prompt: "동해 무역길을 열어 북방에서 금화 80을 들여오고 해군 호송을 붙인다.",
    },
    {
      title: "산악 채굴 조합",
      reward: "자재 120 / 안정도 -2",
      intent: "policy",
      prompt:
        "산악 채굴 조합에 특허를 부여하고 노동 징발을 실시해 자재 120을 확보한다. 안정도 감소를 무마할 조치를 병행한다.",
    },
    {
      title: "곡창지대 수확제",
      reward: "식량 150 / 행복 +2",
      intent: "policy",
      prompt:
        "남부 곡창지대에 수확제를 열어 식량 150을 비축하고 민심을 달랜다. 장터를 열어 환호를 유도한다.",
    },
    {
      title: "황금사절 원정",
      reward: "금화 100 / 외교 평판 +",
      intent: "intel",
      prompt:
        "황금 사절단을 이웃 도시에 보내 호화 선물을 주고 외교 평판을 높이며 금화 100의 투자를 회수한다.",
    },
    {
      title: "마법유적 발굴",
      reward: "에너지 90 / 기술 +3",
      intent: "science",
      prompt:
        "폐허가 된 유적에서 마력 결정체를 발굴해 에너지 90을 확보하고 연구자들에게 기술 투자를 늘린다.",
    },
    {
      title: "국경시장 야전 교역",
      reward: "식량 80 / 금화 60",
      intent: "diplomacy",
      prompt:
        "국경 지역 야전시장을 열어 잉여 식량 80을 팔고 금화 60을 확보한다. 도적을 막기 위해 경비를 배치한다.",
    },
  ];

  const cooldownBase = data.status?.cooldown_seconds || 180;
  const shieldRemaining = data.status?.shield_until
    ? Math.max(
        0,
        Math.floor(
          (new Date(data.status.shield_until).getTime() - Date.now()) / 1000
        )
      )
    : 0;

  useEffect(() => {
    if (!data.status?.last_action_at) return;

    const interval = setInterval(() => {
      const last = new Date(data.status.last_action_at).getTime();
      const now = Date.now();
      const diff = (now - last) / 1000;
      const remaining = cooldownBase - diff;

      if (remaining > 0) {
        setCooldown(Math.ceil(remaining));
      } else {
        setCooldown(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data.status.last_action_at, cooldownBase]);

  const handleCommand = async () => {
    if (!cmdInput.trim()) return;
    setIsProcessing(true);
    setLastResult(null);
    setLastHeadline(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("인증 토큰을 찾을 수 없습니다. 다시 로그인해주세요.");
      }

      const res = await fetch("/api/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid, command: cmdInput, intent: selectedIntent }),
      });

      const json = await res.json();
      if (json.success) {
        setCmdInput("");
        setLastResult(json.result.narrative);
        setLastHeadline(json.result.news_headline || null);
        setSelectedIntent("general");
      } else {
        alert("오류: " + json.error);
      }
    } catch (e) {
      console.error(e);
      alert("통신 오류");
    } finally {
      setIsProcessing(false);
    }
  };

  const applyTemplate = (intent: string, prompt: string) => {
    setSelectedIntent(intent);
    setCmdInput(prompt);
    setLastResult(null);
    setLastHeadline(null);
  };

  return (
    <div style={{ paddingBottom: "80px" }}>
      <div className="dashboard-grid">
        <div className="full-span">
          <div
            className="card"
            style={{
              padding: "18px",
              background: "var(--bg-card-strong)",
              border: "1px solid var(--stroke-soft)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 10px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--stroke-soft)",
                    marginBottom: "6px",
                    fontSize: "0.9rem",
                    color: "var(--text-sub)",
                  }}
                >
                  <span style={{ color: "#7ad193" }}>●</span> 접속 중
                </div>
            <h2
              style={{
                color: "var(--text-main)",
                margin: 0,
                fontSize: "1.5rem",
                letterSpacing: "0.02em",
              }}
            >
              {data.identity.name}
            </h2>
            <span style={{ fontSize: "0.9rem", color: "var(--text-sub)" }}>
              {data.identity.description || `${data.identity.ruler_title}의 통치 하에`}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "flex-start",
              minWidth: "240px",
            }}
          >
            <StatusChip label="쿨다운" value={`${cooldownBase}s`} tone="info" />
                <StatusChip
                  label="보호막"
                  value={
                    shieldRemaining > 0
                      ? `${Math.ceil(shieldRemaining / 3600)}h 남음`
                      : "없음"
                  }
                  tone={shieldRemaining > 0 ? "safe" : "muted"}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: "12px",
              }}
            >
              <StatusChip label="룰" value="리롤 불가 · 1인 1국가" tone="alert" />
            <StatusChip
              label="기후"
              value={data.attributes?.climate || "미상"}
              tone="info"
            />
            <StatusChip
              label="정치체제"
              value={data.attributes?.politics || "미상"}
              tone="muted"
            />
            </div>
          </div>
        </div>

        <div className="dashboard-column">
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
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "10px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>자원 현황</h3>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                {data.tags && data.tags.length > 0 ? (
                  data.tags.map((tag: string, idx: number) => (
                    <span key={idx} className="tag-chip">
                      <FaHashtag size={10} color="var(--accent-cyan)" /> {tag}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: "0.85rem", color: "var(--text-sub)" }}>
                    특이 상태 없음
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
              }}
            >
              <ResourceItem
                icon={<FaCoins color="var(--accent-gold)" />}
                value={data.resources.gold}
                label="금화"
              />
              <ResourceItem
                icon={<FaBreadSlice color="#d1b799" />}
                value={data.resources.food}
                label="식량"
              />
              <ResourceItem
                icon={<FaCube color="#a9b7c8" />}
                value={data.resources.materials}
                label="자재"
              />
              <ResourceItem
                icon={<FaBolt color="var(--accent-cyan)" />}
                value={data.resources.energy}
                label="에너지"
              />
              <ResourceItem
                icon={<FaUsers color="#9fc79f" />}
                value={data.resources.population || 0}
                label="인구"
              />
              <ResourceItem
                icon={<FaMapMarkerAlt color="#d8a569" />}
                value={data.resources.territory || 0}
                label="영토"
              />
            </div>
          </div>

          <div
            className="card"
            style={{
              background: "var(--bg-card-strong)",
              border: "1px solid var(--stroke-soft)",
            }}
          >
            <h3 style={{ marginBottom: "12px", fontSize: "1.05rem" }}>
              국가 상태 패널
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
              }}
            >
              <div
                style={{
                  marginBottom: 0,
                  gridColumn: "span 2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid var(--stroke-soft)",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "12px",
                  padding: "14px",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FaBalanceScale
                    size={22}
                    color={
                      data.stats.stability < 30 ? "var(--accent-danger)" : "var(--accent-gold)"
                    }
                  />
                  <div>
                    <div style={{ fontWeight: "bold" }}>안정도</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-sub)" }}>
                      국가 붕괴 위험도
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color:
                      data.stats.stability < 30 ? "var(--accent-danger)" : "var(--accent-gold)",
                  }}
                >
                  {data.stats.stability}%
                </div>
              </div>

              <StatCard
                icon={<FaChartLine />}
                label="경제"
                value={data.stats.economy}
              />
              <StatCard
                icon={<FaShieldAlt />}
                label="군사"
                value={data.stats.military}
              />
              <StatCard
                icon={<GiHeartInside />}
                label="행복"
                value={data.stats.happiness}
              />
              <StatCard
                icon={<GiTechnoHeart />}
                label="기술"
                value={data.stats.technology}
              />
              <StatCard
                icon={<GiTreeGrowth />}
                label="지속"
                value={data.stats.sustainability}
              />
              <StatCard
                icon={<GiShakingHands />}
                label="영향력"
                value={data.stats.influence}
              />
            </div>
          </div>
        </div>

        <div className="dashboard-column">
          <div
            className="card"
            style={{
              borderColor: "var(--stroke-soft)",
              background: "var(--bg-card-strong)",
            }}
          >
            <h3 style={{ marginBottom: "10px", fontSize: "1.05rem" }}>
              통치 명령 (AI 판정)
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              {playbookTemplates.map((tpl) => (
                <button
                  key={tpl.title}
                  onClick={() => applyTemplate(tpl.intent, tpl.prompt)}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--text-main)",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1px solid var(--stroke-soft)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{tpl.title}</div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-sub)",
                      marginTop: "4px",
                      lineHeight: 1.4,
                    }}
                  >
                    {tpl.prompt}
                  </div>
                </button>
              ))}
            </div>

            <label style={{ fontSize: "0.85rem", color: "var(--text-sub)" }}>
              행동 카테고리
            </label>
            <select
              value={selectedIntent}
              onChange={(e) => setSelectedIntent(e.target.value)}
              style={{
                marginBottom: "10px",
              }}
            >
              <option value="general">종합</option>
              <option value="policy">Policy/내정</option>
              <option value="diplomacy">외교</option>
              <option value="war">전쟁</option>
              <option value="science">기술/문화</option>
              <option value="intel">첩보</option>
            </select>

            <textarea
              rows={3}
              placeholder="예: 식량 생산을 늘리기 위해 농경지를 개간하라. 군사 훈련을 실시하라."
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              disabled={isProcessing}
            />

            <button
              className="btn-primary"
              onClick={handleCommand}
              disabled={isProcessing || cooldown > 0}
              style={{
                opacity: isProcessing || cooldown > 0 ? 0.55 : 1,
                cursor: isProcessing || cooldown > 0 ? "not-allowed" : "pointer",
              }}
            >
              {isProcessing
                ? "AI가 판정 중..."
                : cooldown > 0
                ? `재정비 중... (${cooldown}초)`
                : "명령 실행"}
            </button>

            {lastResult && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "12px",
                  background: "rgba(226,199,138,0.08)",
                  border: "1px solid var(--stroke-soft)",
                  borderRadius: "10px",
                }}
              >
                <strong
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <FaCheckCircle /> 판정 결과
                </strong>
                <div style={{ marginTop: "6px", lineHeight: 1.5 }}>{lastResult}</div>
                {lastHeadline && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "0.85rem",
                      color: "var(--accent-gold)",
                    }}
                  >
                    뉴스: {lastHeadline}
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className="card"
            style={{
              borderColor: "var(--stroke-soft)",
              background: "var(--bg-card-strong)",
            }}
          >
            <h3 style={{ marginBottom: "10px", fontSize: "1.05rem" }}>
              자원 수급·특수 컨텐츠
            </h3>
            <p style={{ marginTop: 0, color: "var(--text-sub)", fontSize: "0.9rem" }}>
              한 번 클릭하면 명령문이 자동으로 입력됩니다. 자원 루트와 서사 컨텐츠를
              번갈아 사용해 보급-스토리 균형을 맞추세요.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "10px",
              }}
            >
              {resourceRoutes.map((route) => (
                <button
                  key={route.title}
                  onClick={() => applyTemplate(route.intent, route.prompt)}
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1px solid var(--stroke-soft)",
                    background: "rgba(255,255,255,0.04)",
                    boxShadow: "none",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      marginBottom: "4px",
                      color: "var(--text-main)",
                    }}
                  >
                    {route.title}
                  </div>
                  <div style={{ color: "var(--accent-cyan)", fontSize: "0.9rem" }}>
                    보상: {route.reward}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <HistorySection uid={uid} />
        </div>
      </div>
    </div>
  );
}

function StatusChip({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "info" | "safe" | "alert" | "muted";
}) {
  const toneColor =
    tone === "info"
      ? "#8ab7d8"
      : tone === "safe"
      ? "#9fc79f"
      : tone === "alert"
      ? "#e2c78a"
      : "#7c8ba1";
  const toneBorder = tone === "muted" ? "var(--stroke-soft)" : `${toneColor}55`;

  return (
    <div
      style={{
        backgroundColor: "rgba(255,255,255,0.04)",
        border: `1px solid ${toneBorder}`,
        color: "var(--text-main)",
        padding: "7px 12px",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.8rem",
      }}
    >
      <span style={{ color: toneColor, fontWeight: "bold" }}>{label}</span>
      <span style={{ color: "var(--text-sub)" }}>{value}</span>
    </div>
  );
}

interface ResourceProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}
function ResourceItem({ icon, value, label }: ResourceProps) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        padding: "14px 10px",
        borderRadius: "12px",
        textAlign: "center",
        border: "1px solid var(--stroke-soft)",
        boxShadow: "none",
      }}
    >
      <div style={{ marginBottom: "4px" }}>{icon}</div>
      <div style={{ fontWeight: "bold", fontSize: "1.1rem", color: "var(--text-main)" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.85rem", color: "var(--text-sub)" }}>{label}</div>
    </div>
  );
}

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}
function StatCard({ icon, label, value }: StatProps) {
  return (
    <div
      style={{
        margin: 0,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        border: "1px solid var(--stroke-soft)",
        boxShadow: "none",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: "var(--text-sub)" }}>{icon}</span>
        <span style={{ fontSize: "0.95rem" }}>{label}</span>
      </div>
      <span style={{ fontWeight: "bold", fontSize: "1.05rem", color: "var(--text-main)" }}>
        {value}
      </span>
    </div>
  );
}

function HistorySection({ uid }: { uid: string }) {
  const [logs, setLogs] = useState<LogData[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "nations", uid, "logs"),
      orderBy("created_at", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LogData[];
      setLogs(history);
    });

    return () => unsubscribe();
  }, [uid]);

  return (
    <div style={{ marginTop: "0px" }} className="card">
      <h3
        style={{
          color: "var(--text-main)",
          borderBottom: "1px solid var(--stroke-soft)",
          paddingBottom: "10px",
          marginBottom: "15px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <FaScroll /> 국가 연대기
      </h3>

      {logs.length === 0 ? (
        <div style={{ color: "var(--text-sub)", textAlign: "center", padding: "12px" }}>
          아직 기록된 역사가 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {logs.map((log) => (
            <div
              key={log.id}
              className="card"
              style={{
                padding: "15px",
                borderLeft: "3px solid rgba(226,199,138,0.7)",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--stroke-soft)",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-sub)",
                  marginBottom: "4px",
                }}
              >
                {new Date(log.created_at).toLocaleString()}
              </div>
            <div
              style={{
                fontWeight: "bold",
                marginBottom: "8px",
                color: "var(--accent-gold)",
              }}
              >
                &quot;{log.command}&quot;
              </div>
            {log.intent && (
              <div
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--stroke-soft)",
                  borderRadius: "12px",
                  fontSize: "0.7rem",
                  color: "var(--text-sub)",
                  marginBottom: "6px",
                }}
              >
                {log.intent}
              </div>
            )}
            <div style={{ fontSize: "0.95rem", lineHeight: "1.4" }}>
              {log.narrative}
            </div>
              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  gap: "8px",
                  fontSize: "0.75rem",
                }}
              >
                {log.changes &&
                  Object.entries(log.changes).map(([key, val]) => (
                    <span
                      key={key}
                      style={{ color: val > 0 ? "var(--accent-lime)" : "var(--accent-danger)" }}
                    >
                      {key.split(".")[1]} {val > 0 ? "+" : ""}
                      {val}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
