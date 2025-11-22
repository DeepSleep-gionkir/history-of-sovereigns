// src/app/api/tile/occupy/route.ts
import { NextResponse } from "next/server";
import {
  adminDb,
  AuthError,
  verifyUserFromRequest,
} from "@/lib/firebaseAdmin";
import { getNeighbors } from "@/utils/hex";

const EXPANSION_COST = 100; // 영토 확장 비용

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, tileId } = body; // tileId format: "row_col" (ex: "5_3")

    if (!uid || !tileId)
      return NextResponse.json({ error: "정보 누락" }, { status: 400 });

    await verifyUserFromRequest(request, uid);

    // 트랜잭션: 동시에 여러 명이 같은 땅을 먹으려 할 때 충돌 방지
    await adminDb.runTransaction(async (transaction) => {
      // 1. 유저 정보 가져오기 (돈 확인)
      const nationRef = adminDb.collection("nations").doc(uid);
      const nationSnap = await transaction.get(nationRef);
      if (!nationSnap.exists) throw new Error("국가 정보가 없습니다.");

      const nationData = nationSnap.data() || {};
      const gold = nationData.resources?.gold ?? 0;
      if (gold < EXPANSION_COST) {
        throw new Error(`국고가 부족합니다. (필요: ${EXPANSION_COST}G)`);
      }

      // 2. 타일 정보 가져오기 (빈 땅인지 확인)
      const tileRef = adminDb.collection("tiles").doc(tileId);
      const tileSnap = await transaction.get(tileRef);
      if (!tileSnap.exists) throw new Error("존재하지 않는 타일입니다.");

      const tileData = tileSnap.data() || {};
      if (tileData.owner) throw new Error("이미 주인이 있는 영토입니다.");

      // 3. 인접성 체크 (서버 검증)
      const existingTerritory = nationData.resources?.territory || 0;
      const neighbors = getNeighbors(tileData.q, tileData.r);
      let hasNeighbor = false;
      for (const neighbor of neighbors) {
        const neighborRef = adminDb
          .collection("tiles")
          .doc(`${neighbor.r}_${neighbor.q}`);
        const neighborSnap = await transaction.get(neighborRef);
        if (neighborSnap.exists && neighborSnap.data()?.owner === uid) {
          hasNeighbor = true;
          break;
        }
      }

      // 첫 땅을 잃은 플레이어는 어디서든 정착 가능, 그 외엔 인접만 허용
      if (!hasNeighbor && existingTerritory > 0) {
        throw new Error("인접한 영토를 통해서만 확장할 수 있습니다.");
      }

      // 4. 실행 (돈 깎기 + 땅 주기 + 통계 업데이트)
      transaction.update(nationRef, {
        "resources.gold": gold - EXPANSION_COST,
        "resources.territory": (existingTerritory || 0) + 1,
        "status.last_action_at": new Date().toISOString(), // 행동력 소모 여부는 기획에 따라 결정 (여기선 소모 안 함)
      });

      transaction.update(tileRef, {
        owner: uid,
        type: "territory", // 일반 영토
      });
    });

    // 5. 로그 남기기 (AI가 알 수 있게)
    await adminDb.collection("nations").doc(uid).collection("logs").add({
      command: "영토 확장 (Territorial Expansion)",
      narrative: `금 ${EXPANSION_COST}을 사용하여 새로운 영토(${tileId})를 개척했습니다.`,
      changes: { "resources.gold": -EXPANSION_COST, "resources.territory": 1 },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Expansion Failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "점령 실패" },
      { status: 500 }
    );
  }
}
