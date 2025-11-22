import { NextResponse } from "next/server";
import {
  adminDb,
  AuthError,
  verifyUserFromRequest,
} from "@/lib/firebaseAdmin";
import { getNeighbors } from "@/utils/hex";

const ATTACK_COST_ENERGY = 20;
const ATTACK_COST_FOOD = 50;
const LOOT_CAP = 0.3; // 최대 약탈 30%
const SHIELD_MIN_HOURS = 4;
const SHIELD_MAX_HOURS = 8;
const getShieldUntil = () => {
  const hours =
    SHIELD_MIN_HOURS +
    Math.floor(Math.random() * (SHIELD_MAX_HOURS - SHIELD_MIN_HOURS + 1));
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attackerUid, targetTileId } = body;

    if (!attackerUid || !targetTileId)
      return NextResponse.json({ error: "정보 누락" }, { status: 400 });

    await verifyUserFromRequest(request, attackerUid);

    // 결과를 담을 변수들 (트랜잭션 밖에서 접근하기 위해 미리 선언)
    let battleResult: {
      success?: boolean;
      msg?: string;
      loot?: number;
      shieldHours?: number;
    } = {};
    let attackerName = ""; // 공격자 이름 저장용
    let isTargetCapital = false; // 수도인지 여부 저장용
    let defenderUid = "";

    await adminDb.runTransaction(async (transaction) => {
      // 1. 타일 정보 확인
      const tileRef = adminDb.collection("tiles").doc(targetTileId);
      const tileSnap = await transaction.get(tileRef);
      if (!tileSnap.exists) throw new Error("존재하지 않는 영토입니다.");

      const tileData = tileSnap.data() || {};
      defenderUid = tileData.owner;
      isTargetCapital = tileData.type === "capital"; // 변수에 저장

      if (!defenderUid)
        throw new Error("주인이 없는 땅입니다. (공격 대신 '개척'을 하세요)");
      if (defenderUid === attackerUid) throw new Error("자신의 땅을 공격할 수 없습니다.");

      // 인접성 서버 검증: 공격자는 대상 타일 인근에 땅이 하나라도 있어야 함
      const neighbors = getNeighbors(tileData.q, tileData.r);
      const neighborSnaps = await Promise.all(
        neighbors.map((neighbor) =>
          transaction.get(
            adminDb.collection("tiles").doc(`${neighbor.r}_${neighbor.q}`)
          )
        )
      );
      const isAdjacent = neighborSnaps.some(
        (snap) => snap.exists && snap.data()?.owner === attackerUid
      );
      if (!isAdjacent) {
        throw new Error("인접한 영토에서만 침공할 수 있습니다.");
      }

      // 2. 공격자(나) 정보 가져오기
      const attackerRef = adminDb.collection("nations").doc(attackerUid);
      const attackerSnap = await transaction.get(attackerRef);
      if (!attackerSnap.exists) throw new Error("공격자 국가 정보 오류");
      const attackerData = attackerSnap.data() || {};
      const attackerResources = attackerData.resources || {};
      const attackerStats = attackerData.stats || {};
      const attackerEnergy = attackerResources.energy ?? 0;
      const attackerFood = attackerResources.food ?? 0;
      const attackerGold = attackerResources.gold ?? 0;
      const attackerTerritory = attackerResources.territory ?? 0;

      attackerName = attackerData.identity.name; // 변수에 저장

      // 자원 체크
      if (
        attackerEnergy < ATTACK_COST_ENERGY ||
        attackerFood < ATTACK_COST_FOOD
      ) {
        throw new Error("공격에 필요한 보급품(에너지/식량)이 부족합니다.");
      }

      // 3. 방어자(적) 정보 가져오기
      const defenderRef = adminDb.collection("nations").doc(defenderUid);
      const defenderSnap = await transaction.get(defenderRef);
      if (!defenderSnap.exists) throw new Error("방어자 국가 정보 오류");
      const defenderData = defenderSnap.data() || {};
      const defenderResources = defenderData.resources || {};
      const defenderStats = defenderData.stats || {};
      const defenderGold = defenderResources.gold ?? 0;
      const defenderTerritory = defenderResources.territory ?? 0;

      // 보호막 체크
      const shieldUntil = defenderData.status?.shield_until
        ? new Date(defenderData.status.shield_until).getTime()
        : 0;
      if (shieldUntil > Date.now()) {
        throw new Error("상대 국가가 보호막 가동 중입니다. 다른 영토를 노리세요.");
      }

      // 4. 전투력 계산
      const variance = () => 0.95 + Math.random() * 0.1; // ±5%
      const atkPower = attackerStats.military * variance();
      const defBonus = isTargetCapital ? 1.5 : 1.0;
      const defPower = defenderStats.military * variance() * defBonus;

      const isVictory = atkPower > defPower;

      // 5. 결과 처리
      if (isVictory) {
        // [승리]

        // 👑 만약 '수도(Capital)'를 점령했다면? -> 국가 멸망(Permadeath) 트리거 발동!
        if (isTargetCapital) {
          // 1. 패배자 멸망 처리
          transaction.update(defenderRef, {
            "status.is_alive": false, // 생존 플래그 끔
            "status.fallen_at": new Date().toISOString(), // 멸망 시간 기록
            "resources.territory": 0,
            "resources.gold": 0,
          });

          // 2. 패배자의 모든 땅을 승자에게 흡수 (Annexation)
          // 트랜잭션 내에서 쿼리를 못 쓰므로, 이 부분은 정확성을 위해
          // 별도의 비동기 함수로 처리하거나, 여기서는 '수도만 뺏고 나머지는 중립화' 등으로 타협해야 함.
          // 하지만 강력한 기능을 위해 일단 수도 소유권만 넘기고, 나머지는 '주인 잃은 땅'이 되게 두거나
          // 추후 배치 작업으로 처리. (여기서는 일단 수도 타일만 승자에게 넘어감)

          transaction.update(tileRef, {
            owner: attackerUid,
            type: "capital", // 승자의 '제2의 수도(거점)'이 됨
            resource: "gold",
          });

          // 승자 보상 (엄청난 약탈)
          const totalLoot = defenderGold; // 전액 몰수

          transaction.update(attackerRef, {
            "resources.energy": attackerEnergy - ATTACK_COST_ENERGY,
            "resources.food": attackerFood - ATTACK_COST_FOOD,
            "resources.gold": attackerGold + totalLoot,
            "resources.territory": attackerTerritory + 1, // 수도 1칸 추가
            "stats.military": (attackerStats.military || 0) + 5, // 대승리 보너스
            "stats.influence": (attackerStats.influence || 0) + 10, // 위신 상승
          });

          battleResult = {
            success: true,
            msg: `👑 대승리! 적의 수도를 함락시켰습니다! ${defenderData.identity.name}은(는) 역사 속으로 사라졌습니다. (약탈: ${totalLoot}G)`,
            loot: totalLoot,
          };
        } else {
          // [일반 승리] (수도가 아닌 일반 땅 점령)
          transaction.update(tileRef, {
            owner: attackerUid,
            type: "territory",
          });

          const lootGold = Math.floor(
            Math.min(defenderGold * LOOT_CAP, 9999)
          ); // 약탈 상한 적용
          const shieldUntil = getShieldUntil();
          const shieldHours = Math.max(
            1,
            Math.round(
              (new Date(shieldUntil).getTime() - Date.now()) / 1000 / 3600
            )
          );

          transaction.update(attackerRef, {
            "resources.energy": attackerEnergy - ATTACK_COST_ENERGY,
            "resources.food": attackerFood - ATTACK_COST_FOOD,
            "resources.gold": attackerGold + lootGold,
            "resources.territory": attackerTerritory + 1,
            "stats.military": (attackerStats.military || 0) + 1,
          });

          transaction.update(defenderRef, {
            "resources.gold": Math.max(
              0,
              defenderGold - lootGold
            ),
            "resources.territory": Math.max(0, defenderTerritory - 1),
            "stats.stability": (defenderStats.stability || 0) - 5,
            "stats.military": Math.max(0, (defenderStats.military || 0) - 2),
            "status.shield_until": shieldUntil,
          });

          battleResult = {
            success: true,
            msg: `승리! 적의 영토를 점령하고 ${lootGold}G를 약탈했습니다.`,
            loot: lootGold,
            shieldHours,
          };
        }
      } else {
        // [패배] (기존과 동일)
        transaction.update(attackerRef, {
          "resources.energy": attackerEnergy - ATTACK_COST_ENERGY,
          "resources.food": attackerFood - ATTACK_COST_FOOD,
          "stats.military": Math.max(0, (attackerStats.military || 0) - 2),
          "stats.stability": Math.max(0, (attackerStats.stability || 0) - 2),
          "status.shield_until": getShieldUntil(),
        });

        transaction.update(defenderRef, {
          "stats.military": (defenderStats.military || 0) + 1,
        });

        battleResult = {
          success: false,
          msg: "패배... 적의 방어선이 견고하여 퇴각했습니다.",
          loot: 0,
        };
      }
    });

    // --- 트랜잭션 종료 (여기서부터는 DB 락이 풀림) ---

    // 6. 공격자 로그 저장
    await adminDb
      .collection("nations")
      .doc(attackerUid)
      .collection("logs")
      .add({
        command: "전쟁 선포 (Invasion)",
        narrative: battleResult.msg,
        changes: battleResult.success
          ? { "resources.gold": battleResult.loot, "stats.military": 1 }
          : { "stats.military": -2, "stats.stability": -2 },
        created_at: new Date().toISOString(),
      });

    // 7. 글로벌 뉴스 전송
    if (battleResult.success) {
      let newsMsg = `[속보] ${attackerName}군이 ${
        isTargetCapital ? "적의 수도" : "적의 영토"
      }를 점령했습니다!`;

      // 멸망 뉴스일 경우
      if (isTargetCapital) {
        newsMsg = `[비보] ${attackerName}의 침공으로 인해 긴 역사를 자랑하던 한 제국이 멸망했습니다.`;
      }

      await adminDb.collection("news").add({
        type: "war",
        message: newsMsg,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, result: battleResult });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("War Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "전쟁 처리 실패" },
      { status: 500 }
    );
  }
}
