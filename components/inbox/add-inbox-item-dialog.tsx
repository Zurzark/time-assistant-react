// 添加收集篮条目的模态框组件
// 用于详细添加收集篮条目

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addInboxItem, InboxItem } from "@/lib/db"
import { TagInput } from "@/components/ui/tag-input"

interface AddInboxItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemAdded: () => void
}

export function AddInboxItemDialog({ open, onOpenChange, onItemAdded }: AddInboxItemDialogProps) {
  const [content, setContent] = useState("")
  const [notes, setNotes] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) return
    
    setIsSubmitting(true)
    
    try {
      const newItem: Omit<InboxItem, "id"> = {
        content: content.trim(),
        notes: notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "unprocessed"
      }
      
      await addInboxItem(newItem)
      
      // 重置表单
      setContent("")
      setNotes("")
      setTags([])
      
      // 关闭对话框
      onOpenChange(false)
      
      // 通知父组件刷新列表
      onItemAdded()
    } catch (error) {
      console.error("添加收集篮条目失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>添加详细条目</DialogTitle>
          <DialogDescription>
            添加一个新的想法或待办事项到收集篮，可以包含更多详细信息。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">内容</Label>
            <Input
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入想法或待办事项..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">备注（可选）</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="添加更多详细信息..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">标签（可选）</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="添加标签..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || !content.trim()}>
              {isSubmitting ? "保存中..." : "保存到收集篮"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 