"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Play, Pause, SkipForward, RefreshCw, CheckCircle2 } from "lucide-react"

export function PomodoroCard() {
  const [time, setTime] = useState(25 * 60) // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false)
  const [mode, setMode] = useState<"work" | "shortBreak" | "longBreak">("work")
  const [pomodoroCount, setPomodoroCount] = useState(0)
  const [selectedTask, setSelectedTask] = useState("")
  const [customTask, setCustomTask] = useState("")
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
  ]

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

  const handleTaskSelect = (value: string) => {
    if (value === "new") {
      setSelectedTask("")
    } else {
      setSelectedTask(value)
      setCustomTask("")
    }
  }

  const handleCustomTaskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTask(e.target.value)
    setSelectedTask("")
  }

  // Calculate progress percentage for the circle
  const progress = (1 - time / durations[mode]) * 100
  const circumference = 2 * Math.PI * 45 // 45 is the radius of the circle
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">番茄钟</CardTitle>
        <CardDescription>专注执行，高效工作</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {/* Timer Circle */}
        <div className="relative w-40 h-40 mb-4">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="5" />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={mode === "work" ? "#3b82f6" : mode === "shortBreak" ? "#10b981" : "#8b5cf6"}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            {/* Timer text */}
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="16"
              fontWeight="bold"
              fill="currentColor"
            >
              {formatTime(time)}
            </text>
            {/* Mode indicator */}
            <text x="50" y="65" textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="currentColor">
              {mode === "work" ? "工作时段" : mode === "shortBreak" ? "短休息" : "长休息"}
            </text>
          </svg>
          <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-muted-foreground">
            🍅 {pomodoroCount}/4
          </div>
        </div>

        {/* Task Selection */}
        <div className="w-full space-y-2 mb-4">
          <p className="text-sm font-medium">
            当前任务: {selectedTask ? tasks.find((t) => t.id === selectedTask)?.title : customTask || "未选择任务"}
          </p>
          <Select value={selectedTask} onValueChange={handleTaskSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择任务" />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>
              ))}
              <SelectItem value="new">创建新任务</SelectItem>
            </SelectContent>
          </Select>

          {!selectedTask && (
            <Input placeholder="输入新任务名称" value={customTask} onChange={handleCustomTaskChange} className="mt-2" />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={toggleTimer}>
            {isActive ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {isActive ? "暂停" : "开始"}
          </Button>
          <Button variant="outline" size="sm" onClick={completePomodoro}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            完成
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipTimer}>
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetTimer}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export default PomodoroCard
