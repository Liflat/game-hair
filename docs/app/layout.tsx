import React from "react"
import type { Metadata, Viewport } from "next"
import { Zen_Maru_Gothic, Dela_Gothic_One } from "next/font/google"

import "./globals.css"

const zenMaruGothic = Zen_Maru_Gothic({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
})

const delaGothicOne = Dela_Gothic_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
})

export const metadata: Metadata = {
  title: "毛根伝説 | 抜いて育てて絡めて戦え",
  description: "脱毛コインで毛根を引き抜き、育毛して対戦する新感覚ガチャゲーム。51種類の毛根をコレクションしよう！伝説のコズミックレア「ゼウスの毛根」を手に入れろ！",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#1C1410",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={`${zenMaruGothic.variable} ${delaGothicOne.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
