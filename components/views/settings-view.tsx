"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { 
  Bell, 
  Brain, 
  Clock, 
  Download, 
  Globe, 
  Moon, 
  Settings, 
  Sun, 
  Tag, 
  Timer, 
  User,
  Edit3, 
  Trash2, 
  PlusCircle, 
  ListChecks, 
  Loader2, 
  AlertCircle,
  ClipboardList
  // Icons specifically for ActivityCategory removed from here, will be in its own component
  // Coffee, Briefcase, BookOpen, Users as UsersIcon, Smile, Activity as ActivityIcon, Anchor, Award, CheckCircle, XCircle, Info as InfoIcon, LucideIcon,
  // Settings as SettingsIcon, Trash2 as Trash2Icon, Edit3 as Edit3Icon, PlusCircle as PlusCircleIcon, ListChecks as ListChecksIcon, ClipboardList as ClipboardListIcon
} from "lucide-react"
import { TimeField } from "@/components/ui/time-field"
import { Time } from "@internationalized/date"
import {
  ObjectStores,
  FixedBreakRule, 
  // ActivityCategory, // Will be imported in ActivityCategorySettings
  getAll as getAllDB,
  add as addDB,
  update as updateDB,
  remove as removeDB,
  // getByIndex, // Will be imported in ActivityCategorySettings if still needed there
} from "@/lib/db"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  // DialogClose, // DialogClose might not be needed globally
} from "@/components/ui/dialog"
// import { IconPicker, PickableIconName } from '@/components/ui/icon-picker'; // Moved to ActivityCategorySettings

// ActivityCategorySettings component will be imported below
import { ActivityCategorySettings } from "./settings/activity-category-settings";


// 定义标签颜色的类型
type TagColors = Record<string, string>;

