import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb, AuthError, verifyUserFromRequest } from "@/lib/firebaseAdmin";

type FoundingAnswers = {
  name: string;
  ruler_title: string;
  climate: string;
  politics: string;
  economy_type: string;
  social_atmosphere: string;
  origin: string;
  weakness: string;
};

const MAP_SIZE = 20; // 20x20 기본 맵
const DEFAULT_COOLDOWN = 180;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { uid, answers } = body as { uid?: string; answers?: FoundingAnswers };

    if (!uid || !answers?.name || !answers.ruler_title) {
      return NextResponse.json({ error: "필수 정보 누락" }, { status: 400 });
    }

    await verifyUserFromRequest(request, uid);

    const nationRef = adminDb.collection("nations").doc(uid);
    const existing = await nationRef.get();
    if (existing.exists) {
      return NextResponse.json(
        { error: "이미 국가가 존재합니다. (1인 1국가 규칙)" },
        { status: 400 }
      );
    }

    const fallbackProfile = buildInitialProfile(answers);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = buildPrompt(answers, fallbackProfile);

    type AiResult = {
      description?: string;
      flag_color?: string;
      stats?: Record<string, number>;
      resources?: Record<string, number>;
      tags?: string[] | { add?: string[]; remove?: string[] };
      narrative?: string;
    };

    let aiResult: AiResult = {};
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      aiResult = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Create AI 응답 파싱 실패, 폴백을 사용합니다.", e);
    }

    const stats = sanitizeNumbers(
      aiResult.stats || fallbackProfile.stats,
      15,
      95
    );
    const resources = sanitizeNumbers(
      aiResult.resources || fallbackProfile.resources,
      0,
      99999
    );
    resources.territory = 1;
    resources.population = resources.population || fallbackProfile.resources.population;

    const shieldHours = 4 + Math.round(Math.random() * 4);
    const creationTime = new Date().toISOString();
    const nationData = {
      uid,
      identity: {
        name: answers.name.trim(),
        ruler_title: answers.ruler_title.trim(),
        description:
          aiResult.description ||
          answers.origin ||
          "미상의 기원을 가진 새 왕조",
        flag_color: aiResult.flag_color || "#d4af37",
      },
      stats,
      resources,
      attributes: {
        climate: answers.climate,
        politics: answers.politics,
        economy_type: answers.economy_type,
        social_atmosphere: answers.social_atmosphere,
        weakness: answers.weakness,
      },
      status: {
        last_action_at: new Date(
          Date.now() - DEFAULT_COOLDOWN * 1000
        ).toISOString(),
        cooldown_seconds: DEFAULT_COOLDOWN,
        is_online: true,
        is_poverty: false,
        is_alive: true,
        shield_until: new Date(
          Date.now() + shieldHours * 60 * 60 * 1000
        ).toISOString(),
      },
      tags: mergeTags(fallbackProfile.tags, aiResult.tags),
      created_at: creationTime,
    };

    await nationRef.set(nationData);
    const capitalResult = await assignCapitalTile(uid);

    await nationRef.collection("logs").add({
      command: "국가 건국 (Founding)",
      narrative:
        aiResult.narrative ||
        "새로운 주권 국가가 탄생했습니다. AI가 초기 프로필을 설정했습니다.",
      created_at: creationTime,
    });

    return NextResponse.json({
      success: true,
      nation: nationData,
      capital: capitalResult,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Create API 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "국가 생성 실패" },
      { status: 500 }
    );
  }
}

function buildPrompt(answers: FoundingAnswers, fallback: unknown) {
  return `
  당신은 'HISTORY OF SOVEREIGNS' 서버의 생성 AI입니다.
  유저가 직접 입력한 국가명은 절대 변경하지 마세요.

  [유저 인터뷰 답변]
  - 이름: ${answers.name}
  - 칭호: ${answers.ruler_title}
  - 기후: ${answers.climate}
  - 정치: ${answers.politics}
  - 경제: ${answers.economy_type}
  - 사회 분위기: ${answers.social_atmosphere}
  - 기원: ${answers.origin}
  - 약점: ${answers.weakness}

  [출력 규칙]
  - 순수 JSON만 출력.
  - stats와 resources는 숫자, tags는 8개 이하 한국어 단어 목록.
  - name은 절대 수정 금지, ruler_title은 유저 입력을 신뢰하되 보조 설명은 description에 작성.
  - stats 범위: 15~95 사이 권장, 총합 약 350 내외.
  - resources에 territory는 넣지 마세요(서버에서 1칸 지정).

  [예시]
  {
    "description": "황야에서 시작해 상업으로 성장한 도시국가",
    "flag_color": "#d4af37",
    "stats": { "stability": 52, "economy": 58, "military": 47, "happiness": 55, "technology": 54, "sustainability": 50, "influence": 54 },
    "resources": { "gold": 140, "food": 130, "materials": 100, "energy": 95, "population": 900 },
    "tags": ["상업 중심", "개방 사회"]
  }

  [기본 프로필(참고용)]
  ${JSON.stringify(fallback, null, 2)}
  `;
}

