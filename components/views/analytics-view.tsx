"use client"

import { useState } from "react"
import { format, subDays, subMonths, startOfMonth, getDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { BarChart, LineChart, PieChart } from "@/components/ui/chart"
import { useAnalyticsData, DateRangeType } from "./hooks/useAnalyticsData"

export function AnalyticsView() {
  const [dateRange, setDateRange] = useState<DateRangeType>("30days")
  const [selectedTab, setSelectedTab] = useState("productivity")
  
  const { 
    productivityData, 
    timeAllocationData, 
    goalsProgressData, 
    goalTrendData,
    projectsProgressData, 
    heatmapData, 
    stats
  } = useAnalyticsData(dateRange)

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

  // Calculate strokeDashoffset for completion rate
  const completionRateOffset = 282.7433388230814 * (1 - stats.completionRate / 100)

  // Color palette for charts
  const colors = ["blue", "violet", "green", "yellow", "gray", "red", "indigo", "pink"]
  const getColor = (index: number) => colors[index % colors.length]
  const getColorClass = (index: number) => {
      const c = getColor(index)
      switch(c) {
          case "blue": return "bg-blue-500"
          case "violet": return "bg-violet-500"
          case "green": return "bg-green-500"
          case "yellow": return "bg-yellow-500"
          case "gray": return "bg-gray-500"
          case "red": return "bg-red-500"
          case "indigo": return "bg-indigo-500"
          case "pink": return "bg-pink-500"
          default: return "bg-primary"
      }
  }

  return (
    <div className="container py-6 space-y-8">
      <TooltipProvider>
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
                    data={productivityData}
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
                      strokeDashoffset={completionRateOffset}
                      className="text-primary stroke-primary"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">{stats.completionRate}%</span>
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
                      <span className="font-medium">{stats.totalFocusTime}小时</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(100, (stats.totalFocusTime / (8 * 30)) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">平均每日专注时间</span>
                      <span className="font-medium">{stats.avgDailyFocusTime}小时</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(100, (stats.avgDailyFocusTime / 8) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">完成番茄钟数</span>
                      <span className="font-medium">{stats.completedPomodoros}个</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(100, (stats.completedPomodoros / (16 * 30)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  生产力得分
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>生产力得分计算逻辑：</p>
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-xs">
                        <li>基础分：任务完成率 × 50%</li>
                        <li>加分项：平均每日专注时长 × 10分/小时（最高50分）</li>
                        <li>总分最高为100分</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>基于您的任务完成情况和专注时间</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <div className="text-6xl font-bold mb-2">{stats.productivityScore}</div>
                <div className="text-sm text-muted-foreground mb-4">
                    {stats.productivityScore >= 80 ? "优秀" : stats.productivityScore >= 60 ? "良好" : "需改进"}
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${stats.productivityScore}%` }} />
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
                <CardTitle className="flex items-center gap-2">
                  时间分配
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>时间分配统计口径：</p>
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-xs">
                        <li>统计所有已记录的实际时间块（isLogged=1）</li>
                        <li>包括番茄钟专注时长和手动记录的时间段</li>
                        <li>按活动类别或任务所属项目进行分类聚合</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>您如何分配时间在不同类型的活动上</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center">
                  {timeAllocationData.length > 0 && timeAllocationData.some(item => item.value > 0) ? (
                    <PieChart
                      data={timeAllocationData}
                      index="name"
                      category="value"
                      valueFormatter={(value) => `${value}%`}
                      colors={colors}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <p>暂无时间记录数据</p>
                      <p className="text-sm mt-1">请开始记录时间或番茄钟以查看分析</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>时间分配详情</CardTitle>
                <CardDescription>各类活动所占时间百分比</CardDescription>
              </CardHeader>
              <CardContent>
                {timeAllocationData.length > 0 && timeAllocationData.some(item => item.value > 0) ? (
                  <div className="space-y-4">
                    {timeAllocationData.map((item, index) => (
                      <div key={item.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{item.name}</span>
                          <span className="font-medium">{item.value}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={cn("h-2 rounded-full", getColorClass(index))}
                            style={{ width: `${item.value}%`, backgroundColor: getColorClass(index).startsWith("bg-") ? undefined : getColor(index) }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
                    暂无详情数据
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  每日活动热图
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>活动强度计算口径：</p>
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-xs">
                        <li>统计每日所有已记录的时间块总时长</li>
                        <li>颜色越深代表当日投入时间越多</li>
                        <li>包括番茄钟和手动记录</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>本月每日活动强度</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
                    <div key={day} className="text-center text-sm font-medium">
                      {day}
                    </div>
                  ))}
                  {/* Empty cells for offset */}
                  {Array.from({ length: (getDay(startOfMonth(new Date())) + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-10 rounded-md" />
                  ))}
                  {/* Heatmap cells */}
                  {heatmapData.map((data, i) => {
                    const value = data ? data.value : 0
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
                        title={data ? `${data.date}: ${value}小时` : ""}
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
                        <span className="text-sm text-muted-foreground">{goal["已完成"]}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${goal["已完成"]}%` }} />
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
                <CardTitle>目标活动趋势</CardTitle>
                <CardDescription>每月完成的与目标相关的任务数量</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <LineChart
                    data={goalTrendData}
                    index="date"
                    categories={["进度"]}
                    colors={["green"]}
                    valueFormatter={(value) => `${value}`}
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
                        <span className="text-sm text-muted-foreground">{project["已完成"]}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div className="bg-violet-500 h-2.5 rounded-full" style={{ width: `${project["已完成"]}%` }} />
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
                <div className="h-[300px] flex items-center justify-center">
                  {projectsProgressData.some(p => p.timeSpent > 0) ? (
                    <PieChart
                      data={projectsProgressData.map(p => ({
                          name: p.name,
                          value: p.timeSpent ? Math.round(p.timeSpent / 1000 / 60) : 0 // minutes
                      })).filter(p => p.value > 0)}
                      index="name"
                      category="value"
                      valueFormatter={(value) => `${value}分钟`}
                      colors={colors}
                    />
                  ) : (
                    <div className="text-muted-foreground text-sm">
                        暂无项目时间记录
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </TooltipProvider>
    </div>
  )
}
