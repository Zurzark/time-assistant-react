// 通用番茄钟设置读取方法，供所有番茄钟相关组件调用
export const POMODORO_SETTINGS_KEY = "pomodoroSettings_v1";

// 定义背景音选项，方便扩展
export const backgroundSoundOptions = [
  { value: "none", label: "无" },
  { value: "rain", label: "雨天", path: "/audio/rain.mp3" },
  { value: "forest", label: "森林", path: "/audio/forest.mp3" },
  // 未来可以添加更多声音选项
  // { value: "cafe", label: "咖啡厅", path: "/audio/cafe.mp3" },
];

export const defaultPomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: true,
  autoStartPomodoros: false,
  enableStartEndSounds: true, // 新增：是否开启开始/结束音效，默认开启
  backgroundSound: "none", // 新增：背景音类型，默认无
  alarmVolume: 80, // 保留音量控制，统一控制所有音效
};

export interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  enableStartEndSounds: boolean; // 新增
  backgroundSound: string; // 新增
  alarmVolume: number;
}

export function getPomodoroSettings(): PomodoroSettings {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(POMODORO_SETTINGS_KEY);
    if (saved) {
      try {
        // 合并时要确保新旧设置的兼容性，旧设置可能没有新字段
        const parsedSettings = JSON.parse(saved);
        return { ...defaultPomodoroSettings, ...parsedSettings };
      } catch (e) {
        console.error("Failed to parse pomodoro settings from localStorage", e);
        // 解析失败则返回默认设置
      }
    }
  }
  return defaultPomodoroSettings;
}

// 响应式hook，设置变更时自动刷新
import { useState, useEffect } from "react";
export function usePomodoroSettings() {
  const [settings, setSettings] = useState<PomodoroSettings>(getPomodoroSettings());
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === POMODORO_SETTINGS_KEY) {
        setSettings(getPomodoroSettings());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return settings;
}

// Helper function to get current background sound path
export const getCurrentBackgroundSoundPath = (settings: PomodoroSettings): string | undefined => {
  const soundOption = backgroundSoundOptions.find(opt => opt.value === settings.backgroundSound);
  return soundOption?.path;
}; 