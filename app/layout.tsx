// Next.js全局布局文件，已集成PomodoroProvider，实现全局唯一番茄钟弹窗和状态管理。
// 该文件是 Next.js 应用的根布局组件，负责定义所有页面的基本 HTML 结构和全局提供者。
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/common/theme-provider"
import DatabaseInitializer from "@/components/common/database-initializer"
import { Toaster } from "@/components/ui/sonner"
import { StagewiseToolbar } from '@stagewise/toolbar-next';
import { PomodoroProvider } from "@/components/pomodoro/pomodoro-context"
import PomodoroModal from "@/components/pomodoro/pomodoro-modal"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FocusPilot",
  description: "A modern productivity application",
    generator: 'v0.dev'
}

const stagewiseConfig = {
  plugins: []
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {process.env.NODE_ENV === 'development' && <StagewiseToolbar config={stagewiseConfig} />}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <DatabaseInitializer />
          <Toaster />
          <PomodoroProvider>
            <PomodoroModal initialTask={null} />
            {children}
          </PomodoroProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
