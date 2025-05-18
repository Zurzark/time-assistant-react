"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Calendar,
  ChevronRight,
  Edit,
  MoreHorizontal,
  Plus,
  Target,
  Trash2,
  CheckCircle2,
  Pause,
  Play,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter, // Keep DialogFooter for simple dialogs like details, but ProjectFormFields will have its own.
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
// Label, Input, Textarea, Popover, CalendarComponent, Select will be handled by ProjectFormFields
import { format } from "date-fns"
import { cn } from "@/lib/utils"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // No longer directly needed here for project forms
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs" // Keep for project list filtering
import { Checkbox } from "@/components/ui/checkbox" // Keep for task list in details dialog
import { 
  add, 
  getAll, 
  update, 
  remove, 
  getByIndex,
  get,
  ObjectStores, 
  Project as DBProject,
  Task as DBTask,
  Goal as DBGoal
} from "@/lib/db"

// Import the new ProjectFormFields and its data type
import { ProjectFormFields, ProjectFormData, NO_GOAL_PROJECT_FORM_VALUE } from "@/components/project/ProjectFormFields";

interface ProjectViewItem extends Omit<DBProject, 'id' | 'createdAt' | 'updatedAt' | 'goalId' | 'dueDate'> {
  id: number;
  goalId?: number; // Keep as number for consistency in view model
  goalName?: string;
  createdAt: Date;
  updatedAt: Date;
  status: DBProject['status'];
  progress: number;
  totalTasks?: number;
  completedTasks?: number;
  dueDate?: Date; // Ensure this is Date
  description?: string;
  color?: string; // Add color field
}

interface TaskViewItem extends Omit<DBTask, 'id' | 'completed' | 'isFrog' | 'isDeleted' | 'projectId' | 'createdAt' | 'updatedAt' | 'dueDate'> {
  id: number;
  completed: boolean;
  projectId: number;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
}

// Define a specific type for task priorities used in the UI (if needed for task display in project details)
type UIPriority = "importantUrgent" | "importantNotUrgent" | "notImportantUrgent" | "notImportantNotUrgent";

