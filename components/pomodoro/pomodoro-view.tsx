"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { CheckCircle2, Clock, Pause, Play, RotateCcw, Settings, Volume2, VolumeX, Loader2, AlertCircle, SkipForward, RefreshCw as RefreshCwIcon } from "lucide-react"
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
import { type Task as DBTask, type Session as DBSession, ObjectStores, getAll, add as addToDB, update as updateDB, get as getFromDB } from "@/lib/db"

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

interface UIPomodoroSession extends DBSession {
    id: number;
    taskTitle?: string;
}

const POMODORO_SETTINGS_KEY = "pomodoroSettings_v1";

const PlayIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-5 h-5", className)}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-5 h-5", className)}>
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const PomodoroCounterIcon = ({ filled, className }: { filled: boolean, className?: string }) => (
    <svg viewBox="0 0 16 16" className={cn("w-6 h-6 transition-colors duration-300", className)}>
      <circle cx="8" cy="8" r="6.5" fill={filled ? "#FF6347" : "#E0E0E0"} stroke={filled ? "#D9534F" : "#BDBDBD"} strokeWidth="1"/>
      <path d="M8 2.5 A 1 1 0 0 1 8 4.5 A 1 1 0 0 1 8 2.5 M 6 4 L 10 4" stroke="#6A8A28" strokeWidth="0.8" fill="none"  />
    </svg>
  );

