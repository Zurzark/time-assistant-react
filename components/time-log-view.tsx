"use client"

import { useState } from "react"
import { format, startOfWeek, addDays, eachDayOfInterval } from "date-fns"
import { zhCN } from "date-fns/locale"
import { CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TimeEntry {
  id: number
  task: string
  project?: string
  category: string
  date: Date
  startTime: string
  endTime: string
  duration: number // 分钟
  notes?: string
}

export function TimeLogView() {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(today)
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false)
  const [newEntry, setNewEntry] = useState<Partial<TimeEntry>>({
    task: "",
    category: "工作",
    date: today,
    startTime: "",
    endTime: "",
    duration: 0,
  })
  const [date, setDate] = useState<Date>(today)

  // 时间记录
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([
    {
      id: 1,
      task: "项目会议",
      project: "客户项目",
      category: "会议",
      date: today,
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      notes: "讨论项目进度和下一步计划",
    },
    {
      id: 2,
      task: "编写代码",
      project: "客户项目",
      category: "开发",
      date: today,
      startTime: "10:30",
      endTime: "12:00",
      duration: 90,
    },
    {
      id: 3,
      task: "回复邮件",
      category: "沟通",
      date: today,
      startTime: "13:30",
      endTime: "14:00",
      duration: 30,
    },
    {
      id: 4,
      task: "文档整理",
      project: "内部项目",
      category: "文档",
      date: addDays(today, -1),
      startTime: "15:00",
      endTime: "16:30",
      duration: 90,
    },
    {
      id: 5,
      task: "团队会议",
      category: "会议",
      date: addDays(today, -1),
      startTime: "10:00",
      endTime: "11:00",
      duration: 60,
    },
    {
      id: 6,
      task: "学习新技术",
      category: "学习",
      date: addDays(today, -2),
      startTime: "14:00",
      endTime: "16:00",
      duration: 120,
    },
  ])

  // 获取当前周的日期
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 })
  const daysOfWeek = eachDayOfInterval({
    start: startOfCurrentWeek,
    end: addDays(startOfCurrentWeek, 6),
  })

  // 获取选定日期的时间记录
  const entriesForSelectedDate = timeEntries.filter(
    (entry) => format(entry.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"),
  )

  // 按开始时间排序
  const sortedEntries = [...entriesForSelectedDate].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime)
  })

  // 计算总时间
  const totalDuration = entriesForSelectedDate.reduce((total, entry) => total + entry.duration, 0)
  const totalHours = Math.floor(totalDuration / 60)
  const totalMinutes = totalDuration % 60

  // 获取类别的颜色
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "会议":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "开发":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "沟通":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
      case "文档":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "学习":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  // 上一周/下一周
  const previousWeek = () => {
    setCurrentDate(addDays(currentDate, -7))
  }

  const nextWeek = () => {
    setCurrentDate(addDays(currentDate, 7))
  }

  // 今天
  const goToToday = () => {
    setCurrentDate(today)
    setSelectedDate(today)
  }

  // 添加时间记录
  const handleAddEntry = () => {
    if (newEntry.task && newEntry.startTime && newEntry.endTime) {
      // 计算持续时间
      const start = newEntry.startTime.split(":")
      const end = newEntry.endTime.split(":")
      const startMinutes = Number.parseInt(start[0]) * 60 + Number.parseInt(start[1])
      const endMinutes = Number.parseInt(end[0]) * 60 + Number.parseInt(end[1])
      const duration = endMinutes - startMinutes

      const entry: TimeEntry = {
        id: Date.now(),
        task: newEntry.task,
        project: newEntry.project,
        category: newEntry.category || "工作",
        date: date,
        startTime: newEntry.startTime,
        endTime: newEntry.endTime,
        duration: duration,
        notes: newEntry.notes,
      }

      setTimeEntries([...timeEntries, entry])
      setNewEntry({
        task: "",
        category: "工作",
        date: today,
        startTime: "",
        endTime: "",
        duration: 0,
      })
      setIsAddEntryOpen(false)
    }
  }

  // 删除时间记录
  const deleteEntry = (id: number) => {
    setTimeEntries(timeEntries.filter((entry) => entry.id !== id))
  }

  // 获取每日总时间
  const getDailyTotal = (date: Date) => {
    const entries = timeEntries.filter((entry) => format(entry.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"))
    const total = entries.reduce((sum, entry) => sum + entry.duration, 0)
    return total
  }

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">时间日志</h1>
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
            <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  添加时间记录
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>添加时间记录</DialogTitle>
                  <DialogDescription>记录您的工作和活动时间</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="task">任务名称</Label>
                    <Input
                      id="task"
                      placeholder="输入任务名称"
                      value={newEntry.task}
                      onChange={(e) => setNewEntry({ ...newEntry, task: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="project">项目</Label>
                      <Select
                        value={newEntry.project}
                        onValueChange={(value) => setNewEntry({ ...newEntry, project: value })}
                      >
                        <SelectTrigger id="project">
                          <SelectValue placeholder="选择项目（可选）" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="客户项目">客户项目</SelectItem>
                          <SelectItem value="内部项目">内部项目</SelectItem>
                          <SelectItem value="个人项目">个人项目</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">类别</Label>
                      <Select
                        value={newEntry.category}
                        onValueChange={(value) => setNewEntry({ ...newEntry, category: value })}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="选择类别" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="会议">会议</SelectItem>
                          <SelectItem value="开发">开发</SelectItem>
                          <SelectItem value="沟通">沟通</SelectItem>
                          <SelectItem value="文档">文档</SelectItem>
                          <SelectItem value="学习">学习</SelectItem>
                          <SelectItem value="其他">其他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date">日期</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP", { locale: zhCN }) : <span>选择日期</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startTime">开始时间</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={newEntry.startTime}
                        onChange={(e) => setNewEntry({ ...newEntry, startTime: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endTime">结束时间</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={newEntry.endTime}
                        onChange={(e) => setNewEntry({ ...newEntry, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">备注</Label>
                    <Textarea
                      id="notes"
                      placeholder="添加备注（可选）"
                      value={newEntry.notes}
                      onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddEntryOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddEntry}>添加</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="text-muted-foreground">记录和跟踪您的时间使用情况</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {daysOfWeek.map((day) => {
          const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
          const isToday = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
          const dailyTotal = getDailyTotal(day)
          const hours = Math.floor(dailyTotal / 60)
          const minutes = dailyTotal % 60

          return (
            <div
              key={day.toString()}
              className={cn(
                "border rounded-lg p-2 cursor-pointer transition-colors",
                isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                isToday && "border-primary",
              )}
              onClick={() => setSelectedDate(day)}
            >
              <div className="text-center mb-2">
                <div className="text-xs text-muted-foreground">{format(day, "EEE", { locale: zhCN })}</div>
                <div className={cn("text-xl font-bold", isToday && "text-primary")}>{format(day, "d")}</div>
              </div>
              <div className="text-center text-sm">
                {hours > 0 || minutes > 0 ? (
                  <span>
                    {hours > 0 ? `${hours}小时 ` : ""}
                    {minutes > 0 ? `${minutes}分钟` : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">无记录</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>{format(selectedDate, "yyyy年MM月dd日 EEEE", { locale: zhCN })}的时间记录</CardTitle>
                <div className="text-sm text-muted-foreground">
                  总计: {totalHours > 0 ? `${totalHours}小时 ` : ""}
                  {totalMinutes > 0 ? `${totalMinutes}分钟` : ""}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sortedEntries.length > 0 ? (
                <div className="space-y-4">
                  {sortedEntries.map((entry) => (
                    <div key={entry.id} className="flex items-start border-b pb-4">
                      <div className="w-24 text-sm">
                        <div className="font-medium">
                          {entry.startTime} - {entry.endTime}
                        </div>
                        <div className="text-muted-foreground">
                          {Math.floor(entry.duration / 60) > 0 ? `${Math.floor(entry.duration / 60)}小时 ` : ""}
                          {entry.duration % 60 > 0 ? `${entry.duration % 60}分钟` : ""}
                        </div>
                      </div>
                      <div className="flex-1 ml-4">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{entry.task}</div>
                          <Button variant="ghost" size="icon" onClick={() => deleteEntry(entry.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className={cn("text-xs px-2 py-1 rounded", getCategoryColor(entry.category))}>
                            {entry.category}
                          </div>
                          {entry.project && <div className="text-xs bg-muted px-2 py-1 rounded">{entry.project}</div>}
                        </div>
                        {entry.notes && <div className="text-sm text-muted-foreground mt-2">{entry.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-primary/10 p-3 mb-4">
                    <CalendarIcon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">没有时间记录</h3>
                  <p className="text-muted-foreground mb-4">这一天没有记录任何时间</p>
                  <Button size="sm" onClick={() => setIsAddEntryOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加时间记录
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>时间分析</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="category">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="category">按类别</TabsTrigger>
                  <TabsTrigger value="project">按项目</TabsTrigger>
                </TabsList>
                <TabsContent value="category" className="mt-4">
                  <div className="space-y-4">
                    {["会议", "开发", "沟通", "文档", "学习", "其他"].map((category) => {
                      const entries = entriesForSelectedDate.filter((entry) => entry.category === category)
                      const total = entries.reduce((sum, entry) => sum + entry.duration, 0)
                      const hours = Math.floor(total / 60)
                      const minutes = total % 60
                      const percentage = totalDuration > 0 ? Math.round((total / totalDuration) * 100) : 0

                      if (total === 0) return null

                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                              <div
                                className={cn("h-3 w-3 rounded-full mr-2", getCategoryColor(category).split(" ")[0])}
                              />
                              <span>{category}</span>
                            </div>
                            <div className="text-muted-foreground">
                              {hours > 0 ? `${hours}小时 ` : ""}
                              {minutes > 0 ? `${minutes}分钟` : ""}
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full",
                                category === "会议"
                                  ? "bg-purple-500"
                                  : category === "开发"
                                    ? "bg-blue-500"
                                    : category === "沟通"
                                      ? "bg-amber-500"
                                      : category === "文档"
                                        ? "bg-green-500"
                                        : category === "学习"
                                          ? "bg-indigo-500"
                                          : "bg-gray-500",
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>
                <TabsContent value="project" className="mt-4">
                  <div className="space-y-4">
                    {Array.from(new Set(entriesForSelectedDate.map((entry) => entry.project || "未分类"))).map(
                      (project) => {
                        const entries = entriesForSelectedDate.filter(
                          (entry) => (entry.project || "未分类") === project,
                        )
                        const total = entries.reduce((sum, entry) => sum + entry.duration, 0)
                        const hours = Math.floor(total / 60)
                        const minutes = total % 60
                        const percentage = totalDuration > 0 ? Math.round((total / totalDuration) * 100) : 0

                        return (
                          <div key={project} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{project}</span>
                              <div className="text-muted-foreground">
                                {hours > 0 ? `${hours}小时 ` : ""}
                                {minutes > 0 ? `${minutes}分钟` : ""}
                              </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        )
                      },
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>本周总结</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {daysOfWeek.map((day) => {
                  const dailyTotal = getDailyTotal(day)
                  const weeklyTotal = daysOfWeek.reduce((sum, d) => sum + getDailyTotal(d), 0)
                  const percentage = weeklyTotal > 0 ? Math.round((dailyTotal / weeklyTotal) * 100) : 0

                  return (
                    <div key={day.toString()} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          {format(day, "EEE", { locale: zhCN })} {format(day, "MM/dd")}
                        </span>
                        <div className="text-muted-foreground">
                          {Math.floor(dailyTotal / 60) > 0 ? `${Math.floor(dailyTotal / 60)}小时 ` : ""}
                          {dailyTotal % 60 > 0 ? `${dailyTotal % 60}分钟` : ""}
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") ? "bg-primary" : "bg-primary/60",
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
