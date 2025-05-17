"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Flag, Lightbulb, Plus, Tag, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

// 定义任务类型
export type Task = {
  id: number
  title: string
  description: string
  priority: "high" | "medium" | "low"
  dueDate: string
  estimatedTime: number
  project: string
  status: "todo" | "in-progress" | "completed"
  tags: string[]
}

type TaskFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: Omit<Task, "id">) => void
  editTask?: Task | null
}

export function TaskFormDialog({ open, onOpenChange, onSave, editTask }: TaskFormDialogProps) {
  const [title, setTitle] = useState(editTask?.title || "")
  const [description, setDescription] = useState(editTask?.description || "")
  const [priority, setPriority] = useState<"high" | "medium" | "low">(editTask?.priority || "medium")
  const [dueDate, setDueDate] = useState(editTask?.dueDate || new Date().toISOString().split("T")[0])
  const [estimatedHours, setEstimatedHours] = useState(editTask ? Math.floor(editTask.estimatedTime / 60) : 0)
  const [estimatedMinutes, setEstimatedMinutes] = useState(editTask ? editTask.estimatedTime % 60 : 0)
  const [project, setProject] = useState(editTask?.project || "产品开发")
  const [tags, setTags] = useState<string[]>(editTask?.tags || [])
  const [newTag, setNewTag] = useState("")

  const handleSave = () => {
    if (!title.trim()) {
      alert("请输入任务标题")
      return
    }

    const task = {
      title,
      description,
      priority,
      dueDate,
      estimatedTime: estimatedHours * 60 + estimatedMinutes,
      project,
      status: editTask?.status || "todo",
      tags,
    }

    onSave(task)
    onOpenChange(false)
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editTask ? "编辑任务" : "创建新任务"}</DialogTitle>
          <DialogDescription>{editTask ? "修改任务详情" : "添加新任务到您的任务列表"}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">任务标题</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入任务标题" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">任务描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入任务描述"
              rows={3}
            />
            <div className="flex items-center text-xs text-muted-foreground">
              <Lightbulb className="h-3 w-3 mr-1" />
              AI 可以帮助您分解复杂任务
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dueDate">截止日期</Label>
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estimatedTime">预估时间</Label>
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="estimatedHours"
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(Number.parseInt(e.target.value) || 0)}
                  placeholder="小时"
                  className="w-20 mr-2"
                  min={0}
                />
                <span className="mr-2">小时</span>
                <Input
                  id="estimatedMinutes"
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number.parseInt(e.target.value) || 0)}
                  placeholder="分钟"
                  className="w-20 mr-2"
                  min={0}
                  max={59}
                />
                <span>分钟</span>
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Lightbulb className="h-3 w-3 mr-1" />
                AI 可以帮助您预估时间
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="priority">优先级</Label>
              <div className="flex items-center">
                <Flag className="mr-2 h-4 w-4 text-muted-foreground" />
                <Select value={priority} onValueChange={(value: "high" | "medium" | "low") => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择优先级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project">项目</Label>
              <div className="flex items-center">
                <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                <Select value={project} onValueChange={setProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择项目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="产品开发">产品开发</SelectItem>
                    <SelectItem value="团队管理">团队管理</SelectItem>
                    <SelectItem value="个人发展">个人发展</SelectItem>
                    <SelectItem value="健康">健康</SelectItem>
                    <SelectItem value="沟通">沟通</SelectItem>
                    <SelectItem value="市场营销">市场营销</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>标签</Label>
            <div className="flex flex-wrap gap-2 border rounded-md p-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  placeholder="添加标签..."
                  className="w-24 h-7 border-none text-sm"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={addTag}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>子任务</Label>
            <div className="space-y-2 border rounded-md p-2">
              <div className="flex items-center gap-2">
                <Checkbox id="subtask-1" />
                <Label htmlFor="subtask-1" className="text-sm">
                  准备设计草图
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="subtask-2" />
                <Label htmlFor="subtask-2" className="text-sm">
                  创建交互原型
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Input placeholder="添加子任务..." className="h-7 text-sm" />
                <Button size="sm" variant="ghost">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>{editTask ? "保存修改" : "创建任务"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
