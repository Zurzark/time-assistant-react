"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipForward, RefreshCw, CheckCircle2, Volume2, VolumeX, Maximize2, Loader2, AlertCircle, Minus, X } from "lucide-react"
import { type Task as DBTask, ObjectStores, getAll, add as addToDB, update as updateDB } from "@/lib/db"
import { cn } from "@/lib/utils"
import { usePomodoroSettings, getCurrentBackgroundSoundPath } from "@/lib/pomodoro-settings"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import React from "react"
import { usePomodoroGlobal } from "./pomodoro-context"

// 全局番茄钟弹窗组件，配合PomodoroContext实现全局唯一、状态持久化和页面切换不丢失，支持最小化、任务选择、音效、关闭确认等功能。

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
  initialTask: { id: string | number; title: string } | null
}

// 不带默认关闭按钮的 DialogContent
const DialogContentNoClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContentNoClose.displayName = "DialogContentNoClose";

// 新增：关闭确认弹窗组件
const ConfirmCloseDialog: React.FC<{ open: boolean; onConfirm: () => void; onCancel: () => void }> = ({ open, onConfirm, onCancel }) => (
  <Dialog open={open} onOpenChange={open => { if (!open) onCancel(); }}>
    <DialogContent className="max-w-xs">
      <DialogHeader>
        <DialogTitle>确认关闭</DialogTitle>
        <DialogDescription>确定要关闭番茄钟吗？当前计时将会暂停。</DialogDescription>
      </DialogHeader>
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button variant="destructive" onClick={onConfirm}>确认关闭</Button>
      </div>
    </DialogContent>
  </Dialog>
)

