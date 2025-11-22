"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  FaUserShield,
  FaGlobeAmericas,
  FaTools,
  FaUserCog,
  FaHome,
} from "react-icons/fa";

type AdminNation = {
  uid: string;
  identity: { name: string; ruler_title: string };
  resources: { gold: number; food: number; materials?: number; energy?: number; territory?: number };
  stats: { stability: number; military: number };
  status?: { cooldown_seconds?: number; is_alive?: boolean; shield_until?: string };
};

type AdminTile = {
  id: string;
  owner?: string | null;
  type?: string;
  q?: number;
  r?: number;
};

const ADMIN_UIDS = (
  process.env.NEXT_PUBLIC_ADMIN_UIDS || "EoC0epp9QOae5GUxFyHFeX2Bfln1"
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export default function AdminPage() {
  const [nations, setNations] = useState<AdminNation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
        return;
      }
      if (!ADMIN_UIDS.includes(user.uid)) {
        alert("관리자만 접근 가능합니다.");
        router.push("/");
        return;
      }
      setIsAdmin(true);
      loadNations();
    });
    return () => unsub();
  }, []);

  const loadNations = async () => {
    try {
      const snapshot = await getDocs(collection(db, "nations"));
      const list = snapshot.docs.map(
        (docSnap) => ({ uid: docSnap.id, ...(docSnap.data() as Omit<AdminNation, "uid">) })
      );
      setNations(list);
      setIsAdmin(true);
    } catch (error) {
      console.error(error);
      alert("접근 권한이 없습니다.");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const updateStat = async (
    targetUid: string,
    field: string,
    value: string
  ) => {
    if (!confirm(`정말 ${field} 값을 변경하시겠습니까?`)) return;

    try {
      const ref = doc(db, "nations", targetUid);
      await updateDoc(ref, {
        [field]: Number(value),
      });
      alert("수정 완료");
      loadNations();
    } catch (e) {
      console.error(e);
      alert("수정 실패");
    }
  };

  const resetWorld = async () => {
    if (
      !confirm(
        "경고: 기존 맵 데이터를 덮어쓰고 월드를 새로 만듭니다. \n기존 유저들의 영토 소유권도 초기화됩니다!"
      )
    )
      return;

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const size = 30; // 더 넓은 월드
      const center = size / 2;
      const maxDist = Math.sqrt(2) * center;

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const tileId = `${r}_${c}`;
          const ref = doc(db, "tiles", tileId);
          const dist =
            Math.sqrt(Math.pow(c - center, 2) + Math.pow(r - center, 2)) /
            maxDist;
          const noise = Math.random() * 0.15;
          const seaThreshold = 0.45 + noise; // 외곽은 바다 확률 증가
          const isOcean = dist > seaThreshold;

          batch.set(ref, {
            q: c,
            r: r,
            type: isOcean ? "ocean" : "plains",
            owner: null,
            resource: isOcean ? "none" : "food",
          });
        }
      }

      await batch.commit();
      // 이모지 제거됨
      alert(
        "신세계가 창조되었습니다. 대륙/바다 모양으로 생성되었습니다.\n이제 '유랑민 구제' 버튼을 눌러 유저들에게 땅을 나눠주세요."
      );
    } catch (e) {
      console.error(e);
      alert("월드 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  const backfillCooldownShield = async () => {
    if (
      !confirm(
        "모든 국가의 쿨다운/보호막/생존 플래그를 안전 값으로 채웁니다. 진행할까요?"
      )
    )
      return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "nations"));
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Partial<AdminNation> | undefined;
        const updates: Record<string, unknown> = {};
        const status = data?.status || {};
        const resources = (data?.resources ||
          {}) as Partial<AdminNation["resources"]>;

        if (!status.cooldown_seconds) updates["status.cooldown_seconds"] = 180;
        if (status.is_alive === undefined) updates["status.is_alive"] = true;
        if (!status.shield_until) {
          updates["status.shield_until"] = new Date(
            Date.now() + 4 * 60 * 60 * 1000
          ).toISOString();
        }
        if (resources.territory === undefined) {
          updates["resources.territory"] = 1;
        }

        if (Object.keys(updates).length > 0) {
          batch.update(docSnap.ref, updates);
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        alert(
          `완료: ${count}개 국가의 쿨다운/보호막/생존 플래그/영토를 보강했습니다.`
        );
      } else {
        alert("업데이트할 대상이 없습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("백필 실패");
    } finally {
      setLoading(false);
    }
  };

  const assignHomeless = async () => {
    if (!confirm("땅이 없는 모든 국가에게 새로운 수도를 배정합니까?")) return;
    setLoading(true);

    try {
      const tilesSnap = await getDocs(collection(db, "tiles"));
      const allTiles: AdminTile[] = tilesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as AdminTile) }));
      let emptyTiles = allTiles.filter((t) => !t.owner);

      const nationsSnap = await getDocs(collection(db, "nations"));
      const allNations = nationsSnap.docs.map(
        (d) => ({ uid: d.id, ...(d.data() as Omit<AdminNation, "uid">) })
      );

      const batch = writeBatch(db);
      let assignedCount = 0;

      for (const nation of allNations) {
        const ownsLand = allTiles.some((t) => t.owner === nation.uid);

        if (!ownsLand) {
          if (emptyTiles.length === 0) {
            alert("더 이상 빈 땅이 없습니다!");
            break;
          }

          const randomIndex = Math.floor(Math.random() * emptyTiles.length);
          // 바다(ocean)는 스킵
          const targetTile = emptyTiles.find((t) => t.type !== "ocean");
          if (!targetTile) break;
          emptyTiles = emptyTiles.filter((t) => t.id !== targetTile.id);
          emptyTiles.splice(randomIndex, 1);

          const tileRef = doc(db, "tiles", targetTile.id);
          batch.update(tileRef, {
            owner: nation.uid,
            type: "capital",
            resource: "gold",
          });

          const nationRef = doc(db, "nations", nation.uid);
          batch.update(nationRef, {
            "resources.territory": 1,
          });

          assignedCount++;
        }
      }

      if (assignedCount > 0) {
        await batch.commit();
        // 이모지 제거됨
        alert(
          `총 ${assignedCount}개의 국가에 새로운 보금자리를 마련해주었습니다.`
        );
      } else {
        alert("모든 국가가 이미 땅을 가지고 있습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("구제 작업 실패");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>관리 작업 중...</div>;
  if (!isAdmin) return null;

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1
        style={{
          color: "red",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <FaUserShield /> 관리자 콘솔 (신의 시점)
      </h1>

      <div
        style={{
          marginBottom: "30px",
          borderBottom: "1px solid #444",
          paddingBottom: "20px",
        }}
      >
        <h3
          style={{
            color: "var(--accent-gold)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaGlobeAmericas /> Genesis System
        </h3>
        <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "10px" }}>
          맵을 초기화하면 모든 유저가 땅을 잃습니다. 초기화 후 반드시 “유랑민
          구제”를 실행하세요.
        </p>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={resetWorld}
            style={{
              background: "var(--accent-gold)",
              color: "black",
              fontWeight: "bold",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FaTools /> 월드 리셋
          </button>

          <button
            onClick={backfillCooldownShield}
            style={{
              background: "#1976d2",
              color: "white",
              fontWeight: "bold",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FaTools /> 쿨다운/보호막 백필
          </button>

          <button
            onClick={assignHomeless}
            style={{
              background: "#4CAF50",
              color: "white",
              fontWeight: "bold",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FaHome /> 유랑민 구제 (땅 배정)
          </button>
        </div>
      </div>

      <h3
        style={{
          color: "#fff",
          marginBottom: "10px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <FaUserCog /> 유저 관리
      </h3>
      <div style={{ display: "grid", gap: "20px" }}>
        {nations.map((nation) => (
          <div
            key={nation.uid}
            className="card"
            style={{
              borderLeft: "5px solid red",
              padding: "15px",
              backgroundColor: "#222",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <h3 style={{ margin: 0 }}>
                {nation.identity.name} ({nation.identity.ruler_title})
              </h3>
              <span style={{ color: "#888", fontSize: "0.8rem" }}>
                {nation.uid}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: "10px",
              }}
            >
              <AdminInput
                label="Gold"
                uid={nation.uid}
                field="resources.gold"
                val={nation.resources.gold}
                onSave={updateStat}
              />
              <AdminInput
                label="Food"
                uid={nation.uid}
                field="resources.food"
                val={nation.resources.food}
                onSave={updateStat}
              />
              <AdminInput
                label="Stability"
                uid={nation.uid}
                field="stats.stability"
                val={nation.stats.stability}
                onSave={updateStat}
              />
              <AdminInput
                label="Military"
                uid={nation.uid}
                field="stats.military"
                val={nation.stats.military}
                onSave={updateStat}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AdminInputProps {
  label: string;
  uid: string;
  field: string;
  val: number;
  onSave: (uid: string, field: string, value: string) => void;
}

function AdminInput({ label, uid, field, val, onSave }: AdminInputProps) {
  const [value, setValue] = useState<string>(String(val));
  return (
    <div style={{ background: "#333", padding: "10px", borderRadius: "5px" }}>
      <label
        style={{
          fontSize: "0.8rem",
          color: "#aaa",
          display: "block",
          marginBottom: "4px",
        }}
      >
        {label}
      </label>
      <div style={{ display: "flex", gap: "5px" }}>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{
            padding: "5px",
            margin: 0,
            width: "100%",
            background: "#444",
            border: "none",
            color: "white",
          }}
        />
        <button
          onClick={() => onSave(uid, field, value)}
          style={{
            background: "red",
            color: "white",
            padding: "5px 10px",
            borderRadius: "4px",
            cursor: "pointer",
            border: "none",
          }}
        >
          Set
        </button>
      </div>
    </div>
  );
}
