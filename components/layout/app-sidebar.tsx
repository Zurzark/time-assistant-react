"use client"

import { useState, useEffect } from "react"
import { BarChart3, Calendar, CheckSquare, ChevronLeft, ChevronRight, Home, Settings, Brain } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUser } from "@/components/common/user-provider"

export function AppSidebar() {
  const pathname = usePathname()
  const { open, setOpen } = useSidebar()
  const [showExpandButton, setShowExpandButton] = useState(false)
  const { user } = useUser()

  const isActive = (path: string) => {
    return pathname === path
  }

  // 处理鼠标移入左侧边缘时显示展开按钮
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!open && e.clientX < 20) {
        setShowExpandButton(true)
      } else if (showExpandButton && e.clientX > 60) {
        setShowExpandButton(false)
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [open, showExpandButton])

  return (
    <>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="flex h-14 items-center border-b px-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold">智能时间管理</span>
            </div>
            {open && (
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8 ml-2">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/")}>
                <Link href="/">
                  <Home className="h-5 w-5" />
                  <span>仪表盘</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/tasks")}>
                <Link href="/tasks">
                  <CheckSquare className="h-5 w-5" />
                  <span>任务管理</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/planning")}>
                <Link href="/planning">
                  <Calendar className="h-5 w-5" />
                  <span>计划制定</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/analysis")}>
                <Link href="/analysis">
                  <BarChart3 className="h-5 w-5" />
                  <span>回顾分析</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/settings")}>
                <Link href="/settings">
                  <Settings className="h-5 w-5" />
                  <span>设置</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t p-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatar || "/placeholder.svg?height=36&width=36"} alt={user.nickname} />
              <AvatarFallback>{user.nickname?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.nickname}</span>
              <span className="text-xs text-muted-foreground">高级用户</span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* 侧边栏展开按钮 */}
      <div
        className={cn(
          "fixed left-0 top-1/2 z-50 -translate-y-1/2 transition-opacity duration-300",
          open ? "opacity-0 pointer-events-none" : showExpandButton ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 rounded-r-full rounded-l-none shadow-md"
          onClick={() => setOpen(true)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </>
  )
}
