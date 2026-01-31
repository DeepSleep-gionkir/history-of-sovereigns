export type DbDate = string | Date | { seconds: number; nanoseconds: number };

export interface Continent {
  id: string;
  name: string;
  description: string;
  imagePath: string; // SVG path data (d attribute) or full SVG string
  maxNations: number;
  currentNations: number;
  createdAt: DbDate; // Firestore Timestamp or Date or string
  isSystem: boolean;
}

export interface FactionState {
  name: string;
  power: number; // 0-100: Influence level
  loyalty: number; // 0-100: Loyalty level
}

export interface Factions {
  military: FactionState;
  nobility: FactionState;
  commoners: FactionState;
  intelligentsia: FactionState;
}

export interface PolicyWeb {
  tax: "low" | "standard" | "heavy" | "plunder";
  conscription: "none" | "volunteer" | "conscript" | "total_war";
  economy: "planned" | "mixed" | "market";
  border: "open" | "regulated" | "closed";
}

export interface NationData {
  uid: string;
  continentId?: string;

  // Identity & Flavor
  identity: {
    name: string;
    ruler_title: string;
    description?: string;
    flag_color?: string;
    motto?: string;
    type?: string;
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

  // Tag System
  tags: string[];

  // Grand Strategy Stats
  stats: {
    // Core Power
    military: number;
    economy: number;
    technology: number;
    culture: number;

    // Internal Stability modifiers
    stability: number; // 0-100
    legitimacy: number; // 0-100
    admin_cap: number; // Territory Limit
    corruption: number; // 0-100
    reputation: number; // 0-100 (External)

    // Legacy mapping (optional)
    happiness?: number;
    sustainability?: number;
    influence?: number;
    diplomacy?: number;
    intelligence?: number;
    logistics?: number;
    cohesion?: number;
    innovation?: number;
    security?: number;
    growth?: number;
  };

  factions?: Factions; // Made optional for migration safety

  // Resources
  resources: {
    gold: number;
    food: number;
    mana: number;
    population: number;
    materials: number;
    energy: number;

    // Limits
    logistics_cap?: number;
    territory?: number;

    // Legacy
    research?: number;
    culture_points?: number;
    intel?: number;
  };

  policies?: PolicyWeb; // Made optional for migration safety

  status: {
    is_alive: boolean;
    founded_at: DbDate;
    last_action_at: DbDate;
    cooldown_seconds?: number;
    shield_until?: DbDate;
    is_online?: boolean; // Legacy but can keep
    is_poverty?: boolean; // Legacy but can keep
    fallen_at?: string;
  };

  // Strategic AI Profile (Legacy but useful)
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
