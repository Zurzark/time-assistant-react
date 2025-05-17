"use client"

import { useState } from "react"
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
import { Bell, Brain, Clock, Download, Globe, Moon, Settings, Sun, Tag, Timer, User } from "lucide-react"
import { TimeField } from "@/components/ui/time-field"
import type { TimeValue } from "@internationalized/date"

export function SettingsView() {
  const [activeTab, setActiveTab] = useState("account")
  const [theme, setTheme] = useState("light")
  const [workDuration, setWorkDuration] = useState(25)
  const [shortBreakDuration, setShortBreakDuration] = useState(5)
  const [longBreakDuration, setLongBreakDuration] = useState(15)
  const [pomodoroCount, setPomodoroCount] = useState(4)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [browserNotifications, setBrowserNotifications] = useState(true)
  const [soundNotifications, setSoundNotifications] = useState(true)
  const [workDays, setWorkDays] = useState<string[]>(["monday", "tuesday", "wednesday", "thursday", "friday"])
  const [workStartTime, setWorkStartTime] = useState<TimeValue>({ hour: 9, minute: 0 })
  const [workEndTime, setWorkEndTime] = useState<TimeValue>({ hour: 18, minute: 0 })
  const [tagColors, setTagColors] = useState({
    工作: "#ef4444",
    学习: "#3b82f6",
    个人: "#10b981",
    家庭: "#f59e0b",
    健康: "#8b5cf6",
  })

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
                        <Sun className="h-4 w-4" />
                        <Label htmlFor="theme-toggle">深色模式</Label>
                        <Moon className="h-4 w-4" />
                      </div>
                      <Switch
                        id="theme-toggle"
                        checked={theme === "dark"}
                        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="theme-color">主题颜色</Label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          id="theme-color"
                          defaultValue="#0ea5e9"
                          className="w-10 h-10 rounded-md border cursor-pointer"
                        />
                        <span className="text-sm text-muted-foreground">选择应用程序的主色调</span>
                      </div>
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
                        {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                          <Checkbox
                            key={day}
                            id={day}
                            defaultChecked={workDays.includes(day)}
                            onCheckedChange={() => handleWorkDayToggle(day)}
                          />
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