function sanitizeNumbers(obj: unknown, min: number, max: number) {
  const result: Record<string, number> = {};
  if (typeof obj === "object" && obj) {
    for (const [key, val] of Object.entries(obj)) {
      const num = Number(val);
      if (Number.isNaN(num)) continue;
      result[key] = Math.min(max, Math.max(min, Math.round(num)));
    }
  }
  return result;
}

function mergeTags(base: string[], aiTags: unknown) {
  const tags = new Set<string>(base || []);
  if (Array.isArray(aiTags)) {
    aiTags.forEach((t) => {
      if (typeof t === "string") tags.add(t);
    });
  }
  if (
    typeof aiTags === "object" &&
    aiTags &&
    "add" in aiTags &&
    Array.isArray((aiTags as { add: unknown }).add)
  ) {
    (aiTags as { add: unknown[] }).add.forEach((t) => {
      if (typeof t === "string") tags.add(t);
    });
  }
  return Array.from(tags).slice(0, 8);
}

async function assignCapitalTile(uid: string) {
  // 여유 자리가 없을 수도 있으니 최대 30회 시도
  for (let i = 0; i < 30; i++) {
    const q = Math.floor(Math.random() * MAP_SIZE);
    const r = Math.floor(Math.random() * MAP_SIZE);
    const tileId = `${r}_${q}`;
    const tileRef = adminDb.collection("tiles").doc(tileId);

    const res = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(tileRef);
      const data = snap.data();

      if ((!snap.exists || !data?.owner) && data?.type !== "ocean") {
        tx.set(
          tileRef,
          snap.exists
            ? { ...data, owner: uid, type: "capital", resource: "gold" }
            : { q, r, owner: uid, type: "capital", resource: "gold" }
        );
        return { tileId, q, r };
      }
      return null;
    });

    if (res) return res;
  }
  throw new Error("빈 땅을 찾지 못했습니다. 관리자에게 문의하세요.");
}

type StatBlock = {
  stability: number;
  economy: number;
  military: number;
  happiness: number;
  technology: number;
  sustainability: number;
  influence: number;
};

function buildInitialProfile(form: FoundingAnswers) {
  const base: StatBlock = {
    stability: 50,
    economy: 50,
    military: 50,
    happiness: 50,
    technology: 50,
    sustainability: 50,
    influence: 50,
  };

  applyChoiceAdjustments(base, form);
  applyNarrativeAdjustments(base, form);

  const stats = normalizeStats(base);
  const resources = deriveResources(stats);
  const tags = deriveTags(form);

  return { stats, resources, tags };
}

function applyChoiceAdjustments(stats: StatBlock, form: FoundingAnswers) {
  // 기후/지형
  if (form.climate.includes("Desert")) {
    stats.economy += 5;
    stats.sustainability -= 5;
    stats.technology += 5;
  } else if (form.climate.includes("Tundra")) {
    stats.stability += 5;
    stats.military += 5;
    stats.happiness -= 5;
  } else if (form.climate.includes("Jungle")) {
    stats.happiness += 5;
    stats.sustainability += 5;
    stats.stability -= 5;
  } else if (form.climate.includes("Archipelago")) {
    stats.influence += 10;
    stats.economy += 5;
    stats.stability -= 5;
  } else if (form.climate.includes("Subterranean")) {
    stats.stability += 10;
    stats.sustainability += 5;
    stats.influence -= 5;
  }

  // 정치 체제
  if (form.politics.includes("Monarchy")) {
    stats.stability += 10;
    stats.happiness -= 5;
    stats.influence += 5;
  } else if (form.politics.includes("Democracy")) {
    stats.happiness += 10;
    stats.stability -= 5;
    stats.influence += 5;
  } else if (form.politics.includes("Theocracy")) {
    stats.stability += 5;
    stats.happiness += 5;
    stats.technology -= 5;
    stats.influence += 5;
  } else if (form.politics.includes("AI Governance")) {
    stats.technology += 15;
    stats.stability -= 5;
    stats.sustainability += 5;
  }

  // 경제 중점
  if (form.economy_type.includes("Agriculture")) {
    stats.sustainability += 5;
    stats.happiness += 5;
    stats.economy += 5;
  } else if (form.economy_type.includes("Industry")) {
    stats.economy += 10;
    stats.technology += 5;
    stats.sustainability -= 10;
  } else if (form.economy_type.includes("Military")) {
    stats.military += 15;
    stats.stability -= 5;
    stats.happiness -= 5;
  } else if (form.economy_type.includes("Trade")) {
    stats.economy += 10;
    stats.influence += 10;
    stats.stability -= 5;
  }
}

