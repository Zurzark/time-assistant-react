"use client"

import { useState } from "react"
import { Calendar, ChevronRight, Clock, Edit, Flag, MoreHorizontal, Plus, Target, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface Goal {
  id: number
  name: string
  description?: string
  dueDate?: Date
  progress: number
  status: "active" | "completed" | "paused"
  milestones?: {
    id: number
    name: string
    progress: number
  }[]
  projects?: {
    id: number
    name: string
    progress: number
  }[]
}

export function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: 1,
      name: "提高工作效率",
      description: "通过优化工作流程和学习新技能，提高整体工作效率",
      dueDate: new Date(2025, 11, 31),
      progress: 35,
      status: "active",
      milestones: [
        { id: 101, name: "学习时间管理技巧", progress: 80 },
        { id: 102, name: "优化工作环境", progress: 60 },
        { id: 103, name: "掌握自动化工具", progress: 20 },
      ],
      projects: [
        { id: 201, name: "工作流程优化", progress: 45 },
        { id: 202, name: "技能提升计划", progress: 30 },
      ],
    },
    {
      id: 2,
      name: "完成专业认证",
      description: "获取行业认可的专业认证，提升职业竞争力",
      dueDate: new Date(2025, 8, 30),
      progress: 60,
      status: "active",
      milestones: [
        { id: 104, name: "完成基础课程", progress: 100 },
        { id: 105, name: "参加模拟考试", progress: 75 },
        { id: 106, name: "准备最终考试", progress: 20 },
      ],
    },
    {
      id: 3,
      name: "建立个人品牌",
      description: "通过写作、演讲和社交媒体建立个人专业品牌",
      dueDate: new Date(2026, 5, 30),
      progress: 15,
      status: "active",
      projects: [
        { id: 203, name: "个人博客建设", progress: 40 },
        { id: 204, name: "社交媒体策略", progress: 10 },
      ],
    },
    {
      id: 4,
      name: "学习新语言",
      description: "达到中级水平的外语能力",
      dueDate: new Date(2025, 3, 15),
      progress: 100,
      status: "completed",
    },
    {
      id: 5,
      name: "健康生活方式",
      description: "建立规律的锻炼习惯和健康的饮食计划",
      progress: 25,
      status: "paused",
    },
  ])

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    name: "",
    description: "",
    status: "active",
    progress: 0,
  })
  const [date, setDate] = useState<Date>()
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const handleCreateGoal = () => {
    if (newGoal.name?.trim()) {
      const createdGoal: Goal = {
        id: Date.now(),
        name: newGoal.name,
        description: newGoal.description,
        dueDate: date,
        progress: 0,
        status: "active",
      }
      setGoals([...goals, createdGoal])
      setNewGoal({
        name: "",
        description: "",
        status: "active",
        progress: 0,
      })
      setDate(undefined)
      setIsCreateDialogOpen(false)
    }
  }

  const openGoalDetails = (goal: Goal) => {
    setSelectedGoal(goal)
    setIsDetailDialogOpen(true)
  }

  const getStatusColor = (status: Goal["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "completed":
        return "bg-blue-500"
      case "paused":
        return "bg-amber-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: Goal["status"]) => {
    switch (status) {
      case "active":
        return "进行中"
      case "completed":
        return "已完成"
      case "paused":
        return "已暂停"
      default:
        return "未知"
    }
  }

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">目标</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建目标
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>创建新目标</DialogTitle>
                <DialogDescription>设定一个新的长期目标</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">目标名称</Label>
                  <Input
                    id="name"
                    placeholder="输入目标名称"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    placeholder="输入目标描述（可选）"
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">期望完成日期</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>选择日期（可选）</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="meaning">目标意义</Label>
                  <Textarea id="meaning" placeholder="这个目标对您为什么重要？（可选）" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateGoal}>创建目标</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-muted-foreground">设定和追踪您的长期目标</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => (
          <Card key={goal.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{goal.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openGoalDetails(goal)}>
                      <ChevronRight className="h-4 w-4 mr-2" />
                      查看详情
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {goal.description && <CardDescription>{goal.description}</CardDescription>}
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>进度</span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="outline"
                      className={cn("flex items-center space-x-1 capitalize", {
                        "border-green-500 text-green-500": goal.status === "active",
                        "border-blue-500 text-blue-500": goal.status === "completed",
                        "border-amber-500 text-amber-500": goal.status === "paused",
                      })}
                    >
                      <span className={cn("h-2 w-2 rounded-full", getStatusColor(goal.status))}></span>
                      <span>{getStatusText(goal.status)}</span>
                    </Badge>
                  </div>
                  {goal.dueDate && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{goal.dueDate.toLocaleDateString()}</span>
                    </Badge>
                  )}
                </div>

                {goal.milestones && goal.milestones.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">里程碑</h4>
                    <div className="space-y-2">
                      {goal.milestones.slice(0, 2).map((milestone) => (
                        <div key={milestone.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{milestone.name}</span>
                            <span className="text-xs">{milestone.progress}%</span>
                          </div>
                          <Progress value={milestone.progress} className="h-1.5" />
                        </div>
                      ))}
                      {goal.milestones.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => openGoalDetails(goal)}
                        >
                          查看全部 {goal.milestones.length} 个里程碑
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => openGoalDetails(goal)}>
                查看详情
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Goal Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          {selectedGoal && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-2xl">{selectedGoal.name}</DialogTitle>
                  <Badge
                    variant="outline"
                    className={cn("flex items-center space-x-1 capitalize", {
                      "border-green-500 text-green-500": selectedGoal.status === "active",
                      "border-blue-500 text-blue-500": selectedGoal.status === "completed",
                      "border-amber-500 text-amber-500": selectedGoal.status === "paused",
                    })}
                  >
                    <span className={cn("h-2 w-2 rounded-full", getStatusColor(selectedGoal.status))}></span>
                    <span>{getStatusText(selectedGoal.status)}</span>
                  </Badge>
                </div>
                <DialogDescription>{selectedGoal.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">总体进度</span>
                    <span>{selectedGoal.progress}%</span>
                  </div>
                  <Progress value={selectedGoal.progress} className="h-2.5" />
                </div>

                <div className="flex items-center justify-between">
                  {selectedGoal.dueDate && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        期望完成日期: <span className="font-medium">{selectedGoal.dueDate.toLocaleDateString()}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      编辑
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          更多操作
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Flag className="h-4 w-4 mr-2" />
                          添加关联项目
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Target className="h-4 w-4 mr-2" />
                          添加里程碑
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除目标
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {selectedGoal.milestones && selectedGoal.milestones.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium">里程碑</h3>
                    <Card>
                      <CardContent className="p-4 space-y-4">
                        {selectedGoal.milestones.map((milestone) => (
                          <div key={milestone.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{milestone.name}</h4>
                              <span className="text-sm">{milestone.progress}%</span>
                            </div>
                            <Progress value={milestone.progress} className="h-2" />
                          </div>
                        ))}
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" size="sm" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          添加里程碑
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                )}

                {selectedGoal.projects && selectedGoal.projects.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium">关联项目</h3>
                    <Card>
                      <CardContent className="p-4 space-y-4">
                        {selectedGoal.projects.map((project) => (
                          <div key={project.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{project.name}</h4>
                              <span className="text-sm">{project.progress}%</span>
                            </div>
                            <Progress value={project.progress} className="h-2" />
                          </div>
                        ))}
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" size="sm" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          添加关联项目
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-lg font-medium">备注</h3>
                  <Textarea placeholder="添加关于此目标的备注..." className="min-h-[100px]" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                  关闭
                </Button>
                <Button>更新进度</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
