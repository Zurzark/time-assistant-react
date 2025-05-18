"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Play, Pause, SkipForward, RefreshCw, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { type Task as DBTask, ObjectStores, getAll, add as addTaskToDB } from "@/lib/db"
import { cn } from "@/lib/utils"

export function PomodoroCard() {
  const [time, setTime] = useState(25 * 60) // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false)
  const [mode, setMode] = useState<"work" | "shortBreak" | "longBreak">("work")
  const [pomodoroCount, setPomodoroCount] = useState(0)
  
  const [dbTasks, setDbTasks] = useState<DBTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadTasksError, setLoadTasksError] = useState<string | null>(null);
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | number | null>(null); // Can be number from DB or string for "new"
  const [customTaskTitle, setCustomTaskTitle] = useState("")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Duration settings
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
      // Filter for tasks that are not completed and not deleted
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

    if (mode === "work") {
      const newCount = pomodoroCount + 1
      setPomodoroCount(newCount)
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
          priority: 'importantNotUrgent', // Default priority
          isFrog: 0,
          isRecurring: 0, // Added default for isRecurring
          // other fields can have defaults or be undefined if optional in DBTask
        };
        const newTaskId = await addTaskToDB(ObjectStores.TASKS, newTaskData);
        if (newTaskId) {
          // Add to local list and select it
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
        return; // Don't start timer if task creation failed
      }
    } else if (selectedTaskId && selectedTaskId !== "new") {
      setIsActive(true);
    } else if (!selectedTaskId && customTaskTitle.trim() === ""){
      alert("请选择一个任务或输入新任务名称。");
    } else {
      setIsActive(true); // For custom task not yet saved, or if no task is strictly required
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

  const completePomodoro = () => {
    if (mode === "work") {
        setPomodoroCount(pomodoroCount + 1); 
    }
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
    if (selectedTaskId !== "new") {
        setSelectedTaskId("new");
    }
  }

  const progress = (1 - time / durations[mode]) * 100
  const circumference = 2 * Math.PI * 45 
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const currentTaskTitle = selectedTaskId === "new" 
    ? customTaskTitle 
    : dbTasks.find(t => t.id === selectedTaskId)?.title || "未选择任务";

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
            当前任务: {currentTaskTitle}
          </p>
          {loadingTasks ? (
            <div className="flex items-center justify-center h-10">
              <Loader2 className="h-5 w-5 animate-spin" />
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
              <SelectTrigger className="w-full">
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
              className="mt-2" 
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={toggleTimer} disabled={loadingTasks && !isActive}>
            {isActive ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {isActive ? "暂停" : "开始"}
          </Button>
          <Button variant="outline" size="sm" onClick={completePomodoro} disabled={!isActive && mode !== 'work' && loadingTasks}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            完成
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipTimer} disabled={loadingTasks && !isActive}>
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetTimer} disabled={loadingTasks && isActive}> 
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export default PomodoroCard
