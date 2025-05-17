"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EditTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: {
    id: string
    title: string
    description?: string
    priority?: string
    dueDate?: Date
    dueTime?: string
    isFrog?: boolean
  } | null
  onSave: (task: any) => void
}

export function EditTaskModal({ open, onOpenChange, task, onSave }: EditTaskModalProps) {
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    description: "",
    priority: "important-urgent",
    dueDate: undefined as Date | undefined,
    dueTime: "",
    isFrog: false
  })
  
  // 当任务数据变化时更新表单
  useEffect(() => {
    if (task) {
      setFormData({
        id: task.id || "",
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "important-urgent",
        dueDate: task.dueDate,
        dueTime: task.dueTime || "",
        isFrog: task.isFrog || false
      })
    }
  }, [task])
  
  const handleSave = () => {
    onSave({
      ...formData,
      id: task?.id || formData.id
    })
    onOpenChange(false)
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      dueDate: date
    }))
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "编辑任务" : "创建新任务"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 任务标题 */}
          <div className="space-y-2">
            <Label htmlFor="title">任务标题</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="输入任务标题"
            />
          </div>
          
          {/* 任务描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">任务描述（可选）</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="输入任务描述"
              className="h-20 resize-none"
            />
          </div>
          
          {/* 优先级 */}
          <div className="space-y-2">
            <Label htmlFor="priority">优先级</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => handleSelectChange("priority", value)}
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="选择优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="important-urgent">重要且紧急</SelectItem>
                <SelectItem value="important-not-urgent">重要不紧急</SelectItem>
                <SelectItem value="not-important-urgent">紧急不重要</SelectItem>
                <SelectItem value="not-important-not-urgent">不紧急不重要</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 截止日期和时间 */}
          <div className="space-y-2">
            <Label>截止日期与时间</Label>
            <div className="flex space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, "yyyy-MM-dd") : "选择日期"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={handleDateChange}
                  />
                </PopoverContent>
              </Popover>
              
              <Select 
                value={formData.dueTime} 
                onValueChange={(value) => handleSelectChange("dueTime", value)}
              >
                <SelectTrigger className="flex-1">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="时间" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <>
                      <SelectItem key={`${hour}:00`} value={`${String(hour).padStart(2, "0")}:00`}>
                        {String(hour).padStart(2, "0")}:00
                      </SelectItem>
                      <SelectItem key={`${hour}:30`} value={`${String(hour).padStart(2, "0")}:30`}>
                        {String(hour).padStart(2, "0")}:30
                      </SelectItem>
                    </>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}