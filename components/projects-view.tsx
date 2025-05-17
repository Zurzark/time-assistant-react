"use client"

import { useState } from "react"
import {
  Calendar,
  ChevronRight,
  Edit,
  MoreHorizontal,
  Plus,
  Target,
  Trash2,
  CheckCircle2,
  Pause,
  Play,
} from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

interface Project {
  id: number
  name: string
  description?: string
  dueDate?: Date
  progress: number
  status: "active" | "completed" | "paused" | "archived"
  goal?: string
  tasks: {
    id: number
    title: string
    completed: boolean
    priority: "important-urgent" | "important-not-urgent" | "not-important-urgent" | "not-important-not-urgent"
  }[]
}

export function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 1,
      name: "网站重新设计",
      description: "更新公司网站的设计和功能",
      dueDate: new Date(2025, 6, 15),
      progress: 65,
      status: "active",
      goal: "提高工作效率",
      tasks: [
        {
          id: 101,
          title: "收集用户反馈",
          completed: true,
          priority: "important-urgent",
        },
        {
          id: 102,
          title: "创建线框图",
          completed: true,
          priority: "important-not-urgent",
        },
        {
          id: 103,
          title: "设计新的UI",
          completed: false,
          priority: "important-not-urgent",
        },
        {
          id: 104,
          title: "开发前端",
          completed: false,
          priority: "important-not-urgent",
        },
        {
          id: 105,
          title: "测试和部署",
          completed: false,
          priority: "not-important-urgent",
        },
      ],
    },
    {
      id: 2,
      name: "市场营销活动",
      description: "为新产品发布策划和执行营销活动",
      dueDate: new Date(2025, 5, 30),
      progress: 40,
      status: "active",
      goal: "建立个人品牌",
      tasks: [
        {
          id: 106,
          title: "制定营销策略",
          completed: true,
          priority: "important-urgent",
        },
        {
          id: 107,
          title: "创建营销材料",
          completed: false,
          priority: "important-not-urgent",
        },
        {
          id: 108,
          title: "安排社交媒体发布",
          completed: false,
          priority: "not-important-urgent",
        },
      ],
    },
    {
      id: 3,
      name: "团队培训计划",
      description: "为团队成员提供技能提升培训",
      dueDate: new Date(2025, 8, 1),
      progress: 20,
      status: "active",
      goal: "提高工作效率",
      tasks: [
        {
          id: 109,
          title: "确定培训需求",
          completed: true,
          priority: "important-not-urgent",
        },
        {
          id: 110,
          title: "寻找培训资源",
          completed: false,
          priority: "not-important-not-urgent",
        },
        {
          id: 111,
          title: "安排培训时间",
          completed: false,
          priority: "not-important-urgent",
        },
      ],
    },
    {
      id: 4,
      name: "产品发布",
      description: "协调新产品的发布流程",
      dueDate: new Date(2025, 4, 10),
      progress: 100,
      status: "completed",
      tasks: [
        {
          id: 112,
          title: "准备发布材料",
          completed: true,
          priority: "important-urgent",
        },
        {
          id: 113,
          title: "协调各部门工作",
          completed: true,
          priority: "important-urgent",
        },
        {
          id: 114,
          title: "执行发布计划",
          completed: true,
          priority: "important-urgent",
        },
      ],
    },
    {
      id: 5,
      name: "办公室改造",
      description: "改善办公环境，提高工作舒适度",
      progress: 10,
      status: "paused",
      tasks: [
        {
          id: 115,
          title: "收集员工意见",
          completed: true,
          priority: "not-important-not-urgent",
        },
        {
          id: 116,
          title: "制定改造计划",
          completed: false,
          priority: "not-important-not-urgent",
        },
      ],
    },
  ])

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: "",
    description: "",
    status: "active",
    progress: 0,
    tasks: [],
  })
  const [date, setDate] = useState<Date>()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [newTask, setNewTask] = useState("")
  const [selectedTab, setSelectedTab] = useState("all")
  const [newTaskPriority, setNewTaskPriority] = useState<string>("important-not-urgent")

  const handleCreateProject = () => {
    if (newProject.name?.trim()) {
      const createdProject: Project = {
        id: Date.now(),
        name: newProject.name,
        description: newProject.description,
        dueDate: date,
        progress: 0,
        status: "active",
        goal: newProject.goal,
        tasks: [],
      }
      setProjects([...projects, createdProject])
      setNewProject({
        name: "",
        description: "",
        status: "active",
        progress: 0,
        tasks: [],
      })
      setDate(undefined)
      setIsCreateDialogOpen(false)
    }
  }

  const openProjectDetails = (project: Project) => {
    setSelectedProject(project)
    setIsDetailDialogOpen(true)
  }

  const addTaskToProject = () => {
    if (selectedProject && newTask.trim()) {
      const updatedProject = {
        ...selectedProject,
        tasks: [
          ...selectedProject.tasks,
          {
            id: Date.now(),
            title: newTask,
            completed: false,
            priority: newTaskPriority as
              | "important-urgent"
              | "important-not-urgent"
              | "not-important-urgent"
              | "not-important-not-urgent",
          },
        ],
      }
      setSelectedProject(updatedProject)
      setProjects(projects.map((p) => (p.id === selectedProject.id ? updatedProject : p)))
      setNewTask("")
    }
  }

  const toggleTaskCompletion = (projectId: number, taskId: number) => {
    setProjects(
      projects.map((project) => {
        if (project.id === projectId) {
          const updatedTasks = project.tasks.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task,
          )

          // Calculate new progress
          const completedTasks = updatedTasks.filter((task) => task.completed).length
          const totalTasks = updatedTasks.length
          const newProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

          return {
            ...project,
            tasks: updatedTasks,
            progress: newProgress,
          }
        }
        return project
      }),
    )

    // Update selected project if it's the one being modified
    if (selectedProject && selectedProject.id === projectId) {
      const updatedTasks = selectedProject.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      )

      const completedTasks = updatedTasks.filter((task) => task.completed).length
      const totalTasks = updatedTasks.length
      const newProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      setSelectedProject({
        ...selectedProject,
        tasks: updatedTasks,
        progress: newProgress,
      })
    }
  }

  const deleteProject = (id: number) => {
    setProjects(projects.filter((project) => project.id !== id))
    if (selectedProject && selectedProject.id === id) {
      setIsDetailDialogOpen(false)
    }
  }

  const updateProjectStatus = (id: number, status: Project["status"]) => {
    setProjects(projects.map((project) => (project.id === id ? { ...project, status } : project)))

    if (selectedProject && selectedProject.id === id) {
      setSelectedProject({
        ...selectedProject,
        status,
      })
    }
  }

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "completed":
        return "bg-blue-500"
      case "paused":
        return "bg-amber-500"
      case "archived":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: Project["status"]) => {
    switch (status) {
      case "active":
        return "进行中"
      case "completed":
        return "已完成"
      case "paused":
        return "已暂停"
      case "archived":
        return "已归档"
      default:
        return "未知"
    }
  }

  // Filter projects based on selected tab
  const filteredProjects = projects.filter((project) => {
    if (selectedTab === "all") return true
    if (selectedTab === "active") return project.status === "active"
    if (selectedTab === "completed") return project.status === "completed"
    if (selectedTab === "paused") return project.status === "paused"
    if (selectedTab === "archived") return project.status === "archived"
    return true
  })

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">项目</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建项目
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>创建新项目</DialogTitle>
                <DialogDescription>添加一个新项目到您的项目列表中</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">项目名称</Label>
                  <Input
                    id="name"
                    placeholder="输入项目名称"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    placeholder="输入项目描述（可选）"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dueDate">截止日期</Label>
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
                    <Label htmlFor="goal">关联目标</Label>
                    <Select
                      value={newProject.goal}
                      onValueChange={(value) => setNewProject({ ...newProject, goal: value })}
                    >
                      <SelectTrigger id="goal">
                        <SelectValue placeholder="选择目标（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="提高工作效率">提高工作效率</SelectItem>
                        <SelectItem value="完成专业认证">完成专业认证</SelectItem>
                        <SelectItem value="建立个人品牌">建立个人品牌</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateProject}>创建项目</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-muted-foreground">管理和组织您的项目</p>
      </div>

      <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="active">进行中</TabsTrigger>
          <TabsTrigger value="completed">已完成</TabsTrigger>
          <TabsTrigger value="paused">已暂停</TabsTrigger>
          <TabsTrigger value="archived">已归档</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openProjectDetails(project)}>
                          <ChevronRight className="h-4 w-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        {project.status !== "completed" && (
                          <DropdownMenuItem onClick={() => updateProjectStatus(project.id, "completed")}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            标记为已完成
                          </DropdownMenuItem>
                        )}
                        {project.status !== "paused" && project.status !== "completed" && (
                          <DropdownMenuItem onClick={() => updateProjectStatus(project.id, "paused")}>
                            <Pause className="h-4 w-4 mr-2" />
                            暂停项目
                          </DropdownMenuItem>
                        )}
                        {project.status === "paused" && (
                          <DropdownMenuItem onClick={() => updateProjectStatus(project.id, "active")}>
                            <Play className="h-4 w-4 mr-2" />
                            恢复项目
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => deleteProject(project.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {project.description && <CardDescription>{project.description}</CardDescription>}
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>进度</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="outline"
                          className={cn("flex items-center space-x-1 capitalize", {
                            "border-green-500 text-green-500": project.status === "active",
                            "border-blue-500 text-blue-500": project.status === "completed",
                            "border-amber-500 text-amber-500": project.status === "paused",
                            "border-gray-500 text-gray-500": project.status === "archived",
                          })}
                        >
                          <span className={cn("h-2 w-2 rounded-full", getStatusColor(project.status))}></span>
                          <span>{getStatusText(project.status)}</span>
                        </Badge>
                      </div>
                      {project.dueDate && (
                        <Badge variant="outline" className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(project.dueDate, "yyyy-MM-dd")}</span>
                        </Badge>
                      )}
                    </div>

                    {project.goal && (
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">目标: {project.goal}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">任务</h4>
                        <span className="text-xs text-muted-foreground">
                          {project.tasks.filter((task) => task.completed).length}/{project.tasks.length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {project.tasks.slice(0, 3).map((task) => (
                          <div key={task.id} className="flex items-center space-x-2">
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                task.priority === "important-urgent"
                                  ? "bg-red-500"
                                  : task.priority === "important-not-urgent"
                                    ? "bg-amber-500"
                                    : task.priority === "not-important-urgent"
                                      ? "bg-blue-500"
                                      : "bg-green-500",
                              )}
                            />
                            <span className={cn("text-xs", task.completed && "line-through text-muted-foreground")}>
                              {task.title}
                            </span>
                          </div>
                        ))}
                        {project.tasks.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{project.tasks.length - 3} 个任务
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => openProjectDetails(project)}>
                    查看详情
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Project Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>{selectedProject.name}</DialogTitle>
                  <Button variant="ghost" onClick={() => setIsDetailDialogOpen(false)}>
                    关闭
                  </Button>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                {selectedProject.description && (
                  <div>
                    <h3 className="text-lg font-medium">描述</h3>
                    <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-medium">进度</h3>
                  <Progress value={selectedProject.progress} className="h-2" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">状态</h3>
                  <Badge
                    variant="outline"
                    className={cn("flex items-center space-x-1 capitalize", {
                      "border-green-500 text-green-500": selectedProject.status === "active",
                      "border-blue-500 text-blue-500": selectedProject.status === "completed",
                      "border-amber-500 text-amber-500": selectedProject.status === "paused",
                      "border-gray-500 text-gray-500": selectedProject.status === "archived",
                    })}
                  >
                    <span className={cn("h-2 w-2 rounded-full", getStatusColor(selectedProject.status))}></span>
                    <span>{getStatusText(selectedProject.status)}</span>
                  </Badge>
                </div>
                {selectedProject.dueDate && (
                  <div>
                    <h3 className="text-lg font-medium">截止日期</h3>
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(selectedProject.dueDate, "yyyy-MM-dd")}</span>
                    </Badge>
                  </div>
                )}
                {selectedProject.goal && (
                  <div>
                    <h3 className="text-lg font-medium">目标</h3>
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{selectedProject.goal}</span>
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-medium">任务</h3>
                  <div className="space-y-2">
                    {selectedProject.tasks.map((task) => (
                      <div key={task.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTaskCompletion(selectedProject.id, task.id)}
                        />
                        <span className={cn("text-sm", task.completed && "line-through text-muted-foreground")}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                    关闭
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
