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
  military_doctrine: string;
  diplomatic_posture: string;
  tech_ethics: string;
  resource_strategy: string;
  civic_priority: string;
  capital_symbol: string;
  national_motto: string;
  faction_balance: string;
  external_threat: string;
  alliance_goal: string;
  cultural_identity: string;
  crisis_response: string;
  trade_focus: string;
  intelligence_policy: string;
  migration_policy: string;
  succession_law: string;
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

    const requiredFields: (keyof FoundingAnswers)[] = [
      "name",
      "ruler_title",
      "climate",
      "politics",
      "economy_type",
      "social_atmosphere",
      "origin",
      "weakness",
      "military_doctrine",
      "diplomatic_posture",
      "tech_ethics",
      "resource_strategy",
      "civic_priority",
      "capital_symbol",
      "national_motto",
      "faction_balance",
      "external_threat",
      "alliance_goal",
      "cultural_identity",
      "crisis_response",
      "trade_focus",
      "intelligence_policy",
      "migration_policy",
      "succession_law",
    ];

    const missing = requiredFields.filter(
      (key) => !answers?.[key] || !String(answers?.[key] || "").trim()
    );

    if (!uid || missing.length > 0) {
      return NextResponse.json(
        { error: `필수 정보 누락: ${missing.join(", ")}` },
        { status: 400 }
      );
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
      internal_links?: string[];
      external_links?: string[];
      synergy_effects?: string[];
      doctrines?: Partial<DoctrineBlock>;
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

    const stats = {
      ...fallbackProfile.stats,
      ...sanitizeNumbers(aiResult.stats || {}, 15, 95),
    };
    const resources = {
      ...fallbackProfile.resources,
      ...sanitizeNumbers(aiResult.resources || {}, 0, 99999),
    };
    resources.territory = 1;
    resources.population = resources.population ?? fallbackProfile.resources.population;
    resources.research = resources.research ?? fallbackProfile.resources.research;
    resources.culture_points =
      resources.culture_points ?? fallbackProfile.resources.culture_points;
    resources.intel = resources.intel ?? fallbackProfile.resources.intel;
    resources.logistics_cap =
      resources.logistics_cap ?? fallbackProfile.resources.logistics_cap;
    resources.legitimacy = resources.legitimacy ?? fallbackProfile.resources.legitimacy;

    const internal_links =
      (aiResult.internal_links && aiResult.internal_links.length > 0
        ? aiResult.internal_links
        : fallbackProfile.internal_links) || [];
    const external_links =
      (aiResult.external_links && aiResult.external_links.length > 0
        ? aiResult.external_links
        : fallbackProfile.external_links) || [];
    const synergy_effects =
      (aiResult.synergy_effects && aiResult.synergy_effects.length > 0
        ? aiResult.synergy_effects
        : fallbackProfile.synergy_effects) || [];

    const doctrines: DoctrineBlock = {
      military:
        aiResult.doctrines?.military || fallbackProfile.doctrines.military,
      diplomacy:
        aiResult.doctrines?.diplomacy || fallbackProfile.doctrines.diplomacy,
      technology:
        aiResult.doctrines?.technology || fallbackProfile.doctrines.technology,
      economy:
        aiResult.doctrines?.economy || fallbackProfile.doctrines.economy,
      security:
        aiResult.doctrines?.security || fallbackProfile.doctrines.security,
    };

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
        origin: answers.origin,
        military_doctrine: answers.military_doctrine,
        diplomatic_posture: answers.diplomatic_posture,
        tech_ethics: answers.tech_ethics,
        resource_strategy: answers.resource_strategy,
        civic_priority: answers.civic_priority,
        capital_symbol: answers.capital_symbol,
        national_motto: answers.national_motto,
        faction_balance: answers.faction_balance,
        external_threat: answers.external_threat,
        alliance_goal: answers.alliance_goal,
        cultural_identity: answers.cultural_identity,
        crisis_response: answers.crisis_response,
        trade_focus: answers.trade_focus,
        intelligence_policy: answers.intelligence_policy,
        migration_policy: answers.migration_policy,
        succession_law: answers.succession_law,
      },
      strategic_profile: {
        doctrines,
        internal_links,
        external_links,
        synergy_effects,
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

  [유저 인터뷰 요약]
  - 이름: ${answers.name}
  - 칭호: ${answers.ruler_title}
  - 기후/지형: ${answers.climate}
  - 정치/경제: ${answers.politics} / ${answers.economy_type}
  - 사회 분위기: ${answers.social_atmosphere}
  - 기원: ${answers.origin}
  - 약점: ${answers.weakness}
  - 군사 교리: ${answers.military_doctrine}
  - 외교 태세: ${answers.diplomatic_posture}
  - 기술/마법 윤리: ${answers.tech_ethics}
  - 자원 전략: ${answers.resource_strategy}
  - 무역/교역 특화: ${answers.trade_focus}
  - 내치 우선: ${answers.civic_priority}
  - 첩보 정책: ${answers.intelligence_policy}
  - 이주 정책: ${answers.migration_policy}
  - 승계 법칙: ${answers.succession_law}
  - 수도 상징: ${answers.capital_symbol}
  - 표어: ${answers.national_motto}
  - 내부 파벌: ${answers.faction_balance}
  - 외부 위협: ${answers.external_threat}
  - 동맹 목표: ${answers.alliance_goal}
  - 문화 서사: ${answers.cultural_identity}
  - 위기 대응: ${answers.crisis_response}

  [출력 규칙]
  - 순수 JSON만 출력.
  - stats는 아래 15개 키를 모두 포함: stability, economy, military, happiness, technology, sustainability, influence, diplomacy, intelligence, logistics, culture, cohesion, innovation, security, growth (15~95 권장).
  - resources 키: gold, food, materials, energy, population, research, culture_points, intel, logistics_cap, legitimacy (숫자). territory는 서버에서 넣으니 제외.
  - doctrines: military, diplomacy, technology, economy, security 각 1줄 요약.
  - internal_links / external_links / synergy_effects: 각각 3~6개 한국어 문장형 리스트로, 국가 내부/외부의 유기적 연결과 상호 효과를 구체적으로 기입.
  - tags는 10개 이하 한국어 단어/구문.
  - name/ruler_title는 그대로 사용, 수정 금지. 설명은 description/narrative에 작성.

  [예시]
  {
    "description": "황야에서 시작해 상업으로 성장한 도시국가",
    "flag_color": "#d4af37",
    "stats": { "stability": 52, "economy": 58, "military": 47, "happiness": 55, "technology": 54, "sustainability": 50, "influence": 54, "diplomacy": 62, "intelligence": 50, "logistics": 55, "culture": 57, "cohesion": 53, "innovation": 60, "security": 48, "growth": 58 },
    "resources": { "gold": 140, "food": 130, "materials": 100, "energy": 95, "population": 900, "research": 120, "culture_points": 115, "intel": 98, "logistics_cap": 120, "legitimacy": 110 },
    "doctrines": { "military": "기동대 중심 기습전", "diplomacy": "실용 조약 + 해상 동맹", "technology": "개방 혁신", "economy": "무역+분산 비축", "security": "은밀 첩보망" },
    "internal_links": ["상업 귀족과 개혁파 장교단이 공동 통치", "수도 부유 석영탑이 기술-문화 허브", "위기 시 AI 비상 매뉴얼로 식량 배분"],
    "external_links": ["북방 해적 동맹을 봉쇄하기 위한 해상 조약", "학술 교류 블록을 통한 기술 공유", "사막 교역로와 항만을 묶는 복합 무역망"],
    "synergy_effects": ["온대 기후+무역 경제 → 안정적 성장", "분산 비축+장기 보급 교리 → 장기전에 강함"],
    "tags": ["무역 허브", "개방 사회", "장기 보급전"]
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
  return Array.from(tags).slice(0, 12);
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
  diplomacy: number;
  intelligence: number;
  logistics: number;
  culture: number;
  cohesion: number;
  innovation: number;
  security: number;
  growth: number;
};

type DoctrineBlock = {
  military: string;
  diplomacy: string;
  economy: string;
  technology: string;
  security: string;
};

type ExpandedProfile = {
  stats: StatBlock;
  resources: Record<string, number>;
  tags: string[];
  internal_links: string[];
  external_links: string[];
  synergy_effects: string[];
  doctrines: DoctrineBlock;
};

function buildInitialProfile(form: FoundingAnswers): ExpandedProfile {
  const base: StatBlock = {
    stability: 50,
    economy: 50,
    military: 50,
    happiness: 50,
    technology: 50,
    sustainability: 50,
    influence: 50,
    diplomacy: 50,
    intelligence: 50,
    logistics: 50,
    culture: 50,
    cohesion: 50,
    innovation: 50,
    security: 50,
    growth: 50,
  };

  applyChoiceAdjustments(base, form);
  applyNarrativeAdjustments(base, form);

  const stats = normalizeStats(base);
  const resources = deriveResources(stats);
  const tags = deriveTags(form);
  const networks = deriveNetworks(form);
  const doctrines: DoctrineBlock = {
    military: form.military_doctrine,
    diplomacy: form.diplomatic_posture,
    economy: `${form.economy_type} · ${form.resource_strategy}`,
    technology: form.tech_ethics,
    security: form.intelligence_policy,
  };

  return { stats, resources, tags, ...networks, doctrines };
}

function applyChoiceAdjustments(stats: StatBlock, form: FoundingAnswers) {
  // 기후/지형
  if (form.climate.includes("Desert")) {
    stats.economy += 5;
    stats.sustainability -= 5;
    stats.technology += 5;
    stats.logistics += 4;
  } else if (form.climate.includes("Tundra")) {
    stats.stability += 5;
    stats.military += 5;
    stats.happiness -= 5;
    stats.security += 4;
  } else if (form.climate.includes("Jungle")) {
    stats.happiness += 5;
    stats.sustainability += 5;
    stats.stability -= 5;
    stats.growth += 6;
  } else if (form.climate.includes("Archipelago")) {
    stats.influence += 10;
    stats.economy += 5;
    stats.stability -= 5;
    stats.diplomacy += 5;
  } else if (form.climate.includes("Subterranean")) {
    stats.stability += 10;
    stats.sustainability += 5;
    stats.influence -= 5;
    stats.security += 5;
  }

  // 정치 체제
  if (form.politics.includes("Monarchy")) {
    stats.stability += 10;
    stats.happiness -= 5;
    stats.influence += 5;
    stats.cohesion += 5;
  } else if (form.politics.includes("Democracy")) {
    stats.happiness += 10;
    stats.stability -= 5;
    stats.influence += 5;
    stats.growth += 4;
  } else if (form.politics.includes("Theocracy")) {
    stats.stability += 5;
    stats.happiness += 5;
    stats.technology -= 5;
    stats.influence += 5;
    stats.culture += 5;
  } else if (form.politics.includes("AI Governance")) {
    stats.technology += 15;
    stats.stability -= 5;
    stats.sustainability += 5;
    stats.innovation += 8;
    stats.security -= 3;
  } else if (form.politics.includes("Corporate")) {
    stats.economy += 10;
    stats.influence += 5;
    stats.cohesion -= 5;
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
    stats.diplomacy += 6;
  } else if (form.economy_type.includes("Research")) {
    stats.technology += 10;
    stats.innovation += 8;
    stats.economy -= 2;
  }

  // 군사/외교/기술/자원/무역/내치 추가 선택지
  if (form.military_doctrine.includes("Mobile Offense")) {
    stats.military += 10;
    stats.logistics += 5;
    stats.security -= 3;
  } else if (form.military_doctrine.includes("Fortified Defense")) {
    stats.stability += 8;
    stats.security += 6;
    stats.military -= 2;
  } else if (form.military_doctrine.includes("Naval Supremacy")) {
    stats.influence += 6;
    stats.diplomacy += 4;
    stats.economy += 3;
  } else if (form.military_doctrine.includes("Proxy Warfare")) {
    stats.intelligence += 8;
    stats.diplomacy += 4;
    stats.military -= 3;
  } else if (form.military_doctrine.includes("Long War Logistics")) {
    stats.logistics += 10;
    stats.stability += 3;
    stats.growth += 2;
  }

  if (form.diplomatic_posture.includes("Pragmatic")) {
    stats.diplomacy += 8;
    stats.influence += 5;
  } else if (form.diplomatic_posture.includes("Ideological")) {
    stats.cohesion += 5;
    stats.diplomacy += 4;
    stats.growth -= 3;
  } else if (form.diplomatic_posture.includes("Non-Aligned")) {
    stats.stability += 4;
    stats.diplomacy += 6;
    stats.influence -= 2;
  } else if (form.diplomatic_posture.includes("Tributary")) {
    stats.economy += 6;
    stats.influence += 7;
    stats.diplomacy -= 3;
  } else if (form.diplomatic_posture.includes("Isolation")) {
    stats.security += 5;
    stats.culture += 5;
    stats.diplomacy -= 4;
  }

  if (form.tech_ethics.includes("Open")) {
    stats.technology += 10;
    stats.innovation += 8;
    stats.security -= 4;
  } else if (form.tech_ethics.includes("Militarized")) {
    stats.military += 6;
    stats.technology += 8;
    stats.security += 4;
  } else if (form.tech_ethics.includes("Sacred")) {
    stats.culture += 6;
    stats.technology += 4;
    stats.cohesion += 4;
  } else if (form.tech_ethics.includes("Guild")) {
    stats.economy += 4;
    stats.intelligence += 6;
    stats.innovation -= 2;
  } else if (form.tech_ethics.includes("AI-First")) {
    stats.technology += 12;
    stats.security -= 3;
    stats.cohesion -= 2;
  }

  if (form.resource_strategy.includes("Distributed")) {
    stats.logistics += 8;
    stats.security += 4;
  } else if (form.resource_strategy.includes("Central")) {
    stats.stability += 5;
    stats.security += 6;
    stats.logistics -= 4;
  } else if (form.resource_strategy.includes("Just-In-Time")) {
    stats.economy += 5;
    stats.logistics += 6;
    stats.security -= 4;
  } else if (form.resource_strategy.includes("Speculative")) {
    stats.economy += 8;
    stats.stability -= 5;
    stats.influence += 4;
  }

  if (form.trade_focus.includes("Maritime")) {
    stats.economy += 5;
    stats.influence += 5;
    stats.diplomacy += 4;
  } else if (form.trade_focus.includes("Caravan")) {
    stats.logistics += 5;
    stats.economy += 4;
    stats.security += 2;
  } else if (form.trade_focus.includes("Resource Futures")) {
    stats.economy += 8;
    stats.innovation += 4;
    stats.stability -= 3;
  } else if (form.trade_focus.includes("Cultural")) {
    stats.culture += 8;
    stats.diplomacy += 4;
    stats.economy += 2;
  }

  if (form.civic_priority.includes("Welfare")) {
    stats.happiness += 8;
    stats.cohesion += 6;
    stats.economy -= 2;
  } else if (form.civic_priority.includes("Security")) {
    stats.security += 10;
    stats.stability += 6;
    stats.happiness -= 4;
  } else if (form.civic_priority.includes("Urban")) {
    stats.logistics += 5;
    stats.economy += 6;
    stats.culture += 4;
  } else if (form.civic_priority.includes("Education")) {
    stats.innovation += 10;
    stats.technology += 6;
    stats.economy -= 2;
  } else if (form.civic_priority.includes("Faith")) {
    stats.cohesion += 8;
    stats.culture += 4;
    stats.security += 4;
    stats.innovation -= 3;
  }

  if (form.intelligence_policy.includes("Covert")) {
    stats.intelligence += 10;
    stats.security += 4;
    stats.cohesion -= 2;
  } else if (form.intelligence_policy.includes("Counterintel")) {
    stats.security += 10;
    stats.stability += 4;
    stats.diplomacy -= 3;
  } else if (form.intelligence_policy.includes("Open")) {
    stats.innovation += 4;
    stats.intelligence += 4;
    stats.security -= 2;
  } else if (form.intelligence_policy.includes("Mercenary")) {
    stats.intelligence += 6;
    stats.economy -= 2;
    stats.security -= 1;
  }

  if (form.migration_policy.includes("Selective")) {
    stats.growth += 4;
    stats.cohesion += 4;
    stats.influence += 2;
  } else if (form.migration_policy.includes("Open Doors")) {
    stats.growth += 10;
    stats.culture += 4;
    stats.cohesion -= 5;
  } else if (form.migration_policy.includes("Closed")) {
    stats.security += 6;
    stats.stability += 4;
    stats.growth -= 6;
  } else if (form.migration_policy.includes("Skilled")) {
    stats.innovation += 6;
    stats.growth += 6;
    stats.economy += 3;
    stats.cohesion -= 3;
  }

  if (form.succession_law.includes("Meritocratic")) {
    stats.stability += 6;
    stats.innovation += 4;
  } else if (form.succession_law.includes("Hereditary")) {
    stats.stability += 8;
    stats.cohesion += 4;
    stats.innovation -= 3;
  } else if (form.succession_law.includes("Council")) {
    stats.diplomacy += 4;
    stats.cohesion += 5;
    stats.stability -= 2;
  } else if (form.succession_law.includes("Oracle")) {
    stats.culture += 4;
    stats.security += 4;
    stats.stability -= 1;
  }
}

function applyNarrativeAdjustments(stats: StatBlock, form: FoundingAnswers) {
  const lowerSocial = form.social_atmosphere.toLowerCase();
  const lowerOrigin = form.origin.toLowerCase();
  const lowerWeakness = form.weakness.toLowerCase();
  const lowerFaction = form.faction_balance.toLowerCase();
  const lowerThreat = form.external_threat.toLowerCase();
  const lowerAlliance = form.alliance_goal.toLowerCase();
  const lowerCulture = form.cultural_identity.toLowerCase();
  const lowerCrisis = form.crisis_response.toLowerCase();
  const lowerMotto = form.national_motto.toLowerCase();
  const lowerCapital = form.capital_symbol.toLowerCase();

  if (lowerSocial.includes("엄격") || lowerSocial.includes("권위")) {
    stats.stability += 5;
    stats.happiness -= 5;
    stats.security += 4;
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
    stats.cohesion -= 2;
  }
  if (lowerOrigin.includes("망명") || lowerOrigin.includes("도피")) {
    stats.stability -= 5;
    stats.happiness -= 3;
    stats.influence += 5;
    stats.growth += 3;
  }
  if (lowerWeakness.includes("식량")) {
    stats.sustainability -= 6;
  }
  if (lowerWeakness.includes("해상") || lowerWeakness.includes("바다")) {
    stats.military -= 5;
    stats.influence += 3;
    stats.logistics -= 2;
  }
  if (lowerWeakness.includes("부패") || lowerWeakness.includes("탐욕")) {
    stats.stability -= 8;
    stats.economy += 5;
    stats.security -= 4;
  }

  if (lowerFaction.includes("귀족") || lowerFaction.includes("상업")) {
    stats.economy += 4;
    stats.influence += 4;
    stats.cohesion -= 2;
  }
  if (lowerFaction.includes("군") || lowerFaction.includes("장교")) {
    stats.military += 6;
    stats.security += 3;
  }
  if (lowerFaction.includes("성직") || lowerFaction.includes("신성")) {
    stats.culture += 4;
    stats.cohesion += 3;
  }

  if (lowerThreat.includes("해적") || lowerThreat.includes("침공")) {
    stats.security += 6;
    stats.diplomacy += 3;
  }
  if (lowerThreat.includes("전염") || lowerThreat.includes("기근")) {
    stats.sustainability -= 4;
    stats.growth -= 3;
  }

  if (lowerAlliance.includes("학술") || lowerAlliance.includes("연구")) {
    stats.technology += 4;
    stats.innovation += 4;
    stats.diplomacy += 3;
  }
  if (lowerAlliance.includes("방위") || lowerAlliance.includes("군사")) {
    stats.military += 4;
    stats.security += 3;
  }

  if (lowerCulture.includes("고대") || lowerCulture.includes("계승")) {
    stats.culture += 6;
    stats.stability += 3;
  }
  if (lowerCulture.includes("이주") || lowerCulture.includes("융합")) {
    stats.growth += 6;
    stats.cohesion += 2;
  }

  if (lowerCrisis.includes("계엄") || lowerCrisis.includes("통제")) {
    stats.security += 6;
    stats.happiness -= 4;
  } else if (lowerCrisis.includes("개방") || lowerCrisis.includes("구호")) {
    stats.cohesion += 4;
    stats.happiness += 4;
  }

  if (lowerMotto.includes("자유") || lowerMotto.includes("해방")) {
    stats.happiness += 3;
    stats.influence += 3;
  }
  if (lowerMotto.includes("질서") || lowerMotto.includes("빛")) {
    stats.stability += 3;
    stats.security += 2;
  }

  if (lowerCapital.includes("탑") || lowerCapital.includes("도서관")) {
    stats.technology += 3;
    stats.culture += 2;
  } else if (lowerCapital.includes("항구") || lowerCapital.includes("만")) {
    stats.diplomacy += 3;
    stats.economy += 3;
  }
}

function normalizeStats(stats: StatBlock, targetAverage = 52) {
  const min = 15;
  const max = 95;
  const targetTotal = targetAverage * Object.keys(stats).length;
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
    research: 60 + Math.round((stats.technology + stats.innovation) / 2),
    culture_points: 60 + Math.round((stats.culture + stats.happiness) / 2),
    intel: 50 + Math.round((stats.intelligence + stats.security) / 2),
    logistics_cap: 70 + Math.round((stats.logistics + stats.stability) / 3),
    legitimacy: 60 + Math.round((stats.cohesion + stats.stability + stats.influence) / 3),
    territory: 1,
  };
}

