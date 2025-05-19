"use client"

import { useState, useEffect, useCallback } from "react"
import { Frown, Loader2, MoreHorizontal, Timer, CalendarDays } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useTaskStats } from "../task/task-stats-updater" // 调整导入路径
import { FrogTaskModal } from "../task/frog-task-modal" // 调整导入路径
import { EditTaskDialog } from "../task/edit-task-dialog" // 新的导入
import { DeleteTaskConfirm } from "../task/delete-task-confirm" // 调整导入路径
// 注意: @/lib/db 的导入是动态的，将在组件内部处理
import { getAll as getAllDB, add as addDB, update as updateDB, ObjectStores as DBObjectStores, type TimeBlock as DBTimeBlock, type Task as DBTask, Project as DBProjectType, get as getDB } from "@/lib/db";
// 从 lib/utils.ts 导入共享函数
import { formatTimeForDisplay, checkTimeOverlap } from "@/lib/utils";
import { Task as TaskUtilsType, fromDBTaskShape, toDBTaskShape } from "@/lib/task-utils"; // 导入任务工具类型和函数
import { toast } from "sonner";

interface FrogTasksCardProps {
  onPomodoroClick: (taskId: number, taskTitle: string) => void;
  availableProjects?: DBProjectType[]; // Make availableProjects optional or provide a default
  onCreateNewProject?: (name: string) => Promise<number | undefined>; // Optional or provide a default
}

// Define a more complete Task type for the component's state, aligning with TaskUtilsType
interface UIFrogTask extends TaskUtilsType {
  // any specific fields for UI if needed, but TaskUtilsType should be comprehensive
}

