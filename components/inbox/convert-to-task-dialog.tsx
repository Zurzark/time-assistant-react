// 转化为任务的对话框组件
// 用于将收集篮条目转化为任务

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaskFormFields, TaskFormData } from "@/components/task/TaskFormFields"
import { InboxItem, ObjectStores, getAll, updateInboxItemsStatus, add, Project, ActivityCategory } from "@/lib/db"

interface ConvertToTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inboxItems: InboxItem[]
  onConversionComplete: () => void
}

export function ConvertToTaskDialog({ 
  open, 
  onOpenChange, 
  inboxItems, 
  onConversionComplete 
}: ConvertToTaskDialogProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [activityCategories, setActivityCategories] = useState<ActivityCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // 从第一个收集篮条目中提取标题作为任务标题
  const initialData: Partial<TaskFormData> = {
    title: inboxItems.length > 0 ? inboxItems[0].content : "",
    description: inboxItems.length > 0 ? inboxItems[0].notes : undefined,
    category: "next_action",
    priority: "notImportantNotUrgent",
    tags: inboxItems.length > 0 && inboxItems[0].tags ? [...inboxItems[0].tags] : [],
    isFrog: false,
    isRecurring: false,
  }
  
  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])
  
  const loadData = async () => {
    setIsLoading(true)
    try {
      // 获取项目列表
      const projectsData = await getAll<Project>(ObjectStores.PROJECTS)
      setProjects(projectsData)
      
      // 获取活动分类列表
      const activityCategoriesData = await getAll<ActivityCategory>(ObjectStores.ACTIVITY_CATEGORIES)
      setActivityCategories(activityCategoriesData)
    } catch (error) {
      console.error("加载数据失败:", error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSave = async (taskData: TaskFormData) => {
    try {
      // 1. 创建新任务
      const newTaskData = {
        ...taskData,
        completed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: 0,
      }
      
      const newTaskId = await add(ObjectStores.TASKS, newTaskData)
      
      // 2. 更新收集篮条目状态
      await updateInboxItemsStatus(
        inboxItems.map(item => item.id!), 
        'processed_to_task',
        { taskId: newTaskId }
      )
      
      // 3. 关闭对话框并通知父组件刷新
      onOpenChange(false)
      onConversionComplete()
    } catch (error) {
      console.error("转化为任务失败:", error)
    }
  }
  
  const handleCancel = () => {
    onOpenChange(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>转化为任务</DialogTitle>
        </DialogHeader>
        {!isLoading && (
          <TaskFormFields
            initialData={initialData}
            availableProjects={projects}
            availableActivityCategories={activityCategories}
            onSave={handleSave}
            onCancel={handleCancel}
            submitButtonText="创建任务"
          />
        )}
      </DialogContent>
    </Dialog>
  )
} 