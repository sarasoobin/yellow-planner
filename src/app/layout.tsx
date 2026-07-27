import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * iOS 사파리는 글자가 16px보다 작은 입력칸을 누르면 "안 보일 테니 키워주겠다"며
 * 화면을 그쪽으로 확대한다. 노트 글자는 14px, 달력 칸은 11px이라 매번 걸린다.
 *
 * maximumScale 을 1로 두면 이 자동 확대만 멈춘다.
 * 손가락으로 벌려서 키우는 것은 iOS가 접근성 때문에 계속 허용하므로,
 * 글자가 작아 안 보이는 사람이 확대할 길은 그대로 남는다.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  // %s 자리에 각 페이지의 title이 들어간다
  title: {
    default: "正 PLANNER",
    template: "%s",
  },
  description:
    "중요한 일정과 자잘한 할 일을 서로 다른 페이지에 적는 웹 다이어리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
