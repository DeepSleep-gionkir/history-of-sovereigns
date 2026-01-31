import { NationData } from "@/types/db";
import { POLICY_DEFINITIONS, PolicyCategory } from "@/constants/policies";

type StatKey = keyof NationData["stats"];
type ResourceKey = keyof NationData["resources"];

export interface YieldResult {
  resources: Partial<Record<ResourceKey, number>>;
  stats: Partial<Record<StatKey, number>>;
}

/**
 * Calculates the total administrative load.
 * If load > admin_cap, the nation suffers efficiency penalties.
 */
export function calculateAdminLoad(nation: NationData): number {
  const territory = nation.resources.territory || 1;
  const population = nation.resources.population || 100;

  // 1 Territory = 5 Admin Load
  // 100 Population = 1 Admin Load
  return Math.floor(territory * 5 + population * 0.01);
}

/**
 * Aggregates all active policy effects.
 */
export function getPolicyModifiers(nation: NationData) {
  const modifiers: Record<string, number> = {};

  if (!nation.policies) return modifiers;

  for (const [category, optionKey] of Object.entries(nation.policies)) {
    const cat = category as PolicyCategory;
    const def = POLICY_DEFINITIONS[cat];
    if (!def) continue;

    const option = def.options[optionKey];
    if (!option) continue;

    for (const effect of option.effects) {
      modifiers[effect.stat] = (modifiers[effect.stat] || 0) + effect.value;
    }
  }

  return modifiers;
}

/**
 * Calculates hourly yields based on stats, policies, and penalties.
 */
export function calculateYields(nation: NationData): YieldResult {
  const stats = nation.stats;
  const resources = nation.resources;
  const policyMods = getPolicyModifiers(nation);

  // 1. Calculate Admin Efficiency
  const adminLoad = calculateAdminLoad(nation);
  const adminCap = stats.admin_cap || 50;
  let efficiency = 1.0;

  if (adminLoad > adminCap) {
    // Penalty: -1% efficiency per 1% overage, max -50%
    const overage = (adminLoad - adminCap) / adminCap;
    efficiency = Math.max(0.5, 1.0 - overage);
  }

  const getStat = (key: StatKey) => (stats[key] ?? 0) + (policyMods[key] ?? 0);

  // 2. Base Resource Yields (Hourly)
  // Economy -> Gold
  const baseGold = getStat("economy") * 10 * efficiency;

  // Sustain -> Food
  const baseFood = getStat("sustainability") * 10 * efficiency;

  // Tech -> Research (Legacy/New)
  const baseResearch = getStat("technology") * 5 * efficiency;

  // Culture -> Mana/Culture Points
  const baseCulture = getStat("culture") * 2 * efficiency;

  // Intelligence -> Intel
  const baseIntel = getStat("intelligence") * 2 * efficiency;

  // Growth -> Population Growth
  // Pop growth is usually slow. e.g. 1% per day?
  // Let's make it simple: Growth stat / 10 per hour
  const popGrowth = (getStat("growth") / 10) * efficiency;

  // 3. Apply Policy Modifiers to Resources directly
  let goldYield = baseGold;
  if (policyMods["gold_income"]) {
    const goldBonusPercent = policyMods["gold_income"] ?? 0; // e.g. +20 means +20%
    goldYield *= 1 + goldBonusPercent / 100;
  }

  // 4. Consumption / Upkeep
  const militaryUpkeep = getStat("military") * 2; // High military costs gold
  const popFoodConsumption = (resources.population || 0) * 0.1;

  return {
    resources: {
      gold: Math.floor(goldYield - militaryUpkeep),
      food: Math.floor(baseFood - popFoodConsumption),
      mana: Math.floor(baseCulture),
      culture_points: Math.floor(baseCulture),
      intel: Math.floor(baseIntel),
      population: Math.floor(popGrowth),
      research: Math.floor(baseResearch), // Legacy
    },
    stats: {
      stability: 0, // Placeholder
    },
  };
}
