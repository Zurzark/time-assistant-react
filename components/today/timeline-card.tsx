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
  Tag as CategoryIcon
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
import { differenceInMinutes, format as formatDateFns, addDays, parseISO as dateFnsParseISO } from 'date-fns';
import TimelineBlockItemContent, { UITimeBlock as TimelineUITimeBlock } from "@/components/time/timeline-block-item-content";

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
      const todayStartUTC = new Date(currentFreshTodayDateString + 'T00:00:00.000Z');
      const todayEndUTC = new Date(currentFreshTodayDateString + 'T23:59:59.999Z');
      
      const localDateParts = currentFreshTodayDateString.split('-').map(Number);
      const localTodayStart = new Date(localDateParts[0], localDateParts[1] - 1, localDateParts[2], 0, 0, 0, 0);

      const [allFixedRules, categories, dbTasks] = await Promise.all([
        getAllDB<FixedBreakRule>(ObjectStores.FIXED_BREAK_RULES),
        getAllDB<ActivityCategory>(ObjectStores.ACTIVITY_CATEGORIES),
        getAllDB<Task>(ObjectStores.TASKS)
      ]);
      setActivityCategories(categories);
      setTasks(dbTasks);

      const dayOfWeekToday = localTodayStart.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      const dateRangeForCandidateBlocks = [
        formatDateFns(addDays(todayStartUTC, -1), "yyyy-MM-dd"), 
        currentFreshTodayDateString, 
        formatDateFns(addDays(todayStartUTC, 1), "yyyy-MM-dd")  
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
            new Date(block.startTime) >= todayStartUTC && new Date(block.startTime) < addDays(todayStartUTC,1) 
        );

        if (!alreadyExistsAsTodayBlock) {
          const [startHour, startMinute] = rule.startTime.split(':').map(Number);
          const [endHour, endMinute] = rule.endTime.split(':').map(Number);

          let startTime = new Date(localTodayStart);
          startTime.setHours(startHour, startMinute, 0, 0);

          let endTime = new Date(localTodayStart);
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

          if (block.title === "记录" || (block.id === 45 && block.date === "2025-05-19")) { 
            console.log(`TimelineCard Filter Debug for block "${block.title}" (ID: ${block.id}, DBDate: ${block.date}):`);
            console.log(`  block.startTime (raw from DB): ${block.startTime}`);
            console.log(`  block.endTime (raw from DB): ${block.endTime}`);
            console.log(`  blockStartTime (JS Date obj): ${blockStartTime.toISOString()} (Local: ${blockStartTime.toString()})`);
            console.log(`  blockEndTime (JS Date obj): ${blockEndTime.toISOString()} (Local: ${blockEndTime.toString()})`);
            console.log(`  Using currentFreshTodayDateString for filtering: ${currentFreshTodayDateString}`); 
            console.log(`  todayStartUTC (for filtering): ${todayStartUTC.toISOString()} (Local: ${new Date(todayStartUTC.getFullYear(), todayStartUTC.getUTCMonth(), todayStartUTC.getUTCDate(), 0,0,0).toString()})`);
            console.log(`  todayEndUTC (for filtering): ${todayEndUTC.toISOString()} (Local: ${new Date(todayEndUTC.getFullYear(), todayEndUTC.getUTCMonth(), todayEndUTC.getUTCDate(), 23,59,59,999).toString()})`);
            const condition1 = blockStartTime < todayEndUTC;
            const condition2 = blockEndTime > todayStartUTC;
            console.log(`  Condition1 (blockStartTime < todayEndUTC): ${condition1}`);
            console.log(`  Condition2 (blockEndTime > todayStartUTC): ${condition2}`);
            console.log(`  Overall overlapsToday evaluation: ${condition1 && condition2}`);
          }
          
          const overlapsToday = blockStartTime < todayEndUTC && blockEndTime > todayStartUTC;
          
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
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const minutesFromStartOfDay = differenceInMinutes(now, startOfDay);
      const totalMinutesInDay = 24 * 60;
      const clampedMinutes = Math.min(Math.max(minutesFromStartOfDay, 0), totalMinutesInDay);
      const percentageOfDay = clampedMinutes / totalMinutesInDay;
      
      const scrollHeight = cardContentRef.current.scrollHeight;
      const clientHeight = cardContentRef.current.clientHeight;

      const effectiveHeight = scrollHeight > clientHeight ? scrollHeight : clientHeight;
      let newPosition = percentageOfDay * effectiveHeight;
      
      newPosition = Math.max(0, Math.min(newPosition, scrollHeight - 2));

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
      } finally {
        setLoading(false);
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
    if (suggestedStartTime < now) {
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
    });
    setExternalModalMode("plan-create");
    setIsExternalModalOpen(true);
  };

  const handleOpenEditModal = (block: TimelineUITimeBlock) => {
    setExternalModalInitialData({
        ...block,
        date: block.date,
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
      sourceType: block.sourceType,
      originalPlan: { 
        startTime: new Date(block.startTime),
        endTime: new Date(block.endTime)
      },
      startTime: new Date(block.startTime),
      endTime: new Date(block.endTime),
    });
    setExternalModalMode("plan-to-log");
    setIsExternalModalOpen(true);
  };

  const handleExternalModalSubmitSuccess = async () => {
    setIsExternalModalOpen(false);
    setLoading(true);
    await fetchTimeBlocks();
  };

  const handleStartPomodoroForBlock = async (blockTaskId: number | string | undefined, blockTitle: string) => {
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
          <Button variant="outline" size="sm" onClick={() => {setLoading(true); fetchTimeBlocks();}} className="mt-4">
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
        </div>
        <CardDescription>您今日的日程安排 {loading && timeBlocks.length > 0 && "(更新中...)"}</CardDescription>
      </CardHeader>
      <CardContent ref={cardContentRef} className="pb-2 flex-grow overflow-y-auto relative">
        {/* Past Time Mask */}
        {getTodayDateString() === todayDateStringForUI && !loading && timeBlocks.length > 0 && (
          <div
            className="absolute top-0 left-0 right-0 bg-gray-500/15 dark:bg-gray-600/20 z-[5] pointer-events-none"
            style={{ height: `${indicatorPosition}px` }}
            aria-hidden="true"
          />
        )}

        {/* Current Time Indicator */}
        {getTodayDateString() === todayDateStringForUI && !loading && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-blue-500/75 z-10 transition-all duration-300 ease-linear pointer-events-none"
            style={{ top: `${indicatorPosition}px` }}
            title={`当前时间: ${formatTime(currentTime)}`}
          >
            <div className="absolute -left-0.5 -top-[2.5px] h-1.5 w-1.5 rounded-full bg-blue-500/75"></div>
          </div>
        )}

        {timeBlocks.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-center min-h-[200px]">
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
            <p className="text-md text-muted-foreground">今日时间轴为空。</p>
            <p className="text-sm text-muted-foreground">尝试从任务列表添加，或直接在此处创建时间块。</p>
          </div>
        ) : (
          <div className="space-y-0">
            {timeBlocks.map((block, index) => {
              const blockStartTime = new Date(block.startTime);
              const blockEndTime = new Date(block.endTime);
              const isCurrentBlock =
                new Date(currentTime) >= blockStartTime &&
                new Date(currentTime) < blockEndTime;

              let gapSpacer: ReactNode = null;
              if (index > 0) {
                const prevBlock = timeBlocks[index - 1];
                const prevBlockEndTime = new Date(prevBlock.endTime);
                const currentBlockStartTime = new Date(block.startTime);
                const diffMinutes = differenceInMinutes(currentBlockStartTime, prevBlockEndTime);

                if (diffMinutes > 1) {
                  const minSpacerHeight = 8;
                  const spacerHeight = Math.max(minSpacerHeight, diffMinutes * 0.35);
                  gapSpacer = (
                    <div 
                      style={{ height: `${spacerHeight}px` }}
                      className="w-full opacity-50"
                      title={`空闲: ${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`}
                    >
                    </div>
                  );
                }
              }

              return (
                <React.Fragment key={block.id}>
                  {gapSpacer}
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
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 border-t sticky bottom-0 bg-card">
        <Button variant="outline" size="sm" className="w-full" onClick={handleOpenAddModal} disabled={loading}>
          <PlusCircle className="mr-2 h-4 w-4" /> 添加时间块
        </Button>
      </CardFooter>

      {isExternalModalOpen && (
        <TimeBlockEntryModal
          isOpen={isExternalModalOpen}
          onClose={() => setIsExternalModalOpen(false)}
          onSubmitSuccess={handleExternalModalSubmitSuccess}
          mode={externalModalMode}
          initialData={externalModalInitialData}
          selectedDate={new Date(todayDateStringForUI)}
          tasks={tasks}
          activityCategories={activityCategories}
        />
      )}
    </Card>
  );
} 