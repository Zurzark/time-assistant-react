"use client"

import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from "react"
import { ObjectStores, Task as DBTask, add, update, getByIndex, getAll, get, remove } from "@/lib/db"
import { RRule, RRuleSet, Options as RRuleOptions } from 'rrule';
import { 
  startOfDay, endOfDay, 
  startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, 
  isWithinInterval, isEqual, isAfter, isBefore,
  parseISO, formatISO, isValid
} from 'date-fns';

export interface TaskStats {
  total: number;           // 总任务 (符合当前时间范围和筛选条件)
  nextAction: number;      // 下一步行动 (在总任务中，category === 'next_action')
  inProgress: number;      // 进行中 (在下一步中，未完成且未过期)
  overdue: number;         // 已过期 (在下一步中，未完成且已过期)
  completedInRange: number; // 已完成 (在总任务中，完成状态且完成日期在当前时间范围)
  recurring: number;       // 重复任务 (在总任务中，isRecurring === 1)
  
  // 为了兼容旧的 TaskStatsCard，暂时保留，数值将从新逻辑派生
  legacyCompleted: number; 
  legacyPending: number;
}

interface TaskForStats {
  id: number; 
  title: string;
  description?: string | null;
  completed: 0 | 1;
  completedAt?: Date | null; // 已转换为Date对象
  dueDate?: Date | null;     // 已转换为Date对象
  plannedDate?: Date | null; // 已转换为Date对象
  category?: string | null; 
  isRecurring?: 0 | 1;
  recurrenceRule?: string | object | null;
  recurrenceEndDate?: Date | null; // 已转换为Date对象
  recurrenceCount?: number | null;
  isDeleted?: 0 | 1;
  createdAt: Date; // 已转换为Date对象
  // isFrog?: 0 | 1; // 可按需添加
}

type TimeRangeOption = "today" | "week" | "month" | "all";

interface TaskStatsContextType {
  stats: TaskStats
  timeRange: TimeRangeOption
  setTimeRange: (range: TimeRangeOption) => void
  isLoading: boolean
  error: string | null
  refreshStats: () => Promise<void>; // 新增手动刷新函数
}

const initialTaskStats: TaskStats = {
  total: 0,
  nextAction: 0,
  inProgress: 0,
  overdue: 0,
  completedInRange: 0,
  recurring: 0,
  legacyCompleted: 0,
  legacyPending: 0,
};

const TaskStatsContext = createContext<TaskStatsContextType | undefined>(undefined);

