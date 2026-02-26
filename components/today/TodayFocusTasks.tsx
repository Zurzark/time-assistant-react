// 此组件是"今日"看板右侧的"今日焦点任务"区域，
// 包含多个页签用于展示不同类别的今日相关任务。
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TaskItem } from "@/components/task/tasks-view/TaskItem";
import { Task, TaskPriority as TaskUtilsPriority, TaskCategory as UtilsTaskCategory, fromDBTaskShape } from "@/lib/task-utils";
import * as db from "@/lib/db"; // Assuming db.Task and db.getAll etc.
import {
    isToday, // Keep for specific checks if needed, but general range check is better
    isPast,
    isFuture,
    addDays,
    startOfDay,
    endOfDay,
    compareAsc,
    compareDesc,
    differenceInDays,
    parseISO, // If dates from DB are strings
    isAfter,
    isBefore,
    isEqual,
    isWithinInterval
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus, CheckSquare, Info } from 'lucide-react';
import { ConfirmDialog } from "@/components/ui/confirm-dialog"; // 导入确认对话框组件
import { RRule, Options as RRuleOptions } from 'rrule';
import { BatchOperationsBar } from "@/components/task/batch-operations-bar";

interface TodayFocusTasksProps {
    getProjectNameById: (projectId: number | string | undefined) => string;
    onEditTask: (task: Task) => void;
    onToggleComplete: (taskId: number) => void;
    onDeleteTask: (taskId: number) => void;
    onToggleFrogStatus: (taskId: number) => void;
    onAddTaskToTimeline: (task: Task) => void;
    onPomodoroClick: (taskId: number, taskTitle: string) => void;
    onOpenUnifiedAddModalForNewTask: () => void;
}

