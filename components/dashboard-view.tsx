"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Play, Pause, Check, Plus, Clock, CheckCircle2, AlertCircle, Lightbulb } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function DashboardView() {
  const [timerActive, setTimerActive] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(25)
  const [timerSeconds, setTimerSeconds] = useState(0)

  const toggleTimer = () => {
    setTimerActive(!timerActive)
  }

  return (
    <div className="flex flex-col p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">今日仪表盘</h1>
          <p className="text-muted-foreground">2025年5月17日，星期六</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          <span>新建任务</span>
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                今日重点任务
              </CardTitle>
              <CardDescription>需要优先完成的关键任务</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-3 bg-muted/50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">完成产品设计方案</h3>
                    <p className="text-sm text-muted-foreground mt-1">为新版应用完成用户界面设计和交互流程</p>
                  </div>
                  <Badge variant="destructive" className="ml-2">
                    优先级高
                  </Badge>
                </div>
                <div className="mt-3 flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-4 w-4" />
                  <span>预计用时: 2小时</span>
                  <Separator orientation="vertical" className="mx-2 h-4" />
                  <span>截止时间: 今天 18:00</span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>完成进度</span>
                    <span>60%</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>今日时间轴</CardTitle>
              <CardDescription>已规划的任务时间段</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  time: "09:00 - 10:30",
                  title: "产品设计方案",
                  completed: true,
                  category: "工作",
                  color: "bg-blue-500",
                },
                {
                  time: "11:00 - 12:00",
                  title: "团队周会",
                  completed: false,
                  category: "会议",
                  color: "bg-purple-500",
                },
                {
                  time: "13:30 - 15:00",
                  title: "编写项目文档",
                  completed: false,
                  category: "工作",
                  color: "bg-blue-500",
                },
                {
                  time: "15:30 - 16:30",
                  title: "学习React新特性",
                  completed: false,
                  category: "学习",
                  color: "bg-green-500",
                },
                { time: "17:00 - 18:00", title: "健身", completed: false, category: "个人", color: "bg-orange-500" },
              ].map((task, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center",
                        task.completed ? "bg-primary" : "border-2 border-muted",
                      )}
                    >
                      {task.completed && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    {index < 4 && <div className="w-px h-full bg-border flex-1 my-1" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{task.time}</span>
                      <Badge variant="outline" className={cn("text-xs", task.completed && "bg-primary/10")}>
                        {task.completed ? "已完成" : "待完成"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full", task.color)} />
                      <span className="font-medium">{task.title}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{task.category}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>番茄钟</CardTitle>
              <CardDescription>专注时间管理</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="relative h-32 w-32 flex items-center justify-center rounded-full border-4 border-primary mb-4">
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                    <circle
                      className="text-muted stroke-current"
                      strokeWidth="4"
                      fill="transparent"
                      r="46"
                      cx="50"
                      cy="50"
                    />
                    <circle
                      className="text-primary stroke-current"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="transparent"
                      r="46"
                      cx="50"
                      cy="50"
                      strokeDasharray="289.1"
                      strokeDashoffset={(1 - timerMinutes / 25) * 289.1}
                    />
                  </svg>
                  <div className="text-3xl font-bold">
                    {timerMinutes.toString().padStart(2, "0")}:{timerSeconds.toString().padStart(2, "0")}
                  </div>
                </div>
                <div className="text-sm font-medium mb-4">当前任务: 产品设计方案</div>
                <div className="flex gap-2">
                  <Button onClick={toggleTimer} variant="outline" size="sm" className="w-24">
                    {timerActive ? (
                      <>
                        <Pause className="mr-1 h-4 w-4" />
                        暂停
                      </>
                    ) : (
                      <>
                        <Play className="mr-1 h-4 w-4" />
                        开始
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" className="w-24">
                    <Check className="mr-1 h-4 w-4" />
                    完成
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>快速添加任务</CardTitle>
              <CardDescription>记录新想法或任务</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input placeholder="输入新任务..." />
                <Button size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                AI 智能提示
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-primary/5 p-3 text-sm">
                <p>注意到你今天的日程很满，记得在任务间安排5-10分钟的短暂休息，有助于保持全天的专注力。</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>今日统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center rounded-lg border p-3">
                  <CheckCircle2 className="h-8 w-8 text-primary mb-1" />
                  <div className="text-2xl font-bold">3/8</div>
                  <div className="text-xs text-muted-foreground">已完成任务</div>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border p-3">
                  <Clock className="h-8 w-8 text-primary mb-1" />
                  <div className="text-2xl font-bold">4</div>
                  <div className="text-xs text-muted-foreground">专注番茄数</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
