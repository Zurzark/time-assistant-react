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
import { cn } from "@/lib/utils"

// --- 从 pomodoro-card.tsx 借鉴或重新定义的 SVG Icon Components ---
// Play Icon
const PlayIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-5 h-5", className)}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

// Pause Icon
const PauseIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-5 h-5", className)}>
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

// HarvestedTomatoIcon (类似 pomodoro-card.tsx 中的完成图标)
const HarvestedTomatoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 1.88.71 3.63 1.86 4.96.17.2.29.43.34.67L8 18c.21 1.1.69 2.08 1.35 2.85.65.77 1.51 1.15 2.65 1.15s2-.38 2.65-1.15c.66-.77 1.14-1.75 1.35-2.85l.79-3.37c.05-.24.17-.47.34-.67C18.29 12.63 19 10.88 19 9c0-3.87-3.13-7-7-7zm0 3c.83 0 1.5.67 1.5 1.5S12.83 8 12 8s-1.5-.67-1.5-1.5S11.17 5 12 5z" fill="#FF6347"/>
    <path d="M10.5 15.5c-.13 0-.26-.05-.35-.15l-2.5-2.5c-.2-.2-.2-.51 0-.71s.51-.2.71 0l2.15 2.15 4.15-4.15c.2-.2.51-.2.71 0s.2.51 0 .71l-4.5 4.5c-.1.1-.23.15-.35.15z" fill="#32CD32" />
    <path d="M12 3c-.82 0-1.5.68-1.5 1.5S11.18 6 12 6s1.5-.68 1.5-1.5S12.82 3 12 3zm3.5 3c.28 0 .5.22.5.5s-.22.5-.5.5h-7c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h7z" fill="#32CD32"/>
  </svg>
);

