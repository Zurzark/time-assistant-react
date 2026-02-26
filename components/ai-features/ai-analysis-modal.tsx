
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { InboxItem, Project, ActivityCategory, getAll, ObjectStores, add as addToDB, remove as removeFromDB } from "@/lib/db"
import { analyzeInboxItems, AnalyzedTask } from "@/lib/llm-service"
import { Loader2, AlertCircle, Edit2, Calendar, Clock, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { Task as TaskUtilsType } from "@/lib/task-utils"
import { EditTaskDialog } from "@/components/task/edit-task-dialog"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface AIAnalysisModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inboxItems: InboxItem[]
  onSuccess: () => void
}

export function AIAnalysisModal({ open, onOpenChange, inboxItems, onSuccess }: AIAnalysisModalProps) {
  const [analyzedTasks, setAnalyzedTasks] = useState<(AnalyzedTask & { id: number, selected: boolean })[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Data for EditTaskDialog
  const [projects, setProjects] = useState<Project[]>([])
  const [activityCategories, setActivityCategories] = useState<ActivityCategory[]>([])
  
  // Edit State
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  useEffect(() => {
    if (open && inboxItems.length > 0) {
      loadData()
      analyze()
    } else {
        // Reset state when closed
        setAnalyzedTasks([])
        setError(null)
        setIsLoading(false)
        setEditingTaskIndex(null)
        setIsEditOpen(false)
    }
  }, [open]) // Only depend on open, rely on inboxItems being fresh when open changes to true

  const loadData = async () => {
    try {
      const [projs, cats] = await Promise.all([
        getAll<Project>(ObjectStores.PROJECTS),
        getAll<ActivityCategory>(ObjectStores.ACTIVITY_CATEGORIES)
      ])
      setProjects(projs)
      setActivityCategories(cats)
    } catch (e) {
      console.error("Failed to load projects/categories", e)
    }
  }

  const analyze = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Map inbox items to the format expected by analyzeInboxItems
      // We pass id to ensure we can track them, though analyzeInboxItems returns originalId
      const itemsToAnalyze = inboxItems.map(item => ({ id: item.id, content: item.content }))
      
      const results = await analyzeInboxItems(itemsToAnalyze)
      
      // Merge results with local state structure
      const tasksWithSelection = results.map((task, index) => ({
        ...task,
        id: index, // Temporary ID for list management
        selected: true // Default to selected
      }))
      
      setAnalyzedTasks(tasksWithSelection)
    } catch (err: any) {
      console.error("Analysis failed", err)
      setError(err.message || "AI解析失败，请检查配置或重试。")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleSelect = (index: number, checked: boolean) => {
    setAnalyzedTasks(prev => prev.map((t, i) => i === index ? { ...t, selected: checked } : t))
  }

  const handleEditTask = (index: number) => {
    setEditingTaskIndex(index)
    setIsEditOpen(true)
  }

  const handleSaveEditedTask = (updatedTask: TaskUtilsType) => {
    if (editingTaskIndex === null) return

    setAnalyzedTasks(prev => prev.map((t, i) => {
      if (i !== editingTaskIndex) return t
      
      // Map back from TaskUtilsType to AnalyzedTask structure
      return {
        ...t,
        title: updatedTask.title,
        description: updatedTask.description,
        priority: updatedTask.priority,
        category: updatedTask.category,
        isFrog: updatedTask.isFrog,
        plannedDate: updatedTask.plannedDate ? format(updatedTask.plannedDate, "yyyy-MM-dd") : undefined,
        dueDate: updatedTask.dueDate ? format(updatedTask.dueDate, "yyyy-MM-dd") : undefined,
        estimatedDurationHours: updatedTask.estimatedDurationHours,
        projectId: updatedTask.projectId,
        tags: updatedTask.tags,
        defaultActivityCategoryId: updatedTask.defaultActivityCategoryId,
        // Preserve other fields
        originalContent: t.originalContent,
        originalId: t.originalId,
        selected: t.selected
      }
    }))
    setIsEditOpen(false)
    setEditingTaskIndex(null)
  }

  const handleConfirmImport = async () => {
    const selectedTasks = analyzedTasks.filter(t => t.selected)
    if (selectedTasks.length === 0) {
      toast.error("请至少选择一个任务进行导入")
      return
    }

    try {
      // 1. Create Tasks
      const createPromises = selectedTasks.map(task => {
        const newTask: any = {
          title: task.title,
          description: task.description,
          priority: task.priority,
          category: task.category,
          isFrog: task.isFrog ? 1 : 0,
          completed: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: 0,
          isRecurring: 0,
          projectId: task.projectId,
          tags: task.tags,
          defaultActivityCategoryId: task.defaultActivityCategoryId
        }

        if (task.plannedDate) newTask.plannedDate = new Date(task.plannedDate)
        if (task.dueDate) newTask.dueDate = new Date(task.dueDate)
        if (task.estimatedDurationHours) newTask.estimatedDurationHours = task.estimatedDurationHours

        return addToDB(ObjectStores.TASKS, newTask)
      })

      await Promise.all(createPromises)

      // 2. Delete original Inbox Items
      // We need to know which inbox items were processed.
      // Assuming originalId corresponds to InboxItem.id
      const inboxIdsToDelete = selectedTasks
        .map(t => t.originalId)
        .filter((id): id is number => id !== undefined)

      // Remove duplicates just in case
      const uniqueIdsToDelete = [...new Set(inboxIdsToDelete)]

      const deletePromises = uniqueIdsToDelete.map(id => 
        removeFromDB(ObjectStores.INBOX_ITEMS, id)
      )

      await Promise.all(deletePromises)

      toast.success(`成功导入 ${selectedTasks.length} 个任务`)
      
      // Trigger global refresh
      window.dispatchEvent(new CustomEvent('taskDataChangedForStats'))
      
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      console.error("Import failed", e)
      toast.error("导入任务失败，请重试")
    }
  }

  // Convert current editing task to TaskUtilsType for the dialog
  const currentEditingTask: TaskUtilsType | null = editingTaskIndex !== null && analyzedTasks[editingTaskIndex] ? {
    id: 0, // Dummy ID
    title: analyzedTasks[editingTaskIndex].title,
    description: analyzedTasks[editingTaskIndex].description,
    priority: analyzedTasks[editingTaskIndex].priority,
    projectId: analyzedTasks[editingTaskIndex].projectId,
    completed: false,
    isFrog: analyzedTasks[editingTaskIndex].isFrog,
    tags: analyzedTasks[editingTaskIndex].tags || [],
    dueDate: analyzedTasks[editingTaskIndex].dueDate ? new Date(analyzedTasks[editingTaskIndex].dueDate!) : undefined,
    subtasks: [],
    createdAt: new Date(),
    category: analyzedTasks[editingTaskIndex].category,
    plannedDate: analyzedTasks[editingTaskIndex].plannedDate ? new Date(analyzedTasks[editingTaskIndex].plannedDate!) : undefined,
    estimatedDurationHours: analyzedTasks[editingTaskIndex].estimatedDurationHours,
    isRecurring: false,
    defaultActivityCategoryId: analyzedTasks[editingTaskIndex].defaultActivityCategoryId
  } : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>AI 智能解析</DialogTitle>
            <DialogDescription>
              AI已根据您的想法解析出以下任务，请确认或修改后导入。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden min-h-[300px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">正在分析想法...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4 text-destructive">
                <AlertCircle className="h-8 w-8" />
                <p>{error}</p>
                <Button variant="outline" onClick={analyze}>重试</Button>
              </div>
            ) : (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  {analyzedTasks.map((task, index) => (
                    <div key={index} className="flex gap-4 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                      <Checkbox 
                        checked={task.selected}
                        onCheckedChange={(c) => handleToggleSelect(index, c as boolean)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                                <h4 className="font-medium leading-none">{task.title}</h4>
                                <div className="text-sm text-muted-foreground line-clamp-2">
                                    <span className="font-semibold text-xs text-primary/70 mr-1">源:</span>
                                    {task.originalContent}
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleEditTask(index)}>
                                <Edit2 className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline" className={
                                task.priority === 'importantUrgent' ? 'bg-red-100 text-red-800 border-red-200' :
                                task.priority === 'importantNotUrgent' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                task.priority === 'notImportantUrgent' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                'bg-green-100 text-green-800 border-green-200'
                            }>
                                {task.priority === 'importantUrgent' && '重要且紧急'}
                                {task.priority === 'importantNotUrgent' && '重要不紧急'}
                                {task.priority === 'notImportantUrgent' && '不重要但紧急'}
                                {task.priority === 'notImportantNotUrgent' && '不重要不紧急'}
                            </Badge>
                            
                            {task.category !== 'next_action' && (
                                <Badge variant="secondary">
                                    {task.category === 'someday_maybe' ? '将来/也许' : '等待中'}
                                </Badge>
                            )}

                            {task.isFrog && <Badge className="bg-green-600">青蛙</Badge>}
                            
                            {(task.plannedDate || task.dueDate) && (
                                <div className="flex items-center text-muted-foreground ml-2">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {task.plannedDate || task.dueDate}
                                </div>
                            )}
                            
                            {task.estimatedDurationHours && (
                                <div className="flex items-center text-muted-foreground ml-2">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {task.estimatedDurationHours}h
                                </div>
                            )}
                        </div>
                        
                        {task.description && task.description !== task.originalContent && (
                            <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded mt-2">
                                {task.description}
                            </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={handleConfirmImport} disabled={isLoading || analyzedTasks.filter(t => t.selected).length === 0}>
                <ArrowRight className="mr-2 h-4 w-4" />
                确认导入 ({analyzedTasks.filter(t => t.selected).length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {isEditOpen && currentEditingTask && (
        <EditTaskDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          task={currentEditingTask}
          onSave={handleSaveEditedTask}
          availableProjects={projects}
          availableActivityCategories={activityCategories}
          onCreateNewProject={async () => undefined} // Not supported here for simplicity
        />
      )}
    </>
  )
}
