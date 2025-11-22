import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface NationData {
  uid: string;

  identity: {
    name: string;
    ruler_title: string;
    description?: string; // 있을 수도 있고 없을 수도 있음 (?)
    flag_color?: string;
  };

  stats: {
    stability: number;
    economy: number;
    military: number;
    happiness: number;
    technology: number;
    sustainability: number;
    influence: number;
  };

  resources: {
    gold: number;
    food: number;
    materials: number;
    energy: number;
    population?: number;
    territory?: number;
  };

  status: {
    last_action_at: string;
    cooldown_seconds?: number;
    is_online: boolean;
    is_poverty: boolean;
    shield_until?: string;
    // 👇 추가
    is_alive?: boolean; // undefined거나 true면 생존, false면 멸망
    fallen_at?: string; // 멸망한 시간
  };

  // 👇 [여기!] 이 줄을 꼭 추가해주세요! 👇
  tags: string[];
}

export function useNation(uid: string | null) {
  const [nation, setNation] = useState<NationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "nations", uid), (doc) => {
      if (doc.exists()) {
        setNation(doc.data() as NationData);
      } else {
        setNation(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [uid]);

  return { nation, loading };
}
