"use client"

import { useState } from "react"
import { 
  AlertCircle, 
  ArrowDown, 
  ArrowUp, 
  Calendar, 
  Check, 
  Clock, 
  MoreHorizontal, 
  Timer, 
  X 
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface DueTasksModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TaskPriority = 
  | "important-urgent" 
  | "important-not-urgent" 
  | "not-important-urgent" 
  | "not-important-not-urgent"

interface Task {
  id: string
  title: string
  dueDate: string  // ISO format 'YYYY-MM-DD'
  dueTime: string  // 'HH:MM' format
  priority: TaskPriority
  completed: boolean
  project?: string
}

export function DueTasksModal({ open, onOpenChange }: DueTasksModalProps) {
  // 状态管理
  const [sortOption, setSortOption] = useState<string>("date-asc")
  const [filterOption, setFilterOption] = useState<string>("all")
  const [visibleTasksCount, setVisibleTasksCount] = useState<number>(20)
  
  // 模拟任务数据
  const mockTasks: Task[] = [
    {
      id: "1",
      title: "提交季度财务报表",
      dueDate: "2023-08-15",
      dueTime: "17:00",
      priority: "important-urgent",
      completed: false,
      project: "财务部"
    },
    {
      id: "2",
      title: "客户项目方案演示",
      dueDate: new Date().toISOString().split('T')[0], // 今天
      dueTime: "14:30",
      priority: "important-urgent",
      completed: false,
      project: "销售部"
    },
    {
      id: "3",
      title: "更新团队周报",
      dueDate: new Date().toISOString().split('T')[0], // 今天
      dueTime: "18:00",
      priority: "important-not-urgent",
      completed: true,
      project: "管理部"
    },
    {
      id: "4",
      title: "回复客户邮件",
      dueDate: "2023-08-14", // 已过期
      dueTime: "12:00",
      priority: "not-important-urgent",
      completed: false
    },
    {
      id: "5",
      title: "整理会议记录",
      dueDate: "2023-08-16", // 未来
      dueTime: "10:00",
      priority: "not-important-not-urgent",
      completed: false,
      project: "行政部"
    },
    // 添加更多数据用于测试
    ...[...Array(20)].map((_, index) => ({
      id: `extra-${index + 6}`,
      title: `测试任务 ${index + 6}`,
      dueDate: new Date(Date.now() + 86400000 * (index % 7)).toISOString().split('T')[0],
      dueTime: `${10 + (index % 8)}:${index % 2 === 0 ? '00' : '30'}`,
      priority: ["important-urgent", "important-not-urgent", "not-important-urgent", "not-important-not-urgent"][index % 4] as TaskPriority,
      completed: index % 5 === 0,
      project: index % 3 === 0 ? ["产品部", "技术部", "市场部"][index % 3] : undefined
    }))
  ]

  // 处理排序
  const sortTasks = (tasks: Task[]) => {
    switch (sortOption) {
      case "date-asc":
        return [...tasks].sort((a, b) => {
          const dateComparison = a.dueDate.localeCompare(b.dueDate)
          return dateComparison !== 0 ? dateComparison : a.dueTime.localeCompare(b.dueTime)
        })
      case "date-desc":
        return [...tasks].sort((a, b) => {
          const dateComparison = b.dueDate.localeCompare(a.dueDate)
          return dateComparison !== 0 ? dateComparison : b.dueTime.localeCompare(a.dueTime)
        })
      case "priority-desc":
        return [...tasks].sort((a, b) => {
          const priorityOrder = {
            "important-urgent": 0,
            "important-not-urgent": 1,
            "not-important-urgent": 2,
            "not-important-not-urgent": 3
          }
          return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4)
        })
      case "created-desc":
        // 这里是模拟，实际应该使用创建日期
        return [...tasks].sort((a, b) => parseInt(b.id) - parseInt(a.id))
      default:
        return tasks
    }
  }

  // 处理筛选
  const filterTasks = (tasks: Task[]) => {
    const today = new Date().toISOString().split('T')[0]
    const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    
    switch (filterOption) {
      case "all":
        return tasks
      case "overdue":
        return tasks.filter(task => task.dueDate < today && !task.completed)
      case "today":
        return tasks.filter(task => task.dueDate === today)
      case "next7days":
        return tasks.filter(task => task.dueDate >= today && task.dueDate <= in7Days)
      case "incomplete":
        return tasks.filter(task => !task.completed)
      default:
        return tasks
    }
  }

  // 任务处理
  const processedTasks = sortTasks(filterTasks(mockTasks)).slice(0, visibleTasksCount)
  const hasMoreTasks = visibleTasksCount < filterTasks(mockTasks).length

  // 加载更多任务
  const loadMoreTasks = () => {
    setVisibleTasksCount(prev => prev + 20)
  }

  // 检查任务是否过期
  const isTaskOverdue = (task: Task) => {
    const today = new Date().toISOString().split('T')[0]
    return task.dueDate < today && !task.completed
  }

  // 处理任务点击 (模拟)
  const handleTaskClick = (taskId: string) => {
    console.log(`查看任务详情: ${taskId}`)
    // 这里可以实现打开任务详情或编辑视图的逻辑
  }

  // 处理任务操作 (模拟)
  const toggleTaskCompletion = (taskId: string) => {
    console.log(`切换任务完成状态: ${taskId}`)
    // 在实际应用中，这里应该更新任务状态
  }

  const delayTask = (taskId: string, delayOption: string) => {
    console.log(`推迟任务 ${taskId} 到: ${delayOption}`)
    // 在实际应用中，这里应该更新任务截止日期
  }

  const startPomodoro = (taskId: string, taskTitle: string) => {
    console.log(`为任务 ${taskId} (${taskTitle}) 启动番茄钟`)
    // 在实际应用中，这里应该打开番茄钟模态框
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>所有到期任务</span>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        {/* 筛选和排序区域 */}
        <div className="flex justify-between items-center py-3 border-b">
          <div className="flex space-x-2">
            <Button 
              variant={filterOption === "all" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("all")}
            >
              全部
            </Button>
            <Button 
              variant={filterOption === "overdue" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("overdue")}
            >
              已过期
            </Button>
            <Button 
              variant={filterOption === "today" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("today")}
            >
              今日到期
            </Button>
            <Button 
              variant={filterOption === "next7days" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("next7days")}
            >
              7天内到期
            </Button>
            <Button 
              variant={filterOption === "incomplete" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("incomplete")}
            >
              未完成
            </Button>
          </div>
          
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-asc">截止日期 - 升序</SelectItem>
              <SelectItem value="date-desc">截止日期 - 降序</SelectItem>
              <SelectItem value="priority-desc">优先级 - 降序</SelectItem>
              <SelectItem value="created-desc">创建日期 - 降序</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* 任务列表区域 */}
        <div className="flex-1 overflow-y-auto py-2">
          {processedTasks.length > 0 ? (
            <div className="space-y-3">
              {processedTasks.map(task => (
                <div 
                  key={task.id} 
                  className={cn(
                    "flex items-start p-3 rounded-md border",
                    isTaskOverdue(task) && !task.completed 
                      ? "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800" 
                      : "border-muted bg-background"
                  )}
                >
                  <Checkbox 
                    id={`modal-task-${task.id}`} 
                    checked={task.completed}
                    className="mt-1 mr-3"
                    onClick={() => toggleTaskCompletion(task.id)}
                  />
                  
                  <div className="flex-1" onClick={() => handleTaskClick(task.id)}>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={`modal-task-${task.id}`}
                        className={cn(
                          "text-sm font-medium cursor-pointer",
                          task.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </label>
                    </div>
                    
                    <div className="flex items-center mt-1 flex-wrap gap-y-1">
                      <div
                        className={cn(
                          "h-3 w-3 rounded-sm mr-2",
                          task.priority === "important-urgent"
                            ? "bg-red-500"
                            : task.priority === "important-not-urgent"
                              ? "bg-amber-500"
                              : task.priority === "not-important-urgent"
                                ? "bg-blue-500"
                                : "bg-green-500"
                        )}
                      />
                      <span className="text-xs text-muted-foreground mr-3">
                        {task.priority === "important-urgent" ? (
                          <span className="flex items-center">
                            重要 <ArrowUp className="h-3 w-3 mx-1" /> 紧急 <ArrowUp className="h-3 w-3 mx-1" />
                          </span>
                        ) : task.priority === "important-not-urgent" ? (
                          <span className="flex items-center">
                            重要 <ArrowUp className="h-3 w-3 mx-1" /> 紧急 <ArrowDown className="h-3 w-3 mx-1" />
                          </span>
                        ) : task.priority === "not-important-urgent" ? (
                          <span className="flex items-center">
                            重要 <ArrowDown className="h-3 w-3 mx-1" /> 紧急 <ArrowUp className="h-3 w-3 mx-1" />
                          </span>
                        ) : (
                          <span className="flex items-center">
                            重要 <ArrowDown className="h-3 w-3 mx-1" /> 紧急 <ArrowDown className="h-3 w-3 mx-1" />
                          </span>
                        )}
                      </span>
                      
                      <span className={cn(
                        "text-xs flex items-center mr-3",
                        isTaskOverdue(task) && !task.completed ? "text-red-500" : "text-muted-foreground"
                      )}>
                        <Calendar className="h-3 w-3 mr-1" />
                        {task.dueDate} {task.dueTime}
                        {isTaskOverdue(task) && !task.completed && (
                          <AlertCircle className="h-3 w-3 ml-1 text-red-500" />
                        )}
                      </span>
                      
                      {task.project && (
                        <Badge variant="outline" className="text-xs">
                          {task.project}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startPomodoro(task.id, task.title)}
                      title="启动番茄钟"
                    >
                      <Timer className="h-4 w-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleTaskCompletion(task.id)}>
                          {task.completed ? "标记为未完成" : "标记为已完成"}
                        </DropdownMenuItem>
                        <DropdownMenuItem>编辑任务</DropdownMenuItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-full flex items-center justify-between px-2 py-1.5 text-sm">
                            推迟任务
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => delayTask(task.id, "tomorrow")}>
                              推迟1天
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => delayTask(task.id, "next-monday")}>
                              推迟到下周一
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => delayTask(task.id, "custom")}>
                              选择日期...
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenuItem>添加到时间轴</DropdownMenuItem>
                        <DropdownMenuItem>删除任务</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              
              {/* 加载更多按钮 */}
              {hasMoreTasks && (
                <Button 
                  variant="outline" 
                  className="w-full mt-4" 
                  onClick={loadMoreTasks}
                >
                  加载更多任务
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full py-12">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">太棒了！没有到期任务</h3>
              <p className="text-muted-foreground">
                所有任务都已按计划完成或尚未到期。
              </p>
            </div>
          )}
        </div>
        
        {/* 页脚 */}
        <div className="pt-4 border-t flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            共 {filterTasks(mockTasks).length} 条到期任务
          </span>
          <Button variant="default" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}