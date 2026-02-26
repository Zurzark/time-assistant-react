"use client"

import { useState, useEffect } from "react"
import { Archive, ArrowRight, Clock, Flag, MoreHorizontal, Plus, Target, Trash2, Inbox, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { formatRelativeTime, isRecent } from "@/lib/date-utils"
import { InboxItem, addInboxItem, getUnprocessedInboxItems, updateInboxItemsStatus, deleteInboxItem, clearUnprocessedInboxItems } from "@/lib/db"
import { AddInboxItemDialog } from "@/components/inbox/add-inbox-item-dialog"
import { ConvertToTaskDialog } from "@/components/inbox/convert-to-task-dialog"
import { ConvertToGoalDialog } from "@/components/inbox/convert-to-goal-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AIAnalysisModal } from "@/components/ai-features/ai-analysis-modal"
import { toast } from "sonner"

export function InboxView() {
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InboxItem[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [newItemText, setNewItemText] = useState("")
  const [selectedTab, setSelectedTab] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  // 对话框状态
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [convertToTaskDialogOpen, setConvertToTaskDialogOpen] = useState(false)
  const [convertToGoalDialogOpen, setConvertToGoalDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  // 获取选中的条目
  const getSelectedInboxItems = () => {
    return inboxItems.filter(item => selectedItems.has(item.id!))
  }

  // 加载收集篮条目
  const loadInboxItems = async () => {
    setIsLoading(true)
    try {
      const items = await getUnprocessedInboxItems()
      setInboxItems(items)
      filterItems(items, selectedTab)
    } catch (error) {
      console.error("加载收集篮条目失败:", error)
      toast.error("加载收集篮条目失败")
    } finally {
      setIsLoading(false)
    }
  }

  // 根据选项卡筛选条目
  const filterItems = (items: InboxItem[], tab: string) => {
    if (tab === "all") {
      setFilteredItems(items)
    } else if (tab === "recent") {
      // 筛选最近添加的条目（今天和昨天）
      setFilteredItems(items.filter(item => isRecent(new Date(item.createdAt))))
    }
  }

  // 组件加载时获取数据
  useEffect(() => {
    loadInboxItems()
  }, [])

  // 当选项卡改变时筛选条目
  useEffect(() => {
    filterItems(inboxItems, selectedTab)
  }, [selectedTab, inboxItems])

  // 切换选择条目
  const toggleSelectItem = (id: number) => {
    const newSelectedItems = new Set(selectedItems)
    if (newSelectedItems.has(id)) {
      newSelectedItems.delete(id)
    } else {
      newSelectedItems.add(id)
    }
    setSelectedItems(newSelectedItems)
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      // 如果全部选中，则取消全选
      setSelectedItems(new Set())
    } else {
      // 否则全选
      setSelectedItems(new Set(filteredItems.map(item => item.id!)))
    }
  }

  // 处理AI解析
  const handleAIAnalyze = () => {
      if (selectedItems.size === 0) return
      setIsAIModalOpen(true)
  }

  const handleAnalysisSuccess = () => {
      setSelectedItems(new Set())
      loadInboxItems()
  }

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
      loadInboxItems()
      toast.success("已添加到收集篮")
    } catch (error) {
      console.error("添加收集篮条目失败:", error)
      toast.error("添加失败")
    }
  }

  // 删除选中的条目
  const deleteSelected = async () => {
    try {
      const selectedIds = Array.from(selectedItems)
      
      // 使用物理删除
      await Promise.all(selectedIds.map(id => deleteInboxItem(id)))
      
      setSelectedItems(new Set())
      loadInboxItems()
      toast.success("已删除选中的条目")
    } catch (error) {
      console.error("删除收集篮条目失败:", error)
      toast.error("删除失败")
    }
  }

  // 清空收集篮
  const clearInbox = async () => {
    try {
      await clearUnprocessedInboxItems(true) // true表示物理删除
      setSelectedItems(new Set())
      loadInboxItems()
      toast.success("已清空收集篮")
    } catch (error) {
      console.error("清空收集篮失败:", error)
      toast.error("清空失败")
    }
  }

  // 标记为将来/也许
  const markAsSomedayMaybe = async () => {
    try {
      const selectedIds = Array.from(selectedItems)
      await updateInboxItemsStatus(selectedIds, "someday_maybe")
      setSelectedItems(new Set())
      loadInboxItems()
      toast.success("已标记为将来/也许")
    } catch (error) {
      console.error("标记为将来/也许失败:", error)
      toast.error("操作失败")
    }
  }

  // 归档
  const archiveSelected = async () => {
    try {
      const selectedIds = Array.from(selectedItems)
      await updateInboxItemsStatus(selectedIds, "archived")
      setSelectedItems(new Set())
      loadInboxItems()
      toast.success("已归档选中的条目")
    } catch (error) {
      console.error("归档收集篮条目失败:", error)
      toast.error("归档失败")
    }
  }

  // 处理单个条目的操作
  const handleItemAction = (id: number, action: string) => {
    // 设置仅选中当前条目
    setSelectedItems(new Set([id]))
    
    switch (action) {
      case "convert-to-task":
        setConvertToTaskDialogOpen(true)
        break
      case "convert-to-goal":
        setConvertToGoalDialogOpen(true)
        break
      case "someday-maybe":
        markAsSomedayMaybe()
        break
      case "delete":
        setDeleteConfirmOpen(true)
        break
      case "archive":
        archiveSelected()
        break
    }
  }

  // 处理批量操作
  const handleBulkAction = (action: string) => {
    switch (action) {
      case "convert-to-task":
        setConvertToTaskDialogOpen(true)
        break
      case "convert-to-goal":
        setConvertToGoalDialogOpen(true)
        break
      case "someday-maybe":
        markAsSomedayMaybe()
        break
      case "archive":
        archiveSelected()
        break
    }
  }

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">收集篮</h1>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            添加详细条目
          </Button>
        </div>
        <p className="text-muted-foreground">收集所有想法和事项，稍后再处理</p>
      </div>

      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">快速添加</CardTitle>
            </div>
            <CardDescription>将你的想法和待办事项添加到收集篮</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="输入新的想法或待办事项..."
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addNewItem()
                  }
                }}
                className="flex-1"
              />
              <Button onClick={addNewItem}>
                <Plus className="h-4 w-4 mr-2" />
                添加
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-xl">收集篮</CardTitle>
                <div className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {inboxItems.length}
                </div>
              </div>
              <Tabs defaultValue="all" className="w-[400px]" value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="all">全部</TabsTrigger>
                  <TabsTrigger value="recent">最近</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            {selectedItems.size > 0 && (
              <div className="flex items-center justify-between bg-muted p-2 rounded-md mb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={selectedItems.size === filteredItems.length && filteredItems.length > 0} 
                    onCheckedChange={toggleSelectAll} 
                  />
                  <span className="text-sm font-medium">已选择 {selectedItems.size} 项</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handleAIAnalyze}>
                    <Zap className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
                    AI解析
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        批量操作
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleBulkAction("convert-to-task")}>
                        <Flag className="h-4 w-4 mr-2" />
                        转化为任务
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction("convert-to-goal")}>
                        <Target className="h-4 w-4 mr-2" />
                        转化为目标
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction("someday-maybe")}>
                        <Clock className="h-4 w-4 mr-2" />
                        标记为将来/也许
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction("archive")}>
                        <Archive className="h-4 w-4 mr-2" />
                        归档
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}

            <Tabs defaultValue="all" value={selectedTab}>
              <TabsContent value="all" className="m-0">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredItems.length > 0 ? (
                  <div className="space-y-4">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start space-x-3 p-3 rounded-lg transition-colors",
                          selectedItems.has(item.id!) ? "bg-muted" : "hover:bg-muted/50",
                        )}
                      >
                        <Checkbox
                          checked={selectedItems.has(item.id!)}
                          onCheckedChange={() => toggleSelectItem(item.id!)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm">{item.content}</p>
                          {item.notes && <p className="text-xs text-muted-foreground line-clamp-1">{item.notes}</p>}
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(new Date(item.createdAt))}</p>
                        </div>
                        <div className="flex items-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleItemAction(item.id!, "convert-to-task")}>
                                <Flag className="h-4 w-4 mr-2" />
                                转化为任务
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleItemAction(item.id!, "convert-to-goal")}>
                                <Target className="h-4 w-4 mr-2" />
                                转化为目标
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleItemAction(item.id!, "someday-maybe")}>
                                <Clock className="h-4 w-4 mr-2" />
                                标记为将来/也许
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleItemAction(item.id!, "archive")}>
                                <Archive className="h-4 w-4 mr-2" />
                                归档
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleItemAction(item.id!, "delete")}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-primary/10 p-3 mb-4">
                      <Inbox className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">收集篮已清空</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">太棒了！您的收集篮已清空。有什么新想法吗？</p>
                    <Button onClick={() => document.querySelector("input")?.focus()}>
                      <Plus className="h-4 w-4 mr-2" />
                      添加新想法
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recent" className="m-0">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredItems.length > 0 ? (
                  <div className="space-y-4">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start space-x-3 p-3 rounded-lg transition-colors",
                          selectedItems.has(item.id!) ? "bg-muted" : "hover:bg-muted/50",
                        )}
                      >
                        <Checkbox
                          checked={selectedItems.has(item.id!)}
                          onCheckedChange={() => toggleSelectItem(item.id!)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm">{item.content}</p>
                          {item.notes && <p className="text-xs text-muted-foreground line-clamp-1">{item.notes}</p>}
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(new Date(item.createdAt))}</p>
                        </div>
                        <div className="flex items-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleItemAction(item.id!, "convert-to-task")}>
                                <Flag className="h-4 w-4 mr-2" />
                                转化为任务
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleItemAction(item.id!, "convert-to-goal")}>
                                <Target className="h-4 w-4 mr-2" />
                                转化为目标
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleItemAction(item.id!, "someday-maybe")}>
                                <Clock className="h-4 w-4 mr-2" />
                                标记为将来/也许
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleItemAction(item.id!, "archive")}>
                                <Archive className="h-4 w-4 mr-2" />
                                归档
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleItemAction(item.id!, "delete")}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-primary/10 p-3 mb-4">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">没有最近的项目</h3>
                    <p className="text-muted-foreground mb-4">最近没有添加任何项目到收集篮</p>
                    <Button onClick={() => document.querySelector("input")?.focus()}>
                      <Plus className="h-4 w-4 mr-2" />
                      添加新想法
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedItems.size === filteredItems.length && filteredItems.length > 0 ? "取消全选" : "全选"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setClearConfirmOpen(true)}>
                清空收集篮
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* 添加详细条目对话框 */}
      <AddInboxItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onItemAdded={loadInboxItems}
      />

      {/* 转化为任务对话框 */}
      <ConvertToTaskDialog
        open={convertToTaskDialogOpen}
        onOpenChange={setConvertToTaskDialogOpen}
        inboxItems={getSelectedInboxItems()}
        onConversionComplete={loadInboxItems}
      />

      {/* 转化为目标对话框 */}
      <ConvertToGoalDialog
        open={convertToGoalDialogOpen}
        onOpenChange={setConvertToGoalDialogOpen}
        inboxItems={getSelectedInboxItems()}
        onConversionComplete={loadInboxItems}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="确认删除"
        description={`确定要删除选中的 ${selectedItems.size} 个条目吗？此操作不可撤销。`}
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={deleteSelected}
        variant="destructive"
      />

      {/* 清空确认对话框 */}
      <ConfirmDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title="确认清空收集篮"
        description="确定要删除所有未处理的收集篮条目吗？此操作不可撤销！"
        confirmLabel="清空"
        cancelLabel="取消"
        onConfirm={clearInbox}
        variant="destructive"
      />

      {/* AI解析对话框 */}
      <AIAnalysisModal 
        open={isAIModalOpen}
        onOpenChange={setIsAIModalOpen}
        inboxItems={getSelectedInboxItems()}
        onSuccess={handleAnalysisSuccess}
      />
    </div>
  )
}
