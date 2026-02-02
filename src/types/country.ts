export interface Country {
  id: string;
  name: string;
  leaderName: string;
  description: string;
  continentId: string; // 소속 대륙 ID

  // AI Generated / Game System Stats
  stats: {
    military: number;
    economy: number;
    technology: number;
    stability: number;
    magic: number; // New stat based on setting
  };

  resources: {
    name: string;
    quantity: number;
    rarity: "Common" | "Rare" | "Epic";
  }[];

  flavorText?: string; // AI generated description or history
  population: number;
  funds: number;
}
