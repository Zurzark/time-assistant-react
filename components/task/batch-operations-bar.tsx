"use client"

import { FC, useState } from "react"
import { Check, Trash2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ObjectStores, get, update } from "@/lib/db"
import { Task as DBTaskType } from "@/lib/db"
import { ConfirmationDialog } from "../common/confirmation-dialog"

interface BatchOperationsBarProps {
  selectedTaskIds: number[]
  onClearSelection: () => void
  onOperationComplete: () => void
  className?: string
}

export const BatchOperationsBar: FC<BatchOperationsBarProps> = ({
  selectedTaskIds,
  onClearSelection,
  onOperationComplete,
  className = "",
}) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false)

  const handleBatchComplete = async () => {
    if (selectedTaskIds.length === 0) return

    setLoading(true)
    try {
      const updates = selectedTaskIds.map(async (id) => {
        const taskInDB = await get<DBTaskType>(ObjectStores.TASKS, id)
        if (taskInDB && taskInDB.completed === 0) {
          taskInDB.completed = 1
          taskInDB.completedAt = new Date()
          taskInDB.updatedAt = new Date()
          return update(ObjectStores.TASKS, taskInDB)
        }
        return Promise.resolve()
      })
      await Promise.all(updates)
      toast.success(`已将 ${selectedTaskIds.length} 个任务标记为完成。`)
      
      // 通知父组件操作完成，可以刷新数据和更新统计
      onOperationComplete()
      
      // 清除选择
      onClearSelection()
    } catch (err) {
      console.error("Failed to batch complete tasks:", err)
      toast.error("批量完成任务失败。")
      setError(err instanceof Error ? err : new Error('批量完成任务失败'))
    } finally {
      setLoading(false)
    }
  }

  const handleBatchDelete = () => {
    if (selectedTaskIds.length === 0) return
    setIsBatchDeleteConfirmOpen(true)
  }

  const confirmBatchDelete = async () => {
    if (selectedTaskIds.length === 0) return
    setLoading(true)
    try {
      const deletes = selectedTaskIds.map(async (id) => {
        const taskInDB = await get<DBTaskType>(ObjectStores.TASKS, id)
        if (taskInDB) {
          taskInDB.isDeleted = 1
          taskInDB.deletedAt = new Date()
          taskInDB.updatedAt = new Date()
          return update(ObjectStores.TASKS, taskInDB)
        }
        return Promise.resolve()
      })
      await Promise.all(deletes)
      toast.success(`已将 ${selectedTaskIds.length} 个任务移至回收站。`)
      
      // 通知父组件操作完成，可以刷新数据和更新统计
      onOperationComplete()
      
      // 清除选择
      onClearSelection()
    } catch (err) {
      console.error("Failed to batch delete tasks:", err)
      toast.error("批量删除任务失败。")
      setError(err instanceof Error ? err : new Error('批量删除任务失败'))
    } finally {
      setLoading(false)
      setIsBatchDeleteConfirmOpen(false)
    }
  }

  if (selectedTaskIds.length === 0) return null

  return (
    <>
      <div className={`mb-4 p-3 border rounded-lg bg-muted/60 dark:bg-muted/30 flex items-center justify-between animate-fadeInDown sticky top-0 z-10 shadow ${className}`}>
        <span className="text-sm font-medium">已选择 {selectedTaskIds.length} 个任务</span>
        <div className="space-x-2">
          <Button 
            size="sm" 
            onClick={handleBatchComplete} 
            variant="outline"
            disabled={loading}
          >
            <Check className="h-4 w-4 mr-1.5" />批量完成
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={handleBatchDelete}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />批量删除
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onClearSelection} 
            className="text-muted-foreground"
            disabled={loading}
          >
            <XCircle className="h-4 w-4 mr-1.5" />取消选择
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        open={isBatchDeleteConfirmOpen}
        onOpenChange={setIsBatchDeleteConfirmOpen}
        title="确认批量删除任务"
        description={`您确定要将选中的 ${selectedTaskIds.length} 个任务移至回收站吗？`}
        onConfirm={confirmBatchDelete}
      />
    </>
  )
} 