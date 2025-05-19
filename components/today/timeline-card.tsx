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
  PlusCircle
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
import { type TimeBlock as DBTimeBlock, ObjectStores, getByIndex as getDBByIndex, remove as removeDB, add as addDB, update as updateDB, get as getDBItem, FixedBreakRule, getAll as getAllDB } from "@/lib/db"
import { useToast } from "@/components/ui/use-toast"

interface UITimeBlock extends DBTimeBlock {
  id: number;
  isCurrent?: boolean;
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

const TIME_BLOCK_TYPES = [
  { value: 'task', label: '工作' },
  { value: 'meeting', label: '会议' },
  { value: 'break', label: '休息' },
  { value: 'personal', label: '个人' },
  { value: 'plan', label: '计划' },
] as const;

type TimeBlockTypeOptionValue = typeof TIME_BLOCK_TYPES[number]['value'];

interface ModalFormData {
  title: string;
  type: TimeBlockTypeOptionValue;
  startTime: string;
  endTime: string;
  taskId?: number | string;
}

interface TimelineCardProps {
  onPomodoroClick: (taskId: string, taskTitle: string) => void;
}


// Helper components for DND - Now simplified
interface TimelineBlockItemContentProps {
  block: UITimeBlock;
  onPomodoroClick: (taskId: string, taskTitle: string) => void;
  handleOpenEditModal: (block: UITimeBlock) => void;
  handleDeleteBlock: (blockId: number, blockTitle: string) => void;
  getIconForType: (type: UITimeBlock['type']) => ReactNode;
  getDisplayType: (type: UITimeBlock['type']) => string;
  currentTime: Date;
}

const TimelineBlockItemContent: FC<TimelineBlockItemContentProps> = ({
  block,
  onPomodoroClick,
  handleOpenEditModal,
  handleDeleteBlock,
  getIconForType,
  getDisplayType,
  currentTime,
}) => {
  const isCurrent = currentTime >= block.startTime && currentTime < block.endTime;
  const typeDisplay = getDisplayType(block.type);

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
              : block.type === "break" 
                ? (block.fixedBreakId ? "bg-teal-100 text-teal-700" : "bg-green-100 text-green-600")
                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
          )}
          title={isCurrent ? "进行中" : (block.fixedBreakId ? `固定${typeDisplay}` : typeDisplay)}
        >
          {isCurrent ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            getIconForType(block.type)
          )}
        </div>
        <div
          className={cn(
            "rounded-lg border p-3 shadow-sm transition-all hover:shadow-md",
            isCurrent
              ? "border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-700"
              : block.type === "break"
                ? (block.fixedBreakId ? "border-teal-200 bg-teal-50 dark:bg-teal-950 dark:border-teal-700" : "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-700")
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
                block.type === "task" ? "border-blue-400 text-blue-600 bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:bg-blue-900/50"
                : block.type === "meeting" ? "border-purple-400 text-purple-600 bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:bg-purple-900/50"
                : block.type === "break"
                  ? (block.fixedBreakId ? "border-teal-400 text-teal-600 bg-teal-50 dark:border-teal-600 dark:text-teal-300 dark:bg-teal-900/50" : "border-green-400 text-green-600 bg-green-50 dark:border-green-600 dark:text-green-300 dark:bg-green-900/50")
                : block.type === "plan" ? "border-amber-400 text-amber-600 bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:bg-amber-900/50"
                : block.type === "personal" ? "border-pink-400 text-pink-600 bg-pink-50 dark:border-pink-600 dark:text-pink-300 dark:bg-pink-900/50"
                : "border-gray-400 text-gray-600 bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-900/50",
              )}
            >
              {block.fixedBreakId ? `固定${typeDisplay}` : typeDisplay}
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
    type: "task",
    startTime: "",
    endTime: "",
    taskId: undefined,
  });

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

      for (const rule of activeRulesForToday) {
        if (rule.id === undefined) continue; 
        const fixedBreakIdStr = String(rule.id);

        if (processedFixedBreakIdsInThisRun.has(fixedBreakIdStr)) continue; 

        const alreadyExistsInInitialLoad = initialExistingBlocks.some(
          block => block.fixedBreakId === fixedBreakIdStr && block.type === 'break' && block.date === todayDateString
        );

        if (!alreadyExistsInInitialLoad) {
          const [startHour, startMinute] = rule.startTime.split(':').map(Number);
          const [endHour, endMinute] = rule.endTime.split(':').map(Number);

          let startTime = new Date(todayDateObj); 
          startTime.setHours(startHour, startMinute, 0, 0);

          let endTime = new Date(todayDateObj); 
          endTime.setHours(endHour, endMinute, 0, 0);
          
          if (endTime.getTime() <= startTime.getTime()) { // use getTime for comparison
              console.warn(`Invalid fixed break rule (end <= start): ${rule.label || rule.id} for ${todayDateString}`);
              continue;
          }

          const newFixedBlockPayload: Omit<DBTimeBlock, 'id'> = {
            title: rule.label || "固定休息",
            type: 'break',
            startTime: startTime,
            endTime: endTime,
            date: todayDateString,
            fixedBreakId: fixedBreakIdStr,
            createdAt: new Date(),
            updatedAt: new Date(),
            taskId: undefined,
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
          if (block.type === 'break' && block.fixedBreakId) {
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
          startTime: new Date(block.startTime), 
          endTime: new Date(block.endTime)
        } as UITimeBlock))
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      
      setTimeBlocks(filteredAndProcessedBlocks);

      if (blocksToRemoveIds.length > 0) {
        console.log("Removing orphaned fixed break blocks from DB:", blocksToRemoveIds);
        // This runs in background, no await needed here not to block UI updates
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
      setTimeBlocks([]); // Clear blocks on error
    } finally {
      isProcessingFixedBreaksRef.current = false;
      // setLoading(false) is handled by callers after fetchTimeBlocks completes or in their error handling.
      // However, if a setLoading(true) was initiated by a general refresh/load that calls this directly,
      // this is a place to ensure loading is false. The current structure has callers manage it.
      // For safety, and given the previous logic, we ensure it's set to false IF it was true.
      // This implies `setLoading(true)` should be called before `fetchTimeBlocks` if a loading state is desired.
      if (loadingRef.current) { // Use a ref to check if the current operation set loading to true
         setLoading(false);
         loadingRef.current = false; // Reset ref
      }
      console.log("fetchTimeBlocks finished. Lock released."); // Removed triggeredBy from log
    }
  }, [todayDateString, toast]); // Assuming toast might be used for displaying errors from DB operations if not caught earlier

  // Ref to track if the current fetch operation set the loading state
  const loadingRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    loadingRef.current = true; // Indicate that this effect initiated loading
    fetchTimeBlocks();
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    const handleExternalTimelineUpdate = () => {
      console.log("timelineShouldUpdate event received, preparing to call fetchTimeBlocks.");
      setLoading(true);
      loadingRef.current = true; // Indicate that this handler initiated loading
      fetchTimeBlocks();
    };
    window.addEventListener('timelineShouldUpdate', handleExternalTimelineUpdate);

    return () => {
      clearInterval(timerId);
      window.removeEventListener('timelineShouldUpdate', handleExternalTimelineUpdate);
    };
  }, [fetchTimeBlocks]); // fetchTimeBlocks is stable due to useCallback

  const getIconForType = (type: UITimeBlock['type']): ReactNode => {
    switch (type) {
      case 'task': return <Activity className="h-4 w-4" />;
      case 'meeting': return <CalendarIcon className="h-4 w-4" />;
      case 'break': return <Coffee className="h-4 w-4" />;
      case 'plan': return <Flag className="h-4 w-4" />;
      case 'personal': return <User className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };
  
  const getDisplayType = (type: UITimeBlock['type']) => {
    switch (type) {
      case 'task': return "工作";
      case 'meeting': return "会议";
      case 'break': return "休息";
      case 'plan': return "计划";
      case 'personal': return "个人";
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
      type: 'task',
      startTime: formatDateToDateTimeLocal(now),
      endTime: formatDateToDateTimeLocal(oneHourLater),
      taskId: undefined,
    });
    setCurrentEditingBlock(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (block: UITimeBlock) => {
    setFormData({
      title: block.title,
      type: block.type,
      startTime: formatDateToDateTimeLocal(new Date(block.startTime)),
      endTime: formatDateToDateTimeLocal(new Date(block.endTime)),
      taskId: block.taskId,
    });
    setCurrentEditingBlock(block);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | TimeBlockTypeOptionValue, fieldName?: keyof ModalFormData) => {
    if (typeof e === 'string' && fieldName === 'type') {
        setFormData(prev => ({ ...prev, type: e as TimeBlockTypeOptionValue }));
    } else if (typeof e !== 'string') {
        const { name, value } = e.target as HTMLInputElement;
         setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleModalSave = async () => {
    const { title, type, startTime: startTimeStr, endTime: endTimeStr, taskId } = formData;

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

    if (end.getTime() <= start.getTime()) { // use getTime for comparison
      toast({ title: "验证错误", description: "结束时间必须在开始时间之后。", variant: "destructive" });
      return;
    }
    
    try {
      setLoading(true);
      if (currentEditingBlock && currentEditingBlock.id) {
        const blockToUpdate: DBTimeBlock = {
          ...currentEditingBlock,
          title,
          type,
          startTime: start,
          endTime: end,
          date: start.toISOString().split('T')[0],
          updatedAt: new Date(),
          taskId: taskId,
        };

        if (blockToUpdate.fixedBreakId) {
          let convertedToNormal = false;
          try {
            const ruleIdNum = parseInt(blockToUpdate.fixedBreakId, 10);
            if (!isNaN(ruleIdNum)) {
              const originalRule = await getDBItem<FixedBreakRule>(ObjectStores.FIXED_BREAK_RULES, ruleIdNum);
              if (originalRule) {
                // Format DB times to compare with rule times (which are HH:MM strings)
                const blockStartTimeFormatted = formatTime(blockToUpdate.startTime);
                const blockEndTimeFormatted = formatTime(blockToUpdate.endTime);

                if (
                  blockToUpdate.type !== 'break' ||
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
          title, type, startTime: start, endTime: end,
          date: start.toISOString().split('T')[0],
          createdAt: new Date(), updatedAt: new Date(),
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

  // Initial loading and error states are handled first
  if (loading && timeBlocks.length === 0 && !error) { // Added !error to ensure error screen shows if error during initial load
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

  // Main return for when data is available or it's loading more data in background
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
                getIconForType={getIconForType}
                getDisplayType={getDisplayType}
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
                disabled={!!(currentEditingBlock?.fixedBreakId && currentEditingBlock.type === 'break')}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">类型</Label>
              <Select 
                name="type"
                value={formData.type}
                onValueChange={(value) => handleModalFormChange(value as TimeBlockTypeOptionValue, 'type')}
                disabled={!!(currentEditingBlock?.fixedBreakId && currentEditingBlock.type === 'break')}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_BLOCK_TYPES.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
                disabled={!!(currentEditingBlock?.fixedBreakId && currentEditingBlock.type === 'break' && formData.type === 'break')}
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
                disabled={!!(currentEditingBlock?.fixedBreakId && currentEditingBlock.type === 'break' && formData.type === 'break')}
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