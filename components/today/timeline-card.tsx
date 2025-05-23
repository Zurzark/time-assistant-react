"use client"
// 该组件负责展示和管理用户"今日时间轴"上的计划时间块和已记录的时间条目。
// 它允许用户创建新的时间安排，编辑现有安排，并将计划转换为实际的时间日志。
// 它集成了统一的时间块录入模态框，并处理与固定休息规则的交互。

import React, { useState, useEffect, useCallback, useRef, FC, ReactNode } from "react";
import {
  Activity,
  Calendar as CalendarIcon,
  CheckCircle2,
  Coffee,
  Loader2,
  MoreHorizontal,
  Play,
  AlertCircle,
  Flag,
  User,
  Trash2,
  Edit3,
  PlusCircle,
  Timer,
  Tag as CategoryIcon,
  Plus,
  MoveVertical
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { type TimeBlock as DBTimeBlock, ObjectStores, getByIndex as getDBByIndex, remove as removeDB, add as addDB, update as updateDB, get as getDBItem, FixedBreakRule, getAll as getAllDB, ActivityCategory, Task } from "@/lib/db"
import { useToast } from "@/components/ui/use-toast"
import TimeBlockEntryModal, { TimeBlockModalMode } from "@/components/time/time-block-entry-modal"
import { differenceInMinutes, format as formatDateFns, addDays, parseISO as dateFnsParseISO, addMinutes } from 'date-fns';
import TimelineBlockItemContent, { UITimeBlock as TimelineUITimeBlock } from "@/components/time/timeline-block-item-content";
import { DndContext, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';

const getTodayDateString = () => {
  const today = new Date();
  return formatDateFns(today, "yyyy-MM-dd");
};

const formatTime = (date: Date | string) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateToDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const SOURCE_TYPE_OPTIONS = [
  { value: 'manual_entry', label: '手动创建' },
  { value: 'task_plan', label: '任务计划' },
  { value: 'fixed_break', label: '固定休息' },
  { value: 'pomodoro_log', label: '番茄记录' },
] as const;

type SourceTypeOptionValue = typeof SOURCE_TYPE_OPTIONS[number]['value'];

interface TimelineCardProps {
  onPomodoroClick: (taskId: number, taskTitle: string) => void;
}

export function TimelineCard({ onPomodoroClick }: TimelineCardProps) {
  const { toast } = useToast();
  const [timeBlocks, setTimeBlocks] = useState<TimelineUITimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activityCategories, setActivityCategories] = useState<ActivityCategory[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
  const [externalModalMode, setExternalModalMode] = useState<TimeBlockModalMode>("plan-create");
  const [externalModalInitialData, setExternalModalInitialData] = useState<Partial<DBTimeBlock & { originalPlan?: { startTime: Date; endTime: Date } } | undefined>>(undefined);

  const isProcessingFixedBreaksRef = useRef(false);
  const cardContentRef = useRef<HTMLDivElement>(null);
  const [indicatorPosition, setIndicatorPosition] = useState(0);

  const todayDateStringForUI = getTodayDateString();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 拖拽状态
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draggedBlock, setDraggedBlock] = useState<TimelineUITimeBlock | null>(null);

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 至少移动8px才触发拖拽
      },
    })
  );

  const fetchTimeBlocks = useCallback(async () => {
    const currentFreshTodayDateString = getTodayDateString();
    console.log(`fetchTimeBlocks triggered for ${currentFreshTodayDateString}. Lock status: ${isProcessingFixedBreaksRef.current}`);
    
    if (isProcessingFixedBreaksRef.current) {
      console.warn("fetchTimeBlocks: Processing already in progress. Skipping this call.");
      return;
    }

    isProcessingFixedBreaksRef.current = true;
    setError(null);

    try {
      const localDateParts = currentFreshTodayDateString.split('-').map(Number);
      const localTodayZero = new Date(localDateParts[0], localDateParts[1] - 1, localDateParts[2], 0, 0, 0, 0);
      
      const displayPeriodStart = new Date(localTodayZero);
      const displayPeriodEnd = new Date(localDateParts[0], localDateParts[1] - 1, localDateParts[2], 23, 59, 59, 999);
      const displayPeriodStartNextDay = addDays(displayPeriodStart, 1);

      const [allFixedRules, categories, dbTasks] = await Promise.all([
        getAllDB<FixedBreakRule>(ObjectStores.FIXED_BREAK_RULES),
        getAllDB<ActivityCategory>(ObjectStores.ACTIVITY_CATEGORIES),
        getAllDB<Task>(ObjectStores.TASKS)
      ]);
      setActivityCategories(categories);
      setTasks(dbTasks);

      const dayOfWeekToday = localTodayZero.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      const dateRangeForCandidateBlocks = [
        formatDateFns(addDays(localTodayZero, -1), "yyyy-MM-dd"), 
        currentFreshTodayDateString, 
        formatDateFns(addDays(localTodayZero, 1), "yyyy-MM-dd")  
      ];
      
      let candidateDbBlocks: DBTimeBlock[] = [];
      for (const dateStr of dateRangeForCandidateBlocks) {
        const blocksForDate = await getDBByIndex<DBTimeBlock>(ObjectStores.TIME_BLOCKS, 'byDate', dateStr);
        candidateDbBlocks.push(...blocksForDate);
      }
      candidateDbBlocks = Array.from(new Map(candidateDbBlocks.map(block => [block.id, block])).values());

      const activeRulesForToday = allFixedRules.filter(rule =>
        rule.isEnabled &&
        rule.daysOfWeek &&
        rule.daysOfWeek.includes(dayOfWeekToday)
      );

      const blocksToAdd: Omit<DBTimeBlock, 'id'>[] = [];
      const processedFixedBreakIdsInThisRun = new Set<string>(); 

      for (const rule of activeRulesForToday) {
        if (rule.id === undefined) continue; 
        const fixedBreakIdStr = String(rule.id);

        if (processedFixedBreakIdsInThisRun.has(fixedBreakIdStr)) continue; 

        const alreadyExistsAsTodayBlock = candidateDbBlocks.some(block =>
            block.fixedBreakId === fixedBreakIdStr &&
            block.sourceType === 'fixed_break' &&
            new Date(block.startTime) >= displayPeriodStart && new Date(block.startTime) < displayPeriodStartNextDay
        );

        if (!alreadyExistsAsTodayBlock) {
          const [startHour, startMinute] = rule.startTime.split(':').map(Number);
          const [endHour, endMinute] = rule.endTime.split(':').map(Number);

          let startTime = new Date(localTodayZero);
          startTime.setHours(startHour, startMinute, 0, 0);

          let endTime = new Date(localTodayZero);
          endTime.setHours(endHour, endMinute, 0, 0);
          
          if (endTime.getTime() <= startTime.getTime()) {
              console.warn(`Fixed break rule "${rule.label || rule.id}" (${rule.startTime}-${rule.endTime}) on ${currentFreshTodayDateString} results in invalid/inverted time. Skipping.`);
              continue;
          }

          const newFixedBlockPayload: Omit<DBTimeBlock, 'id'> = {
            title: rule.label || "固定休息",
            sourceType: 'fixed_break',
            activityCategoryId: undefined,
            startTime: startTime, 
            endTime: endTime,    
            isLogged: 0,
            notes: undefined,
            date: currentFreshTodayDateString, 
            fixedBreakId: fixedBreakIdStr,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          blocksToAdd.push(newFixedBlockPayload);
          processedFixedBreakIdsInThisRun.add(fixedBreakIdStr);
        }
      }

      if (blocksToAdd.length > 0) {
        for (const payload of blocksToAdd) {
          try {
            const newId = await addDB(ObjectStores.TIME_BLOCKS, payload);
            const newBlockFromDB = await getDBItem<DBTimeBlock>(ObjectStores.TIME_BLOCKS, newId);
            if(newBlockFromDB) candidateDbBlocks.push(newBlockFromDB);
          } catch (addError) {
            console.error(`Failed to add fixed break from rule '${payload.title}' to DB:`, addError);
          }
        }
        candidateDbBlocks = Array.from(new Map(candidateDbBlocks.map(block => [block.id, block])).values());
      }

      const validRuleIdsFromSettings = new Set(allFixedRules.map(rule => String(rule.id)));
      const blocksToRemoveIds: number[] = [];

      const filteredAndProcessedBlocks = candidateDbBlocks
        .filter(block => {
          const blockStartTime = new Date(block.startTime); 
          const blockEndTime = new Date(block.endTime);  

          if (block.title === "记录" || (block.id === 45 && block.date === "2025-05-19") || block.title.startsWith("测试")) { 
            console.log(`TimelineCard Filter Debug for block "${block.title}" (ID: ${block.id}, DBDate: ${block.date}):`);
            console.log(`  block.startTime (raw from DB): ${block.startTime}`);
            console.log(`  block.endTime (raw from DB): ${block.endTime}`);
            console.log(`  blockStartTime (JS Date obj): ${blockStartTime.toISOString()} (Local: ${blockStartTime.toString()})`);
            console.log(`  blockEndTime (JS Date obj): ${blockEndTime.toISOString()} (Local: ${blockEndTime.toString()})`);
            console.log(`  Using currentFreshTodayDateString for filtering: ${currentFreshTodayDateString}`); 
            console.log(`  displayPeriodStart (for filtering): ${displayPeriodStart.toISOString()} (Local: ${displayPeriodStart.toString()})`);
            console.log(`  displayPeriodEnd (for filtering): ${displayPeriodEnd.toISOString()} (Local: ${displayPeriodEnd.toString()})`);
            const condition1 = blockStartTime < displayPeriodEnd;
            const condition2 = blockEndTime > displayPeriodStart;
            console.log(`  Condition1 (blockStartTime < displayPeriodEnd): ${condition1}`);
            console.log(`  Condition2 (blockEndTime > displayPeriodStart): ${condition2}`);
            console.log(`  Overall overlapsToday evaluation: ${condition1 && condition2}`);
          }
          
          const overlapsToday = blockStartTime < displayPeriodEnd && blockEndTime > displayPeriodStart;
          
          if (!overlapsToday) {
            if (block.fixedBreakId && block.sourceType === 'fixed_break' && block.date === currentFreshTodayDateString) { 
                if(!validRuleIdsFromSettings.has(block.fixedBreakId)) {
                    if (block.id !== undefined) blocksToRemoveIds.push(block.id);
                }
            }
            return false;
          }

          if (block.fixedBreakId && block.sourceType === 'fixed_break') {
            if (!validRuleIdsFromSettings.has(block.fixedBreakId)) {
              console.warn(`Orphaned fixed break block (ID: ${block.id}, fixedBreakId: ${block.fixedBreakId}, Title: ${block.title}) that overlaps today. Scheduled for removal.`);
              if (block.id !== undefined) {
                blocksToRemoveIds.push(block.id);
              }
              return false; 
            }
          }
          return true; 
        })
        .map(block => ({
          ...block,
          id: block.id!,
          isLogged: block.isLogged === 1,
          startTime: new Date(block.startTime), 
          endTime: new Date(block.endTime),
          actualStartTime: block.actualStartTime ? new Date(block.actualStartTime) : undefined,
          actualEndTime: block.actualEndTime ? new Date(block.actualEndTime) : undefined,
        } as TimelineUITimeBlock))
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      
      setTimeBlocks(filteredAndProcessedBlocks);

      if (blocksToRemoveIds.length > 0) {
        console.log("Removing orphaned fixed break blocks from DB:", blocksToRemoveIds);
        (async () => {
          for (const idToRemove of blocksToRemoveIds) {
            try {
              await removeDB(ObjectStores.TIME_BLOCKS, idToRemove);
              toast({
                title: "自动清理",
                description: `一个过时的固定休息块已从时间轴移除。`,
                variant: "default",
                duration: 3000,
              });
            } catch (error) {
              console.error(`Failed to remove orphaned block ${idToRemove}:`, error);
            }
          }
        })();
      }

    } catch (err: any) {
      console.error("Error in fetchTimeBlocks:", err);
      setError(err.message || "无法加载时间块数据。");
      setTimeBlocks([]);
    } finally {
      isProcessingFixedBreaksRef.current = false;
      if (loadingRef.current) {
         setLoading(false);
         loadingRef.current = false;
      }
      console.log("fetchTimeBlocks finished. Lock released.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const loadingRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    loadingRef.current = true;
    fetchTimeBlocks();
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const handleExternalTimelineUpdate = () => {
      console.log("timelineShouldUpdate event received, preparing to call fetchTimeBlocks.");
      setLoading(true);
      loadingRef.current = true;
      fetchTimeBlocks();
    };
    window.addEventListener('timelineShouldUpdate', handleExternalTimelineUpdate);

    return () => {
      clearInterval(timerId);
      window.removeEventListener('timelineShouldUpdate', handleExternalTimelineUpdate);
    };
  }, [fetchTimeBlocks]);

  useEffect(() => {
    if (cardContentRef.current) {
      const now = new Date(currentTime);
      const startOfDayForIndicator = new Date(now);
      startOfDayForIndicator.setHours(0, 0, 0, 0);
      const minutesFromStartOfDay = differenceInMinutes(now, startOfDayForIndicator);
      const totalMinutesInDay = 24 * 60;
      const clampedMinutes = Math.min(Math.max(minutesFromStartOfDay, 0), totalMinutesInDay);
      const percentageOfDay = clampedMinutes / totalMinutesInDay;
      
      const scrollHeight = cardContentRef.current.scrollHeight;
      const clientHeight = cardContentRef.current.clientHeight;

      const effectiveHeight = scrollHeight > clientHeight ? scrollHeight : clientHeight;
      let newPosition = percentageOfDay * effectiveHeight;
      
      newPosition = Math.max(0, Math.min(newPosition, effectiveHeight - 2));

      setIndicatorPosition(newPosition);
    }
  }, [currentTime, timeBlocks, loading]);

  const getIconForSourceType = (sourceType: TimelineUITimeBlock['sourceType'], fixedBreakId?: string, activityCategoryId?: number): ReactNode => {
    const category = activityCategories.find(cat => cat.id === activityCategoryId);
    if (category) {
        return category.color ? <CategoryIcon className="h-4 w-4" style={{ color: category.color }} /> : <User className="h-4 w-4" />;
    }
    if (fixedBreakId) return <Coffee className="h-4 w-4" />;
    switch (sourceType) {
      case 'task_plan': return <Activity className="h-4 w-4" />;
      case 'manual_entry': return <Edit3 className="h-4 w-4" />;
      case 'pomodoro_log': return <Timer className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };
  
  const getDisplaySourceType = (
    sourceType: TimelineUITimeBlock['sourceType'], 
    fixedBreakId?: string, 
    activityCategoryId?: number
  ): string => {
    const category = activityCategories.find(cat => cat.id === activityCategoryId);
    const activityCategoryName = category?.name;

    if (fixedBreakId) return activityCategoryName ? `固定 ${activityCategoryName}` : "固定休息";
    if (sourceType === 'manual_entry' && activityCategoryName && activityCategoryName !== "手动创建") {
        return activityCategoryName;
    }
    switch (sourceType) {
      case 'task_plan': return "任务计划";
      case 'manual_entry': return activityCategoryName || "手动创建";
      case 'fixed_break': return "固定休息";
      case 'pomodoro_log': return "番茄记录";
      default: return "活动";
    }
  };

  const handleDeleteBlock = async (blockId: number, blockTitle: string) => {
    if (window.confirm(`确定要从时间轴移除此安排 "${blockTitle}" 吗？`)) {
      try {
        setLoading(true);
        loadingRef.current = true;
        await removeDB(ObjectStores.TIME_BLOCKS, blockId);
        toast({
          title: "删除成功",
          description: `时间块 "${blockTitle}" 已被移除。它可能会在明日根据固定规则重新生成（如果适用）。`,
        });
        await fetchTimeBlocks(); 
      } catch (err) {
        console.error("Failed to delete time block:", err);
        toast({
          title: "删除失败",
          description: "无法删除时间块，请重试。",
          variant: "destructive",
        });
      }
    }
  };

  const handleOpenAddModal = () => {
    const currentTodayForModal = getTodayDateString();
    const now = new Date();
    let suggestedStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
    if (timeBlocks.length > 0) {
        const lastBlockEndTime = new Date(timeBlocks[timeBlocks.length - 1].endTime);
        if (formatDateFns(lastBlockEndTime, "yyyy-MM-dd") === currentTodayForModal) {
             suggestedStartTime = lastBlockEndTime;
        }
    }
    if (formatDateFns(suggestedStartTime, "yyyy-MM-dd") === currentTodayForModal && suggestedStartTime < now) {
        suggestedStartTime = new Date(now);
        const minutes = suggestedStartTime.getMinutes();
        const roundedMinutes = Math.ceil(minutes / 15) * 15;
        suggestedStartTime.setMinutes(roundedMinutes, 0, 0);
        if (roundedMinutes >= 60) {
            suggestedStartTime.setHours(suggestedStartTime.getHours() + 1);
            suggestedStartTime.setMinutes(0,0,0);
        }
    }

    const oneHourLater = new Date(suggestedStartTime.getTime() + 60 * 60 * 1000);

    setExternalModalInitialData({
      date: currentTodayForModal,
      startTime: suggestedStartTime,
      endTime: oneHourLater,
      isLogged: 0,
      sourceType: 'manual_entry',
    });
    setExternalModalMode("plan-create");
    setIsExternalModalOpen(true);
  };

  const handleOpenEditModal = (block: TimelineUITimeBlock) => {
    setExternalModalInitialData({
        ...block,
        startTime: new Date(block.startTime),
        endTime: new Date(block.endTime),
        isLogged: block.isLogged ? 1 : 0,
    });
    setExternalModalMode(block.isLogged ? "log-edit" : "plan-edit");
    setIsExternalModalOpen(true);
  };

  const handleOpenLogModalFromPlan = (block: TimelineUITimeBlock) => {
    setExternalModalInitialData({
      title: block.title,
      activityCategoryId: block.activityCategoryId,
      taskId: block.taskId,
      notes: block.notes,
      date: block.date,
      actualStartTime: new Date(block.startTime),
      actualEndTime: new Date(block.endTime),
      isLogged: 1,
      sourceType: 'time_log',
      startTime: new Date(block.startTime),
      endTime: new Date(block.endTime),
    });
    setExternalModalMode("plan-to-log");
    setIsExternalModalOpen(true);
  };

  const handleExternalModalSubmitSuccess = async () => {
    setIsExternalModalOpen(false);
    setLoading(true);
    loadingRef.current = true;
    await fetchTimeBlocks();
  };

  const handleStartPomodoroForBlock = async (blockTaskId: string | number, blockTitle: string) => {
    if (blockTaskId === undefined) {
      toast({ title: "错误", description: "此时间块没有关联的任务ID，无法启动番茄钟。", variant: "destructive" });
      return;
    }
    
    const numericTaskId = typeof blockTaskId === 'string' ? parseInt(blockTaskId, 10) : blockTaskId;
    if (isNaN(numericTaskId)) {
        toast({ title: "错误", description: "无效的任务ID格式。", variant: "destructive" });
        return;
    }
    onPomodoroClick(numericTaskId, blockTitle);
  };

  // 处理拖拽开始事件
  const handleDragStart = (event: any) => {
    const { active } = event;
    const id = active.id as number;
    const block = timeBlocks.find(b => b.id === id);
    
    if (block) {
      setActiveId(id);
      setDraggedBlock(block);
    }
  };
  
  // 处理拖拽结束事件
  const handleDragEnd = async (event: any) => {
    const { active } = event;
    const id = active.id as number;
    
    // 计算垂直方向移动距离对应的时间变化（每10px = 15分钟）
    const pixelsPerTimeUnit = 10; // 每10像素
    const minutesPerTimeUnit = 15; // 对应15分钟
    
    // 从event.delta获取y值
    const deltaY = event.delta?.y || 0;
    const deltaYRounded = Math.round(deltaY / pixelsPerTimeUnit) * minutesPerTimeUnit;
    
    if (deltaYRounded !== 0 && draggedBlock) {
      try {
        setLoading(true);
        
        // 创建新的开始和结束时间
        const newStartTime = addMinutes(new Date(draggedBlock.startTime), deltaYRounded);
        const newEndTime = addMinutes(new Date(draggedBlock.endTime), deltaYRounded);
        
        // 检查是否已经被记录
        if (draggedBlock.isLogged) {
          const newActualStartTime = draggedBlock.actualStartTime 
            ? addMinutes(new Date(draggedBlock.actualStartTime), deltaYRounded) 
            : undefined;
          const newActualEndTime = draggedBlock.actualEndTime 
            ? addMinutes(new Date(draggedBlock.actualEndTime), deltaYRounded) 
            : undefined;
            
          await updateDB(ObjectStores.TIME_BLOCKS, {
            ...draggedBlock,
            startTime: newStartTime,
            endTime: newEndTime,
            actualStartTime: newActualStartTime,
            actualEndTime: newActualEndTime,
            updatedAt: new Date()
          });
        } else {
          await updateDB(ObjectStores.TIME_BLOCKS, {
            ...draggedBlock,
            startTime: newStartTime,
            endTime: newEndTime,
            updatedAt: new Date()
          });
        }
        
        toast({
          title: "时间已调整",
          description: `${draggedBlock.title || "时间块"}已${deltaYRounded > 0 ? "推迟" : "提前"}${Math.abs(deltaYRounded)}分钟`,
          duration: 3000,
        });
        
        await fetchTimeBlocks();
      } catch (err) {
        console.error("Failed to update time block position:", err);
        toast({
          title: "调整失败",
          description: "无法调整时间块位置，请重试。",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    setActiveId(null);
    setDraggedBlock(null);
  };

  if (loading && timeBlocks.length === 0 && !error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-md font-medium">今日时间轴</CardTitle>
          <CardDescription>您今日的日程安排</CardDescription>
        </CardHeader>
        <CardContent className="pb-2 flex-grow flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
        <CardFooter className="pt-2 border-t">
          <Button variant="outline" size="sm" className="w-full" disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> 添加时间块
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-md font-medium">今日时间轴</CardTitle>
          <CardDescription>您今日的日程安排</CardDescription>
        </CardHeader>
        <CardContent className="pb-2 flex-grow flex flex-col justify-center items-center min-h-[200px] text-red-500">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => {setLoading(true); loadingRef.current = true; fetchTimeBlocks();}} className="mt-4">
            重试
          </Button>
        </CardContent>
         <CardFooter className="pt-2 border-t">
          <Button variant="outline" size="sm" className="w-full" onClick={handleOpenAddModal}>
            <PlusCircle className="mr-2 h-4 w-4" /> 添加时间块
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col relative">
      {loading && timeBlocks.length > 0 && (
        <div className="absolute inset-0 bg-background/80 flex justify-center items-center z-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-md font-medium">今日时间轴</CardTitle>
          <Button variant="outline" size="sm" onClick={handleOpenAddModal} disabled={loading} className="ml-auto">
            <Plus className="mr-1.5 h-4 w-4" /> 添加时间块
          </Button>
        </div>
        <CardDescription>您今日的日程安排 {loading && timeBlocks.length > 0 && "(更新中...)"}</CardDescription>
      </CardHeader>
      <CardContent ref={cardContentRef} className="pb-2 flex-grow overflow-y-auto relative">
        <div className="relative">
          {timeBlocks.length > 0 && (
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 z-0"></div>
          )}

          {timeBlocks.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-center min-h-[200px]">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
              <p className="text-md text-muted-foreground">今日时间轴为空。</p>
              <p className="text-sm text-muted-foreground">尝试从任务列表添加，或直接在此处创建时间块。</p>
            </div>
          ) : (
            <DndContext 
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-0 relative z-10 mt-0">
                {timeBlocks.map((block, index) => {
                  const isCurrentBlock =
                    currentTime >= block.startTime &&
                    currentTime < block.endTime;

                  return (
                    <div key={block.id} className="relative pl-8 pb-1.5 group">
                      {block.sourceType !== 'fixed_break' && (
                        <div className="absolute left-0 -ml-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          <MoveVertical className="h-4 w-4" />
                        </div>
                      )}
                      <TimelineBlockItemContent
                        key={block.id}
                        block={block}
                        isCurrentBlock={isCurrentBlock}
                        onPomodoroClick={handleStartPomodoroForBlock}
                        handleOpenEditModal={handleOpenEditModal}
                        handleDeleteBlock={handleDeleteBlock}
                        handleOpenLogModalFromPlan={handleOpenLogModalFromPlan}
                        currentTime={currentTime}
                        activityCategories={activityCategories}
                        tasks={tasks}
                        isDraggable={block.sourceType !== 'fixed_break'} // 固定休息不可拖拽
                        dragId={block.id}
                      />
                    </div>
                  );
                })}
              </div>
              
              {/* 拖拽叠加层 */}
              <DragOverlay>
                {activeId && draggedBlock && (
                  <div className="pl-8 opacity-80">
                    <TimelineBlockItemContent
                      block={draggedBlock}
                      isCurrentBlock={false}
                      onPomodoroClick={handleStartPomodoroForBlock}
                      handleOpenEditModal={handleOpenEditModal}
                      handleDeleteBlock={handleDeleteBlock}
                      handleOpenLogModalFromPlan={handleOpenLogModalFromPlan}
                      currentTime={currentTime}
                      activityCategories={activityCategories}
                      tasks={tasks}
                      isDraggable={false}
                      dragId={draggedBlock.id}
                    />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </CardContent>

      {isExternalModalOpen && (
        <TimeBlockEntryModal
          isOpen={isExternalModalOpen}
          onClose={() => setIsExternalModalOpen(false)}
          onSubmitSuccess={handleExternalModalSubmitSuccess}
          mode={externalModalMode}
          initialData={externalModalInitialData}
          selectedDate={dateFnsParseISO(todayDateStringForUI)}
          tasks={tasks}
          activityCategories={activityCategories}
          allowCreationModeSwitch={externalModalMode === "plan-create"}
        />
      )}
    </Card>
  );
} 