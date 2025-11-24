/* eslint react-hooks/set-state-in-effect: off */
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

  attributes?: {
    climate?: string;
    politics?: string;
    economy_type?: string;
    social_atmosphere?: string;
    weakness?: string;
    origin?: string;
    military_doctrine?: string;
    diplomatic_posture?: string;
    tech_ethics?: string;
    resource_strategy?: string;
    civic_priority?: string;
    capital_symbol?: string;
    national_motto?: string;
    faction_balance?: string;
    external_threat?: string;
    alliance_goal?: string;
    cultural_identity?: string;
    crisis_response?: string;
    trade_focus?: string;
    intelligence_policy?: string;
    migration_policy?: string;
    succession_law?: string;
  };

  stats: {
    stability: number;
    economy: number;
    military: number;
    happiness: number;
    technology: number;
    sustainability: number;
    influence: number;
    diplomacy?: number;
    intelligence?: number;
    logistics?: number;
    culture?: number;
    cohesion?: number;
    innovation?: number;
    security?: number;
    growth?: number;
  };

  resources: {
    gold: number;
    food: number;
    materials: number;
    energy: number;
    population?: number;
    territory?: number;
    research?: number;
    culture_points?: number;
    intel?: number;
    logistics_cap?: number;
    legitimacy?: number;
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

  strategic_profile?: {
    doctrines: {
      military?: string;
      diplomacy?: string;
      economy?: string;
      technology?: string;
      security?: string;
    };
    internal_links?: string[];
    external_links?: string[];
    synergy_effects?: string[];
  };
}

export function useNation(uid: string | null) {
  const [nation, setNation] = useState<NationData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(uid));

  useEffect(() => {
    let unsub: (() => void) | undefined;

    if (uid) {
      setLoading(true);
      unsub = onSnapshot(doc(db, "nations", uid), (docSnap) => {
        if (docSnap.exists()) {
          setNation(docSnap.data() as NationData);
        } else {
          setNation(null);
        }
        setLoading(false);
      });
    } else {
      setNation(null);
      setLoading(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [uid]);

  return { nation, loading };
}