// Individual Tomato for Pomodoro Counter (从 pomodoro-card.tsx)
const PomodoroCounterIcon = ({ filled, className }: { filled: boolean, className?: string }) => (
  <svg viewBox="0 0 16 16" className={cn("w-6 h-6 transition-colors duration-300", className)}>
    <circle cx="8" cy="8" r="6.5" fill={filled ? "#FF6347" : "#E0E0E0"} stroke={filled ? "#D9534F" : "#BDBDBD"} strokeWidth="1"/>
    <path d="M8 2.5 A 1 1 0 0 1 8 4.5 A 1 1 0 0 1 8 2.5 M 6 4 L 10 4" stroke="#6A8A28" strokeWidth="0.8" fill="none"  />
  </svg>
);

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
  const [completedAnimation, setCompletedAnimation] = useState(false) // For pomodoro counter animation
  
  const [dbTasks, setDbTasks] = useState<DBTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [loadTasksError, setLoadTasksError] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

  const [focusMode, setFocusMode] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState(50)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Thematic colors (从 pomodoro-card.tsx)
  const themeColors = {
    work: {
      progress: "#FF6347", // Tomato Red
      text: "text-slate-700", //保持暗色系文本以便在亮色背景下可读
      button: "bg-red-500 hover:bg-red-600 focus-visible:ring-red-500",
      buttonOutline: "border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 focus-visible:ring-red-500"
    },
    shortBreak: {
      progress: "#90EE90", // Light Green
      text: "text-green-700",
      button: "bg-green-500 hover:bg-green-600 focus-visible:ring-green-500",
      buttonOutline: "border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600 focus-visible:ring-green-500"
    },
    longBreak: {
      progress: "#7CFC00", // Lime Green
      text: "text-emerald-700",
      button: "bg-emerald-500 hover:bg-emerald-600 focus-visible:ring-emerald-500",
      buttonOutline: "border-emerald-500 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 focus-visible:ring-emerald-500"
    }
  };
  const currentTheme = themeColors[mode];

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
            handleTimerCompleteLogic()
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

  const handleTimerCompleteLogic = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current!)
    setIsActive(false)

    if (soundEnabled) {
      console.log("Playing completion sound (simulated for modal)")
      // 실제 프로덕션에서는 여기에 오디오 재생 로직 추가
    }

    if (mode === "work") {
      const newCount = pomodoroCount + 1
      setPomodoroCount(newCount)
      setCompletedAnimation(true)
      setTimeout(() => setCompletedAnimation(false), 1000)

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
            console.error("Failed to log pomodoro session in modal:", error)
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
              console.error("Failed to update task actual pomodoros in modal:", error)
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
    if (!selectedTaskId && dbTasks.length > 0 && !loadingTasks) {
      alert("请先选择一个任务。")
      return
    }
    if (!selectedTaskId && dbTasks.length === 0 && !loadingTasks) {
      alert("没有可用的任务开始番茄钟。请先创建或选择一个任务。")
      return
    }
    setIsActive(!isActive)
  }

  const resetTimerLogic = () => {
    setIsActive(false)
    setTime(durations[mode])
  }

  const skipTimerLogic = () => {
    handleTimerCompleteLogic()
  }

  const completePomodoroAction = () => {
    handleTimerCompleteLogic()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const timerStatusText = () => {
    switch (mode) {
      case "work": return "专注中...";
      case "shortBreak": return "小憩一下";
      case "longBreak": return "放松一下";
      default: return "准备";
    }
  }

  const radius = focusMode ? 65 : 50;
  const circumference = 2 * Math.PI * radius;
  const timerProgress = Math.max(0, Math.min(100, (1 - time / durations[mode]) * 100));
  const strokeDashoffset = circumference - (timerProgress / 100) * circumference;

  const selectedTaskDetails = dbTasks.find(task => task.id === selectedTaskId)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen)
      if (!isOpen && isActive) {
        setIsActive(false) // Stop timer if modal is closed
      }
    }}>
      <DialogContent className={`sm:max-w-md ${focusMode ? "sm:max-w-xl md:sm:max-w-2xl" : ""} transition-all duration-300 ease-in-out`}>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold">专注计时</DialogTitle>
          {!focusMode && <DialogDescription className="text-center">使用番茄工作法提高工作效率。</DialogDescription>}
        </DialogHeader>

        <div className={`flex flex-col items-center ${focusMode ? "py-10 px-6" : "py-6 px-4"} space-y-6`}>
          {!focusMode && (
            <div className="w-full max-w-xs">
              <p className="text-sm font-medium text-slate-600 mb-1 text-center">
                当前任务: <span className={cn("font-semibold", currentTheme.text)}>{dbTasks.find(t => t.id === selectedTaskId)?.title || "未选择任务"}</span>
              </p>
              {loadingTasks ? (
                <div className="flex items-center justify-center h-10"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
              ) : loadTasksError ? (
                <div className="flex items-center justify-center h-10 text-red-500"><AlertCircle className="h-5 w-5 mr-2" /> {loadTasksError}</div>
              ) : (
                <Select 
                  value={selectedTaskId?.toString() || ""} 
                  onValueChange={(value) => setSelectedTaskId(value ? Number(value) : null)}
                >
                  <SelectTrigger className={cn("w-full", mode === "work" ? "focus:ring-red-400 border-slate-300" : "focus:ring-green-400 border-slate-300")}>
                    <SelectValue placeholder="选择或切换任务" />
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
          )}

          <div className={`relative ${focusMode ? "w-72 h-72" : "w-56 h-56"}`}> 
            <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100"> 
              <circle cx="50" cy="50" r="45" fill="none" stroke="#E5E7EB" strokeWidth="5" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={currentTheme.progress}
                strokeWidth="6" 
                strokeDasharray={2 * Math.PI * 45} 
                strokeDashoffset={(2 * Math.PI * 45) - (timerProgress / 100) * (2 * Math.PI * 45)}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className={cn("absolute inset-0 flex flex-col items-center justify-center", currentTheme.text)}>
              <span className={`font-bold tracking-tighter ${focusMode ? "text-7xl" : "text-6xl"}`}>
                {formatTime(time)}
              </span>
              <span className={`font-medium mt-1 ${focusMode ? "text-lg" : "text-sm"}`}>
                {timerStatusText()}
              </span>
            </div>
          </div>
          
          <div className="flex justify-center space-x-1.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={cn("transform transition-transform duration-300", completedAnimation && i < pomodoroCount ? "animate-bounce-once" : "")}>
                  <PomodoroCounterIcon filled={i < pomodoroCount} className={focusMode ? "w-7 h-7" : "w-5 h-5"} />
              </div>
            ))}
          </div>
          <style jsx global>{`
            @keyframes bounce-once {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
            .animate-bounce-once {
              animation: bounce-once 0.5s ease-in-out;
            }
          `}</style>

          <div className={`flex items-center ${focusMode ? "space-x-6" : "space-x-3"}`}>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-11 w-11 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700", focusMode ? "h-14 w-14" : "")}
              onClick={resetTimerLogic}
              disabled={isActive || loadingTasks}
              title="重置"
            >
              <RefreshCw className={focusMode ? "h-7 w-7" : "h-5 w-5"} />
            </Button>
            <Button
              variant="default"
              size="lg" 
              onClick={toggleTimer}
              disabled={loadingTasks && (!selectedTaskId || selectedTaskId === null)}
              className={cn(
                "min-w-[100px] text-white transition-all duration-300 transform active:scale-95 rounded-full",
                focusMode ? "h-20 w-20 text-lg px-4 py-2" : "h-16 w-16", 
                isActive
                    ? (mode === "work" ? "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500" : "bg-teal-500 hover:bg-teal-600 focus-visible:ring-teal-500") 
                    : currentTheme.button 
              )}
            >
              {isActive ? <PauseIcon className={focusMode ? "h-8 w-8" : "h-6 w-6"} /> : <PlayIcon className={focusMode ? "h-8 w-8" : "h-6 w-6"} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-11 w-11 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700", focusMode ? "h-14 w-14" : "")}
              onClick={skipTimerLogic}
              disabled={!isActive && !time} 
              title="跳过当前"
            >
              <SkipForward className={focusMode ? "h-7 w-7" : "h-5 w-5"} />
            </Button>
          </div>
          
          {mode === 'work' && (
            <Button
                variant="outline"
                size="sm"
                onClick={completePomodoroAction}
                disabled={loadingTasks || (!isActive && time === durations.work ) } 
                className={cn(
                    "min-w-[100px] transition-all duration-300 transform active:scale-95 mt-3",
                    currentTheme.buttonOutline,
                    focusMode ? "py-3 px-5 text-base" : ""
                )}
              >
                <HarvestedTomatoIcon className={cn("mr-1.5", focusMode ? "w-5 h-5" : "w-4 h-4")} />
                完成此轮
            </Button>
          )}

          {!focusMode && (
            <div className="w-full max-w-xs space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Maximize2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  <Label htmlFor="focus-mode" className="text-slate-700 dark:text-slate-300">专注模式</Label>
                </div>
                <Switch id="focus-mode" checked={focusMode} onCheckedChange={setFocusMode} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {soundEnabled ? <Volume2 className="h-5 w-5 text-slate-600 dark:text-slate-400" /> : <VolumeX className="h-5 w-5 text-slate-600 dark:text-slate-400" />}
                  <Label htmlFor="sound-enabled" className="text-slate-700 dark:text-slate-300">声音提示</Label>
                </div>
                <Switch id="sound-enabled" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
              {soundEnabled && (
                <div className="space-y-1">
                   <div className="flex items-center justify-between">
                    <Label htmlFor="volume" className="text-sm text-slate-600 dark:text-slate-400">音量</Label>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{volume}%</span>
                  </div>
                  <Slider
                    id="volume"
                    min={0} max={100} step={1}
                    value={[volume]}
                    onValueChange={(value) => setVolume(value[0])}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PomodoroModal
