"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Bell, Clock, Moon, Save, Settings, Sun, Zap } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function SettingsView() {
  const [pomodoroLength, setPomodoroLength] = useState(25)
  const [shortBreakLength, setShortBreakLength] = useState(5)
  const [longBreakLength, setLongBreakLength] = useState(15)

  return (
    <div className="flex flex-col p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">设置</h1>
          <p className="text-muted-foreground">自定义您的时间管理工具</p>
        </div>
      </div>

      <div className="mt-6">
        <Tabs defaultValue="general">
          <div className="flex justify-between">
            <TabsList>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                通用设置
              </TabsTrigger>
              <TabsTrigger value="pomodoro" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                番茄钟设置
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                通知设置
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                AI 设置
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-6">
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>个人信息</CardTitle>
                  <CardDescription>更新您的个人信息和偏好设置</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src="/placeholder.svg?height=64&width=64" alt="用户头像" />
                      <AvatarFallback>用户</AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" size="sm">
                        更换头像
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">姓名</Label>
                      <Input id="name" defaultValue="张三" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">邮箱</Label>
                      <Input id="email" type="email" defaultValue="zhangsan@example.com" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>工作时间设置</CardTitle>
                  <CardDescription>设置您的工作时间和偏好</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="workStartTime">工作开始时间</Label>
                      <Input id="workStartTime" type="time" defaultValue="09:00" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="workEndTime">工作结束时间</Label>
                      <Input id="workEndTime" type="time" defaultValue="18:00" />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>工作日</Label>
                    <div className="flex gap-2">
                      {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((day, index) => (
                        <Button key={day} variant={index < 5 ? "default" : "outline"} className="flex-1" size="sm">
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>外观设置</CardTitle>
                  <CardDescription>自定义应用的外观</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-2">
                    <Label>主题</Label>
                    <RadioGroup defaultValue="system" className="grid grid-cols-3 gap-4">
                      <div>
                        <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                        <Label
                          htmlFor="theme-light"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                        >
                          <Sun className="mb-2 h-6 w-6" />
                          浅色
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                        <Label
                          htmlFor="theme-dark"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                        >
                          <Moon className="mb-2 h-6 w-6" />
                          深色
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                        <Label
                          htmlFor="theme-system"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-primary bg-popover p-4 hover:bg-accent hover:text-accent-foreground"
                        >
                          <Settings className="mb-2 h-6 w-6" />
                          跟随系统
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid gap-2">
                    <Label>主题色</Label>
                    <div className="flex gap-2">
                      {["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-amber-500", "bg-red-500"].map((color) => (
                        <div
                          key={color}
                          className={`h-8 w-8 rounded-full ${color} cursor-pointer ${color === "bg-blue-500" ? "ring-2 ring-offset-2" : ""}`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pomodoro" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>番茄钟设置</CardTitle>
                  <CardDescription>自定义您的番茄钟和休息时间</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label>番茄钟时长 ({pomodoroLength} 分钟)</Label>
                        <span className="text-sm text-muted-foreground">{pomodoroLength} 分钟</span>
                      </div>
                      <Slider
                        defaultValue={[pomodoroLength]}
                        max={60}
                        min={5}
                        step={5}
                        onValueChange={(value) => setPomodoroLength(value[0])}
                      />
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label>短休息时长</Label>
                        <span className="text-sm text-muted-foreground">{shortBreakLength} 分钟</span>
                      </div>
                      <Slider
                        defaultValue={[shortBreakLength]}
                        max={15}
                        min={1}
                        step={1}
                        onValueChange={(value) => setShortBreakLength(value[0])}
                      />
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label>长休息时长</Label>
                        <span className="text-sm text-muted-foreground">{longBreakLength} 分钟</span>
                      </div>
                      <Slider
                        defaultValue={[longBreakLength]}
                        max={30}
                        min={5}
                        step={5}
                        onValueChange={(value) => setLongBreakLength(value[0])}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>长休息间隔</Label>
                      <Select defaultValue="4">
                        <SelectTrigger>
                          <SelectValue placeholder="选择间隔" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">每2个番茄钟后</SelectItem>
                          <SelectItem value="3">每3个番茄钟后</SelectItem>
                          <SelectItem value="4">每4个番茄钟后</SelectItem>
                          <SelectItem value="5">每5个番茄钟后</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-start-breaks">休息后自动开始下一个番茄钟</Label>
                      <Switch id="auto-start-breaks" />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-start-pomodoro">番茄钟结束后自动开始休息</Label>
                      <Switch id="auto-start-pomodoro" defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>声音设置</CardTitle>
                  <CardDescription>自定义番茄钟的声音提示</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sound-enabled">启用声音</Label>
                      <Switch id="sound-enabled" defaultChecked />
                    </div>

                    <div className="grid gap-2">
                      <Label>提示音</Label>
                      <Select defaultValue="bell">
                        <SelectTrigger>
                          <SelectValue placeholder="选择提示音" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bell">铃声</SelectItem>
                          <SelectItem value="digital">数字音</SelectItem>
                          <SelectItem value="nature">自然音</SelectItem>
                          <SelectItem value="none">无</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label>音量</Label>
                        <span className="text-sm text-muted-foreground">80%</span>
                      </div>
                      <Slider defaultValue={[80]} max={100} step={10} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>通知设置</CardTitle>
                  <CardDescription>自定义应用的通知方式</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="desktop-notifications">桌面通知</Label>
                      <Switch id="desktop-notifications" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="sound-notifications">声音通知</Label>
                      <Switch id="sound-notifications" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-notifications">邮件通知</Label>
                      <Switch id="email-notifications" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">通知我这些事件</h3>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify-task-due">任务截止提醒</Label>
                      <Switch id="notify-task-due" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify-pomodoro-end">番茄钟结束</Label>
                      <Switch id="notify-pomodoro-end" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify-break-end">休息结束</Label>
                      <Switch id="notify-break-end" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify-daily-summary">每日总结</Label>
                      <Switch id="notify-daily-summary" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify-ai-insights">AI 洞察</Label>
                      <Switch id="notify-ai-insights" defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI 设置</CardTitle>
                  <CardDescription>自定义 AI 助手的行为和偏好</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ai-enabled">启用 AI 助手</Label>
                      <Switch id="ai-enabled" defaultChecked />
                    </div>

                    <div className="grid gap-2">
                      <Label>AI 模型</Label>
                      <Select defaultValue="gpt-4">
                        <SelectTrigger>
                          <SelectValue placeholder="选择 AI 模型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                          <SelectItem value="claude">Claude</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>AI 助手风格</Label>
                      <Select defaultValue="balanced">
                        <SelectTrigger>
                          <SelectValue placeholder="选择 AI 助手风格" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">专业</SelectItem>
                          <SelectItem value="friendly">友好</SelectItem>
                          <SelectItem value="balanced">平衡</SelectItem>
                          <SelectItem value="direct">直接</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">AI 功能</h3>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="ai-planning">智能计划生成</Label>
                      <Switch id="ai-planning" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="ai-insights">数据分析与洞察</Label>
                      <Switch id="ai-insights" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="ai-suggestions">任务建议</Label>
                      <Switch id="ai-suggestions" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="ai-time-estimation">时间预估辅助</Label>
                      <Switch id="ai-time-estimation" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="ai-task-breakdown">任务分解辅助</Label>
                      <Switch id="ai-task-breakdown" defaultChecked />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-2">
                    <Label htmlFor="ai-api-key">API 密钥 (可选)</Label>
                    <Input id="ai-api-key" type="password" placeholder="输入您的 API 密钥" />
                    <p className="text-xs text-muted-foreground">
                      如果您有自己的 API 密钥，可以在此处输入以使用您自己的配额。
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <div className="mt-6 flex justify-end">
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          保存设置
        </Button>
      </div>
    </div>
  )
}
