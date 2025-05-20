// 转化为目标的对话框组件
// 用于将收集篮条目转化为目标

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GoalFormFields, GoalFormData } from "@/components/goal/GoalFormFields"
import { InboxItem, ObjectStores, updateInboxItemsStatus, add } from "@/lib/db"

interface ConvertToGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inboxItems: InboxItem[]
  onConversionComplete: () => void
}

export function ConvertToGoalDialog({ 
  open, 
  onOpenChange, 
  inboxItems, 
  onConversionComplete 
}: ConvertToGoalDialogProps) {
  // 从第一个收集篮条目中提取内容作为目标名称
  const initialData: Partial<GoalFormData> = {
    name: inboxItems.length > 0 ? inboxItems[0].content : "",
    description: inboxItems.length > 0 ? inboxItems[0].notes : undefined,
  }
  
  const handleSave = async (goalData: GoalFormData) => {
    try {
      // 1. 创建新目标
      const newGoalData = {
        ...goalData,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: 0,
      }
      
      const newGoalId = await add(ObjectStores.GOALS, newGoalData)
      
      // 2. 更新收集篮条目状态
      await updateInboxItemsStatus(
        inboxItems.map(item => item.id!), 
        'processed_to_goal',
        { goalId: newGoalId }
      )
      
      // 3. 关闭对话框并通知父组件刷新
      onOpenChange(false)
      onConversionComplete()
    } catch (error) {
      console.error("转化为目标失败:", error)
    }
  }
  
  const handleCancel = () => {
    onOpenChange(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>转化为目标</DialogTitle>
        </DialogHeader>
        <GoalFormFields
          initialData={initialData}
          onSave={handleSave}
          onCancel={handleCancel}
          submitButtonText="创建目标"
        />
      </DialogContent>
    </Dialog>
  )
} 