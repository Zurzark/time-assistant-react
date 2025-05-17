"use client"

import { useState } from "react"
import { Search, Plus, CheckCircle2, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTaskStats } from "./task-stats-updater"

interface FrogTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddFrogTasks: (taskIds: string[]) => void
}

type TaskPriority = 
  | "important-urgent" 
  | "important-not-urgent" 
  | "not-important-urgent" 
  | "not-important-not-urgent"

interface Task {
  id: string
  title: string
  priority: TaskPriority
  dueDate?: string
  completed: boolean
  isFrog?: boolean
}

export function FrogTaskModal({ open, onOpenChange, onAddFrogTasks }: FrogTaskModalProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [activeTab, setActiveTab] = useState("existing")
  const { addTasks } = useTaskStats()

  // 模拟任务数据 - 在实际应用中应从状态管理系统获取
  const mockTasks: Task[] = [
    {
      id: "t1", 
      title: "完成季度项目计划", 
      priority: "important-urgent",
      dueDate: "2023-08-16", 
      completed: false
    },
    {
      id: "t2", 
      title: "客户方案评审会议", 
      priority: "important-not-urgent",
      dueDate: "2023-08-17", 
      completed: false,
      isFrog: true  // 已经是青蛙任务
    },
    {
      id: "t3", 
      title: "团队成员绩效面谈", 
      priority: "important-urgent",
      dueDate: "2023-08-15", 
      completed: false
    },
    {
      id: "t4", 
      title: "整理项目文档", 
      priority: "not-important-urgent",
      dueDate: "2023-08-16", 
      completed: false
    },
    {
      id: "t5", 
      title: "更新部门周报", 
      priority: "important-not-urgent",
      dueDate: "2023-08-18", 
      completed: false
    },
    {
      id: "t6", 
      title: "参加技术分享会", 
      priority: "not-important-not-urgent",
      dueDate: "2023-08-19", 
      completed: false
    },
    {
      id: "t7", 
      title: "回复客户邮件", 
      priority: "not-important-urgent",
      dueDate: "2023-08-16", 
      completed: false
    },
    {
      id: "t8", 
      title: "调研新技术方案", 
      priority: "important-not-urgent",
      dueDate: "2023-08-17", 
      completed: false
    }
  ]

  // 处理搜索过滤
  const filteredTasks = mockTasks
    .filter(task => !task.completed && !task.isFrog) // 只显示未完成且非青蛙的任务
    .filter(task => task.title.toLowerCase().includes(searchQuery.toLowerCase()))
    // 按优先级排序
    .sort((a, b) => {
      const priorityOrder = {
        "important-urgent": 0,
        "important-not-urgent": 1,
        "not-important-urgent": 2,
        "not-important-not-urgent": 3
      }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

  // 选择/取消选择任务
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    )
  }

  // 获取优先级标签样式
  const getPriorityBadgeStyles = (priority: TaskPriority) => {
    switch (priority) {
      case "important-urgent":
        return "border-red-500 text-red-500"
      case "important-not-urgent":
        return "border-amber-500 text-amber-500"
      case "not-important-urgent":
        return "border-blue-500 text-blue-500"
      case "not-important-not-urgent":
        return "border-green-500 text-green-500"
    }
  }

  // 获取优先级文本
  const getPriorityText = (priority: TaskPriority) => {
    switch (priority) {
      case "important-urgent":
        return "重要且紧急"
      case "important-not-urgent":
        return "重要不紧急"
      case "not-important-urgent":
        return "紧急不重要"
      case "not-important-not-urgent":
        return "不紧急不重要"
    }
  }

  // 创建新任务并添加为青蛙
  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return

    // 创建新任务，设置今天为默认截止日期
    const newTaskId = `new-${Date.now()}`
    const newTask = {
      id: newTaskId,
      title: newTaskTitle,
      completed: false,
      isFrog: true,
      dueDate: new Date().toISOString().split('T')[0], // 今天作为截止日期
      priority: "important-urgent" as const
    }
    
    // 将新任务添加到任务统计中
    addTasks([newTask])
    
    // 添加到选中列表
    setSelectedTasks(prev => [...prev, newTaskId])
    
    // 重置输入框
    setNewTaskTitle("")
    
    // 切换回已有任务标签页
    setActiveTab("existing")
  }

  // 添加选中的任务为青蛙任务
  const handleAddFrogTasks = () => {
    if (selectedTasks.length === 0) return
    
    // 将选中的任务标记为青蛙任务并添加到今日截止日期
    const tasksToUpdate = mockTasks
      .filter(task => selectedTasks.includes(task.id))
      .map(task => ({
        ...task,
        isFrog: true,
        // 如果没有日期，则将其设置为今天
        dueDate: task.dueDate || new Date().toISOString().split('T')[0]
      }))
    
    // 更新任务统计
    if (tasksToUpdate.length > 0) {
      addTasks(tasksToUpdate)
    }
    
    // 调用父组件的回调
    onAddFrogTasks(selectedTasks)
    setSelectedTasks([])
    onOpenChange(false)
  }

  // 显示选中任务数量警告
  const showSelectionWarning = selectedTasks.length > 3

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>选择或创建青蛙任务</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="existing" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">从现有任务选择</TabsTrigger>
            <TabsTrigger value="create">创建新任务</TabsTrigger>
          </TabsList>
          
          <TabsContent value="existing" className="space-y-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索任务..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* AI 推荐区域 */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-3">
              <h3 className="text-sm font-medium flex items-center mb-2">
                <AlertCircle className="h-4 w-4 mr-1 text-blue-500" />
                AI推荐青蛙任务
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                以下任务是AI根据您的工作习惯和当前工作量推荐的青蛙任务：
              </p>
              <div className="space-y-2">
                {filteredTasks.slice(0, 2).map(task => (
                  <div key={`rec-${task.id}`} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded p-2">
                    <div className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      <span className="text-sm">{task.title}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => toggleTaskSelection(task.id)}
                    >
                      选择
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 任务列表 */}
            <div className="border rounded-md">
              <h3 className="text-sm font-medium p-3 border-b">未完成的任务</h3>
              {filteredTasks.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  没有找到匹配的任务
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1 p-2">
                    {filteredTasks.map(task => (
                      <div 
                        key={task.id} 
                        className={cn(
                          "flex items-center space-x-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                          selectedTasks.includes(task.id) && "bg-slate-100 dark:bg-slate-800"
                        )}
                      >
                        <Checkbox 
                          id={`task-${task.id}`} 
                          checked={selectedTasks.includes(task.id)}
                          onCheckedChange={() => toggleTaskSelection(task.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <label 
                            htmlFor={`task-${task.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {task.title}
                          </label>
                          <div className="flex items-center mt-1">
                            <Badge variant="outline" className={cn("text-xs mr-2", getPriorityBadgeStyles(task.priority))}>
                              {getPriorityText(task.priority)}
                            </Badge>
                            {task.dueDate && (
                              <span className="text-xs text-muted-foreground">
                                截止: {task.dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="create" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="new-task-title" className="text-sm font-medium">
                  任务名称
                </label>
                <div className="flex mt-1">
                  <Input
                    id="new-task-title"
                    placeholder="输入新青蛙任务名称..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                  <Button 
                    className="ml-2" 
                    onClick={handleCreateTask}
                    disabled={!newTaskTitle.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" /> 创建
                  </Button>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-3">
                <h3 className="text-sm font-medium mb-2">关于青蛙任务</h3>
                <p className="text-sm text-muted-foreground">
                  青蛙任务是指那些重要但你可能会拖延的任务。每天早上先处理这些任务，可以显著提高工作效率。
                  建议每天设置不超过3个青蛙任务，以保持专注。
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {showSelectionWarning && (
          <div className="text-amber-500 flex items-center text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            您已选择超过3个青蛙任务，建议保持专注以提高效率。
          </div>
        )}
        
        <DialogFooter className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            已选择 {selectedTasks.length} 个任务
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button 
              onClick={handleAddFrogTasks}
              disabled={selectedTasks.length === 0}
            >
              确认添加
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}