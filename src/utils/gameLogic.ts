import { NationData } from "@/types/db";
import { POLICY_DEFINITIONS, PolicyCategory } from "@/constants/policies";

type StatKey = keyof NationData["stats"];
type ResourceKey = keyof NationData["resources"];

// --- Game Constants ---
const BASE_ADMIN_CAP = 50;
const ADMIN_LOAD_PER_TERRITORY = 5;
const ADMIN_LOAD_PER_POP = 0.01;
const MIN_EFFICIENCY = 0.5;

const MILITARY_UPKEEP_PER_UNIT = 2;
const FOOD_CONSUMPTION_PER_POP = 0.1;
const GROWTH_DIVISOR = 10;

// Yield Multipliers based on stats
const YIELD_RATE = {
  ECONOMY_GOLD: 10,
  SUSTAINABILITY_FOOD: 10,
  TECH_RESEARCH: 5,
  CULTURE_MANA: 2,
  INTELLIGENCE_INTEL: 2,
} as const;

export interface YieldResult {
  resources: Partial<Record<ResourceKey, number>>;
  stats: Partial<Record<StatKey, number>>;
  modifiers: {
    efficiency: number;
    adminLoad: number;
  };
}

/**
 * Calculates effectively used administrative capacity.
 * Higher load reduces national efficiency.
 */
export function calculateAdminLoad(nation: NationData): number {
  const territory = nation.resources.territory || 1;
  const population = nation.resources.population || 100;
  return Math.floor(
    territory * ADMIN_LOAD_PER_TERRITORY + population * ADMIN_LOAD_PER_POP,
  );
}

/**
 * Aggregates active policy modifiers into a single map.
 * Returns a map of StatKey -> Value.
 */
export function getPolicyModifiers(nation: NationData): Record<string, number> {
  const modifiers: Record<string, number> = {};

  if (!nation.policies) return modifiers;

  for (const [category, optionKey] of Object.entries(nation.policies)) {
    const cat = category as PolicyCategory;
    const def = POLICY_DEFINITIONS[cat];
    if (!def) continue;

    const option = def.options[optionKey];
    if (!option) continue;

    for (const effect of option.effects) {
      if (!effect.stat) continue;
      modifiers[effect.stat] = (modifiers[effect.stat] || 0) + effect.value;
    }
  }

  return modifiers;
}

/**
 * Core Game Loop Logic: Calculates hourly yields.
 *
 * Process:
 * 1. Calculate Admin Efficiency (0.5 - 1.0)
 * 2. Apply Policy Modifiers to Stats
 * 3. Calculate Base Yields from Stats
 * 4. Apply Direct Resource Bonuses
 * 5. Deduct Consumption/Upkeep
 */
export function calculateYields(nation: NationData): YieldResult {
  const stats = { ...nation.stats }; // Shallow copy for safety
  const resources = nation.resources;
  const policyMods = getPolicyModifiers(nation);

  // 1. Efficiency Calculation
  const adminLoad = calculateAdminLoad(nation);
  const adminCap = stats.admin_cap || BASE_ADMIN_CAP;

  let efficiency = 1.0;
  if (adminLoad > adminCap) {
    const overageRatio = (adminLoad - adminCap) / adminCap;
    // Efficiency drops by percentage of overage, capped at 50% penalty
    efficiency = Math.max(MIN_EFFICIENCY, 1.0 - overageRatio);
  }

  // Helper to get effective stat value (Base + Policy)
  const getEffectiveStat = (key: StatKey): number => {
    const base = stats[key] ?? 0;
    const mod = policyMods[key] ?? 0;
    return Math.max(0, base + mod); // Stats cannot be negative
  };

  // 2. Base Yield Calculation
  const baseGold =
    getEffectiveStat("economy") * YIELD_RATE.ECONOMY_GOLD * efficiency;
  const baseFood =
    getEffectiveStat("sustainability") *
    YIELD_RATE.SUSTAINABILITY_FOOD *
    efficiency;
  const baseResearch =
    getEffectiveStat("technology") * YIELD_RATE.TECH_RESEARCH * efficiency;
  const baseCulture =
    getEffectiveStat("culture") * YIELD_RATE.CULTURE_MANA * efficiency;
  const baseIntel =
    getEffectiveStat("intelligence") *
    YIELD_RATE.INTELLIGENCE_INTEL *
    efficiency;
  const popGrowth = (getEffectiveStat("growth") / GROWTH_DIVISOR) * efficiency;

  // 3. Direct Resource Modifiers from Policies (e.g., gold_income +20%)
  let finalGold = baseGold;
  if (policyMods["gold_income"]) {
    // Treat as percentage bonus: +20 becomes 1.2x
    finalGold *= 1 + policyMods["gold_income"] / 100;
  }

  // 4. Consumption & Upkeep
  const militaryUpkeep =
    getEffectiveStat("military") * MILITARY_UPKEEP_PER_UNIT;
  const foodConsumption =
    (resources.population || 0) * FOOD_CONSUMPTION_PER_POP;

  // 5. Final Assembly
  return {
    resources: {
      gold: Math.floor(finalGold - militaryUpkeep),
      food: Math.floor(baseFood - foodConsumption),
      mana: Math.floor(baseCulture),
      culture_points: Math.floor(baseCulture),
      intel: Math.floor(baseIntel),
      population: Math.floor(popGrowth),
      research: Math.floor(baseResearch),
    },
    stats: {
      // Computed stats that might change dynamically could go here
      stability: getEffectiveStat("stability"),
      legitimacy: getEffectiveStat("legitimacy"),
    },
    modifiers: {
      efficiency,
      adminLoad,
    },
  };
}
