// 番茄钟设置面板组件：用于在系统设置中配置番茄钟相关参数，并持久化到 localStorage，供全局使用
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
// 从 lib 中导入 PomodoroSettings 类型和默认值，以及背景音选项
import { 
  POMODORO_SETTINGS_KEY, 
  type PomodoroSettings, 
  defaultPomodoroSettings as defaultSettings, 
  backgroundSoundOptions 
} from "@/lib/pomodoro-settings";

// 懒加载初始化，优先从localStorage读取
const getInitialSettings = (): PomodoroSettings => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(POMODORO_SETTINGS_KEY);
    if (saved) {
      try {
        // 合并时确保新旧设置的兼容性
        const parsedSettings = JSON.parse(saved);
        return { ...defaultSettings, ...parsedSettings };
      } catch (e) {
        console.error("Failed to parse pomodoro settings for panel", e);
      }
    }
  }
  return defaultSettings;
};

export const PomodoroSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<PomodoroSettings>(getInitialSettings);

  // 持久化保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(POMODORO_SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings]);

  // 统一处理变更
  const update = (key: keyof PomodoroSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">时间设置</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="work-duration">工作时长（分钟）: {settings.workDuration}</Label>
              <span className="text-sm text-muted-foreground">{settings.workDuration} 分钟</span>
            </div>
            <Slider
              id="work-duration"
              min={5}
              max={60}
              step={5}
              value={[settings.workDuration]}
              onValueChange={v => update('workDuration', v[0])}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="short-break">短休息时长（分钟）</Label>
              <span className="text-sm text-muted-foreground">{settings.shortBreakDuration} 分钟</span>
            </div>
            <Slider
              id="short-break"
              min={1}
              max={15}
              step={1}
              value={[settings.shortBreakDuration]}
              onValueChange={v => update('shortBreakDuration', v[0])}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="long-break">长休息时长（分钟）</Label>
              <span className="text-sm text-muted-foreground">{settings.longBreakDuration} 分钟</span>
            </div>
            <Slider
              id="long-break"
              min={5}
              max={30}
              step={5}
              value={[settings.longBreakDuration]}
              onValueChange={v => update('longBreakDuration', v[0])}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="longBreakInterval">番茄钟循环次数</Label>
              <span className="text-sm text-muted-foreground">{settings.longBreakInterval} 次</span>
            </div>
            <Slider
              id="longBreakInterval"
              min={1}
              max={10}
              step={1}
              value={[settings.longBreakInterval]}
              onValueChange={v => update('longBreakInterval', v[0])}
            />
            <p className="text-xs text-muted-foreground">完成这么多次番茄钟后会有一次长休息</p>
          </div>
        </div>
      </div>
      <Separator />
      <div className="space-y-4">
        <h3 className="text-lg font-medium">音效设置</h3>
        <div className="flex items-center justify-between">
          <Label htmlFor="enableStartEndSounds">播放开始/结束音效</Label>
          <Switch 
            id="enableStartEndSounds" 
            checked={settings.enableStartEndSounds} 
            onCheckedChange={v => update('enableStartEndSounds', v)} 
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="backgroundSound">背景音</Label>
          <Select value={settings.backgroundSound} onValueChange={v => update('backgroundSound', v)}>
            <SelectTrigger id="backgroundSound" className="w-32">
              <SelectValue placeholder="选择背景音" />
            </SelectTrigger>
            <SelectContent>
              {backgroundSoundOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="alarmVolume">音量</Label>
          <span className="text-sm text-muted-foreground">{settings.alarmVolume}%</span>
        </div>
        <Slider
          id="alarmVolume"
          min={0}
          max={100}
          step={1}
          value={[settings.alarmVolume]}
          onValueChange={v => update('alarmVolume', v[0])}
        />
      </div>
      <Separator />
      <div className="space-y-4">
        <h3 className="text-lg font-medium">自动化设置</h3>
        <div className="flex items-center space-x-2">
          <Checkbox id="autoStartBreaks" checked={settings.autoStartBreaks} onCheckedChange={v => update('autoStartBreaks', v as boolean)} />
          <Label htmlFor="autoStartBreaks">自动开始休息</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="autoStartPomodoros" checked={settings.autoStartPomodoros} onCheckedChange={v => update('autoStartPomodoros', v as boolean)} />
          <Label htmlFor="autoStartPomodoros">自动开始番茄钟</Label>
        </div>
      </div>
    </div>
  );
};

export default PomodoroSettingsPanel; 