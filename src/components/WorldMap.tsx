"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { drawHex, hexToPixel, HEX_SIZE, isNeighbor } from "@/utils/hex";
import { NationData } from "@/hooks/useNation";
import {
  FaFlag,
  FaGem,
  FaGlobeAmericas,
  FaHammer,
  FaShieldAlt,
} from "react-icons/fa";
import { GiCrossedSwords } from "react-icons/gi";

interface Tile {
  id: string;
  q: number;
  r: number;
  type: string;
  owner: string | null;
  resource: string;
}

const ATTACK_COST_ENERGY = 20;
const ATTACK_COST_FOOD = 50;
const OCCUPY_COST_GOLD = 100;

// UID 해시 -> HSL 색상 변환
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 45%)`;
}

export default function WorldMap({ myNation }: { myNation?: NationData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [inspectedOwner, setInspectedOwner] = useState<{
    uid: string;
    name: string;
    military: number;
    shieldUntil?: string;
  } | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [scale, setScale] = useState(1);

  const currentUser = auth.currentUser;
  const myTiles = tiles.filter((t) => t.owner === currentUser?.uid);
  const myResources = myNation?.resources;
  const isAdjacentToSelection = Boolean(
    selectedTile && myTiles.some((my) => isNeighbor(my, selectedTile))
  );
  const mapBounds = useMemo(() => {
    if (!tiles.length) return { width: 1000, height: 1000, offsetX: 50, offsetY: 50 };
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    tiles.forEach((tile) => {
      const { x, y } = hexToPixel(tile.q, tile.r);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    const padding = 80;
    const width = Math.ceil(maxX - minX + padding * 2);
    const height = Math.ceil(maxY - minY + padding * 2);
    const offsetX = -minX + padding;
    const offsetY = -minY + padding;
    return {
      width,
      height,
      offsetX,
      offsetY,
      centerX: width / 2,
      centerY: height / 2,
    };
  }, [tiles]);

  const estimateWinChance = () => {
    if (!myNation || !inspectedOwner) return null;
    const defenderPower =
      inspectedOwner.military *
      (selectedTile?.type === "capital" ? 1.3 : 1);

    if (!defenderPower || !myNation.stats.military) return null;

    const ratio = myNation.stats.military / defenderPower;
    const chance = Math.round(
      Math.max(5, Math.min(95, (ratio / (1 + ratio)) * 100))
    );
    return chance;
  };

  const defenderShieldHours =
    inspectedOwner?.shieldUntil
      ? Math.max(
          0,
          Math.ceil(
            (new Date(inspectedOwner.shieldUntil).getTime() - Date.now()) /
              (1000 * 60 * 60)
          )
        )
      : 0;

  const attackResourceLacking = myResources
    ? myResources.energy < ATTACK_COST_ENERGY
      ? "에너지가 부족합니다."
      : myResources.food < ATTACK_COST_FOOD
      ? "식량이 부족합니다."
      : null
    : "내 자원 정보를 불러오지 못했습니다.";

  const occupyResourceLacking =
    myResources && myResources.gold < 100 ? "금화 부족" : null;

  const canOccupy = Boolean(
    selectedTile &&
      !selectedTile.owner &&
      isAdjacentToSelection &&
      !occupyResourceLacking
  );

  const canAttack = Boolean(
    selectedTile &&
      selectedTile.owner &&
      selectedTile.owner !== currentUser?.uid &&
      isAdjacentToSelection &&
      defenderShieldHours === 0 &&
      !attackResourceLacking
  );

  useEffect(() => {
    const fetchMap = async () => {
      try {
        const snap = await getDocs(collection(db, "tiles"));
        const tileData = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Tile)
        );
        setTiles(tileData);
      } catch (e) {
        console.error("맵 로딩 실패:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchMap();
  }, []);

  useEffect(() => {
    const ownerUid = selectedTile?.owner;
    if (!ownerUid || ownerUid === auth.currentUser?.uid) {
      setInspectedOwner(null);
      return;
    }

    let cancelled = false;
    const fetchOwner = async () => {
      try {
        setOwnerLoading(true);
        const snap = await getDoc(doc(db, "nations", ownerUid));
        if (!cancelled && snap.exists()) {
          const d = snap.data() as Partial<NationData>;
          setInspectedOwner({
            uid: ownerUid,
            name: d.identity?.name || "Unknown",
            military: d.stats?.military ?? 0,
            shieldUntil: d.status?.shield_until,
          });
        } else if (!cancelled) {
          setInspectedOwner(null);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("방어자 정보 로드 실패:", e);
          setInspectedOwner(null);
        }
      } finally {
        if (!cancelled) setOwnerLoading(false);
      }
    };

    fetchOwner();
    return () => {
      cancelled = true;
    };
  }, [selectedTile?.owner]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tiles.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = mapBounds.width * dpr;
    canvas.height = mapBounds.height * dpr;
    canvas.style.width = `${mapBounds.width}px`;
    canvas.style.height = `${mapBounds.height}px`;
    ctx.scale(dpr, dpr);

    // 바다 배경
    ctx.fillStyle = "#08202f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    tiles.forEach((tile) => {
      const { x, y } = hexToPixel(tile.q, tile.r);
      const offsetX = x + mapBounds.offsetX;
      const offsetY = y + mapBounds.offsetY;

      // 1. 채우기 색상
      const baseLand = "#2f6b4f"; // 녹색 톤 육지
      const sea = "#0b2233"; // 깊은 바다 색
      let fillColor = tile.type === "ocean" ? sea : baseLand;
      if (tile.owner) fillColor = stringToColor(tile.owner);

      // 2. 테두리 색상
      let strokeColor = tile.type === "ocean" ? "#134a69" : "#1f4a35";
      let lineWidth = 1.5;

      if (tile.owner === currentUser?.uid) {
        strokeColor = "#f5e3a1";
        lineWidth = 2.8;
      } else if (tile.owner) {
        strokeColor = "#0f1820";
      }

      if (selectedTile?.id === tile.id) {
        strokeColor = "#fff";
        lineWidth = 3;
      }

      ctx.lineWidth = lineWidth;
      drawHex(ctx, offsetX, offsetY, fillColor, strokeColor);

      // 3. 수도 표시 (이모지 제거 -> 그래픽 드로잉)
      if (tile.type === "capital") {
        // 수도는 중앙에 하얀색 점(원)을 그림
        ctx.beginPath();
        ctx.arc(offsetX, offsetY, 7, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.fill();
        // 외곽선
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 내 땅 하이라이트 링
      if (tile.owner === currentUser?.uid) {
        ctx.beginPath();
        ctx.arc(offsetX, offsetY, HEX_SIZE - 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [tiles, selectedTile, currentUser, mapBounds]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // transform scale를 적용했으므로 스케일을 나눠 좌표를 맞춰준다.
    const scaledX = (e.clientX - rect.left) / scale;
    const scaledY = (e.clientY - rect.top) / scale;
    const clickX = scaledX - mapBounds.offsetX;
    const clickY = scaledY - mapBounds.offsetY;

    const clicked = tiles.find((tile) => {
      const { x, y } = hexToPixel(tile.q, tile.r);
      const dist = Math.sqrt((x - clickX) ** 2 + (y - clickY) ** 2);
      return dist < HEX_SIZE;
    });

    if (clicked) setSelectedTile(clicked);
    else setSelectedTile(null);
  };

  const getIdTokenOrThrow = async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("인증 토큰을 찾을 수 없습니다. 다시 로그인해주세요.");
    }
    return token;
  };

  const handleOccupy = async () => {
    if (!selectedTile || !currentUser) return;
    if (selectedTile.type === "ocean") {
      alert("바다 타일은 개척할 수 없습니다.");
      return;
    }
    if (
      !confirm(
        `금화 ${OCCUPY_COST_GOLD}을(를) 사용해 이 땅을 개척하시겠습니까?`
      )
    )
      return;

    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch("/api/tile/occupy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: currentUser.uid, tileId: selectedTile.id }),
      });
      const json = await res.json();

      if (json.success) {
        alert("성공! 영토가 확장되었습니다.");
        updateTileState(selectedTile.id, currentUser.uid, "territory");
      } else {
        alert("실패: " + json.error);
      }
    } catch (e) {
      console.error("Occupy failed:", e);
      alert("통신 오류");
    }
  };

  const handleAttack = async () => {
    if (!selectedTile || !currentUser) return;
    if (selectedTile.type === "ocean") {
      alert("바다 타일은 침공할 수 없습니다.");
      return;
    }
    if (
      !confirm(
        "전쟁을 선포하시겠습니까? (소모: 에너지 20, 식량 50)\n승리 시 영토와 자원을 약탈합니다."
      )
    )
      return;

    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch("/api/war/attack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attackerUid: currentUser.uid,
          targetTileId: selectedTile.id,
        }),
      });
      const json = await res.json();

      if (json.success && json.result.success) {
        alert(json.result.msg);
        updateTileState(selectedTile.id, currentUser.uid, "territory");
      } else if (json.success && !json.result.success) {
        alert(json.result.msg);
      } else {
        alert("오류: " + json.error);
      }
    } catch (e) {
      console.error("Attack failed:", e);
      alert("통신 오류");
    }
  };

  const updateTileState = (
    tileId: string,
    newOwner: string,
    newType: string
  ) => {
    const updatedTile = { ...selectedTile!, owner: newOwner, type: newType };
    setTiles((prev) => prev.map((t) => (t.id === tileId ? updatedTile : t)));
    setSelectedTile(updatedTile);
  };

  if (loading)
    return (
      <div style={{ padding: 20, color: "#888" }}>세계 지도를 불러오는 중...</div>
    );

  return (
    <div>
        <div
          style={{
            width: "100%",
            overflow: "auto",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            background: "radial-gradient(circle at 10% 10%, rgba(113,200,232,0.04), rgba(0,0,0,0)), #071520",
            marginBottom: "10px",
            boxShadow: "0 8px 18px rgba(0,0,0,0.25)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={{ padding: "12px", display: "inline-block" }}>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                marginBottom: "8px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ color: "#9fb3c8", fontSize: "0.9rem" }}>
                스케일: {Math.round(scale * 100)}%
              </div>
              <input
                type="range"
                min={0.8}
                max={1.6}
                step={0.1}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                style={{ flex: "1 1 160px" }}
              />
            </div>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{
                display: "block",
                cursor: "pointer",
                borderRadius: "16px",
                transform: `scale(${scale})`,
                transformOrigin: "50% 50%",
                margin: "0 auto",
              }}
            />
          </div>
        </div>

      <div
        className="card"
        style={{
          marginBottom: "12px",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          alignItems: "center",
          background:
            "linear-gradient(120deg, rgba(243,210,123,0.08), rgba(122,213,247,0.08))",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: currentUser ? stringToColor(currentUser.uid) : "#f5e3a1",
              border: "2px solid #f5e3a1",
            }}
          />
          <span style={{ color: "#fff", fontWeight: "bold" }}>내 영토</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#c5d2e0",
            fontSize: "0.9rem",
          }}
        >
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: "#2f6b4f",
              border: "1px solid #1f4a35",
            }}
          />
          <span>중립/타국 육지</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#c5d2e0",
            fontSize: "0.9rem",
          }}
        >
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: "#0b2233",
              border: "1px solid #134a69",
            }}
          />
          <span>바다</span>
        </div>
      </div>

      {selectedTile ? (
        <div
          className="card"
          style={{
            borderLeft: `4px solid ${
              selectedTile.owner ? stringToColor(selectedTile.owner) : "#888"
            }`,
          }}
        >
          <h3 style={{ margin: 0, color: "var(--accent-gold)" }}>
            타일 ({selectedTile.q}, {selectedTile.r})
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              marginTop: "10px",
              gap: "10px",
              fontSize: "0.9rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <FaGlobeAmericas color="#aaa" /> {selectedTile.type}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <FaGem color="#00BFFF" /> {selectedTile.resource}
            </div>
            <div
              style={{
                gridColumn: "span 2",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <FaFlag
                color={
                  selectedTile.owner
                    ? stringToColor(selectedTile.owner)
                    : "#888"
                }
              />
              {selectedTile.owner ? (
                selectedTile.owner === currentUser?.uid ? (
                  <span style={{ fontWeight: "bold", color: "#fff" }}>
                    나의 영토
                  </span>
                ) : (
                  <span style={{ color: "#aaa" }}>타 국가 영토</span>
                )
              ) : (
                "중립 지대"
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: "15px",
              paddingTop: "10px",
              borderTop: "1px solid #333",
            }}
          >
            {selectedTile.owner &&
              selectedTile.owner !== currentUser?.uid && (
                <div
                  style={{
                    marginBottom: "12px",
                    padding: "10px",
                    background: "#0d1117",
                    borderRadius: "12px",
                    border: "1px solid #222",
                    color: "#e6edf3",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "6px",
                      color: "#9fb3c8",
                    }}
                  >
                    <GiCrossedSwords /> 교전 정보
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      fontSize: "0.9rem",
                    }}
                  >
                    <span>
                      내 군사력: {myNation ? myNation.stats.military : "-"}
                    </span>
                    <span>
                      상대 군사력:{" "}
                      {ownerLoading
                        ? "불러오는 중..."
                        : inspectedOwner
                        ? inspectedOwner.military
                        : "알 수 없음"}
                    </span>
                    {defenderShieldHours > 0 && (
                      <span
                        style={{
                          color: "#e3c96f",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <FaShieldAlt /> 보호막 {defenderShieldHours}h 남음
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      fontWeight: "bold",
                      color: "#e6edf3",
                    }}
                  >
                    예상 승률:{" "}
                    {estimateWinChance() !== null
                      ? `${estimateWinChance()}%`
                      : "데이터 부족"}
                  </div>
                </div>
              )}

            {/* 1. 개척하기 */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                marginBottom: "10px",
                fontSize: "0.8rem",
                color: "#9fb3c8",
              }}
            >
              <span>개척 비용: 금화 {OCCUPY_COST_GOLD}</span>
              <span>
                침공 비용: 에너지 {ATTACK_COST_ENERGY} / 식량 {ATTACK_COST_FOOD}
              </span>
              <span>조건: 인접 영토 필요</span>
            </div>

            {!selectedTile.owner && (
              <button
                onClick={handleOccupy}
                disabled={!canOccupy}
                style={{
                  width: "100%",
                  background: canOccupy ? "#4CAF50" : "#2f3a33",
                  color: "white",
                  padding: "10px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: canOccupy ? "pointer" : "not-allowed",
                  opacity: canOccupy ? 1 : 0.6,
                }}
              >
                <FaHammer /> 개척하기 ({OCCUPY_COST_GOLD}G)
              </button>
            )}
            {!selectedTile.owner && !isAdjacentToSelection && (
              <div style={{ fontSize: "0.8rem", color: "#ffb347", marginTop: "6px" }}>
                인접한 내 영토가 있어야 개척할 수 있습니다.
              </div>
            )}
            {!selectedTile.owner && occupyResourceLacking && isAdjacentToSelection && (
              <div style={{ fontSize: "0.8rem", color: "#ff6b6b", marginTop: "6px" }}>
                {occupyResourceLacking}
              </div>
            )}

            {/* 2. 침공하기 */}
            {selectedTile.owner && selectedTile.owner !== currentUser?.uid && (
              <button
                onClick={handleAttack}
                disabled={!canAttack}
                style={{
                  width: "100%",
                  background: canAttack ? "#8B0000" : "#3a2f32",
                  color: "white",
                  padding: "10px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: canAttack ? "pointer" : "not-allowed",
                  opacity: canAttack ? 1 : 0.6,
                  marginTop: "10px",
                }}
              >
                <GiCrossedSwords size={20} /> 침공 개시 (Invasion)
              </button>
            )}

            {selectedTile.owner &&
              selectedTile.owner !== currentUser?.uid &&
              !isAdjacentToSelection && (
                <div style={{ fontSize: "0.8rem", color: "#ffb347", marginTop: "6px" }}>
                  인접 영토가 없어 침공할 수 없습니다.
                </div>
              )}
            {selectedTile.owner &&
              selectedTile.owner !== currentUser?.uid &&
              defenderShieldHours > 0 && (
                <div style={{ fontSize: "0.8rem", color: "#e3c96f", marginTop: "6px" }}>
                  상대 보호막이 {defenderShieldHours}시간 남았습니다.
                </div>
              )}
            {selectedTile.owner &&
              selectedTile.owner !== currentUser?.uid &&
              attackResourceLacking &&
              isAdjacentToSelection &&
              defenderShieldHours === 0 && (
                <div style={{ fontSize: "0.8rem", color: "#ff6b6b", marginTop: "6px" }}>
                  {attackResourceLacking}
                </div>
              )}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "10px",
            color: "#666",
            textAlign: "center",
            fontSize: "0.9rem",
          }}
        >
          지도를 클릭하여 정보를 확인하세요.
        </div>
      )}
    </div>
  );
}