const ensureDate = (dateInput: Date | string | undefined | null): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isValid(dateInput) ? dateInput : null;
  }
  try {
    const parsed = parseISO(dateInput as string);
    return isValid(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
};

export function TaskStatsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<TaskStats>(initialTaskStats);
  const [timeRange, setTimeRangeInternal] = useState<TimeRangeOption>("today");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setTimeRange = useCallback((range: TimeRangeOption) => {
    setTimeRangeInternal(range);
  }, []);

  const calculateStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allDbTasksRaw = await getAll<DBTask>(ObjectStores.TASKS);
      
      const allDbTasks = allDbTasksRaw.filter(task => task.isDeleted !== 1 && task.id !== undefined);

      const tasksForProcessing: TaskForStats[] = allDbTasks.map((dbTask): TaskForStats => ({
        id: dbTask.id!,
        title: dbTask.title,
        description: dbTask.description,
        completed: dbTask.completed,
        completedAt: ensureDate(dbTask.completedAt),
        dueDate: ensureDate(dbTask.dueDate),
        plannedDate: ensureDate(dbTask.plannedDate),
        category: dbTask.category,
        isRecurring: dbTask.isRecurring,
        recurrenceRule: dbTask.recurrenceRule,
        recurrenceEndDate: ensureDate(dbTask.recurrenceEndDate),
        recurrenceCount: dbTask.recurrenceCount,
        isDeleted: dbTask.isDeleted,
        createdAt: ensureDate(dbTask.createdAt) || new Date(0),
      }));

      const today = new Date();
      const todayStart = startOfDay(today);

      let rangeStart: Date, rangeEnd: Date;

      switch (timeRange) {
        case "today":
          rangeStart = todayStart;
          rangeEnd = endOfDay(today);
          break;
        case "week":
          rangeStart = startOfWeek(today, { weekStartsOn: 1 });
          rangeEnd = endOfWeek(today, { weekStartsOn: 1 });
          break;
        case "month":
          rangeStart = startOfMonth(today);
          rangeEnd = endOfMonth(today);
          break;
        case "all":
          rangeStart = new Date(0);
          rangeEnd = new Date(8640000000000000);
          break;
        default:
          rangeStart = todayStart;
          rangeEnd = endOfDay(today);
      }
      
      const isRecurringTaskOccurringInDateRange = (
        task: TaskForStats,
        checkRangeStart: Date,
        checkRangeEnd: Date
      ): boolean => {
        if (task.isRecurring !== 1 || !task.recurrenceRule || !task.plannedDate) return false;
        
        const dtstart = task.plannedDate;
        let ruleOptions: Partial<RRuleOptions> = { dtstart };

        if (typeof task.recurrenceRule === 'string') {
          try {
            // 检查是否为JSON格式
            if (task.recurrenceRule.startsWith('{')) {
              const jsonRule = JSON.parse(task.recurrenceRule);
              
              // 从JSON创建RRule选项
              if (jsonRule.frequency === 'daily') {
                ruleOptions.freq = RRule.DAILY;
              } else if (jsonRule.frequency === 'weekly') {
                ruleOptions.freq = RRule.WEEKLY;
              } else if (jsonRule.frequency === 'monthly') {
                ruleOptions.freq = RRule.MONTHLY;
              } else if (jsonRule.frequency === 'yearly') {
                ruleOptions.freq = RRule.YEARLY;
              } else if (jsonRule.frequency === 'workdays') {
                ruleOptions.freq = RRule.WEEKLY;
                ruleOptions.byweekday = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];
              }
              
              // 设置其他选项...
            } else {
              // 尝试作为标准RRULE解析
              const tempRule = RRule.fromString(task.recurrenceRule.startsWith('RRULE:') ? 
                task.recurrenceRule : 'RRULE:' + task.recurrenceRule);
              ruleOptions = {...tempRule.options, dtstart};
            }
          } catch(e) {
            console.warn("Error parsing rrule string:", task.recurrenceRule, e);
            return false;
          }
        } else if (typeof task.recurrenceRule === 'object') {
          ruleOptions = { ...(task.recurrenceRule as object), dtstart };
        } else {
          return false;
        }
      
        if (task.recurrenceEndDate) {
          ruleOptions.until = endOfDay(task.recurrenceEndDate);
        }
        if (task.recurrenceCount) {
          ruleOptions.count = task.recurrenceCount;
        }
      
        try {
          const rule = new RRule(ruleOptions);
          const occurrences = rule.between(startOfDay(checkRangeStart), endOfDay(checkRangeEnd), true);
          return occurrences.length > 0;
        } catch (e) {
          console.error("Error creating RRule or getting occurrences:", e, task.id, ruleOptions);
          return false;
        }
      };

      const filteredTasks = tasksForProcessing.filter(task => {
        if (timeRange === "all") return true;

        // 只要已完成且完成时间在范围内，直接计入
        if (task.completed === 1 && task.completedAt && isWithinInterval(task.completedAt, { start: rangeStart, end: rangeEnd })) {
          return true;
        }

        if (task.isRecurring === 0) {
          // 只要plannedDate在范围内即可
          const plannedInRange = !task.plannedDate || (
            (isBefore(task.plannedDate, endOfDay(rangeEnd)) || isEqual(task.plannedDate, endOfDay(rangeEnd)))
          );
          if (!plannedInRange) return false;
          // 只要未完成，且dueDate小于今天，也要计入（即已过期）
          if (!task.completed && task.dueDate && isBefore(task.dueDate, startOfDay(today))) {
            return true;
          }
          // 其他情况保持原有逻辑
          const dueDateLogic = !task.dueDate || isAfter(task.dueDate, startOfDay(rangeStart)) || isEqual(task.dueDate, startOfDay(rangeStart));
          return dueDateLogic;
        } else {
          if (!task.plannedDate) return false;
          const plannedBeforeOrOnRangeEnd = isBefore(task.plannedDate, endOfDay(rangeEnd)) || isEqual(task.plannedDate, endOfDay(rangeEnd));
          return plannedBeforeOrOnRangeEnd && isRecurringTaskOccurringInDateRange(task, rangeStart, rangeEnd);
        }
      });

      let newTotal = 0;
      let newNextAction = 0;
      let newInProgress = 0;
      let newOverdue = 0;
      let newCompletedInRange = 0;
      let newRecurring = 0;
      
      filteredTasks.forEach(task => {
        newTotal++;
        if (task.isRecurring === 1) {
          newRecurring++;
        }

        const isCompleted = task.completed === 1;

        if (isCompleted && task.completedAt) {
          if (timeRange === "all" || isWithinInterval(task.completedAt, { start: rangeStart, end: rangeEnd })) {
            newCompletedInRange++;
          }
        }
        
        if (task.category === 'next_action') {
          newNextAction++;
          if (!isCompleted) {
            if (task.dueDate && isBefore(task.dueDate, todayStart)) {
              newOverdue++;
            } 
            else {
              newInProgress++;
            }
          }
        }
      });
      
      const legacyCompletedCount = timeRange === "all" 
        ? tasksForProcessing.filter(t => t.completed === 1).length
        : filteredTasks.filter(t => t.completed === 1 && t.completedAt && isWithinInterval(t.completedAt, { start: rangeStart, end: rangeEnd })).length;
      
      const legacyPendingCount = newTotal - legacyCompletedCount;

      setStats({
        total: newTotal,
        nextAction: newNextAction,
        inProgress: newInProgress,
        overdue: newOverdue,
        completedInRange: newCompletedInRange,
        recurring: newRecurring,
        legacyCompleted: legacyCompletedCount,
        legacyPending: legacyPendingCount,
      });

    } catch (err) {
      console.error("Failed to calculate task stats:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setStats(initialTaskStats);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  useEffect(() => {
    const handleDataChange = () => {
      calculateStats();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('taskDataChangedForStats', handleDataChange);
      return () => {
        window.removeEventListener('taskDataChangedForStats', handleDataChange);
      };
    }
  }, [calculateStats]);

  return (
    <TaskStatsContext.Provider value={{ stats, timeRange, setTimeRange, isLoading, error, refreshStats: calculateStats }}>
      {children}
    </TaskStatsContext.Provider>
  );
}

export const useTaskStats = () => {
  const context = useContext(TaskStatsContext);
  if (!context) {
    throw new Error("useTaskStats must be used within a TaskStatsProvider");
  }
  return context;
};