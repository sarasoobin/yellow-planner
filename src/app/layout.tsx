import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Nanum_Pen_Script } from "next/font/google";
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
 * 손글씨는 제목·로고·연도에만 쓴다 (DESIGN.md §3).
 * 본문까지 손글씨로 하면 할 일을 여러 줄 적었을 때 못 읽는다.
 *
 * display: 'swap' — 폰트를 받는 동안 글자를 감추지 않고 기본 글꼴로 먼저 보여준다.
 * 제목이 잠깐 안 보이는 것보다 모양이 한 번 바뀌는 편이 낫다.
 */
const handwriting = Nanum_Pen_Script({
  // Tailwind 쪽 토큰 이름(--font-hand)과 겹치면 서로를 가리켜 무한 참조가 된다
  variable: "--font-hand-src",
  weight: "400",
  display: "swap",
  /*
   * subsets 를 지정하지 않는다.
   * 이 폰트는 next/font 타입에 'latin' 만 있어서 'korean' 을 넣으면 빌드가 막히고,
   * 'latin' 만 받으면 한글 글자가 통째로 빠진다.
   *
   * 대신 preload 를 끄면 서브셋 없이 전체 CSS를 받아오고, 브라우저는
   * 실제로 쓰는 글자가 든 조각만 내려받는다. 제목 몇 글자뿐이라 가볍다.
   */
  preload: false,
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
  /*
   * 핸드폰 주소창을 표지색으로 물들인다. 노트를 펼친 것처럼 보이게 하는 것이
   * 목적이라 화면 위쪽에 흰 띠가 남으면 안 된다.
   *
   * globals.css 의 --color-frame 과 같은 값이다. CSS 바깥이라 토큰을 못 쓴다.
   * 표지색을 바꾸면 여기와 manifest.ts 도 같이 바꿔야 한다 (DESIGN.md §2).
   */
  themeColor: "#FFF099",
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
      className={`${geistSans.variable} ${geistMono.variable} ${handwriting.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
