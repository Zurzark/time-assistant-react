// 此组件是"今日"看板右侧的"今日焦点任务"区域，
// 包含多个页签用于展示不同类别的今日相关任务。
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskItem } from "@/components/task/tasks-view/TaskItem";
import { Task, TaskPriority as TaskUtilsPriority, TaskCategory as UtilsTaskCategory, fromDBTaskShape } from "@/lib/task-utils";
import * as db from "@/lib/db"; // Assuming db.Task and db.getAll etc.
import {
    isToday,
    isPast,
    isFuture,
    addDays,
    startOfDay,
    endOfDay,
    compareAsc,
    compareDesc,
    differenceInDays,
    parseISO, // If dates from DB are strings
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus, CheckSquare } from 'lucide-react';
import { ConfirmDialog } from "@/components/ui/confirm-dialog"; // 导入确认对话框组件

interface TodayFocusTasksProps {
    getProjectNameById: (projectId: number | string | undefined) => string;
    onEditTask: (task: Task) => void;
    onToggleComplete: (taskId: number) => void;
    onDeleteTask: (taskId: number) => void;
    onToggleFrogStatus: (taskId: number) => void;
    onAddTaskToTimeline: (task: Task) => void;
    onPomodoroClick: (taskId: number, taskTitle: string) => void;
    refreshTrigger: number;
    onOpenUnifiedAddModalForNewTask: () => void;
}

export type TabValue = "inProgress" | "due" | "completedToday" | "upcomingPlanned" | "dueSoon";

// Placeholder for TaskPriority type if not correctly imported
// type TaskPriority = "important-urgent" | "important-not-urgent" | "not-important-urgent" | "not-important-not-urgent";

const priorityOrder: Record<TaskUtilsPriority, number> = {
    "importantUrgent": 1,
    "importantNotUrgent": 2,
    "notImportantUrgent": 3,
    "notImportantNotUrgent": 4,
};

const tabConfigs: { value: TabValue; label: string }[] = [
    { value: "inProgress", label: "进行中" },
    { value: "due", label: "到期任务" },
    { value: "completedToday", label: "已完成" },
    { value: "upcomingPlanned", label: "即将开始" },
    { value: "dueSoon", label: "即将到期" },
];