function deriveNetworks(form: FoundingAnswers) {
  const internal_links = [
    `내부 파벌: ${form.faction_balance || "미상"} / 내치 우선: ${form.civic_priority}`,
    `수도/상징: ${form.capital_symbol || "미상"} / 표어: ${form.national_motto || "미상"}`,
    `위기 대응: ${form.crisis_response || "미상"} / 승계: ${form.succession_law}`,
  ].filter((line) => line && line.trim().length > 0);

  const external_links = [
    `외부 위협: ${form.external_threat || "미상"}`,
    `동맹/조약 목표: ${form.alliance_goal || "미상"}`,
    `교역/무역: ${form.trade_focus} / 외교 태세: ${form.diplomatic_posture}`,
  ].filter((line) => line && line.trim().length > 0);

  const synergy_effects = [
    `${form.climate} + ${form.economy_type} → 생산/환경 시너지`,
    `${form.military_doctrine} + ${form.resource_strategy} → 전시 지속 능력`,
    `${form.tech_ethics} + ${form.intelligence_policy} → 연구·첩보 상호작용`,
    `${form.social_atmosphere} + ${form.cultural_identity || "문화 서사"} → 통합/저항 곡선`,
  ].filter((line) => line && line.trim().length > 0);

  return { internal_links, external_links, synergy_effects };
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
  if (form.economy_type.includes("Research")) tags.add("연구 우선");

  const social = form.social_atmosphere.toLowerCase();
  if (social.includes("자유")) tags.add("개방 사회");
  if (social.includes("엄격") || social.includes("규율")) tags.add("철권 통치");
  if (social.includes("과학") || social.includes("기술")) tags.add("과학 열광");
  if (social.includes("문화") || social.includes("예술")) tags.add("문화 강국");

  const weakness = form.weakness.toLowerCase();
  if (weakness.includes("식량")) tags.add("기근 위험");
  if (weakness.includes("해상") || weakness.includes("바다")) tags.add("해상 취약");
  if (weakness.includes("부패")) tags.add("부패 문제");

  if (form.military_doctrine.includes("Naval")) tags.add("제해권 추구");
  if (form.military_doctrine.includes("Fortified")) tags.add("요새 방어전");
  if (form.diplomatic_posture.includes("Non-Aligned")) tags.add("비동맹 균형");
  if (form.diplomatic_posture.includes("Tributary")) tags.add("조공망");
  if (form.tech_ethics.includes("AI")) tags.add("AI 실험국");
  if (form.tech_ethics.includes("Sacred")) tags.add("신성 지식");
  if (form.resource_strategy.includes("Distributed")) tags.add("분산 비축");
  if (form.trade_focus.includes("Cultural")) tags.add("문화 수출");
  if (form.civic_priority.includes("Security")) tags.add("치안 우선");
  if (form.intelligence_policy.includes("Covert")) tags.add("그림자 첩보망");
  if (form.migration_policy.includes("Open")) tags.add("이민 허브");
  if (form.succession_law.includes("Meritocratic")) tags.add("실력주의 승계");
  if (form.cultural_identity) tags.add("독자 문화 서사");

  return Array.from(tags).slice(0, 12);
}
