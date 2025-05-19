// 此 Hook 负责管理任务列表的筛选条件状态（项目、标签、日期、优先级、搜索词）、排序条件，
// 并根据这些条件计算出最终展示给用户的任务列表、标签计数以及动态列表标题。
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Task, TaskPriority } from '@/lib/task-utils';
import { Project as DBProjectType, Tag as DBTagType } from '@/lib/db'; // Corrected import for DB types
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useDebounce } from "@/lib/client-hooks"; // Import the hook

// Define task category constants - Copied from TasksView
const TASK_CATEGORY_NEXT_ACTION = 'next_action';
const TASK_CATEGORY_SOMEDAY_MAYBE = 'someday_maybe';
const TASK_CATEGORY_WAITING_FOR = 'waiting_for';

export type DateFilterType = 'dueDate' | 'plannedDate' | 'createdAtDate';

interface UseTaskFiltersAndSortProps {
    tasks: Task[];
    projectList: DBProjectType[];
    tagList: DBTagType[];
    selectedView: string; // From parent state (TasksView)
    getProjectNameById: (projectId: number | string | undefined) => string; // From useTaskData
}

export function useTaskFiltersAndSort({
    tasks,
    projectList,
    tagList,
    selectedView,
    getProjectNameById
}: UseTaskFiltersAndSortProps) {
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
    const [activeDateFilter, setActiveDateFilter] = useState<"today" | "this-week" | "next-7-days" | "this-month" | "no-date" | "custom" | null>(null);
    const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
    const [selectedPriorities, setSelectedPriorities] = useState<TaskPriority[]>([]);
    const [selectedDateFilterType, setSelectedDateFilterType] = useState<DateFilterType>('dueDate');

    const [sortBy, setSortBy] = useState("priority");
    const [searchTermInput, setSearchTermInput] = useState("");
    const debouncedSearchTerm = useDebounce(searchTermInput, 300);

    // Effect to clear filters when view is trash (moved from TasksView useEffect)
    useEffect(() => {
        if (selectedView === 'trash') {
            setSelectedProjectIds([]);
            setSelectedTagNames([]);
            setActiveDateFilter(null);
            setCustomDateRange(undefined);
            setSelectedPriorities([]);
            setSelectedDateFilterType('dueDate');
            setSearchTermInput("");
        }
    }, [selectedView]);

    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => {
            if (selectedView === "completed") {
                if (!task.completed) return false;
            } else if (selectedView === "next-actions") {
                if (task.completed || task.category !== TASK_CATEGORY_NEXT_ACTION) return false;
            } else if (selectedView === "someday-maybe") {
                if (task.completed || task.category !== TASK_CATEGORY_SOMEDAY_MAYBE) return false;
            } else if (selectedView === "waiting") {
                if (task.completed || task.category !== TASK_CATEGORY_WAITING_FOR) return false;
            }

            if (selectedProjectIds.length > 0) {
                if (!task.projectId || !selectedProjectIds.includes(String(task.projectId))) {
                    return false;
                }
            }

            if (selectedTagNames.length > 0) {
                if (!task.tags || task.tags.length === 0 || !task.tags.some(tag => selectedTagNames.includes(tag))) {
                    return false;
                }
            }

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
                    endOfWeek.setHours(23, 59, 59, 999);
                    if (!taskDateToCompare || taskDateToCompare < startOfWeek || taskDateToCompare > endOfWeek) return false;
                } else if (activeDateFilter === "next-7-days") {
                    const endOf7Days = new Date(today);
                    endOf7Days.setDate(today.getDate() + 6);
                    endOf7Days.setHours(23, 59, 59, 999);
                    if (!taskDateToCompare || taskDateToCompare < today || taskDateToCompare > endOf7Days) return false;
                } else if (activeDateFilter === "this-month") {
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    endOfMonth.setHours(23, 59, 59, 999);
                    if (!taskDateToCompare || taskDateToCompare < startOfMonth || taskDateToCompare > endOfMonth) return false;
                } else if (activeDateFilter === "no-date") {
                    if (taskDateToCompare) return false;
                } else if (activeDateFilter === "custom" && customDateRange) {
                    if (!taskDateToCompare) return false;
                    let passStartDate = true;
                    if (customDateRange.from) {
                        const customStart = new Date(customDateRange.from);
                        customStart.setHours(0, 0, 0, 0);
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

            if (selectedPriorities.length > 0) {
                if (!task.priority || !selectedPriorities.includes(task.priority as TaskPriority)) {
                    return false;
                }
            }

            if (debouncedSearchTerm &&
                !task.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) &&
                (!task.description || !task.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())))
            {
                return false;
            }
            return true;
        });
    }, [tasks, selectedView, selectedProjectIds, selectedTagNames, activeDateFilter, customDateRange, selectedPriorities, debouncedSearchTerm, selectedDateFilterType]);

    const tasksForTagCount = useMemo(() => {
        return tasks.filter((task) => {
            if (selectedView === "completed") {
                if (!task.completed) return false;
            } else if (selectedView === "next-actions") {
                if (task.completed || task.category !== TASK_CATEGORY_NEXT_ACTION) return false;
            } else if (selectedView === "someday-maybe") {
                if (task.completed || task.category !== TASK_CATEGORY_SOMEDAY_MAYBE) return false;
            } else if (selectedView === "waiting") {
                if (task.completed || task.category !== TASK_CATEGORY_WAITING_FOR) return false;
            }

            if (selectedProjectIds.length > 0) {
                if (!task.projectId || !selectedProjectIds.includes(String(task.projectId))) {
                    return false;
                }
            }
            // Tag filter SKIPPED for this calculation
            if (activeDateFilter) {
                const today = new Date(); today.setHours(0,0,0,0);
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
                    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
                    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23,59,59,999);
                    if (!taskDateToCompare || taskDateToCompare < startOfWeek || taskDateToCompare > endOfWeek) return false;
                } else if (activeDateFilter === "next-7-days") {
                    const endOf7Days = new Date(today); endOf7Days.setDate(today.getDate() + 6); endOf7Days.setHours(23,59,59,999);
                    if (!taskDateToCompare || taskDateToCompare < today || taskDateToCompare > endOf7Days) return false;
                } else if (activeDateFilter === "this-month") {
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); endOfMonth.setHours(23,59,59,999);
                    if (!taskDateToCompare || taskDateToCompare < startOfMonth || taskDateToCompare > endOfMonth) return false;
                } else if (activeDateFilter === "no-date") {
                    if (taskDateToCompare) return false;
                } else if (activeDateFilter === "custom" && customDateRange) {
                    if (!taskDateToCompare) return false;
                    let passStartDate = true;
                    if (customDateRange.from) { const customStart = new Date(customDateRange.from); customStart.setHours(0,0,0,0); if (taskDateToCompare < customStart) passStartDate = false; }
                    if (!passStartDate) return false;
                    let passEndDate = true;
                    if (customDateRange.to) { const customEnd = new Date(customDateRange.to); customEnd.setHours(23,59,59,999); if (taskDateToCompare > customEnd) passEndDate = false; }
                    if (!passEndDate) return false;
                }
            }
            if (selectedPriorities.length > 0) {
                if (!task.priority || !selectedPriorities.includes(task.priority as TaskPriority)) return false;
            }
            if (debouncedSearchTerm &&
                !task.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) &&
                (!task.description || !task.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())))
            {
                return false;
            }
            return true;
        });
    }, [tasks, selectedView, selectedProjectIds, activeDateFilter, customDateRange, selectedPriorities, debouncedSearchTerm, selectedDateFilterType]);

    const tagCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        tagList.forEach(tag => {
            counts[tag.name] = 0;
        });
        tasksForTagCount.forEach(task => {
            if (task.tags && task.tags.length > 0) {
                task.tags.forEach(tagName => {
                    if (counts[tagName] !== undefined) {
                        counts[tagName]++;
                    }
                });
            }
        });
        return counts;
    }, [tasksForTagCount, tagList]);

    const sortedTasks = useMemo(() => {
        return [...filteredTasks].sort((a, b) => {
            if (sortBy === "priority") {
                const priorityOrder: Record<TaskPriority, number> = {
                    "important-urgent": 0,
                    "important-not-urgent": 1,
                    "not-important-urgent": 2,
                    "not-important-not-urgent": 3,
                };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            } else if (sortBy === "dueDate") {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate.getTime() - b.dueDate.getTime();
            } else if (sortBy === "alphabetical") {
                return a.title.localeCompare(b.title);
            } else if (sortBy === "createdAt-asc") {
                return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
            } else if (sortBy === "createdAt-desc") {
                return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
            }
            return 0;
        });
    }, [filteredTasks, sortBy]);

    // Translation helpers (internal to this hook)
    const getTranslatedViewName = useCallback((view: string): string => {
        switch (view) {
            case "next-actions": return "下一步行动";
            case "someday-maybe": return "将来/也许";
            case "waiting-for": return "等待中";
            case "trash": return "回收站";
            case "completed": return "已完成";
            case "all": return "所有任务";
            default: return view;
        }
    }, []);

    const getTranslatedDateFilterName = useCallback((filter: string | null): string => {
        if (!filter) return "";
        switch (filter) {
            case "today": return "今天";
            case "this-week": return "本周";
            case "next-7-days": return "未来7天";
            case "this-month": return "本月";
            case "no-date": return "无日期";
            default: return "";
        }
    }, []);

    const getTranslatedDateFilterType = useCallback((type: DateFilterType): string => {
        switch (type) {
            case 'dueDate': return '截止日期';
            case 'plannedDate': return '计划日期';
            case 'createdAtDate': return '创建日期';
            default: return '';
        }
    }, []);

    const getTranslatedPriorityName = useCallback((priority: TaskPriority): string => {
        switch (priority) {
            case 'important-urgent': return '重要且紧急';
            case 'important-not-urgent': return '重要不紧急';
            case 'not-important-urgent': return '紧急不重要';
            case 'not-important-not-urgent': return '不重要不紧急';
            default: return '';
        }
    }, []);

    const dynamicListTitle = useMemo(() => {
        if (selectedView === 'trash') {
            // For trash, count comes from deletedTasks in useTaskData, not filteredTasks here.
            // This title generation might need adjustment if trash count is handled differently.
            return `回收站`; // Count will be added by the component using this title.
        }

        const activeFiltersDescription: string[] = [];
        let titlePrefix = getTranslatedViewName(selectedView);

        if (selectedProjectIds.length > 0) {
            const projectNames = selectedProjectIds
                .map(id => getProjectNameById(id))
                .filter(name => name)
                .join(', ');
            if (projectNames) activeFiltersDescription.push(`项目: ${projectNames}`);
        }

        if (selectedTagNames.length > 0) {
            activeFiltersDescription.push(`标签: ${selectedTagNames.join(', ')}`);
        }

        if (selectedPriorities.length > 0) {
            const priorityNames = selectedPriorities.map(getTranslatedPriorityName).join(', ');
            activeFiltersDescription.push(`优先级: ${priorityNames}`);
        }

        const dateFilterTypeStr = getTranslatedDateFilterType(selectedDateFilterType);
        if (activeDateFilter) {
            if (activeDateFilter === 'custom' && customDateRange) {
                const start = customDateRange.from ? format(customDateRange.from, "P") : '';
                const end = customDateRange.to ? format(customDateRange.to, "P") : '';
                if (start && end && start !== end) {
                    activeFiltersDescription.push(`${dateFilterTypeStr}: ${start} - ${end}`);
                } else if (start) {
                    activeFiltersDescription.push(`${dateFilterTypeStr}: ${start}`);
                }
            } else if (activeDateFilter !== 'custom' && activeDateFilter !== 'no-date') {
                activeFiltersDescription.push(`${dateFilterTypeStr}: ${getTranslatedDateFilterName(activeDateFilter)}`);
            } else if (activeDateFilter === 'no-date') {
                activeFiltersDescription.push(`${dateFilterTypeStr}: 无日期`);
            }
        }

        if (debouncedSearchTerm) {
            activeFiltersDescription.push(`搜索: "${debouncedSearchTerm}"`);
        }

        if (activeFiltersDescription.length > 0) {
            const isDefaultView = ["next-actions", "someday-maybe", "waiting-for"].includes(selectedView);
            if (!isDefaultView || activeFiltersDescription.length > 0) {
                titlePrefix = "筛选结果";
            }
            if(isDefaultView && activeFiltersDescription.length > 0){
                titlePrefix = `${getTranslatedViewName(selectedView)} (自定义筛选)`
            }
            return `${titlePrefix}: ${activeFiltersDescription.join('; ')}`;
            // Count will be appended by the component using this (e.g. TaskListHeader)
        }
        return `${titlePrefix}`;
    }, [
        selectedView, 
        // filteredTasks.length, // Count will be handled by consumer component
        selectedProjectIds, 
        projectList, // Dependency for getProjectNameById usage
        selectedTagNames, 
        activeDateFilter, 
        customDateRange, 
        selectedDateFilterType, 
        selectedPriorities, 
        debouncedSearchTerm,
        getProjectNameById, 
        getTranslatedViewName, 
        getTranslatedDateFilterName, 
        getTranslatedDateFilterType, 
        getTranslatedPriorityName
    ]);

    const clearAllAdvancedFilters = useCallback(() => {
        setSelectedProjectIds([]);
        setSelectedTagNames([]);
        setActiveDateFilter(null);
        setCustomDateRange(undefined);
        setSelectedPriorities([]);
        setSelectedDateFilterType('dueDate');
        // setSearchTermInput(""); // Optionally reset search, or leave to user
    }, []);

    return {
        filteredTasks, // Primarily for internal use or if specifically needed before sorting
        sortedTasks,
        tagCounts,
        dynamicListTitle,
        searchTermInput,
        setSearchTermInput,
        debouncedSearchTerm,
        sortBy,
        setSortBy,
        selectedProjectIds, setSelectedProjectIds,
        selectedTagNames, setSelectedTagNames,
        activeDateFilter, setActiveDateFilter,
        customDateRange, setCustomDateRange,
        selectedPriorities, setSelectedPriorities,
        selectedDateFilterType, setSelectedDateFilterType,
        clearAllAdvancedFilters,
    };
}