function applyNarrativeAdjustments(stats: StatBlock, form: FoundingAnswers) {
  const lowerSocial = form.social_atmosphere.toLowerCase();
  const lowerOrigin = form.origin.toLowerCase();
  const lowerWeakness = form.weakness.toLowerCase();

  if (lowerSocial.includes("엄격") || lowerSocial.includes("권위")) {
    stats.stability += 5;
    stats.happiness -= 5;
  }
  if (lowerSocial.includes("자유") || lowerSocial.includes("낭만")) {
    stats.happiness += 8;
    stats.stability -= 5;
  }
  if (lowerSocial.includes("과학") || lowerSocial.includes("기술")) {
    stats.technology += 5;
  }
  if (lowerSocial.includes("환경") || lowerSocial.includes("생태")) {
    stats.sustainability += 5;
  }
  if (lowerOrigin.includes("혁명") || lowerOrigin.includes("반란")) {
    stats.influence += 8;
    stats.stability -= 5;
  }
  if (lowerOrigin.includes("망명") || lowerOrigin.includes("도피")) {
    stats.stability -= 5;
    stats.happiness -= 3;
    stats.influence += 5;
  }
  if (lowerWeakness.includes("식량")) {
    stats.sustainability -= 6;
  }
  if (lowerWeakness.includes("해상") || lowerWeakness.includes("바다")) {
    stats.military -= 5;
    stats.influence += 3;
  }
  if (lowerWeakness.includes("부패") || lowerWeakness.includes("탐욕")) {
    stats.stability -= 8;
    stats.economy += 5;
  }
}

function normalizeStats(stats: StatBlock, targetTotal = 350) {
  const min = 15;
  const max = 95;
  const total = Object.values(stats).reduce((acc, val) => acc + val, 0);
  const ratio = targetTotal / total;

  const scaledEntries = Object.entries(stats).map(([key, val]) => {
    const scaled = Math.round(val * ratio);
    return [key, Math.min(max, Math.max(min, scaled))];
  });

  return Object.fromEntries(scaledEntries) as StatBlock;
}

function deriveResources(stats: StatBlock) {
  return {
    gold: 120 + Math.round(stats.economy / 2),
    food: 120 + Math.round((stats.sustainability + stats.happiness) / 3),
    materials: 80 + Math.round((stats.technology + stats.economy) / 4),
    energy: 80 + Math.round((stats.technology + stats.sustainability) / 4),
    population: 800 + stats.happiness * 8,
    territory: 1,
  };
}

function deriveTags(form: FoundingAnswers) {
  const tags = new Set<string>();

  if (form.climate.includes("Desert")) tags.add("사막 국가");
  if (form.climate.includes("Tundra")) tags.add("설원 방어선");
  if (form.climate.includes("Jungle")) tags.add("정글 개척민");
  if (form.climate.includes("Archipelago")) tags.add("해양 무역");
  if (form.climate.includes("Subterranean")) tags.add("지하 문명");

  if (form.politics.includes("AI")) tags.add("AI 의회");
  if (form.politics.includes("Theocracy")) tags.add("신정 국가");
  if (form.politics.includes("Democracy")) tags.add("대의제");
  if (form.economy_type.includes("Trade")) tags.add("무역 허브");
  if (form.economy_type.includes("Military")) tags.add("군사 중점");

  const social = form.social_atmosphere.toLowerCase();
  if (social.includes("자유")) tags.add("개방 사회");
  if (social.includes("엄격") || social.includes("규율")) tags.add("철권 통치");
  if (social.includes("과학") || social.includes("기술")) tags.add("과학 열광");
  if (social.includes("문화") || social.includes("예술")) tags.add("문화 강국");

  const weakness = form.weakness.toLowerCase();
  if (weakness.includes("식량")) tags.add("기근 위험");
  if (weakness.includes("해상") || weakness.includes("바다")) tags.add("해상 취약");
  if (weakness.includes("부패")) tags.add("부패 문제");

  return Array.from(tags).slice(0, 6);
}
