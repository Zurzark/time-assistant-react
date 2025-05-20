"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ObjectStores, add, getAll, Project as DBProject, Task as DBTask, Goal as DBGoal, ActivityCategory, InboxItem } from "@/lib/db";
import { NO_PROJECT_VALUE, toDBTaskShape } from "@/lib/task-utils";
import { UIPriority, TaskCategory as UtilTaskCategory } from "../task/TaskFormFields";
import { TaskFormFields, TaskFormData } from "../task/TaskFormFields";
import { ProjectFormFields, ProjectFormData } from "../project/ProjectFormFields";
import { GoalFormFields, GoalFormData } from "../goal/GoalFormFields";
import { Task as TaskUtilsTask } from "@/lib/task-utils";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface UnifiedAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccessfulCreate?: () => void;
  editingTask?: TaskUtilsTask | null;
  clearEditingTask?: () => void;
}

export function UnifiedAddModal({ 
  open, 
  onOpenChange, 
  onSuccessfulCreate, 
  editingTask, 
  clearEditingTask 
}: UnifiedAddModalProps) {
  const [activeTab, setActiveTab] = useState("task");
  const [availableProjects, setAvailableProjects] = useState<DBProject[]>([]);
  const [availableGoals, setAvailableGoals] = useState<DBGoal[]>([]);
  const [availableActivityCategories, setAvailableActivityCategories] = useState<ActivityCategory[]>([]);
  
  const [taskFormKey, setTaskFormKey] = useState(() => `task-form-${Date.now()}`);
  const [ideaFormKey, setIdeaFormKey] = useState(() => `idea-form-${Date.now()}`);
  const [projectFormKey, setProjectFormKey] = useState(() => `project-form-${Date.now()}`);
  const [goalFormKey, setGoalFormKey] = useState(() => `goal-form-${Date.now()}`);

  // 收集箱条目表单状态
  const [ideaContent, setIdeaContent] = useState("");
  const [ideaNotes, setIdeaNotes] = useState("");
  const [ideaTags, setIdeaTags] = useState("");
  const [isSubmittingIdea, setIsSubmittingIdea] = useState(false);

  const resetTaskForm = useCallback(() => {
    setTaskFormKey(`task-form-${Date.now()}`);
  }, []);

  const resetIdeaForm = useCallback(() => {
    setIdeaFormKey(`idea-form-${Date.now()}`);
    setIdeaContent("");
    setIdeaNotes("");
    setIdeaTags("");
  }, []);

  const resetProjectForm = useCallback(() => {
    setProjectFormKey(`project-form-${Date.now()}`);
  }, []);

  const resetGoalForm = useCallback(() => {
    setGoalFormKey(`goal-form-${Date.now()}`);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [projects, goals, activityCategories] = await Promise.all([
          getAll<DBProject>(ObjectStores.PROJECTS),
          getAll<DBGoal>(ObjectStores.GOALS),
          getAll<ActivityCategory>(ObjectStores.ACTIVITY_CATEGORIES),
        ]);
        setAvailableProjects(projects);
        setAvailableGoals(goals);
        setAvailableActivityCategories(activityCategories);
      } catch (error) {
        console.error("Failed to fetch initial data for modal:", error);
        toast.error("加载初始数据失败。");
      }
    }
    if (open) {
      fetchData();
      if (editingTask) {
        setActiveTab("task");
        setTaskFormKey(`task-form-edit-${editingTask.id}-${Date.now()}`);
      } else {
        resetTaskForm();
      }
      resetIdeaForm();
      resetProjectForm();
      resetGoalForm();
    } else {
      clearEditingTask?.();
    }
  }, [open, editingTask, resetTaskForm, resetIdeaForm, resetProjectForm, resetGoalForm, clearEditingTask]);

  const handleCreateNewProjectForTaskForm = async (name: string): Promise<number | undefined> => {
    const now = new Date();
    const newProject: Omit<DBProject, 'id'> = {
      name,
      status: 'active',
      progress: 0,
      createdAt: now,
      updatedAt: now,
      totalTasks: 0,
      completedTasks: 0,
    };
    try {
      const id = await add(ObjectStores.PROJECTS, newProject);
      toast.success(`项目 "${name}" 已创建!`);
      const latestProjects = await getAll<DBProject>(ObjectStores.PROJECTS);
      setAvailableProjects(latestProjects);
      return id;
    } catch (error) {
      console.error("Failed to create project from task form:", error);
      toast.error("创建新项目失败。");
      return undefined;
    }
  };

  const handleSaveTask = async (taskData: TaskFormData) => {
    const now = new Date();

    if (editingTask && editingTask.id !== undefined) {
        const { get, update, ObjectStores } = await import('@/lib/db');
        try {
            const existingDBTask = await get<DBTask>(ObjectStores.TASKS, editingTask.id);
            if (!existingDBTask) {
                toast.error("无法找到要更新的原始任务。");
                return;
            }

            const taskDataForUtils: Partial<TaskUtilsTask> = {
                ...taskData,
                priority: taskData.priority,
                projectId: typeof taskData.projectId === 'string' && taskData.projectId === NO_PROJECT_VALUE 
                    ? undefined 
                    : (typeof taskData.projectId === 'string' ? parseInt(taskData.projectId) : taskData.projectId),
                category: taskData.category as UtilTaskCategory,
            };

            const updatedDBTaskFields = toDBTaskShape(taskDataForUtils); 

            const payloadForDB: DBTask = {
                ...existingDBTask, 
                ...updatedDBTaskFields, 
                title: taskData.title,
                description: taskData.description, 
                dueDate: taskData.dueDate,
                projectId: taskDataForUtils.projectId,
                tags: taskData.tags || [],
                isFrog: taskData.isFrog ? 1 : 0,
                estimatedDurationHours: taskData.estimatedDurationHours || 0,
                category: taskData.category,
                plannedDate: taskData.plannedDate,
                isRecurring: taskData.isRecurring ? 1 : 0,
                recurrenceRule: taskData.recurrenceRule,
                recurrenceEndDate: taskData.recurrenceEndDate,
                recurrenceCount: taskData.recurrenceCount,
                defaultActivityCategoryId: taskData.defaultActivityCategoryId,
                updatedAt: new Date(),
            };

            Object.keys(payloadForDB).forEach(keyStr => {
                const key = keyStr as keyof DBTask;
                if (payloadForDB[key] === undefined && 
                    !['description', 'dueDate', 'projectId', 'goalId', 'completedAt', 'actualPomodoros', 'subtasks', 'tags', 'reminderDate', 'recurrenceRule', 'plannedDate', 'order', 'deletedAt', 'category', 'estimatedDurationHours', 'recurrenceEndDate', 'recurrenceCount', 'defaultActivityCategoryId'].includes(key)
                ) {
                    delete payloadForDB[key];
                }
            });

            await update(ObjectStores.TASKS, payloadForDB);
            toast.success(`任务 "${taskData.title}" 已成功更新！`);
            onSuccessfulCreate?.();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update task:", error);
            toast.error("任务更新失败。");
        }
    } else {
        const newTaskDataForDb: Omit<DBTask, 'id'> = {
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          dueDate: taskData.dueDate,
          projectId: typeof taskData.projectId === 'string' && taskData.projectId === NO_PROJECT_VALUE 
            ? undefined 
            : (typeof taskData.projectId === 'string' ? parseInt(taskData.projectId) : taskData.projectId),
          tags: taskData.tags || [],
          isFrog: taskData.isFrog ? 1 : 0,
          estimatedDurationHours: taskData.estimatedDurationHours || 0,
          completed: 0,
          createdAt: now,
          updatedAt: now,
          isDeleted: 0,
          actualPomodoros: 0,
          subtasks: [],
          category: taskData.category,
          plannedDate: taskData.plannedDate,
          isRecurring: taskData.isRecurring ? 1 : 0,
          recurrenceRule: taskData.recurrenceRule,
          recurrenceEndDate: taskData.recurrenceEndDate,
          recurrenceCount: taskData.recurrenceCount,
          defaultActivityCategoryId: taskData.defaultActivityCategoryId,
          reminderDate: undefined,
          order: undefined,
          deletedAt: undefined,
          goalId: undefined,
          completedAt: undefined,
        };
        try {
          await add(ObjectStores.TASKS, newTaskDataForDb);
          toast.success("任务已成功创建！", { duration: 6000 });
          resetTaskForm();
          onSuccessfulCreate?.();
        } catch (error) {
          console.error("Failed to save task:", error);
          toast.error("任务创建失败。");
        }
    }
  };

  const handleSaveIdea = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!ideaContent.trim()) {
      toast.error("内容不能为空");
      return;
    }
    
    setIsSubmittingIdea(true);
    
    try {
      const newItem: Omit<InboxItem, "id"> = {
        content: ideaContent.trim(),
        notes: ideaNotes.trim() || undefined,
        tags: ideaTags.trim() ? ideaTags.split(",").map(tag => tag.trim()) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "unprocessed"
      };
      
      await add(ObjectStores.INBOX_ITEMS, newItem);
      
      toast.success("想法已成功添加到收集篮！", { duration: 6000 });
      resetIdeaForm();
      onSuccessfulCreate?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save idea:", error);
      toast.error("添加想法失败。");
    } finally {
      setIsSubmittingIdea(false);
    }
  };

  const handleSaveProject = async (projectData: ProjectFormData) => {
    const now = new Date();
    const newProject: Omit<DBProject, 'id'> = {
      name: projectData.name,
      description: projectData.description,
      dueDate: projectData.dueDate,
      goalId: projectData.goalId,
      status: "active",
      progress: 0,
      totalTasks: 0,
      completedTasks: 0,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await add(ObjectStores.PROJECTS, newProject);
      toast.success("项目已成功创建！", { duration: 6000 });
      resetProjectForm();
      const [projects, goals] = await Promise.all([
        getAll<DBProject>(ObjectStores.PROJECTS),
        getAll<DBGoal>(ObjectStores.GOALS),
      ]);
      setAvailableProjects(projects);
      setAvailableGoals(goals);
      onSuccessfulCreate?.();
    } catch (error) {
      console.error("Failed to save project:", error);
      toast.error("项目创建失败。");
    }
  };

  const handleSaveGoal = async (goalData: GoalFormData) => {
    const now = new Date();
    const newGoal: Omit<DBGoal, 'id'> = {
      name: goalData.name,
      description: goalData.description,
      goalMeaning: goalData.goalMeaning,
      targetDate: goalData.targetDate,
      status: "active",
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await add(ObjectStores.GOALS, newGoal);
      toast.success("目标已成功创建！", { duration: 6000 });
      resetGoalForm();
      const goals = await getAll<DBGoal>(ObjectStores.GOALS);
      setAvailableGoals(goals);
      onSuccessfulCreate?.();
    } catch (error) {
      console.error("Failed to save goal:", error);
      toast.error("目标创建失败。");
    }
  };

  const handleCancel = () => {
    if (activeTab === "task") resetTaskForm();
    if (activeTab === "idea") resetIdeaForm();
    if (activeTab === "project") resetProjectForm();
    if (activeTab === "goal") resetGoalForm();
    onOpenChange(false);
  };

  const handleModalOpenChange = (newOpenState: boolean) => {
    onOpenChange(newOpenState);
  };

  return (
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent className="sm:max-w-[650px] md:max-w-[700px] lg:max-w-[750px]">
        <DialogHeader>
          <DialogTitle>{editingTask ? "编辑任务" : "添加新内容"}</DialogTitle>
          <DialogDescription>
            {editingTask ? `正在编辑任务: ${editingTask.title}` : "快速添加新的任务、想法、项目或目标。"}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={editingTask ? "task" : activeTab} onValueChange={setActiveTab} className="w-full pt-2">
          <TabsList className={cn("grid w-full", editingTask ? "grid-cols-1" : "grid-cols-4")}>
            <TabsTrigger value="task">{editingTask ? "任务详情" : "任务"}</TabsTrigger>
            {!editingTask && <TabsTrigger value="idea">想法</TabsTrigger>}
            {!editingTask && <TabsTrigger value="project">项目</TabsTrigger>}
            {!editingTask && <TabsTrigger value="goal">目标</TabsTrigger>}
          </TabsList>
          <TabsContent value="task" className="mt-4">
            <TaskFormFields
              key={taskFormKey}
              initialData={editingTask ? {
                  ...editingTask, 
                  priority: editingTask.priority 
              } : undefined}
              availableProjects={availableProjects}
              availableActivityCategories={availableActivityCategories}
              onSave={handleSaveTask}
              onCancel={handleCancel}
              onCreateNewProjectInForm={handleCreateNewProjectForTaskForm}
              submitButtonText={editingTask ? "保存更改" : "创建任务"}
              showCancelButton={true}
            />
          </TabsContent>
          {!editingTask && (
            <>
              <TabsContent value="idea" className="mt-4">
                <form key={ideaFormKey} onSubmit={handleSaveIdea} className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="idea-content">内容 <span className="text-red-500">*</span></Label>
                    <Input
                      id="idea-content"
                      value={ideaContent}
                      onChange={(e) => setIdeaContent(e.target.value)}
                      placeholder="输入想法或待办事项..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idea-notes">备注（可选）</Label>
                    <Textarea
                      id="idea-notes"
                      value={ideaNotes}
                      onChange={(e) => setIdeaNotes(e.target.value)}
                      placeholder="添加更多详细信息..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idea-tags">标签（可选，用逗号分隔）</Label>
                    <Input
                      id="idea-tags"
                      value={ideaTags}
                      onChange={(e) => setIdeaTags(e.target.value)}
                      placeholder="例如：想法, 工作, 家庭..."
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-6">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      取消
                    </Button>
                    <Button type="submit" disabled={isSubmittingIdea || !ideaContent.trim()}>
                      {isSubmittingIdea ? "保存中..." : "保存到收集篮"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="project" className="mt-4">
                <ProjectFormFields
                  key={projectFormKey}
                  availableGoals={availableGoals}
                  onSave={handleSaveProject}
                  onCancel={handleCancel}
                  submitButtonText="创建项目"
                  showCancelButton={true}
                  formId="unified-add-project"
                />
              </TabsContent>
              <TabsContent value="goal" className="mt-4">
                <GoalFormFields
                  key={goalFormKey}
                  onSave={handleSaveGoal}
                  onCancel={handleCancel}
                  submitButtonText="创建目标"
                  showCancelButton={true}
                  formId="unified-add-goal"
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 