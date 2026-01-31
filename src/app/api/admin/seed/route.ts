import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Continent, DbDate } from "@/types/db";

// Simple SVG paths (abstract blobs)
const SVGS = [
  // 1. Pangaea-like
  "M150,150 Q200,50 350,150 T500,250 T350,450 T150,350 T50,250 T150,150",
  // 2. Gondwana-like
  "M100,100 Q250,50 400,100 T500,300 T300,500 T100,400 T50,250",
  // 3. Laurasia-like
  "M50,200 Q150,50 300,100 T500,150 T550,350 T350,500 T150,450 T50,300",
  // 4. Atlantis-like (Circular)
  "M250,250 m-200,0 a200,200 0 1,0 400,0 a200,200 0 1,0 -400,0",
  // 5. Mu-like (Jagged)
  "M100,100 L300,50 L500,100 L450,300 L500,500 L300,450 L100,500 L50,300 Z",
];

const DEFAULT_CONTINENTS = [
  {
    name: "판게아 (Pangaea)",
    description:
      "가장 거대하고 오래된 태초의 대륙. 풍부한 자원과 넓은 영토를 자랑합니다.",
    svgIndex: 0,
  },
  {
    name: "곤드와나 (Gondwana)",
    description:
      "남반구의 거친 정글과 사막이 혼재된 야생의 땅. 강인한 지도자만이 살아남습니다.",
    svgIndex: 1,
  },
  {
    name: "로라시아 (Laurasia)",
    description:
      "북반구의 한랭 대륙으로, 고대의 마법 유적이 많이 발견되는 신비로운 곳입니다.",
    svgIndex: 2,
  },
  {
    name: "아틀란티스 (Atlantis)",
    description:
      "바다 한가운데 떠 있는 해양 문명의 중심지. 무역과 외교에 유리합니다.",
    svgIndex: 3,
  },
  {
    name: "무 (Mu)",
    description:
      "동쪽 끝에 위치한 해가 뜨는 대륙. 독자적인 문화와 기술이 발달했습니다.",
    svgIndex: 4,
  },
];

export async function POST() {
  try {
    const promises = DEFAULT_CONTINENTS.map(async (info, idx) => {
      const id = `default_${idx + 1}`;
      const continent: Continent = {
        id,
        name: info.name,
        description: info.description,
        imagePath: SVGS[info.svgIndex],
        maxNations: 20,
        currentNations: 0, // Should be updated based on real count if needed, but 0 for seed
        createdAt: serverTimestamp() as unknown as DbDate,
        isSystem: true,
      };

      await setDoc(doc(db, "continents", id), continent, { merge: true });
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true, message: "Continents seeded" });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
