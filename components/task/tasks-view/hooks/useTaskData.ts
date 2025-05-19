// 此 Hook 负责管理任务、项目、标签等核心数据的获取、增删改查 (CRUD) 操作，
// 处理与 IndexedDB 的异步交互，管理数据状态、加载状态，并提供操作回调。
import { useState, useCallback, useEffect } from "react";
import {
    ObjectStores,
    add,
    get,
    update,
    remove,
    getAll,
    getByIndex,
    Task as DBTaskType,
    Project as DBProjectType,
    Tag as DBTagType,
    TimeBlock as DBTimeBlockType,
} from "@/lib/db";
import {
    Task,
    fromDBTaskShape,
    toDBTaskShape,
    NO_PROJECT_VALUE,
    TaskPriority, // Keep if used directly for mapping or type checking before DB conversion
} from "@/lib/task-utils";
import { TaskFormData, UIPriority } from "../../TaskFormFields";
import { toast } from "sonner";
import { formatTimeForDisplay, checkTimeOverlap } from "@/lib/utils"; // For handleAddTaskToTimeline

// Helper to map UIPriority (from form) to DBTaskType['priority'] - Copied from TasksView
const mapUiPriorityToStoragePriority = (uiPriority: UIPriority): NonNullable<DBTaskType['priority']> => {
    switch (uiPriority) {
        case "importantUrgent": return "importantUrgent";
        case "importantNotUrgent": return "importantNotUrgent";
        case "notImportantUrgent": return "notImportantUrgent";
        case "notImportantNotUrgent": return "notImportantNotUrgent";
        default: return "notImportantNotUrgent"; // Fallback
    }
};

