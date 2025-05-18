"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
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

// IndexedDB imports
import { getAll, ObjectStores, Project as DBProject } from "@/lib/db"

// 定义任务类型
export type Task = {
  id: number
  title: string
  description: string
  priority: "high" | "medium" | "low"
  dueDate: string
  estimatedTime: number
  projectId?: number
  status: "todo" | "in-progress" | "completed"
  tags: string[]
}

type TaskFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: Omit<Task, "id" | "project"> & { projectId?: number }) => void
  editTask?: Task | null
}

export function TaskFormDialog({ open, onOpenChange, onSave, editTask }: TaskFormDialogProps) {
  const [title, setTitle] = useState(editTask?.title || "")
  const [description, setDescription] = useState(editTask?.description || "")
  const [priority, setPriority] = useState<"high" | "medium" | "low">(editTask?.priority || "medium")
  const [dueDate, setDueDate] = useState(editTask?.dueDate || new Date().toISOString().split("T")[0])
  const [estimatedHours, setEstimatedHours] = useState(editTask ? Math.floor(editTask.estimatedTime / 60) : 0)
  const [estimatedMinutes, setEstimatedMinutes] = useState(editTask ? editTask.estimatedTime % 60 : 0)
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(editTask?.projectId)
  const [tags, setTags] = useState<string[]>(editTask?.tags || [])
  const [newTag, setNewTag] = useState("")

  const [projectsList, setProjectsList] = useState<DBProject[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [projectError, setProjectError] = useState<string | null>(null)

  const fetchProjectsForSelect = useCallback(async () => {
    if (!open) return;
    setIsLoadingProjects(true)
    setProjectError(null)
    try {
      const dbProjects = await getAll<DBProject>(ObjectStores.PROJECTS)
      setProjectsList(dbProjects)
      if (editTask?.projectId && !dbProjects.find(p => p.id === editTask.projectId)) {
      } else if (editTask?.projectId) {
        setSelectedProjectId(editTask.projectId);
      } else if (dbProjects.length > 0 && !selectedProjectId) {
      }

    } catch (error) {
      console.error("Failed to fetch projects for select:", error)
      setProjectError("无法加载项目列表。")
    } finally {
      setIsLoadingProjects(false)
    }
  }, [open, editTask?.projectId])

  useEffect(() => {
    fetchProjectsForSelect()
  }, [fetchProjectsForSelect])

  const handleSave = () => {
    if (!title.trim()) {
      alert("请输入任务标题")
      return
    }

    const taskToSave = {
      title,
      description,
      priority,
      dueDate,
      estimatedTime: estimatedHours * 60 + estimatedMinutes,
      projectId: selectedProjectId,
      status: editTask?.status || "todo",
      tags,
    }

    onSave(taskToSave)
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
                <Select 
                  value={selectedProjectId?.toString() || ""} 
                  onValueChange={(value) => setSelectedProjectId(value ? Number.parseInt(value) : undefined)}
                  disabled={isLoadingProjects}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingProjects ? "加载项目中..." : "选择项目"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingProjects ? (
                      <SelectItem value="loading" disabled>加载中...</SelectItem>
                    ) : projectError ? (
                      <SelectItem value="error" disabled>{projectError}</SelectItem>
                    ) : projectsList.length === 0 ? (
                      <SelectItem value="no-projects" disabled>无可用项目</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="">无项目</SelectItem>
                        {projectsList.map((p) => (
                          <SelectItem key={p.id} value={p.id!.toString()}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
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
