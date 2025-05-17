"use client"

import { useState } from "react"
import { Archive, ArrowRight, Clock, Flag, MoreHorizontal, Plus, Target, Trash2, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface InboxItem {
  id: number
  content: string
  createdAt: string
  selected: boolean
}

export function InboxView() {
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([
    {
      id: 1,
      content: "研究新的项目管理工具，可能对团队协作有帮助",
      createdAt: "今天 09:15",
      selected: false,
    },
    {
      id: 2,
      content: "联系客户讨论下周的会议安排",
      createdAt: "今天 10:30",
      selected: false,
    },
    {
      id: 3,
      content: "阅读关于时间管理的新书",
      createdAt: "昨天 15:45",
      selected: false,
    },
    {
      id: 4,
      content: "整理办公桌，创造更好的工作环境",
      createdAt: "昨天 18:20",
      selected: false,
    },
    {
      id: 5,
      content: "考虑参加下个月的行业会议",
      createdAt: "2天前",
      selected: false,
    },
  ])

  const [newItemText, setNewItemText] = useState("")
  const [selectedTab, setSelectedTab] = useState("all")

  const toggleSelectItem = (id: number) => {
    setInboxItems(inboxItems.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)))
  }

  const toggleSelectAll = () => {
    const allSelected = inboxItems.every((item) => item.selected)
    setInboxItems(inboxItems.map((item) => ({ ...item, selected: !allSelected })))
  }

  const addNewItem = () => {
    if (newItemText.trim()) {
      const newItem: InboxItem = {
        id: Date.now(),
        content: newItemText,
        createdAt: "刚刚",
        selected: false,
      }
      setInboxItems([newItem, ...inboxItems])
      setNewItemText("")
    }
  }

  const deleteSelected = () => {
    setInboxItems(inboxItems.filter((item) => !item.selected))
  }

  const selectedCount = inboxItems.filter((item) => item.selected).length

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">收集篮</h1>
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
            {selectedCount > 0 && (
              <div className="flex items-center justify-between bg-muted p-2 rounded-md mb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox checked={inboxItems.every((item) => item.selected)} onCheckedChange={toggleSelectAll} />
                  <span className="text-sm font-medium">已选择 {selectedCount} 项</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={deleteSelected}>
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
                      <DropdownMenuItem>
                        <Flag className="h-4 w-4 mr-2" />
                        转化为任务
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Target className="h-4 w-4 mr-2" />
                        转化为目标
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Clock className="h-4 w-4 mr-2" />
                        标记为将来/也许
                      </DropdownMenuItem>
                      <DropdownMenuItem>
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
                {inboxItems.length > 0 ? (
                  <div className="space-y-4">
                    {inboxItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start space-x-3 p-3 rounded-lg transition-colors",
                          item.selected ? "bg-muted" : "hover:bg-muted/50",
                        )}
                      >
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleSelectItem(item.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm">{item.content}</p>
                          <p className="text-xs text-muted-foreground">{item.createdAt}</p>
                        </div>
                        <div className="flex items-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Flag className="h-4 w-4 mr-2" />
                                转化为任务
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Target className="h-4 w-4 mr-2" />
                                转化为目标
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Clock className="h-4 w-4 mr-2" />
                                标记为将来/也许
                              </DropdownMenuItem>
                              <DropdownMenuItem>
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
                {inboxItems.filter((item) => item.createdAt.includes("今天") || item.createdAt.includes("昨天"))
                  .length > 0 ? (
                  <div className="space-y-4">
                    {inboxItems
                      .filter((item) => item.createdAt.includes("今天") || item.createdAt.includes("昨天"))
                      .map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-start space-x-3 p-3 rounded-lg transition-colors",
                            item.selected ? "bg-muted" : "hover:bg-muted/50",
                          )}
                        >
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleSelectItem(item.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm">{item.content}</p>
                            <p className="text-xs text-muted-foreground">{item.createdAt}</p>
                          </div>
                          <div className="flex items-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Flag className="h-4 w-4 mr-2" />
                                  转化为任务
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Target className="h-4 w-4 mr-2" />
                                  转化为目标
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Clock className="h-4 w-4 mr-2" />
                                  标记为将来/也许
                                </DropdownMenuItem>
                                <DropdownMenuItem>
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
                {inboxItems.every((item) => item.selected) ? "取消全选" : "全选"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setInboxItems([])}>
                清空收集篮
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
