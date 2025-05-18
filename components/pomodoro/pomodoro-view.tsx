"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { CheckCircle2, Clock, Pause, Play, RotateCcw, Settings, Volume2, VolumeX, Loader2, AlertCircle } from "lucide-react"
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

  const alarmRef = useRef<HTMLAudioElement | null>(null)

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

  const calculateProgress = () => {
    let totalSeconds;
    switch (mode) {
      case "work": totalSeconds = settings.workDuration * 60; break;
      case "shortBreak": totalSeconds = settings.shortBreakDuration * 60; break;
      case "longBreak": totalSeconds = settings.longBreakDuration * 60; break;
      default: totalSeconds = settings.workDuration*60;
    }
    if (totalSeconds === 0) return 0;
    return ((totalSeconds - timeLeft) / totalSeconds) * 100
  }

  const resetTimer = () => {
    setIsActive(false)
    switch (mode) {
      case "work": setTimeLeft(settings.workDuration * 60); break;
      case "shortBreak": setTimeLeft(settings.shortBreakDuration * 60); break;
      case "longBreak": setTimeLeft(settings.longBreakDuration * 60); break;
    }
  }

  const switchMode = (newMode: "work" | "shortBreak" | "longBreak") => {
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
                      <PomodoroSettingsForm initialSettings={settings} onSave={handleSaveSettings} onCancel={() => setIsSettingsOpen(false)} />
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
                <Button variant="outline" size="icon" onClick={resetTimer} className="h-12 w-12 rounded-full" disabled={isActive}>
                  <RotateCcw className="h-6 w-6" />
                </Button>
                <Button
                  variant={isActive ? "destructive" : "default"}
                  size="icon"
                  onClick={() => setIsActive(!isActive)}
                  className="h-16 w-16 rounded-full"
                  disabled={loadingTasks && !selectedTaskId}
                >
                  {isActive ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                </Button>
                <div className="h-12 w-12 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xl font-bold">{completedPomodorosCycle}</div>
                    <div className="text-xs text-muted-foreground">周期</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <div className="w-full max-w-md">
                {loadingTasks ? (
                    <div className="flex items-center justify-center h-10 rounded-md border border-dashed">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                ) : loadTasksError ? (
                    <div className="text-red-500 text-center py-2">{loadTasksError}</div>
                ) : dbTasks.length === 0 ? (
                    <p className="text-muted-foreground text-center py-2">没有可专注的活动任务。</p>
                ) : (
                    <Select value={selectedTaskId?.toString() || ""} onValueChange={(val) => setSelectedTaskId(val ? Number(val) : null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择要专注的任务" />
                      </SelectTrigger>
                      <SelectContent>
                        {dbTasks.map((task) => (
                          <SelectItem key={task.id} value={String(task.id!)}>
                            <div className="flex items-center">
                              <div
                                className={cn(
                                  "h-2 w-2 rounded-full mr-2",
                                  task.priority === "importantUrgent" ? "bg-red-500" : task.priority === "importantNotUrgent" ? "bg-amber-500" : task.priority === "notImportantUrgent" ? "bg-blue-500" : "bg-green-500",
                                )}
                              />
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>今日统计</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">完成番茄钟</div>
                  <div className="font-medium">{totalCompletedToday}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">专注时间</div>
                  <div className="font-medium">
                    {Math.floor((totalCompletedToday * settings.workDuration) / 60)} 小时 {" "}
                    {(totalCompletedToday * settings.workDuration) % 60} 分钟
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>历史记录</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              {loadingSessions ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : loadSessionsError ? (
                <div className="text-red-500 text-center py-4">{loadSessionsError}</div>
              ) : (
                <Tabs defaultValue="today">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="today">今天</TabsTrigger>
                    <TabsTrigger value="week">本周</TabsTrigger>
                    <TabsTrigger value="month">本月</TabsTrigger>
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
            <Label htmlFor="workDuration">工作时长 (分钟)</Label>
            <Input
              id="workDuration"
              type="number"
              min="1"
              max="60"
              value={currentSettings.workDuration}
              onChange={(e) => handleNumericChange('workDuration', e.target.value, 1, 60, 25)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shortBreakDuration">短休息时长 (分钟)</Label>
            <Input
              id="shortBreakDuration"
              type="number"
              min="1"
              max="30"
              value={currentSettings.shortBreakDuration}
              onChange={(e) => handleNumericChange('shortBreakDuration', e.target.value, 1, 30, 5)}
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
              value={currentSettings.longBreakDuration}
              onChange={(e) => handleNumericChange('longBreakDuration', e.target.value, 1, 60, 15)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longBreakInterval">长休息间隔 (番茄钟数)</Label>
            <Input
              id="longBreakInterval"
              type="number"
              min="1"
              max="10"
              value={currentSettings.longBreakInterval}
              onChange={(e) => handleNumericChange('longBreakInterval', e.target.value, 1, 10, 4)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="alarmSound">提示音</Label>
          <Select
            value={currentSettings.alarmSound}
            onValueChange={(value) => handleSettingChange('alarmSound', value)}
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
            <span className="text-sm">{currentSettings.alarmVolume}%</span>
          </div>
          <Slider
            id="alarmVolume"
            min={0}
            max={100}
            step={1}
            value={[currentSettings.alarmVolume]}
            onValueChange={(value) => handleSettingChange('alarmVolume', value[0])}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="autoStartBreaks"
            checked={currentSettings.autoStartBreaks}
            onCheckedChange={(checked) => handleSettingChange('autoStartBreaks', checked)}
          />
          <Label htmlFor="autoStartBreaks">自动开始休息</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="autoStartPomodoros"
            checked={currentSettings.autoStartPomodoros}
            onCheckedChange={(checked) => handleSettingChange('autoStartPomodoros', checked)}
          />
          <Label htmlFor="autoStartPomodoros">自动开始番茄钟</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={() => onSave(currentSettings)}>保存</Button>
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
        return <div className="text-center py-4 text-muted-foreground">此期间没有完成的番茄钟</div>;
    }

    return (
        <div className="space-y-4">
            {filteredSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm truncate" title={session.taskTitle}>{session.taskTitle || '未指定任务'}</span>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                            {session.duration === settings.workDuration * 60 * 1000 ? '1' : Math.round((session.duration || 0) / (settings.workDuration * 60 * 1000) * 10)/10} x {settings.workDuration}分钟
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
