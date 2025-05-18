"use client"

import { useState } from "react"
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { BarChart, LineChart, PieChart } from "@/components/ui/chart"

export function AnalyticsView() {
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "90days" | "year">("30days")
  const [selectedTab, setSelectedTab] = useState("productivity")

  // 模拟数据 - 生产力数据
  const productivityData = {
    "7days": Array.from({ length: 7 }, (_, i) => ({
      date: format(subDays(new Date(), 6 - i), "MM-dd"),
      完成任务数: Math.floor(Math.random() * 10) + 1,
      专注时间: Math.floor(Math.random() * 5) + 1,
    })),
    "30days": Array.from({ length: 30 }, (_, i) => ({
      date: format(subDays(new Date(), 29 - i), "MM-dd"),
      完成任务数: Math.floor(Math.random() * 10) + 1,
      专注时间: Math.floor(Math.random() * 5) + 1,
    })),
    "90days": Array.from({ length: 12 }, (_, i) => ({
      date: format(subDays(new Date(), 90 - i * 7), "MM-dd"),
      完成任务数: Math.floor(Math.random() * 50) + 10,
      专注时间: Math.floor(Math.random() * 25) + 5,
    })),
    year: Array.from({ length: 12 }, (_, i) => ({
      date: format(subMonths(new Date(), 11 - i), "yyyy-MM"),
      完成任务数: Math.floor(Math.random() * 100) + 20,
      专注时间: Math.floor(Math.random() * 50) + 10,
    })),
  }

  // 模拟数据 - 时间分配
  const timeAllocationData = [
    { name: "工作任务", value: 45 },
    { name: "会议", value: 20 },
    { name: "学习", value: 15 },
    { name: "休息", value: 10 },
    { name: "其他", value: 10 },
  ]

  // 模拟数据 - 目标进度
  const goalsProgressData = [
    { name: "提高工作效率", 已完成: 65, 总进度: 100 },
    { name: "完成专业认证", 已完成: 40, 总进度: 100 },
    { name: "建立个人品牌", 已完成: 25, 总进度: 100 },
    { name: "学习新技能", 已完成: 80, 总进度: 100 },
  ]

  // 模拟数据 - 项目进度
  const projectsProgressData = [
    { name: "网站重新设计", 已完成: 75, 总进度: 100 },
    { name: "市场营销活动", 已完成: 45, 总进度: 100 },
    { name: "团队培训计划", 已完成: 30, 总进度: 100 },
    { name: "产品发布", 已完成: 90, 总进度: 100 },
  ]

  // 模拟数据 - 月度日历热图数据
  const generateHeatmapData = () => {
    const today = new Date()
    const firstDay = startOfMonth(today)
    const lastDay = endOfMonth(today)
    const days = eachDayOfInterval({ start: firstDay, end: lastDay })

    return days.map((day) => ({
      date: format(day, "yyyy-MM-dd"),
      value: Math.floor(Math.random() * 10),
    }))
  }

  const heatmapData = generateHeatmapData()

  // 获取当前日期范围的标签
  const getDateRangeLabel = () => {
    const today = new Date()
    switch (dateRange) {
      case "7days":
        return `${format(subDays(today, 6), "yyyy年MM月dd日")} - ${format(today, "yyyy年MM月dd日")}`
      case "30days":
        return `${format(subDays(today, 29), "yyyy年MM月dd日")} - ${format(today, "yyyy年MM月dd日")}`
      case "90days":
        return `${format(subDays(today, 89), "yyyy年MM月dd日")} - ${format(today, "yyyy年MM月dd日")}`
      case "year":
        return `${format(subMonths(today, 11), "yyyy年MM月")} - ${format(today, "yyyy年MM月")}`
      default:
        return ""
    }
  }

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">分析报告</h1>
          <div className="flex items-center space-x-2">
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择时间范围" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">最近7天</SelectItem>
                <SelectItem value="30days">最近30天</SelectItem>
                <SelectItem value="90days">最近90天</SelectItem>
                <SelectItem value="year">最近一年</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">导出报告</Button>
          </div>
        </div>
        <p className="text-muted-foreground">{getDateRangeLabel()}</p>
      </div>

      <Tabs defaultValue="productivity" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="productivity">生产力</TabsTrigger>
          <TabsTrigger value="time">时间分配</TabsTrigger>
          <TabsTrigger value="goals">目标进度</TabsTrigger>
          <TabsTrigger value="projects">项目进度</TabsTrigger>
        </TabsList>

        <TabsContent value="productivity" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>生产力趋势</CardTitle>
                <CardDescription>跟踪您的任务完成情况和专注时间</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <LineChart
                    data={productivityData[dateRange]}
                    index="date"
                    categories={["完成任务数", "专注时间"]}
                    colors={["blue", "green"]}
                    valueFormatter={(value) => `${value}`}
                    yAxisWidth={40}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>任务完成率</CardTitle>
                <CardDescription>已完成任务与总任务的比例</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="w-48 h-48 relative flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      className="text-muted stroke-muted"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      strokeDasharray="282.7433388230814"
                      strokeDashoffset="70.68583470577034"
                      className="text-primary stroke-primary"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">75%</span>
                    <span className="text-sm text-muted-foreground">完成率</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>专注时间</CardTitle>
                <CardDescription>总专注时间和平均每日专注时间</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">总专注时间</span>
                      <span className="font-medium">42小时</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: "70%" }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">平均每日专注时间</span>
                      <span className="font-medium">2.8小时</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: "56%" }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">完成番茄钟数</span>
                      <span className="font-medium">84个</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: "84%" }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>生产力得分</CardTitle>
                <CardDescription>基于您的任务完成情况和专注时间</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <div className="text-6xl font-bold mb-2">82</div>
                <div className="text-sm text-muted-foreground mb-4">优秀</div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: "82%" }} />
                </div>
                <div className="flex justify-between w-full text-xs text-muted-foreground mt-1">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="time" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>时间分配</CardTitle>
                <CardDescription>您如何分配时间在不同类型的活动上</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <PieChart
                    data={timeAllocationData}
                    index="name"
                    category="value"
                    valueFormatter={(value) => `${value}%`}
                    colors={["blue", "violet", "green", "yellow", "gray"]}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>时间分配详情</CardTitle>
                <CardDescription>各类活动所占时间百分比</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeAllocationData.map((item) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{item.name}</span>
                        <span className="font-medium">{item.value}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={cn("h-2 rounded-full", {
                            "bg-blue-500": item.name === "工作任务",
                            "bg-violet-500": item.name === "会议",
                            "bg-green-500": item.name === "学习",
                            "bg-yellow-500": item.name === "休息",
                            "bg-gray-500": item.name === "其他",
                          })}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>每日活动热图</CardTitle>
                <CardDescription>本月每日活动强度</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
                    <div key={day} className="text-center text-sm font-medium">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 35 }).map((_, i) => {
                    const value = i < heatmapData.length ? heatmapData[i].value : 0
                    return (
                      <div
                        key={i}
                        className={cn("h-10 rounded-md", {
                          "bg-primary/10": value === 0,
                          "bg-primary/20": value > 0 && value <= 2,
                          "bg-primary/40": value > 2 && value <= 5,
                          "bg-primary/60": value > 5 && value <= 7,
                          "bg-primary/80": value > 7,
                        })}
                        title={i < heatmapData.length ? `${heatmapData[i].date}: ${value}小时` : ""}
                      />
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>目标完成进度</CardTitle>
                <CardDescription>您的长期目标完成情况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <BarChart
                    data={goalsProgressData}
                    index="name"
                    categories={["已完成"]}
                    colors={["blue"]}
                    valueFormatter={(value) => `${value}%`}
                    yAxisWidth={40}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>目标详情</CardTitle>
                <CardDescription>各个目标的完成进度</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {goalsProgressData.map((goal) => (
                    <div key={goal.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-sm text-muted-foreground">{goal.已完成}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${goal.已完成}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>开始</span>
                        <span>进行中</span>
                        <span>完成</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>目标达成趋势</CardTitle>
                <CardDescription>目标完成进度随时间的变化</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <LineChart
                    data={[
                      { date: "1月", 进度: 10 },
                      { date: "2月", 进度: 25 },
                      { date: "3月", 进度: 35 },
                      { date: "4月", 进度: 48 },
                      { date: "5月", 进度: 52 },
                      { date: "6月", 进度: 61 },
                      { date: "7月", 进度: 68 },
                      { date: "8月", 进度: 72 },
                      { date: "9月", 进度: 80 },
                      { date: "10月", 进度: 85 },
                      { date: "11月", 进度: 90 },
                      { date: "12月", 进度: 95 },
                    ]}
                    index="date"
                    categories={["进度"]}
                    colors={["green"]}
                    valueFormatter={(value) => `${value}%`}
                    yAxisWidth={40}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>项目完成进度</CardTitle>
                <CardDescription>您的项目完成情况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <BarChart
                    data={projectsProgressData}
                    index="name"
                    categories={["已完成"]}
                    colors={["violet"]}
                    valueFormatter={(value) => `${value}%`}
                    yAxisWidth={40}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>项目详情</CardTitle>
                <CardDescription>各个项目的完成进度</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {projectsProgressData.map((project) => (
                    <div key={project.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{project.name}</span>
                        <span className="text-sm text-muted-foreground">{project.已完成}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div className="bg-violet-500 h-2.5 rounded-full" style={{ width: `${project.已完成}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>计划</span>
                        <span>执行</span>
                        <span>完成</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>项目时间分配</CardTitle>
                <CardDescription>各项目所花费的时间</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <PieChart
                    data={[
                      { name: "网站重新设计", value: 35 },
                      { name: "市场营销活动", value: 25 },
                      { name: "团队培训计划", value: 20 },
                      { name: "产品发布", value: 15 },
                      { name: "其他项目", value: 5 },
                    ]}
                    index="name"
                    category="value"
                    valueFormatter={(value) => `${value}%`}
                    colors={["violet", "blue", "green", "yellow", "gray"]}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
