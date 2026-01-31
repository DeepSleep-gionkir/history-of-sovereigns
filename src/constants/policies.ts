import { PolicyWeb } from "@/types/db";

export type PolicyCategory = keyof PolicyWeb;

export interface PolicyOptionDef {
  label: string;
  description: string;
  effects: {
    stat: string;
    value: number;
    label: string; // "+10 Stability"
  }[];
}

export const POLICY_DEFINITIONS: Record<
  PolicyCategory,
  { label: string; options: Record<string, PolicyOptionDef> }
> = {
  tax: {
    label: "조세 정책 (Taxation)",
    options: {
      low: {
        label: "감세 (Low)",
        description: "민심을 달래고 성장을 촉진합니다.",
        effects: [
          { stat: "stability", value: 10, label: "안정도 +10" },
          { stat: "happiness", value: 10, label: "행복 +10" },
          { stat: "gold_income", value: -20, label: "세수 감소" },
        ],
      },
      standard: {
        label: "표준 (Standard)",
        description: "균형 잡힌 예산 운용입니다.",
        effects: [],
      },
      heavy: {
        label: "중과세 (Heavy)",
        description: "국고를 채우지만 불만이 고조됩니다.",
        effects: [
          { stat: "stability", value: -10, label: "안정도 -10" },
          { stat: "gold_income", value: 20, label: "세수 증가" },
        ],
      },
      plunder: {
        label: "수탈 (Plunder)",
        description: "극한의 징수입니다. 장기적으로 국가를 파괴합니다.",
        effects: [
          { stat: "stability", value: -30, label: "안정도 -30" },
          { stat: "legitimacy", value: -20, label: "정통성 -20" },
          { stat: "gold_income", value: 50, label: "세수 폭증" },
        ],
      },
    },
  },
  conscription: {
    label: "징병 제도 (Conscription)",
    options: {
      none: {
        label: "모병제 (Volunteer)",
        description: "직업 군인 위주입니다. 정예하지만 수가 적습니다.",
        effects: [
          { stat: "military", value: 5, label: "전투력 보너스" },
          { stat: "manpower", value: -20, label: "인력 제한" },
        ],
      },
      volunteer: {
        label: "민병대 (Militia)",
        description: "지역 방위를 위한 최소한의 무장입니다.",
        effects: [{ stat: "admin_cap", value: 5, label: "행정 부담 완화" }],
      },
      conscript: {
        label: "징병제 (Conscript)",
        description: "다수의 시민을 군인으로 전환합니다.",
        effects: [
          { stat: "military", value: 20, label: "군사력 +20" },
          { stat: "happiness", value: -10, label: "행복 -10" },
        ],
      },
      total_war: {
        label: "총동원령 (Total War)",
        description: "국가의 모든 역량을 전쟁에 쏟습니다.",
        effects: [
          { stat: "military", value: 50, label: "군사력 +50" },
          { stat: "economy", value: -30, label: "경제 파탄" },
        ],
      },
    },
  },
  economy: {
    label: "경제 체제 (Economy)",
    options: {
      planned: {
        label: "계획 경제 (Planned)",
        description: "국가가 생산을 통제합니다.",
        effects: [
          { stat: "admin_cap", value: -10, label: "행정 부담 증가" },
          { stat: "stability", value: 5, label: "고용 안정" },
        ],
      },
      mixed: {
        label: "혼합 경제 (Mixed)",
        description: "시장과 국가의 조화입니다.",
        effects: [],
      },
      market: {
        label: "자유 시장 (Market)",
        description: "이윤 추구를 장려합니다.",
        effects: [
          { stat: "economy", value: 20, label: "경제 성장 +20" },
          { stat: "corruption", value: 10, label: "부패 증가" },
        ],
      },
    },
  },
  border: {
    label: "국경 정책 (Border)",
    options: {
      open: {
        label: "개방 (Open)",
        description: "자유로운 이동을 허용합니다.",
        effects: [
          { stat: "culture", value: 10, label: "문화 전파 +10" },
          { stat: "security", value: -10, label: "보안 취약" },
        ],
      },
      regulated: {
        label: "검문 (Regulated)",
        description: "적절한 통제를 실시합니다.",
        effects: [],
      },
      closed: {
        label: "폐쇄 (Closed)",
        description: "외부와의 접촉을 차단합니다.",
        effects: [
          { stat: "security", value: 20, label: "보안 +20" },
          { stat: "diplomacy", value: -20, label: "외교 고립" },
        ],
      },
    },
  },
};