export function PomodoroModal({ initialTask }: PomodoroModalProps) {
  // 全局状态
  const {
    open, setOpen, time, setTime, isActive, setIsActive, mode, setMode, pomodoroCount, setPomodoroCount, selectedTaskId, setSelectedTaskId, isMinimized, setIsMinimized
  } = usePomodoroGlobal();
  const settings = usePomodoroSettings();
  const [completedAnimation, setCompletedAnimation] = useState(false); // For pomodoro counter animation
  
  const [dbTasks, setDbTasks] = useState<DBTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [loadTasksError, setLoadTasksError] = useState<string | null>(null)

  const [focusMode, setFocusMode] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isCompletingRef = useRef(false)
  const stateTransitionRef = useRef(false) // 新增：状态转换标记

  // 新增：音效相关的 refs
  const startSoundRef = useRef<HTMLAudioElement | null>(null)
  const endSoundRef = useRef<HTMLAudioElement | null>(null)
  const backgroundSoundRef = useRef<HTMLAudioElement | null>(null)

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
    work: settings.workDuration * 60,
    shortBreak: settings.shortBreakDuration * 60,
    longBreak: settings.longBreakDuration * 60,
  }

  // 初始化音效
  useEffect(() => {
    if (typeof window !== "undefined" && open) { // 只在弹窗打开时初始化
      startSoundRef.current = new Audio("/audio/start.mp3")
      endSoundRef.current = new Audio("/audio/end.mp3")
      
      const bgSoundPath = getCurrentBackgroundSoundPath(settings)
      if (bgSoundPath) {
        backgroundSoundRef.current = new Audio(bgSoundPath)
        backgroundSoundRef.current.loop = true
      } else {
        if (backgroundSoundRef.current) {
          try {
            if (backgroundSoundRef.current && !backgroundSoundRef.current.paused) {
              backgroundSoundRef.current.pause()
            }
          } catch (e) {}
          backgroundSoundRef.current = null
        }
      }
      // 根据 settings 更新音量
      const newVolume = settings.alarmVolume / 100
      if (startSoundRef.current) startSoundRef.current.volume = newVolume
      if (endSoundRef.current) endSoundRef.current.volume = newVolume
      if (backgroundSoundRef.current) backgroundSoundRef.current.volume = newVolume
    }
    return () => {
      try { if (startSoundRef.current && !startSoundRef.current.paused) startSoundRef.current.pause() } catch (e) {}
      try { if (endSoundRef.current && !endSoundRef.current.paused) endSoundRef.current.pause() } catch (e) {}
      try { if (backgroundSoundRef.current && !backgroundSoundRef.current.paused) backgroundSoundRef.current.pause() } catch (e) {}
    }
  }, [open, settings.backgroundSound, settings.alarmVolume]) // 依赖 open 和设置

  // 背景音播放控制 (与 pomodoro-card.tsx 类似)
  useEffect(() => {
    // 新增：只有在start.mp3播放完后才播放背景白噪声
    let fadeInInterval: NodeJS.Timeout | null = null;
    let startSoundEndedListener: (() => void) | null = null;
    if (open && isActive && mode === "work" && settings.backgroundSound !== 'none' && backgroundSoundRef.current && !isMuted) {
      if (startSoundRef.current) {
        // 先播放start.mp3，等它播放完再播放背景音
        try {
          startSoundRef.current.currentTime = 0;
          startSoundRef.current.play().catch(e => console.error("Start Sound Play Error:", e));
        } catch (e) { console.warn(e) }
        startSoundEndedListener = () => {
          if (backgroundSoundRef.current) {
            backgroundSoundRef.current.volume = 0;
            try {
              if (backgroundSoundRef.current.paused) {
                backgroundSoundRef.current.play().catch(e => console.error("Modal BG Sound Play Error:", e));
              }
            } catch (e) { console.warn(e) }
            let currentVolume = 0;
            fadeInInterval = setInterval(() => {
              currentVolume += 0.1;
              if (currentVolume >= settings.alarmVolume / 100) {
                currentVolume = settings.alarmVolume / 100;
                if (fadeInInterval) clearInterval(fadeInInterval);
              }
              if (backgroundSoundRef.current) backgroundSoundRef.current.volume = currentVolume;
            }, 50);
          }
        };
        startSoundRef.current.addEventListener('ended', startSoundEndedListener, { once: true });
      }
    } else if (backgroundSoundRef.current) {
      let currentVolume = backgroundSoundRef.current.volume
      if (currentVolume > 0) {
        const fadeOutInterval = setInterval(() => {
          currentVolume -= 0.1
          if (currentVolume <= 0) {
            currentVolume = 0
            try {
              if(backgroundSoundRef.current && !backgroundSoundRef.current.paused) backgroundSoundRef.current.pause()
            } catch (e) {}
            clearInterval(fadeOutInterval)
          }
          if (backgroundSoundRef.current) backgroundSoundRef.current.volume = currentVolume
        }, 50)
      } else {
        try {
          if(backgroundSoundRef.current && !backgroundSoundRef.current.paused) backgroundSoundRef.current.pause()
        } catch (e) {}
      }
    }
    return () => {
      if (startSoundRef.current && startSoundEndedListener) {
        startSoundRef.current.removeEventListener('ended', startSoundEndedListener);
      }
      if (fadeInInterval) clearInterval(fadeInInterval);
    }
  }, [open, isActive, mode, settings.backgroundSound, settings.alarmVolume, isMuted])

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

  // 重设计时器逻辑 - 当弹窗打开或设置变化时
  useEffect(() => {
    if (open) {
      // 完全重置计时器状态
      setIsActive(false);
      setMode("work");
      setTime(settings.workDuration * 60);
      setPomodoroCount(0);
      isCompletingRef.current = false;
      stateTransitionRef.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (backgroundSoundRef.current) {
        backgroundSoundRef.current.pause();
        backgroundSoundRef.current.currentTime = 0;
      }
      
      // 加载任务
      loadTasksForModal();
    }
  }, [open, settings.workDuration, settings.shortBreakDuration, settings.longBreakDuration, settings.longBreakInterval, loadTasksForModal]);
  
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  // 用户交互事件统一处理
  const handleUserInteract = useCallback(() => {
    if (!hasUserInteracted) setHasUserInteracted(true);
  }, [hasUserInteracted]);
  
  const playSoundLogic = useCallback((soundType: 'start' | 'end') => {
    if (!hasUserInteracted) return;
    if (isMuted || !settings.enableStartEndSounds) return;
    const soundRef = soundType === 'start' ? startSoundRef : endSoundRef;
    if (soundRef.current) {
      soundRef.current.currentTime = 0;
      try {
        if (soundRef.current.paused) {
          soundRef.current.play().catch(e => console.error(`Modal ${soundType} Sound Play Error:`, e));
        }
      } catch (e) { console.warn(e) }
    }
  }, [isMuted, settings.enableStartEndSounds, hasUserInteracted]);
  
  // 死锁终极修复：mode或time变化时强制解锁
  useEffect(() => {
    if (stateTransitionRef.current) {
      console.log('[解锁] mode或time变化，强制解锁stateTransitionRef');
      stateTransitionRef.current = false;
    }
  }, [mode, time]);

  const handleTimerCompleteLogic = useCallback(async () => {
    if (isCompletingRef.current || stateTransitionRef.current) {
      console.warn("handleTimerCompleteLogic re-entry prevented in PomodoroModal");
      return;
    }
    isCompletingRef.current = true;
    stateTransitionRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    try {
      setIsActive(false);
      if (mode === "work") {
        const newCount = pomodoroCount + 1;
        setPomodoroCount(newCount);
        setCompletedAnimation(true);
        setTimeout(() => setCompletedAnimation(false), 1000);
        try {
          const endTime = new Date();
          const startTime = new Date(endTime.getTime() - settings.workDuration * 60 * 1000);
          const dateStr = endTime.toISOString().slice(0, 10);
          const taskTitle = selectedTaskId && dbTasks.find(t => t.id === selectedTaskId)?.title || "番茄钟专注";
          const timeBlock = {
            title: taskTitle,
            sourceType: "pomodoro_log",
            startTime,
            endTime,
            durationMinutes: settings.workDuration,
            isLogged: 1,
            date: dateStr,
            createdAt: new Date(),
            updatedAt: new Date(),
            taskId: selectedTaskId || undefined,
          };
          await addToDB(ObjectStores.TIME_BLOCKS, timeBlock);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("timelineShouldUpdate"));
          }
          if (selectedTaskId) {
            const task = dbTasks.find(t => t.id === selectedTaskId);
            if (task) {
              const sessionData = {
                taskId: selectedTaskId,
                startTime: new Date(Date.now() - durations.work * 1000),
                endTime: new Date(),
                duration: durations.work * 1000,
              };
              await addToDB(ObjectStores.SESSIONS, sessionData);
              if (task.actualPomodoros !== undefined) {
                const updatedTask = {
                  ...task,
                  actualPomodoros: (task.actualPomodoros || 0) + 1,
                  updatedAt: new Date(),
                };
                await updateDB(ObjectStores.TASKS, updatedTask);
                setDbTasks(prev => prev.map(t => t.id === selectedTaskId ? updatedTask : t));
              }
            }
          }
        } catch (e) {
          console.error("添加番茄钟记录失败", e);
        }
        if (newCount % settings.longBreakInterval === 0) {
          setMode("longBreak");
        } else {
          setMode("shortBreak");
        }
      } else {
        setMode("work");
      }
    } finally {
      isCompletingRef.current = false;
      stateTransitionRef.current = false;
    }
  }, [mode, pomodoroCount, settings, dbTasks, selectedTaskId, durations.work, settings.longBreakInterval]);

  // mode变化时自动重置time，并根据设置自动激活isActive
  useEffect(() => {
    if (!open) return;
    let nextTime = 0;
    if (mode === "work") {
      nextTime = settings.workDuration * 60;
    } else if (mode === "shortBreak") {
      nextTime = settings.shortBreakDuration * 60;
    } else if (mode === "longBreak") {
      nextTime = settings.longBreakDuration * 60;
    }
    setTime(nextTime);
    // 自动激活逻辑
    if (mode === "work" && settings.autoStartPomodoros) {
      setIsActive(true);
    } else if ((mode === "shortBreak" || mode === "longBreak") && settings.autoStartBreaks) {
      setIsActive(true);
    } else {
      setIsActive(false);
    }
    // eslint-disable-next-line
  }, [mode, open, settings.workDuration, settings.shortBreakDuration, settings.longBreakDuration, settings.autoStartBreaks, settings.autoStartPomodoros]);

  // 主计时器逻辑，依赖顺序和数量保持稳定
  useEffect(() => {
    if (!open) return;
    if (isActive && time > 0) {
      intervalRef.current = setInterval(() => {
        if (time <= 1) {
          setIsActive(false);
          setTime(0);
          setTimeout(() => handleTimerCompleteLogic(), 0);
        } else {
          if (time === 4) playSoundLogic('end');
          setTime(time - 1);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // 依赖顺序和数量必须稳定
  }, [isActive, open, time, mode, playSoundLogic, handleTimerCompleteLogic]);

  // 统一按钮可用性判断
  const isActionDisabled = loadingTasks || stateTransitionRef.current;

  const toggleTimer = () => {
    handleUserInteract();
    const newIsActive = !isActive
    setIsActive(newIsActive)
    
    if (newIsActive && mode === 'work') {
      playSoundLogic('start')
    } else if (!newIsActive && mode === 'work' && backgroundSoundRef.current && backgroundSoundRef.current.volume > 0) {
        // If pausing during work with background sound, fade it out
        let currentVolume = backgroundSoundRef.current.volume;
        const fadeOutInterval = setInterval(() => {
          currentVolume -= 0.1;
          if (currentVolume <= 0) {
            currentVolume = 0;
            try {
              if(backgroundSoundRef.current && !backgroundSoundRef.current.paused) backgroundSoundRef.current.pause();
            } catch (e) {}
            clearInterval(fadeOutInterval);
          }
          if (backgroundSoundRef.current) backgroundSoundRef.current.volume = currentVolume;
        }, 50);
    }
  }

  const resetTimerLogic = () => {
    handleUserInteract();
    setIsActive(false)
    setTime(durations[mode])
    if (backgroundSoundRef.current) {
      try {
        if (backgroundSoundRef.current && !backgroundSoundRef.current.paused) backgroundSoundRef.current.pause()
      } catch (e) {}
      if (backgroundSoundRef.current) backgroundSoundRef.current.currentTime = 0
    }
  }

  const skipTimerLogic = () => {
    handleUserInteract();
    playSoundLogic('end')
    handleTimerCompleteLogic()
  }

  const completePomodoroAction = () => {
    if (mode === 'work') {
      playSoundLogic('end')
      handleTimerCompleteLogic()
    } else {
      console.warn("Modal Complete action called in non-work mode")
    }
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

  useEffect(() => {
    if (typeof document === 'undefined') return;
    let originTitle = document.title;
    if (open && isActive) {
      let icon = mode === 'work' ? '🧑‍💻' : '🛎️';
      let label = mode === 'work' ? 'Focus' : 'Break';
      document.title = `${formatTime(time)} ${icon} · ${label}`;
    } else {
      document.title = originTitle;
    }
    return () => {
      document.title = originTitle;
    };
  }, [open, isActive, mode, time]);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  return (
    <>
      {/* 关闭确认弹窗 */}
      <ConfirmCloseDialog
        open={showCloseConfirm}
        onConfirm={() => {
          setShowCloseConfirm(false)
          setOpen(false)
          setIsMinimized(false)
        }}
        onCancel={() => setShowCloseConfirm(false)}
      />
      {/* 最小化时只显示悬浮窗 */}
      {isMinimized && (
        <MiniPomodoroWidget />
      )}
      {/* 只有未最小化时才显示 Dialog */}
      <Dialog open={open && !isMinimized} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setShowCloseConfirm(true)
        } else {
          setOpen(isOpen)
        }
        if (!isOpen && isActive) {
          setIsActive(false) // Stop timer if modal is closed
        }
        if (!isOpen) setIsMinimized(false); // 关闭时重置最小化状态
      }}>
        <DialogContentNoClose
          className={`sm:max-w-md ${focusMode ? "sm:max-w-xl md:sm:max-w-2xl" : ""} transition-all duration-300 ease-in-out`}
          onInteractOutside={e => {
            e.preventDefault();
            setIsMinimized(true);
          }}
        >
          {/* 右上角最小化+关闭按钮同排 */}
          <div className="absolute right-4 top-4 flex flex-row items-center space-x-2 z-20">
            <Button variant="ghost" size="icon" onClick={() => setIsMinimized(true)} title="最小化">
              <Minus className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" title="关闭" onClick={() => setShowCloseConfirm(true)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
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
                disabled={isActionDisabled}
                title="重置"
              >
                <RefreshCw className={focusMode ? "h-7 w-7" : "h-5 w-5"} />
              </Button>
              <Button
                variant="default"
                size="lg" 
                onClick={toggleTimer}
                disabled={isActionDisabled}
                className={cn(
                  "min-w-[100px] text-white transition-all duration-300 transform active:scale-95 rounded-full",
                  focusMode ? "h-20 w-20 text-lg px-4 py-2" : "h-16 w-16", 
                  isActive
                      ? (mode === "work" ? "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500" : "bg-teal-500 hover:bg-teal-600 focus-visible:ring-teal-500") 
                      : currentTheme.button,
                  stateTransitionRef.current ? "opacity-50 cursor-not-allowed" : ""
                )}
              >
                {isActive ? <PauseIcon className={focusMode ? "h-8 w-8" : "h-6 w-6"} /> : <PlayIcon className={focusMode ? "h-8 w-8" : "h-6 w-6"} />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-11 w-11 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700", focusMode ? "h-14 w-14" : "")}
                onClick={skipTimerLogic}
                disabled={isActionDisabled} 
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
                  disabled={isActionDisabled} 
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
                    {isMuted ? <VolumeX className="h-5 w-5 text-slate-600 dark:text-slate-400" /> : <Volume2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />}
                    <Label htmlFor="modal-mute-sound" className="text-slate-700 dark:text-slate-300">静音</Label>
                  </div>
                  <Switch id="modal-mute-sound" checked={isMuted} onCheckedChange={setIsMuted} />
                </div>
              </div>
            )}
          </div>
        </DialogContentNoClose>
      </Dialog>
    </>
  )
}

