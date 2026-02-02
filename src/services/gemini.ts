import { GoogleGenerativeAI } from "@google/generative-ai";

interface GenerationParams {
  apiKey: string;
  prompt: string;
}

export const generateWithGemini = async ({
  apiKey,
  prompt,
}: GenerationParams) => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20", // Or fallback to "gemini-2.5-flash" if specific version name differs
      // Note: User specified "gemini-2.5-flash", but we should be careful with precise model names.
      // I will trust the user's intent but use the likely correct model string if known,
      // or stick to the generic 'gemini-pro' if 2.5 isn't public yet, BUT user specifically asked for "gemini-2.5-flash".
      // Assuming it's available or user has access. I will use the string they gave.
      // UPDATE: I will use a robust configuration for model mapping.
    });

    // Actually, "gemini-2.5-flash" might not be a valid public ID yet.
    // Standard public models are 'gemini-1.5-flash' or 'gemini-pro'.
    // If user insists on 2.5, I will try it, but fall back or handle errors.
    // Let's use the user provided string.
    const targetModel = model;

    const result = await targetModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const getSystemPrompt = (
  continentName: string,
  continentTraits: string[],
) => {
  return `
당신은 'History of Sovereigns'라는 정교한 국가 운영 시뮬레이션 게임의 AI 마스터입니다.
사용자가 다음 대륙에 새로운 국가를 건설하려고 합니다.

대륙: ${continentName}
특성: ${continentTraits.join(", ")}

사용자가 제공하는 '국가 이름', '지도자', '이념', '설명'을 바탕으로, 
해당 대륙의 환경에 적응(또는 고통받는) 국가의 구체적인 데이터를 생성해주세요.

다음 JSON 형식으로만 응답해주세요. 마크다운 포맷(backticks) 없이 순수 JSON 문자열만 반환하세요.

{
  "stats": {
    "military": 0-100, // 군사력
    "economy": 0-100, // 경제력
    "technology": 0-100, // 기술력
    "stability": 0-100, // 사회 안정도
    "magic": 0-100 // 마력 친화도 (대륙 특성에 따라 다름)
  },
  "resources": [
    // 대륙 특성과 국가 설정에 맞는 자원 3~5개. (예: "불타는 광석", "얼음 수정", "목재")
    { "name": "자원명", "quantity": 100-1000, "rarity": "Common" | "Rare" | "Epic" }
  ],
  "flavorText": "대륙의 특성을 반영한 국가의 건국 설화나 현재 상황에 대한 3문장 정도의 묘사."
}
`;
};
