export const HEX_SIZE = 28;

export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;

export function hexToPixel(col: number, row: number) {
  const x = HEX_SIZE * Math.sqrt(3) * (col + 0.5 * (row & 1));
  const y = ((HEX_SIZE * 3) / 2) * row;
  return { x, y };
}

// 아직 안 쓰는 함수는 주석 처리하거나 파라미터 제거
// 지금은 비워두거나 any로 에러만 막아둠
export function pixelToHex(_x: number, _y: number) {
  // 추후 구현
}

export function drawHex(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  strokeColor: string = "#333"
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle_deg = 60 * i + 30;
    const angle_rad = (Math.PI / 180) * angle_deg;
    const px = x + (HEX_SIZE - 0.5) * Math.cos(angle_rad);
    const py = y + (HEX_SIZE - 0.5) * Math.sin(angle_rad);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.stroke();
}

// 4. 이웃 타일 좌표 구하기 (Odd-r 좌표계 기준)
export function getNeighbors(q: number, r: number) {
  const col = q;
  const row = r;

  // 짝수 줄(Even Row)일 때의 이웃 방향
  const evenDirections = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: 0, r: 1 },
    { q: 1, r: 1 },
  ];

  // 홀수 줄(Odd Row)일 때의 이웃 방향
  const oddDirections = [
    { q: 1, r: 0 },
    { q: 0, r: -1 },
    { q: -1, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];

  const directions = row % 2 === 0 ? evenDirections : oddDirections;

  return directions.map((d) => ({ q: col + d.q, r: row + d.r }));
}

// 5. 두 타일이 이웃인지 확인하는 함수
export function isNeighbor(
  t1: { q: number; r: number },
  t2: { q: number; r: number }
) {
  const neighbors = getNeighbors(t1.q, t1.r);
  return neighbors.some((n) => n.q === t2.q && n.r === t2.r);
}
