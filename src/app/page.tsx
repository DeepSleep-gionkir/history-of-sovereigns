import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-8">
      <main className="flex flex-col items-center gap-8 text-center max-w-2xl">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          History of Sovereigns
        </h1>
        <p className="text-xl text-gray-400 leading-relaxed">
          당신의 국가를 건국하고, 역사를 써내려가세요.
          <br />
          위대한 지도자가 되어 세계를 정복하거나, 평화로운 유토피아를 건설할 수
          있습니다.
        </p>

        <div className="flex gap-4 mt-8">
          <Link
            href="/create"
            className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all shadow-lg hover:scale-105"
          >
            국가 건국하기
          </Link>
        </div>
      </main>

      <footer className="absolute bottom-8 text-gray-600 text-sm">
        © 2026 History of Sovereigns. All rights reserved.
      </footer>
    </div>
  );
}
