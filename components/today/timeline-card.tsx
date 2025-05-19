"use client"

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
  Timer
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
import { type TimeBlock as DBTimeBlock, ObjectStores, getByIndex as getDBByIndex, remove as removeDB, add as addDB, update as updateDB, get as getDBItem, FixedBreakRule, getAll as getAllDB, ActivityCategory } from "@/lib/db"
import { useToast } from "@/components/ui/use-toast"

interface UITimeBlock extends Omit<DBTimeBlock, 'isLogged' | 'activityCategoryId'> {
  id: number;
  isCurrent?: boolean;
  isLogged: boolean;
  activityCategoryId?: number;
}

const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
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

interface ModalFormData {
  title: string;
  sourceType: SourceTypeOptionValue;
  activityCategoryId?: string;
  startTime: string;
  endTime: string;
  notes?: string;
  taskId?: number | string;
}

interface TimelineCardProps {
  onPomodoroClick: (taskId: string, taskTitle: string) => void;
}

interface TimelineBlockItemContentProps {
  block: UITimeBlock;
  onPomodoroClick: (taskId: string, taskTitle: string) => void;
  handleOpenEditModal: (block: UITimeBlock) => void;
  handleDeleteBlock: (blockId: number, blockTitle: string) => void;
  getIconForSourceType: (sourceType: UITimeBlock['sourceType'], fixedBreakId?: string) => ReactNode;
  getDisplaySourceType: (sourceType: UITimeBlock['sourceType'], fixedBreakId?: string, activityCategoryName?: string) => string;
  currentTime: Date;
}

