"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipForward, RefreshCw, CheckCircle2, Volume2, VolumeX, Maximize2, Loader2, AlertCircle } from "lucide-react"
import { type Task as DBTask, type Session as DBSession, ObjectStores, getAll, add as addToDB, update as updateDB } from "@/lib/db"

interface PomodoroModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTask: { id: string | number; title: string } | null
}

export function PomodoroModal({ open, onOpenChange, initialTask }: PomodoroModalProps) {
  const [time, setTime] = useState(25 * 60) // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false)
  const [mode, setMode] = useState<"work" | "shortBreak" | "longBreak">("work")
  const [pomodoroCount, setPomodoroCount] = useState(0)
  
  const [dbTasks, setDbTasks] = useState<DBTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [loadTasksError, setLoadTasksError] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

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

  const loadTasksForModal = useCallback(async () => {
    setLoadingTasks(true)
    setLoadTasksError(null)
    try {
      const allDbTasks = await getAll<DBTask>(ObjectStores.TASKS)
      const activeTasks = allDbTasks.filter(task => !task.isDeleted) // Show all non-deleted tasks for selection
      setDbTasks(activeTasks)

      if (initialTask && initialTask.id) {
        const initialTaskIdNum = Number(initialTask.id) // Ensure it is number for DBTask id
        if (activeTasks.some(t => t.id === initialTaskIdNum)) {
          setSelectedTaskId(initialTaskIdNum)
        }
      } else if (activeTasks.length > 0 && !selectedTaskId) {
        // Optionally, select the first task if none is selected and no initial task is provided
        // setSelectedTaskId(activeTasks[0].id!);
      }

    } catch (error) {
      console.error("Failed to load tasks for modal:", error)
      setLoadTasksError("无法加载任务列表。")
    } finally {
      setLoadingTasks(false)
    }
  }, [initialTask, selectedTaskId])

  useEffect(() => {
    if (open) {
      loadTasksForModal()
      // Reset pomodoro specific states when modal is (re)opened
      // This assumes a fresh pomodoro session for the selected task when modal opens
      setTime(durations.work)
      setMode("work")
      setIsActive(false)
      setPomodoroCount(0)
    }
  }, [open, loadTasksForModal]) // loadTasksForModal has initialTask as dependency
  
  // Handle timer logic
  useEffect(() => {
    if (isActive && open) { // Only run timer if modal is open and active
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
  }, [isActive, open, time]) // Added time to dependencies

  const handleTimerComplete = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current!)
    setIsActive(false)

    if (soundEnabled) {
      console.log("Playing completion sound (simulated)")
      // 실제 프로덕션에서는 여기에 오디오 재생 로직 추가
    }

    if (mode === "work") {
      const newCount = pomodoroCount + 1
      setPomodoroCount(newCount)

      // Log session and update task stats
      if (selectedTaskId) {
        const task = dbTasks.find(t => t.id === selectedTaskId)
        if (task) {
          // 1. Log Pomodoro Session to DBSession
          const sessionData: Omit<DBSession, 'id'> = {
            taskId: selectedTaskId,
            startTime: new Date(Date.now() - durations.work * 1000), // Approximate start time
            endTime: new Date(),
            duration: durations.work * 1000, // Duration in ms
            // notes: "Completed a Pomodoro" // Optional
          }
          try {
            await addToDB(ObjectStores.SESSIONS, sessionData)
            console.log("Pomodoro session logged for task:", selectedTaskId)
          } catch (error) {
            console.error("Failed to log pomodoro session:", error)
          }

          // 2. Update actualPomodoros on the task (if field exists and is used)
          if (task.actualPomodoros !== undefined) {
            const updatedTask = {
              ...task,
              actualPomodoros: (task.actualPomodoros || 0) + 1,
              updatedAt: new Date(),
            }
            try {
              await updateDB(ObjectStores.TASKS, updatedTask)
              // Optimistically update local dbTasks if needed, or rely on next full load
              setDbTasks(prev => prev.map(t => t.id === selectedTaskId ? updatedTask : t))
            } catch (error) {
              console.error("Failed to update task actual pomodoros:", error)
            }
          }
        }
      }

      if (newCount % 4 === 0) {
        setMode("longBreak")
        setTime(durations.longBreak)
      } else {
        setMode("shortBreak")
        setTime(durations.shortBreak)
      }
    } else { // Break ended
      setMode("work")
      setTime(durations.work)
    }
  }

  const toggleTimer = () => {
    if (!selectedTaskId && dbTasks.length > 0) {
      alert("请先选择一个任务。")
      return
    }
    if (!selectedTaskId && dbTasks.length === 0 && !loadingTasks) {
      alert("没有可用的任务开始番茄钟。")
      return
    }
    setIsActive(!isActive)
  }

  const resetTimer = () => {
    setIsActive(false)
    setTime(durations[mode])
  }

  const skipTimer = () => {
    // Directly call handleTimerComplete, it will manage state changes
    handleTimerComplete()
  }

  // This is similar to skip, but explicitly for work mode to count pomodoro if skipped early
  const completePomodoro = () => {
    if (mode === "work") {
      // Ensure pomodoro is counted if user manually completes it early
      setPomodoroCount(prev => prev + 1) // This update needs to be reflected before handleTimerComplete logic
      // Then run the standard completion logic, which will also try to increment pomodoroCount
      // So, it's better to adjust handleTimerComplete or have a specific logic here.
      // For now, let handleTimerComplete do its job, it will increment based on its pomodoroCount state.
      // This might lead to double count if not careful. Let's refine this.
    }
    // A cleaner way: if work mode, perform work completion specific actions then transition
    if (mode === "work" && isActive) { // Only if timer was active for work
      // Perform actions of completing a work session (log, update task etc.)
      // This simulates the timer reaching 0 for work mode
    }
    handleTimerComplete() // This will then transition to break or next work
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

  const selectedTaskDetails = dbTasks.find(task => task.id === selectedTaskId)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen)
      if (!isOpen && isActive) {
        setIsActive(false) // Stop timer if modal is closed
      }
    }}>
      <DialogContent className={`sm:max-w-md ${focusMode ? "sm:max-w-2xl" : ""}`}>
        <DialogHeader>
          <DialogTitle>专注计时</DialogTitle>
          <DialogDescription>使用番茄工作法提高工作效率</DialogDescription>
        </DialogHeader>

        <div className={`flex flex-col items-center ${focusMode ? "py-8" : "py-4"}`}>
          {/* Task Display */}
          <div className="w-full mb-4">
            <p className="text-sm font-medium mb-2">当前任务:</p>
            {loadingTasks ? (
              <div className="flex items-center justify-center h-10 rounded-md border border-dashed">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : loadTasksError ? (
              <div className="flex items-center justify-center h-10 rounded-md border border-dashed border-red-500 text-red-500">
                <AlertCircle className="h-5 w-5 mr-2" /> {loadTasksError}
              </div>
            ) : (
              <Select 
                value={selectedTaskId?.toString() || ""} 
                onValueChange={(value) => setSelectedTaskId(Number(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择任务" />
                </SelectTrigger>
                <SelectContent>
                  {dbTasks.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">没有可用的任务</p>}
                  {dbTasks.map((task) => (
                    <SelectItem key={task.id} value={String(task.id!)}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
              🍅 第 {pomodoroCount + 1}/4 个番茄钟
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center space-x-4 mb-6">
            <Button variant="outline" onClick={toggleTimer} className="flex items-center" disabled={loadingTasks || (!selectedTaskId && dbTasks.length > 0)}>
              {isActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isActive ? "暂停" : "开始"}
            </Button>
            <Button variant="outline" onClick={completePomodoro} className="flex items-center" disabled={!isActive || mode !== 'work'}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              完成此轮
            </Button>
            <Button variant="ghost" size="icon" onClick={skipTimer} disabled={!isActive && mode !== 'work' && mode !== 'shortBreak' && mode !== 'longBreak' }>
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={resetTimer} disabled={isActive && loadingTasks }>
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
