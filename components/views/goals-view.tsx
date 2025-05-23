"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Calendar, ChevronRight, Clock, Edit, Flag, MoreHorizontal, Plus, Target, Trash2, RefreshCw, TriangleAlert, CheckCircle, Zap, PauseCircle, XCircle, ListTodo } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { add, getAll, update, remove, ObjectStores, Goal as DBGoal, DBMilestone, getMilestonesByGoalId, addMilestone, updateMilestone, deleteMilestone } from "@/lib/db"
import { GoalFormFields, GoalFormData } from "@/components/goal/GoalFormFields"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface MilestoneViewItem {
  id: number;
  title: string;
  description?: string;
  targetDate?: Date;
  status: 'pending' | 'inProgress' | 'completed' | 'blocked';
  completedDate?: Date;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface GoalViewItem {
  id: number
  name: string
  description?: string
  goalMeaning?: string
  targetDate?: Date
  progress: number
  status: "active" | "completed" | "paused"
  createdAt: Date
  updatedAt: Date
}

const mapDBGoalToGoalViewItem = (dbGoal: DBGoal): GoalViewItem => {
  return {
    id: dbGoal.id!,
    name: dbGoal.name,
    description: dbGoal.description,
    goalMeaning: dbGoal.goalMeaning,
    targetDate: dbGoal.targetDate ? new Date(dbGoal.targetDate) : undefined,
    progress: dbGoal.progress ?? 0,
    status: dbGoal.status === 'archived' ? 'paused' : dbGoal.status,
    createdAt: new Date(dbGoal.createdAt),
    updatedAt: new Date(dbGoal.updatedAt),
  }
}

const mapDBMilestoneToViewItem = (dbMilestone: DBMilestone): MilestoneViewItem => {
  return {
    ...dbMilestone,
    id: dbMilestone.id!,
    targetDate: dbMilestone.targetDate ? new Date(dbMilestone.targetDate) : undefined,
    completedDate: dbMilestone.completedDate ? new Date(dbMilestone.completedDate) : undefined,
    createdAt: new Date(dbMilestone.createdAt),
    updatedAt: new Date(dbMilestone.updatedAt),
  }
}

export function GoalsView() {
  const [goals, setGoals] = useState<GoalViewItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const [selectedGoal, setSelectedGoal] = useState<GoalViewItem | null>(null)
  const [currentGoalMilestones, setCurrentGoalMilestones] = useState<MilestoneViewItem[]>([])
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(false)

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalViewItem | null>(null)

  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<MilestoneViewItem | null>(null)
  const [currentGoalIdForMilestone, setCurrentGoalIdForMilestone] = useState<number | null>(null)
  const [milestoneForm, setMilestoneForm] = useState<Partial<Omit<DBMilestone, 'id' | 'createdAt' | 'updatedAt' | 'goalId'>>>({ title: "", description: "", status: "pending", targetDate: undefined, })
  const [milestoneTargetDate, setMilestoneTargetDate] = useState<Date | undefined>()

  // 添加删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [goalToDelete, setGoalToDelete] = useState<number | null>(null)
  const [goalTitleToDelete, setGoalTitleToDelete] = useState("")
  
  // 添加里程碑删除确认对话框状态
  const [deleteMilestoneConfirmOpen, setDeleteMilestoneConfirmOpen] = useState(false)
  const [milestoneToDelete, setMilestoneToDelete] = useState<{id: number, goalId: number} | null>(null)
  const [milestoneTitleToDelete, setMilestoneTitleToDelete] = useState("")

  const fetchGoals = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const dbGoals = await getAll<DBGoal>(ObjectStores.GOALS)
      setGoals(dbGoals.map(mapDBGoalToGoalViewItem).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (err) {
      console.error("Failed to fetch goals:", err)
      setError("无法加载目标数据。请稍后重试。")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const handleCreateGoal = async (formData: GoalFormData) => {
    const now = new Date();
    const goalToSave: Omit<DBGoal, 'id'> = {
      name: formData.name,
      description: formData.description || undefined,
      goalMeaning: formData.goalMeaning || undefined,
      targetDate: formData.targetDate,
      progress: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    try {
      await add<Omit<DBGoal, 'id'>>(ObjectStores.GOALS, goalToSave)
      setIsCreateDialogOpen(false)
      fetchGoals()
    } catch (err) {
      console.error("Failed to create goal:", err)
      setError("创建目标失败。请稍后重试。")
    }
  }
  
  const openEditDialog = async (goal: GoalViewItem) => {
    setSelectedGoal(null); 
    setIsDetailDialogOpen(false); 
    setEditingGoal(goal);
    setIsEditDialogOpen(true);
    if (goal?.id) {
      await fetchMilestonesForGoal(goal.id);
    }
  };

  const handleUpdateGoal = async (formData: GoalFormData) => {
    if (!editingGoal) {
      setError("没有选中的目标进行更新。");
      return;
    }

    const now = new Date();
    const updatedDBGoal: DBGoal = {
      id: editingGoal.id,
      name: formData.name,
      description: formData.description || undefined,
      goalMeaning: formData.goalMeaning || undefined,
      targetDate: formData.targetDate,
      progress: editingGoal.progress,
      status: editingGoal.status,
      createdAt: editingGoal.createdAt,
      updatedAt: now,
    };
    
    try {
      await update<DBGoal>(ObjectStores.GOALS, updatedDBGoal);
      setIsEditDialogOpen(false);
      setEditingGoal(null);
      fetchGoals();
    } catch (err) {
      console.error("Failed to update goal:", err);
      setError("更新目标失败。请稍后重试。");
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    const goal = goals.find(g => g.id === goalId);
    setGoalToDelete(goalId);
    setGoalTitleToDelete(goal?.name || "此目标");
    setDeleteConfirmOpen(true);
  }
  
  // 确认删除目标的处理函数
  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    
    try {
      await remove(ObjectStores.GOALS, goalToDelete)
      fetchGoals()
      if (selectedGoal && selectedGoal.id === goalToDelete) {
        setIsDetailDialogOpen(false);
        setSelectedGoal(null);
      }
      if (editingGoal && editingGoal.id === goalToDelete) {
        setIsEditDialogOpen(false);
        setEditingGoal(null);
      }
      setGoalToDelete(null);
      setGoalTitleToDelete("");
    } catch (err) {
      console.error("Failed to delete goal:", err)
      setError("删除目标失败。")
    }
  }

  const openGoalDetails = async (goal: GoalViewItem) => {
    setEditingGoal(null); 
    setIsEditDialogOpen(false); 
    setSelectedGoal(goal)
    setIsDetailDialogOpen(true)
    if (goal?.id) {
      await fetchMilestonesForGoal(goal.id);
    } else {
      setCurrentGoalMilestones([]);
    }
  }

  const getStatusColor = (status: GoalViewItem["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "completed":
        return "bg-blue-500"
      case "paused":
        return "bg-amber-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: GoalViewItem["status"]) => {
    switch (status) {
      case "active":
        return "进行中"
      case "completed":
        return "已完成"
      case "paused":
        return "已暂停"
      default:
        return "未知"
    }
  }

  const fetchMilestonesForGoal = async (goalId: number) => {
    setIsLoadingMilestones(true);
    try {
      const dbMilestones = await getMilestonesByGoalId(goalId);
      setCurrentGoalMilestones(dbMilestones.map(mapDBMilestoneToViewItem));
    } catch (err) {
      console.error(`Failed to fetch milestones for goal ${goalId}:`, err);
    } finally {
      setIsLoadingMilestones(false);
    }
  };

  useEffect(() => {
    if (!isDetailDialogOpen && !isEditDialogOpen) {
      setSelectedGoal(null);
      setEditingGoal(null);
      setCurrentGoalMilestones([]);
      setCurrentGoalIdForMilestone(null);
    }
  }, [isDetailDialogOpen, isEditDialogOpen]);

  const getMilestoneStatusIcon = (status: MilestoneViewItem['status']) => {
    switch (status) {
      case 'pending': return <ListTodo className="h-4 w-4 text-gray-500" />;
      case 'inProgress': return <Zap className="h-4 w-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'blocked': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getMilestoneStatusText = (status: MilestoneViewItem['status']) => {
    const map = {
        'pending': '待处理',
        'inProgress': '进行中',
        'completed': '已完成',
        'blocked': '已阻塞'
    }
    return map[status] || '未知';
  };

  const resetMilestoneForm = () => {
    setMilestoneForm({
      title: "",
      description: "",
      status: "pending",
      targetDate: undefined,
    });
    setMilestoneTargetDate(undefined);
    setEditingMilestone(null);
    setCurrentGoalIdForMilestone(null);
  };

  const openAddMilestoneDialog = (goalId: number) => {
    resetMilestoneForm();
    setCurrentGoalIdForMilestone(goalId);
    setIsMilestoneDialogOpen(true);
  };

  const openEditMilestoneDialog = (milestone: MilestoneViewItem, goalId: number) => {
    resetMilestoneForm();
    setEditingMilestone(milestone);
    setCurrentGoalIdForMilestone(goalId);
    setMilestoneForm({
      title: milestone.title,
      description: milestone.description,
      status: milestone.status,
      targetDate: milestone.targetDate ? new Date(milestone.targetDate) : undefined,
      order: milestone.order,
    });
    setMilestoneTargetDate(milestone.targetDate ? new Date(milestone.targetDate) : undefined);
    setIsMilestoneDialogOpen(true);
  };

  const handleSaveMilestone = async () => {
    if (!milestoneForm.title?.trim() || !currentGoalIdForMilestone) {
      setError("里程碑标题不能为空且必须关联到一个目标。");
      return;
    }
    const now = new Date();
    if (editingMilestone) {
      const milestoneToUpdate: DBMilestone = {
        ...editingMilestone,
        id: editingMilestone.id,
        goalId: currentGoalIdForMilestone,
        title: milestoneForm.title!,
        description: milestoneForm.description || undefined,
        status: milestoneForm.status || 'pending',
        targetDate: milestoneTargetDate,
        order: milestoneForm.order,
        updatedAt: now,
      };
      try {
        await updateMilestone(milestoneToUpdate);
        setIsMilestoneDialogOpen(false);
        resetMilestoneForm();
        fetchMilestonesForGoal(currentGoalIdForMilestone);
      } catch (err) {
        console.error("Failed to update milestone:", err);
        setError("更新里程碑失败。");
      }
    } else {
      const milestoneToCreate: Omit<DBMilestone, 'id'> = {
        goalId: currentGoalIdForMilestone,
        title: milestoneForm.title!,
        description: milestoneForm.description || undefined,
        status: milestoneForm.status || 'pending',
        targetDate: milestoneTargetDate,
        order: milestoneForm.order,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await addMilestone(milestoneToCreate);
        setIsMilestoneDialogOpen(false);
        resetMilestoneForm();
        fetchMilestonesForGoal(currentGoalIdForMilestone);
      } catch (err) {
        console.error("Failed to create milestone:", err);
        setError("创建里程碑失败。");
      }
    }
  };

  const handleDeleteMilestone = async (milestoneId: number, goalId: number) => {
    const milestone = currentGoalMilestones.find(m => m.id === milestoneId);
    setMilestoneToDelete({id: milestoneId, goalId});
    setMilestoneTitleToDelete(milestone?.title || "此里程碑");
    setDeleteMilestoneConfirmOpen(true);
  };

  // 确认删除里程碑的处理函数
  const confirmDeleteMilestone = async () => {
    if (!milestoneToDelete) return;
    
    try {
      await deleteMilestone(milestoneToDelete.id);
      fetchMilestonesForGoal(milestoneToDelete.goalId);
      setMilestoneToDelete(null);
      setMilestoneTitleToDelete("");
    } catch (err) {
      console.error("Failed to delete milestone:", err);
      setError("删除里程碑失败。");
    }
  };

  const editFormInitialData: Partial<GoalFormData> | undefined = editingGoal ? {
    name: editingGoal.name,
    description: editingGoal.description,
    goalMeaning: editingGoal.goalMeaning,
    targetDate: editingGoal.targetDate,
  } : undefined;

  if (isLoading) {
    return (
      <div className="container py-6 space-y-8 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <RefreshCw className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">正在加载目标...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-6 space-y-8 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <TriangleAlert className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">发生错误</p>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <Button onClick={fetchGoals}>
          <RefreshCw className="h-4 w-4 mr-2" />
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">目标</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建目标
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>创建新目标</DialogTitle>
                <DialogDescription>设定一个新的长期目标</DialogDescription>
              </DialogHeader>
              <GoalFormFields 
                key={`create-goal-${isCreateDialogOpen}`}
                onSave={handleCreateGoal}
                onCancel={() => setIsCreateDialogOpen(false)}
                submitButtonText="创建目标"
                showCancelButton={true}
                formId="create-goal-view"
              />
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-muted-foreground">设定和追踪您的长期目标</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => (
          <Card key={goal.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{goal.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openGoalDetails(goal)}>
                      <ChevronRight className="h-4 w-4 mr-2" />
                      查看详情
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(goal)}>
                      <Edit className="h-4 w-4 mr-2" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteGoal(goal.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {goal.description && <CardDescription>{goal.description}</CardDescription>}
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>进度</span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="outline"
                      className={cn("flex items-center space-x-1 capitalize", {
                        "border-green-500 text-green-500": goal.status === "active",
                        "border-blue-500 text-blue-500": goal.status === "completed",
                        "border-amber-500 text-amber-500": goal.status === "paused",
                      })}
                    >
                      <span className={cn("h-2 w-2 rounded-full", getStatusColor(goal.status))}></span>
                      <span>{getStatusText(goal.status)}</span>
                    </Badge>
                  </div>
                  {goal.targetDate && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(goal.targetDate), "yyyy-MM-dd")}</span>
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => openGoalDetails(goal)}>
                查看详情
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={isDetailDialogOpen} onOpenChange={(isOpen) => { setIsDetailDialogOpen(isOpen); if (!isOpen) setSelectedGoal(null); }}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          {selectedGoal && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-2xl">{selectedGoal.name}</DialogTitle>
                  <Badge
                    variant="outline"
                    className={cn("flex items-center space-x-1 capitalize", {
                      "border-green-500 text-green-500": selectedGoal.status === "active",
                      "border-blue-500 text-blue-500": selectedGoal.status === "completed",
                      "border-amber-500 text-amber-500": selectedGoal.status === "paused",
                    })}
                  >
                    <span className={cn("h-2 w-2 rounded-full", getStatusColor(selectedGoal.status))}></span>
                    <span>{getStatusText(selectedGoal.status)}</span>
                  </Badge>
                </div>
                <DialogDescription>{selectedGoal.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">总体进度</span>
                    <span>{selectedGoal.progress}%</span>
                  </div>
                  <Progress value={selectedGoal.progress} className="h-2.5" />
                </div>

                <div className="flex items-center justify-between">
                  {selectedGoal.targetDate && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        期望完成日期: <span className="font-medium">{format(new Date(selectedGoal.targetDate), "yyyy-MM-dd")}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => { if(selectedGoal) openEditDialog(selectedGoal); }}>
                      <Edit className="h-4 w-4 mr-2" />
                      编辑目标
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          更多操作 <ChevronRight className="h-4 w-4 ml-1 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { alert("功能待实现：添加关联项目"); }}>
                          <Flag className="h-4 w-4 mr-2" />
                          添加关联项目
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { if (selectedGoal) openAddMilestoneDialog(selectedGoal.id); }}>
                          <Target className="h-4 w-4 mr-2" />
                          添加里程碑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { if (selectedGoal) handleDeleteGoal(selectedGoal.id); }}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除目标
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {isLoadingMilestones ? (
                  <div className="text-center py-4"><RefreshCw className="h-6 w-6 animate-spin text-primary mx-auto" /><p className="text-muted-foreground mt-2">正在加载里程碑...</p></div>
                ) : currentGoalMilestones.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium">里程碑</h3>
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        {currentGoalMilestones.map((milestone) => (
                          <div key={milestone.id} className="p-3 border rounded-md space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium flex items-center">{getMilestoneStatusIcon(milestone.status)} <span className="ml-2">{milestone.title}</span></h4>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMilestoneDialog(milestone, selectedGoal.id)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteMilestone(milestone.id, selectedGoal.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {milestone.description && <p className="text-sm text-muted-foreground pl-1">{milestone.description}</p>}
                            <div className="flex items-center justify-between text-xs text-muted-foreground pl-1">
                                <span>状态: {getMilestoneStatusText(milestone.status)}</span>
                                {milestone.targetDate && <span>目标: {format(new Date(milestone.targetDate), "yyyy-MM-dd")}</span>}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => {if (selectedGoal) openAddMilestoneDialog(selectedGoal.id)}} >
                          <Plus className="h-4 w-4 mr-2" /> 添加里程碑
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4 border rounded-md">
                    <p className="mb-2">此目标暂无里程碑。</p>
                    <Button variant="outline" size="sm" onClick={() => {if (selectedGoal) openAddMilestoneDialog(selectedGoal.id)}}>
                      <Plus className="h-4 w-4 mr-2" /> 添加第一个里程碑
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-lg font-medium">备注</h3>
                  <Textarea placeholder="添加关于此目标的备注..." className="min-h-[100px]" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">目标意义</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[40px]">
                    {selectedGoal.goalMeaning || "未填写"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {setIsDetailDialogOpen(false); setSelectedGoal(null);}}>关闭</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>编辑目标: {editingGoal?.name}</DialogTitle>
            <DialogDescription>更新您的目标详细信息。</DialogDescription>
          </DialogHeader>
          {editingGoal && (
            <GoalFormFields
              key={editingGoal.id}
              initialData={editFormInitialData}
              onSave={handleUpdateGoal}
              onCancel={() => setIsEditDialogOpen(false)}
              submitButtonText="保存更改"
              showCancelButton={true}
              formId={`edit-goal-${editingGoal.id}-view`}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isMilestoneDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetMilestoneForm(); setIsMilestoneDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingMilestone 
                ? `编辑里程碑: ${milestoneForm.title || ''}` 
                : (currentGoalIdForMilestone 
                    ? `为目标 "${goals.find(g => g.id === currentGoalIdForMilestone)?.name || '...'}" 添加里程碑` 
                    : "添加新里程碑")
              }
            </DialogTitle>
            <DialogDescription>
              {editingMilestone ? "更新里程碑的详细信息。" : "为当前目标创建一个新的里程碑。"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="milestone-title">标题 <span className="text-red-500">*</span></Label>
              <Input id="milestone-title" placeholder="输入里程碑标题" value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="milestone-description">描述</Label>
              <Textarea id="milestone-description" placeholder="输入里程碑描述（可选）" value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="milestone-status">状态 <span className="text-red-500">*</span></Label>
                    <select id="milestone-status" value={milestoneForm.status} onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value as DBMilestone['status'] })} className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">
                        <option value="pending">待处理</option>
                        <option value="inProgress">进行中</option>
                        <option value="completed">已完成</option>
                        <option value="blocked">已阻塞</option>
                    </select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="milestone-targetDate">目标日期</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !milestoneTargetDate && "text-muted-foreground")} >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {milestoneTargetDate ? format(milestoneTargetDate, "PPP") : <span>选择日期</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"> <CalendarComponent mode="single" selected={milestoneTargetDate} onSelect={setMilestoneTargetDate} initialFocus /> </PopoverContent>
                    </Popover>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsMilestoneDialogOpen(false); resetMilestoneForm(); }}>取消</Button>
            <Button onClick={handleSaveMilestone}>保存里程碑</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加确认删除目标对话框 */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="确认删除目标"
        description={`确定要删除目标"${goalTitleToDelete}"吗？相关的项目和任务不会被删除。`}
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={confirmDeleteGoal}
        variant="destructive"
      />

      {/* 添加确认删除里程碑对话框 */}
      <ConfirmDialog
        open={deleteMilestoneConfirmOpen}
        onOpenChange={setDeleteMilestoneConfirmOpen}
        title="确认删除里程碑"
        description={`确定要删除里程碑"${milestoneTitleToDelete}"吗？`}
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={confirmDeleteMilestone}
        variant="destructive"
      />

    </div>
  )
}
