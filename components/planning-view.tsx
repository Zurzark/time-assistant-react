"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarIcon, ChevronLeft, ChevronRight, Clock, Sparkles, Target, CheckCircle2, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const tasks = [
  {
    id: 1,
    title: "完成产品设计方案",
    description: "为新版应用完成用户界面设计和交互流程",
    priority: "high",
    dueDate: "2025-05-17",
    estimatedTime: 120,
    project: "产品开发",
    status: "in-progress",
    tags: ["设计", "UI/UX"],
  },
  {
    id: 2,
    title: "团队周会",
    description: "与团队讨论本周进度和下周计划",
    priority: "medium",
    dueDate: "2025-05-17",
    estimatedTime: 60,
    project: "团队管理",
    status: "todo",
    tags: ["会议"],
  },
  {
    id: 3,
    title: "编写项目文档",
    description: "完成项目技术文档和用户手册",
    priority: "medium",
    dueDate: "2025-05-17",
    estimatedTime: 90,
    project: "产品开发",
    status: "todo",
    tags: ["文档"],
  },
  {
    id: 4,
    title: "学习React新特性",
    description: "学习React 19的新特性和最佳实践",
    priority: "low",
    dueDate: "2025-05-17",
    estimatedTime: 60,
    project: "个人发展",
    status: "todo",
    tags: ["学习", "技术"],
  },
  {
    id: 5,
    title: "健身",
    description: "进行每日健身锻炼",
    priority: "medium",
    dueDate: "2025-05-17",
    estimatedTime: 60,
    project: "健康",
    status: "todo",
    tags: ["个人"],
  },
  {
    id: 7,
    title: "准备演讲材料",
    description: "为下周的产品发布会准备演讲材料",
    priority: "high",
    dueDate: "2025-05-20",
    estimatedTime: 120,
    project: "市场营销",
    status: "todo",
    tags: ["演讲", "市场"],
  },
]

const priorityColors = {
  high: "text-red-500",
  medium: "text-amber-500",
  low: "text-green-500",
}

const priorityBg = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-green-500",
}

const timeSlots = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 9
  return {
    time: `${hour}:00`,
    hour,
  }
})

const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

