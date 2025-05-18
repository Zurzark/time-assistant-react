"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { SkipForward, RefreshCw, Loader2, AlertCircle } from "lucide-react"
import { type Task as DBTask, ObjectStores, getAll, add as addTaskToDB } from "@/lib/db"
import { cn } from "@/lib/utils"

// --- SVG Icon Components ---

// Simple Tomato Icon for Title
const TomatoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-6 h-6 inline-block", className)}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 1.88.71 3.63 1.86 4.96.17.2.29.43.34.67L8 18c.21 1.1.69 2.08 1.35 2.85.65.77 1.51 1.15 2.65 1.15s2-.38 2.65-1.15c.66-.77 1.14-1.75 1.35-2.85l.79-3.37c.05-.24.17-.47.34-.67C18.29 12.63 19 10.88 19 9c0-3.87-3.13-7-7-7zm0 3c.83 0 1.5.67 1.5 1.5S12.83 8 12 8s-1.5-.67-1.5-1.5S11.17 5 12 5z" fill="#FF6347"/>
    <path d="M12 3c-.82 0-1.5.68-1.5 1.5S11.18 6 12 6s1.5-.68 1.5-1.5S12.82 3 12 3zm3.5 3c.28 0 .5.22.5.5s-.22.5-.5.5h-7c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h7z" fill="#32CD32"/>
  </svg>
);

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

// Complete (Harvested Tomato) Icon
const HarvestedTomatoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 1.88.71 3.63 1.86 4.96.17.2.29.43.34.67L8 18c.21 1.1.69 2.08 1.35 2.85.65.77 1.51 1.15 2.65 1.15s2-.38 2.65-1.15c.66-.77 1.14-1.75 1.35-2.85l.79-3.37c.05-.24.17-.47.34-.67C18.29 12.63 19 10.88 19 9c0-3.87-3.13-7-7-7zm0 3c.83 0 1.5.67 1.5 1.5S12.83 8 12 8s-1.5-.67-1.5-1.5S11.17 5 12 5z" fill="#FF6347"/>
    <path d="M10.5 15.5c-.13 0-.26-.05-.35-.15l-2.5-2.5c-.2-.2-.2-.51 0-.71s.51-.2.71 0l2.15 2.15 4.15-4.15c.2-.2.51-.2.71 0s.2.51 0 .71l-4.5 4.5c-.1.1-.23.15-.35.15z" fill="#32CD32" />
    <path d="M12 3c-.82 0-1.5.68-1.5 1.5S11.18 6 12 6s1.5-.68 1.5-1.5S12.82 3 12 3zm3.5 3c.28 0 .5.22.5.5s-.22.5-.5.5h-7c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h7z" fill="#32CD32"/>
  </svg>
);

// Individual Tomato for Pomodoro Counter
const PomodoroCounterIcon = ({ filled, className }: { filled: boolean, className?: string }) => (
  <svg viewBox="0 0 16 16" className={cn("w-6 h-6 transition-colors duration-300", className)}>
    <circle cx="8" cy="8" r="6.5" fill={filled ? "#FF6347" : "#E0E0E0"} stroke={filled ? "#D9534F" : "#BDBDBD"} strokeWidth="1"/>
    <path d="M8 2.5 A 1 1 0 0 1 8 4.5 A 1 1 0 0 1 8 2.5 M 6 4 L 10 4" stroke="#6A8A28" strokeWidth="0.8" fill="none"  />
  </svg>
);