export function PomodoroView() {
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    if (typeof window !== 'undefined') {
        const savedSettings = localStorage.getItem(POMODORO_SETTINGS_KEY);
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                if (parsed.workDuration && parsed.shortBreakDuration && parsed.longBreakDuration) {
                    return parsed;
                }
            } catch (e) {
                console.error("Failed to parse saved pomodoro settings:", e);
            }
        }
    }
    return {
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        longBreakInterval: 4,
        autoStartBreaks: true,
        autoStartPomodoros: false,
        alarmSound: "bell", 
        alarmVolume: 80,
    };
  });

  const [mode, setMode] = useState<"work" | "shortBreak" | "longBreak">("work")
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60)
  const [isActive, setIsActive] = useState(false)
  const [completedPomodorosCycle, setCompletedPomodorosCycle] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const [dbTasks, setDbTasks] = useState<DBTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadTasksError, setLoadTasksError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<UIPomodoroSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadSessionsError, setLoadSessionsError] = useState<string | null>(null);

  const [completedAnimation, setCompletedAnimation] = useState(false);

  const alarmRef = useRef<HTMLAudioElement | null>(null)

  const themeColors = {
    work: {
      progress: "#FF6347", text: "text-slate-700 dark:text-slate-200",
      button: "bg-red-500 hover:bg-red-600 focus-visible:ring-red-500",
      buttonActive: "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500", 
      buttonOutline: "border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 hover:text-red-600"
    },
    shortBreak: {
      progress: "#90EE90", text: "text-green-700 dark:text-green-300",
      button: "bg-green-500 hover:bg-green-600 focus-visible:ring-green-500",
      buttonActive: "bg-teal-500 hover:bg-teal-600 focus-visible:ring-teal-500",
      buttonOutline: "border-green-500 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/50 hover:text-green-600"
    },
    longBreak: {
      progress: "#7CFC00", text: "text-emerald-700 dark:text-emerald-300",
      button: "bg-emerald-500 hover:bg-emerald-600 focus-visible:ring-emerald-500",
      buttonActive: "bg-cyan-500 hover:bg-cyan-600 focus-visible:ring-cyan-500",
      buttonOutline: "border-emerald-500 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 hover:text-emerald-600"
    }
  };
  const currentTheme = themeColors[mode];

  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(POMODORO_SETTINGS_KEY, JSON.stringify(settings));
    }
    if(!isActive){
        setTimeLeft(settings.workDuration * 60);
        setMode('work');
        setCompletedPomodorosCycle(0);
    }
  }, [settings, isActive]);

  const loadAllTasks = useCallback(async () => {
    setLoadingTasks(true);
    setLoadTasksError(null);
    try {
      const allDbTasks = await getAll<DBTask>(ObjectStores.TASKS);
      setDbTasks(allDbTasks.filter(task => !task.isDeleted && !task.completed));
    } catch (error) {
      console.error("Failed to load tasks for pomodoro view:", error);
      setLoadTasksError("无法加载任务列表。");
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const loadAllSessions = useCallback(async () => {
    setLoadingSessions(true);
    setLoadSessionsError(null);
    try {
      const dbSessions = await getAll<DBSession>(ObjectStores.SESSIONS);
      const uiSessions: UIPomodoroSession[] = await Promise.all(
        dbSessions.map(async (session) => {
          let taskTitle = "未知任务";
          if (session.taskId) {
            try {
                const task = await getFromDB<DBTask>(ObjectStores.TASKS, session.taskId);
                if(task) taskTitle = task.title;
            } catch (e) {
                console.warn(`Could not fetch task title for session ${session.id}, task ID ${session.taskId}`);
            }
          }
          return {
            ...session,
            id: session.id!,
            taskTitle: taskTitle,
          };
        })
      );
      setSessions(uiSessions.sort((a, b) => new Date(b.endTime || 0).getTime() - new Date(a.endTime || 0).getTime()));
    } catch (error) {
      console.error("Failed to load sessions:", error);
      setLoadSessionsError("无法加载历史记录。");
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadAllTasks();
    loadAllSessions();
  }, [loadAllTasks, loadAllSessions]);

  useEffect(() => {
    alarmRef.current = new Audio("/alarm.mp3") 
    alarmRef.current.volume = settings.alarmVolume / 100
    return () => {
      if (alarmRef.current) {
        alarmRef.current.pause()
        alarmRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (alarmRef.current) {
      alarmRef.current.volume = settings.alarmVolume / 100
    }
  }, [settings.alarmVolume])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1)
      }, 1000)
    } else if (isActive && timeLeft === 0) {
      if (!isMuted && alarmRef.current) {
        alarmRef.current.play().catch(e => console.error("Error playing sound:", e));
      }

      if (mode === "work") {
        setCompletedAnimation(true);
        setTimeout(() => setCompletedAnimation(false), 1200);
        
        const currentCycleCount = completedPomodorosCycle + 1;
        setCompletedPomodorosCycle(currentCycleCount);
        
        const taskForSession = dbTasks.find(t => t.id === selectedTaskId);

        if (selectedTaskId && taskForSession) {
          const sessionData: Omit<DBSession, 'id'> = {
            taskId: selectedTaskId,
            startTime: new Date(Date.now() - settings.workDuration * 60 * 1000),
            endTime: new Date(),
            duration: settings.workDuration * 60 * 1000,
          };
          addToDB(ObjectStores.SESSIONS, sessionData)
            .then(newSessionId => {
                const newUISession: UIPomodoroSession = {
                    ...sessionData,
                    id: newSessionId,
                    taskTitle: taskForSession.title
                };
                setSessions(prev => [newUISession, ...prev].sort((a,b) => new Date(b.endTime || 0).getTime() - new Date(a.endTime || 0).getTime()));
                if (taskForSession.actualPomodoros !== undefined) {
                    const updatedTask = { ...taskForSession, actualPomodoros: (taskForSession.actualPomodoros || 0) + 1, updatedAt: new Date() };
                    updateDB(ObjectStores.TASKS, updatedTask).then(() => {
                        setDbTasks(prevDbTasks => prevDbTasks.map(t => t.id === selectedTaskId ? updatedTask : t));
                    }).catch(e => console.error("Failed to update task actual pomodoros",e));
                }
            })
            .catch(e => console.error("Failed to save session:", e));
        }

        if (currentCycleCount % settings.longBreakInterval === 0) {
          setMode("longBreak")
          setTimeLeft(settings.longBreakDuration * 60)
        } else {
          setMode("shortBreak")
          setTimeLeft(settings.shortBreakDuration * 60)
        }
        if (!settings.autoStartBreaks) setIsActive(false);

      } else {
        setMode("work")
        setTimeLeft(settings.workDuration * 60)
        if (!settings.autoStartPomodoros) setIsActive(false);
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft, mode, completedPomodorosCycle, settings, isMuted, selectedTaskId, dbTasks, loadAllSessions]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const calculateProgressForView = () => {
    let totalSeconds;
    switch (mode) {
      case "work": totalSeconds = settings.workDuration * 60; break;
      case "shortBreak": totalSeconds = settings.shortBreakDuration * 60; break;
      case "longBreak": totalSeconds = settings.longBreakDuration * 60; break;
      default: totalSeconds = settings.workDuration*60;
    }
    if (totalSeconds === 0) return 0;
    const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
    return Math.max(0, Math.min(100, progress));
  }

  const timerStatusTextForView = () => {
    switch (mode) {
      case "work": return "专注中...";
      case "shortBreak": return "小憩一下";
      case "longBreak": return "放松一下";
      default: return "准备";
    }
  }

  const resetCurrentTimerAndCycle = () => {
    setIsActive(false)
    setCompletedPomodorosCycle(0)
    const currentModeOrDefault = mode || "work"
    setMode(currentModeOrDefault)
    switch (currentModeOrDefault) {
      case "work": setTimeLeft(settings.workDuration * 60); break;
      case "shortBreak": setTimeLeft(settings.shortBreakDuration * 60); break;
      case "longBreak": setTimeLeft(settings.longBreakDuration * 60); break;
    }
  }

  const switchModeAndReset = (newMode: "work" | "shortBreak" | "longBreak") => {
    setIsActive(false)
    setMode(newMode)
    switch (newMode) {
      case "work": setTimeLeft(settings.workDuration * 60); break;
      case "shortBreak": setTimeLeft(settings.shortBreakDuration * 60); break;
      case "longBreak": setTimeLeft(settings.longBreakDuration * 60); break;
    }
  }

  const handleSaveSettings = (newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    setIsSettingsOpen(false);
  };
  
  const todayDateStr = new Date().toDateString();
  const totalCompletedToday = sessions
    .filter(s => s.endTime && new Date(s.endTime).toDateString() === todayDateStr)
    .reduce((acc, s) => acc + (s.duration === settings.workDuration * 60 * 1000 ? 1: 0), 0);

  const svgRadius = 45;
  const svgCircumference = 2 * Math.PI * svgRadius;
  const progressPercentage = calculateProgressForView();
  const svgStrokeDashoffset = svgCircumference - (progressPercentage / 100) * svgCircumference;

  return (
    <div className="container py-6 space-y-8 dark:bg-slate-900 dark:text-slate-50">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">番茄钟</h1>
        <p className="text-muted-foreground dark:text-slate-400">使用番茄工作法提高专注力和工作效率</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="h-full shadow-xl dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2 border-b dark:border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">专注时间</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="h-8 w-8 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                  <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
                        <Settings className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] dark:bg-slate-800 dark:border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="dark:text-slate-100">番茄钟设置</DialogTitle>
                        <DialogDescription className="dark:text-slate-400">自定义番茄钟的时间和行为</DialogDescription>
                      </DialogHeader>
                      <PomodoroSettingsForm initialSettings={settings} onSave={handleSaveSettings} onCancel={() => setIsSettingsOpen(false)} />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-10 space-y-8">
              <div className="relative w-60 h-60"> 
                <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={svgRadius} fill="none" strokeDasharray="4 2" className="text-slate-200 dark:text-slate-700" strokeWidth="3" />
                  <circle
                    cx="50" cy="50" r={svgRadius} fill="none"
                    stroke={currentTheme.progress} strokeWidth="5" 
                    strokeDasharray={svgCircumference}
                    strokeDashoffset={svgStrokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className={cn("absolute inset-0 flex flex-col items-center justify-center", currentTheme.text)}>
                  <span className="text-6xl font-bold tracking-tighter">
                    {formatTime(timeLeft)}
                  </span>
                  <span className="text-sm font-medium mt-1">
                    {timerStatusTextForView()}
                  </span>
                </div>
              </div>
              
                <div className="flex justify-center space-x-1.5">
                    {[...Array(settings.longBreakInterval)].map((_, i) => (
                    <div key={i} className={cn("transform transition-transform duration-300", completedAnimation && i < completedPomodorosCycle % settings.longBreakInterval ? "animate-bounce-fast" : "")}>
                        <PomodoroCounterIcon 
                            filled={i < completedPomodorosCycle % settings.longBreakInterval || (completedPomodorosCycle > 0 && completedPomodorosCycle % settings.longBreakInterval === 0 && i < settings.longBreakInterval) } 
                            className="w-5 h-5" />
                    </div>
                    ))}
                </div>
                <style jsx global>{`
                    @keyframes bounce-fast {
 0%, 100% { transform: translateY(0); }
 50% { transform: translateY(-6px); }
}
 .animate-bounce-fast { animation: bounce-fast 0.4s ease-in-out; }
                `}</style>

              <div className="flex items-center justify-center space-x-3">
                {(["work", "shortBreak", "longBreak"] as const).map((m) => (
                  <Button
                    key={m}
                    variant={mode === m ? "default" : "outline"}
                    onClick={() => switchModeAndReset(m)}
                    className={cn(
                        "w-28 py-2 text-sm", 
                        mode === m ? currentTheme.button : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700",
                        isActive && mode === m ? currentTheme.buttonActive : "" 
                    )}
                  >
                    {m === "work" ? "专注" : m === "shortBreak" ? "短休息" : "长休息"}
                  </Button>
                ))}
              </div>

              <div className="flex items-center justify-center space-x-4">
                <Button 
                    variant="ghost" size="icon" 
                    onClick={resetCurrentTimerAndCycle} 
                    className="h-12 w-12 rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 disabled:opacity-50" 
                    disabled={isActive && timeLeft > 0} 
                    title="重置周期和计时器"
                >
                  <RefreshCwIcon className="h-6 w-6" />
                </Button>
                <Button
                  variant={"default"} 
                  size="icon"
                  onClick={() => setIsActive(!isActive)}
                  className={cn(
                    "h-16 w-16 rounded-full text-white transition-all duration-300 transform active:scale-95",
                    isActive ? currentTheme.buttonActive : currentTheme.button,
                    (loadingTasks && !selectedTaskId) ? "opacity-50 cursor-not-allowed" : ""
                  )}
                  disabled={loadingTasks && !selectedTaskId}
                >
                  {isActive ? <PauseIcon className="h-8 w-8" /> : <PlayIcon className="h-8 w-8" />}
                </Button>
              </div>
                <div className="text-xs text-muted-foreground dark:text-slate-500">
                    第 {Math.floor(completedPomodorosCycle / settings.longBreakInterval) + 1} 大轮 / {completedPomodorosCycle % settings.longBreakInterval +1} 小轮
                </div>

            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4 dark:border-slate-700">
              <div className="w-full max-w-sm">
                {loadingTasks ? ( 
                    <div className="flex items-center justify-center h-10 rounded-md border border-dashed dark:border-slate-600">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-400" />
                    </div>
                ) : loadTasksError ? ( 
                    <div className="text-red-500 text-center py-2">{loadTasksError}</div>
                ) : dbTasks.length === 0 ? ( 
                    <p className="text-muted-foreground dark:text-slate-400 text-center py-2">没有可专注的活动任务。</p>
                ) : (
                    <Select value={selectedTaskId?.toString() || ""} onValueChange={(val) => setSelectedTaskId(val ? Number(val) : null)}>
                      <SelectTrigger className={cn("w-full transition-colors duration-200 focus:border-transparent focus:ring-2 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200", currentTheme.buttonOutline.split(' ')[0], currentTheme.buttonOutline.includes('text-red-500') ? "focus:ring-red-400" : currentTheme.buttonOutline.includes('text-green-500') ? "focus:ring-green-400" : "focus:ring-emerald-400" )}>
                        <SelectValue placeholder="选择要专注的任务" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                        {dbTasks.map((task) => (
                          <SelectItem key={task.id} value={String(task.id!)} className="dark:text-slate-200 dark:focus:bg-slate-700">
                            <div className="flex items-center">
                              <div className={cn("h-2.5 w-2.5 rounded-full mr-2.5", task.priority === "importantUrgent" ? "bg-red-500" : task.priority === "importantNotUrgent" ? "bg-amber-500" : task.priority === "notImportantUrgent" ? "bg-blue-500" : "bg-green-500")}/>
                              {task.title}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2 border-b dark:border-slate-700">
              <CardTitle className="text-lg">今日统计</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 pt-3 text-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground dark:text-slate-400">完成番茄钟</div>
                  <div className="font-medium">{totalCompletedToday}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground dark:text-slate-400">专注时间</div>
                  <div className="font-medium">
                    {Math.floor((totalCompletedToday * settings.workDuration) / 60)} 小时 {" "}
                    {(totalCompletedToday * settings.workDuration) % 60} 分钟
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2 border-b dark:border-slate-700">
              <CardTitle className="text-lg">历史记录</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 pt-2">
                {loadingSessions ? (
                    <div className="flex items-center justify-center h-20"> <Loader2 className="h-6 w-6 animate-spin text-slate-500 dark:text-slate-400" /> </div>
                ) : loadSessionsError ? (
                    <div className="text-red-500 text-center py-4">{loadSessionsError}</div>
                ) : (
                <Tabs defaultValue="today">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-700">
                    <TabsTrigger value="today" className="dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-slate-100 dark:text-slate-300">今天</TabsTrigger>
                    <TabsTrigger value="week" className="dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-slate-100 dark:text-slate-300">本周</TabsTrigger>
                    <TabsTrigger value="month" className="dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-slate-100 dark:text-slate-300">本月</TabsTrigger>
                  </TabsList>
                  <TabsContent value="today" className="mt-4 max-h-60 overflow-y-auto">
                    <HistoryList sessions={sessions} period="today" settings={settings} />
                  </TabsContent>
                   <TabsContent value="week" className="mt-4 max-h-60 overflow-y-auto">
                    <HistoryList sessions={sessions} period="week" settings={settings} />
                  </TabsContent>
                  <TabsContent value="month" className="mt-4 max-h-60 overflow-y-auto">
                     <HistoryList sessions={sessions} period="month" settings={settings} />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2 border-b dark:border-slate-700">
              <CardTitle className="text-lg">番茄工作法提示</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 pt-3 text-sm space-y-3">
                <div className="space-y-2">
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">1. 选择一个任务</h3>
                  <p className="text-muted-foreground dark:text-slate-400">选择一个你想要完成的任务，设定明确的目标。</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">2. 设置番茄钟</h3>
                  <p className="text-muted-foreground dark:text-slate-400">
                    设置{settings.workDuration}分钟的专注时间，在这段时间内只专注于选定的任务。
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">3. 专注工作</h3>
                  <p className="text-muted-foreground dark:text-slate-400">在番茄钟期间，避免所有干扰，全身心投入工作。</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">4. 短暂休息</h3>
                  <p className="text-muted-foreground dark:text-slate-400">
                    每完成一个番茄钟，休息{settings.shortBreakDuration}分钟。每完成{settings.longBreakInterval}个番茄钟，休息{settings.longBreakDuration}分钟。
                  </p>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

interface PomodoroSettingsFormProps {
  initialSettings: PomodoroSettings;
  onSave: (settings: PomodoroSettings) => void;
  onCancel: () => void;
}

function PomodoroSettingsForm({ initialSettings, onSave, onCancel }: PomodoroSettingsFormProps) {
  const [currentSettings, setCurrentSettings] = useState<PomodoroSettings>(initialSettings);

  useEffect(() => {
    setCurrentSettings(initialSettings);
  }, [initialSettings]);

  const handleSettingChange = (key: keyof PomodoroSettings, value: string | number | boolean) => {
    setCurrentSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleNumericChange = (key: keyof PomodoroSettings, value: string, min: number, max: number, defaultVal: number) => {
    let numVal = Number.parseInt(value);
    if (isNaN(numVal) || numVal < min) numVal = defaultVal;
    if (numVal > max) numVal = max;
    handleSettingChange(key, numVal);
  };

  return (
    <>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="workDuration" className="dark:text-slate-300">工作时长 (分钟)</Label>
            <Input
              id="workDuration"
              type="number"
              min="1"
              max="60"
              value={currentSettings.workDuration}
              onChange={(e) => handleNumericChange('workDuration', e.target.value, 1, 60, 25)}
              className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shortBreakDuration" className="dark:text-slate-300">短休息时长 (分钟)</Label>
            <Input
              id="shortBreakDuration"
              type="number"
              min="1"
              max="30"
              value={currentSettings.shortBreakDuration}
              onChange={(e) => handleNumericChange('shortBreakDuration', e.target.value, 1, 30, 5)}
              className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="longBreakDuration" className="dark:text-slate-300">长休息时长 (分钟)</Label>
            <Input
              id="longBreakDuration"
              type="number"
              min="1"
              max="60"
              value={currentSettings.longBreakDuration}
              onChange={(e) => handleNumericChange('longBreakDuration', e.target.value, 1, 60, 15)}
              className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longBreakInterval" className="dark:text-slate-300">长休息间隔 (番茄钟数)</Label>
            <Input
              id="longBreakInterval"
              type="number"
              min="1"
              max="10"
              value={currentSettings.longBreakInterval}
              onChange={(e) => handleNumericChange('longBreakInterval', e.target.value, 1, 10, 4)}
              className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="alarmSound" className="dark:text-slate-300">提示音</Label>
          <Select
            value={currentSettings.alarmSound}
            onValueChange={(value) => handleSettingChange('alarmSound', value)}
          >
            <SelectTrigger id="alarmSound" className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
              <SelectValue placeholder="选择提示音" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="bell" className="dark:text-slate-200 dark:focus:bg-slate-700">铃声</SelectItem>
              <SelectItem value="digital" className="dark:text-slate-200 dark:focus:bg-slate-700">数字音</SelectItem>
              <SelectItem value="nature" className="dark:text-slate-200 dark:focus:bg-slate-700">自然音</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="alarmVolume" className="dark:text-slate-300">音量</Label>
            <span className="text-sm dark:text-slate-400">{currentSettings.alarmVolume}%</span>
          </div>
          <Slider
            id="alarmVolume"
            min={0}
            max={100}
            step={1}
            value={[currentSettings.alarmVolume]}
            onValueChange={(value) => handleSettingChange('alarmVolume', value[0])}
            className="[&>span:first-child]:bg-primary [&>span:first-child_span]:bg-white dark:[&>span:first-child]:bg-slate-500 dark:[&>span:first-child_span]:bg-slate-300"
          />
        </div>
        <div className="flex items-center space-x-2 pt-2">
          <Switch
            id="autoStartBreaks"
            checked={currentSettings.autoStartBreaks}
            onCheckedChange={(checked) => handleSettingChange('autoStartBreaks', checked)}
            className="data-[state=checked]:bg-primary dark:data-[state=checked]:bg-slate-500"
          />
          <Label htmlFor="autoStartBreaks" className="dark:text-slate-300">自动开始休息</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="autoStartPomodoros"
            checked={currentSettings.autoStartPomodoros}
            onCheckedChange={(checked) => handleSettingChange('autoStartPomodoros', checked)}
            className="data-[state=checked]:bg-primary dark:data-[state=checked]:bg-slate-500"
          />
          <Label htmlFor="autoStartPomodoros" className="dark:text-slate-300">自动开始番茄钟</Label>
        </div>
      </div>
      <DialogFooter className="dark:border-t dark:border-slate-700 pt-4">
        <Button variant="outline" onClick={onCancel} className="dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700">
          取消
        </Button>
        <Button onClick={() => onSave(currentSettings)} className="bg-primary hover:bg-primary/90 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-100">保存</Button>
      </DialogFooter>
    </>
  );
}

interface HistoryListProps {
    sessions: UIPomodoroSession[];
    period: "today" | "week" | "month";
    settings: PomodoroSettings;
}

function HistoryList({ sessions, period, settings }: HistoryListProps) {
    const filterByPeriod = (session: UIPomodoroSession) => {
        if (!session.endTime) return false;
        const today = new Date();
        const sessionDate = new Date(session.endTime);
        today.setHours(0,0,0,0);

        switch (period) {
            case "today":
                return sessionDate.toDateString() === today.toDateString();
            case "week":
                const firstDayOfWeek = new Date(today);
                firstDayOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
                firstDayOfWeek.setHours(0,0,0,0);
                const lastDayOfWeek = new Date(firstDayOfWeek);
                lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
                lastDayOfWeek.setHours(23,59,59,999);
                return sessionDate >= firstDayOfWeek && sessionDate <= lastDayOfWeek;
            case "month":
                return sessionDate.getFullYear() === today.getFullYear() && sessionDate.getMonth() === today.getMonth();
            default:
                return false;
        }
    };

    const filteredSessions = sessions.filter(filterByPeriod);

    if (filteredSessions.length === 0) {
        return <div className="text-center py-4 text-muted-foreground dark:text-slate-400">此期间没有完成的番茄钟</div>;
    }

    return (
        <div className="space-y-3">
            {filteredSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center space-x-2 min-w-0">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm truncate text-slate-700 dark:text-slate-300" title={session.taskTitle}>{session.taskTitle || '未指定任务'}</span>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground dark:text-slate-500" />
                        <span className="text-xs text-muted-foreground dark:text-slate-400">
                            {session.duration === settings.workDuration * 60 * 1000 ? '1' : Math.round((session.duration || 0) / (settings.workDuration * 60 * 1000) * 10)/10} x {settings.workDuration}分
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
