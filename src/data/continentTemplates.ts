export interface ContinentTemplate {
  name: string; // e.g., "Pangaea Type", "Archipelago Type"
  path: string; // SVG d attribute
  viewBox: string;
}

export const CONTINENT_TEMPLATES: ContinentTemplate[] = [
  // 0. Pangaea (Massive Single Landmass)
  {
    name: "Massive Landmass",
    path: "M150,150 Q200,50 350,150 T500,250 T350,450 T150,350 T50,250 T150,150",
    viewBox: "0 0 600 600",
  },
  // 1. Gondwana (Wilderness/Jungle shape)
  {
    name: "Wilderness Shape",
    path: "M100,100 Q250,50 400,100 T500,300 T300,500 T100,400 T50,250",
    viewBox: "0 0 600 600",
  },
  // 2. Laurasia (Northern/Cold shape)
  {
    name: "Northern Lands",
    path: "M50,200 Q150,50 300,100 T500,150 T550,350 T350,500 T150,450 T50,300",
    viewBox: "0 0 600 600",
  },
  // 3. Atlantis (Circular/Artificial)
  {
    name: "Circular Island",
    path: "M250,250 m-200,0 a200,200 0 1,0 400,0 a200,200 0 1,0 -400,0",
    viewBox: "0 0 600 600",
  },
  // 4. Mu (Jagged/Broken)
  {
    name: "Jagged Continent",
    path: "M100,100 L300,50 L500,100 L450,300 L500,500 L300,450 L100,500 L50,300 Z",
    viewBox: "0 0 600 600",
  },
  // 5. Archipelago (Scattered Islands - Simulated with multiple paths or disjoint path)
  {
    name: "Archipelago",
    path: "M50,50 Q100,0 150,50 T100,150 T50,50 M200,200 Q250,150 300,200 T250,300 T200,200 M400,100 Q450,50 500,100 T450,200 T400,100",
    viewBox: "0 0 600 600",
  },
  // 6. Ring (Atoll)
  {
    name: "Ring Continent",
    path: "M300,50 A250,250 0 1,1 299,50 L300,100 A200,200 0 1,0 299,100 Z",
    viewBox: "0 0 600 600",
  },
  // 7. Twin Continents (East/West)
  {
    name: "Twin Landmasses",
    path: "M50,100 Q100,50 150,100 T150,400 T50,400 T50,100 M350,100 Q400,50 450,100 T450,400 T350,400 T350,100",
    viewBox: "0 0 600 600",
  },
  // 8. Spiral
  {
    name: "Spiral Peninsula",
    path: "M300,300 m0,-20 a20,20 0 1,1 0,40 a40,40 0 1,0 0,-80 a80,80 0 1,1 0,160 a160,160 0 1,0 0,-320 a250,250 0 1,1 0,500",
    viewBox: "0 0 600 600",
  },
  // 9. Fractal/Coastal
  {
    name: "Fractal Coast",
    path: "M50,50 L150,70 L200,50 L250,100 L350,80 L450,150 L500,300 L480,450 L300,500 L150,480 L50,400 L80,250 Z",
    viewBox: "0 0 600 600",
  },
];