export function ProjectsView() {
  const [projects, setProjects] = useState<ProjectViewItem[]>([])
  const [allGoals, setAllGoals] = useState<DBGoal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  // newProjectForm, setNewProjectForm, newProjectDueDate, setNewProjectDueDate are removed as ProjectFormFields handles its own state.

  const [selectedProject, setSelectedProject] = useState<ProjectViewItem | null>(null)
  const [detailTasks, setDetailTasks] = useState<TaskViewItem[]>([])
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isTasksLoading, setIsTasksLoading] = useState(false)

  const [newTaskTitle, setNewTaskTitle] = useState("") // For adding tasks within project detail view
  const [selectedTab, setSelectedTab] = useState("all")
  const [newTaskPriority, setNewTaskPriority] = useState<UIPriority>("importantNotUrgent") // For tasks in detail view

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectViewItem | null>(null)
  // editingProjectForm, setEditingProjectForm, editingProjectDueDate, setEditingProjectDueDate are removed.

  const mapDBProjectToView = (dbProject: DBProject, goals: DBGoal[]): ProjectViewItem => {
    const associatedGoal = goals.find(g => g.id === dbProject.goalId);

    let processedGoalId: number | undefined = undefined;
    if (typeof dbProject.goalId === 'number') {
      processedGoalId = dbProject.goalId;
    } else if (typeof dbProject.goalId === 'string') {
      // Attempt to parse if it's a string; if not a valid number, it remains undefined.
      const num = parseInt(dbProject.goalId, 10);
      if (!isNaN(num)) {
        processedGoalId = num;
      }
    }

    return {
      id: dbProject.id!,
      name: dbProject.name,
      description: dbProject.description,
      goalId: processedGoalId, // Use the processed goalId
      goalName: associatedGoal ? associatedGoal.name : "未关联目标",
      createdAt: new Date(dbProject.createdAt),
      updatedAt: new Date(dbProject.updatedAt),
      status: dbProject.status,
      progress: dbProject.progress || 0,
      totalTasks: dbProject.totalTasks || 0,
      completedTasks: dbProject.completedTasks || 0,
      dueDate: dbProject.dueDate ? new Date(dbProject.dueDate) : undefined,
      color: dbProject.color || undefined,
    };
  };

  const mapDBTaskToView = (dbTask: DBTask): TaskViewItem => {
    return {
      ...dbTask, // Spread other potential fields like title, description if they match
      id: dbTask.id!,
      completed: dbTask.completed === 1,
      projectId: dbTask.projectId! as number,
      priority: dbTask.priority as UIPriority, // Assuming priority is compatible
      createdAt: new Date(dbTask.createdAt),
      title: dbTask.title,
      description: dbTask.description,
      dueDate: dbTask.dueDate ? new Date(dbTask.dueDate) : undefined,
      updatedAt: new Date(dbTask.updatedAt)
    };
  };
  
  const fetchProjectsAndGoals = useCallback(async () => {
    setIsLoading(true)
    setDbError(null)
    try {
      const [dbProjects, dbGoals] = await Promise.all([
        getAll<DBProject>(ObjectStores.PROJECTS),
        getAll<DBGoal>(ObjectStores.GOALS)
      ])
      setAllGoals(dbGoals) // Goals are needed for the forms
      setProjects(dbProjects.map(p => mapDBProjectToView(p, dbGoals)))
    } catch (error) {
      console.error("Failed to fetch projects or goals:", error)
      setDbError("项目或目标数据加载失败，请稍后重试。")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjectsAndGoals()
  }, [fetchProjectsAndGoals])

  const fetchTasksForProject = useCallback(async (projectId: number) => {
    if (!projectId) return;
    setIsTasksLoading(true);
    try {
      const tasksFromDB = await getByIndex<DBTask>(ObjectStores.TASKS, 'byProjectId', projectId);
      setDetailTasks(tasksFromDB.map(mapDBTaskToView));
    } catch (error) {
      console.error(`Failed to fetch tasks for project ${projectId}:`, error);
    } finally {
      setIsTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProject && isDetailDialogOpen) {
      fetchTasksForProject(selectedProject.id);
    }
  }, [selectedProject, isDetailDialogOpen, fetchTasksForProject]);

  const calculateProjectProgress = (tasks: TaskViewItem[]): { progress: number; totalTasks: number; completedTasks: number } => {
    const totalTasks = tasks.length;
    if (totalTasks === 0) return { progress: 0, totalTasks: 0, completedTasks: 0 };
    const completedTasks = tasks.filter(task => task.completed).length;
    const progress = Math.round((completedTasks / totalTasks) * 100);
    return { progress, totalTasks, completedTasks };
  };

  const updateProjectProgressInDB = async (projectId: number, tasks?: TaskViewItem[]) => {
    let currentTasks = tasks;
    if (!currentTasks) {
        const tasksFromDB = await getByIndex<DBTask>(ObjectStores.TASKS, 'byProjectId', projectId);
        currentTasks = tasksFromDB.map(mapDBTaskToView);
    }
    
    const progressData = calculateProjectProgress(currentTasks);
    const projectFromState = projects.find(p => p.id === projectId);
    if (projectFromState) {
      const dbProjectToUpdate: DBProject = {
          id: projectFromState.id,
          name: projectFromState.name,
          description: projectFromState.description,
          goalId: projectFromState.goalId,
          status: projectFromState.status,
          dueDate: projectFromState.dueDate,
          createdAt: projectFromState.createdAt,
          updatedAt: new Date(),
          color: projectFromState.color, // Ensure color is preserved
          progress: progressData.progress,
          totalTasks: progressData.totalTasks,
          completedTasks: progressData.completedTasks,
      };
      
      await update(ObjectStores.PROJECTS, dbProjectToUpdate);
      setProjects(prevProjects => prevProjects.map(p => 
        p.id === projectId ? { ...p, ...progressData, updatedAt: dbProjectToUpdate.updatedAt! } : p
      ));
      return progressData;
    }
    return null;
  };

  const handleCreateProject = async (formData: ProjectFormData) => {
    const now = new Date();
    const projectToCreate: Omit<DBProject, 'id'> = {
      name: formData.name,
      description: formData.description || "",
      dueDate: formData.dueDate, // This is Date | undefined from ProjectFormData
      progress: 0,
      status: "active",
      goalId: formData.goalId, // This is number | undefined from ProjectFormData
      createdAt: now,
      updatedAt: now,
      totalTasks: 0,
      completedTasks: 0,
      // color: formData.color, // If color is added to ProjectFormData
    };
    try {
      await add(ObjectStores.PROJECTS, projectToCreate);
      setIsCreateDialogOpen(false); // Close dialog
      fetchProjectsAndGoals(); // Refresh list
    } catch (error) {
      console.error("Failed to create project:", error);
      setDbError("项目创建失败。请检查表单数据或稍后重试。"); // More specific error
    }
  };
  
  const openProjectDetails = (project: ProjectViewItem) => {
    setSelectedProject(project);
    setIsDetailDialogOpen(true);
  };

  const openEditDialog = (project: ProjectViewItem) => {
    setEditingProject(project); 
    // No need to set form state here, ProjectFormFields will use initialData
    setIsEditDialogOpen(true);
  };

  const handleEditProject = async (formData: ProjectFormData) => {
    if (!editingProject) return; // Should not happen if dialog is open with a project

    const now = new Date();
    const projectDataToUpdate: DBProject = {
      ...editingProject, // Spread existing fields like id, createdAt, status, progress etc.
      name: formData.name,
      description: formData.description || "",
      goalId: formData.goalId, // from ProjectFormData (number | undefined)
      dueDate: formData.dueDate, // from ProjectFormData (Date | undefined)
      updatedAt: now, 
      // color: formData.color // If color is part of ProjectFormData
    };

    try {
      await update(ObjectStores.PROJECTS, projectDataToUpdate);
      setIsEditDialogOpen(false); // Close dialog
      setEditingProject(null); // Clear editing project state
      fetchProjectsAndGoals(); // Refresh list
    } catch (error) {
      console.error("Failed to update project:", error);
      setDbError("项目更新失败。请检查表单数据或稍后重试。"); // More specific error
    }
  };

  const addTaskToProject = async () => {
    if (!selectedProject || !newTaskTitle.trim()) return;
    const now = new Date();
    const taskToAdd: Omit<DBTask, 'id'> = {
        title: newTaskTitle,
        description: "",
        priority: newTaskPriority,
        dueDate: undefined,
        completed: 0,
        createdAt: now,
        updatedAt: now,
        projectId: selectedProject.id,
        isFrog: 0,
        isDeleted: 0,
        isRecurring: 0,
        estimatedPomodoros: 0,
        actualPomodoros: 0,
        subtasks: [],
        tags: [],
    };
    try {
        await add(ObjectStores.TASKS, taskToAdd);
        setNewTaskTitle("");
        fetchTasksForProject(selectedProject.id);
        await updateProjectProgressInDB(selectedProject.id);
    } catch (error) {
        console.error("Failed to add task:", error);
        setDbError("任务添加失败。");
    }
  };

  const toggleTaskCompletion = async (taskId: number) => {
    const task = detailTasks.find(t => t.id === taskId);
    if (!task || !selectedProject) return;

    const dbTask = await get<DBTask>(ObjectStores.TASKS, taskId);
    if (!dbTask) return;

    const updatedTask: DBTask = {
        ...dbTask,
        completed: dbTask.completed === 1 ? 0 : 1,
        completedAt: dbTask.completed === 1 ? undefined : new Date(),
        updatedAt: new Date(),
    };
    try {
        await update(ObjectStores.TASKS, updatedTask);
        const updatedTasks = detailTasks.map(t => t.id === taskId ? { ...t, completed: updatedTask.completed === 1 } : t);
        setDetailTasks(updatedTasks);
        await updateProjectProgressInDB(selectedProject.id, updatedTasks);
    } catch (error) {
        console.error("Failed to toggle task completion:", error);
        setDbError("任务状态更新失败。");
    }
  };

  const deleteProject = async (id: number) => {
    if (!window.confirm("确定要删除此项目及其所有任务吗？")) return;
    try {
      const tasksToDelete = await getByIndex<DBTask>(ObjectStores.TASKS, 'byProjectId', id);
      for (const task of tasksToDelete) {
        if (task.id) await remove(ObjectStores.TASKS, task.id);
      }
      await remove(ObjectStores.PROJECTS, id);
      fetchProjectsAndGoals();
      if (selectedProject?.id === id) {
        setIsDetailDialogOpen(false);
        setSelectedProject(null);
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      setDbError("项目删除失败。");
    }
  };

  const updateProjectStatus = async (id: number, status: ProjectViewItem['status']) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const dbProject = await get<DBProject>(ObjectStores.PROJECTS, id);
    if(!dbProject) return;

    const projectToUpdate: DBProject = {
      ...dbProject,
      status: status,
      updatedAt: new Date(),
    };
    try {
      await update(ObjectStores.PROJECTS, projectToUpdate);
      fetchProjectsAndGoals();
    } catch (error) {
      console.error("Failed to update project status:", error);
      setDbError("项目状态更新失败。");
    }
  };

  const getStatusColor = (status: ProjectViewItem["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "completed":
        return "bg-blue-500"
      case "paused":
        return "bg-amber-500"
      case "archived":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: ProjectViewItem["status"]) => {
    switch (status) {
      case "active":
        return "进行中"
      case "completed":
        return "已完成"
      case "paused":
        return "已暂停"
      case "archived":
        return "已归档"
      default:
        return "未知"
    }
  }
  
  const filteredProjects = projects.filter((project) => {
    if (selectedTab === "all") return true
    return project && project.status === selectedTab;
  });

  // Prepare initial data for the edit form
  const editFormInitialData: Partial<ProjectFormData> | undefined = editingProject ? {
    name: editingProject.name,
    description: editingProject.description,
    dueDate: editingProject.dueDate,
    goalId: editingProject.goalId, // This is already number | undefined
    // color: editingProject.color, // if color is part of ProjectFormData
  } : undefined;


  if (isLoading) {
    return (
      <div className="container py-6 space-y-8 flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">正在加载项目...</p>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="container py-6 space-y-8 text-center">
        <p className="text-red-500 text-lg">{dbError}</p>
        <Button onClick={fetchProjectsAndGoals}>重试</Button>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">项目</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建项目
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>创建新项目</DialogTitle>
                <DialogDescription>添加一个新项目到您的项目列表中</DialogDescription>
              </DialogHeader>
              {/* Use ProjectFormFields for creating a new project */}
              <ProjectFormFields 
                key={`create-project-${isCreateDialogOpen}`} // Re-mount on open/close to ensure fresh state
                availableGoals={allGoals}
                onSave={handleCreateProject}
                onCancel={() => setIsCreateDialogOpen(false)}
                submitButtonText="创建项目"
                showCancelButton={true}
                formId="create-project-view" // Unique form ID
              />
              {/* DialogFooter is removed as ProjectFormFields has its own buttons */}
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-muted-foreground">管理和组织您的项目</p>
      </div>

      <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="active">进行中</TabsTrigger>
          <TabsTrigger value="completed">已完成</TabsTrigger>
          <TabsTrigger value="paused">已暂停</TabsTrigger>
          <TabsTrigger value="archived">已归档</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-0">
          {filteredProjects.length === 0 && selectedTab !== "all" && !isLoading && (
             <div className="text-center text-muted-foreground py-10">此分类下没有项目。</div>
          )}
          {filteredProjects.length === 0 && selectedTab === "all" && !isLoading && (
             <div className="text-center text-muted-foreground py-10">
                还没有任何项目。点击"创建项目"开始吧！
             </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openProjectDetails(project)}>
                          <ChevronRight className="h-4 w-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(project)}>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        {project.status !== "completed" && (
                          <DropdownMenuItem onClick={() => updateProjectStatus(project.id, "completed")}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            标记为已完成
                          </DropdownMenuItem>
                        )}
                        {project.status !== "paused" && project.status !== "completed" && (
                          <DropdownMenuItem onClick={() => updateProjectStatus(project.id, "paused")}>
                            <Pause className="h-4 w-4 mr-2" />
                            暂停项目
                          </DropdownMenuItem>
                        )}
                        {project.status === "paused" && (
                          <DropdownMenuItem onClick={() => updateProjectStatus(project.id, "active")}>
                            <Play className="h-4 w-4 mr-2" />
                            恢复项目
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => deleteProject(project.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {project.description && <CardDescription>{project.description}</CardDescription>}
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>进度</span>
                        <span className="font-medium">{project.progress || 0}%</span>
                      </div>
                      <Progress value={project.progress || 0} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="outline"
                          className={cn("flex items-center space-x-1 capitalize", {
                            "border-green-500 text-green-500": project.status === "active",
                            "border-blue-500 text-blue-500": project.status === "completed",
                            "border-amber-500 text-amber-500": project.status === "paused",
                            "border-gray-500 text-gray-500": project.status === "archived",
                          })}
                        >
                          <span className={cn("h-2 w-2 rounded-full", getStatusColor(project.status))}></span>
                          <span>{getStatusText(project.status)}</span>
                        </Badge>
                      </div>
                      {project.dueDate && (
                        <Badge variant="outline" className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(project.dueDate), "yyyy-MM-dd")}</span>
                        </Badge>
                      )}
                    </div>

                    {project.goalName && (
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">目标: {project.goalName}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">任务</h4>
                        <span className="text-xs text-muted-foreground">
                           {project.completedTasks || 0}/{project.totalTasks || 0}
                        </span>
                      </div>
                      {(project.totalTasks || 0) > 0 ? (
                         <div className="text-xs text-muted-foreground">
                            共 {project.totalTasks} 个任务, 已完成 {project.completedTasks} 个。
                         </div>
                       ) : (
                         <div className="text-xs text-muted-foreground">暂无任务</div>
                       )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => openProjectDetails(project)}>
                    查看详情
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Project Detail Dialog (remains largely unchanged) */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>{selectedProject.name}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                {selectedProject.description && (
                  <div>
                    <h3 className="text-lg font-medium">描述</h3>
                    <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-medium">进度</h3>
                  <Progress value={selectedProject.progress || 0} className="h-2" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">状态</h3>
                  <Badge
                    variant="outline"
                    className={cn("flex items-center space-x-1 capitalize", {
                      "border-green-500 text-green-500": selectedProject.status === "active",
                      "border-blue-500 text-blue-500": selectedProject.status === "completed",
                      "border-amber-500 text-amber-500": selectedProject.status === "paused",
                      "border-gray-500 text-gray-500": selectedProject.status === "archived",
                    })}
                  >
                    <span className={cn("h-2 w-2 rounded-full", getStatusColor(selectedProject.status))}></span>
                    <span>{getStatusText(selectedProject.status)}</span>
                  </Badge>
                </div>
                {selectedProject.dueDate && (
                  <div>
                    <h3 className="text-lg font-medium">截止日期</h3>
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(selectedProject.dueDate), "yyyy-MM-dd")}</span>
                    </Badge>
                  </div>
                )}
                {selectedProject.goalName && (
                  <div>
                    <h3 className="text-lg font-medium">目标</h3>
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{selectedProject.goalName}</span>
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-medium">任务</h3>
                  {isTasksLoading && <div className="flex items-center space-x-2"><Loader2 className="h-4 w-4 animate-spin" /><span>加载任务中...</span></div>}
                  {!isTasksLoading && detailTasks.length === 0 && <p className="text-sm text-muted-foreground">此项目下暂无任务。</p>}
                  <div className="space-y-2">
                    {detailTasks.map((task) => (
                      <div key={task.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`task-${task.id}`}
                          checked={task.completed}
                          onCheckedChange={() => toggleTaskCompletion(task.id)}
                        />
                        <label
                          htmlFor={`task-${task.id}`}
                          className={cn("text-sm flex-grow", task.completed && "line-through text-muted-foreground")}
                        >
                          {task.title}
                        </label>
                        <div
                            className={cn(
                                "h-2 w-2 rounded-full",
                                task.priority === "importantUrgent" 
                                ? "bg-red-500"
                                : task.priority === "importantNotUrgent"
                                    ? "bg-yellow-500" 
                                    : task.priority === "notImportantUrgent"
                                    ? "bg-blue-500"
                                    : "bg-green-500", 
                            )}
                            title={`优先级: ${task.priority}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                      <h4 className="text-md font-medium mb-2">添加新任务</h4>
                      <div className="flex items-center space-x-2">
                        {/* Removed direct Input for task here, as task creation would be complex for this refactor step*/}
                        {/* Consider a button to open EditTaskDialog or UnifiedAddModal for new tasks */}
                        <p className="text-sm text-muted-foreground">通过任务管理或今日概览添加任务。</p>
                      </div>
                    </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                    关闭
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>编辑项目: {editingProject?.name}</DialogTitle>
            <DialogDescription>更新您的项目详细信息。</DialogDescription>
          </DialogHeader>
          {editingProject && (
            <ProjectFormFields
              key={editingProject.id} // Key ensures form re-initializes when editingProject changes
              initialData={editFormInitialData} // Prepared initial data
              availableGoals={allGoals}
              onSave={handleEditProject}
              onCancel={() => setIsEditDialogOpen(false)}
              submitButtonText="保存更改"
              showCancelButton={true}
              formId={`edit-project-${editingProject.id}-view`} // Unique form ID
            />
          )}
          {/* DialogFooter is removed as ProjectFormFields has its own buttons */}
        </DialogContent>
      </Dialog>
    </div>
  )
} 