export function useTaskData() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projectList, setProjectList] = useState<DBProjectType[]>([]);
    const [tagList, setTagList] = useState<DBTagType[]>([]);
    const [deletedTasks, setDeletedTasks] = useState<DBTaskType[]>([]);

    const [loadingData, setLoadingData] = useState<boolean>(true); // Combined loading state
    const [errorData, setErrorData] = useState<Error | null>(null); // Combined error state

    const [loadingTrash, setLoadingTrash] = useState<boolean>(false); // Specific for trash operations
    const [trashError, setTrashError] = useState<Error | null>(null);


    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [taskToDeleteId, setTaskToDeleteId] = useState<number | null>(null);
    const [taskToPermanentlyDeleteId, setTaskToPermanentlyDeleteId] = useState<number | null>(null);
    
    // For Pomodoro Modal - to select a task
    const [selectedTaskForPomodoro, setSelectedTaskForPomodoro] = useState<{ id: string; title: string } | null>(null);


    const dispatchStatsUpdate = useCallback(() => {
        window.dispatchEvent(new CustomEvent('taskDataChangedForStats'));
    }, []);

    const loadTasks = useCallback(async () => {
        setLoadingData(true);
        setErrorData(null);
        try {
            const dbTasks = await getByIndex<DBTaskType>(ObjectStores.TASKS, 'byIsDeleted', 0);
            const mappedTasks = dbTasks.map(fromDBTaskShape);
            setTasks(mappedTasks);
        } catch (err) {
            console.error("Failed to load tasks:", err);
            setErrorData(err instanceof Error ? err : new Error('Failed to load tasks'));
            setTasks([]);
        } finally {
            setLoadingData(false);
        }
    }, []);

    const loadProjects = useCallback(async () => {
        // setLoadingData(true); // Potentially set loading for projects if granular loading is needed
        try {
            const dbProjects = await getAll<DBProjectType>(ObjectStores.PROJECTS);
            setProjectList(dbProjects);
        } catch (err) {
            console.error("Failed to load projects:", err);
            // setErrorData(err instanceof Error ? err : new Error('Failed to load projects'));
        } finally {
            // setLoadingData(false);
        }
    }, []);

    const loadTags = useCallback(async () => {
        // setLoadingData(true); // Potentially set loading for tags
        try {
            const dbTags = await getAll<DBTagType>(ObjectStores.TAGS);
            setTagList(dbTags);
        } catch (err) {
            console.error("Failed to load tags:", err);
            // setErrorData(err instanceof Error ? err : new Error('Failed to load tags'));
        } finally {
            // setLoadingData(false);
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
    
    // Initial data load effect
    useEffect(() => {
        loadTasks();
        loadProjects();
        loadTags();
    }, [loadTasks, loadProjects, loadTags]);


    const getProjectNameById = useCallback((projectId: number | string | undefined): string => {
        if (projectId === undefined) return "";
        if (projectId === NO_PROJECT_VALUE) return "无项目";
        const project = projectList.find(p => p.id === Number(projectId));
        return project ? project.name : String(projectId);
    }, [projectList]);

    const handleCreateNewProject = useCallback(async (newProjectName: string): Promise<number | undefined> => {
        if (!newProjectName.trim()) {
            toast.error("项目名称不能为空。");
            return undefined;
        }
        const existingProject = projectList.find(p => p.name.toLowerCase() === newProjectName.trim().toLowerCase());
        if (existingProject) {
        toast.info(`项目 "${existingProject.name}" 已存在。将自动选择该项目。`);
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
            };
            const newId = await add(ObjectStores.PROJECTS, newProjectData as DBProjectType);
            await loadProjects();
            toast.success(`项目 "${newProjectName.trim()}" 已创建。`);
            return newId;
        } catch (err) {
            console.error("Failed to create new project:", err);
            toast.error("创建新项目失败。");
            setErrorData(err instanceof Error ? err : new Error('创建新项目失败'));
            return undefined;
        }
    }, [projectList, loadProjects]);

    const ensureTagsExist = useCallback(async (tagsToEnsure: string[]) => {
        if (!tagsToEnsure || tagsToEnsure.length === 0) return;
        const newTagsToCreate: DBTagType[] = [];
        const currentTagNamesLower = new Set(tagList.map(t => t.name.toLowerCase()));
        for (const tagName of tagsToEnsure) {
            const trimmedTagName = tagName.trim();
            if (trimmedTagName && !currentTagNamesLower.has(trimmedTagName.toLowerCase())) {
                if (!newTagsToCreate.find(nt => nt.name.toLowerCase() === trimmedTagName.toLowerCase())) {
                    newTagsToCreate.push({
                        name: trimmedTagName,
                        createdAt: new Date(),
                    });
                }
            }
        }
        if (newTagsToCreate.length > 0) {
            try {
                await Promise.all(newTagsToCreate.map(tag => add(ObjectStores.TAGS, tag)));
                await loadTags();
            } catch (err) {
                console.error("Failed to create new tags:", err);
                toast.error("创建部分新标签失败。");
            }
        }
    }, [tagList, loadTags]);

    const handleCreateTask = async (formData: TaskFormData, callback?: () => void) => {
        // setLoadingData(true); // Or a specific creating task loading state
        const now = new Date();
        try {
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
                subtasks: [],
                category: formData.category,
                plannedDate: formData.plannedDate,
                isRecurring: formData.isRecurring ? 1 : 0,
                recurrenceRule: formData.recurrenceRule,
                recurrenceEndDate: formData.recurrenceEndDate,
                recurrenceCount: formData.recurrenceCount,
                completedAt: undefined,
                deletedAt: undefined,
                goalId: undefined,
                actualPomodoros: undefined,
                reminderDate: undefined,
                order: undefined,
            };
            await add(ObjectStores.TASKS, dbTaskPayload as DBTaskType);
            toast.success("任务已成功创建！");
            await loadTasks();
            dispatchStatsUpdate();
            if (callback) callback();
        } catch (err) {
            console.error("Failed to create task:", err);
            toast.error("任务创建失败。");
            setErrorData(err instanceof Error ? err : new Error('Failed to create task'));
        } finally {
            // setLoadingData(false);
        }
    };

    const handleUpdateTask = async (updatedTaskData: Task, originalTaskDBId: number, callback?: () => void) => {
        // setLoadingData(true); // Or a specific updating task loading state
        try {
            const originalTaskInDB = await get<DBTaskType>(ObjectStores.TASKS, originalTaskDBId);
            if (updatedTaskData.tags && updatedTaskData.tags.length > 0) {
                await ensureTagsExist(updatedTaskData.tags);
            }
            const payloadForDB: DBTaskType = {
                ...originalTaskInDB,
                ...(toDBTaskShape(updatedTaskData)), // Converts Task (utils type) to Partial<DBTaskType>
                title: updatedTaskData.title,
                description: updatedTaskData.description,
                // priority is handled by toDBTaskShape which uses priorityMapToDB
                dueDate: updatedTaskData.dueDate ? new Date(updatedTaskData.dueDate) : undefined,
                projectId: updatedTaskData.projectId,
                isFrog: updatedTaskData.isFrog ? 1 : 0,
                tags: updatedTaskData.tags || [],
                updatedAt: new Date(),
                category: updatedTaskData.category,
                plannedDate: updatedTaskData.plannedDate,
                isRecurring: updatedTaskData.isRecurring ? 1 : 0,
                recurrenceRule: updatedTaskData.recurrenceRule,
                recurrenceEndDate: updatedTaskData.recurrenceEndDate,
                recurrenceCount: updatedTaskData.recurrenceCount,
                // Ensure estimatedDurationHours is correctly mapped by toDBTaskShape if it's on Task type
                // If not, map it here:
                // estimatedDurationHours: updatedTaskData.estimatedDurationHours, // assuming it's on Task type now
            };
             Object.keys(payloadForDB).forEach(key => (payloadForDB as any)[key] === undefined && delete (payloadForDB as any)[key]);

            await update(ObjectStores.TASKS, payloadForDB);
            toast.success("任务已成功更新！");
            await loadTasks();
            dispatchStatsUpdate();
            if (callback) callback();
        } catch (err) {
            console.error("Failed to update task:", err);
            toast.error("任务更新失败。");
            setErrorData(err instanceof Error ? err : new Error('Failed to update task'));
        } finally {
            // setLoadingData(false);
        }
    };
    
    const handleDeleteTask = async (idToDelete: number, callback?: () => void) => {
        // setLoadingData(true); // Or a specific deleting task loading state
        try {
            const taskInDB = await get<DBTaskType>(ObjectStores.TASKS, idToDelete);
            taskInDB.isDeleted = 1;
            taskInDB.deletedAt = new Date();
            taskInDB.updatedAt = new Date();
            await update(ObjectStores.TASKS, taskInDB);
            toast.success("任务已移至回收站。");
            await loadTasks(); // Refresh main task list
            await loadDeletedTasks(); // Refresh trash list
            dispatchStatsUpdate();
            if (callback) callback();
        } catch (err) {
            console.error("Failed to delete task:", err);
            toast.error("删除任务失败。");
            setErrorData(err instanceof Error ? err : new Error('Failed to delete task'));
        } finally {
            // setLoadingData(false);
        }
    };

    const handleToggleComplete = useCallback(async (id: number) => {
        const currentTask = tasks.find(t => t.id === id);
        if (!currentTask) return;

        const newCompletedStatus = !currentTask.completed;
        // Optimistic UI update
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
            dispatchStatsUpdate();
            // No toast here, often completion is a frequent action
        } catch (dbError) {
            console.error("Failed to update task completion in DB:", dbError);
            // Revert optimistic update
            setTasks(prevTasks =>
                prevTasks.map(task =>
                    task.id === id ? { ...task, completed: currentTask.completed } : task
                )
            );
            toast.error('更新任务完成状态失败。');
            setErrorData(dbError instanceof Error ? dbError : new Error('Failed to update task'));
        }
    }, [tasks, dispatchStatsUpdate]);
    
    const handleToggleSubtaskComplete = useCallback(async (taskId: number, subtaskIdToToggle: number) => {
        let originalTaskState: Task | undefined;
        let optimisticallyUpdatedSubtasksForDB: { title: string; completed: 0 | 1; }[] | undefined;

        setTasks(prevTasks =>
            prevTasks.map(task => {
                if (task.id === taskId && task.subtasks) {
                    originalTaskState = JSON.parse(JSON.stringify(task)); // Deep copy for potential revert
                    const newSubtasks = task.subtasks.map(subtask =>
                        subtask.id === subtaskIdToToggle ? { ...subtask, completed: !subtask.completed } : subtask,
                    );
                    optimisticallyUpdatedSubtasksForDB = newSubtasks.map(st => ({ title: st.title, completed: st.completed ? 1: 0}));
                    return { ...task, subtasks: newSubtasks };
                }
                return task;
            }),
        );

        try {
            if (optimisticallyUpdatedSubtasksForDB) { // Check if subtasks were actually updated
                const taskInDB = await get<DBTaskType>(ObjectStores.TASKS, taskId);
                if (taskInDB) {
                    taskInDB.subtasks = optimisticallyUpdatedSubtasksForDB; // Directly assign the mapped subtasks
                    taskInDB.updatedAt = new Date();
                    await update(ObjectStores.TASKS, taskInDB);
                    dispatchStatsUpdate();
                }
            }
        } catch (dbError) {
            console.error("Failed to update subtask completion in DB:", dbError);
            if (originalTaskState) {
                setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? originalTaskState! : t));
            }
            toast.error('更新子任务状态失败。');
            setErrorData(dbError instanceof Error ? dbError : new Error('Failed to update subtask'));
        }
    }, [tasks, dispatchStatsUpdate]);

    const handleToggleFrogStatus = useCallback(async (id: number) => {
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
            // toast.info(`任务已${newFrogStatus ? '标记' : '取消标记'}为青蛙`);
        } catch (dbError) {
            console.error("Failed to update frog status in DB:", dbError);
            setTasks(prevTasks =>
                prevTasks.map(task =>
                    task.id === id ? { ...task, isFrog: currentTask.isFrog } : task
                )
            );
            toast.error('更新青蛙状态失败。');
            setErrorData(dbError instanceof Error ? dbError : new Error('Failed to update frog status'));
        }
    }, [tasks]);

    const handleRestoreTask = useCallback(async (taskId: number) => {
        setDeletedTasks(prev => prev.filter(task => task.id !== taskId)); // Optimistic
        try {
            const taskToRestore = await get<DBTaskType>(ObjectStores.TASKS, taskId);
            if (taskToRestore) {
                taskToRestore.isDeleted = 0;
                taskToRestore.deletedAt = undefined;
                taskToRestore.updatedAt = new Date();
                await update(ObjectStores.TASKS, taskToRestore);
                toast.success(`任务 "${taskToRestore.title}" 已恢复。`);
                await loadTasks(); // Refresh main list
                dispatchStatsUpdate();
            } else {
                throw new Error("未在数据库中找到要恢复的任务。");
            }
        } catch (err) {
            console.error("Failed to restore task:", err);
            toast.error("恢复任务失败。请重试。");
            loadDeletedTasks(); // Revert
        }
    }, [loadTasks, loadDeletedTasks, dispatchStatsUpdate]);

    const handlePermanentlyDeleteTask = useCallback(async (idToDelete: number, callback?: () => void) => {
        setDeletedTasks(prev => prev.filter(task => task.id !== idToDelete)); // Optimistic
        try {
            await remove(ObjectStores.TASKS, idToDelete);
            toast.success("任务已永久删除。");
            // No need to call loadDeletedTasks if optimistic update is sufficient
            if (callback) callback();
        } catch (err) {
            console.error("Failed to permanently delete task:", err);
            toast.error("永久删除任务失败。请重试。");
            loadDeletedTasks(); // Revert
        }
    }, [loadDeletedTasks]);


    const handleAddTaskToTimeline = useCallback(async (taskItem: Task) => {
        if (taskItem.id === undefined) {
            toast.error("任务ID无效，无法添加到时间轴。");
            return;
        }
        if (taskItem.completed) {
            toast.info(`任务 "${taskItem.title}" 已完成，无法直接添加到时间轴。`);
            return;
        }
        try {
            const todayString = new Date().toISOString().split('T')[0];
            const taskId = String(taskItem.id);
            const title = taskItem.title;
            const type = 'task';
            let durationMinutes = 60;
            if (taskItem.estimatedDurationHours && taskItem.estimatedDurationHours > 0) {
                durationMinutes = taskItem.estimatedDurationHours * 60;
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

            while (!slotFound && iterations < MAX_ITERATIONS) {
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
                        toast.error(`未能为任务 "${title}" 找到今天 ${durationMinutes} 分钟的合适时段（已到${formatTimeForDisplay(endOfDayLimit)}）。`);
                        return;
                    }
                    proposedStartTime = currentProposedStart;
                    proposedEndTime = currentProposedEnd;
                    slotFound = true;
                }
            }
            if (!slotFound || !proposedStartTime || !proposedEndTime) {
                toast.error(`无法为任务 "${title}" 自动找到 ${durationMinutes} 分钟的空闲时间段。`);
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
            toast.success(`任务 "${title}" 已添加到今日时间轴 ${formatTimeForDisplay(proposedStartTime)} - ${formatTimeForDisplay(proposedEndTime)}。`);
        } catch (error) {
            console.error("添加到时间轴时出错:", error);
            let errorMessage = "添加到时间轴时发生未知错误。";
            if (error instanceof Error) {
                errorMessage = `添加到时间轴失败: ${error.message}`;
            }
            toast.error(errorMessage);
        }
    }, []); // Assuming taskItem.estimatedDurationHours is part of Task type from task-utils

    return {
        tasks,
        projectList,
        tagList,
        deletedTasks,
        loadingData,
        errorData,
        loadTasks, // Expose if manual refresh is needed from UI
        loadProjects, // Expose if manual refresh is needed
        loadTags, // Expose if manual refresh is needed
        loadDeletedTasks,
        loadingTrash,
        trashError,
        getProjectNameById,
        handleCreateTask,
        handleUpdateTask,
        handleDeleteTask,
        handleToggleComplete,
        handleToggleSubtaskComplete,
        handleToggleFrogStatus,
        handleRestoreTask,
        handlePermanentlyDeleteTask,
        handleCreateNewProject,
        ensureTagsExist,
        handleAddTaskToTimeline,
        taskToEdit,
        setTaskToEdit,
        taskToDeleteId,
        setTaskToDeleteId,
        taskToPermanentlyDeleteId,
        setTaskToPermanentlyDeleteId,
        selectedTaskForPomodoro,      // For Pomodoro Modal
        setSelectedTaskForPomodoro, // For Pomodoro Modal
        dispatchStatsUpdate,
    };
}
