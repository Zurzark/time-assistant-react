// 此文件定义了任务管理视图组件 (TasksView)，
// 负责展示用户任务列表、提供多种筛选和排序功能、处理任务的创建、编辑、删除、完成等操作，
// 并集成了任务筛选侧边栏 (TaskFilterSidebar) 和批量操作栏 (BatchOperationsBar)。
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
  Check, // Added for batch actions and menu
  Undo, // Added for menu
  XCircle, // Added for cancel selection
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
  priorityMapFromDB,
  toDBTaskShape,
  fromDBTaskShape,
  TaskPriority, // TaskPriority is used here
} from "@/lib/task-utils"
import { TaskFormFields, TaskFormData, UIPriority } from "./TaskFormFields"
import { toast } from "sonner"
import { BatchOperationsBar } from "./batch-operations-bar"
import { TaskFilterSidebar, DateFilterType } from "./task-filter-sidebar" // DateFilterType is used here
import { DateRange } from "react-day-picker"

// Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Define task category constants
const TASK_CATEGORY_NEXT_ACTION = 'next_action';
const TASK_CATEGORY_SOMEDAY_MAYBE = 'someday_maybe';
const TASK_CATEGORY_WAITING_FOR = 'waiting_for';

// Helper to map UIPriority (from form) to DBTaskType['priority']
const mapUiPriorityToStoragePriority = (uiPriority: UIPriority): NonNullable<DBTaskType['priority']> => {
    switch (uiPriority) {
        case "importantUrgent": return "importantUrgent";
        case "importantNotUrgent": return "importantNotUrgent";
        case "notImportantUrgent": return "notImportantUrgent";
        case "notImportantNotUrgent": return "notImportantNotUrgent";
        default: return "notImportantNotUrgent"; // Fallback
    }
};

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

  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);


  const [selectedView, setSelectedView] = useState("next-actions")
  // REMOVED old single-select filter states:
  // const [selectedProject, setSelectedProject] = useState<string | null>(null)
  // const [selectedTag, setSelectedTag] = useState<string | null>(null)
  // const [selectedDate, setSelectedDate] = useState<"today" | "this-week" | "next-7-days" | "no-date" | null>(null)

  // NEW: States for advanced filtering
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [activeDateFilter, setActiveDateFilter] = useState<"today" | "this-week" | "next-7-days" | "this-month" | "no-date" | "custom" | null>(null); 
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined); 
  const [selectedPriorities, setSelectedPriorities] = useState<TaskPriority[]>([]);
  const [selectedDateFilterType, setSelectedDateFilterType] = useState<DateFilterType>('dueDate'); 

  const [sortBy, setSortBy] = useState("priority")
  const [viewMode, setViewMode] = useState("list")
  const [searchTermInput, setSearchTermInput] = useState(""); // For direct input binding
  const debouncedSearchTerm = useDebounce(searchTermInput, 300); // Debounced value
  // searchQuery will now be effectively replaced by debouncedSearchTerm in filters
  // but we need to ensure that dependent hooks use debouncedSearchTerm

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  // Removed newTask state as TaskFormFields handles its own internal state via key or initialData
  // const [newTask, setNewTask] = useState<Partial<Task>>({...})
  // const [date, setDate] = useState<Date>() // This was not used for create dialog, TaskFormFields handles date
  const [pomodoroModalOpen, setPomodoroModalOpen] = useState(false)
  const [selectedTask, setSelectedTaskState] = useState<{ id: string; title: string } | null>(null)

  // State for trash view
  const [deletedTasks, setDeletedTasks] = useState<DBTaskType[]>([])
  const [loadingTrash, setLoadingTrash] = useState<boolean>(false);
  const [trashError, setTrashError] = useState<Error | null>(null);
  const [taskToPermanentlyDeleteId, setTaskToPermanentlyDeleteId] = useState<number | null>(null);
  const [isPermanentDeleteConfirmOpen, setIsPermanentDeleteConfirmOpen] = useState(false);

  const [createTaskFormKey, setCreateTaskFormKey] = useState(() => `create-task-form-${Date.now()}`);

  const resetCreateTaskForm = useCallback(() => {
    setCreateTaskFormKey(`create-task-form-${Date.now()}`);
  }, []);

  const dispatchStatsUpdate = () => {
    window.dispatchEvent(new CustomEvent('taskDataChangedForStats'));
  };

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
    // Handle NO_PROJECT_VALUE explicitly if it's passed as a string
    if (projectId === NO_PROJECT_VALUE) {
      return "无项目";
    }
    const project = projectList.find(p => p.id === Number(projectId)); // Ensure projectId is number for lookup
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
      // Clear other filters when entering trash view as per requirement
      // This is slightly different from clearAllAdvancedFilters as it's specific to entering trash
      setSelectedProjectIds([]);
      setSelectedTagNames([]);
      setActiveDateFilter(null);
      setCustomDateRange(undefined);
      setSelectedPriorities([]);
      setSelectedDateFilterType('dueDate');
      setSearchTermInput(""); // Usually, search is also cleared for trash view
    } else {
      // Ensure main tasks are loaded when switching away from trash or on initial load
      loadTasks();
    }
    // Ensure projects and tags are available for the filter sidebar, load if not already loaded.
    // This might be called multiple times but guards prevent redundant fetches.
    if (projectList.length === 0 && selectedView !== 'trash') loadProjects();
    if (tagList.length === 0 && selectedView !== 'trash') loadTags();

  }, [selectedView, loadDeletedTasks, loadTasks, loadProjects, loadTags]); // projectList.length and tagList.length removed as deps to avoid loop if load functions don't set them sync.

  // Filter tasks - SIGNIFICANTLY REVISED
  const filteredTasks = useMemo(() => { 
    return tasks.filter((task) => {
      // 1. View-specific filters (selectedView)
      // This logic needs to be outside the main filter chain if selectedView is 'trash',
      // as 'trash' view uses a different data source (deletedTasks).
      // However, if we are not in 'trash' view, these filters apply:
    if (selectedView === "completed") {
      if (!task.completed) return false;
    } else if (selectedView === "next-actions") {
      if (task.completed || task.category !== TASK_CATEGORY_NEXT_ACTION) return false;
    } else if (selectedView === "someday-maybe") {
      if (task.completed || task.category !== TASK_CATEGORY_SOMEDAY_MAYBE) return false;
    } else if (selectedView === "waiting") {
      if (task.completed || task.category !== TASK_CATEGORY_WAITING_FOR) return false;
      }
      // "all" view passes this stage.

      // 2. Project filter (selectedProjectIds) - AND logic with OR inside for multiple selections
      if (selectedProjectIds.length > 0) {
        if (!task.projectId || !selectedProjectIds.includes(String(task.projectId))) {
          return false;
        }
      }

      // 3. Tag filter (selectedTagNames) - AND logic with OR inside for multiple selections
      if (selectedTagNames.length > 0) {
        if (!task.tags || task.tags.length === 0 || !task.tags.some(tag => selectedTagNames.includes(tag))) {
          return false;
        }
      }

      // 4. Date filter (activeDateFilter and customDateRange)
      if (activeDateFilter) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today for accurate comparisons

        let taskDateToCompare: Date | undefined | null = null;
        switch (selectedDateFilterType) {
          case 'dueDate':
            taskDateToCompare = task.dueDate;
            break;
          case 'plannedDate':
            taskDateToCompare = task.plannedDate;
            break;
          case 'createdAtDate':
            taskDateToCompare = task.createdAt; // Assuming createdAt is always a Date
            break;
          default:
            taskDateToCompare = task.dueDate; // Fallback or handle error
        }

        if (activeDateFilter === "today") {
          if (!taskDateToCompare || taskDateToCompare.toDateString() !== today.toDateString()) return false;
        } else if (activeDateFilter === "this-week") {
          const currentDay = today.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23,59,59,999);
          if (!taskDateToCompare || taskDateToCompare < startOfWeek || taskDateToCompare > endOfWeek) return false;
        } else if (activeDateFilter === "next-7-days") {
          const endOf7Days = new Date(today);
          endOf7Days.setDate(today.getDate() + 6); 
          endOf7Days.setHours(23,59,59,999);
          if (!taskDateToCompare || taskDateToCompare < today || taskDateToCompare > endOf7Days) return false;
        } else if (activeDateFilter === "this-month") {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          endOfMonth.setHours(23,59,59,999);
          if (!taskDateToCompare || taskDateToCompare < startOfMonth || taskDateToCompare > endOfMonth) return false;
        } else if (activeDateFilter === "no-date") {
          if (taskDateToCompare) return false;
        } else if (activeDateFilter === "custom" && customDateRange) {
          if (!taskDateToCompare) return false; 
          
          let passStartDate = true;
          if (customDateRange.from) { // Use .from
            const customStart = new Date(customDateRange.from);
            customStart.setHours(0,0,0,0); 
            if (taskDateToCompare < customStart) {
              passStartDate = false;
            }
          }
          if (!passStartDate) return false;

          let passEndDate = true;
          if (customDateRange.to) { // Use .to
            const customEnd = new Date(customDateRange.to);
            customEnd.setHours(23, 59, 59, 999); 
            if (taskDateToCompare > customEnd) {
              passEndDate = false;
            }
          }
          if (!passEndDate) return false;
        }
      }

      // 5. Priority filter (selectedPriorities) - AND logic with OR inside for multiple selections
      if (selectedPriorities.length > 0) {
        if (!task.priority || !selectedPriorities.includes(task.priority as TaskPriority)) {
          return false;
        }
      }

      // 6. Search query filter (searchQuery)
    if (
      debouncedSearchTerm && // Use debouncedSearchTerm
      !task.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) &&
      (!task.description || !task.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    )
        return false;

      return true;
    });
  }, [tasks, selectedView, selectedProjectIds, selectedTagNames, activeDateFilter, customDateRange, selectedPriorities, debouncedSearchTerm, selectedDateFilterType]);

  // New: Memoized calculation for tasks to be used for tag counting
  // This filters tasks based on all active filters EXCEPT tag filters themselves.
  const tasksForTagCount = useMemo(() => {
    return tasks.filter((task) => {
      // 1. View-specific filters (selectedView)
      if (selectedView === "completed") {
        if (!task.completed) return false;
      } else if (selectedView === "next-actions") {
        if (task.completed || task.category !== TASK_CATEGORY_NEXT_ACTION) return false;
      } else if (selectedView === "someday-maybe") {
        if (task.completed || task.category !== TASK_CATEGORY_SOMEDAY_MAYBE) return false;
      } else if (selectedView === "waiting") {
        if (task.completed || task.category !== TASK_CATEGORY_WAITING_FOR) return false;
      }
      // "all" view passes this stage.

      // 2. Project filter (selectedProjectIds)
      if (selectedProjectIds.length > 0) {
        if (!task.projectId || !selectedProjectIds.includes(String(task.projectId))) {
          return false;
        }
      }

      // 3. Tag filter - SKIPPED FOR THIS CALCULATION

      // 4. Date filter (activeDateFilter and customDateRange)
      if (activeDateFilter) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        let taskDateToCompare: Date | undefined | null = null;
        switch (selectedDateFilterType) {
          case 'dueDate': taskDateToCompare = task.dueDate; break;
          case 'plannedDate': taskDateToCompare = task.plannedDate; break;
          case 'createdAtDate': taskDateToCompare = task.createdAt; break;
          default: taskDateToCompare = task.dueDate; 
        }

        if (activeDateFilter === "today") {
          if (!taskDateToCompare || taskDateToCompare.toDateString() !== today.toDateString()) return false;
        } else if (activeDateFilter === "this-week") {
          const currentDay = today.getDay(); 
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23,59,59,999);
          if (!taskDateToCompare || taskDateToCompare < startOfWeek || taskDateToCompare > endOfWeek) return false;
        } else if (activeDateFilter === "next-7-days") {
          const endOf7Days = new Date(today);
          endOf7Days.setDate(today.getDate() + 6); 
          endOf7Days.setHours(23,59,59,999);
          if (!taskDateToCompare || taskDateToCompare < today || taskDateToCompare > endOf7Days) return false;
        } else if (activeDateFilter === "this-month") {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          endOfMonth.setHours(23,59,59,999);
          if (!taskDateToCompare || taskDateToCompare < startOfMonth || taskDateToCompare > endOfMonth) return false;
        } else if (activeDateFilter === "no-date") {
          if (taskDateToCompare) return false;
        } else if (activeDateFilter === "custom" && customDateRange) {
          if (!taskDateToCompare) return false; 
          let passStartDate = true;
          if (customDateRange.from) { 
            const customStart = new Date(customDateRange.from);
            customStart.setHours(0,0,0,0); 
            if (taskDateToCompare < customStart) passStartDate = false;
          }
          if (!passStartDate) return false;
          let passEndDate = true;
          if (customDateRange.to) { 
            const customEnd = new Date(customDateRange.to);
            customEnd.setHours(23, 59, 59, 999); 
            if (taskDateToCompare > customEnd) passEndDate = false;
          }
          if (!passEndDate) return false;
        }
      }

      // 5. Priority filter (selectedPriorities)
      if (selectedPriorities.length > 0) {
        if (!task.priority || !selectedPriorities.includes(task.priority as TaskPriority)) {
          return false;
        }
      }

      // 6. Search query filter (searchQuery)
      if (debouncedSearchTerm && // Use debouncedSearchTerm
          !task.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) &&
          (!task.description || !task.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())))
      {
        return false;
      }
      return true;
    });
  }, [tasks, selectedView, selectedProjectIds, activeDateFilter, customDateRange, selectedPriorities, debouncedSearchTerm, selectedDateFilterType]);

  // New: Memoized calculation for tag counts based on tasksForTagCount
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tagList.forEach(tag => {
      counts[tag.name] = 0; // Initialize all tags from global list with 0
    });
    tasksForTagCount.forEach(task => {
      if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tagName => {
          if (counts[tagName] !== undefined) {
            counts[tagName]++;
          }
          // If a task has a tag not in the global tagList (e.g., due to data inconsistency),
          // it won't be counted here towards a pre-defined tag slot.
          // Optionally, could add it to counts if desired: else { counts[tagName] = 1; }
        });
      }
    });
    return counts;
  }, [tasksForTagCount, tagList]);

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

  const handleCreateTask = async (formData: TaskFormData) => {
    setLoading(true);
    const now = new Date();
    try {
      // Ensure tags exist or are created
      if (formData.tags && formData.tags.length > 0) {
        await ensureTagsExist(formData.tags);
      }

      const dbTaskPayload: Omit<DBTaskType, 'id'> = {
        title: formData.title,
        description: formData.description,
        priority: mapUiPriorityToStoragePriority(formData.priority),
        dueDate: formData.dueDate,
        completed: 0,
        createdAt: now,
        updatedAt: now,
        projectId: typeof formData.projectId === 'string' && formData.projectId === NO_PROJECT_VALUE
          ? undefined
          : (typeof formData.projectId === 'string' ? parseInt(formData.projectId) : formData.projectId),
        tags: formData.tags || [],
        isFrog: formData.isFrog ? 1 : 0,
        estimatedDurationHours: formData.estimatedDurationHours || 0,
        isDeleted: 0,
        subtasks: [], // TaskFormFields doesn't handle subtasks yet, defaulting to empty
        category: formData.category,
        plannedDate: formData.plannedDate,
        isRecurring: formData.isRecurring ? 1 : 0,
        recurrenceRule: formData.recurrenceRule,
        recurrenceEndDate: formData.recurrenceEndDate,
        recurrenceCount: formData.recurrenceCount,
        // Fields not in TaskFormData but in DBTaskType, set to default/undefined
        completedAt: undefined,
        deletedAt: undefined,
        goalId: undefined,
        actualPomodoros: undefined, // TaskFormFields doesn't directly set this; could be estimatedPomodoros if design changes
        reminderDate: undefined,
        order: undefined,
        // estimatedPomodoros is on TaskFormData (as estimatedDurationHours), not directly on DBTaskType like this
        // actualPomodoros should be tracked separately post-creation.
      };

      await add(ObjectStores.TASKS, dbTaskPayload as DBTaskType);
      toast.success("任务已成功创建！");
      await loadTasks();
      
      resetCreateTaskForm(); // Reset form by changing key
      setIsCreateDialogOpen(false);
    } catch (err) {
      console.error("Failed to create task:", err);
      toast.error("任务创建失败。");
      setError(err instanceof Error ? err : new Error('Failed to create task'));
    } finally {
      setLoading(false);
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
      // const processedTags = updatedTaskData.tags?.map(t => t.trim()).filter(t => t) || []; // ensureTagsExist now handles raw tags
      
      // Ensure tags exist or are created before updating the task with them
      if (updatedTaskData.tags && updatedTaskData.tags.length > 0) {
        await ensureTagsExist(updatedTaskData.tags);
      }

      const payloadForDB: DBTaskType = {
        ...originalTaskInDB, // Start with existing DB data
        ...(toDBTaskShape(updatedTaskData)), // Apply general shape transformation from Task (utils type) to DB shape
        // Explicitly override fields from updatedTaskData (which is Task utils type) after toDBTaskShape
        // because toDBTaskShape might not map everything or map differently than direct fields
        title: updatedTaskData.title,
        description: updatedTaskData.description,
        // priority in updatedTaskData is TaskPriority (kebab-case), needs to map to UIPriority for mapUiPriorityToStoragePriority if used
        // However, EditTaskDialog already maps TaskUtilsType.priority (kebab-case) to UIPriority for TaskFormFields,
        // and then handleUpdateTask in EditTaskDialog maps UIPriority back to TaskUtilsPriority (kebab-case).
        // So, `updatedTaskData.priority` here is `TaskPriority` (kebab-case).
        // We need to use a map that takes TaskPriority (kebab-case) to storage priority (camelCase for DB)
        // Or, ensure `toDBTaskShape` handles this correctly.
        // For now, let's assume `toDBTaskShape` handles `priority` mapping from `Task` type.
        // If `toDBTaskShape` outputs `priority` in `UIPriority` format, then `mapUiPriorityToStoragePriority` would be needed.
        // Let's assume `toDBTaskShape` correctly converts `priority` to the DB's expected format.
        // The current `toDBTaskShape` maps `Task['priority']` (TaskPriority) to `DBTaskType['priority']` (string, but should be the camelCase)
        
        // Re-evaluating: handleUpdateTask in THIS file receives `updatedTaskData: Task` (from task-utils).
        // `toDBTaskShape` is designed to convert `Task` (task-utils) to `Partial<DBTaskType>`.
        // `priorityMapToDB` in task-utils converts `TaskPriority` (kebab-case) to the DB string (camelCase).
        // So `toDBTaskShape` should use `priorityMapToDB`.
        // Let's verify `toDBTaskShape`'s priority handling.
        // Ok, `toDBTaskShape` calls `priorityMapToDB`. So `payloadForDB.priority` will be correct.

        dueDate: updatedTaskData.dueDate ? new Date(updatedTaskData.dueDate) : undefined,
        projectId: updatedTaskData.projectId,
        isFrog: updatedTaskData.isFrog ? 1 : 0,
        tags: updatedTaskData.tags || [], // Use tags from updatedTaskData (already processed if ensureTagsExist was called with them)
        updatedAt: new Date(),
        // estimatedPomodoros: updatedTaskData.estimatedPomodoros, // This is not on Task type from task-utils directly.
                                                                // It comes from TaskFormData and is mapped to estimatedDurationHours.
                                                                // toDBTaskShape should handle estimatedDurationHours from Task type.
        category: updatedTaskData.category, // from Task type
        plannedDate: updatedTaskData.plannedDate, // from Task type
        isRecurring: updatedTaskData.isRecurring ? 1 : 0, // from Task type
        recurrenceRule: updatedTaskData.recurrenceRule, // from Task type
        recurrenceEndDate: updatedTaskData.recurrenceEndDate, // from Task type
        recurrenceCount: updatedTaskData.recurrenceCount, // from Task type

      };
      
      // Remove undefined keys to prevent overwriting existing DB fields with undefined
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

      let durationMinutes = 60; // 默认时长 (60分钟)

      // Use estimatedDurationHours from taskItem (Task type from task-utils)
      // taskItem.estimatedDurationHours is in hours (e.g., 0.5, 1, 1.5)
      if (taskItem.estimatedDurationHours && taskItem.estimatedDurationHours > 0) {
        durationMinutes = taskItem.estimatedDurationHours * 60; // Convert hours to minutes
      }
      // No fallback to estimatedPomodoros as it's not on the Task type.

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

  // 以下是处理选择任务的专用函数
  const handleTaskSelection = (taskId: number, isSelected: boolean) => {
    setSelectedTaskIds(prevSelectedIds =>
      isSelected
        ? [...prevSelectedIds, taskId]
        : prevSelectedIds.filter(id => id !== taskId)
    );
  };

  // 批量操作功能已移至 BatchOperationsBar 组件

  // Header Checkbox Logic
  const areAllVisibleTasksSelected = useMemo(() => 
    sortedTasks.length > 0 && selectedTaskIds.length === sortedTasks.length,
    [sortedTasks, selectedTaskIds]
  );
  
  const areSomeTasksSelected = useMemo(() =>
    selectedTaskIds.length > 0 && selectedTaskIds.length < sortedTasks.length,
    [sortedTasks, selectedTaskIds]
  );

  const headerCheckboxState = useMemo(() => {
    if (sortedTasks.length === 0) return false; // No tasks, so nothing to select
    return areAllVisibleTasksSelected ? true : (areSomeTasksSelected ? 'indeterminate' : false);
  }, [areAllVisibleTasksSelected, areSomeTasksSelected, sortedTasks.length]);

  const handleToggleSelectAll = () => {
    if (areAllVisibleTasksSelected) {
      setSelectedTaskIds([]);
    } else {
      // Selects all tasks currently visible in sortedTasks
      setSelectedTaskIds(sortedTasks.map(t => t.id));
    }
  };

  // NEW: Function to clear all advanced filters (excluding view and search query)
  const clearAllAdvancedFilters = useCallback(() => {
    setSelectedProjectIds([]);
    setSelectedTagNames([]);
    setActiveDateFilter(null);
    setCustomDateRange(undefined); // Ensure customDateRange is also reset
    setSelectedPriorities([]);
    setSelectedDateFilterType('dueDate'); // Reset date filter type to default
    // Optionally, reset selectedView to a default, e.g., "next-actions", if desired,
    // or leave it as is, allowing users to clear filters for the current view.
    // setSelectedView("next-actions"); 
    // setSearchQuery(""); // Also optionally reset search
  }, []);

  // Restore handlePomodoroClick
  const handlePomodoroClick = (taskId: number, taskTitle: string) => {
    setSelectedTaskState({ id: String(taskId), title: taskTitle });
    setPomodoroModalOpen(true);
  };

  // Helper function to get translated view name (can be expanded)
  const getTranslatedViewName = (view: string): string => {
    switch (view) {
      case "next-actions":
        return "下一步行动";
      case "someday-maybe":
        return "将来/也许";
      case "waiting-for":
        return "等待中";
      case "calendar":
        return "日历视图";
      case "project":
        return "按项目查看"; // This case might be obsolete if projects are handled by advanced filters
      case "tag":
        return "按标签查看"; // This case might be obsolete if tags are handled by advanced filters
      case "trash":
        return "回收站";
      default:
        return view;
    }
  };

  const getTranslatedDateFilterName = (filter: string | null): string => {
    if (!filter) return "";
    switch (filter) {
      case "today": return "今天";
      case "this-week": return "本周";
      case "next-7-days": return "未来7天";
      case "this-month": return "本月";
      case "no-date": return "无日期";
      default: return "";
    }
  }

  const getTranslatedDateFilterType = (type: DateFilterType): string => {
    switch (type) {
      case 'dueDate': return '截止日期';
      case 'plannedDate': return '计划日期';
      case 'createdAtDate': return '创建日期';
      default: return '';
    }
  }

  const getTranslatedPriorityName = (priority: TaskPriority): string => {
    switch (priority) {
      case 'important-urgent': return '重要且紧急';
      case 'important-not-urgent': return '重要不紧急';
      case 'not-important-urgent': return '紧急不重要';
      case 'not-important-not-urgent': return '不重要不紧急';
      default: return '';
    }
  }

  const dynamicListTitle = useMemo(() => {
    if (selectedView === 'trash') {
      return `回收站 (${filteredTasks.length})`;
    }

    const activeFiltersDescription: string[] = [];
    let titlePrefix = getTranslatedViewName(selectedView);

    // Project filter
    if (selectedProjectIds.length > 0) {
      const projectNames = selectedProjectIds
        .map(id => getProjectNameById(id))
        .filter(name => name) // Filter out empty names if any id was invalid
        .join(', ');
      if (projectNames) activeFiltersDescription.push(`项目: ${projectNames}`);
    }

    // Tag filter
    if (selectedTagNames.length > 0) {
      activeFiltersDescription.push(`标签: ${selectedTagNames.join(', ')}`);
    }

    // Priority filter
    if (selectedPriorities.length > 0) {
      const priorityNames = selectedPriorities.map(getTranslatedPriorityName).join(', ');
      activeFiltersDescription.push(`优先级: ${priorityNames}`);
    }
    
    // Date filter
    const dateFilterTypeStr = getTranslatedDateFilterType(selectedDateFilterType);
    if (activeDateFilter) {
      if (activeDateFilter === 'custom' && customDateRange) {
        const start = customDateRange.from ? format(customDateRange.from, "P") : ''; // P for short date format
        const end = customDateRange.to ? format(customDateRange.to, "P") : '';
        if (start && end && start !== end) {
          activeFiltersDescription.push(`${dateFilterTypeStr}: ${start} - ${end}`);
        } else if (start) {
          activeFiltersDescription.push(`${dateFilterTypeStr}: ${start}`);
        }
      } else if (activeDateFilter !== 'custom' && activeDateFilter !== 'no-date') { // no-date handled by view or absence of filter
        activeFiltersDescription.push(`${dateFilterTypeStr}: ${getTranslatedDateFilterName(activeDateFilter)}`);
      } else if (activeDateFilter === 'no-date') {
        activeFiltersDescription.push(`${dateFilterTypeStr}: 无日期`);
      }
    }
    
    // Search query
    if (debouncedSearchTerm) { // Use debouncedSearchTerm
      activeFiltersDescription.push(`搜索: "${debouncedSearchTerm}"`);
    }

    // Constructing the title
    if (activeFiltersDescription.length > 0) {
      // If there are specific filters, change the prefix to a more general one
      // unless the view itself is a primary filter like 'Next Actions'
      const isDefaultView = ["next-actions", "someday-maybe", "waiting-for"].includes(selectedView);
      if (!isDefaultView || activeFiltersDescription.length > 0) {
         titlePrefix = "筛选结果";
      }
      if(isDefaultView && activeFiltersDescription.length > 0){
        titlePrefix = `${getTranslatedViewName(selectedView)} (自定义筛选)`
      }
      return `${titlePrefix}: ${activeFiltersDescription.join('; ')} (${filteredTasks.length})`;
    }
    
    // Default title if no advanced filters are active
    return `${titlePrefix} (${filteredTasks.length})`;

  }, [
    selectedView,
    filteredTasks.length, 
    selectedProjectIds,
    projectList, 
    selectedTagNames,
    activeDateFilter,
    customDateRange,
    selectedDateFilterType,
    selectedPriorities,
    debouncedSearchTerm, // Use debouncedSearchTerm
    getProjectNameById, // Added as dependency
    getTranslatedViewName, // Added as dependency
    getTranslatedDateFilterName, // Added as dependency
    getTranslatedDateFilterType, // Added as dependency
    getTranslatedPriorityName // Added as dependency
  ]);

  useEffect(() => {
    loadTasks();
    // Ensure projects and tags are available for the filter sidebar, load if not already loaded.
    // This might be called multiple times but guards prevent redundant fetches.
    if (projectList.length === 0 && selectedView !== 'trash') loadProjects();
    if (tagList.length === 0 && selectedView !== 'trash') loadTags();

  }, [selectedView, loadDeletedTasks, loadTasks, loadProjects, loadTags]); // projectList.length and tagList.length removed as deps to avoid loop if load functions don't set them sync.

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
          <Dialog open={isCreateDialogOpen} onOpenChange={(isOpen) => {
            setIsCreateDialogOpen(isOpen);
            if (!isOpen) resetCreateTaskForm(); // Reset form if dialog is closed
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建任务
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] md:max-w-[700px] lg:max-w-[750px]">
              <DialogHeader>
                <DialogTitle>创建新任务</DialogTitle>
                <DialogDescription>添加一个新任务到您的任务列表中</DialogDescription>
              </DialogHeader>
              {/* Replace old form with TaskFormFields */}
              <TaskFormFields
                key={createTaskFormKey} // For resetting the form
                availableProjects={projectList}
                onSave={handleCreateTask}
                onCancel={() => {
                  setIsCreateDialogOpen(false);
                  resetCreateTaskForm();
                }}
                onCreateNewProjectInForm={handleCreateNewProject}
                submitButtonText="创建任务"
                showCancelButton={true}
                // initialData can be used here if needed for default values, but usually empty for create
                // pomodoroDurationMinutes can be passed from a global setting if available
              />
              {/* DialogFooter is now part of TaskFormFields if showCancelButton is true */}
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-muted-foreground">管理和组织您的所有任务</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left sidebar - This will be replaced by the new TaskFilterSidebar component */}
        {/* The old sidebar Card components for Views, Projects, Tags, Dates, Trash link are removed here */}
        {/* Placeholder for the new sidebar component */}
        <TaskFilterSidebar
          allProjects={projectList}
          allTags={tagList}
          selectedView={selectedView}
          onSelectedViewChange={setSelectedView}
          selectedProjectIds={selectedProjectIds}
          onSelectedProjectIdsChange={setSelectedProjectIds}
          selectedTagNames={selectedTagNames}
          onSelectedTagNamesChange={setSelectedTagNames}
          activeDateFilter={activeDateFilter}
          onActiveDateFilterChange={setActiveDateFilter}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          selectedPriorities={selectedPriorities}
          onSelectedPrioritiesChange={setSelectedPriorities}
          onClearAllAdvancedFilters={clearAllAdvancedFilters} 
          getProjectNameById={getProjectNameById} // Pass the utility function
          className="md:col-span-1"
          selectedDateFilterType={selectedDateFilterType} // Pass new state
          onSelectedDateFilterTypeChange={setSelectedDateFilterType} // Pass new state setter
          tagCounts={tagCounts} // Pass the new tagCounts prop
        />

        {/* Main content */}
        <div className="md:col-span-3 space-y-6">
          <BatchOperationsBar 
            selectedTaskIds={selectedTaskIds}
            onClearSelection={() => setSelectedTaskIds([])}
            onOperationComplete={() => {
              loadTasks();
              dispatchStatsUpdate();
            }}
            className="mb-4"
          />
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  { selectedView !== "trash" && sortedTasks.length > 0 && (
                     <Checkbox
                        id="selectAllHeader"
                        checked={headerCheckboxState}
                        onCheckedChange={handleToggleSelectAll}
                        aria-label="选择/取消选择所有可见任务"
                        className="mr-2"
                      />
                  )}
                  <CardTitle>
                    {selectedTagNames.length > 0 // Example of dynamic title part based on new filters
                      ? `Tag: ${selectedTagNames.join(", ")}`
                      : selectedProjectIds.length > 0 && projectList.length > 0
                        ? `Project: ${selectedProjectIds.map(id => projectList.find(p=>String(p.id) === id)?.name || id ).join(", ")}`
                        // More sophisticated title generation needed based on all active filters
                      : selectedView === "next-actions"
                        ? "下一步行动"
                        : selectedView === "completed"
                          ? "已完成任务"
                          : selectedView === "someday-maybe"
                            ? "将来/也许"
                            : selectedView === "waiting"
                              ? "等待中"
                              : selectedView === "trash"
                                  ? "回收站"
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
                      value={searchTermInput} // Bind to searchTermInput
                      onChange={(e) => setSearchTermInput(e.target.value)} // Update searchTermInput directly
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
              {/* 批量操作栏已移至组件 BatchOperationsBar */}

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
                          "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                          selectedTaskIds.includes(task.id) 
                            ? "bg-primary/10 border-primary/40 dark:bg-primary/20" 
                            : (task.completed ? "bg-muted/50 border-transparent hover:bg-muted/70" : "bg-card hover:bg-muted/30 border-transparent"),
                        )}
                      >
                        {/* 完全替换这个复选框 */}
                        <Checkbox
                          checked={selectedTaskIds.includes(task.id)}
                          onCheckedChange={(checked) => handleTaskSelection(task.id, checked === true)}
                          aria-label={`选择任务 ${task.title}`}
                          className="mt-1 flex-shrink-0"
                        />
                        <div className="flex-1 space-y-1.5">
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
                                  <DropdownMenuItem onClick={() => toggleTaskCompletion(task.id)}>
                                    {task.completed ? (
                                      <><Undo className="h-4 w-4 mr-2" /> 标记为未完成</>
                                    ) : (
                                      <><Check className="h-4 w-4 mr-2" /> 标记为完成</>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEditModal(task)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    编辑
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleFrogStatus(task.id)}>
                                    <Flag className="h-4 w-4 mr-2" />
                                    {task.isFrog ? "取消标记为青蛙" : "标记为青蛙"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      if(task.id === undefined) {
                                        toast.error("任务ID无效，无法添加到时间轴。");
                                        return;
                                      }
                                      // Assuming handleAddTaskToTimeline expects the Task (task-utils) type.
                                      // The original task object `task` from `sortedTasks` is of type `Task` (task-utils).
                                      handleAddTaskToTimeline(task);
                                    }} 
                                    disabled={task.completed}
                                  >
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
                                      id={`subtask-${task.id}-${subtask.id}`} // Ensure unique ID for subtask checkbox
                                      checked={subtask.completed}
                                      onCheckedChange={() => toggleSubtaskCompletion(task.id, subtask.id)} // task.id must be valid
                                      className="h-3 w-3"
                                    />
                                    <label
                                      htmlFor={`subtask-${task.id}-${subtask.id}`} // Match unique ID
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
                        {debouncedSearchTerm // Use debouncedSearchTerm
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
                              selectedTaskIds.includes(task.id) 
                                ? "ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-800" 
                                : (task.completed ? "bg-muted/50" : "hover:bg-muted/30"),
                            )}
                          >
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                checked={selectedTaskIds.includes(task.id)}
                                onCheckedChange={(checked) => handleTaskSelection(task.id, checked === true)}
                                aria-label={`选择任务 ${task.title}`}
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
                                        <DropdownMenuItem onClick={() => toggleTaskCompletion(task.id)}>
                                          {task.completed ? (
                                            <><Undo className="h-4 w-4 mr-2" /> 标记为未完成</>
                                          ) : (
                                            <><Check className="h-4 w-4 mr-2" /> 标记为完成</>
                                          )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openEditModal(task)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          编辑
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleFrogStatus(task.id)}>{task.isFrog ? "取消标记为青蛙" : "标记为青蛙"}</DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => {
                                            if(task.id === undefined) {
                                              toast.error("任务ID无效，无法添加到时间轴。");
                                              return;
                                            }
                                            handleAddTaskToTimeline(task);
                                          }} 
                                          disabled={task.completed}
                                        >
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
                              selectedTaskIds.includes(task.id) 
                                ? "ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-800" 
                                : (task.completed ? "bg-muted/50" : "hover:bg-muted/30"),
                            )}
                          >
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                checked={selectedTaskIds.includes(task.id)}
                                onCheckedChange={(checked) => handleTaskSelection(task.id, checked === true)}
                                aria-label={`选择任务 ${task.title}`}
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
                                        <DropdownMenuItem onClick={() => toggleTaskCompletion(task.id)}>
                                          {task.completed ? (
                                            <><Undo className="h-4 w-4 mr-2" /> 标记为未完成</>
                                          ) : (
                                            <><Check className="h-4 w-4 mr-2" /> 标记为完成</>
                                          )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openEditModal(task)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          编辑
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleFrogStatus(task.id)}>{task.isFrog ? "取消标记为青蛙" : "标记为青蛙"}</DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => {
                                            if(task.id === undefined) {
                                              toast.error("任务ID无效，无法添加到时间轴。");
                                              return;
                                            }
                                            handleAddTaskToTimeline(task);
                                          }} 
                                          disabled={task.completed}
                                        >
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
                              selectedTaskIds.includes(task.id) 
                                ? "ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-800" 
                                : (task.completed ? "bg-muted/50" : "hover:bg-muted/30"),
                            )}
                          >
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                checked={selectedTaskIds.includes(task.id)}
                                onCheckedChange={(checked) => handleTaskSelection(task.id, checked === true)}
                                aria-label={`选择任务 ${task.title}`}
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
                                        <DropdownMenuItem onClick={() => toggleTaskCompletion(task.id)}>
                                          {task.completed ? (
                                            <><Undo className="h-4 w-4 mr-2" /> 标记为未完成</>
                                          ) : (
                                            <><Check className="h-4 w-4 mr-2" /> 标记为完成</>
                                          )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openEditModal(task)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          编辑
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleFrogStatus(task.id)}>{task.isFrog ? "取消标记为青蛙" : "标记为青蛙"}</DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => {
                                            if(task.id === undefined) {
                                              toast.error("任务ID无效，无法添加到时间轴。");
                                              return;
                                            }
                                            handleAddTaskToTimeline(task);
                                          }} 
                                          disabled={task.completed}
                                        >
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
                              selectedTaskIds.includes(task.id) 
                                ? "ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-800" 
                                : (task.completed ? "bg-muted/50" : "hover:bg-muted/30"),
                            )}
                          >
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                checked={selectedTaskIds.includes(task.id)}
                                onCheckedChange={(checked) => handleTaskSelection(task.id, checked === true)}
                                aria-label={`选择任务 ${task.title}`}
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
                                        <DropdownMenuItem onClick={() => toggleTaskCompletion(task.id)}>
                                          {task.completed ? (
                                            <><Undo className="h-4 w-4 mr-2" /> 标记为未完成</>
                                          ) : (
                                            <><Check className="h-4 w-4 mr-2" /> 标记为完成</>
                                          )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openEditModal(task)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          编辑
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleFrogStatus(task.id)}>{task.isFrog ? "取消标记为青蛙" : "标记为青蛙"}</DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => {
                                            if(task.id === undefined) {
                                              toast.error("任务ID无效，无法添加到时间轴。");
                                              return;
                                            }
                                            handleAddTaskToTimeline(task);
                                          }} 
                                          disabled={task.completed}
                                        >
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
      
      {/* 批量删除确认对话框已移至组件 BatchOperationsBar */}
    </div>
  )
}
