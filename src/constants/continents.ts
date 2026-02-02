export interface Continent {
  id: string;
  name: string;
  description: string;
  traits: string[];
  maxCountries: number;
  imageColor: string; // Placeholder for UI color
}

export const CONTINENTS: Continent[] = [
  {
    id: "aethelgard",
    name: "에텔가르드 (Aethelgard)",
    description:
      "만년설로 뒤덮인 북쪽의 거대한 산맥과 얼어붙은 툰드라 지대입니다. 혹독한 환경이지만, 고대 드래곤의 뼈가 묻혀 있어 마력이 풍부합니다.",
    traits: ["한랭 기후", "풍부한 마력석", "거친 지형", "몬스터 출몰 빈번"],
    maxCountries: 10,
    imageColor: "from-blue-200 to-slate-400",
  },
  {
    id: "pyroclast",
    name: "파이로클라스 (Pyroclast)",
    description:
      "활화산이 끊임없이 분화하는 불의 대륙입니다. 비옥한 화산재 덕분에 특수 작물이 자라지만, 언제나 재해의 위험이 도사리고 있습니다.",
    traits: ["화산 지대", "지열 에너지", "특수 광물", "자연 재해"],
    maxCountries: 10,
    imageColor: "from-red-500 to-orange-600",
  },
  {
    id: "verdantia",
    name: "베르단티아 (Verdantia)",
    description:
      "끝없이 펼쳐진 거대한 숲과 정글입니다. 생명력이 넘치지만, 숲의 정령들이 외부인을 경계합니다.",
    traits: ["울창한 숲", "약초 풍부", "독성 식물", "정령의 가호"],
    maxCountries: 10,
    imageColor: "from-green-400 to-emerald-700",
  },
  {
    id: "aurora_isles",
    name: "오로라 제도 (Aurora Isles)",
    description:
      "하늘에 떠 있는 부유섬들로 이루어진 신비로운 곳입니다. 비공정 기술이 없으면 이동이 불가능합니다.",
    traits: ["부유 대륙", "희박한 공기", "천공 자원", "비행 유닛 필수"],
    maxCountries: 10,
    imageColor: "from-sky-300 to-indigo-300",
  },
  {
    id: "silicara",
    name: "실리카라 (Silicara)",
    description:
      "금속과 수정으로 이루어진 황무지입니다. 식량은 부족하지만, 최고급 기술 자원이 널려 있습니다.",
    traits: ["수정 사막", "식량 부족", "고대 유적", "기술 발전 유리"],
    maxCountries: 10,
    imageColor: "from-yellow-200 to-amber-600",
  },
  {
    id: "abyssal_rim",
    name: "심연의 가장자리 (Abyssal Rim)",
    description:
      "거대한 해광과 어두운 바다로 둘러싸인 해안 대륙입니다. 심해의 괴수들과 해상 무역이 공존합니다.",
    traits: ["해양 문명", "심해 자원", "해일", "무역 중심지"],
    maxCountries: 10,
    imageColor: "from-blue-700 to-indigo-900",
  },
  {
    id: "zephyr_plains",
    name: "제피르 평원 (Zephyr Plains)",
    description:
      "강한 바람이 끊이지 않는 대평원입니다. 유목민들의 고향이며 기병 육성에 최적화되어 있습니다.",
    traits: ["끝없는 평원", "강풍", "목축업 유리", "빠른 이동"],
    maxCountries: 10,
    imageColor: "from-lime-300 to-green-500",
  },
  {
    id: "shadow_fen",
    name: "그림자 늪 (Shadow Fen)",
    description:
      "항상 안개가 자욱한 습지대입니다. 흑마법과 비밀스러운 연구를 하기에 적합한 은밀한 땅입니다.",
    traits: ["습지", "독기", "은신 용이", "질병 위험"],
    maxCountries: 10,
    imageColor: "from-purple-600 to-slate-800",
  },
];