const TimelineBlockItemContent: FC<TimelineBlockItemContentProps> = ({
  block,
  onPomodoroClick,
  handleOpenEditModal,
  handleDeleteBlock,
  getIconForSourceType,
  getDisplaySourceType,
  currentTime,
}) => {
  const isCurrent = new Date(currentTime) >= new Date(block.startTime) && new Date(currentTime) < new Date(block.endTime);
  const typeDisplay = getDisplaySourceType(block.sourceType, block.fixedBreakId, block.title);
  const icon = getIconForSourceType(block.sourceType, block.fixedBreakId);

  return (
    <div
      className={cn("transition-shadow")}
    >
      <div className="relative pl-8 pb-4">
        <div
          className={cn(
            "absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center shadow",
            isCurrent
              ? "bg-blue-100 text-blue-600 ring-2 ring-blue-500 ring-offset-1"
              : block.sourceType === "fixed_break"
                ? "bg-teal-100 text-teal-700"
                : block.sourceType === "pomodoro_log"
                ? "bg-yellow-100 text-yellow-700"
                : block.activityCategoryId && block.sourceType === 'manual_entry'
                ? "bg-indigo-100 text-indigo-600"
                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
          )}
          title={isCurrent ? "进行中" : typeDisplay}
        >
          {isCurrent ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            icon
          )}
        </div>
        <div
          className={cn(
            "rounded-lg border p-3 shadow-sm transition-all hover:shadow-md",
            isCurrent
              ? "border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-700"
              : block.sourceType === "fixed_break"
                ? "border-teal-200 bg-teal-50 dark:bg-teal-950 dark:border-teal-700"
                : block.sourceType === "pomodoro_log"
                ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-700"
                : block.activityCategoryId && block.sourceType === 'manual_entry'
                ? "border-indigo-200 bg-indigo-50 dark:bg-indigo-950 dark:border-indigo-700"
                : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700",
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{block.title}</span>
            <span className="text-xs text-muted-foreground">{formatTime(block.startTime)} - {formatTime(block.endTime)}</span>
          </div>
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium",
                block.sourceType === "task_plan" ? "border-blue-400 text-blue-600 bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:bg-blue-900/50"
                : block.sourceType === "fixed_break" ? "border-teal-400 text-teal-600 bg-teal-50 dark:border-teal-600 dark:text-teal-300 dark:bg-teal-900/50"
                : block.sourceType === "pomodoro_log" ? "border-yellow-400 text-yellow-600 bg-yellow-50 dark:border-yellow-600 dark:text-yellow-300 dark:bg-yellow-900/50"
                : block.sourceType === "manual_entry" && block.activityCategoryId ? "border-indigo-400 text-indigo-600 bg-indigo-50 dark:border-indigo-600 dark:text-indigo-300 dark:bg-indigo-900/50"
                : "border-gray-400 text-gray-600 bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-900/50",
              )}
            >
              {typeDisplay}
            </Badge>
            <div className="flex items-center space-x-1">
              {block.taskId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="启动专注"
                  onClick={() => block.taskId && onPomodoroClick(String(block.taskId), block.title)}
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" 
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleOpenEditModal(block)}>
                    <Edit3 className="mr-2 h-4 w-4" /> 编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 hover:!text-red-600 focus:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-900/50 focus:!bg-red-50 dark:focus:!bg-red-900/50"
                    onClick={() => handleDeleteBlock(block.id, block.title)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> 删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function TimelineCard({ onPomodoroClick }: TimelineCardProps) {
  const { toast } = useToast();
  const [timeBlocks, setTimeBlocks] = useState<UITimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [currentEditingBlock, setCurrentEditingBlock] = useState<UITimeBlock | null>(null);
  const [formData, setFormData] = useState<ModalFormData>({
    title: "",
    sourceType: "manual_entry",
    activityCategoryId: undefined,
    startTime: "",
    endTime: "",
    notes: "",
    taskId: undefined,
  });
  const [activityCategories, setActivityCategories] = useState<ActivityCategory[]>([]);

  const isProcessingFixedBreaksRef = useRef(false);

  const todayDateString = getTodayDateString();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTimeBlocks = useCallback(async () => {
    console.log(`fetchTimeBlocks triggered. Lock status: ${isProcessingFixedBreaksRef.current}`);
    if (isProcessingFixedBreaksRef.current) {
      console.warn("fetchTimeBlocks: Processing already in progress by another operation. Skipping this call to avoid conflict.");
      return;
    }

    isProcessingFixedBreaksRef.current = true;
    setError(null);

    try {
      const todayDateObj = new Date(todayDateString + 'T00:00:00');
      const dayOfWeekToday = todayDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      const allFixedRules = await getAllDB<FixedBreakRule>(ObjectStores.FIXED_BREAK_RULES);
      const activeRulesForToday = allFixedRules.filter(rule =>
        rule.isEnabled &&
        rule.daysOfWeek &&
        rule.daysOfWeek.includes(dayOfWeekToday)
      );

      const initialExistingBlocks = await getDBByIndex<DBTimeBlock>(ObjectStores.TIME_BLOCKS, 'byDate', todayDateString);
      const blocksToAdd: Omit<DBTimeBlock, 'id'>[] = [];
      const processedFixedBreakIdsInThisRun = new Set<string>(); 

      try {
        const categories = await getAllDB<ActivityCategory>(ObjectStores.ACTIVITY_CATEGORIES);
        setActivityCategories(categories);
      } catch (catError) {
        console.error("Failed to load activity categories:", catError);
      }

      for (const rule of activeRulesForToday) {
        if (rule.id === undefined) continue; 
        const fixedBreakIdStr = String(rule.id);

        if (processedFixedBreakIdsInThisRun.has(fixedBreakIdStr)) continue; 

        const alreadyExistsInInitialLoad = initialExistingBlocks.some(
          block => block.fixedBreakId === fixedBreakIdStr && 
                   block.sourceType === 'fixed_break' &&
                   block.date === todayDateString
        );

        if (!alreadyExistsInInitialLoad) {
          const [startHour, startMinute] = rule.startTime.split(':').map(Number);
          const [endHour, endMinute] = rule.endTime.split(':').map(Number);

          let startTime = new Date(todayDateObj); 
          startTime.setHours(startHour, startMinute, 0, 0);

          let endTime = new Date(todayDateObj); 
          endTime.setHours(endHour, endMinute, 0, 0);
          
          if (endTime.getTime() <= startTime.getTime()) {
              console.warn(`Invalid fixed break rule (end <= start): ${rule.label || rule.id} for ${todayDateString}`);
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
            date: todayDateString,
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
            await addDB(ObjectStores.TIME_BLOCKS, payload);
          } catch (addError) {
            console.error(`Failed to add fixed break from rule '${payload.title}' to DB:`, addError);
          }
        }
      }

      const allTodayDbBlocksFromDB = await getDBByIndex<DBTimeBlock>(ObjectStores.TIME_BLOCKS, 'byDate', todayDateString);
      const validRuleIdsFromSettings = new Set(allFixedRules.map(rule => String(rule.id)));
      const blocksToRemoveIds: number[] = [];

      const filteredAndProcessedBlocks = allTodayDbBlocksFromDB
        .filter(block => {
          if (block.fixedBreakId && block.sourceType === 'fixed_break') {
            if (!validRuleIdsFromSettings.has(block.fixedBreakId)) {
              console.warn(`Orphaned fixed break block found (ID: ${block.id}, fixedBreakId: ${block.fixedBreakId}, Title: ${block.title}). Scheduled for removal.`);
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
          endTime: new Date(block.endTime)
        } as UITimeBlock))
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
  }, [todayDateString, toast]);

  const loadingRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    loadingRef.current = true;
    fetchTimeBlocks();
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

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

  const getIconForSourceType = (sourceType: UITimeBlock['sourceType'], fixedBreakId?: string): ReactNode => {
    if (fixedBreakId) return <Coffee className="h-4 w-4" />;
    switch (sourceType) {
      case 'task_plan': return <Activity className="h-4 w-4" />;
      case 'manual_entry': return <Edit3 className="h-4 w-4" />;
      case 'pomodoro_log': return <Timer className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };
  
  const getDisplaySourceType = (
    sourceType: UITimeBlock['sourceType'], 
    fixedBreakId?: string, 
    activityCategoryName?: string
  ): string => {
    if (fixedBreakId) return activityCategoryName ? `固定${activityCategoryName}` : "固定休息";
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
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    setFormData({
      title: '',
      sourceType: 'manual_entry',
      activityCategoryId: undefined,
      startTime: formatDateToDateTimeLocal(now),
      endTime: formatDateToDateTimeLocal(oneHourLater),
      notes: '',
      taskId: undefined,
    });
    setCurrentEditingBlock(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (block: UITimeBlock) => {
    setFormData({
      title: block.title,
      sourceType: block.sourceType as SourceTypeOptionValue,
      activityCategoryId: block.activityCategoryId ? String(block.activityCategoryId) : undefined,
      startTime: formatDateToDateTimeLocal(new Date(block.startTime)),
      endTime: formatDateToDateTimeLocal(new Date(block.endTime)),
      notes: block.notes || '',
      taskId: block.taskId,
    });
    setCurrentEditingBlock(block);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SourceTypeOptionValue | string, fieldName?: keyof ModalFormData) => {
    if (typeof e === 'string' && fieldName === 'sourceType') {
        setFormData(prev => ({ ...prev, sourceType: e as SourceTypeOptionValue }));
    } else if (typeof e === 'string' && fieldName === 'activityCategoryId') {
        setFormData(prev => ({ ...prev, activityCategoryId: e }));
    } else if (typeof e !== 'string') {
        const { name, value } = e.target as HTMLInputElement;
         setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleModalSave = async () => {
    const { title, sourceType, activityCategoryId: activityCategoryIdStr, startTime: startTimeStr, endTime: endTimeStr, notes, taskId } = formData;

    if (!title.trim()) {
      toast({ title: "验证错误", description: "标题不能为空。", variant: "destructive" });
      return;
    }
    let start = new Date(startTimeStr);
    let end = new Date(endTimeStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        toast({ title: "验证错误", description: "开始或结束时间无效。", variant: "destructive" });
        return;
    }

    if (end.getTime() <= start.getTime()) {
      toast({ title: "验证错误", description: "结束时间必须在开始时间之后。", variant: "destructive" });
      return;
    }
    
    try {
      setLoading(true);
      if (currentEditingBlock && currentEditingBlock.id) {
        const blockToUpdate: DBTimeBlock = {
          ...currentEditingBlock,
          id: currentEditingBlock.id,
          title,
          sourceType: sourceType,
          activityCategoryId: activityCategoryIdStr ? parseInt(activityCategoryIdStr) : undefined,
          startTime: start,
          endTime: end,
          notes: notes,
          isLogged: currentEditingBlock.isLogged ? 1 : 0,
          date: start.toISOString().split('T')[0],
          updatedAt: new Date(),
          taskId: taskId,
          fixedBreakId: currentEditingBlock.fixedBreakId
        };

        if (blockToUpdate.fixedBreakId) {
          let convertedToNormal = false;
          try {
            const ruleIdNum = parseInt(blockToUpdate.fixedBreakId, 10);
            if (!isNaN(ruleIdNum)) {
              const originalRule = await getDBItem<FixedBreakRule>(ObjectStores.FIXED_BREAK_RULES, ruleIdNum);
              if (originalRule) {
                const blockStartTimeFormatted = formatTime(blockToUpdate.startTime);
                const blockEndTimeFormatted = formatTime(blockToUpdate.endTime);

                if (
                  blockToUpdate.sourceType !== 'fixed_break' ||
                  blockToUpdate.title !== (originalRule.label || "固定休息") || 
                  blockStartTimeFormatted !== originalRule.startTime ||
                  blockEndTimeFormatted !== originalRule.endTime
                ) {
                  convertedToNormal = true;
                }
              } else { 
                convertedToNormal = true;
              }
            } else { 
                convertedToNormal = true;
            }
          } catch (fetchRuleError) {
            console.error("Error fetching original fixed rule for comparison:", fetchRuleError);
            convertedToNormal = true; 
          }
            
          if (convertedToNormal) {
            delete blockToUpdate.fixedBreakId; 
            toast({ title: "提醒", description: "固定休息时段已被修改并转为普通时间块。" , duration: 4000});
          }
        }

        await updateDB(ObjectStores.TIME_BLOCKS, blockToUpdate);
        toast({ title: "更新成功", description: `时间块 "${title}" 已更新。` });

      } else {
        const newBlockPayload: Omit<DBTimeBlock, 'id'> = {
          title, 
          sourceType: 'manual_entry',
          activityCategoryId: activityCategoryIdStr ? parseInt(activityCategoryIdStr) : undefined,
          startTime: start, 
          endTime: end,
          isLogged: 0,
          notes: notes,
          actualStartTime: undefined,
          actualEndTime: undefined,
          date: start.toISOString().split('T')[0],
          createdAt: new Date(), 
          updatedAt: new Date(),
          taskId: taskId,
        };
        await addDB(ObjectStores.TIME_BLOCKS, newBlockPayload);
        toast({ title: "创建成功", description: `时间块 "${title}" 已添加到时间轴。` });
      }
      await fetchTimeBlocks();
      handleModalClose();
    } catch (err) {
      console.error("Failed to save time block:", err);
      toast({ title: "保存失败", description: "无法保存时间块，请重试。", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStartPomodoroForBlock = async (blockTaskId: number | string | undefined, blockTitle: string) => {
    if (!blockTaskId) {
      toast({ title: "错误", description: "此时间块未关联任何任务。", variant: "destructive" });
      return;
    }
    try {
      const taskIdStr = typeof blockTaskId === 'number' ? String(blockTaskId) : blockTaskId;
      onPomodoroClick(taskIdStr, blockTitle);
    } catch (error) {
        console.error("Error starting pomodoro for block's task:", error);
        toast({ title: "错误", description: "无法启动专注，关联的任务可能不存在。", variant: "destructive"});
    }
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
      <CardContent className="pb-2 flex-grow overflow-y-auto">
        {timeBlocks.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-center min-h-[200px]">
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
            <p className="text-md text-muted-foreground">今日时间轴为空。</p>
            <p className="text-sm text-muted-foreground">尝试从任务列表添加，或直接在此处创建时间块。</p>
          </div>
        ) : (
          <div className="space-y-0">
            {timeBlocks.map((block) => (
              <TimelineBlockItemContent
                key={block.id}
                block={block}
                onPomodoroClick={handleStartPomodoroForBlock}
                handleOpenEditModal={handleOpenEditModal}
                handleDeleteBlock={handleDeleteBlock}
                getIconForSourceType={getIconForSourceType}
                getDisplaySourceType={getDisplaySourceType}
                currentTime={currentTime}
              />
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 border-t sticky bottom-0 bg-card">
        <Button variant="outline" size="sm" className="w-full" onClick={handleOpenAddModal} disabled={loading}>
          <PlusCircle className="mr-2 h-4 w-4" /> 添加时间块
        </Button>
      </CardFooter>

      <Dialog open={isModalOpen} onOpenChange={(open) => { if(!open) handleModalClose(); else setIsModalOpen(true);}}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{currentEditingBlock ? '编辑时间块' : '添加新时间块'}</DialogTitle>
            <DialogDescription>
              {currentEditingBlock ? '修改时间块的详细信息。' : '在您的时间轴上创建一个新的安排。'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">标题</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleModalFormChange}
                className="col-span-3"
                placeholder="例如：团队会议"
                disabled={!!(currentEditingBlock?.fixedBreakId && currentEditingBlock.sourceType === 'fixed_break')}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="activityCategoryId" className="text-right">分类</Label> 
              <Select 
                name="activityCategoryId"
                value={formData.activityCategoryId || ""}
                onValueChange={(value) => handleModalFormChange(value as string, 'activityCategoryId')}
                disabled={!!(currentEditingBlock?.fixedBreakId && currentEditingBlock.sourceType === 'fixed_break')}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择活动分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无分类</SelectItem>
                  {activityCategories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startTime" className="text-right">开始时间</Label>
              <Input
                id="startTime"
                name="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={handleModalFormChange}
                className="col-span-3"
                disabled={!!(currentEditingBlock?.fixedBreakId && currentEditingBlock.sourceType === 'fixed_break')}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTime" className="text-right">结束时间</Label>
              <Input
                id="endTime"
                name="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={handleModalFormChange}
                className="col-span-3"
                disabled={!!(currentEditingBlock?.fixedBreakId && currentEditingBlock.sourceType === 'fixed_break')}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">备注</Label>
                <Input 
                    id="notes"
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleModalFormChange}
                    className="col-span-3"
                    placeholder="添加备注 (可选)"
                 />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleModalClose}>取消</Button>
            <Button type="button" onClick={handleModalSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentEditingBlock ? '保存更改' : '创建时间块'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 