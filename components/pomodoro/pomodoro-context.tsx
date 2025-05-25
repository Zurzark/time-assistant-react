'use client'
// 全局番茄钟Context，负责管理番茄钟的所有核心状态，并持久化到localStorage，实现全局唯一和页面切换不丢失。
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

export type PomodoroMode = "work" | "shortBreak" | "longBreak";

interface PomodoroState {
  open: boolean;
  setOpen: (open: boolean) => void;
  time: number;
  setTime: (t: number) => void;
  isActive: boolean;
  setIsActive: (b: boolean) => void;
  mode: PomodoroMode;
  setMode: (m: PomodoroMode) => void;
  pomodoroCount: number;
  setPomodoroCount: (n: number) => void;
  selectedTaskId: number | null;
  setSelectedTaskId: (id: number | null) => void;
  isMinimized: boolean;
  setIsMinimized: (b: boolean) => void;
}

const PomodoroContext = createContext<PomodoroState | undefined>(undefined);

const STORAGE_KEY = "pomodoro-global-state";

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 初始化时从localStorage恢复
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(1500);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<PomodoroMode>("work");
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // 恢复
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data.open === "boolean") setOpen(data.open);
        if (typeof data.time === "number") setTime(data.time);
        if (typeof data.isActive === "boolean") setIsActive(data.isActive);
        if (["work","shortBreak","longBreak"].includes(data.mode)) setMode(data.mode);
        if (typeof data.pomodoroCount === "number") setPomodoroCount(data.pomodoroCount);
        if (typeof data.selectedTaskId === "number" || data.selectedTaskId === null) setSelectedTaskId(data.selectedTaskId);
        if (typeof data.isMinimized === "boolean") setIsMinimized(data.isMinimized);
      }
    } catch {}
  }, []);

  // 持久化
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      open, time, isActive, mode, pomodoroCount, selectedTaskId, isMinimized
    }));
  }, [open, time, isActive, mode, pomodoroCount, selectedTaskId, isMinimized]);

  return (
    <PomodoroContext.Provider value={{
      open, setOpen, time, setTime, isActive, setIsActive, mode, setMode, pomodoroCount, setPomodoroCount, selectedTaskId, setSelectedTaskId, isMinimized, setIsMinimized
    }}>
      {children}
    </PomodoroContext.Provider>
  );
};

export function usePomodoroGlobal() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoroGlobal必须在PomodoroProvider内使用");
  return ctx;
}

export function usePomodoroController() {
  const { setOpen, setSelectedTaskId } = usePomodoroGlobal();
  return {
    openPomodoroForTask: (taskId: number|string, taskTitle: string) => {
      setSelectedTaskId(Number(taskId));
      setOpen(true);
    }
  }
} 