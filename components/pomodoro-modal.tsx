"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipForward, RefreshCw, CheckCircle2, Volume2, VolumeX, Maximize2 } from "lucide-react"

interface PomodoroModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTask: { id: string; title: string } | null
}

export function PomodoroModal({ open, onOpenChange, initialTask }: PomodoroModalProps) {
  const [time, setTime] = useState(25 * 60) // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false)
  const [mode, setMode] = useState<"work" | "shortBreak" | "longBreak">("work")
  const [pomodoroCount, setPomodoroCount] = useState(0)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState(50)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Duration settings
  const durations = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  }

  // Sample tasks
  const tasks = [
    { id: "1", title: "完成产品设计方案" },
    { id: "2", title: "回复客户邮件" },
    { id: "3", title: "准备周会演示文稿" },
    { id: "4", title: "更新项目文档" },
    { id: "5", title: "准备财务报表" },
    { id: "6", title: "安排团队建设活动" },
  ]

  // Set initial task when modal opens
  useEffect(() => {
    if (initialTask) {
      setSelectedTask(initialTask.id)
    }
  }, [initialTask])

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTime((prevTime) => {
          if (prevTime <= 1) {
            handleTimerComplete()
            return 0
          }
          return prevTime - 1
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isActive])

  const handleTimerComplete = () => {
    clearInterval(intervalRef.current!)
    setIsActive(false)

    // Play sound if enabled
    if (soundEnabled) {
      // In a real implementation, we would play a sound here
      console.log("Playing completion sound")
    }

    if (mode === "work") {
      // Increment pomodoro count
      const newCount = pomodoroCount + 1
      setPomodoroCount(newCount)

      // After 4 pomodoros, take a long break
      if (newCount % 4 === 0) {
        setMode("longBreak")
        setTime(durations.longBreak)
      } else {
        setMode("shortBreak")
        setTime(durations.shortBreak)
      }
    } else {
      // After break, go back to work mode
      setMode("work")
      setTime(durations.work)
    }
  }

  const toggleTimer = () => {
    setIsActive(!isActive)
  }

  const resetTimer = () => {
    setIsActive(false)
    setTime(durations[mode])
  }

  const skipTimer = () => {
    setIsActive(false)
    if (mode === "work") {
      if ((pomodoroCount + 1) % 4 === 0) {
        setMode("longBreak")
        setTime(durations.longBreak)
      } else {
        setMode("shortBreak")
        setTime(durations.shortBreak)
      }
      setPomodoroCount(pomodoroCount + 1)
    } else {
      setMode("work")
      setTime(durations.work)
    }
  }

  const completePomodoro = () => {
    setIsActive(false)
    if (mode === "work") {
      setPomodoroCount(pomodoroCount + 1)
      if ((pomodoroCount + 1) % 4 === 0) {
        setMode("longBreak")
        setTime(durations.longBreak)
      } else {
        setMode("shortBreak")
        setTime(durations.shortBreak)
      }
    } else {
      setMode("work")
      setTime(durations.work)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Calculate progress percentage for the circle
  const progress = (1 - time / durations[mode]) * 100
  const circumference = 2 * Math.PI * 60 // 60 is the radius of the circle
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-md ${focusMode ? "sm:max-w-2xl" : ""}`}>
        <DialogHeader>
          <DialogTitle>专注计时</DialogTitle>
          <DialogDescription>使用番茄工作法提高工作效率</DialogDescription>
        </DialogHeader>

        <div className={`flex flex-col items-center ${focusMode ? "py-8" : "py-4"}`}>
          {/* Task Display */}
          <div className="w-full mb-4">
            <p className="text-sm font-medium mb-2">当前任务:</p>
            <Select value={selectedTask || ""} onValueChange={setSelectedTask}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择任务" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timer Circle */}
          <div className={`relative ${focusMode ? "w-60 h-60" : "w-48 h-48"} mb-6`}>
            <svg className="w-full h-full" viewBox="0 0 130 130">
              {/* Background circle */}
              <circle cx="65" cy="65" r="60" fill="none" stroke="#e2e8f0" strokeWidth="6" />
              {/* Progress circle */}
              <circle
                cx="65"
                cy="65"
                r="60"
                fill="none"
                stroke={mode === "work" ? "#3b82f6" : mode === "shortBreak" ? "#10b981" : "#8b5cf6"}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 65 65)"
              />
              {/* Timer text */}
              <text
                x="65"
                y="65"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="24"
                fontWeight="bold"
                fill="currentColor"
              >
                {formatTime(time)}
              </text>
              {/* Mode indicator */}
              <text x="65" y="85" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="currentColor">
                {mode === "work" ? "工作时段" : mode === "shortBreak" ? "短休息" : "长休息"}
              </text>
            </svg>
            <div className="absolute bottom-0 left-0 right-0 text-center text-sm text-muted-foreground">
              🍅 第 {pomodoroCount}/4 个番茄钟
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center space-x-4 mb-6">
            <Button variant="outline" onClick={toggleTimer} className="flex items-center">
              {isActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isActive ? "暂停" : "开始"}
            </Button>
            <Button variant="outline" onClick={completePomodoro} className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              完成此轮
            </Button>
            <Button variant="ghost" size="icon" onClick={skipTimer}>
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={resetTimer}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Focus Mode & Sound Controls */}
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Maximize2 className="h-4 w-4" />
                <Label htmlFor="focus-mode">专注模式</Label>
              </div>
              <Switch id="focus-mode" checked={focusMode} onCheckedChange={setFocusMode} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                <Label htmlFor="sound-enabled">声音提示</Label>
              </div>
              <Switch id="sound-enabled" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>

            {soundEnabled && (
              <div className="flex items-center space-x-4">
                <Label htmlFor="volume" className="w-20">
                  音量: {volume}%
                </Label>
                <Slider
                  id="volume"
                  min={0}
                  max={100}
                  step={1}
                  value={[volume]}
                  onValueChange={(value) => setVolume(value[0])}
                  className="flex-1"
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PomodoroModal