export type TabValue = "inProgress" | "due" | "completedToday" | "recurring" | "upcomingPlanned" | "dueSoon";

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
    { value: "recurring", label: "重复任务" },
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
    onOpenUnifiedAddModalForNewTask,
}: TodayFocusTasksProps) {
    const [activeTab, setActiveTab] = useState<TabValue>("inProgress");
    const [allUtilTasks, setAllUtilTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // 添加删除确认对话框状态
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

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

    // 监听全局任务数据变更事件，自动刷新
    useEffect(() => {
        const handler = () => {
            setRefreshTrigger(prev => prev + 1);
        };
        window.addEventListener('taskDataChangedForStats', handler);
        return () => window.removeEventListener('taskDataChangedForStats', handler);
    }, []);

    const getSafeDate = (dateInput: Date | string | undefined): Date | null => {
        if (!dateInput) return null;
        const date = dateInput instanceof Date ? dateInput : parseISO(String(dateInput));
        return isNaN(date.getTime()) ? null : date;
    };
    
    // Helper for recurring task check, consistent with task-stats-updater
    const isRecurringTaskOccurringToday = (task: Task, todayStart: Date, todayEnd: Date): boolean => {
        if (!task.isRecurring || !task.recurrenceRule || !task.plannedDate) return false;
        const dtstart = getSafeDate(task.plannedDate);
        if (!dtstart) return false;

        let ruleOptions: Partial<RRuleOptions> = { dtstart };
        try {
            if (typeof task.recurrenceRule === 'string' && task.recurrenceRule.startsWith('{')) {
                const jsonRule = JSON.parse(task.recurrenceRule);
                if (jsonRule.frequency === 'daily') ruleOptions.freq = RRule.DAILY;
                else if (jsonRule.frequency === 'weekly') ruleOptions.freq = RRule.WEEKLY;
                else if (jsonRule.frequency === 'monthly') ruleOptions.freq = RRule.MONTHLY;
                else if (jsonRule.frequency === 'yearly') ruleOptions.freq = RRule.YEARLY;
                else if (jsonRule.frequency === 'workdays') {
                    ruleOptions.freq = RRule.WEEKLY;
                    ruleOptions.byweekday = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];
                }
                if (jsonRule.endsType === 'on_date' && jsonRule.endDate) {
                    const untilDate = getSafeDate(jsonRule.endDate);
                    if (untilDate) ruleOptions.until = endOfDay(untilDate);
                }
                if (jsonRule.endsType === 'after_occurrences' && jsonRule.occurrences) {
                    ruleOptions.count = jsonRule.occurrences;
                }
            } else if (typeof task.recurrenceRule === 'string') {
                const tempRule = RRule.fromString(task.recurrenceRule.startsWith('RRULE:') ? task.recurrenceRule : 'RRULE:' + task.recurrenceRule);
                ruleOptions = { ...tempRule.options, dtstart };
            } else if (typeof task.recurrenceRule === 'object' && task.recurrenceRule !== null) {
                 ruleOptions = { ...(task.recurrenceRule as object), dtstart };
            } else {
                return false;
            }

            const recurrenceEndDate = getSafeDate(task.recurrenceEndDate);
            if (recurrenceEndDate) ruleOptions.until = endOfDay(recurrenceEndDate);
            if (task.recurrenceCount) ruleOptions.count = task.recurrenceCount;
            
            const rule = new RRule(ruleOptions);
            return rule.between(todayStart, todayEnd, true).length > 0;
        } catch (e) {
            console.error("Error in isRecurringTaskOccurringToday:", e, task.recurrenceRule);
            return false;
        }
    };
    
    const tasksFilteredForToday = useMemo(() => {
        if (isLoading) return [];
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);

        return allUtilTasks.filter(task => {
            const plannedDate = getSafeDate(task.plannedDate);
            const dueDate = getSafeDate(task.dueDate);
            const completedAt = getSafeDate(task.completedAt);
            const isOverdueTask = !task.completed && dueDate && isBefore(dueDate, todayStart);
            const isCompletedToday = task.completed && completedAt && isWithinInterval(completedAt, { start: todayStart, end: todayEnd });

            if (task.isRecurring) {
                return isRecurringTaskOccurringToday(task, todayStart, todayEnd);
            } else {
                const plannedOk = !plannedDate || isBefore(plannedDate, todayEnd) || isEqual(plannedDate, todayEnd);
                const dueOk = !dueDate || isAfter(dueDate, todayStart) || isEqual(dueDate, todayStart);
                const mainConditionsMet = plannedOk && dueOk;
                return mainConditionsMet || isOverdueTask || isCompletedToday;
            }
        });
    }, [allUtilTasks, isLoading]);

    const memoizedFilteredTasks = useMemo(() => {
        if (isLoading) return [];
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);
        const tomorrowStart = startOfDay(addDays(today, 1));
        const threeDaysLaterEnd = endOfDay(addDays(today, 3));

        let filtered: Task[] = [];

        // Start with tasks already filtered for "Today" context
        const baseTasksForTab = tasksFilteredForToday;

        switch (activeTab) {
            case "inProgress":
                filtered = baseTasksForTab.filter(task => {
                    const dueDate = getSafeDate(task.dueDate);
                    return (
                        task.category === "next_action" &&
                        !task.completed &&
                        (!dueDate || isAfter(dueDate, todayStart) || isEqual(dueDate, todayStart)) // dueDate is not in the past
                    );
                });
                break;
            case "due": // "到期任务" (Overdue based on your definition)
                filtered = baseTasksForTab.filter(task => {
                    const dueDate = getSafeDate(task.dueDate);
                    return (
                        task.category === "next_action" &&
                        !task.completed &&
                        dueDate && 
                        isBefore(dueDate, todayStart) // dueDate < todayStart
                    );
                });
                break;
            case "completedToday":
                filtered = baseTasksForTab.filter(task => {
                    const completedAt = getSafeDate(task.completedAt);
                    return (
                        task.category === "next_action" &&
                        task.completed &&
                        completedAt && 
                        isWithinInterval(completedAt, { start: todayStart, end: todayEnd })
                    );
                });
                break;
            case "recurring":
                filtered = baseTasksForTab.filter(task => {
                    return task.category === "next_action" && task.isRecurring; // Already filtered by isRecurringTaskOccurringToday in baseTasksForTab
                });
                break;
            // --- Tabs with logic not directly tied to the "strict today" definition from user ---
            // These are kept as they were, as they look at "upcoming" or "due soon" relative to today.
            // If these also need to strictly adhere to the "Today Filter" first, this part needs revisiting.
            case "upcomingPlanned": // Tasks planned for tomorrow to 3 days later
                 filtered = allUtilTasks.filter(task => { // Uses allUtilTasks directly
                    const plannedDate = getSafeDate(task.plannedDate);
                    return (
                        task.category === "next_action" &&
                        !task.completed &&
                        plannedDate && 
                        isAfter(plannedDate, todayEnd) && // plannedDate > todayEnd (i.e. from tomorrow)
                        isBefore(plannedDate, threeDaysLaterEnd) // plannedDate < threeDaysLaterEnd
                    );
                });
                break;
            case "dueSoon": // Tasks due from tomorrow to 3 days later (and not completed, next_action)
                filtered = allUtilTasks.filter(task => { // Uses allUtilTasks directly
                    const dueDate = getSafeDate(task.dueDate);
                    return (
                        task.category === "next_action" &&
                        !task.completed &&
                        dueDate && 
                        isAfter(dueDate, todayEnd) &&    // dueDate > todayEnd (i.e. from tomorrow)
                        isBefore(dueDate, threeDaysLaterEnd)   // dueDate < threeDaysLaterEnd
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

            const dateA = getSafeDate(activeTab === "completedToday" ? a.completedAt : activeTab === "upcomingPlanned" ? a.plannedDate : a.dueDate);
            const dateB = getSafeDate(activeTab === "completedToday" ? b.completedAt : activeTab === "upcomingPlanned" ? b.plannedDate : b.dueDate);

            if (activeTab === "completedToday") {
                if (dateA && dateB) return compareDesc(dateA, dateB);
            } else {
                if (dateA && dateB) return compareAsc(dateA, dateB);
                if (dateA && !dateB) return -1;
                if (!dateA && dateB) return 1;
            }
            return 0;
        });
    }, [tasksFilteredForToday, activeTab, isLoading, allUtilTasks]); // allUtilTasks for upcoming/dueSoon

    const tabCounts = useMemo(() => {
        const counts: Record<TabValue, number> = {
            inProgress: 0,
            due: 0,
            completedToday: 0,
            recurring: 0,
            upcomingPlanned: 0,
            dueSoon: 0,
        };
        if (isLoading || !allUtilTasks || allUtilTasks.length === 0) {
            return counts;
        }

        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);
        const tomorrowStart = startOfDay(addDays(today, 1)); // for upcoming/dueSoon
        const threeDaysLaterEnd = endOfDay(addDays(today, 3)); // for upcoming/dueSoon

        // Use tasksFilteredForToday for tabs that operate strictly within "today's tasks"
        tasksFilteredForToday.forEach(task => {
            const dueDate = getSafeDate(task.dueDate);
            const completedAt = getSafeDate(task.completedAt);

            // inProgress
            if (
                task.category === "next_action" &&
                !task.completed &&
                (!dueDate || isAfter(dueDate, todayStart) || isEqual(dueDate, todayStart))
            ) {
                counts.inProgress++;
            }

            // due (Overdue)
            if (
                task.category === "next_action" &&
                !task.completed &&
                dueDate && 
                isBefore(dueDate, todayStart)
            ) {
                counts.due++;
            }

            // completedToday
            if (
                task.category === "next_action" &&
                task.completed &&
                completedAt && isWithinInterval(completedAt, { start: todayStart, end: todayEnd })
            ) {
                counts.completedToday++;
            }

            // recurring
            if (task.category === "next_action" && task.isRecurring) { // Already filtered by isRecurringTaskOccurringToday
                counts.recurring++;
            }
        });
        
        // For upcomingPlanned and dueSoon, we iterate allUtilTasks as their logic is slightly different
        allUtilTasks.forEach(task => {
            const plannedDate = getSafeDate(task.plannedDate);
            const dueDate = getSafeDate(task.dueDate);

            // upcomingPlanned (original logic, not strictly based on tasksFilteredForToday)
            if (
                task.category === "next_action" &&
                !task.completed &&
                plannedDate && 
                isAfter(plannedDate, todayEnd) &&
                isBefore(plannedDate, threeDaysLaterEnd)
            ) {
                counts.upcomingPlanned++;
            }

            // dueSoon (original logic, not strictly based on tasksFilteredForToday)
            if (
                task.category === "next_action" &&
                !task.completed &&
                dueDate && 
                isAfter(dueDate, todayEnd) &&
                isBefore(dueDate, threeDaysLaterEnd) 
            ) {
                counts.dueSoon++;
            }
        });

        return counts;
    }, [tasksFilteredForToday, isLoading, allUtilTasks]); // allUtilTasks for upcoming/dueSoon counts

    // 添加处理删除确认的函数
    const handleDeleteConfirm = () => {
        if (taskToDelete) {
            onDeleteTask(taskToDelete.id);
            setTaskToDelete(null);
            setIsDeleteConfirmOpen(false); // Close dialog after confirm
        }
    };

    const handleTaskDeleteClick = (task: Task) => {
        setTaskToDelete(task);
        setIsDeleteConfirmOpen(true);
    };

    const handleSelectTask = (taskId: number, checked: boolean) => {
        setSelectedTaskIds(prev => {
            if (checked) {
                return [...prev, taskId];
            } else {
                return prev.filter(id => id !== taskId);
            }
        });
    };

    const handleClearSelection = () => {
        setSelectedTaskIds([]);
    };

    const handleOperationComplete = () => {
        setRefreshTrigger(prev => prev + 1);
        window.dispatchEvent(new CustomEvent('taskDataChangedForStats'));
    };

    const renderTabContent = (tabValue: TabValue) => {
        const tasksForTab = memoizedFilteredTasks;
        
        return (
            <div className="space-y-3 py-4 overflow-y-auto flex-grow pr-1">
                <BatchOperationsBar 
                    selectedTaskIds={selectedTaskIds}
                    onClearSelection={handleClearSelection}
                    onOperationComplete={handleOperationComplete}
                    className="z-10"
                />
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
                            isSelected={selectedTaskIds.includes(task.id!)} 
                            viewMode="list"
                            getProjectNameById={getProjectNameById}
                            onSelectTask={handleSelectTask} 
                            onToggleComplete={() => { onToggleComplete(task.id!); }}
                            onEditTask={() => onEditTask(task)}
                            onDeleteTask={() => handleTaskDeleteClick(task)} 
                            onToggleFrogStatus={() => { onToggleFrogStatus(task.id); }}
                            onAddTaskToTimeline={(t) => onAddTaskToTimeline(t)}
                            onPomodoroClick={() => onPomodoroClick(task.id, task.title)}
                        />
                    ))
                )}
            </div>
        );
    };

    return (
        <Card className="flex flex-col shadow-md h-full">
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center space-x-2">
                <CardTitle className="text-lg font-semibold">今日任务</CardTitle>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[320px] text-xs space-y-2 p-3" side="right">
                            <div className="font-semibold border-b pb-1 mb-1">今日任务筛选逻辑</div>
                            <div className="space-y-1">
                                <p><span className="font-medium text-primary">进行中:</span> 未完成 + (无截止日期 或 截止日期&ge;今天)</p>
                                <p><span className="font-medium text-red-600">到期任务:</span> 未完成 + 已逾期(截止日期&lt;今天)</p>
                                <p><span className="font-medium text-green-600">已完成:</span> 已完成 + 完成日期是今天</p>
                                <p><span className="font-medium text-purple-600">重复任务:</span> 今天有重复实例的任务</p>
                                <p><span className="font-medium text-orange-500">即将开始:</span> 未完成 + 计划日期在明天~3天后</p>
                                <p><span className="font-medium text-yellow-600">即将到期:</span> 未完成 + 截止日期在明天~3天后</p>
                                <div className="text-[10px] text-muted-foreground pt-1 border-t mt-1">
                                    * 仅显示“下一步行动”类别的任务
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardHeader>
            {/* Ensure CardContent takes up remaining space and allows Tabs to fill it */}
            <CardContent className="flex-grow flex flex-col p-2 sm:p-3 md:p-4 !pt-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full flex-grow flex flex-col">
                    <TabsList className="grid w-full grid-cols-6 gap-1 px-0 h-auto shrink-0">
                        {tabConfigs.map(tab => (
                            <TabsTrigger 
                                key={tab.value} 
                                value={tab.value} 
                                className="text-xs px-0.5 py-1 sm:px-1 sm:py-1.5 h-auto whitespace-normal leading-tight data-[state=active]:bg-primary/10 data-[state=active]:text-primary dark:data-[state=active]:bg-primary/20"
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

// The global isRecurringTaskOccurringInRange is removed as its logic is now integrated 
// into isRecurringTaskOccurringToday or used directly where a generic range is needed (like in task-stats-updater) 