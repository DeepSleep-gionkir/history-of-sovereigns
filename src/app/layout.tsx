import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // 우리가 만든 스타일 파일 불러오기
import NewsTicker from "@/components/NewsTicker"; // 🔥 추가

// 폰트 설정 (기본 폰트 사용)
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HISTORY OF SOVEREIGNS",
  description: "AI Narrative Grand Strategy Game",
  icons: {
    icon: "/favicon.ico", // 파비콘이 있다면 사용
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {/* 
          모바일 퍼스트 디자인을 위해 
          데스크탑에서는 중앙에 정렬되고 최대 너비가 제한되도록 설정 
        */}
        <main
          style={{
            width: "100%",
            maxWidth: "1100px",
            margin: "0 auto",
            minHeight: "100vh",
            position: "relative",
          }}
        >
          {/* 🔥 여기에 뉴스 티커 추가 */}
          <NewsTicker />
          {children}
        </main>
      </body>
    </html>
  );
}
