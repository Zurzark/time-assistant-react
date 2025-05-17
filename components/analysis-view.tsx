"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lightbulb,
  PieChart,
  TrendingUp,
  Zap,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

export function AnalysisView() {
  const [timeRange, setTimeRange] = useState("week")

  return (
    <div className="flex flex-col p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">回顾与分析</h1>
          <p className="text-muted-foreground">分析您的时间使用情况和任务完成情况</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">2025年5月11日 - 2025年5月17日</div>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="mx-2 h-6" />
          <Tabs defaultValue="week" onValueChange={setTimeRange}>
            <TabsList>
              <TabsTrigger value="day">日</TabsTrigger>
              <TabsTrigger value="week">周</TabsTrigger>
              <TabsTrigger value="month">月</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">任务完成率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="relative h-40 w-40">
                    <svg className="h-full w-full" viewBox="0 0 100 100">
                      <circle
                        className="text-muted stroke-current"
                        strokeWidth="10"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        className="text-primary stroke-current"
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                        strokeDasharray="251.2"
                        strokeDashoffset="75.36"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold">70%</span>
                      <span className="text-sm text-muted-foreground">完成率</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">计划任务</div>
                    <div className="text-muted-foreground">20 个</div>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div>
                    <div className="font-medium">已完成</div>
                    <div className="text-muted-foreground">14 个</div>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div>
                    <div className="font-medium">未完成</div>
                    <div className="text-muted-foreground">6 个</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">专注效率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] w-full">
                  <div className="flex h-[180px] items-end gap-2 pt-6">
                    {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((day, i) => (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-sm bg-primary"
                          style={{
                            height: `${[60, 80, 45, 90, 70, 30, 50][i]}%`,
                          }}
                        ></div>
                        <span className="text-xs text-muted-foreground">{day}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">本周番茄钟</div>
                      <div className="text-muted-foreground">32 个</div>
                    </div>
                    <div>
                      <div className="font-medium">平均每日</div>
                      <div className="text-muted-foreground">4.6 个</div>
                    </div>
                    <div>
                      <div className="font-medium">最高效日</div>
                      <div className="text-muted-foreground">周四 (9个)</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">时间花费分析</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="relative h-40 w-40">
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#3b82f6"
                      strokeWidth="20"
                      strokeDasharray="251.2"
                      strokeDashoffset="188.4"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="20"
                      strokeDasharray="251.2"
                      strokeDashoffset="213.52"
                      strokeDashoffset="188.4"
                      transform="rotate(-90 50 50)"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#f59e0b"
                      strokeWidth="20"
                      strokeDasharray="251.2"
                      strokeDashoffset="238.64"
                      strokeDashoffset="213.52"
                      transform="rotate(-180 50 50)"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#ef4444"
                      strokeWidth="20"
                      strokeDasharray="251.2"
                      strokeDashoffset="251.2"
                      strokeDashoffset="238.64"
                      transform="rotate(-270 50 50)"
                    />
                  </svg>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    <div className="text-sm">产品开发 (40%)</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <div className="text-sm">学习 (25%)</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                    <div className="text-sm">会议 (20%)</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="text-sm">其他 (15%)</div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>产品开发</span>
                        <span>12小时</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: "40%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>学习</span>
                        <span>7.5小时</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-green-500" style={{ width: "25%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>会议</span>
                        <span>6小时</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-amber-500" style={{ width: "20%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>其他</span>
                        <span>4.5小时</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-red-500" style={{ width: "15%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">预估与实际用时对比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <div className="flex h-[200px] items-end gap-6 pt-6">
                  {[
                    { name: "产品设计", estimated: 120, actual: 150 },
                    { name: "团队会议", estimated: 60, actual: 75 },
                    { name: "文档编写", estimated: 90, actual: 70 },
                    { name: "学习", estimated: 60, actual: 45 },
                    { name: "健身", estimated: 60, actual: 60 },
                  ].map((item, i) => (
                    <div key={item.name} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex justify-center gap-2">
                        <div
                          className="w-6 rounded-sm bg-primary"
                          style={{ height: `${(item.estimated / 150) * 100}%` }}
                        ></div>
                        <div
                          className="w-6 rounded-sm bg-amber-500"
                          style={{ height: `${(item.actual / 150) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 text-center">{item.name}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary"></div>
                    <div>预估时间</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                    <div>实际用时</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                AI 分析与洞察
              </CardTitle>
              <CardDescription>基于您的时间使用数据的智能分析</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <h3 className="font-medium">效率高峰期</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      您在上午9-11点效率最高，建议将重要任务安排在此期间。
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <h3 className="font-medium">时间预估偏差</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      "产品设计"类任务的预估时间平均偏少25%，下次规划时请适当增加缓冲时间。
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart className="h-4 w-4 text-blue-500" />
                      <h3 className="font-medium">任务中断分析</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      本周您因"会议"中断任务5次，尝试减少会议安排或预留缓冲时间。
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <PieChart className="h-4 w-4 text-purple-500" />
                      <h3 className="font-medium">时间分配建议</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      您在"学习"类任务上的时间投入低于目标。建议每周至少安排8小时用于学习新技能。
                    </p>
                  </div>

                  <div className="rounded-lg border p-3 bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <h3 className="font-medium">成就与鼓励</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      恭喜！您本周完成了32个番茄钟，比上周提高了15%。保持专注！
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">本周完成的重要任务</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { title: "完成用户调研报告", date: "5月12日", project: "产品开发" },
                  { title: "设计团队周会", date: "5月13日", project: "团队管理" },
                  { title: "完成产品原型设计", date: "5月15日", project: "产品开发" },
                  { title: "学习React新特性", date: "5月16日", project: "个人发展" },
                ].map((task, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      ✓
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{task.title}</div>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          <span>{task.date}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {task.project}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
