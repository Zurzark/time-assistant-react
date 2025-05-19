"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ObjectStores, add, getAll, Project as DBProject, Task as DBTask, Goal as DBGoal } from "@/lib/db";
import { NO_PROJECT_VALUE, TaskPriority, toDBTaskShape } from "@/lib/task-utils";
import { TaskCategory as UtilTaskCategory, UIPriority } from "../task/TaskFormFields";

import { TaskFormFields, TaskFormData } from "../task/TaskFormFields";
import { ProjectFormFields, ProjectFormData } from "../project/ProjectFormFields";
import { GoalFormFields, GoalFormData } from "../goal/GoalFormFields";

interface UnifiedAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccessfulCreate?: () => void;
}

export function UnifiedAddModal({ open, onOpenChange, onSuccessfulCreate }: UnifiedAddModalProps) {
  const [activeTab, setActiveTab] = useState("task");
  const [availableProjects, setAvailableProjects] = useState<DBProject[]>([]);
  const [availableGoals, setAvailableGoals] = useState<DBGoal[]>([]);
  
  const [taskFormKey, setTaskFormKey] = useState(() => `task-form-${Date.now()}`);
  const [projectFormKey, setProjectFormKey] = useState(() => `project-form-${Date.now()}`);
  const [goalFormKey, setGoalFormKey] = useState(() => `goal-form-${Date.now()}`);

  const resetTaskForm = useCallback(() => {
    setTaskFormKey(`task-form-${Date.now()}`);
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
        const [projects, goals] = await Promise.all([
          getAll<DBProject>(ObjectStores.PROJECTS),
          getAll<DBGoal>(ObjectStores.GOALS),
        ]);
        setAvailableProjects(projects);
        setAvailableGoals(goals);
      } catch (error) {
        console.error("Failed to fetch projects or goals for modal:", error);
        toast.error("加载初始数据失败。");
      }
    }
    if (open) {
      fetchData();
      resetTaskForm();
      resetProjectForm();
      resetGoalForm();
    }
  }, [open, resetTaskForm, resetProjectForm, resetGoalForm]);

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

    const mapUiPriorityToStoragePriority = (uiPriority: UIPriority): NonNullable<DBTask['priority']> => {
        switch (uiPriority) {
            case "importantUrgent": return "importantUrgent";
            case "importantNotUrgent": return "importantNotUrgent";
            case "notImportantUrgent": return "notImportantUrgent";
            case "notImportantNotUrgent": return "notImportantNotUrgent";
            default: return "notImportantNotUrgent";
        }
    };

    const newTaskDataForDb: Omit<DBTask, 'id'> = {
      title: taskData.title,
      description: taskData.description,
      priority: mapUiPriorityToStoragePriority(taskData.priority),
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
    if (activeTab === "project") resetProjectForm();
    if (activeTab === "goal") resetGoalForm();
  };

  const handleModalOpenChange = (newOpenState: boolean) => {
    onOpenChange(newOpenState);
  };

  return (
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent className="sm:max-w-[650px] md:max-w-[700px] lg:max-w-[750px]">
        <DialogHeader>
          <DialogTitle>添加新内容</DialogTitle>
          <DialogDescription>快速添加新的任务、项目或目标。</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="task">任务</TabsTrigger>
            <TabsTrigger value="project">项目</TabsTrigger>
            <TabsTrigger value="goal">目标</TabsTrigger>
          </TabsList>
          <TabsContent value="task" className="mt-4">
            <TaskFormFields
              key={taskFormKey}
              availableProjects={availableProjects}
              onSave={handleSaveTask}
              onCancel={handleCancel}
              onCreateNewProjectInForm={handleCreateNewProjectForTaskForm}
              submitButtonText="创建任务"
              showCancelButton={true}
            />
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 