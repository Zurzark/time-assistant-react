"use client"

import { useState } from "react"
import { addDays, format, startOfToday, startOfWeek, addWeeks, eachDayOfInterval } from "date-fns"
import { zhCN } from "date-fns/locale"
import { CalendarIcon, ChevronLeft, ChevronRight, Clock, Filter, MoreHorizontal, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Event {
  id: number
  title: string
  date: Date
  startTime: string
  endTime: string
  type: "task" | "meeting" | "personal" | "deadline"
  project?: string
  description?: string
}

export function CalendarView() {
  const today = startOfToday()
  const [currentDate, setCurrentDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(today)
  const [currentView, setCurrentView] = useState<"day" | "week" | "month">("week")
  const [events, setEvents] = useState<Event[]>([
    {
      id: 1,
      title: "团队周会",
      date: addDays(today, 0),
      startTime: "10:00",
      endTime: "11:00",
      type: "meeting",
      description: "讨论本周进度和下周计划",
    },
    {
      id: 2,
      title: "客户电话会议",
      date: addDays(today, 0),
      startTime: "14:30",
      endTime: "15:30",
      type: "meeting",
      project: "客户项目",
    },
    {
      id: 3,
      title: "完成项目提案",
      date: addDays(today, 1),
      startTime: "09:00",
      endTime: "12:00",
      type: "task",
      project: "客户项目",
    },
    {
      id: 4,
      title: "提交周报",
      date: addDays(today, 2),
      startTime: "17:00",
      endTime: "17:30",
      type: "deadline",
    },
    {
      id: 5,
      title: "健身",
      date: addDays(today, 2),
      startTime: "18:30",
      endTime: "19:30",
      type: "personal",
    },
    {
      id: 6,
      title: "准备演讲材料",
      date: addDays(today, 3),
      startTime: "13:00",
      endTime: "15:00",
      type: "task",
    },
    {
      id: 7,
      title: "产品发布会",
      date: addDays(today, 4),
      startTime: "10:00",
      endTime: "11:30",
      type: "meeting",
      project: "产品发布",
    },
  ])

  // 获取当前周的日期
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 })
  const daysOfWeek = eachDayOfInterval({
    start: startOfCurrentWeek,
    end: addDays(startOfCurrentWeek, 6),
  })

  // 获取当前日期的事件
  const eventsForSelectedDate = events.filter(
    (event) => format(event.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"),
  )

  // 按时间排序
  const sortedEvents = [...eventsForSelectedDate].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime)
  })

  // 获取事件类型的颜色
  const getEventTypeColor = (type: Event["type"]) => {
    switch (type) {
      case "task":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "meeting":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "personal":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "deadline":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  // 获取事件类型的标签
  const getEventTypeLabel = (type: Event["type"]) => {
    switch (type) {
      case "task":
        return "任务"
      case "meeting":
        return "会议"
      case "personal":
        return "个人"
      case "deadline":
        return "截止日期"
      default:
        return "其他"
    }
  }

  // 上一周/下一周
  const previousWeek = () => {
    setCurrentDate(addWeeks(currentDate, -1))
  }

  const nextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1))
  }

  // 今天
  const goToToday = () => {
    setCurrentDate(today)
    setSelectedDate(today)
  }

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">日历</h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              今天
            </Button>
            <Button variant="outline" size="icon" onClick={previousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Select value={currentView} onValueChange={(value) => setCurrentView(value as "day" | "week" | "month")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="选择视图" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">日视图</SelectItem>
                <SelectItem value="week">周视图</SelectItem>
                <SelectItem value="month">月视图</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              添加事件
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">{format(currentDate, "yyyy年MM月", { locale: zhCN })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        <div className="md:col-span-5">
          <Card className="h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>
                  {currentView === "day"
                    ? format(selectedDate, "yyyy年MM月dd日 EEEE", { locale: zhCN })
                    : currentView === "week"
                      ? `${format(daysOfWeek[0], "MM月dd日", { locale: zhCN })} - ${format(daysOfWeek[6], "MM月dd日", {
                          locale: zhCN,
                        })}`
                      : format(currentDate, "yyyy年MM月", { locale: zhCN })}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    筛选
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="week" value={currentView} className="h-full">
                <TabsList className="hidden">
                  <TabsTrigger value="day">日视图</TabsTrigger>
                  <TabsTrigger value="week">周视图</TabsTrigger>
                  <TabsTrigger value="month">月视图</TabsTrigger>
                </TabsList>

                <TabsContent value="day" className="h-full">
                  <div className="space-y-2">
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div key={hour} className="flex items-start">
                        <div className="w-16 text-xs text-muted-foreground py-2 pr-4 text-right">
                          {hour.toString().padStart(2, "0")}:00
                        </div>
                        <div className="flex-1 border-t border-muted h-12 relative">
                          {events
                            .filter(
                              (event) =>
                                format(event.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd") &&
                                Number.parseInt(event.startTime.split(":")[0]) === hour,
                            )
                            .map((event) => {
                              const startMinutes = Number.parseInt(event.startTime.split(":")[1])
                              const endHour = Number.parseInt(event.endTime.split(":")[0])
                              const endMinutes = Number.parseInt(event.endTime.split(":")[1])
                              const durationInMinutes = (endHour - hour) * 60 + endMinutes - startMinutes
                              const height = (durationInMinutes / 60) * 48 // 每小时高度为48px

                              return (
                                <div
                                  key={event.id}
                                  className={cn(
                                    "absolute left-0 right-0 mx-1 rounded-md p-2 overflow-hidden",
                                    getEventTypeColor(event.type),
                                  )}
                                  style={{
                                    top: `${(startMinutes / 60) * 48}px`,
                                    height: `${height}px`,
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium text-sm truncate">{event.title}</div>
                                    <div className="text-xs">
                                      {event.startTime} - {event.endTime}
                                    </div>
                                  </div>
                                  {event.project && <div className="text-xs truncate">{event.project}</div>}
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="week" className="h-full">
                  <div className="grid grid-cols-7 gap-2">
                    {daysOfWeek.map((day, index) => (
                      <div
                        key={day.toString()}
                        className={cn(
                          "text-center p-2 rounded-md cursor-pointer",
                          format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted",
                        )}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className="text-xs font-medium mb-1">{format(day, "EEE", { locale: zhCN })}</div>
                        <div
                          className={cn(
                            "text-2xl",
                            format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") && "text-primary font-bold",
                          )}
                        >
                          {format(day, "d")}
                        </div>
                        <div className="mt-1 space-y-1">
                          {events
                            .filter((event) => format(event.date, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"))
                            .slice(0, 3)
                            .map((event) => (
                              <div
                                key={event.id}
                                className={cn("text-xs p-1 rounded truncate", getEventTypeColor(event.type))}
                              >
                                {event.startTime} {event.title}
                              </div>
                            ))}
                          {events.filter((event) => format(event.date, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"))
                            .length > 3 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +
                              {events.filter((event) => format(event.date, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"))
                                .length - 3}{" "}
                              更多
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="month" className="h-full">
                  <div className="grid grid-cols-7 gap-1">
                    {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
                      <div key={day} className="text-center p-2 text-sm font-medium">
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div
                        key={i}
                        className="border rounded-md p-1 h-24 overflow-hidden hover:bg-muted/50 cursor-pointer"
                      >
                        <div className="text-xs text-right text-muted-foreground">{i + 1}</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {format(selectedDate, "yyyy年MM月dd日 EEEE", { locale: zhCN })}
                </CardTitle>
                <CardDescription>
                  {eventsForSelectedDate.length > 0 ? `${eventsForSelectedDate.length} 个事件` : "没有事件"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                {sortedEvents.length > 0 ? (
                  <div className="space-y-4">
                    {sortedEvents.map((event) => (
                      <div key={event.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="outline"
                              className={cn("flex items-center space-x-1", getEventTypeColor(event.type))}
                            >
                              {getEventTypeLabel(event.type)}
                            </Badge>
                            <span className="text-sm font-medium">{event.title}</span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>编辑</DropdownMenuItem>
                              <DropdownMenuItem>删除</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>
                            {event.startTime} - {event.endTime}
                          </span>
                        </div>
                        {event.project && <div className="text-sm text-muted-foreground">项目: {event.project}</div>}
                        {event.description && <div className="text-sm">{event.description}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CalendarIcon className="h-10 w-10 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium">没有事件</h3>
                    <p className="text-sm text-muted-foreground mb-4">这一天没有安排任何事件</p>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      添加事件
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  添加事件
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">即将到来的事件</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-4">
                  {events
                    .filter(
                      (event) =>
                        new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate()) >=
                        new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                    )
                    .sort((a, b) => {
                      const dateA = new Date(a.date.getFullYear(), a.date.getMonth(), a.date.getDate()).getTime()
                      const dateB = new Date(b.date.getFullYear(), b.date.getMonth(), b.date.getDate()).getTime()
                      return dateA - dateB || a.startTime.localeCompare(b.startTime)
                    })
                    .slice(0, 5)
                    .map((event) => (
                      <div key={event.id} className="flex items-start space-x-3">
                        <div className="text-center">
                          <div className="text-xs font-medium">{format(event.date, "EEE", { locale: zhCN })}</div>
                          <div className="text-lg font-bold">{format(event.date, "d")}</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{event.title}</div>
                            <Badge variant="outline" className={cn("text-xs", getEventTypeColor(event.type))}>
                              {getEventTypeLabel(event.type)}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {event.startTime} - {event.endTime}
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
    </div>
  )
}
