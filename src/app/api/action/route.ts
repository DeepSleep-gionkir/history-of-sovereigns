import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FieldValue } from "firebase-admin/firestore";
import {
  adminDb,
  AuthError,
  verifyUserFromRequest,
} from "@/lib/firebaseAdmin";

const COOLDOWN_SECONDS = 180;
const MIN_COOLDOWN = 120;
const MAX_COOLDOWN = 240;

export async function POST(request: Request) {
  try {
    // 0. API 키 확인
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error(
        "❌ [Server Error] GEMINI_API_KEY is missing in .env.local"
      );
      return NextResponse.json(
        { error: "서버 API 키 설정 오류" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const body = await request.json();
    const { uid, command, intent } = body;

    if (!uid || !command)
      return NextResponse.json({ error: "정보 누락" }, { status: 400 });
    if (!command.trim())
      return NextResponse.json({ error: "명령이 비어 있습니다" }, { status: 400 });

    // 0-1. 사용자 인증/검증
    await verifyUserFromRequest(request, uid);

    // 1. DB에서 국가 정보 가져오기
    const nationRef = adminDb.collection("nations").doc(uid);
    const nationSnap = await nationRef.get();

    if (!nationSnap.exists()) {
      console.error(`❌ [Server Error] Nation not found for UID: ${uid}`);
      return NextResponse.json({ error: "국가 데이터 없음" }, { status: 404 });
    }

    const nationData = nationSnap.data();
    if (nationData.status?.is_alive === false) {
      return NextResponse.json(
        { error: "이미 멸망한 국가입니다." },
        { status: 400 }
      );
    }

    // 2. 쿨타임 체크
    const now = Date.now();
    const cooldownSeconds =
      nationData.status?.cooldown_seconds || COOLDOWN_SECONDS;
    const lastAction = nationData.status?.last_action_at
      ? new Date(nationData.status.last_action_at).getTime()
      : 0;
    const diffSeconds = (now - lastAction) / 1000;
    const isAdmin = uid === process.env.SUPER_ADMIN_UID;

    if (!isAdmin && diffSeconds < cooldownSeconds) {
      const remaining = Math.ceil(cooldownSeconds - diffSeconds);
      return NextResponse.json({
        success: false,
        error: `아직 명령을 내릴 수 없습니다. (${remaining}초 남음)`,
      });
    }

    // 3. 로그 가져오기
    const logsRef = nationRef.collection("logs");
    const logsQuery = logsRef.orderBy("created_at", "desc").limit(5);
    const logsSnap = await logsQuery.get();

    const historyText = logsSnap.docs
      .map((doc) => {
        const d = doc.data();
        return `- [${new Date(d.created_at).toLocaleTimeString()}] 명령: "${
          d.command
        }" -> 결과: "${d.narrative}"`;
      })
      .reverse()
      .join("\n");

    // 4. AI 호출
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `
      당신은 'HISTORY OF SOVEREIGNS' 서버의 규칙을 따르는 전략 AI입니다.
      모든 계산은 '되돌리기 없음, 한 번에 한 국가' 원칙 아래에서 수행하세요.

      [국가]
      이름: ${nationData.identity.name}
      통치: ${nationData.identity.ruler_title}
      정체성/태그: ${(nationData.tags || []).join(", ") || "없음"}
      지형/기후: ${nationData.attributes?.climate || "미상"}
      정치/경제: ${nationData.attributes?.politics || "미상"} / ${
      nationData.attributes?.economy_type || "미상"
    }
      국가 설명: ${nationData.identity.description || "미상"}

      [현재 수치]
      Stability ${nationData.stats.stability}, Economy ${nationData.stats.economy}, Military ${nationData.stats.military}, Happiness ${nationData.stats.happiness}, Technology ${nationData.stats.technology}, Sustainability ${nationData.stats.sustainability}, Influence ${nationData.stats.influence}
      자원: Gold ${nationData.resources.gold}, Food ${nationData.resources.food}, Materials ${nationData.resources.materials}, Energy ${nationData.resources.energy}

      [최근 역사 5건]
      ${historyText || "기록 없음"}

      [명령]
      "${command}"
      Intent(카테고리): ${intent || "general"}

      [룰]
      - 결과는 확률이 아닌 가중치 기반으로 서술하되 무작위성은 ±5% 이내입니다.
      - 약탈/소모는 국가를 즉시 붕괴시키지 않는 선에서 작성합니다.
      - 변화량은 숫자로만 기입하고, JSON 외 텍스트는 출력하지 않습니다.

      [JSON 응답 예시]
      {
        "narrative": "한글 1~2문장 설명",
        "changes": { "resources.gold": -30, "stats.stability": -2, "stats.happiness": +4 },
        "tags": { "add": ["전쟁 피로"], "remove": ["철권 통치"] },
        "news_headline": "속보: XX 국가가 북부 해안을 확보했다",
        "cooldown_seconds": 170,
        "shield_hours": 0
      }
    `;

    console.log("🤖 AI Request sent...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("🤖 AI Raw Response:", text); // 여기서 AI가 뭐라고 답했는지 터미널에 찍힘

    // 5. JSON 파싱 (안전 장치 추가)
    let resultData: {
      narrative?: string;
      changes?: Record<string, number>;
      tags?: { add?: string[]; remove?: string[] };
      news_headline?: string;
      cooldown_seconds?: number;
      shield_hours?: number;
    };
    try {
      const cleanJson = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      resultData = JSON.parse(cleanJson);
    } catch (e) {
      console.error(
        "❌ [JSON Parse Error] AI output was not valid JSON:",
        text
      );
      return NextResponse.json(
        { error: "AI 응답 처리 실패 (JSON 오류)" },
        { status: 500 }
      );
    }

    // 6. DB 업데이트
    resultData.narrative =
      resultData.narrative || "결과 보고서를 생성하지 못했습니다.";
    const updateData: Record<string, unknown> = {
      "status.last_action_at": new Date().toISOString(),
      "status.cooldown_seconds": Math.min(
        MAX_COOLDOWN,
        Math.max(
          MIN_COOLDOWN,
          resultData.cooldown_seconds || cooldownSeconds || COOLDOWN_SECONDS
        )
      ),
    };

    if (resultData.changes) {
      const allowedPrefixes = ["resources.", "stats.", "status."];
      for (const [key, value] of Object.entries(resultData.changes)) {
        if (
          allowedPrefixes.some((prefix) => key.startsWith(prefix)) &&
          typeof value === "number"
        ) {
          updateData[key] = FieldValue.increment(Number(value));
        }
      }
    }

    if (resultData.tags?.add?.length > 0) {
      updateData["tags"] = FieldValue.arrayUnion(...resultData.tags.add);
    }

    if (resultData.tags?.remove?.length > 0) {
      updateData["tags_remove"] = resultData.tags.remove;
    }

    if (resultData.shield_hours && resultData.shield_hours > 0) {
      updateData["status.shield_until"] = new Date(
        Date.now() + Number(resultData.shield_hours) * 60 * 60 * 1000
      ).toISOString();
    }

    // remove용 별도 처리
    const { tags_remove, ...restUpdates } = updateData;
    if (Object.keys(restUpdates).length > 0) {
      await nationRef.update(restUpdates);
    }

    if (tags_remove?.length > 0) {
      await nationRef.update({
        tags: FieldValue.arrayRemove(...tags_remove),
      });
    }

    await logsRef.add({
      command: command,
      narrative: resultData.narrative,
      changes: resultData.changes || {},
      created_at: new Date().toISOString(),
      intent: intent || "general",
    });

    if (resultData.news_headline) {
      await adminDb.collection("news").add({
        type: "action",
        message: resultData.news_headline,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, result: resultData });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("❌ [Critical Server Error]:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "알 수 없는 서버 오류 발생",
      },
      { status: 500 }
    );
  }
}