// 将16进制颜色转换为HSL格式
function hexToHSL(hex: string): string {
  // 去掉可能的 # 前缀
  hex = hex.replace(/^#/, '');
  
  // 将颜色转换为RGB
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // 找到最大和最小RGB值
  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  
  // 计算亮度
  let l = (max + min) / 2;
  
  let h = 0;
  let s = 0;
  
  if (max !== min) {
    // 计算饱和度
    s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    
    // 计算色相
    if (max === r) {
      h = (g - b) / (max - min) + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / (max - min) + 2;
    } else {
      h = (r - g) / (max - min) + 4;
    }
    
    h *= 60;
  }
  
  // 返回HSL格式
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// 定义固定休息时段表单数据接口
interface FixedBreakRuleFormData {
  label: string;
  startTime: Time | { hour: number; minute: number }; 
  endTime: Time | { hour: number; minute: number };   
  daysOfWeek: string[]; 
  isEnabled: boolean; 
}

const ALL_DAYS_OF_WEEK = [
  { id: "monday", label: "周一" },
  { id: "tuesday", label: "周二" },
  { id: "wednesday", label: "周三" },
  { id: "thursday", label: "周四" },
  { id: "friday", label: "周五" },
  { id: "saturday", label: "周六" },
  { id: "sunday", label: "周日" },
] as const;

// Helper to format HH:MM string from Time object for saving
const formatTimeToString = (time: Time): string => {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
};

// Helper to parse HH:MM string to Time object for form display
const parseStringToTime = (timeStr: string): Time => {
  const [hour, minute] = timeStr.split(':').map(Number);
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    console.warn(`Invalid time string received: ${timeStr}. Defaulting to 00:00`);
    return new Time(0, 0);
  }
  return new Time(hour, minute);
};

// Helper to display days of week
const displayDaysOfWeek = (days: string[]): string => {
  if (!days || days.length === 0) return "未设置";
  const sortedDays = [...days].sort((a, b) => ALL_DAYS_OF_WEEK.findIndex(d => d.id === a) - ALL_DAYS_OF_WEEK.findIndex(d => d.id === b));
  if (sortedDays.length === 7) return "每天";
  if (sortedDays.length === 5 && sortedDays.every(d => ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(d))) return "工作日 (周一至周五)";
  if (sortedDays.length === 2 && sortedDays.every(d => ["saturday", "sunday"].includes(d))) return "周末 (周六、周日)";
  return sortedDays.map(dayId => ALL_DAYS_OF_WEEK.find(d => d.id === dayId)?.label || dayId).join(", ");
};

// Icon map and related types/functions moved to ActivityCategorySettings

export function SettingsView() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("account")
  const [themeColor, setThemeColor] = useState("#0ea5e9")
  const [workDuration, setWorkDuration] = useState(25)
  const [shortBreakDuration, setShortBreakDuration] = useState(5)
  const [longBreakDuration, setLongBreakDuration] = useState(15)
  const [pomodoroCount, setPomodoroCount] = useState(4)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [browserNotifications, setBrowserNotifications] = useState(true)
  const [soundNotifications, setSoundNotifications] = useState(true)
  const [workDays, setWorkDays] = useState<string[]>(["monday", "tuesday", "wednesday", "thursday", "friday"])
  const [workStartTime, setWorkStartTime] = useState<{ hour: number; minute: number }>({ hour: 9, minute: 0 })
  const [workEndTime, setWorkEndTime] = useState<{ hour: number; minute: number }>({ hour: 18, minute: 0 })
  const [tagColors, setTagColors] = useState<TagColors>({
    工作: "#ef4444",
    学习: "#3b82f6",
    个人: "#10b981",
    家庭: "#f59e0b",
    健康: "#8b5cf6",
  })
  const { toast } = useToast(); 

  const [fixedBreakRules, setFixedBreakRules] = useState<FixedBreakRule[]>([]);
  const [loadingFixedBreakRules, setLoadingFixedBreakRules] = useState(true);
  const [fixedBreakRuleError, setFixedBreakRuleError] = useState<string | null>(null);
  const [isFixedBreakRuleModalOpen, setIsFixedBreakRuleModalOpen] = useState(false);
  const [currentEditingFixedBreakRule, setCurrentEditingFixedBreakRule] = useState<FixedBreakRule | null>(null);
  const [fixedBreakRuleSaving, setFixedBreakRuleSaving] = useState(false);

  // Activity Category states moved to ActivityCategorySettings.tsx

  const initialFixedBreakRuleFormData: FixedBreakRuleFormData = {
    label: "",
    startTime: new Time(9, 0),
    endTime: new Time(9, 30),
    daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    isEnabled: true,
  };
  const [fixedBreakRuleFormData, setFixedBreakRuleFormData] = useState<FixedBreakRuleFormData>(initialFixedBreakRuleFormData);

  // 预定义主题颜色
  const predefinedColors = [
    { name: "蓝色", value: "#0ea5e9" },
    { name: "紫色", value: "#8b5cf6" },
    { name: "绿色", value: "#10b981" },
    { name: "红色", value: "#ef4444" },
    { name: "橙色", value: "#f59e0b" },
    { name: "粉色", value: "#ec4899" },
    { name: "灰色", value: "#6b7280" }
  ]

  // predefinedCategoryColors moved to ActivityCategorySettings

  // 初始化从本地存储加载主题颜色
  useEffect(() => {
    const savedThemeColor = localStorage.getItem('themeColor')
    if (savedThemeColor) {
      setThemeColor(savedThemeColor)
      
      // 更新CSS变量
      document.documentElement.style.setProperty('--theme-primary', savedThemeColor)
      
      // 转换为HSL并更新CSS变量
      const hslColor = hexToHSL(savedThemeColor)
      document.documentElement.style.setProperty('--primary', hslColor)
      document.documentElement.style.setProperty('--primary-hsl', hslColor)
    }
  }, [])

  // 当主题颜色变化时更新CSS变量和本地存储
  useEffect(() => {
    // 设置主题颜色
    document.documentElement.style.setProperty('--theme-primary', themeColor)
    
    // 转换为HSL并更新Tailwind使用的CSS变量
    const hslColor = hexToHSL(themeColor)
    document.documentElement.style.setProperty('--primary', hslColor)
    document.documentElement.style.setProperty('--primary-hsl', hslColor)
    
    // 保存到本地存储
    localStorage.setItem('themeColor', themeColor)
  }, [themeColor])

  const handleWorkDayToggle = (day: string) => {
    if (workDays.includes(day)) {
      setWorkDays(workDays.filter((d) => d !== day))
    } else {
      setWorkDays([...workDays, day])
    }
  }

  const handleDeleteTag = (tag: string) => {
    const newTagColors = { ...tagColors }
    delete newTagColors[tag]
    setTagColors(newTagColors)
  }

  const handleTagColorChange = (tag: string, color: string) => {
    setTagColors({
      ...tagColors,
      [tag]: color,
    })
  }

  const handleAddTag = () => {
    const newTag = prompt("请输入新标签名称")
    if (newTag && !tagColors[newTag]) {
      setTagColors({
        ...tagColors,
        [newTag]: "#64748b", // Default color
      })
    }
  }

  const handleThemeColorChange = (color: string) => {
    setThemeColor(color)
  }

  const loadFixedBreakRules = useCallback(async () => {
    setLoadingFixedBreakRules(true);
    setFixedBreakRuleError(null);
    try {
      const rules = await getAllDB<FixedBreakRule>(ObjectStores.FIXED_BREAK_RULES);
      rules.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setFixedBreakRules(rules);
    } catch (err) {
      console.error("Failed to load fixed break rules:", err);
      setFixedBreakRuleError("无法加载固定休息时段规则。如问题持续，请尝试刷新页面或检查数据库。");
      toast({ title: "加载失败", description: "无法加载固定休息时段规则。", variant: "destructive" });
    } finally {
      setLoadingFixedBreakRules(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === "worktime") {
      loadFixedBreakRules();
    }
    // Activity Categories loading useEffect is moved to ActivityCategorySettings
  }, [activeTab, loadFixedBreakRules]);


  // loadActivityCategories and its useEffect moved to ActivityCategorySettings

  // Placeholder functions for actions - to be implemented next
  const handleOpenAddFixedBreakRuleModal = () => {
    setCurrentEditingFixedBreakRule(null);
    setFixedBreakRuleFormData(initialFixedBreakRuleFormData);
    setIsFixedBreakRuleModalOpen(true);
  };

  const handleOpenEditFixedBreakRuleModal = (rule: FixedBreakRule) => {
    setCurrentEditingFixedBreakRule(rule);
    setFixedBreakRuleFormData({
      label: rule.label || "",
      startTime: parseStringToTime(rule.startTime),
      endTime: parseStringToTime(rule.endTime),
      daysOfWeek: rule.daysOfWeek || [],
      isEnabled: rule.isEnabled,
    });
    setIsFixedBreakRuleModalOpen(true);
  };

  const handleToggleFixedBreakRuleEnabled = async (rule: FixedBreakRule) => {
    const updatedRule = { ...rule, isEnabled: !rule.isEnabled, updatedAt: new Date() };
    try {
      setFixedBreakRuleSaving(true); // Use a general saving state or specific one
      await updateDB(ObjectStores.FIXED_BREAK_RULES, updatedRule);
      toast({ title: "规则状态已更新", description: `规则 "${rule.label || rule.startTime + '-' + rule.endTime}" 已${updatedRule.isEnabled ? '启用' : '禁用'}。` });
      loadFixedBreakRules(); // Refresh list
    } catch (error) {
      console.error("Failed to update rule state:", error);
      toast({ title: "更新失败", description: "无法更新规则状态。", variant: "destructive" });
    } finally {
      setFixedBreakRuleSaving(false);
    }
  };

  const handleDeleteFixedBreakRule = async (ruleId: number, ruleLabel?: string) => {
    const ruleIdentifier = ruleLabel || fixedBreakRules.find(r => r.id === ruleId)?.startTime + ' - ' + fixedBreakRules.find(r => r.id === ruleId)?.endTime;
    if (window.confirm(`确定要删除此固定休息时段 "${ruleIdentifier}" 吗？此操作无法撤销。`)) {
      try {
        setFixedBreakRuleSaving(true);
        await removeDB(ObjectStores.FIXED_BREAK_RULES, ruleId);
        toast({ title: "删除成功", description: `固定休息时段 "${ruleIdentifier}" 已被删除。` });
        loadFixedBreakRules(); // Refresh list
      } catch (error) {
        console.error("Failed to delete rule:", error);
        toast({ title: "删除失败", description: "无法删除该规则。", variant: "destructive" });
      } finally {
        setFixedBreakRuleSaving(false);
      }
    }
  };

  const handleFixedBreakRuleFormChange = (field: keyof FixedBreakRuleFormData, value: string | Time | string[]) => {
    if (field === 'startTime' || field === 'endTime') {
      setFixedBreakRuleFormData(prev => ({ ...prev, [field]: value as Time }));
    } else if (field === 'daysOfWeek') {
       // This case is handled by handleFixedBreakRuleDayToggle
    } else if (field === 'label' || field === 'isEnabled') { // Ensure isEnabled is handled if it's directly set, though typically through Switch
      setFixedBreakRuleFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFixedBreakRuleFormData(prev => ({ ...prev, [field]: value as string }));
    }
  };

  const handleFixedBreakRuleDayToggle = (dayId: string) => {
    setFixedBreakRuleFormData(prev => {
      const newDays = prev.daysOfWeek.includes(dayId)
        ? prev.daysOfWeek.filter(d => d !== dayId)
        : [...prev.daysOfWeek, dayId];
      newDays.sort((a, b) => ALL_DAYS_OF_WEEK.findIndex(d => d.id === a) - ALL_DAYS_OF_WEEK.findIndex(d => d.id === b)); // Keep days sorted
      return { ...prev, daysOfWeek: newDays };
    });
  };
  
  const handleCloseFixedBreakRuleModal = () => {
    setIsFixedBreakRuleModalOpen(false);
  };

  const handleSaveFixedBreakRule = async () => {
    const { label, startTime: startTimeInput, endTime: endTimeInput, daysOfWeek, isEnabled: formIsEnabled } = fixedBreakRuleFormData;

    let startTime: Time;
    let endTime: Time;

    if (startTimeInput instanceof Time) {
      startTime = startTimeInput;
    } else if (typeof startTimeInput === 'object' && startTimeInput !== null && 'hour' in startTimeInput && 'minute' in startTimeInput) {
      startTime = new Time(Number(startTimeInput.hour), Number(startTimeInput.minute));
    } else {
      toast({ title: "类型错误", description: "开始时间格式不正确。", variant: "destructive" });
      return;
    }

    if (endTimeInput instanceof Time) {
      endTime = endTimeInput;
    } else if (typeof endTimeInput === 'object' && endTimeInput !== null && 'hour' in endTimeInput && 'minute' in endTimeInput) {
      endTime = new Time(Number(endTimeInput.hour), Number(endTimeInput.minute));
    } else {
      toast({ title: "类型错误", description: "结束时间格式不正确。", variant: "destructive" });
      return;
    }

    if (startTime.compare(endTime) >= 0) {
      toast({ title: "验证错误", description: "结束时间必须晚于开始时间。", variant: "destructive" });
      return;
    }
    if (daysOfWeek.length === 0) {
      toast({ title: "验证错误", description: "请至少选择一个应用此规则的星期。", variant: "destructive" });
      return;
    }
    if (label.length > 100) { 
        toast({ title: "验证错误", description: "标签名称过长 (最多100字符)。", variant: "destructive" });
        return;
    }

    setFixedBreakRuleSaving(true);
    try {
      const ruleDataPayload = {
        label: label.trim() || undefined, 
        startTime: formatTimeToString(startTime),
        endTime: formatTimeToString(endTime),
        daysOfWeek: daysOfWeek,
      };

      if (currentEditingFixedBreakRule) {
        const ruleToUpdate: FixedBreakRule = {
          ...currentEditingFixedBreakRule,
          ...ruleDataPayload,
          label: ruleDataPayload.label, // ensure label is explicitly passed
          daysOfWeek: ruleDataPayload.daysOfWeek, // ensure daysOfWeek is explicitly passed
          isEnabled: formIsEnabled, 
          updatedAt: new Date(),
        };
        await updateDB(ObjectStores.FIXED_BREAK_RULES, ruleToUpdate);
        toast({ title: "更新成功", description: `固定休息规则 "${ruleToUpdate.label || ruleToUpdate.startTime +'-'+ ruleToUpdate.endTime}" 已更新。` });
      } else {
        const newRule: Omit<FixedBreakRule, 'id'> = {
          ...ruleDataPayload,
          label: ruleDataPayload.label, // ensure label is explicitly passed
          daysOfWeek: ruleDataPayload.daysOfWeek, // ensure daysOfWeek is explicitly passed
          isEnabled: true, 
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await addDB(ObjectStores.FIXED_BREAK_RULES, newRule);
        toast({ title: "创建成功", description: `新的固定休息规则已添加。` });
      }
      await loadFixedBreakRules(); // Use await here to ensure list is updated before modal might reopen or other actions
      handleCloseFixedBreakRuleModal();
    } catch (error) {
      console.error("Failed to save fixed break rule:", error);
      toast({ title: "保存失败", description: "无法保存规则，请重试。", variant: "destructive" });
    } finally {
      setFixedBreakRuleSaving(false);
    }
  };

  // --- Activity Category Modal and CRUD Functions moved to ActivityCategorySettings.tsx ---
  // handleOpenAddActivityCategoryModal, handleOpenEditActivityCategoryModal, handleCloseActivityCategoryModal,
  // handleSaveActivityCategory, handleDeleteActivityCategory, handleConfirmRecategorizeAndDelete, handleSelectIcon

  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground">自定义应用程序以满足您的需求</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left sidebar navigation */}
        <div className="md:w-1/4">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-1">
                <Button
                  variant={activeTab === "account" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("account")}
                >
                  <User className="h-4 w-4 mr-2" />
                  账户信息
                </Button>
                <Button
                  variant={activeTab === "general" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("general")}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  通用偏好
                </Button>
                <Button
                  variant={activeTab === "pomodoro" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("pomodoro")}
                >
                  <Timer className="h-4 w-4 mr-2" />
                  番茄钟设置
                </Button>
                <Button
                  variant={activeTab === "notifications" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("notifications")}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  通知设置
                </Button>
                <Button
                  variant={activeTab === "worktime" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("worktime")}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  工作时间段
                </Button>
                <Button
                  variant={activeTab === "ai" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("ai")}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  AI助手配置
                </Button>
                <Button
                  variant={activeTab === "data" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("data")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  数据管理
                </Button>
                <Button
                  variant={activeTab === "tags" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("tags")}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  标签管理
                </Button>
                <Button
                  variant={activeTab === "activityCategories" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("activityCategories")}
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  活动分类管理
                </Button>
                <Button
                  variant={activeTab === "integrations" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("integrations")}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  外部集成
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Right content area */}
        <div className="md:w-3/4">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "account" && "账户信息"}
                {activeTab === "general" && "通用偏好"}
                {activeTab === "pomodoro" && "番茄钟设置"}
                {activeTab === "notifications" && "通知设置"}
                {activeTab === "worktime" && "工作时间段"}
                {activeTab === "ai" && "AI助手配置"}
                {activeTab === "data" && "数据管理"}
                {activeTab === "tags" && "标签管理"}
                {activeTab === "activityCategories" && "活动分类管理"}
                {activeTab === "integrations" && "外部集成"}
              </CardTitle>
              <CardDescription>
                {activeTab === "account" && "管理您的个人信息和账户安全"}
                {activeTab === "general" && "自定义应用程序的外观和行为"}
                {activeTab === "pomodoro" && "配置番茄工作法的时间和提示"}
                {activeTab === "notifications" && "设置何时以及如何接收通知"}
                {activeTab === "worktime" && "定义您的工作时间和工作日"}
                {activeTab === "ai" && "配置AI助手的行为和权限"}
                {activeTab === "data" && "导入、导出和管理您的数据"}
                {activeTab === "tags" && "创建和管理任务标签"}
                {activeTab === "activityCategories" && "创建和管理您的时间日志和时间块的活动分类"}
                {activeTab === "integrations" && "连接到第三方服务和应用"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Settings */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex flex-col items-center space-y-2">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src="/placeholder.svg?height=96&width=96" alt="用户头像" />
                        <AvatarFallback>用户</AvatarFallback>
                      </Avatar>
                      <Button size="sm">更换头像</Button>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">昵称</Label>
                        <Input id="name" defaultValue="张三" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">邮箱</Label>
                        <Input id="email" type="email" defaultValue="zhangsan@example.com" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">修改密码</h3>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="current-password">当前密码</Label>
                        <Input id="current-password" type="password" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="new-password">新密码</Label>
                        <Input id="new-password" type="password" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="confirm-password">确认新密码</Label>
                        <Input id="confirm-password" type="password" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* General Preferences */}
              {activeTab === "general" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">主题设置</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sun className={cn("h-5 w-5", resolvedTheme === "light" ? "text-amber-500" : "text-muted-foreground")} />
                        <Label htmlFor="theme-toggle">深色模式</Label>
                        <Moon className={cn("h-5 w-5", resolvedTheme === "dark" ? "text-blue-500" : "text-muted-foreground")} />
                      </div>
                      <Switch
                        id="theme-toggle"
                        checked={resolvedTheme === "dark"}
                        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="theme-color">主题颜色</Label>
                      <div className="flex flex-wrap gap-3 mt-2">
                        {predefinedColors.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            className={cn(
                              "w-8 h-8 rounded-full transition-all",
                              themeColor === color.value ? "ring-2 ring-offset-2 ring-offset-background" : "hover:scale-110"
                            )}
                            style={{ backgroundColor: color.value }}
                            onClick={() => handleThemeColorChange(color.value)}
                            title={color.name}
                          />
                        ))}
                        <div className="relative">
                          <input
                            type="color"
                            id="custom-color"
                            value={themeColor}
                            onChange={(e) => handleThemeColorChange(e.target.value)}
                            className="sr-only"
                          />
                          <label 
                            htmlFor="custom-color" 
                            className="block w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center cursor-pointer hover:scale-110 transition-all"
                            title="自定义颜色"
                          >
                            <span className="text-xl">+</span>
                          </label>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">选择应用程序的主色调</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">默认视图</h3>
                    <div className="grid gap-2">
                      <Label>启动时显示</Label>
                      <Select defaultValue="today">
                        <SelectTrigger>
                          <SelectValue placeholder="选择默认视图" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">今日视图</SelectItem>
                          <SelectItem value="tasks">任务列表</SelectItem>
                          <SelectItem value="inbox">收集箱</SelectItem>
                          <SelectItem value="calendar">日历视图</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">日期和时间格式</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="date-format">日期格式</Label>
                      <Select defaultValue="yyyy-MM-dd">
                        <SelectTrigger id="date-format">
                          <SelectValue placeholder="选择日期格式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yyyy-MM-dd">2025-05-18</SelectItem>
                          <SelectItem value="dd/MM/yyyy">18/05/2025</SelectItem>
                          <SelectItem value="MM/dd/yyyy">05/18/2025</SelectItem>
                          <SelectItem value="yyyy年MM月dd日">2025年05月18日</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="time-format">时间格式</Label>
                      <Select defaultValue="HH:mm">
                        <SelectTrigger id="time-format">
                          <SelectValue placeholder="选择时间格式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HH:mm">24小时制 (14:30)</SelectItem>
                          <SelectItem value="hh:mm a">12小时制 (02:30 PM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">语言</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="language">界面语言</Label>
                      <Select defaultValue="zh-CN">
                        <SelectTrigger id="language">
                          <SelectValue placeholder="选择语言" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zh-CN">简体中文</SelectItem>
                          <SelectItem value="en-US">English (US)</SelectItem>
                          <SelectItem value="ja-JP">日本語</SelectItem>
                          <SelectItem value="ko-KR">한국어</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Pomodoro Settings */}
              {activeTab === "pomodoro" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">时间设置</h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="work-duration">工作时长（分钟）: {workDuration}</Label>
                          <span className="text-sm text-muted-foreground">{workDuration} 分钟</span>
                        </div>
                        <Slider
                          id="work-duration"
                          min={5}
                          max={60}
                          step={5}
                          value={[workDuration]}
                          onValueChange={(value) => setWorkDuration(value[0])}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="short-break">短休息时长（分钟）</Label>
                          <span className="text-sm text-muted-foreground">{shortBreakDuration} 分钟</span>
                        </div>
                        <Slider
                          id="short-break"
                          min={1}
                          max={15}
                          step={1}
                          value={[shortBreakDuration]}
                          onValueChange={(value) => setShortBreakDuration(value[0])}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="long-break">长休息时长（分钟）</Label>
                          <span className="text-sm text-muted-foreground">{longBreakDuration} 分钟</span>
                        </div>
                        <Slider
                          id="long-break"
                          min={5}
                          max={30}
                          step={5}
                          value={[longBreakDuration]}
                          onValueChange={(value) => setLongBreakDuration(value[0])}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="pomodoro-count">番茄钟循环次数</Label>
                          <span className="text-sm text-muted-foreground">{pomodoroCount} 次</span>
                        </div>
                        <Slider
                          id="pomodoro-count"
                          min={1}
                          max={10}
                          step={1}
                          value={[pomodoroCount]}
                          onValueChange={(value) => setPomodoroCount(value[0])}
                        />
                        <p className="text-xs text-muted-foreground">完成这么多次番茄钟后会有一次长休息</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">提示音设置</h3>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="sound-enabled">启用提示音</Label>
                      </div>
                      <Switch id="sound-enabled" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="sound-type">提示音类型</Label>
                      <Select defaultValue="bell" disabled={!soundEnabled}>
                        <SelectTrigger id="sound-type">
                          <SelectValue placeholder="选择提示音" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bell">铃声</SelectItem>
                          <SelectItem value="digital">数字音</SelectItem>
                          <SelectItem value="nature">自然音</SelectItem>
                          <SelectItem value="custom">自定义</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="sound-volume">音量</Label>
                      <Slider
                        id="sound-volume"
                        min={0}
                        max={100}
                        step={10}
                        defaultValue={[80]}
                        disabled={!soundEnabled}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">自动化设置</h3>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="auto-start-breaks" defaultChecked />
                        <Label htmlFor="auto-start-breaks">自动开始休息</Label>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">工作时段结束后自动开始休息计时</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="auto-start-work" />
                        <Label htmlFor="auto-start-work">自动开始工作</Label>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">休息结束后自动开始下一个工作时段</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="auto-complete-task" />
                        <Label htmlFor="auto-complete-task">自动完成任务</Label>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">完成所有番茄钟后询问是否标记任务为已完成</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">通知类型</h3>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="notifications-enabled">启用通知</Label>
                      </div>
                      <Switch
                        id="notifications-enabled"
                        checked={notificationsEnabled}
                        onCheckedChange={setNotificationsEnabled}
                      />
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="task-reminders" defaultChecked disabled={!notificationsEnabled} />
                          <Label
                            htmlFor="task-reminders"
                            className={cn(!notificationsEnabled && "text-muted-foreground")}
                          >
                            任务提醒
                          </Label>
                        </div>
                        <div className="flex items-center pl-6">
                          <Label
                            htmlFor="task-reminder-time"
                            className={cn("mr-2 text-sm", !notificationsEnabled && "text-muted-foreground")}
                          >
                            提前
                          </Label>
                          <Select defaultValue="15" disabled={!notificationsEnabled}>
                            <SelectTrigger id="task-reminder-time" className="w-24">
                              <SelectValue placeholder="选择时间" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 分钟</SelectItem>
                              <SelectItem value="10">10 分钟</SelectItem>
                              <SelectItem value="15">15 分钟</SelectItem>
                              <SelectItem value="30">30 分钟</SelectItem>
                              <SelectItem value="60">1 小时</SelectItem>
                            </SelectContent>
                          </Select>
                          <Label className={cn("ml-2 text-sm", !notificationsEnabled && "text-muted-foreground")}>
                            提醒
                          </Label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="pomodoro-reminders" defaultChecked disabled={!notificationsEnabled} />
                          <Label
                            htmlFor="pomodoro-reminders"
                            className={cn(!notificationsEnabled && "text-muted-foreground")}
                          >
                            番茄钟提醒
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">在番茄钟工作和休息时段结束时发送通知</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="review-reminders" defaultChecked disabled={!notificationsEnabled} />
                          <Label
                            htmlFor="review-reminders"
                            className={cn(!notificationsEnabled && "text-muted-foreground")}
                          >
                            复习提醒
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">在任务截止日期前发送提醒</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Work Time Settings */}
              {activeTab === "worktime" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">工作日设置</h3>
                    <div className="grid gap-2">
                      <Label>选择工作日</Label>
                      <div className="flex flex-wrap gap-2">
                        {ALL_DAYS_OF_WEEK.map((day) => (
                          <div key={day.id} className="flex items-center space-x-1">
                            <Checkbox
                              id={`workday-${day.id}`}
                              checked={workDays.includes(day.id)}
                              onCheckedChange={() => handleWorkDayToggle(day.id)}
                            />
                            <Label htmlFor={`workday-${day.id}`} className="text-sm font-normal">{day.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">工作时间段</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="work-start-time">开始时间</Label>
                      <TimeField id="work-start-time" value={workStartTime} onChange={setWorkStartTime} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="work-end-time">结束时间</Label>
                      <TimeField id="work-end-time" value={workEndTime} onChange={setWorkEndTime} />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">固定休息时段</h3>
                    <p className="text-sm text-muted-foreground">
                      设置您希望在每日时间轴上自动创建的固定休息时间段。
                    </p>
                    
                    {loadingFixedBreakRules && (
                      <div className="flex items-center justify-center py-6 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>正在加载规则...</span>
                      </div>
                    )}

                    {!loadingFixedBreakRules && fixedBreakRuleError && (
                      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-600">
                        <div className="flex items-center">
                          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                          <span className="flex-grow">{fixedBreakRuleError}</span>
                          <Button variant="outline" size="sm" onClick={loadFixedBreakRules} className="ml-4 flex-shrink-0">
                            重试
                          </Button>
                        </div>
                      </div>
                    )}

                    {!loadingFixedBreakRules && !fixedBreakRuleError && fixedBreakRules.length === 0 && (
                      <div className="flex flex-col items-center justify-center space-y-3 rounded-lg border-2 border-dashed border-border py-10 text-center">
                        <ListChecks className="h-12 w-12 text-muted-foreground" />
                        <p className="text-lg font-medium text-muted-foreground">
                          您尚未设置任何固定的休息时段。
                        </p>
                        <Button onClick={handleOpenAddFixedBreakRuleModal}>
                          <PlusCircle className="mr-2 h-4 w-4" /> 添加休息时段
                        </Button>
                      </div>
                    )}

                    {!loadingFixedBreakRules && !fixedBreakRuleError && fixedBreakRules.length > 0 && (
                      <div className="space-y-3">
                        {fixedBreakRules.map(rule => (
                          <Card key={rule.id} className={cn(!rule.isEnabled && "bg-muted/30 dark:bg-muted/20")}>
                            <CardContent className="p-3 flex items-center justify-between gap-3">
                              <div className={cn("flex-grow", !rule.isEnabled && "opacity-60")}>
                                <p className="font-semibold text-sm truncate" title={rule.label || "休息时段"}>{rule.label || "休息时段"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {rule.startTime} - {rule.endTime}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {displayDaysOfWeek(rule.daysOfWeek)}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <Switch
                                  checked={rule.isEnabled}
                                  onCheckedChange={() => handleToggleFixedBreakRuleEnabled(rule)}
                                  aria-label={rule.isEnabled ? "禁用规则" : "启用规则"}
                                  id={`enable-rule-${rule.id}`}
                                  disabled={fixedBreakRuleSaving} // Disable switch during any save operation
                                />
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditFixedBreakRuleModal(rule)} title="编辑规则" disabled={fixedBreakRuleSaving}>
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                                  onClick={() => rule.id !== undefined && handleDeleteFixedBreakRule(rule.id, rule.label)}
                                  title="删除规则"
                                  disabled={fixedBreakRuleSaving}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {!loadingFixedBreakRules && !fixedBreakRuleError && fixedBreakRules.length > 0 && (
                      <Button onClick={handleOpenAddFixedBreakRuleModal} className="mt-4 w-full" disabled={fixedBreakRuleSaving}>
                        <PlusCircle className="mr-2 h-4 w-4" /> 添加新的休息时段
                      </Button>
                    )}
                  </div>
                  {/* Fixed Break Rule Modal */}
                  <Dialog open={isFixedBreakRuleModalOpen} onOpenChange={(open) => {if (!open) handleCloseFixedBreakRuleModal(); else setIsFixedBreakRuleModalOpen(true);}}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{currentEditingFixedBreakRule ? "编辑固定休息时段" : "添加固定休息时段"}</DialogTitle>
                        <DialogDescription>
                          {currentEditingFixedBreakRule ? "修改规则的详细信息。" : "设置一个新的自动安排的休息时间。"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="rule-label" className="text-right">标签/名称</Label>
                          <Input 
                            id="rule-label" 
                            value={fixedBreakRuleFormData.label}
                            onChange={(e) => handleFixedBreakRuleFormChange('label', e.target.value)}
                            className="col-span-3"
                            placeholder="例如：午休 (可选)"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="rule-startTime" className="text-right">开始时间</Label>
                          <TimeField 
                            id="rule-startTime"
                            aria-label="规则开始时间"
                            value={fixedBreakRuleFormData.startTime}
                            onChange={(time) => handleFixedBreakRuleFormChange('startTime', time)}
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="rule-endTime" className="text-right">结束时间</Label>
                          <TimeField
                            id="rule-endTime"
                            aria-label="规则结束时间"
                            value={fixedBreakRuleFormData.endTime}
                            onChange={(time) => handleFixedBreakRuleFormChange('endTime', time)}
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                          <Label className="text-right pt-1">应用星期</Label>
                          <div className="col-span-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-2 gap-y-3">
                            {ALL_DAYS_OF_WEEK.map(day => (
                              <div key={day.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`rule-day-${day.id}`}
                                  checked={fixedBreakRuleFormData.daysOfWeek.includes(day.id)}
                                  onCheckedChange={() => handleFixedBreakRuleDayToggle(day.id)}
                                />
                                <Label htmlFor={`rule-day-${day.id}`} className="font-normal text-sm cursor-pointer">{day.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        {currentEditingFixedBreakRule && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="rule-isEnabled" className="text-right">启用此规则</Label>
                                <Switch
                                    id="rule-isEnabled"
                                    checked={fixedBreakRuleFormData.isEnabled}
                                    onCheckedChange={(checked) => setFixedBreakRuleFormData(prev => ({...prev, isEnabled: checked}))}
                                    className="col-span-3 justify-self-start" 
                                />
                            </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCloseFixedBreakRuleModal} disabled={fixedBreakRuleSaving}>取消</Button>
                        <Button type="button" onClick={handleSaveFixedBreakRule} disabled={fixedBreakRuleSaving}>
                          {fixedBreakRuleSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {currentEditingFixedBreakRule ? "保存更改" : "创建规则"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* AI Settings */}
              {activeTab === "ai" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">AI助手行为</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="ai-assistant-enabled">启用AI助手</Label>
                      <Switch id="ai-assistant-enabled" checked={true} onCheckedChange={() => {}} />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">AI权限设置</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="ai-access-level">访问级别</Label>
                      <Select defaultValue="basic">
                        <SelectTrigger id="ai-access-level">
                          <SelectValue placeholder="选择访问级别" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">基本</SelectItem>
                          <SelectItem value="advanced">高级</SelectItem>
                          <SelectItem value="full">完全</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Management */}
              {activeTab === "data" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">数据导入</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="data-import">导入数据文件</Label>
                      <Input id="data-import" type="file" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">数据导出</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="data-export">导出数据文件</Label>
                      <Button id="data-export">导出</Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">数据清理</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="data-cleanup">清理旧数据</Label>
                      <Button id="data-cleanup">清理</Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tag Management */}
              {activeTab === "tags" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">标签颜色设置</h3>
                    <div className="grid gap-4">
                      {Object.entries(tagColors).map(([tag, color]) => (
                        <div key={tag} className="flex items-center justify-between">
                          <Label htmlFor={tag}>{tag}</Label>
                          <input
                            type="color"
                            id={tag}
                            defaultValue={color}
                            className="w-10 h-10 rounded-md border cursor-pointer"
                            onChange={(e) => handleTagColorChange(tag, e.target.value)}
                          />
                          <Button size="sm" onClick={() => handleDeleteTag(tag)}>
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">添加新标签</h3>
                    <div className="grid gap-2">
                      <Button onClick={handleAddTag}>添加标签</Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Category Management - Replaced with new component */}
              {activeTab === "activityCategories" && (
                <ActivityCategorySettings toast={toast} />
              )}

              {/* Integrations */}
              {activeTab === "integrations" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">连接第三方服务</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="integration-service">选择服务</Label>
                      <Select defaultValue="none">
                        <SelectTrigger id="integration-service">
                          <SelectValue placeholder="选择服务" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">无</SelectItem>
                          <SelectItem value="google">Google</SelectItem>
                          <SelectItem value="microsoft">Microsoft</SelectItem>
                          <SelectItem value="apple">Apple</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">集成状态</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="integration-status">状态</Label>
                      <Select defaultValue="disconnected">
                        <SelectTrigger id="integration-status">
                          <SelectValue placeholder="选择状态" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disconnected">未连接</SelectItem>
                          <SelectItem value="connected">已连接</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
