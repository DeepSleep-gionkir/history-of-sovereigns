import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb, AuthError, verifyUserFromRequest } from "@/lib/firebaseAdmin";
import { CONTINENT_TEMPLATES } from "@/data/continentTemplates";
import { Continent } from "@/types/db";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { uid } = body as { uid: string };

    if (!uid) {
      return NextResponse.json({ error: "UID Missing" }, { status: 400 });
    }

    // Verify User
    await verifyUserFromRequest(request, uid);

    // Prepare Prompt
    const templateList = CONTINENT_TEMPLATES.map(
      (t, i) => `${i}: ${t.name}`,
    ).join("\n");
    const prompt = `
    당신은 판타지 세계관의 대륙 생성자입니다.
    새로운 대륙을 발견했습니다. 창의적이고 매력적인 설정을 만들어주세요.

    [사용 가능한 지형 템플릿]
    ${templateList}

    [요청 사항]
    1. 대륙의 이름 (한국어 + 영어 병기, 예: "신비의 땅 (Mystic Lands)")
    2. 설명 (2~3문장, 대륙의 분위기, 기후, 특징 묘사)
    3. 위 템플릿 목록 중 가장 어울리는 templateIndex (0~${CONTINENT_TEMPLATES.length - 1}) 정수 값 선택
    4. 대륙의 테마 색상 (Hex Code, 예: "#E7C676")
    5. 대륙의 특징 태그 3개 (예: ["Volcanic", "Magic-Rich", "Dangerous"])

    [출력 형태]
    JSON 포맷만 출력하세요. 마크다운 코드 블록 없이 순수 JSON 문자열만.
    {
      "name": "...",
      "description": "...",
      "templateIndex": 0,
      "themeColor": "#...",
      "tags": ["...", "..."]
    }
    `;

    // Call Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanJson = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let aiData: {
      name: string;
      description: string;
      templateIndex: number;
      themeColor: string;
      tags: string[];
    };
    try {
      aiData = JSON.parse(cleanJson);
    } catch (e: unknown) {
      console.error("JSON Parse Error:", text, e);
      throw new Error("AI 응답 형식이 올바르지 않습니다.");
    }

    // Validate Template Index
    let tIndex = aiData.templateIndex;
    if (
      typeof tIndex !== "number" ||
      tIndex < 0 ||
      tIndex >= CONTINENT_TEMPLATES.length
    ) {
      tIndex = 0; // Fallback
    }
    const template = CONTINENT_TEMPLATES[tIndex];

    const newContinent: Continent = {
      id: `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: aiData.name,
      description: aiData.description,
      vectorPath: template.path,
      themeColor: aiData.themeColor || "#E7C676",
      capacity: {
        max: 15,
        current: 0,
      },
      tags: aiData.tags || [],
      createdAt: new Date().toISOString(),
      isSystem: false,
    };

    await adminDb
      .collection("continents")
      .doc(newContinent.id)
      .set({
        ...newContinent,
        creatorUid: uid,
        createdAt: new Date(), // Firestore Timestamp
      });

    return NextResponse.json({ success: true, continent: newContinent });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Geneartion Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
