"use client"

import { useState, useEffect } from "react"
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
import { getAll, add, update, ObjectStores, Task as DBTask } from "@/lib/db"

interface FrogTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddFrogTasks: (taskIds: string[]) => void
}

type TaskPriority = 
  | "importantUrgent" 
  | "importantNotUrgent" 
  | "notImportantUrgent" 
  | "notImportantNotUrgent"

interface Task {
  id: number
  title: string
  priority: TaskPriority
  dueDate?: string
  completed: 0 | 1
  isFrog?: 0 | 1
}

interface StatsTask {
  id: number;
  title: string;
  priority: TaskPriority;
  dueDate?: string;
  completed: boolean;
  isFrog: boolean;
}

// Helper to format Date to string YYYY-MM-DD, or return undefined
const formatDate = (date?: Date): string | undefined => {
  if (!date) return undefined;
  // Ensure date is a Date object before calling toISOString
  if (!(date instanceof Date)) {
    // Attempt to parse if it's a string that might represent a date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        console.warn("formatDate received an invalid date value:", date);
        return undefined; // or handle as an error
    }
    return parsedDate.toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
};

const mapDBTaskToStatsTask = (dbTask: DBTask): StatsTask => {
  return {
    id: dbTask.id!,
    title: dbTask.title,
    priority: (dbTask.priority || "importantNotUrgent") as TaskPriority,
    dueDate: formatDate(dbTask.dueDate),
    completed: dbTask.completed === 1,
    isFrog: dbTask.isFrog === 1,
  };
};

export function FrogTaskModal({ open, onOpenChange, onAddFrogTasks }: FrogTaskModalProps) {
  const [selectedTasks, setSelectedTasks] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [activeTab, setActiveTab] = useState("existing")
  const { addTasks } = useTaskStats()

  const [allTasks, setAllTasks] = useState<DBTask[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      const fetchTasks = async () => {
        setIsLoading(true)
        try {
          const tasksFromDB = await getAll<DBTask>(ObjectStores.TASKS)
          const availableTasks = tasksFromDB.filter(
            task => task.isFrog === 0 && task.completed === 0 && task.isDeleted === 0
          )
          setAllTasks(availableTasks)
        } catch (error) {
          console.error("Failed to fetch tasks from DB:", error)
          setAllTasks([])
        } finally {
          setIsLoading(false)
        }
      }
      fetchTasks()
      setSelectedTasks([])
      setSearchQuery("")
      setNewTaskTitle("")
    }
  }, [open])

  const displayTasks: Task[] = allTasks
    .map(dbTask => ({
      id: dbTask.id!,
      title: dbTask.title,
      priority: (dbTask.priority || "importantNotUrgent") as TaskPriority,
      dueDate: formatDate(dbTask.dueDate),
      completed: dbTask.completed,
      isFrog: dbTask.isFrog,
    }))
    .filter(task => task.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const priorityOrder = {
        "importantUrgent": 0,
        "importantNotUrgent": 1,
        "notImportantUrgent": 2,
        "notImportantNotUrgent": 3
      }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

  const toggleTaskSelection = (taskId: number) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    )
  }

  const getPriorityBadgeStyles = (priority: TaskPriority) => {
    switch (priority) {
      case "importantUrgent":
        return "border-red-500 text-red-500"
      case "importantNotUrgent":
        return "border-amber-500 text-amber-500"
      case "notImportantUrgent":
        return "border-blue-500 text-blue-500"
      case "notImportantNotUrgent":
        return "border-green-500 text-green-500"
      default:
        return "border-gray-500 text-gray-500"
    }
  }

  const getPriorityText = (priority: TaskPriority) => {
    switch (priority) {
      case "importantUrgent":
        return "重要且紧急"
      case "importantNotUrgent":
        return "重要不紧急"
      case "notImportantUrgent":
        return "紧急不重要"
      case "notImportantNotUrgent":
        return "不紧急不重要"
      default:
        return "未指定优先级"
    }
  }

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return

    const today = new Date()
    const newTaskData: Omit<DBTask, 'id'> = {
      title: newTaskTitle,
      completed: 0,
      isFrog: 1,
      dueDate: today,
      priority: "importantUrgent",
      createdAt: today,
      updatedAt: today,
      isDeleted: 0,
      description: "",
      isRecurring: 0,
    }
    
    try {
      const newTaskId = await add<Omit<DBTask, 'id'>>(ObjectStores.TASKS, newTaskData)
      if (newTaskId) {
        const createdDBTask: DBTask = {
          ...newTaskData,
          id: newTaskId,
        };
        const taskForStats = mapDBTaskToStatsTask(createdDBTask);
        addTasks([taskForStats]);

        onAddFrogTasks([newTaskId.toString()])
        setNewTaskTitle("")
        onOpenChange(false)
      }
    } catch (error) {
      console.error("Failed to create new frog task:", error)
    }
  }

  const handleAddFrogTasks = async () => {
    if (selectedTasks.length === 0) return

    const tasksToUpdateInDB: DBTask[] = [];
    for (const taskId of selectedTasks) {
      const task = allTasks.find(t => t.id === taskId);
      if (task) {
        const updatedTask: DBTask = {
          ...task,
          isFrog: 1,
          dueDate: task.dueDate || new Date(),
          updatedAt: new Date(),
        };
        tasksToUpdateInDB.push(updatedTask);
      }
    }
    
    try {
      for (const task of tasksToUpdateInDB) {
        await update<DBTask>(ObjectStores.TASKS, task)
      }
      const tasksForStats = tasksToUpdateInDB.map(mapDBTaskToStatsTask);
      addTasks(tasksForStats);
      onAddFrogTasks(selectedTasks.map(id => id.toString()))
      setSelectedTasks([])
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update tasks to frog status:", error)
    }
  }

  const showSelectionWarning = selectedTasks.length > 3

  const renderTaskList = () => {
    if (isLoading) {
      return <div className="p-4 text-center text-muted-foreground">正在加载任务...</div>
    }
    if (displayTasks.length === 0 && !searchQuery) {
      return <div className="p-4 text-center text-muted-foreground">当前没有可添加为青蛙的任务。</div>
    }
    if (displayTasks.length === 0 && searchQuery) {
      return <div className="p-4 text-center text-muted-foreground">没有找到匹配的任务。</div>
    }

    return (
      <ScrollArea className="h-[200px]">
        <div className="space-y-1 p-2">
          {displayTasks.map(task => (
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
    )
  }
  
  const recommendedAiTasks = displayTasks.slice(0, 2);

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
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索任务..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {isLoading ? (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-3 text-sm text-muted-foreground">正在加载AI推荐...</div>
            ) : recommendedAiTasks.length > 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-3">
                <h3 className="text-sm font-medium flex items-center mb-2">
                  <AlertCircle className="h-4 w-4 mr-1 text-blue-500" />
                  AI推荐青蛙任务
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  以下任务是AI根据您的工作习惯和当前工作量推荐的青蛙任务：
                </p>
                <div className="space-y-2">
                  {recommendedAiTasks.map(task => (
                    <div key={`rec-${task.id}`} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded p-2">
                      <div className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        <span className="text-sm">{task.title}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleTaskSelection(task.id)}
                        disabled={selectedTasks.includes(task.id)}
                      >
                        {selectedTasks.includes(task.id) ? "已选择" : "选择"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
               <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-3 text-sm text-muted-foreground">暂无AI推荐。</div>
            )}
            
            <div className="border rounded-md">
              <h3 className="text-sm font-medium p-3 border-b">未完成的任务</h3>
              {renderTaskList()}
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