"use client";

import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
import { CONTINENTS, Continent } from "@/constants/continents";
import { generateWithGemini, getSystemPrompt } from "@/services/gemini";
import { Country } from "@/types/country";
// import { db } from '@/services/firebase'; // Will use later for real counting
import Link from "next/link";

export default function CreateCountryPage() {
  // Steps: 0 = API Key (if needed), 1 = Continent, 2 = Details, 3 = Loading/Result

  // Initialize state lazily to include env key check, preventing unnecessary effect cycles for Env vars.
  const [apiKey, setApiKey] = useState<string>(
    () => process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
  );
  const [step, setStep] = useState<number>(() =>
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 1 : 0,
  );

  const [selectedContinent, setSelectedContinent] = useState<Continent | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    leaderName: "",
    description: "",
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [createdCountry, setCreatedCountry] = useState<Country | null>(null);

  // Load API Key from storage only (Client-side override)
  useEffect(() => {
    // Check local storage for BYOK override
    const storedKey = localStorage.getItem("gemini_api_key");

    if (storedKey) {
      // Use setTimeout to avoid "setState synchronously within an effect" lint error
      // This ensures the update happens in the next tick
      const timer = setTimeout(() => {
        setApiKey(storedKey);
        setStep(1);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim().length > 0) {
      localStorage.setItem("gemini_api_key", apiKey);
      setStep(1);
    }
  };

  const handleContinentSelect = (continent: Continent) => {
    // TODO: Check if full (count >= 10) logic here
    setSelectedContinent(continent);
    setStep(2);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContinent) return;

    setIsGenerating(true);
    try {
      const prompt =
        getSystemPrompt(selectedContinent.name, selectedContinent.traits) +
        `\n\nUser Input:\nName: ${formData.name}\nLeader: ${formData.leaderName}\nDescription: ${formData.description}`;

      const jsonResponse = await generateWithGemini({ apiKey, prompt });

      // Basic CLEANUP of markdown code blocks if present
      const cleanJson = jsonResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const aiData = JSON.parse(cleanJson);

      const newCountry: Country = {
        id: Date.now().toString(),
        name: formData.name,
        leaderName: formData.leaderName,
        description: formData.description,
        continentId: selectedContinent.id,
        population: 1000,
        funds: 500000,
        stats: aiData.stats,
        resources: aiData.resources,
        flavorText: aiData.flavorText,
      };

      setCreatedCountry(newCountry);
      setStep(3); // Show result

      // TODO: Save to Firestore
    } catch (error) {
      console.error("Generation failed:", error);
      alert("국가 생성에 실패했습니다. API 키를 확인하거나 다시 시도해주세요.");
      setIsGenerating(false);
    }
  };

  // --- RENDER STEPS ---

  // Step 0: API Key Input
  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
        <form
          onSubmit={handleApiKeySubmit}
          className="max-w-md w-full space-y-4 bg-white/5 p-8 rounded-2xl border border-white/10"
        >
          <h2 className="text-2xl font-bold text-center">API 키 입력</h2>
          <p className="text-gray-400 text-center text-sm">
            GEMINI API 키가 필요합니다. (BYOK)
            <br />
            설정에 저장된 키가 없습니다.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Google Gemini API Key"
            className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition"
          >
            확인
          </button>
        </form>
      </div>
    );
  }

  // Step 3: Result (Success)
  if (step === 3 && createdCountry) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">
              {createdCountry.name} 건국 선포
            </h1>
            <p className="text-xl text-gray-300">
              지도자 {createdCountry.leaderName}의 통치 하에 새로운 역사가
              시작됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h3 className="text-lg font-bold text-gray-400 mb-4">
                기본 정보
              </h3>
              <p>
                <strong>인구:</strong>{" "}
                {createdCountry.population.toLocaleString()}
              </p>
              <p>
                <strong>자금:</strong> {createdCountry.funds.toLocaleString()} G
              </p>
              <p className="mt-4 italic text-gray-400">
                &quot;{createdCountry.flavorText}&quot;
              </p>
            </div>

            {/* Stats (Radar Chart Placeholder or Bars) */}
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h3 className="text-lg font-bold text-gray-400 mb-4">
                국가 지표
              </h3>
              <div className="space-y-3">
                {Object.entries(createdCountry.stats).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{key}</span>
                      <span>{value}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resources */}
          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="text-lg font-bold text-gray-400 mb-4">보유 자원</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {createdCountry.resources.map((res, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border flex flex-col items-center text-center
                            ${
                              res.rarity === "Epic"
                                ? "border-purple-500/50 bg-purple-500/10"
                                : res.rarity === "Rare"
                                  ? "border-blue-500/50 bg-blue-500/10"
                                  : "border-gray-700 bg-gray-800/50"
                            }`}
                >
                  <span className="font-bold">{res.name}</span>
                  <span className="text-sm text-gray-400">
                    {res.quantity}개
                  </span>
                  <span className="text-xs mt-1 px-2 py-0.5 rounded-full bg-black/30 border border-white/10">
                    {res.rarity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Link
              href="/"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              메인으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Continent Selection
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          정착할 대륙을 선택하세요
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {CONTINENTS.map((continent) => (
            <button
              key={continent.id}
              onClick={() => handleContinentSelect(continent)}
              className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${continent.imageColor} p-1 text-left transition-transform hover:scale-105 hover:shadow-2xl`}
            >
              <div className="h-full w-full bg-[#1a1a1a] rounded-xl p-6 relative z-10 hover:bg-opacity-90 transition-all">
                <h3 className="text-xl font-bold mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300">
                  {continent.name}
                </h3>
                <p className="text-xs text-gray-400 mb-4 max-h-20 overflow-hidden">
                  {continent.description}
                </p>
                <div className="space-y-1 mb-4">
                  {continent.traits.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="inline-block text-[10px] px-2 py-1 bg-white/10 rounded mr-1"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="absolute bottom-4 right-4 text-sm font-mono text-gray-500">
                  0 / {continent.maxCountries}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Details Form
  if (step === 2 && selectedContinent) {
    if (isGenerating) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center space-y-8">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">국가를 건설하고 있습니다...</h2>
            <p className="text-gray-400">
              AI가 대륙의 기운을 모아 영토를 빚어내는 중입니다.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
          <button
            onClick={() => setStep(1)}
            className="text-sm text-gray-400 hover:text-white mb-6"
          >
            ← 대륙 다시 선택하기
          </button>
          <h2 className="text-3xl font-bold mb-2">
            {selectedContinent.name}에 건국
          </h2>
          <p className="text-gray-400 mb-8">{selectedContinent.description}</p>

          <form onSubmit={handleCreateSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                국가 이름
              </label>
              <input
                required
                className="w-full bg-black/50 border border-gray-700 rounded px-4 py-3 focus:border-blue-500 outline-none"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="위대한 제국의 이름"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                지도자 이름
              </label>
              <input
                required
                className="w-full bg-black/50 border border-gray-700 rounded px-4 py-3 focus:border-blue-500 outline-none"
                value={formData.leaderName}
                onChange={(e) =>
                  setFormData({ ...formData, leaderName: e.target.value })
                }
                placeholder="통치자의 존함"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                국가 설명 및 이념 (AI 반영)
              </label>
              <textarea
                required
                rows={6}
                maxLength={1000}
                className="w-full bg-black/50 border border-gray-700 rounded px-4 py-3 focus:border-blue-500 outline-none resize-none"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="어떤 국가입니까? 정치 체제, 국민성, 추구하는 가치 등을 1000자 이내로 자유롭게 서술하세요. AI가 이를 바탕으로 국력을 결정합니다."
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {formData.description.length} / 1000
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transform transition hover:scale-[1.02]"
            >
              건국 선포 (AI 생성 시작)
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
