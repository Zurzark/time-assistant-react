"use client"

import Link from "next/link"
import { Bell, Calendar, CheckSquare, Flag, Inbox, Moon, Search, Settings, Sun, Target, BarChart2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

interface MainNavProps {
  currentPath?: string
}

export function MainNav({ currentPath = "/" }: MainNavProps) {
  const { setTheme, resolvedTheme } = useTheme()
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-16 items-center px-4 sm:px-6">
        <div className="flex items-center gap-2 font-bold text-xl mr-6">
          <span className="text-primary">Focus</span>
          <span>Pilot</span>
        </div>

        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 mx-6">
          <Link
            href="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary py-4",
              currentPath === "/" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground",
            )}
          >
            今日
          </Link>
          <Link
            href="/inbox"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary py-4",
              currentPath === "/inbox" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground",
            )}
          >
            收集篮
          </Link>
          <Link
            href="/tasks"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary py-4",
              currentPath === "/tasks" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground",
            )}
          >
            任务
          </Link>
          <Link
            href="/time-log"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary py-4",
              currentPath === "/time-log" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground",
            )}
          >
            时间
          </Link>
          <Link
            href="/goals"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary py-4",
              currentPath === "/goals" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground",
            )}
          >
            目标
          </Link>
          <Link
            href="/projects"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary py-4",
              currentPath === "/projects" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground",
            )}
          >
            项目
          </Link>
          <Link
            href="/calendar"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary py-4",
              currentPath === "/calendar" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground",
            )}
          >
            日历
          </Link>
          <Link
            href="/analytics"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary py-4",
              currentPath === "/analytics" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground",
            )}
          >
            分析
          </Link>
        </nav>

        <div className="hidden md:flex md:flex-1 items-center justify-end">
          <div className="relative mr-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="搜索..." className="w-[200px] pl-8 rounded-full bg-muted" />
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 flex items-center justify-center text-[#38BDF8]" 
                   style={{ opacity: resolvedTheme === 'dark' ? 0 : 1, transform: resolvedTheme === 'dark' ? 'scale(0)' : 'none' }}>
                <Sun className="h-5 w-5" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-[#0EA5E9]"
                   style={{ opacity: resolvedTheme === 'dark' ? 1 : 0, transform: resolvedTheme === 'dark' ? 'none' : 'scale(0)' }}>
                <Moon className="h-5 w-5" />
              </div>
            </div>
          </Button>

          <Button variant="ghost" size="icon" className="mr-2">
            <Bell className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="用户头像" />
                  <AvatarFallback>用户</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">用户名</p>
                  <p className="text-xs leading-none text-muted-foreground">user@example.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/weekly-review" className="flex items-center w-full">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>每周回顾</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/tasks" className="flex items-center w-full">
                  <CheckSquare className="mr-2 h-4 w-4" />
                  <span>任务</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/time-log" className="flex items-center w-full">
                  <Clock className="mr-2 h-4 w-4" />
                  <span>时间</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/goals" className="flex items-center w-full">
                  <Target className="mr-2 h-4 w-4" />
                  <span>目标</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/projects" className="flex items-center w-full">
                  <Flag className="mr-2 h-4 w-4" />
                  <span>项目</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/calendar" className="flex items-center w-full">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>日历</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/analytics" className="flex items-center w-full">
                  <BarChart2 className="mr-2 h-4 w-4" />
                  <span>分析</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/settings" className="flex items-center w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>设置</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>退出登录</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile navigation */}
        <div className="flex md:hidden flex-1 items-center justify-end space-x-2">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 flex items-center justify-center text-[#38BDF8]" 
                   style={{ opacity: resolvedTheme === 'dark' ? 0 : 1, transform: resolvedTheme === 'dark' ? 'scale(0)' : 'none' }}>
                <Sun className="h-5 w-5" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-[#0EA5E9]"
                   style={{ opacity: resolvedTheme === 'dark' ? 1 : 0, transform: resolvedTheme === 'dark' ? 'none' : 'scale(0)' }}>
                <Moon className="h-5 w-5" />
              </div>
            </div>
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="用户头像" />
                  <AvatarFallback>用户</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">用户名</p>
                  <p className="text-xs leading-none text-muted-foreground">user@example.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/" className="flex items-center w-full">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>今日</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/inbox" className="flex items-center w-full">
                  <Inbox className="mr-2 h-4 w-4" />
                  <span>收集篮</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/tasks" className="flex items-center w-full">
                  <CheckSquare className="mr-2 h-4 w-4" />
                  <span>任务</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/time-log" className="flex items-center w-full">
                  <Clock className="mr-2 h-4 w-4" />
                  <span>时间</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/goals" className="flex items-center w-full">
                  <Target className="mr-2 h-4 w-4" />
                  <span>目标</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/projects" className="flex items-center w-full">
                  <Flag className="mr-2 h-4 w-4" />
                  <span>项目</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/calendar" className="flex items-center w-full">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>日历</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/analytics" className="flex items-center w-full">
                  <BarChart2 className="mr-2 h-4 w-4" />
                  <span>分析</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/weekly-review" className="flex items-center w-full">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>每周回顾</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/settings" className="flex items-center w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>设置</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>退出登录</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