export function TodayFocusTasks({
    getProjectNameById,
    onEditTask,
    onToggleComplete,
    onDeleteTask,
    onToggleFrogStatus,
    onAddTaskToTimeline,
    onPomodoroClick,
    refreshTrigger,
    onOpenUnifiedAddModalForNewTask,
}: TodayFocusTasksProps) {
    const [activeTab, setActiveTab] = useState<TabValue>("inProgress");
    const [allUtilTasks, setAllUtilTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // 添加删除确认对话框状态
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

    useEffect(() => {
        async function fetchTasks() {
            setIsLoading(true);
            try {
                const tasksFromDb = await db.getAll<db.Task>(db.ObjectStores.TASKS);
                const activeTasksFromDb = tasksFromDb.filter(task => !task.isDeleted); // Filter out deleted tasks first
                
                const mappedTasks = activeTasksFromDb.map(dbTask => {
                    try {
                        return fromDBTaskShape(dbTask); // Use the utility function
                    } catch (e) {
                        console.error("Error mapping DB task:", e, dbTask);
                        return null; // Skip tasks that fail mapping
                    }
                }).filter(task => task !== null) as Task[]; 
                setAllUtilTasks(mappedTasks); 
            } catch (error) {
                console.error("Error fetching tasks:", error);
                setAllUtilTasks([]);
            }
            setIsLoading(false);
        }
        fetchTasks();
    }, [refreshTrigger]); // Depend on refreshTrigger

    const getSafeDate = (dateInput: Date | string | undefined): Date | null => {
        if (!dateInput) return null;
        const date = dateInput instanceof Date ? dateInput : parseISO(String(dateInput));
        return isNaN(date.getTime()) ? null : date;
    };
    
    const memoizedFilteredTasks = useMemo(() => {
        if (isLoading) return [];
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        let filtered: Task[] = [];

        switch (activeTab) {
            case "inProgress":
                filtered = allUtilTasks.filter(task => {
                    const plannedDate = getSafeDate(task.plannedDate);
                    const dueDate = getSafeDate(task.dueDate);
                    return (
                        task.category === "next_action" &&
                        !task.completed &&
                        (plannedDate && compareAsc(plannedDate, todayEnd) <= 0) && // plannedDate <= today
                        (!dueDate || compareAsc(dueDate, todayEnd) > 0) // dueDate > today OR no due date
                    );
                });
                break;
            case "due":
                filtered = allUtilTasks.filter(task => {
                    const dueDate = getSafeDate(task.dueDate);
                    return (
                        task.category === "next_action" &&
                        !task.completed &&
                        (dueDate && compareAsc(dueDate, todayEnd) <= 0) // dueDate <= today
                    );
                });
                break;
            case "completedToday":
                filtered = allUtilTasks.filter(task => {
                    const completedAt = getSafeDate(task.completedAt);
                    return (
                        task.category === "next_action" &&
                        task.completed &&
                        (completedAt && isToday(completedAt))
                    );
                });
                break;
            case "upcomingPlanned":
                const tomorrowStart = startOfDay(addDays(new Date(), 1));
                const threeDaysLaterEnd = endOfDay(addDays(new Date(), 3));
                filtered = allUtilTasks.filter(task => {
                    const plannedDate = getSafeDate(task.plannedDate);
                    return (
                        task.category === "next_action" &&
                        !task.completed &&
                        plannedDate && 
                        compareAsc(plannedDate, tomorrowStart) >= 0 && // plannedDate >= tomorrow
                        compareAsc(plannedDate, threeDaysLaterEnd) <= 0 // plannedDate <= threeDaysLater
                    );
                });
                break;
            case "dueSoon":
                const tomorrowStartDue = startOfDay(addDays(new Date(), 1));
                const threeDaysLaterEndDue = endOfDay(addDays(new Date(), 3));
                filtered = allUtilTasks.filter(task => {
                    const dueDate = getSafeDate(task.dueDate);
                    return (
                        task.category === "next_action" &&
                        !task.completed &&
                        dueDate && 
                        compareAsc(dueDate, tomorrowStartDue) >= 0 && // dueDate >= tomorrow
                        compareAsc(dueDate, threeDaysLaterEndDue) <= 0 // dueDate <= threeDaysLater
                    );
                });
                break;
            default:
                return [];
        }

        return filtered.sort((a, b) => {
            if (a.isFrog && !b.isFrog) return -1;
            if (!a.isFrog && b.isFrog) return 1;

            const prioA = a.priority ? priorityOrder[a.priority] : 5;
            const prioB = b.priority ? priorityOrder[b.priority] : 5;
            if (prioA !== prioB) return prioA - prioB;

            const dateA = getSafeDate( activeTab === "completedToday" ? a.completedAt : activeTab === "upcomingPlanned" ? a.plannedDate : a.dueDate );
            const dateB = getSafeDate( activeTab === "completedToday" ? b.completedAt : activeTab === "upcomingPlanned" ? b.plannedDate : b.dueDate );

            if (activeTab === "completedToday") {
                if (dateA && dateB) return compareDesc(dateA, dateB);
            } else {
                if (dateA && dateB) return compareAsc(dateA, dateB);
                if (dateA && !dateB) return -1; // Tasks with dates first for ascending sort
                if (!dateA && dateB) return 1;
            }
            return 0;
        });
    }, [allUtilTasks, activeTab, isLoading]);

    const tabCounts = useMemo(() => {
        const counts: Record<TabValue, number> = {
            inProgress: 0,
            due: 0,
            completedToday: 0,
            upcomingPlanned: 0,
            dueSoon: 0,
        };
        if (isLoading || !allUtilTasks || allUtilTasks.length === 0) {
            return counts;
        }

        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const tomorrowStart = startOfDay(addDays(new Date(), 1));
        const threeDaysLaterEnd = endOfDay(addDays(new Date(), 3));

        allUtilTasks.forEach(task => {
            const plannedDate = getSafeDate(task.plannedDate);
            const dueDate = getSafeDate(task.dueDate);
            const completedAt = getSafeDate(task.completedAt);

            // inProgress
            if (
                task.category === "next_action" &&
                !task.completed &&
                (plannedDate && compareAsc(plannedDate, todayEnd) <= 0) &&
                (!dueDate || compareAsc(dueDate, todayEnd) > 0)
            ) {
                counts.inProgress++;
            }

            // due
            if (
                task.category === "next_action" &&
                !task.completed &&
                (dueDate && compareAsc(dueDate, todayEnd) <= 0)
            ) {
                counts.due++;
            }

            // completedToday
            if (
                task.category === "next_action" &&
                task.completed &&
                (completedAt && isToday(completedAt))
            ) {
                counts.completedToday++;
            }

            // upcomingPlanned
            if (
                task.category === "next_action" &&
                !task.completed &&
                plannedDate && 
                compareAsc(plannedDate, tomorrowStart) >= 0 &&
                compareAsc(plannedDate, threeDaysLaterEnd) <= 0
            ) {
                counts.upcomingPlanned++;
            }

            // dueSoon
            if (
                task.category === "next_action" &&
                !task.completed &&
                dueDate && 
                compareAsc(dueDate, tomorrowStart) >= 0 &&
                compareAsc(dueDate, threeDaysLaterEnd) <= 0 
            ) {
                counts.dueSoon++;
            }
        });
        return counts;
    }, [allUtilTasks, isLoading]);

    // 添加处理删除确认的函数
    const handleDeleteConfirm = () => {
        if (taskToDelete) {
            onDeleteTask(taskToDelete.id);
            setTaskToDelete(null);
        }
    };

    const handleTaskDeleteClick = (task: Task) => {
        setTaskToDelete(task);
        setIsDeleteConfirmOpen(true);
    };

    const renderTabContent = (tabValue: TabValue) => {
        const tasksForTab = memoizedFilteredTasks; // Use the memoized tasks for the current activeTab
        
        // 始终使用相同的容器结构，确保页签内容位置一致
        return (
            <div className="space-y-3 py-4 overflow-y-auto flex-grow pr-1">
                {isLoading && tasksForTab.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">加载中...</p>
                    </div>
                ) : tasksForTab.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center h-full">
                        <div className="rounded-full bg-primary/10 p-3 mb-4">
                            <CheckSquare className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">没有任务</h3>
                        <p className="text-muted-foreground mb-4 max-w-xs">
                            当前没有{tabConfigs.find(tc => tc.value === tabValue)?.label.toLowerCase()}的任务。
                        </p>
                        <Button variant="outline" size="sm" onClick={onOpenUnifiedAddModalForNewTask}> 
                            <Plus className="h-4 w-4 mr-2" /> 添加任务
                        </Button>
                    </div>
                ) : (
                    tasksForTab.map(task => (
                        <TaskItem
                            key={task.id}
                            task={task} 
                            isSelected={false} 
                            viewMode="list"
                            getProjectNameById={getProjectNameById}
                            onSelectTask={() => {}} 
                            onToggleComplete={() => { onToggleComplete(task.id); }}
                            onEditTask={() => onEditTask(task)} // Assuming onEditTask might lead to data changes that need refresh
                            onDeleteTask={() => handleTaskDeleteClick(task)} // 修改为打开确认对话框
                            onToggleFrogStatus={() => { onToggleFrogStatus(task.id); }}
                            onAddTaskToTimeline={(t) => onAddTaskToTimeline(t)} // t is already the full task object
                            onPomodoroClick={() => onPomodoroClick(task.id, task.title)}
                        />
                    ))
                )}
            </div>
        );
    };

    return (
        <Card className="flex flex-col shadow-md h-full">
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-lg font-semibold">今日任务</CardTitle>
            </CardHeader>
            {/* Ensure CardContent takes up remaining space and allows Tabs to fill it */}
            <CardContent className="flex-grow flex flex-col p-2 sm:p-3 md:p-4 !pt-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full flex-grow flex flex-col">
                    <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 gap-1 px-0 h-auto shrink-0">
                        {tabConfigs.map(tab => (
                            <TabsTrigger 
                                key={tab.value} 
                                value={tab.value} 
                                className="text-xs sm:text-sm px-1 py-1.5 sm:px-2 sm:py-2 h-auto whitespace-normal leading-tight data-[state=active]:bg-primary/10 data-[state=active]:text-primary dark:data-[state=active]:bg-primary/20"
                            >
                                {tab.label} ({tabCounts[tab.value]}) 
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {/* 只渲染当前活动标签页的内容 */}
                    <TabsContent 
                        value={activeTab} 
                        className="flex-grow mt-2 flex flex-col"
                        forceMount
                    >
                        {renderTabContent(activeTab)}
                    </TabsContent>
                </Tabs>
            </CardContent>

            {/* 添加删除确认对话框 */}
            <ConfirmDialog
                open={isDeleteConfirmOpen}
                onOpenChange={setIsDeleteConfirmOpen}
                title="确认删除"
                description={taskToDelete ? `确定要删除任务 "${taskToDelete.title}" 吗？此操作不可撤销。` : "确定要删除此任务吗？"}
                confirmLabel="删除"
                cancelLabel="取消"
                onConfirm={handleDeleteConfirm}
                variant="destructive"
            />
        </Card>
    );
} 