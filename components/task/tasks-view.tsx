"use client"

import { useState, useEffect, useCallback } from "react"
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckSquare,
  ChevronDown,
  Clock,
  Edit,
  Flag,
  LayoutGrid,
  LayoutList,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  Timer,
  Trash2,
  ArrowUpLeft,
  CalendarDays,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { PomodoroModal } from "@/components/pomodoro/pomodoro-modal"
import { ObjectStores, add, get, update, remove, getAll, getByIndex, Task as DBTaskType, Project as DBProjectType, Tag as DBTagType, TimeBlock as DBTimeBlockType } from "@/lib/db"
import { Loader2 } from "lucide-react"
import { EditTaskDialog } from "./edit-task-dialog"
import { TrashView } from "../views/trash-view"
import { ConfirmationDialog } from "../common/confirmation-dialog"
import { formatTimeForDisplay, checkTimeOverlap } from "@/lib/utils"
import {
  NO_PROJECT_VALUE,
  Task,
  priorityMapToDB, 
  priorityMapFromDB,
  toDBTaskShape,
  fromDBTaskShape
} from "@/lib/task-utils"
// import { TaskStatus, TaskPriority, TaskContext } from "@/types/task" // LINTER ERROR: Cannot find module '@/types/task' or its corresponding type declarations. Please verify the file exists and the path alias in tsconfig.json is correct.
// import { PomodoroTimer } from "./pomodoro-timer" // PomodoroTimer 来源不明确，暂时注释
import { TaskFormDialog } from "./task-form-dialog"

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projectList, setProjectList] = useState<DBProjectType[]>([])
  const [tagList, setTagList] = useState<DBTagType[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<number | null>(null);

  const [selectedView, setSelectedView] = useState("next-actions")
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<"today" | "this-week" | "next-7-days" | "no-date" | null>(null)
  const [sortBy, setSortBy] = useState("priority")
  const [viewMode, setViewMode] = useState("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: "",
    description: "",
    priority: "important-not-urgent",
    projectId: undefined,
    completed: false,
    isFrog: false,
    tags: [],
    dueDate: undefined,
  })
  const [date, setDate] = useState<Date>()
  const [pomodoroModalOpen, setPomodoroModalOpen] = useState(false)
  const [selectedTask, setSelectedTaskState] = useState<{ id: string; title: string } | null>(null)

  // State for trash view
  const [deletedTasks, setDeletedTasks] = useState<DBTaskType[]>([]) // Store raw DBTaskType for deletedAt
  const [loadingTrash, setLoadingTrash] = useState<boolean>(false);
  const [trashError, setTrashError] = useState<Error | null>(null);
  const [taskToPermanentlyDeleteId, setTaskToPermanentlyDeleteId] = useState<number | null>(null);
  const [isPermanentDeleteConfirmOpen, setIsPermanentDeleteConfirmOpen] = useState(false);

  // Moved useCallback definitions before useEffect that uses them
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dbTasks = await getByIndex<DBTaskType>(ObjectStores.TASKS, 'byIsDeleted', 0);
      const mappedTasks = dbTasks.map(fromDBTaskShape);
      setTasks(mappedTasks);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setError(err instanceof Error ? err : new Error('Failed to load tasks'));
      setTasks([]); 
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const dbProjects = await getAll<DBProjectType>(ObjectStores.PROJECTS);
      setProjectList(dbProjects);
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  }, []);

  const loadTags = useCallback(async () => {
    try {
      const dbTags = await getAll<DBTagType>(ObjectStores.TAGS);
      setTagList(dbTags);
    } catch (err) {
      console.error("Failed to load tags:", err);
    }
  }, []);

  const loadDeletedTasks = useCallback(async () => {
    setLoadingTrash(true);
    setTrashError(null);
    try {
      const dbDeletedTasks = await getByIndex<DBTaskType>(ObjectStores.TASKS, 'byIsDeleted', 1);
      // Sort by deletedAt descending, then by updatedAt or createdAt as fallback
      dbDeletedTasks.sort((a, b) => {
        const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime());
        const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(a.createdAt).getTime());
        return dateB - dateA;
      });
      setDeletedTasks(dbDeletedTasks);
    } catch (err) {
      console.error("Failed to load deleted tasks:", err);
      setTrashError(err instanceof Error ? err : new Error('加载已删除任务失败'));
    } finally {
      setLoadingTrash(false);
    }
  }, []);

  const getProjectNameById = useCallback((projectId: number | string | undefined): string => {
    if (projectId === undefined) return "";
    const project = projectList.find(p => p.id === projectId);
    return project ? project.name : String(projectId); 
  }, [projectList]);

  const handleCreateNewProject = useCallback(async (newProjectName: string): Promise<number | undefined> => {
    if (!newProjectName.trim()) {
      alert("项目名称不能为空。");
      return undefined;
    }
    const existingProject = projectList.find(p => p.name.toLowerCase() === newProjectName.trim().toLowerCase());
    if (existingProject) {
      alert(`项目 "${existingProject.name}" 已存在。将自动选择该项目。`);
      return existingProject.id;
    }

    try {
      const newProjectData: Omit<DBProjectType, 'id'> = {
        name: newProjectName.trim(),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: 0,
        description: "",
        totalTasks: 0,
        completedTasks: 0,
        // goalId, dueDate, color can be added later or set to defaults
      };
      const newId = await add(ObjectStores.PROJECTS, newProjectData as DBProjectType);
      await loadProjects(); // Refresh project list
      return newId;
    } catch (err) {
      console.error("Failed to create new project:", err);
      alert("创建新项目失败。");
      setError(err instanceof Error ? err : new Error('创建新项目失败'));
      return undefined;
    }
  }, [projectList, loadProjects]);

  const ensureTagsExist = useCallback(async (tagsToEnsure: string[]) => {
    if (!tagsToEnsure || tagsToEnsure.length === 0) return;

    const newTagsToCreate: DBTagType[] = [];
    // Create a temporary set of current tag names for quick lookup, case-insensitive
    const currentTagNamesLower = new Set(tagList.map(t => t.name.toLowerCase()));

    for (const tagName of tagsToEnsure) {
      const trimmedTagName = tagName.trim();
      if (trimmedTagName && !currentTagNamesLower.has(trimmedTagName.toLowerCase())) {
        // Avoid adding duplicates if they are typed again within the same input before saving
        // and not yet in newTagsToCreate
        if (!newTagsToCreate.find(nt => nt.name.toLowerCase() === trimmedTagName.toLowerCase())) {
          newTagsToCreate.push({
            name: trimmedTagName,
            createdAt: new Date(),
            // usageCount can be managed by a separate mechanism if needed
          });
        }
      }
    }

    if (newTagsToCreate.length > 0) {
      try {
        // console.log("Creating new tags:", newTagsToCreate);
        await Promise.all(newTagsToCreate.map(tag => add(ObjectStores.TAGS, tag)));
        await loadTags(); // Refresh tag list to include newly added tags
      } catch (err) {
        console.error("Failed to create new tags:", err);
        // Optionally notify user, but generally allow task operation to proceed
      }
    }
  }, [tagList, loadTags]);

  useEffect(() => {
    if (selectedView === 'trash') {
      loadDeletedTasks();
    } else {
      // When not in trash view, ensure main tasks and projects/tags are loaded.
      // This might be redundant if they are already loaded, but ensures consistency if view changes rapidly.
      loadTasks();
      loadProjects();
      loadTags();
    }
  }, [selectedView, loadTasks, loadProjects, loadTags, loadDeletedTasks]);

  // Derived state for project and tag names for UI (e.g., sidebar filters)
  const projectNamesForFilter = Array.from(new Set(projectList.map(p => p.name)));
  const tagNamesForFilter = Array.from(new Set(tagList.map(t => t.name)));

  const handlePomodoroClick = (taskId: number, taskTitle: string) => {
    setSelectedTaskState({ id: String(taskId), title: taskTitle });
    setPomodoroModalOpen(true);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Filter by view
    if (selectedView === "next-actions" && task.completed) return false
    if (selectedView === "completed" && !task.completed) return false
    if (selectedView === "someday-maybe" && task.priority !== "not-important-not-urgent") return false
    if (selectedView === "waiting" && task.priority !== "not-important-urgent") return false

    // Filter by project - Ensure consistent type for comparison (string)
    if (selectedProject && String(task.projectId) !== selectedProject) return false

    // Filter by tag
    if (selectedTag && (!task.tags || !task.tags.includes(selectedTag))) return false

    // Filter by date
    if (selectedDate === "today" && (!task.dueDate || task.dueDate.toDateString() !== new Date().toDateString()))
      return false
    if (
      selectedDate === "this-week" &&
      (!task.dueDate ||
        task.dueDate < new Date() ||
        task.dueDate > new Date(new Date().setDate(new Date().getDate() + 7)))
    )
      return false
    if (
      selectedDate === "next-7-days" &&
      (!task.dueDate ||
        task.dueDate < new Date() ||
        task.dueDate > new Date(new Date().setDate(new Date().getDate() + 7)))
    )
      return false
    if (selectedDate === "no-date" && task.dueDate) return false

    // Filter by search query
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (!task.description || !task.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
      return false

    return true
  })

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder = {
        "important-urgent": 0,
        "important-not-urgent": 1,
        "not-important-urgent": 2,
        "not-important-not-urgent": 3,
      }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    } else if (sortBy === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.getTime() - b.dueDate.getTime()
    } else if (sortBy === "alphabetical") {
      return a.title.localeCompare(b.title)
    } else if (sortBy === "createdAt-asc") {
      // Sort by creation date, oldest first. createdAt should always exist.
      return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
    } else if (sortBy === "createdAt-desc") {
      // Sort by creation date, newest first. createdAt should always exist.
      return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
    } else {
      return 0
    }
  })

  const toggleTaskCompletion = async (id: number) => {
    const currentTask = tasks.find(t => t.id === id);
    if (!currentTask) return;

    const newCompletedStatus = !currentTask.completed;
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === id ? { ...task, completed: newCompletedStatus } : task
      )
    );

    try {
      const taskInDB = await get<DBTaskType>(ObjectStores.TASKS, id);
      const updatedDbTask: DBTaskType = {
        ...taskInDB,
        completed: newCompletedStatus ? 1 : 0,
        completedAt: newCompletedStatus ? new Date() : undefined,
        updatedAt: new Date(),
      };
      await update(ObjectStores.TASKS, updatedDbTask);
    } catch (dbError) {
      console.error("Failed to update task completion in DB:", dbError);
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === id ? { ...task, completed: currentTask.completed } : task
        )
      );
      setError(dbError instanceof Error ? dbError : new Error('Failed to update task'));
    }
  };

  const toggleSubtaskCompletion = async (taskId: number, subtaskId: number) => {
    let originalTaskState: Task | undefined;
    let optimisticallyUpdatedSubtasksForDB: { title: string; completed: 0 | 1; }[] | undefined;

    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId && task.subtasks) {
          originalTaskState = JSON.parse(JSON.stringify(task)); 
          const newSubtasks = task.subtasks.map(subtask =>
            subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
          );
          optimisticallyUpdatedSubtasksForDB = newSubtasks.map(st => ({ title: st.title, completed: st.completed ? 1: 0}));
          return {
            ...task,
            subtasks: newSubtasks,
          };
        }
        return task;
      }),
    );

    try {
      if (optimisticallyUpdatedSubtasksForDB) {
        const taskInDB = await get<DBTaskType>(ObjectStores.TASKS, taskId);
        taskInDB.subtasks = optimisticallyUpdatedSubtasksForDB;
        taskInDB.updatedAt = new Date();
        await update(ObjectStores.TASKS, taskInDB);
      }
    } catch (dbError) {
      console.error("Failed to update subtask completion in DB:", dbError);
      if (originalTaskState) {
        setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? originalTaskState! : t));
      }
      setError(dbError instanceof Error ? dbError : new Error('Failed to update subtask'));
    }
  };

  const handleCreateTask = async () => {
    if (newTask.title?.trim()) {
      setLoading(true); 
      const processedTags = newTask.tags?.map(t => t.trim()).filter(t => t) || [];

      const dbTaskPayload: Omit<DBTaskType, 'id'> = {
        title: newTask.title!,
        description: newTask.description || undefined,
        priority: newTask.priority ? priorityMapToDB[newTask.priority] : 'notImportantNotUrgent',
        dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
        completed: 0, 
        completedAt: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: newTask.projectId || undefined,
        isFrog: (newTask.isFrog ?? false) ? 1 : 0, 
        subtasks: newTask.subtasks?.map(st => ({ title: st.title, completed: (st.completed ? 1 : 0) as (0|1) })) || [], 
        tags: processedTags, 
        isRecurring: 0, 
        isDeleted: 0, 
        deletedAt: undefined,
        goalId: undefined,
        estimatedPomodoros: newTask.estimatedPomodoros, // Ensure this is passed if present in newTask
        actualPomodoros: undefined,
        reminderDate: undefined,
        recurrenceRule: undefined,
        plannedDate: undefined,
        order: undefined,
      };

      try {
        // First, ensure tags exist or are created
        if (processedTags.length > 0) {
          await ensureTagsExist(processedTags);
        }
        
        const newId = await add(ObjectStores.TASKS, dbTaskPayload as DBTaskType);
        
        // Reload all tasks to reflect the new one.
        // loadProjects() and loadTags() should also be up-to-date if ensureTagsExist was called.
        await loadTasks(); 
        
      setNewTask({
        title: "",
        description: "",
        priority: "important-not-urgent",
          projectId: undefined,
        completed: false,
          isFrog: false,
          tags: [],
          dueDate: undefined,
          estimatedPomodoros: undefined, // Reset this field too
        });
        setIsCreateDialogOpen(false);
      } catch (err) {
        console.error("Failed to create task:", err);
        setError(err instanceof Error ? err : new Error('Failed to create task'));
      } finally {
        setLoading(false);
      }
    }
  };

  const openEditModal = (task: Task) => {
    setTaskToEdit(task);
    setIsEditModalOpen(true);
  };

  const handleUpdateTask = async (updatedTaskData: Task) => {
    if (!taskToEdit || taskToEdit.id === undefined) return;
    setLoading(true);
    try {
      const originalTaskInDB = await get<DBTaskType>(ObjectStores.TASKS, taskToEdit.id);
      const processedTags = updatedTaskData.tags?.map(t => t.trim()).filter(t => t) || [];
      
      // Ensure tags exist or are created before updating the task with them
      if (processedTags.length > 0) {
        await ensureTagsExist(processedTags);
      }

      const payloadForDB: DBTaskType = {
        ...originalTaskInDB,
        ...(toDBTaskShape(updatedTaskData)), // Apply general shape transformation
        title: updatedTaskData.title, // Ensure specific fields from form are preserved if toDBTaskShape doesn't cover all
        description: updatedTaskData.description, 
        priority: updatedTaskData.priority ? priorityMapToDB[updatedTaskData.priority] : originalTaskInDB.priority, 
        dueDate: updatedTaskData.dueDate ? new Date(updatedTaskData.dueDate) : undefined,
        projectId: updatedTaskData.projectId, 
        isFrog: updatedTaskData.isFrog ? 1 : 0,
        tags: processedTags, // Use the processed tags
        updatedAt: new Date(),
        estimatedPomodoros: updatedTaskData.estimatedPomodoros, // Ensure this is updated
      };
      
      // Remove undefined keys that might have been introduced by spreading updatedTaskData if it was partial
      Object.keys(payloadForDB).forEach(key => (payloadForDB as any)[key] === undefined && delete (payloadForDB as any)[key]);

      await update(ObjectStores.TASKS, payloadForDB);
      
      await loadTasks(); 
      
      setIsEditModalOpen(false);
      setTaskToEdit(null);
    } catch (err) {
      console.error("Failed to update task:", err);
      setError(err instanceof Error ? err : new Error('Failed to update task'));
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirmDialog = (id: number) => {
    setTaskToDeleteId(id);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleDeleteTask = async () => {
    if (taskToDeleteId === null) return;
    setLoading(true);
    try {
      const taskInDB = await get<DBTaskType>(ObjectStores.TASKS, taskToDeleteId);
      taskInDB.isDeleted = 1; // Set to 1 for true (soft delete)
      taskInDB.deletedAt = new Date();
      taskInDB.updatedAt = new Date();
      await update(ObjectStores.TASKS, taskInDB);
      
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskToDeleteId));
      setIsConfirmDeleteDialogOpen(false);
      setTaskToDeleteId(null);
    } catch (err) {
      console.error("Failed to delete task:", err);
      setError(err instanceof Error ? err : new Error('Failed to delete task'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFrogStatus = async (id: number) => {
    const currentTask = tasks.find(t => t.id === id);
    if (!currentTask) return;

    const newFrogStatus = !currentTask.isFrog;
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === id ? { ...task, isFrog: newFrogStatus } : task
      )
    );

    try {
      const taskInDB = await get<DBTaskType>(ObjectStores.TASKS, id);
      taskInDB.isFrog = newFrogStatus ? 1 : 0;
      taskInDB.updatedAt = new Date();
      await update(ObjectStores.TASKS, taskInDB);
    } catch (dbError) {
      console.error("Failed to update frog status in DB:", dbError);
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === id ? { ...task, isFrog: currentTask.isFrog } : task
        )
      );
      setError(dbError instanceof Error ? dbError : new Error('Failed to update frog status'));
    }
  };

  const handleRestoreTask = useCallback(async (taskId: number) => {
    setDeletedTasks(prev => prev.filter(task => task.id !== taskId)); // Optimistic update
    try {
      const taskToRestore = await get<DBTaskType>(ObjectStores.TASKS, taskId);
      if (taskToRestore) {
        taskToRestore.isDeleted = 0;
        taskToRestore.deletedAt = undefined;
        taskToRestore.updatedAt = new Date();
        await update(ObjectStores.TASKS, taskToRestore);
        // alert(`任务 "${taskToRestore.title}" 已恢复。`); // Optional: use a toast notification system
        // Consider how to refresh the main task list. For now, rely on next view switch or manual refresh.
        // If TaskStatsProvider is used globally and reacts to DB changes, it might handle it.
        // Or, we could call loadTasks() if we want an immediate refresh of the main list, 
        // but that might be too broad if the user stays in trash view.
      } else {
        throw new Error("未在数据库中找到要恢复的任务。");
      }
    } catch (err) {
      console.error("Failed to restore task:", err);
      alert("恢复任务失败。请重试。");
      // Revert optimistic update if needed by reloading deleted tasks
      loadDeletedTasks(); 
    }
  }, [loadDeletedTasks]);

  const openPermanentDeleteConfirm = (taskId: number) => {
    setTaskToPermanentlyDeleteId(taskId);
    setIsPermanentDeleteConfirmOpen(true);
  };

  const handlePermanentlyDeleteTask = useCallback(async () => {
    if (taskToPermanentlyDeleteId === null) return;

    const taskIdToDelete = taskToPermanentlyDeleteId;
    setDeletedTasks(prev => prev.filter(task => task.id !== taskIdToDelete)); // Optimistic update
    setIsPermanentDeleteConfirmOpen(false); // Close dialog immediately
    setTaskToPermanentlyDeleteId(null);

    try {
      await remove(ObjectStores.TASKS, taskIdToDelete);
      // alert("任务已永久删除。"); // Optional: use a toast notification system
    } catch (err) {
      console.error("Failed to permanently delete task:", err);
      alert("永久删除任务失败。请重试。");
      loadDeletedTasks(); // Revert optimistic update
    }
  }, [taskToPermanentlyDeleteId, loadDeletedTasks]);

  // 新增：处理添加到时间轴的函数
  const handleAddTaskToTimeline = async (taskItem: Task) => {
    if (taskItem.id === undefined) {
      alert("任务ID无效，无法添加到时间轴。");
      return;
    }
    // 检查任务是否已完成
    if (taskItem.completed) {
      alert(`任务 "${taskItem.title}" 已完成，无法直接添加到时间轴。如需安排，请先将其标记为未完成。`);
      return;
    }

    try {
      const todayString = new Date().toISOString().split('T')[0];
      const taskId = String(taskItem.id);
      const title = taskItem.title;
      const type = 'task';

      let durationMinutes = 60; // 默认时长
      // 假设 Task 类型有 estimatedPomodoros 字段
      if (taskItem.estimatedPomodoros && taskItem.estimatedPomodoros > 0) {
        durationMinutes = taskItem.estimatedPomodoros * 25; 
      }
      const durationMilliseconds = durationMinutes * 60 * 1000;

      const existingDbBlocks = await getAll<DBTimeBlockType>(ObjectStores.TIME_BLOCKS);
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
          // 使用导入的 checkTimeOverlap (替换本地的 doTaskTimeRangesOverlap)
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
           // 使用导入的 formatTimeForDisplay (替换本地的 formatDisplayTime)
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

      const newTimeBlock: Omit<DBTimeBlockType, 'id'> = {
        taskId: taskId,
        title: title,
        type: type,
        startTime: proposedStartTime,
        endTime: proposedEndTime,
        date: proposedStartTime.toISOString().split('T')[0],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await add(ObjectStores.TIME_BLOCKS, newTimeBlock);
      window.dispatchEvent(new CustomEvent('timelineShouldUpdate'));
      // 使用导入的 formatTimeForDisplay (替换本地的 formatDisplayTime)
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

  if (loading && tasks.length === 0) { // Show full page loader only on initial load
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">加载任务失败</h2>
        <p>{error.message}</p>
        <Button onClick={loadTasks} className="mt-4">重试</Button>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">任务</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建任务
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>创建新任务</DialogTitle>
                <DialogDescription>添加一个新任务到您的任务列表中</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">任务标题</Label>
                  <Input
                    id="title"
                    placeholder="输入任务标题"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    placeholder="输入任务描述（可选）"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="priority">优先级</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({ ...newTask, priority: value as Task["priority"] })}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="选择优先级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="important-urgent">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-sm bg-red-500 mr-2" />
                            重要且紧急
                          </div>
                        </SelectItem>
                        <SelectItem value="important-not-urgent">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-sm bg-amber-500 mr-2" />
                            重要不紧急
                          </div>
                        </SelectItem>
                        <SelectItem value="not-important-urgent">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-sm bg-blue-500 mr-2" />
                            不重要但紧急
                          </div>
                        </SelectItem>
                        <SelectItem value="not-important-not-urgent">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-sm bg-green-500 mr-2" />
                            不重要不紧急
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dueDate">截止日期</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !newTask.dueDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newTask.dueDate ? format(newTask.dueDate, "PPP") : <span>选择日期</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent mode="single" selected={newTask.dueDate} onSelect={(newDate) => setNewTask({...newTask, dueDate: newDate})} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="project">项目</Label>
                    <Select
                      value={newTask.projectId?.toString() || NO_PROJECT_VALUE}
                      onValueChange={async (value) => {
                        if (value === 'new-project-create') {
                          const newName = prompt("请输入新项目的名称:");
                          if (newName) {
                            const newProjectId = await handleCreateNewProject(newName);
                            if (newProjectId !== undefined) {
                              setNewTask({ ...newTask, projectId: newProjectId });
                            }
                          }
                        } else if (value === NO_PROJECT_VALUE) {
                          setNewTask({ ...newTask, projectId: undefined });
                        } else {
                          setNewTask({ ...newTask, projectId: value ? parseInt(value, 10) : undefined });
                        }
                      }}
                    >
                      <SelectTrigger id="project">
                        <SelectValue placeholder="选择项目（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_PROJECT_VALUE}>无项目</SelectItem>
                        {projectList.map((proj) => (
                          <SelectItem key={proj.id} value={String(proj.id)}>
                            {proj.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="new-project-create">+ 创建新项目</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags-input-create">标签 (逗号分隔)</Label>
                    <Input 
                      id="tags-input-create" 
                      placeholder="例如: 工作,个人"
                      value={newTask.tags?.join(", ") || ""}
                      onChange={(e) => setNewTask({ ...newTask, tags: e.target.value.split(",").map(tag => tag.trim()).filter(tag => tag) })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="estimatedPomodoros-create">预估番茄钟</Label>
                  <Input
                    id="estimatedPomodoros-create"
                    type="number"
                    placeholder="例如: 2"
                    value={newTask.estimatedPomodoros || ""}
                    onChange={(e) => setNewTask({ ...newTask, estimatedPomodoros: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                    min="0"
                  />
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox 
                    id="isFrog-create"
                    checked={newTask.isFrog}
                    onCheckedChange={(checked) => setNewTask({ ...newTask, isFrog: !!checked})} 
                  />
                  <Label htmlFor="isFrog-create" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    标记为青蛙任务
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateTask}>创建任务</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-muted-foreground">管理和组织您的所有任务</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left sidebar */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>视图</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-1">
                <Button
                  variant={selectedView === "next-actions" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedView("next-actions")}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  下一步行动
                </Button>
                <Button
                  variant={selectedView === "all" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedView("all")}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  所有任务
                </Button>
                <Button
                  variant={selectedView === "completed" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedView("completed")}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  已完成任务
                </Button>
                <Button
                  variant={selectedView === "someday-maybe" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedView("someday-maybe")}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  将来/也许
                </Button>
                <Button
                  variant={selectedView === "waiting" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedView("waiting")}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  等待中
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>按项目查看</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-1">
                {projectList.map((proj) => (
                  <Button
                    key={proj.id}
                    variant={selectedProject === String(proj.id) ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedProject(selectedProject === String(proj.id) ? null : String(proj.id))}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    {proj.name} 
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>按标签查看</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-1">
                {tagList.map((tag) => (
                  <Button
                    key={tag.name}
                    variant={selectedTag === tag.name ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    {tag.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>按日期筛选</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-1">
                <Button
                  variant={selectedDate === "today" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedDate(selectedDate === "today" ? null : "today")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  今日到期
                </Button>
                <Button
                  variant={selectedDate === "this-week" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedDate(selectedDate === "this-week" ? null : "this-week")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  本周到期
                </Button>
                <Button
                  variant={selectedDate === "next-7-days" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedDate(selectedDate === "next-7-days" ? null : "next-7-days")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  未来7天
                </Button>
                <Button
                  variant={selectedDate === "no-date" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedDate(selectedDate === "no-date" ? null : "no-date")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  无截止日期
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card> {/* This is the bottom-most card for the actual trash link */}
            <CardContent className="py-3">
              <Button 
                variant={selectedView === "trash" ? "secondary" : "ghost"} // Dynamically set variant
                className="w-full justify-start"
                onClick={() => setSelectedView("trash")} // Set onClick to change view
              >
                <Trash2 className="h-4 w-4 mr-2" />
                回收站
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CardTitle>
                    {selectedView === "next-actions"
                      ? "下一步行动"
                      : selectedView === "completed"
                        ? "已完成任务"
                        : selectedView === "someday-maybe"
                          ? "将来/也许"
                          : selectedView === "waiting"
                            ? "等待中"
                            : "所有任务"}
                  </CardTitle>
                  <Badge variant="outline">{selectedView === "trash" ? deletedTasks.length : sortedTasks.length}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="搜索任务..."
                      className="w-[200px] pl-8 rounded-md"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSortBy("priority")}>按优先级排序</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("dueDate")}>按截止日期排序</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("alphabetical")}>按字母顺序排序</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setSortBy("createdAt-desc")}>按创建时间 (新优先)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("createdAt-asc")}>按创建时间 (旧优先)</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      size="icon"
                      className="rounded-none rounded-l-md"
                      onClick={() => setViewMode("list")}
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button
                      variant={viewMode === "board" ? "secondary" : "ghost"}
                      size="icon"
                      className="rounded-none rounded-r-md"
                      onClick={() => setViewMode("board")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedView === "trash" ? (
                // Trash View UI - Replaced with TrashView component
                <TrashView 
                  deletedTasks={deletedTasks}
                  loadingTrash={loadingTrash}
                  trashError={trashError}
                  onRestoreTask={handleRestoreTask}
                  onPermanentlyDeleteTask={openPermanentDeleteConfirm} // Pass the function that opens the confirm dialog
                  onLoadRetry={loadDeletedTasks}
                  // priorityMapFromDB={priorityMapFromDB} // Pass if TrashView expects it explicitly
                />
              ) : viewMode === "list" ? (
                <div className="space-y-4">
                  {sortedTasks.length > 0 ? (
                    sortedTasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-start space-x-3 p-3 rounded-lg transition-colors",
                          task.completed ? "bg-muted/50" : "hover:bg-muted/30",
                        )}
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTaskCompletion(task.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <h3
                                  className={cn(
                                    "text-base font-medium",
                                    task.completed && "line-through text-muted-foreground",
                                  )}
                                >
                                  {task.isFrog && "🐸 "}
                                  {task.title}
                                </h3>
                              </div>
                              {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handlePomodoroClick(task.id, task.title)}
                              >
                                <Timer className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditModal(task)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    编辑
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleFrogStatus(task.id)}>
                                    <Flag className="h-4 w-4 mr-2" />
                                    {task.isFrog ? "取消标记为青蛙" : "标记为青蛙"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAddTaskToTimeline(task)} disabled={task.completed}>
                                    <CalendarDays className="h-4 w-4 mr-2" />
                                    添加到时间轴
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openDeleteConfirmDialog(task.id)} className="text-red-500 hover:!text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    删除
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div
                              className={cn(
                                "h-3 w-3 rounded-sm",
                                task.priority === "important-urgent"
                                  ? "bg-red-500"
                                  : task.priority === "important-not-urgent"
                                    ? "bg-amber-500"
                                    : task.priority === "not-important-urgent"
                                      ? "bg-blue-500"
                                      : "bg-green-500",
                              )}
                            />
                            <span className="text-xs text-muted-foreground">
                              {task.priority === "important-urgent" ? (
                                <span className="flex items-center">
                                  重要 <ArrowUp className="h-3 w-3 mx-1" /> 紧急 <ArrowUp className="h-3 w-3 mx-1" />
                                </span>
                              ) : task.priority === "important-not-urgent" ? (
                                <span className="flex items-center">
                                  重要 <ArrowUp className="h-3 w-3 mx-1" /> 紧急 <ArrowDown className="h-3 w-3 mx-1" />
                                </span>
                              ) : task.priority === "not-important-urgent" ? (
                                <span className="flex items-center">
                                  重要 <ArrowDown className="h-3 w-3 mx-1" /> 紧急 <ArrowUp className="h-3 w-3 mx-1" />
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  重要 <ArrowDown className="h-3 w-3 mx-1" /> 紧急{" "}
                                  <ArrowDown className="h-3 w-3 mx-1" />
                                </span>
                              )}
                            </span>

                            {task.dueDate && (
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {task.dueDate.toLocaleDateString()}
                              </Badge>
                            )}

                            {task.projectId && (
                              <Badge variant="outline" className="text-xs">
                                <Flag className="h-3 w-3 mr-1" />
                                {getProjectNameById(task.projectId)} 
                              </Badge>
                            )}

                            {task.tags &&
                              task.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                          </div>

                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="mt-3 pl-2 border-l-2 border-muted">
                              <div className="text-xs font-medium mb-1 flex items-center">
                                <ChevronDown className="h-3 w-3 mr-1" />
                                子任务 ({task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length})
                              </div>
                              <div className="space-y-1">
                                {task.subtasks.map((subtask) => (
                                  <div key={subtask.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`subtask-${subtask.id}`}
                                      checked={subtask.completed}
                                      onCheckedChange={() => toggleSubtaskCompletion(task.id, subtask.id)}
                                      className="h-3 w-3"
                                    />
                                    <label
                                      htmlFor={`subtask-${subtask.id}`}
                                      className={cn(
                                        "text-xs",
                                        subtask.completed && "line-through text-muted-foreground",
                                      )}
                                    >
                                      {subtask.title}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="rounded-full bg-primary/10 p-3 mb-4">
                        <CheckSquare className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">没有找到任务</h3>
                      <p className="text-muted-foreground mb-4 max-w-md">
                        {searchQuery
                          ? "没有找到匹配的任务，请尝试不同的搜索条件"
                          : "您当前没有任务，点击创建任务按钮添加新任务"}
                      </p>
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        创建任务
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                        重要且紧急
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sortedTasks
                        .filter((task) => task.priority === "important-urgent")
                        .map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "border rounded-lg p-3 bg-white dark:bg-gray-800 transition-colors",
                              task.completed ? "bg-muted/50" : "hover:bg-muted/30",
                            )}
                          >
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => toggleTaskCompletion(task.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h3
                                    className={cn(
                                      "text-sm font-medium",
                                      task.completed && "line-through text-muted-foreground",
                                    )}
                                  >
                                    {task.isFrog && "🐸 "}
                                    {task.title}
                                  </h3>
                                  <div className="flex items-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handlePomodoroClick(task.id, task.title)}
                                    >
                                      <Timer className="h-3 w-3" />
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEditModal(task)}>编辑</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleFrogStatus(task.id)}>{task.isFrog ? "取消标记为青蛙" : "标记为青蛙"}</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAddTaskToTimeline(task)} disabled={task.completed}>
                                          <CalendarDays className="h-4 w-4 mr-2" />
                                          添加到时间轴
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openDeleteConfirmDialog(task.id)} className="text-red-500 hover:!text-red-600">删除</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {task.dueDate && (
                                    <Badge variant="outline" className="text-xs">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {task.dueDate.toLocaleDateString()}
                                    </Badge>
                                  )}
                                  {task.projectId && (
                                    <Badge variant="outline" className="text-xs">
                                      {getProjectNameById(task.projectId)} 
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      {sortedTasks.filter((task) => task.priority === "important-urgent").length === 0 && (
                        <div className="text-center py-3 text-sm text-muted-foreground">没有重要且紧急的任务</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                        重要不紧急
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sortedTasks
                        .filter((task) => task.priority === "important-not-urgent")
                        .map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "border rounded-lg p-3 bg-white dark:bg-gray-800 transition-colors",
                              task.completed ? "bg-muted/50" : "hover:bg-muted/30",
                            )}
                          >
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => toggleTaskCompletion(task.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h3
                                    className={cn(
                                      "text-sm font-medium",
                                      task.completed && "line-through text-muted-foreground",
                                    )}
                                  >
                                    {task.isFrog && "🐸 "}
                                    {task.title}
                                  </h3>
                                  <div className="flex items-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handlePomodoroClick(task.id, task.title)}
                                    >
                                      <Timer className="h-3 w-3" />
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEditModal(task)}>编辑</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleFrogStatus(task.id)}>{task.isFrog ? "取消标记为青蛙" : "标记为青蛙"}</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAddTaskToTimeline(task)} disabled={task.completed}>
                                          <CalendarDays className="h-4 w-4 mr-2" />
                                          添加到时间轴
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openDeleteConfirmDialog(task.id)} className="text-red-500 hover:!text-red-600">删除</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {task.dueDate && (
                                    <Badge variant="outline" className="text-xs">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {task.dueDate.toLocaleDateString()}
                                    </Badge>
                                  )}
                                  {task.projectId && (
                                    <Badge variant="outline" className="text-xs">
                                      {getProjectNameById(task.projectId)} 
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      {sortedTasks.filter((task) => task.priority === "important-not-urgent").length === 0 && (
                        <div className="text-center py-3 text-sm text-muted-foreground">没有重要不紧急的任务</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-blue-500" />
                        不重要但紧急
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sortedTasks
                        .filter((task) => task.priority === "not-important-urgent")
                        .map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "border rounded-lg p-3 bg-white dark:bg-gray-800 transition-colors",
                              task.completed ? "bg-muted/50" : "hover:bg-muted/30",
                            )}
                          >
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => toggleTaskCompletion(task.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h3
                                    className={cn(
                                      "text-sm font-medium",
                                      task.completed && "line-through text-muted-foreground",
                                    )}
                                  >
                                    {task.isFrog && "🐸 "}
                                    {task.title}
                                  </h3>
                                  <div className="flex items-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handlePomodoroClick(task.id, task.title)}
                                    >
                                      <Timer className="h-3 w-3" />
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEditModal(task)}>编辑</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleFrogStatus(task.id)}>{task.isFrog ? "取消标记为青蛙" : "标记为青蛙"}</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAddTaskToTimeline(task)} disabled={task.completed}>
                                          <CalendarDays className="h-4 w-4 mr-2" />
                                          添加到时间轴
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openDeleteConfirmDialog(task.id)} className="text-red-500 hover:!text-red-600">删除</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {task.dueDate && (
                                    <Badge variant="outline" className="text-xs">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {task.dueDate.toLocaleDateString()}
                                    </Badge>
                                  )}
                                  {task.projectId && (
                                    <Badge variant="outline" className="text-xs">
                                      {getProjectNameById(task.projectId)} 
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      {sortedTasks.filter((task) => task.priority === "not-important-urgent").length === 0 && (
                        <div className="text-center py-3 text-sm text-muted-foreground">没有不重要但紧急的任务</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-green-500" />
                        不重要不紧急
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sortedTasks
                        .filter((task) => task.priority === "not-important-not-urgent")
                        .map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "border rounded-lg p-3 bg-white dark:bg-gray-800 transition-colors",
                              task.completed ? "bg-muted/50" : "hover:bg-muted/30",
                            )}
                          >
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => toggleTaskCompletion(task.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h3
                                    className={cn(
                                      "text-sm font-medium",
                                      task.completed && "line-through text-muted-foreground",
                                    )}
                                  >
                                    {task.isFrog && "🐸 "}
                                    {task.title}
                                  </h3>
                                  <div className="flex items-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handlePomodoroClick(task.id, task.title)}
                                    >
                                      <Timer className="h-3 w-3" />
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEditModal(task)}>编辑</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleFrogStatus(task.id)}>{task.isFrog ? "取消标记为青蛙" : "标记为青蛙"}</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAddTaskToTimeline(task)} disabled={task.completed}>
                                          <CalendarDays className="h-4 w-4 mr-2" />
                                          添加到时间轴
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openDeleteConfirmDialog(task.id)} className="text-red-500 hover:!text-red-600">删除</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {task.dueDate && (
                                    <Badge variant="outline" className="text-xs">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {task.dueDate.toLocaleDateString()}
                                    </Badge>
                                  )}
                                  {task.projectId && (
                                    <Badge variant="outline" className="text-xs">
                                      {getProjectNameById(task.projectId)} 
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      {sortedTasks.filter((task) => task.priority === "not-important-not-urgent").length === 0 && (
                        <div className="text-center py-3 text-sm text-muted-foreground">没有不重要不紧急的任务</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <div className="flex items-center justify-between w-full">
                <div className="text-sm text-muted-foreground">
                  {sortedTasks.filter((task) => task.completed).length} 已完成 / {sortedTasks.length} 总计
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加任务
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      <PomodoroModal
        open={pomodoroModalOpen}
        onOpenChange={setPomodoroModalOpen}
        initialTask={selectedTask}
      />

      {loading && <div className="fixed top-0 left-0 w-full h-full bg-black/20 flex items-center justify-center z-50"><Loader2 className="h-8 w-8 animate-spin text-white"/></div>}

      <EditTaskDialog 
        open={isEditModalOpen} 
        onOpenChange={setIsEditModalOpen} 
        task={taskToEdit} 
        onSave={handleUpdateTask} 
        availableProjects={projectList}
        onCreateNewProject={handleCreateNewProject}
      />

      <ConfirmationDialog
        open={isConfirmDeleteDialogOpen}
        onOpenChange={setIsConfirmDeleteDialogOpen}
        title="确认删除任务"
        description={`您确定要删除任务吗？此操作将会软删除任务，之后可以在回收站找到。`}
        onConfirm={handleDeleteTask}
      />

      {/* Confirmation Dialog for Permanent Delete from Trash */}
      <ConfirmationDialog
        open={isPermanentDeleteConfirmOpen}
        onOpenChange={setIsPermanentDeleteConfirmOpen}
        title="确认永久删除任务"
        description="您确定要永久删除此任务吗？此操作无法撤销。"
        onConfirm={handlePermanentlyDeleteTask} 
      />
    </div>
  )
}