export function PlanningView() {
  const [view, setView] = useState("day")
  const [selectedTasks, setSelectedTasks] = useState([1, 2, 3, 5])
  const [aiPlanGenerated, setAiPlanGenerated] = useState(false)

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]))
  }

  const generateAiPlan = () => {
    setAiPlanGenerated(true)
  }

  return (
    <div className="flex flex-col p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">计划制定</h1>
          <p className="text-muted-foreground">智能规划您的日程和任务</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">2025年5月17日</div>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="mx-2 h-6" />
          <Button variant="outline" size="sm">
            <CalendarIcon className="mr-2 h-4 w-4" />
            今天
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>待选任务池</CardTitle>
              <CardDescription>选择要纳入计划的任务</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors",
                        selectedTasks.includes(task.id) && "border-primary bg-primary/5",
                      )}
                    >
                      <Checkbox
                        id={`select-task-${task.id}`}
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={() => toggleTaskSelection(task.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <label htmlFor={`select-task-${task.id}`} className="font-medium cursor-pointer">
                            {task.title}
                          </label>
                          <div className={cn("flex items-center gap-1", priorityColors[task.priority])}>
                            <div className={cn("h-2 w-2 rounded-full", priorityBg[task.priority])}></div>
                          </div>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{task.description}</div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {Math.floor(task.estimatedTime / 60)}h {task.estimatedTime % 60}m
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{task.dueDate}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                目标关联
              </CardTitle>
              <CardDescription>您的长期和短期目标</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>短期目标</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <div className="font-medium">完成产品设计迭代</div>
                          <div className="text-sm text-muted-foreground">截止日期: 2025-05-20</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <div className="font-medium">学习新技术框架</div>
                          <div className="text-sm text-muted-foreground">截止日期: 2025-05-31</div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>长期目标</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <div className="font-medium">提升团队协作效率</div>
                          <div className="text-sm text-muted-foreground">持续目标</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <div className="font-medium">掌握高级设计技能</div>
                          <div className="text-sm text-muted-foreground">截止日期: 2025-12-31</div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>时间规划</CardTitle>
                <Tabs defaultValue="day" onValueChange={setView}>
                  <TabsList>
                    <TabsTrigger value="day">日视图</TabsTrigger>
                    <TabsTrigger value="week">周视图</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {view === "day" ? (
                <div className="space-y-3">
                  {timeSlots.map((slot) => (
                    <div key={slot.time} className="flex items-start gap-3">
                      <div className="w-16 text-sm text-muted-foreground pt-2">{slot.time}</div>
                      <div className="flex-1 min-h-14 rounded-lg border border-dashed p-2 hover:border-primary/50 hover:bg-muted/30 transition-colors">
                        {aiPlanGenerated && slot.hour === 9 && (
                          <div className="rounded-md bg-primary/10 p-2">
                            <div className="font-medium">完成产品设计方案</div>
                            <div className="mt-1 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">9:00 - 11:00</span>
                              <Badge variant="outline" className="text-xs">
                                产品开发
                              </Badge>
                            </div>
                          </div>
                        )}
                        {aiPlanGenerated && slot.hour === 11 && (
                          <div className="rounded-md bg-primary/10 p-2">
                            <div className="font-medium">团队周会</div>
                            <div className="mt-1 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">11:00 - 12:00</span>
                              <Badge variant="outline" className="text-xs">
                                团队管理
                              </Badge>
                            </div>
                          </div>
                        )}
                        {aiPlanGenerated && slot.hour === 14 && (
                          <div className="rounded-md bg-primary/10 p-2">
                            <div className="font-medium">编写项目文档</div>
                            <div className="mt-1 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">14:00 - 15:30</span>
                              <Badge variant="outline" className="text-xs">
                                产品开发
                              </Badge>
                            </div>
                          </div>
                        )}
                        {aiPlanGenerated && slot.hour === 17 && (
                          <div className="rounded-md bg-primary/10 p-2">
                            <div className="font-medium">健身</div>
                            <div className="mt-1 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">17:00 - 18:00</span>
                              <Badge variant="outline" className="text-xs">
                                健康
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-8 gap-2">
                      <div className=""></div>
                      {weekDays.map((day) => (
                        <div key={day} className="text-center font-medium py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {timeSlots.map((slot) => (
                        <div key={slot.time} className="grid grid-cols-8 gap-2">
                          <div className="text-sm text-muted-foreground py-2">{slot.time}</div>
                          {weekDays.map((day, index) => (
                            <div
                              key={`${day}-${slot.time}`}
                              className="min-h-14 rounded-lg border border-dashed p-1 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                            >
                              {aiPlanGenerated && index === 0 && slot.hour === 9 && (
                                <div className="rounded-md bg-primary/10 p-1 text-xs">
                                  <div className="font-medium">完成产品设计方案</div>
                                  <div className="mt-1 text-muted-foreground">9:00 - 11:00</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                AI 智能规划
              </CardTitle>
              <CardDescription>基于您的任务优先级、截止日期和预估时间生成最优计划</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">已选择 {selectedTasks.length} 个任务</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>AI 将根据您选择的任务生成最优计划</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Button onClick={generateAiPlan}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    生成 AI 计划
                  </Button>
                </div>

                {aiPlanGenerated && (
                  <>
                    <div className="rounded-lg border p-4 bg-muted/30">
                      <h3 className="font-medium mb-2">AI 规划结果</h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                            1
                          </div>
                          <div>
                            <div className="font-medium">完成产品设计方案 (9:00 - 11:00)</div>
                            <div className="text-sm text-muted-foreground">优先级高，截止今天</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                            2
                          </div>
                          <div>
                            <div className="font-medium">团队周会 (11:00 - 12:00)</div>
                            <div className="text-sm text-muted-foreground">固定时间安排</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                            3
                          </div>
                          <div>
                            <div className="font-medium">编写项目文档 (14:00 - 15:30)</div>
                            <div className="text-sm text-muted-foreground">优先级中，截止今天</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                            4
                          </div>
                          <div>
                            <div className="font-medium">健身 (17:00 - 18:00)</div>
                            <div className="text-sm text-muted-foreground">个人习惯，固定时间</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h3 className="font-medium mb-2">AI 规划考虑因素</h3>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <p>• 优先安排了高优先级任务"完成产品设计方案"在上午精力最充沛的时段</p>
                        <p>• 考虑到"团队周会"是固定时间，安排在11:00</p>
                        <p>• 午休后安排了中等优先级的"编写项目文档"</p>
                        <p>• 根据您的习惯，将"健身"安排在工作日结束前</p>
                        <p>• "学习React新特性"由于优先级较低，建议安排在明天</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