// 右下角悬浮窗组件
const MiniPomodoroWidget: React.FC = () => {
  const { time, mode, isActive, setIsActive, isMinimized, setIsMinimized, selectedTaskId } = usePomodoroGlobal();
  // 任务名
  const [dbTasks, setDbTasks] = React.useState<DBTask[]>([]);
  React.useEffect(() => {
    (async () => {
      try {
        const allDbTasks = await getAll<DBTask>(ObjectStores.TASKS);
        setDbTasks(allDbTasks.filter(t => !t.isDeleted));
      } catch {}
    })();
  }, []);
  const currentTask = dbTasks.find(t => t.id === selectedTaskId)?.title || "未选择任务";
  const onRestore = () => setIsMinimized(false);
  const onPause = () => setIsActive(false);
  const onResume = () => setIsActive(true);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  const modeText = mode === "work" ? "专注" : mode === "shortBreak" ? "小憩" : "长休";
  const modeColor = mode === "work" ? "text-red-500 dark:text-red-400" : "text-green-500 dark:text-green-400";

  // 脉冲动画，仅在激活时
  const pulseAnimation = isActive ? "animate-pulse-border" : "";

  return (
    <div
      className={cn(
        "fixed z-[9999] right-6 bottom-6 flex items-center justify-between",
        "bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-sm",
        "rounded-2xl",
        "p-4 space-x-3",
        "border border-transparent",
        pulseAnimation,
        "shadow-[0_4px_14px_0_rgb(199,210,254,0.7)] dark:shadow-[0_4px_14px_0_rgb(100,116,139,0.5)]" // 浅蓝色投影，深色模式下为稍暗的蓝色投影
      )}
      style={{ 
        width: '360px', // 用户已调整
        height: '120px', // 用户已调整
      }}
    >
      <div className="flex flex-col justify-center">
        <span className="font-semibold text-4xl text-slate-800 dark:text-slate-100">
          {formatTime(time)}
        </span>
        <div className="flex items-center space-x-1.5 mt-1"> 
          <span className={cn("text-base font-medium", modeColor)}>{modeText}</span>
          <span className="truncate max-w-[180px] text-base text-slate-600 dark:text-slate-400" title={currentTask}> 
            {currentTask || "未关联任务"}
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-1">
        {isActive ? (
          <Button size="icon" variant="ghost" onClick={onPause} title="暂停" className="w-11 h-11 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <Pause className="h-7 w-7 text-slate-700 dark:text-slate-300" />
          </Button>
        ) : (
          <Button size="icon" variant="ghost" onClick={onResume} title="继续" className="w-11 h-11 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <Play className="h-7 w-7 text-slate-700 dark:text-slate-300" />
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={onRestore} title="还原" className="w-11 h-11 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
          <Maximize2 className="h-7 w-7 text-slate-700 dark:text-slate-300" />
        </Button>
      </div>
      <style jsx global>{`
        @keyframes pulse-border-animation {
          0%, 100% { border-color: transparent; }
          50% { 
            border-color: ${mode === "work" ? "rgba(255, 99, 71, 0.7)" : "rgba(60, 179, 113, 0.7)"};
          }
        }
        .animate-pulse-border {
          animation: pulse-border-animation 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default PomodoroModal

