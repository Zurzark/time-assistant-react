"use client"

import { useState, useEffect, useRef } from "react"
import { CheckCircle2, Clock, Pause, Play, RotateCcw, Settings, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PomodoroSettings {
  workDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  longBreakInterval: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  alarmSound: string
  alarmVolume: number
}

interface PomodoroSession {
  id: number
  task: string
  completedPomodoros: number
  date: Date
}

export function PomodoroView() {
  // 番茄钟设置
  const [settings, setSettings] = useState<PomodoroSettings>({
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartBreaks: true,
    autoStartPomodoros: false,
    alarmSound: "bell",
    alarmVolume: 80,
  })

  // 番茄钟状态
  const [mode, setMode] = useState<"work" | "shortBreak" | "longBreak">("work")
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60)
  const [isActive, setIsActive] = useState(false)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTask, setCurrentTask] = useState("")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // 历史记录
  const [sessions, setSessions] = useState<PomodoroSession[]>([
    {
      id: 1,
      task: "完成项目提案",
      completedPomodoros: 3,
      date: new Date(2025, 4, 16),
    },
    {
      id: 2,
      task: "回复客户邮件",
      completedPomodoros: 1,
      date: new Date(2025, 4, 16),
    },
    {
      id: 3,
      task: "准备演讲材料",
      completedPomodoros: 4,
      date: new Date(2025, 4, 15),
    },
  ])

  // 任务列表
  const [tasks, setTasks] = useState([
    { id: 1, title: "完成项目提案", priority: "high" },
    { id: 2, title: "回复客户邮件", priority: "medium" },
    { id: 3, title: "准备演讲材料", priority: "high" },
    { id: 4, title: "更新项目文档", priority: "low" },
  ])

  // 音频引用
  const alarmRef = useRef<HTMLAudioElement | null>(null)

  // 初始化音频
  useEffect(() => {
    alarmRef.current = new Audio("/alarm.mp3") // 假设有一个音频文件
    alarmRef.current.volume = settings.alarmVolume / 100
    return () => {
      if (alarmRef.current) {
        alarmRef.current.pause()
        alarmRef.current = null
      }
    }
  }, [])

  // 更新音量
  useEffect(() => {
    if (alarmRef.current) {
      alarmRef.current.volume = settings.alarmVolume / 100
    }
  }, [settings.alarmVolume])

  // 计时器逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1)
      }, 1000)
    } else if (isActive && timeLeft === 0) {
      // 播放提示音
      if (!isMuted && alarmRef.current) {
        alarmRef.current.play()
      }

      // 完成一个番茄钟
      if (mode === "work") {
        setCompletedPomodoros((prev) => prev + 1)

        // 添加到历史记录
        if (currentTask) {
          const today = new Date()
          const existingSession = sessions.find(
            (s) =>
              s.task === currentTask &&
              s.date.getDate() === today.getDate() &&
              s.date.getMonth() === today.getMonth() &&
              s.date.getFullYear() === today.getFullYear(),
          )

          if (existingSession) {
            setSessions(
              sessions.map((s) =>
                s.id === existingSession.id ? { ...s, completedPomodoros: s.completedPomodoros + 1 } : s,
              ),
            )
          } else {
            setSessions([
              ...sessions,
              {
                id: Date.now(),
                task: currentTask,
                completedPomodoros: 1,
                date: today,
              },
            ])
          }
        }

        // 判断是短休息还是长休息
        if (completedPomodoros % settings.longBreakInterval === settings.longBreakInterval - 1) {
          setMode("longBreak")
          setTimeLeft(settings.longBreakDuration * 60)
        } else {
          setMode("shortBreak")
          setTimeLeft(settings.shortBreakDuration * 60)
        }

        // 如果设置了自动开始休息
        if (!settings.autoStartBreaks) {
          setIsActive(false)
        }
      } else {
        // 休息结束，回到工作模式
        setMode("work")
        setTimeLeft(settings.workDuration * 60)

        // 如果设置了自动开始番茄钟
        if (!settings.autoStartPomodoros) {
          setIsActive(false)
        }
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft, mode, completedPomodoros, settings, isMuted, currentTask, sessions])

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // 计算进度
  const calculateProgress = () => {
    let totalSeconds
    switch (mode) {
      case "work":
        totalSeconds = settings.workDuration * 60
        break
      case "shortBreak":
        totalSeconds = settings.shortBreakDuration * 60
        break
      case "longBreak":
        totalSeconds = settings.longBreakDuration * 60
        break
    }
    return ((totalSeconds - timeLeft) / totalSeconds) * 100
  }

  // 重置计时器
  const resetTimer = () => {
    setIsActive(false)
    switch (mode) {
      case "work":
        setTimeLeft(settings.workDuration * 60)
        break
      case "shortBreak":
        setTimeLeft(settings.shortBreakDuration * 60)
        break
      case "longBreak":
        setTimeLeft(settings.longBreakDuration * 60)
        break
    }
  }

  // 切换模式
  const switchMode = (newMode: "work" | "shortBreak" | "longBreak") => {
    setIsActive(false)
    setMode(newMode)
    switch (newMode) {
      case "work":
        setTimeLeft(settings.workDuration * 60)
        break
      case "shortBreak":
        setTimeLeft(settings.shortBreakDuration * 60)
        break
      case "longBreak":
        setTimeLeft(settings.longBreakDuration * 60)
        break
    }
  }

  // 保存设置
  const saveSettings = (newSettings: PomodoroSettings) => {
    setSettings(newSettings)
    resetTimer()
    setIsSettingsOpen(false)
  }

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">番茄钟</h1>
        <p className="text-muted-foreground">使用番茄工作法提高专注力和工作效率</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>专注时间</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="h-8 w-8">
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>番茄钟设置</DialogTitle>
                        <DialogDescription>自定义番茄钟的时间和行为</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="workDuration">工作时长 (分钟)</Label>
                            <Input
                              id="workDuration"
                              type="number"
                              min="1"
                              max="60"
                              value={settings.workDuration}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  workDuration: Number.parseInt(e.target.value) || 25,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="shortBreakDuration">短休息时长 (分钟)</Label>
                            <Input
                              id="shortBreakDuration"
                              type="number"
                              min="1"
                              max="30"
                              value={settings.shortBreakDuration}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  shortBreakDuration: Number.parseInt(e.target.value) || 5,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="longBreakDuration">长休息时长 (分钟)</Label>
                            <Input
                              id="longBreakDuration"
                              type="number"
                              min="1"
                              max="60"
                              value={settings.longBreakDuration}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  longBreakDuration: Number.parseInt(e.target.value) || 15,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="longBreakInterval">长休息间隔 (番茄钟数)</Label>
                            <Input
                              id="longBreakInterval"
                              type="number"
                              min="1"
                              max="10"
                              value={settings.longBreakInterval}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  longBreakInterval: Number.parseInt(e.target.value) || 4,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="alarmSound">提示音</Label>
                          <Select
                            value={settings.alarmSound}
                            onValueChange={(value) => setSettings({ ...settings, alarmSound: value })}
                          >
                            <SelectTrigger id="alarmSound">
                              <SelectValue placeholder="选择提示音" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bell">铃声</SelectItem>
                              <SelectItem value="digital">数字音</SelectItem>
                              <SelectItem value="nature">自然音</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="alarmVolume">音量</Label>
                            <span className="text-sm">{settings.alarmVolume}%</span>
                          </div>
                          <Slider
                            id="alarmVolume"
                            min={0}
                            max={100}
                            step={1}
                            value={[settings.alarmVolume]}
                            onValueChange={(value) => setSettings({ ...settings, alarmVolume: value[0] })}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="autoStartBreaks"
                            checked={settings.autoStartBreaks}
                            onCheckedChange={(checked) => setSettings({ ...settings, autoStartBreaks: checked })}
                          />
                          <Label htmlFor="autoStartBreaks">自动开始休息</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="autoStartPomodoros"
                            checked={settings.autoStartPomodoros}
                            onCheckedChange={(checked) => setSettings({ ...settings, autoStartPomodoros: checked })}
                          />
                          <Label htmlFor="autoStartPomodoros">自动开始番茄钟</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                          取消
                        </Button>
                        <Button onClick={() => saveSettings(settings)}>保存</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <div className="w-64 h-64 rounded-full border-8 border-muted relative mb-8">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-2">{formatTime(timeLeft)}</div>
                    <div className="text-lg font-medium text-muted-foreground capitalize">
                      {mode === "work" ? "专注工作" : mode === "shortBreak" ? "短休息" : "长休息"}
                    </div>
                  </div>
                </div>
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted stroke-muted"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray="289.02652413026095"
                    strokeDashoffset={289.02652413026095 * (1 - calculateProgress() / 100)}
                    className={cn(
                      "transition-all duration-1000 ease-linear",
                      mode === "work"
                        ? "text-primary stroke-primary"
                        : mode === "shortBreak"
                          ? "text-green-500 stroke-green-500"
                          : "text-blue-500 stroke-blue-500",
                    )}
                  />
                </svg>
              </div>

              <div className="flex items-center justify-center space-x-4 mb-8">
                <Button
                  variant={mode === "work" ? "default" : "outline"}
                  onClick={() => switchMode("work")}
                  className="w-28"
                >
                  专注
                </Button>
                <Button
                  variant={mode === "shortBreak" ? "default" : "outline"}
                  onClick={() => switchMode("shortBreak")}
                  className="w-28"
                >
                  短休息
                </Button>
                <Button
                  variant={mode === "longBreak" ? "default" : "outline"}
                  onClick={() => switchMode("longBreak")}
                  className="w-28"
                >
                  长休息
                </Button>
              </div>

              <div className="flex items-center justify-center space-x-4">
                <Button variant="outline" size="icon" onClick={resetTimer} className="h-12 w-12 rounded-full">
                  <RotateCcw className="h-6 w-6" />
                </Button>
                <Button
                  variant={isActive ? "destructive" : "default"}
                  size="icon"
                  onClick={() => setIsActive(!isActive)}
                  className="h-16 w-16 rounded-full"
                >
                  {isActive ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                </Button>
                <div className="h-12 w-12 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xl font-bold">{completedPomodoros}</div>
                    <div className="text-xs text-muted-foreground">完成</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <div className="w-full max-w-md">
                <Select value={currentTask} onValueChange={setCurrentTask} placeholder="选择要专注的任务">
                  <SelectTrigger>
                    <SelectValue placeholder="选择要专注的任务" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.title}>
                        <div className="flex items-center">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full mr-2",
                              task.priority === "high"
                                ? "bg-red-500"
                                : task.priority === "medium"
                                  ? "bg-amber-500"
                                  : "bg-green-500",
                            )}
                          />
                          {task.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>今日统计</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">完成番茄钟</div>
                  <div className="font-medium">{completedPomodoros}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">专注时间</div>
                  <div className="font-medium">
                    {Math.floor((completedPomodoros * settings.workDuration) / 60)} 小时{" "}
                    {(completedPomodoros * settings.workDuration) % 60} 分钟
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">完成任务</div>
                  <div className="font-medium">0</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>历史记录</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <Tabs defaultValue="today">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="today">今天</TabsTrigger>
                  <TabsTrigger value="week">本周</TabsTrigger>
                  <TabsTrigger value="month">本月</TabsTrigger>
                </TabsList>
                <TabsContent value="today" className="mt-4">
                  <div className="space-y-4">
                    {sessions
                      .filter((session) => {
                        const today = new Date()
                        return (
                          session.date.getDate() === today.getDate() &&
                          session.date.getMonth() === today.getMonth() &&
                          session.date.getFullYear() === today.getFullYear()
                        )
                      })
                      .map((session) => (
                        <div key={session.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{session.task}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {session.completedPomodoros} x {settings.workDuration}分钟
                            </span>
                          </div>
                        </div>
                      ))}
                    {sessions.filter((session) => {
                      const today = new Date()
                      return (
                        session.date.getDate() === today.getDate() &&
                        session.date.getMonth() === today.getMonth() &&
                        session.date.getFullYear() === today.getFullYear()
                      )
                    }).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">今天还没有完成的番茄钟</div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="week" className="mt-4">
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{session.task}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {session.completedPomodoros} x {settings.workDuration}分钟
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="month" className="mt-4">
                  <div className="text-center py-4 text-muted-foreground">没有足够的数据显示</div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>番茄工作法提示</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">1. 选择一个任务</h3>
                  <p className="text-sm text-muted-foreground">选择一个你想要完成的任务，设定明确的目标。</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">2. 设置番茄钟</h3>
                  <p className="text-sm text-muted-foreground">
                    设置25分钟的专注时间，在这段时间内只专注于选定的任务。
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">3. 专注工作</h3>
                  <p className="text-sm text-muted-foreground">在番茄钟期间，避免所有干扰，全身心投入工作。</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">4. 短暂休息</h3>
                  <p className="text-sm text-muted-foreground">
                    每完成一个番茄钟，休息5分钟。每完成4个番茄钟，休息15-30分钟。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
