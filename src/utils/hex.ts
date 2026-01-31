export interface HexCoord {
  q: number;
  r: number;
}

export const DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function getNeighbors(q: number, r: number): HexCoord[] {
  return DIRECTIONS.map((d) => ({
    q: q + d.q,
    r: r + d.r,
  }));
}

export function hexToCss(q: number, r: number, size: number) {
  // Flat-topped hex conversion
  // x = size * (3/2 * q)
  // y = size * (sqrt(3)/2 * q + sqrt(3) * r)
  const x = size * ((3 / 2) * q);
  const y = size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
  return { x, y };
}