export function FrogTasksCard({ 
  onPomodoroClick,
  availableProjects = [], // Default to empty array
  onCreateNewProject // Default to a function that does nothing or warns
}: FrogTasksCardProps) {
  const { updateTaskStats, addTasks: _addTasksToStats, removeTasks } = useTaskStats()

  // 状态管理
  const [tasks, setTasks] = useState<UIFrogTask[]>([])
  const [loading, setLoading] = useState(true)
  const [frogTaskModalOpen, setFrogTaskModalOpen] = useState(false)
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [currentTaskForEdit, setCurrentTaskForEdit] = useState<TaskUtilsType | null>(null); // New type for editing
  const [taskToDelete, setTaskToDelete] = useState<{ id: string | number; title: string } | null>(null);

  
  // 从 IndexedDB 加载青蛙任务
  const loadFrogTasks = useCallback(async () => {
    try {
      setLoading(true)
      
      const { getByIndex, ObjectStores } = await import('@/lib/db')
      // 1. 获取所有 isFrog = 1 且未被软删除的任务
      const allFrogTasksDB = await getByIndex<DBTask>(
        ObjectStores.TASKS,
        'byIsFrog',
        1 
      );
      const activeFrogTasksDB = allFrogTasksDB.filter((task: DBTask) => !task.isDeleted);

      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const filteredTasks = activeFrogTasksDB.filter((dbTask: DBTask) => {
        // 条件1: 今天完成的青蛙任务
        if (dbTask.completed && dbTask.completedAt) {
          const completedAtDate = new Date(dbTask.completedAt);
          if (completedAtDate >= startOfToday && completedAtDate <= endOfToday) {
            return true;
          }
        }
        // 条件2: 所有未完成的青蛙任务 (排除计划日期在未来的)
        if (!dbTask.completed) {
          if (dbTask.plannedDate) {
            const plannedDate = new Date(dbTask.plannedDate);
            // 如果计划日期在今天或今天之前，则包含
            if (plannedDate <= endOfToday) {
              return true;
            }
            return false; // 计划日期在未来，排除
          } else {
            // 如果没有计划日期，未完成的青蛙任务也应包含
            return true;
          }
        }
        return false; // 其他情况不符合
      });
      
      const mappedTasks = filteredTasks.map(task => fromDBTaskShape(task)); // Convert DBTask to TaskUtilsType
      
      setTasks(mappedTasks as UIFrogTask[]); // Cast to UIFrogTask (should be compatible)
      
    } catch (error) {
      console.error('加载青蛙任务时出错:', error)
      toast.error("加载青蛙任务失败。");
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 在组件挂载时加载青蛙任务
  useEffect(() => {
    loadFrogTasks()
  }, [loadFrogTasks])

  // 处理复选框点击 - 直接更新 IndexedDB
  const handleCheckboxChange = async (taskId: string | number) => {
    try {
      // 在本地状态中找到任务
      const task = tasks.find(t => t.id == taskId)
      if (!task) return
      
      const newCompleted = !task.completed
      
      // 先更新本地状态，使 UI 立即响应
      setTasks(prev => 
        prev.map(t => t.id == taskId 
          ? { ...t, completed: newCompleted } 
          : t
        )
      )
      
      // 更新任务统计和 IndexedDB
      updateTaskStats(taskId, newCompleted)
    } catch (error) {
      console.error('更新任务状态时出错:', error)
      // 出错时恢复本地状态
      setTasks(prev => [...prev]) // 简单的状态回滚
    }
  }

  // 处理编辑任务
  const handleEditTask = async (taskId: string | number) => {
    const taskToEdit = tasks.find(t => t.id === taskId);
    if (taskToEdit) {
      setCurrentTaskForEdit(taskToEdit);
      setEditTaskModalOpen(true);
    } else {
      // Fallback: if not in local state (should not happen if UI is synced),
      // try to fetch from DB directly. This is a safeguard.
      try {
        const taskFromDB = await getDB<DBTask>(DBObjectStores.TASKS, Number(taskId));
        if (taskFromDB && !taskFromDB.isDeleted && taskFromDB.isFrog) {
          setCurrentTaskForEdit(fromDBTaskShape(taskFromDB));
          setEditTaskModalOpen(true);
        } else {
          toast.error("无法找到要编辑的青蛙任务。");
        }
      } catch (err) {
        console.error("获取任务详情失败:", err);
        toast.error("获取任务详情失败。");
      }
    }
  }

  // 处理添加到时间轴
  const handleAddToTimeline = async (taskItem: { id: string | number; title: string; estimatedPomodoros?: number }) => {
    if (!taskItem.id) {
      alert("任务ID无效，无法添加到时间轴。");
      return;
    }
    try {
      const todayString = new Date().toISOString().split('T')[0];
      const todayDateObj = new Date(todayString + 'T00:00:00Z');

      const taskId = String(taskItem.id);
      const title = taskItem.title;
      const type = 'task';
      const date = todayString;

      let durationMinutes = 60; 
      if (taskItem.estimatedPomodoros && taskItem.estimatedPomodoros > 0) {
        durationMinutes = taskItem.estimatedPomodoros * 25; 
      }
      const durationMilliseconds = durationMinutes * 60 * 1000;

      const existingDbBlocks = await getAllDB<DBTimeBlock>(DBObjectStores.TIME_BLOCKS);
      const todayBlocks = existingDbBlocks
        .filter(block => block.date === todayString && block.id !== undefined)
        .map(block => ({
          ...block,
          startTime: new Date(block.startTime),
          endTime: new Date(block.endTime),
        }))
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      let proposedStartTime: Date | null = null;
      let proposedEndTime: Date | null = null;
      
      const now = new Date();
      const localTodayDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const earliestPossibleStart = new Date(localTodayDateObj);
      earliestPossibleStart.setHours(7, 0, 0, 0); 
      let searchStart = now > earliestPossibleStart ? new Date(now.getTime()) : new Date(earliestPossibleStart.getTime());
      
      const minutes = searchStart.getMinutes();
      const remainder = minutes % 5;
      if (remainder !== 0) {
        searchStart.setMinutes(minutes + (5 - remainder), 0, 0);
      }

      let slotFound = false;
      const MIN_GAP_MINUTES = 5; 
      const MAX_ITERATIONS = 100; 
      let iterations = 0;

      while(!slotFound && iterations < MAX_ITERATIONS) {
        iterations++;
        let currentProposedStart = new Date(searchStart);
        let currentProposedEnd = new Date(currentProposedStart.getTime() + durationMilliseconds);
        let overlap = false;
        for (const block of todayBlocks) {
          if (checkTimeOverlap(currentProposedStart, currentProposedEnd, block.startTime, block.endTime, MIN_GAP_MINUTES)) {
            overlap = true;
            searchStart = new Date(block.endTime.getTime() + MIN_GAP_MINUTES * 60 * 1000);
            const currentMinutesLoop = searchStart.getMinutes();
            const currentRemainderLoop = currentMinutesLoop % 5;
            if (currentRemainderLoop !== 0) {
              searchStart.setMinutes(currentMinutesLoop + (5 - currentRemainderLoop), 0, 0);
            }
            break;
          }
        }

        if (!overlap) {
          const endOfDayLimit = new Date(localTodayDateObj);
          endOfDayLimit.setHours(22, 0, 0, 0); 
          if (currentProposedEnd > endOfDayLimit) {
            alert(`未能为任务 "${title}" 找到今天 ${durationMinutes} 分钟的合适时段（已到${formatTimeForDisplay(endOfDayLimit)}）。请尝试缩短任务时长或手动在时间轴上安排。`);
            return;
          }
          proposedStartTime = currentProposedStart;
          proposedEndTime = currentProposedEnd;
          slotFound = true;
        }
      }
      
      if (!slotFound || !proposedStartTime || !proposedEndTime) { 
          alert(`无法为任务 "${title}" 自动找到 ${durationMinutes} 分钟的空闲时间段。请尝试手动安排或检查当天日程。`);
          return;
      }

      const newTimeBlock: Omit<DBTimeBlock, 'id'> = {
        taskId: taskId,
        title: title,
        sourceType: 'task_plan',
        startTime: proposedStartTime,
        endTime: proposedEndTime,
        isLogged: 0,
        date: proposedStartTime.toISOString().split('T')[0],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDB(DBObjectStores.TIME_BLOCKS, newTimeBlock);
      window.dispatchEvent(new CustomEvent('timelineShouldUpdate'));
      alert(`任务 "${title}" 已添加到今日时间轴 ${formatTimeForDisplay(proposedStartTime)} - ${formatTimeForDisplay(proposedEndTime)}。`);

    } catch (error) {
      console.error("添加到时间轴时出错:", error);
      let errorMessage = "添加到时间轴时发生未知错误。";
      if (error instanceof Error) {
        errorMessage = `添加到时间轴失败: ${error.message}`;
      }
      alert(errorMessage);
    }
  };

  // 处理删除任务
  const handleDeleteTask = (taskId: string | number, taskTitle: string) => {
    setTaskToDelete({ id: taskId, title: taskTitle });
    setDeleteConfirmOpen(true)
  }

  // 确认删除任务
  const confirmDeleteTask = async () => {
    if (taskToDelete) {
      try {
        const taskInDB = await getDB<DBTask>(DBObjectStores.TASKS, Number(taskToDelete.id));
        if (taskInDB) {
          taskInDB.isDeleted = 1;
          taskInDB.deletedAt = new Date();
          taskInDB.updatedAt = new Date();
          await updateDB(DBObjectStores.TASKS, taskInDB);
          toast.success(`任务 "${taskToDelete.title}" 已移至回收站。`);
          // Optimistically update UI or reload
          setTasks(prev => prev.filter(task => task.id !== taskToDelete.id));
          if (typeof removeTasks === 'function') { // Check if removeTasks from useTaskStats is available
             removeTasks([Number(taskToDelete.id)]); // Update global stats if applicable
          }
        } else {
          toast.error("无法在数据库中找到要删除的任务。");
        }
      } catch (err) {
        console.error("删除任务时出错:", err);
        toast.error("删除任务失败。");
      } finally {
        setDeleteConfirmOpen(false)
        setTaskToDelete(null)
      }
    }
  }

  // 保存编辑后的任务 - 更新到 IndexedDB
  const handleUpdateTaskInFrogCard = async (updatedTaskData: TaskUtilsType) => {
    if (!currentTaskForEdit || currentTaskForEdit.id === undefined) {
      toast.error("没有当前任务可供更新。");
      return;
    }
    try {
      const originalTaskInDB = await getDB<DBTask>(DBObjectStores.TASKS, currentTaskForEdit.id);
      if (!originalTaskInDB) {
        toast.error("在数据库中找不到原始任务。");
        return;
      }

      const payloadForDB: DBTask = {
        ...originalTaskInDB, // Start with existing DB data to preserve fields not in TaskUtilsType or form
        ...(toDBTaskShape(updatedTaskData)), // Apply general shape transformation from TaskUtilsType to DB shape
        // Ensure specific fields from form/updatedTaskData are preserved if toDBTaskShape doesn't cover all or maps differently
        title: updatedTaskData.title,
        description: updatedTaskData.description,
        priority: updatedTaskData.priority || originalTaskInDB.priority,
        dueDate: updatedTaskData.dueDate, // toDBTaskShape should handle Date to string/Date conversion if necessary for DB
        projectId: typeof updatedTaskData.projectId === 'string' ? parseInt(updatedTaskData.projectId) : updatedTaskData.projectId,
        tags: updatedTaskData.tags || [],
        isFrog: 1, // It's a frog card, so ensure isFrog is true
        updatedAt: new Date(),
        category: updatedTaskData.category,
        plannedDate: updatedTaskData.plannedDate,
        estimatedDurationHours: updatedTaskData.estimatedDurationHours,
        isRecurring: updatedTaskData.isRecurring ? 1 : 0, // Explicitly convert boolean to 0 | 1
        recurrenceRule: updatedTaskData.recurrenceRule,
        recurrenceEndDate: updatedTaskData.recurrenceEndDate,
        recurrenceCount: updatedTaskData.recurrenceCount,
        // Ensure `completed` status is correctly handled based on `updatedTaskData` or preserved if not editable in this form context
        completed: updatedTaskData.completed ? 1 : 0, 
        completedAt: updatedTaskData.completed ? (originalTaskInDB.completedAt || new Date()) : undefined,
      };
      
      // Remove undefined keys to avoid overwriting existing DB fields with undefined, except for those explicitly set to undefined (e.g. completedAt)
      Object.keys(payloadForDB).forEach(key => {
        const K = key as keyof DBTask;
        if (payloadForDB[K] === undefined && K !== 'completedAt' && K !== 'projectId' && K !== 'description' && K !== 'dueDate' && K !== 'goalId' && K !== 'reminderDate' && K !== 'recurrenceRule' && K !== 'recurrenceEndDate' && K !== 'recurrenceCount' && K !== 'plannedDate' && K !== 'order' && K !== 'deletedAt') {
          delete payloadForDB[K];
        }
      });

      await updateDB(DBObjectStores.TASKS, payloadForDB);
      toast.success(`青蛙任务 "${updatedTaskData.title}" 已更新。`);
      if (typeof updateTaskStats === 'function') {
         updateTaskStats(updatedTaskData.id, !!updatedTaskData.completed); // Update global stats
      }
      
    } catch (error) {
      console.error('保存编辑任务时出错:', error)
      toast.error("保存青蛙任务失败。");
    } finally {
      setEditTaskModalOpen(false)
      loadFrogTasks() // Reload tasks to reflect changes
    }
  }

  const defaultCreateNewProject = async (name: string): Promise<number | undefined> => {
    // This is a fallback. Ideally, this component receives this from a parent 
    // that has the full context for project creation (e.g., access to all projects for validation).
    console.warn("FrogTasksCard: onCreateNewProject prop was not provided. Using default (no-op or basic add).");
    try {
        const newProjectData: Omit<DBProjectType, 'id'> = {
            name: name.trim(),
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            progress: 0,
            description: "",
            totalTasks: 0,
            completedTasks: 0,
        };
        const newId = await addDB(DBObjectStores.PROJECTS, newProjectData as DBProjectType);
        // Note: This card might not have access to reload a global project list, 
        // so the new project might not immediately appear in a shared project dropdown 
        // unless a more global state management for projects is in place.
        toast.success(`项目 "${name}" 已在 FrogTasksCard 内创建 (ID: ${newId}).`);
        return newId;
    } catch (err) {
        console.error("Failed to create new project from FrogTasksCard default handler:", err);
        toast.error("在 FrogTasksCard 内创建新项目失败。");
        return undefined;
    }
  };

  // Make sure any internal calls to onPomodoroClick pass task.id as a number.
  // For instance, if there is a direct call in a loop or a handler:
  const handlePomodoroTrigger = (task: UIFrogTask) => {
    // task.id is already number due to UIFrogTask extending TaskUtilsType
    onPomodoroClick(task.id, task.title);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">今日青蛙任务</CardTitle>
        <CardDescription>最重要但可能最难开始的任务</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Frown className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">您还没有设置青蛙任务</p>
            <Button variant="link" size="sm" onClick={() => setFrogTaskModalOpen(true)}>
              立即添加
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className="flex items-center space-x-2 group transition-all duration-200"
              >
                <Checkbox 
                  id={`frog-${task.id}`} 
                  checked={task.completed}
                  onCheckedChange={() => handleCheckboxChange(task.id)}
                  className="transition-all duration-200"
                />
                <label
                  htmlFor={`frog-${task.id}`}
                  className={cn(
                    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer transition-all duration-200",
                    task.completed && "line-through text-muted-foreground",
                  )}
                >
                  🐸 {task.title}
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handlePomodoroTrigger(task)}
                >
                  <Timer className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditTask(task.id)}>
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddToTimeline(task)}>
                       <CalendarDays className="mr-2 h-4 w-4" /> 添加到时间轴
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-500"
                      onClick={() => handleDeleteTask(task.id, task.title)}
                    >
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="mt-auto">
        <Button variant="outline" className="w-full" onClick={() => setFrogTaskModalOpen(true)}>
          添加青蛙任务
        </Button>
      </CardFooter>

      {/* 弹窗：添加青蛙任务 */}
      <FrogTaskModal
        open={frogTaskModalOpen}
        onOpenChange={setFrogTaskModalOpen}
        onAddFrogTasks={(taskIds) => loadFrogTasks()}
      />

      {/* 弹窗：编辑任务 - 使用新的 EditTaskDialog */}
      {editTaskModalOpen && currentTaskForEdit && (
        <EditTaskDialog
          open={editTaskModalOpen}
          onOpenChange={setEditTaskModalOpen}
          task={currentTaskForEdit} 
          onSave={handleUpdateTaskInFrogCard}
          availableProjects={availableProjects} // Pass down available projects
          onCreateNewProject={onCreateNewProject || defaultCreateNewProject} // Pass down or use default
        />
      )}

      {/* 弹窗：删除任务确认 */}
      {taskToDelete && (
        <DeleteTaskConfirm
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          taskTitle={taskToDelete.title}
          onConfirm={confirmDeleteTask}
        />
      )}
    </Card>
  )
} 