// 快速收集箱组件
// 用于在今日看板页面快速添加和查看收集篮条目

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Inbox } from "lucide-react"
import { InboxItem, addInboxItem, getUnprocessedInboxItems, deleteInboxItem } from "@/lib/db"
import { formatRelativeTime } from "@/lib/date-utils"
import { toast } from "sonner"

export function QuickInboxCard() {
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([])
  const [newItemText, setNewItemText] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // 加载最近的收集篮条目
  const loadRecentInboxItems = async () => {
    setIsLoading(true)
    try {
      // 获取所有未处理的收集篮条目
      const items = await getUnprocessedInboxItems()
      // 按创建时间降序排序，并只取前5条
      const sortedItems = items
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
      setInboxItems(sortedItems)
    } catch (error) {
      console.error("加载收集篮条目失败:", error)
      toast.error("加载收集篮条目失败")
    } finally {
      setIsLoading(false)
    }
  }

  // 组件加载时获取数据
  useEffect(() => {
    loadRecentInboxItems()
  }, [])

  // 快速添加条目
  const addNewItem = async () => {
    if (!newItemText.trim()) return

    try {
      const newItem: Omit<InboxItem, "id"> = {
        content: newItemText.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "unprocessed"
      }

      await addInboxItem(newItem)
      setNewItemText("")
      loadRecentInboxItems() // 重新加载列表
      toast.success("已添加到收集篮")
    } catch (error) {
      console.error("添加收集篮条目失败:", error)
      toast.error("添加失败")
    }
  }

  // 删除条目
  const deleteItem = async (id: number) => {
    try {
      await deleteInboxItem(id)
      // 从当前列表中移除
      setInboxItems(inboxItems.filter(item => item.id !== id))
      toast.success("已删除条目")
    } catch (error) {
      console.error("删除收集篮条目失败:", error)
      toast.error("删除失败")
    }
  }

  // 处理按Enter键添加
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addNewItem()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">快速收集</CardTitle>
        <div className="flex space-x-2 w-[60%]">
          <Input
            placeholder="快速记录想法或待办..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button size="sm" className="shrink-0" onClick={addNewItem}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* 收集篮条目列表区域 */}
        <div className="space-y-2 overflow-y-auto max-h-[160px] pr-1 -mr-1">
          {isLoading ? (
            <div className="flex justify-center py-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            </div>
          ) : inboxItems.length > 0 ? (
            inboxItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-start py-2 px-3 hover:bg-muted/50 rounded-md group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2">{item.content}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(new Date(item.createdAt))}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteItem(item.id!)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">收集篮为空，随时记录新想法！</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 