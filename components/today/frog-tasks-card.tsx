"use client"

import { useState, useEffect, useCallback } from "react"
import { Frown, Loader2, MoreHorizontal, Timer } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useTaskStats } from "../task/task-stats-updater" // 调整导入路径
import { FrogTaskModal } from "../task/frog-task-modal" // 调整导入路径
import { EditTaskModal } from "../task/edit-task-modal" // 调整导入路径
import { DeleteTaskConfirm } from "../task/delete-task-confirm" // 调整导入路径
// 注意: @/lib/db 的导入是动态的，将在组件内部处理

interface FrogTasksCardProps {
  onPomodoroClick: (taskId: string, taskTitle: string) => void;
}

export function FrogTasksCard({ onPomodoroClick }: FrogTasksCardProps) {
  const { updateTaskStats, addTasks: _addTasksToStats, removeTasks } = useTaskStats()

  // 状态管理
  const [tasks, setTasks] = useState<Array<{id: string | number, title: string, completed: boolean}>>([])
  const [loading, setLoading] = useState(true)
  const [frogTaskModalOpen, setFrogTaskModalOpen] = useState(false)
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<{ id: string; title: string } | null>(null)
  
  // 从 IndexedDB 加载青蛙任务
  const loadFrogTasks = useCallback(async () => {
    try {
      setLoading(true)
      
      // 从 IndexedDB 获取所有青蛙任务
      const { getByIndex, ObjectStores } = await import('@/lib/db')
      const frogTasksDB = await getByIndex(
        ObjectStores.TASKS,
        'byIsFrog',
        1  // 使用数字 1 代替布尔值 true
      )
      
      // 过滤出未删除的任务
      const activeFrogTasks = frogTasksDB.filter(
        (task: any) => !task.isDeleted && task.isFrog
      )
      
      // 更新状态
      setTasks(
        activeFrogTasks.map((task: any) => ({
          id: task.id,
          title: task.title,
          completed: task.completed
        }))
      )
      
    } catch (error) {
      console.error('加载青蛙任务时出错:', error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 在组件挂载时加载青蛙任务
  useEffect(() => {
    loadFrogTasks()
  }, [loadFrogTasks])

  // 处理复选框点击 - 直接更新 IndexedDB
  const handleCheckboxChange = async (taskId: string | number) => {
    try {
      // 在本地状态中找到任务
      const task = tasks.find(t => t.id == taskId)
      if (!task) return
      
      const newCompleted = !task.completed
      
      // 先更新本地状态，使 UI 立即响应
      setTasks(prev => 
        prev.map(t => t.id == taskId 
          ? { ...t, completed: newCompleted } 
          : t
        )
      )
      
      // 更新任务统计和 IndexedDB
      updateTaskStats(taskId, newCompleted)
    } catch (error) {
      console.error('更新任务状态时出错:', error)
      // 出错时恢复本地状态
      setTasks(prev => [...prev]) // 简单的状态回滚
    }
  }

  // 处理编辑任务
  const handleEditTask = (taskId: string | number, taskTitle: string) => {
    setCurrentTask({ id: String(taskId), title: taskTitle })
    setEditTaskModalOpen(true)
  }

  // 处理添加到时间轴
  const handleAddToTimeline = (taskId: string | number) => {
    // 这里应实现将任务添加到时间轴的逻辑
    console.log(`将任务 ${taskId} 添加到时间轴`)
  }

  // 处理删除任务
  const handleDeleteTask = (taskId: string | number, taskTitle: string) => {
    setCurrentTask({ id: String(taskId), title: taskTitle })
    setDeleteConfirmOpen(true)
  }

  // 确认删除任务
  const confirmDeleteTask = () => {
    if (currentTask) {
      // 在 IndexedDB 中标记为删除
      removeTasks([currentTask.id])
      
      // 从本地状态中移除
      setTasks(prev => prev.filter(task => task.id != currentTask.id))
      
      setDeleteConfirmOpen(false)
      setCurrentTask(null)
    }
  }

  // 保存编辑后的任务 - 更新到 IndexedDB
  const saveEditedTask = async (editedTask: any) => {
    try {
      // 找到原始任务以保留其完成状态
      const originalTask = tasks.find(t => t.id == editedTask.id);
      const completed = originalTask ? originalTask.completed : false;
      
      // 准备更新到 IndexedDB 的任务对象
      const updatedTaskData = {
        id: editedTask.id,
        title: editedTask.title,
        completed: completed, // 保留原始完成状态
        isFrog: true,
        dueDate: editedTask.dueDate || new Date(),
        // 确保包含 TaskStatsProvider 所需的 StatsTask 兼容字段
        priority: originalTask ? (originalTask as any).priority : "importantNotUrgent", 
        createdAt: new Date(), 
        updatedAt: new Date(),
        isDeleted: 0,
        description: "",
        isRecurring: 0,
      }
      
      // 更新任务到 IndexedDB
      const { update, ObjectStores: DBObjectStores } = await import('@/lib/db'); // 正确导入 ObjectStores
      await update(DBObjectStores.TASKS, updatedTaskData as any); 
      _addTasksToStats([updatedTaskData as any]); // Notify stats updater
      
      // 重新加载任务以获取最新数据
      await loadFrogTasks()
      
      setEditTaskModalOpen(false)
      setCurrentTask(null)
    } catch (error) {
      console.error('保存编辑任务时出错:', error)
    }
  }
  
  // 当 FrogTaskModal 完成添加/创建青蛙任务后被调用
  const handleFrogTasksAddedFromModal = async (taskIds: string[]) => {
    // Modal 内部已经处理了数据库的写入和 useTaskStats 的更新
    // 这里只需要重新加载当前组件的青蛙任务列表即可
    await loadFrogTasks();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">今日青蛙任务</CardTitle>
        <CardDescription>最重要但可能最难开始的任务</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Frown className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">您还没有设置青蛙任务</p>
            <Button variant="link" size="sm" onClick={() => setFrogTaskModalOpen(true)}>
              立即添加
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className="flex items-center space-x-2 group transition-all duration-200"
              >
                <Checkbox 
                  id={`frog-${task.id}`} 
                  checked={task.completed}
                  onCheckedChange={() => handleCheckboxChange(task.id)}
                  className="transition-all duration-200"
                />
                <label
                  htmlFor={`frog-${task.id}`}
                  className={cn(
                    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer transition-all duration-200",
                    task.completed && "line-through text-muted-foreground",
                  )}
                >
                  🐸 {task.title}
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onPomodoroClick(String(task.id), task.title)}
                >
                  <Timer className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditTask(task.id, task.title)}>
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddToTimeline(task.id)}>
                      添加到时间轴
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-500"
                      onClick={() => handleDeleteTask(task.id, task.title)}
                    >
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => setFrogTaskModalOpen(true)}  
        >
          添加青蛙任务
        </Button>
      </CardFooter>

      {/* 青蛙任务模态框 */}
      <FrogTaskModal
        open={frogTaskModalOpen}
        onOpenChange={setFrogTaskModalOpen}
        onAddFrogTasks={handleFrogTasksAddedFromModal} // 使用修正后的回调
      />
      
      {/* 编辑任务模态框 */}
      <EditTaskModal
        open={editTaskModalOpen}
        onOpenChange={setEditTaskModalOpen}
        task={currentTask}
        onSave={saveEditedTask}
      />
      
      {/* 删除确认对话框 */}
      <DeleteTaskConfirm
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        taskTitle={currentTask?.title || ""}
        onConfirm={confirmDeleteTask}
      />
    </Card>
  )
} 