export function PomodoroCard() {
  const [time, setTime] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)
  const [mode, setMode] = useState<"work" | "shortBreak" | "longBreak">("work")
  const [pomodoroCount, setPomodoroCount] = useState(0)
  
  const [dbTasks, setDbTasks] = useState<DBTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadTasksError, setLoadTasksError] = useState<string | null>(null);
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | number | null>(null);
  const [customTaskTitle, setCustomTaskTitle] = useState("")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [completedAnimation, setCompletedAnimation] = useState(false);

  // Thematic colors
  const themeColors = {
    work: {
      progress: "#FF6347", // Tomato Red
      text: "text-slate-700",
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

  const durations = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  }

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    setLoadTasksError(null);
    try {
      const allDbTasks = await getAll<DBTask>(ObjectStores.TASKS);
      const activeTasks = allDbTasks.filter(task => !task.completed && !task.isDeleted);
      setDbTasks(activeTasks);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      setLoadTasksError("无法加载任务列表。");
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

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
  }, [isActive, time]);

  const handleTimerComplete = () => {
    if(intervalRef.current) clearInterval(intervalRef.current!)
    setIsActive(false)

    // Trigger celebration for completing a work pomodoro
    if (mode === "work") {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      setCompletedAnimation(true);
      setTimeout(() => setCompletedAnimation(false), 1000); // Reset animation state

      if (newCount % 4 === 0) {
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

  const handleStartTimer = async () => {
    if (selectedTaskId === "new" && customTaskTitle.trim() !== "") {
      try {
        const newTaskData: Omit<DBTask, 'id'> = {
          title: customTaskTitle.trim(),
          completed: 0,
          isDeleted: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          priority: 'importantNotUrgent',
          isFrog: 0,
          isRecurring: 0,
        };
        const newTaskId = await addTaskToDB(ObjectStores.TASKS, newTaskData);
        if (newTaskId) {
          const newTaskForUI = { ...newTaskData, id: newTaskId } as DBTask;
          setDbTasks(prev => [newTaskForUI, ...prev]);
          setSelectedTaskId(newTaskId);
          setCustomTaskTitle("");
          setIsActive(true);
        } else {
          alert("创建新任务失败，请重试。");
        }
      } catch (error) {
        console.error("Error creating new task:", error);
        alert("创建新任务时出错。");
        return;
      }
    } else if (selectedTaskId && selectedTaskId !== "new") {
      setIsActive(true);
    } else if (!selectedTaskId && customTaskTitle.trim() === ""){
      alert("请选择一个任务或输入新任务名称。");
    } else if (customTaskTitle.trim() !== "") { // Allow starting with custom task not yet saved
      setIsActive(true);
    } else {
       alert("请选择一个任务或输入新任务名称。"); // Fallback if no task and no custom title
    }
  };

  const toggleTimer = () => {
    if (isActive) {
      setIsActive(false);
    } else {
      handleStartTimer();
    }
  };

  const resetTimer = () => {
    setIsActive(false)
    setTime(durations[mode])
  }

  const skipTimer = () => {
    handleTimerComplete(); 
  }

  const completePomodoroAction = () => {
    // handleTimerComplete already increments pomodoroCount and triggers animation for work mode.
    handleTimerComplete();
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleTaskSelect = (value: string) => {
    if (value === "new") {
      setSelectedTaskId("new");
    } else {
      setSelectedTaskId(Number(value));
      setCustomTaskTitle("");
    }
  }

  const handleCustomTaskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTaskTitle(e.target.value)
    if (e.target.value.trim() !== "" && selectedTaskId !== "new") {
        setSelectedTaskId("new");
    } else if (e.target.value.trim() === "" && selectedTaskId === "new"){
        // Optional: clear selectedTaskId or revert to placeholder if custom input is cleared
        // For now, keeps "new" selected until another task is chosen
    }
  }
  
  // Timer circle calculations
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = time === 0 ? 100 : (1 - time / durations[mode]) * 100; // Ensure progress is 100 when time is 0
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const currentTaskTitle = selectedTaskId === "new" 
    ? customTaskTitle 
    : dbTasks.find(t => t.id === selectedTaskId)?.title || "未选择任务";

  const timerStatusText = () => {
    switch (mode) {
      case "work": return "专注中...";
      case "shortBreak": return "小憩一下";
      case "longBreak": return "放松一下";
      default: return "工作时段";
    }
  };

  return (
    <Card className="shadow-lg overflow-hidden relative">
      <CardHeader className="pb-2 pt-3 bg-slate-50 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <TomatoIcon className="text-red-500 w-7 h-7" />
            <CardTitle className="text-xl font-sans font-semibold text-slate-700">番茄钟</CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500 pl-2">专注执行，高效工作</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4 pt-2 pb-4">
        {/* Timer Circle */}
        <div className="relative w-60 h-60">
          <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="5"
            />
            {/* Progress Circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={currentTheme.progress}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          {/* Timer Text */}
          <div className={cn(
            "absolute inset-0 flex flex-col items-center justify-center transition-colors duration-300",
            currentTheme.text
          )}>
            <span className="text-6xl font-bold tracking-tighter">
              {formatTime(time)}
            </span>
            <span className="text-s font-medium mt-1">
              {timerStatusText()}
            </span>
          </div>
        </div>

        {/* Pomodoro Counter Icons */}
        <div className="flex justify-center space-x-1.5 mb-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={cn("transform transition-transform duration-300", completedAnimation && i < pomodoroCount ? "animate-bounce-once" : "")}>
                <PomodoroCounterIcon filled={i < pomodoroCount} className="w-5 h-5" />
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

        {/* Task Selection */}
        <div className="w-full max-w-xs space-y-2 mb-6">
          <p className="text-sm font-medium text-slate-600">
            当前任务: <span className={cn("font-semibold", currentTheme.text)}>{currentTaskTitle}</span>
          </p>
          {loadingTasks ? (
            <div className="flex items-center justify-center h-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : loadTasksError ? (
            <div className="flex items-center justify-center h-10 text-red-500">
              <AlertCircle className="h-5 w-5 mr-2" /> {loadTasksError}
            </div>
          ) : (
            <Select 
                value={selectedTaskId === "new" ? "new" : selectedTaskId?.toString() || ""} 
                onValueChange={handleTaskSelect}
            >
              <SelectTrigger 
                className={cn(
                  "w-full transition-colors duration-200",
                  "focus:border-transparent focus:ring-2",
                  mode === "work" ? "focus:ring-red-400 border-slate-300" : "focus:ring-green-400 border-slate-300",
                  "data-[state=open]:ring-2",
                  mode === "work" ? "data-[state=open]:ring-red-400" : "data-[state=open]:ring-green-400"
                )}
              >
                <SelectValue placeholder="选择任务或创建新任务" />
              </SelectTrigger>
              <SelectContent>
                {dbTasks.map((task) => (
                  <SelectItem key={task.id} value={String(task.id!)}>
                    {task.title}
                  </SelectItem>
                ))}
                <SelectItem value="new">+ 创建新任务</SelectItem>
              </SelectContent>
            </Select>
          )}

          {selectedTaskId === "new" && (
            <Input 
              placeholder="输入新任务名称" 
              value={customTaskTitle} 
              onChange={handleCustomTaskChange} 
              className={cn(
                "mt-2 transition-colors duration-200",
                "focus:border-transparent focus:ring-2",
                 mode === "work" ? "focus:ring-red-400 border-slate-300" : "focus:ring-green-400 border-slate-300"
              )} 
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2 p-3 bg-slate-50 border-t border-slate-200">
        <div className="flex space-x-2">
          <Button 
            variant="default"
            size="sm" 
            onClick={toggleTimer} 
            disabled={loadingTasks && !isActive && !(selectedTaskId === 'new' && customTaskTitle.trim() !== '')}
            className={cn(
                "min-w-[80px] text-white transition-all duration-300 transform active:scale-95",
                isActive 
                    ? (mode === "work" ? "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500" : "bg-teal-500 hover:bg-teal-600 focus-visible:ring-teal-500")
                    : currentTheme.button
            )}
          >
            {isActive ? <PauseIcon className="mr-1.5" /> : <PlayIcon className="mr-1.5" />}
            {isActive ? "暂停" : "开始"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={completePomodoroAction} 
            disabled={loadingTasks || (isActive && mode !== 'work') || (!isActive && mode !=='work')}
            className={cn(
                "min-w-[80px] transition-all duration-300 transform active:scale-95",
                 currentTheme.buttonOutline,
                 mode !== 'work' ? "opacity-50 cursor-not-allowed" : ""
            )}
          >
            <HarvestedTomatoIcon className="mr-1.5" />
            完成
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-slate-600 hover:bg-slate-200 transition-colors duration-200 transform active:scale-90" 
            onClick={skipTimer} 
            disabled={loadingTasks && !isActive}
            title="跳过当前"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-slate-600 hover:bg-slate-200 transition-colors duration-200 transform active:scale-90" 
            onClick={resetTimer} 
            disabled={isActive || loadingTasks}
            title="重置"
          > 
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export default PomodoroCard
