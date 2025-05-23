"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { addDays, format, startOfToday, startOfWeek, addWeeks, eachDayOfInterval, parseISO, getMonth, getYear, getDate, differenceInCalendarDays, isSameDay, isToday as dateFnsIsToday, endOfMonth, startOfMonth, eachWeekOfInterval, endOfWeek, differenceInMinutes, set } from "date-fns"
import { zhCN } from "date-fns/locale"
import { CalendarIcon, ChevronLeft, ChevronRight, Clock, Filter, MoreHorizontal, Plus, Loader2, AlertCircle, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TimeBlockEntryModal, TimeBlockModalMode } from "@/components/time/time-block-entry-modal"
import { 
  ObjectStores, 
  getAll as getAllDB, 
  add as addDB, 
  update as updateDB, 
  remove as removeDB,
  getByIndex as getByIndexDB,
  type TimeBlock, 
  type Task, 
  type ActivityCategory 
} from "@/lib/db"
import { useToast } from "@/components/ui/use-toast"
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  useDraggable,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import { SelectedDateEvents } from "@/components/calendars/selected-date-events";
import { UpcomingEvents } from "@/components/calendars/upcoming-events";
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

// 辅助函数：将日期对象转换为 YYYY-MM-DD 字符串
const formatDateToYYYYMMDD = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

// 将 TimeBlock 数组中的 Date 字符串转换为 Date 对象
// 确保 startTime 和 endTime 始终是 Date 对象，actualStartTime/EndTime 也是（如果存在）
const processTimeBlocks = (blocks: TimeBlock[]): TimeBlock[] => {
  return blocks.map(block => ({
    ...block,
    startTime: typeof block.startTime === 'string' ? parseISO(block.startTime) : block.startTime,
    endTime: typeof block.endTime === 'string' ? parseISO(block.endTime) : block.endTime,
    actualStartTime: block.actualStartTime ? (typeof block.actualStartTime === 'string' ? parseISO(block.actualStartTime) : block.actualStartTime) : undefined,
    actualEndTime: block.actualEndTime ? (typeof block.actualEndTime === 'string' ? parseISO(block.actualEndTime) : block.actualEndTime) : undefined,
    createdAt: typeof block.createdAt === 'string' ? parseISO(block.createdAt) : block.createdAt,
    updatedAt: typeof block.updatedAt === 'string' ? parseISO(block.updatedAt) : block.updatedAt,
  }));
};

// 给日视图和月视图的时间块生成一致的样式类名
const getTimeBlockClassName = (block: TimeBlock): string => {
  // 基础类名
  let className = "rounded-md shadow-sm ";
  
  // 根据时间块类型添加不同的颜色类
  if (block.sourceType === 'fixed_break') {
    // 固定休息：浅灰色
    className += "bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300 ";
  } else if (block.isLogged === 1) {
    // 已记录：绿色
    className += "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 ";
  } else {
    // 计划中：蓝色
    className += "bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300 ";
  }
  
  return className;
};

// 可拖拽的时间块组件 (日视图)
function DraggableTimeBlock({ block, tasks, getActivityCategoryInfo, setModalInitialData, setModalMode, setIsModalOpen }: { 
  block: TimeBlock; 
  tasks: Task[];
  getActivityCategoryInfo: (activityCategoryId?: number) => { name: string; color: string; icon?: string };
  setModalInitialData: (data: Partial<TimeBlock & { originalPlan?: { startTime: Date; endTime: Date } }>) => void;
  setModalMode: (mode: TimeBlockModalMode) => void;
  setIsModalOpen: (isOpen: boolean) => void;
}) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: `draggable-${block.id}`,
    data: { block }, // 传递整个block对象
    disabled: block.isLogged === 1, // 已记录的不可拖动
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 100 : undefined, // 拖动时提高层级
    opacity: isDragging ? 0.7 : 1,
  } : {
    opacity: isDragging ? 0.7 : 1,
  };
  
  // 使用类名而不是内联样式来设置颜色
  const blockClassNames = getTimeBlockClassName(block);
  
  const blockStartTime = block.isLogged ? block.actualStartTime! : block.startTime!;
  const blockEndTime = block.isLogged ? block.actualEndTime! : block.endTime!;
  
  const startMinutes = blockStartTime.getMinutes();
  const durationInMinutes = differenceInMinutes(blockEndTime, blockStartTime);
  const height = (durationInMinutes / 60) * 48; // 每小时高度为48px
  const topPosition = (startMinutes / 60) * 48;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'absolute', // 确保拖动时能脱离文档流
        left: '4px', // 调整以适应父容器内边距和 grip
        right: '4px',
        top: `${topPosition}px`,
        height: `${Math.max(height, 20)}px`,
      }}
      className={cn(
        blockClassNames,
        "mx-px p-1.5 overflow-hidden text-xs",
        block.isLogged === 1 ? "cursor-not-allowed" : "cursor-grab",
        isDragging && "shadow-xl ring-2 ring-primary"
      )}
      onClick={(e) => {
        // 如果正在拖动，不触发点击
        if (isDragging) {
          e.stopPropagation();
          return;
        }
        setModalInitialData({...block}); 
        setModalMode(block.isLogged ? "log-edit" : "plan-edit");
        setIsModalOpen(true);
      }}
      {...(block.isLogged === 0 ? attributes : {})} // 仅当未记录时应用拖动属性
      {...(block.isLogged === 0 ? listeners : {})} // 仅当未记录时应用拖动监听器
    >
      <div className="flex items-center justify-between h-full">
        {block.isLogged === 0 && <GripVertical className="h-4 w-4 mr-1 flex-shrink-0 cursor-grab" {...attributes} {...listeners} />}
        <div className="flex-grow min-w-0">
          <div className="font-medium text-sm truncate">{block.title}</div>
          <div className="text-xs">
            {format(blockStartTime, "HH:mm")} - {format(blockEndTime, "HH:mm")}
          </div>
          {tasks.find(t => t.id === block.taskId)?.title && <div className="text-xs truncate mt-0.5">任务: {tasks.find(t => t.id === block.taskId)?.title}</div>}
        </div>
      </div>
    </div>
  );
}

// 小时槽作为放置区域的组件
function DroppableHourSlot({ hour, children }: { hour: number; children: React.ReactNode }) {
  const {setNodeRef, isOver} = useDroppable({
    id: `droppable-hour-${hour}`,
    data: { hour }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "flex-1 border-t border-muted h-12 relative",
        isOver && "bg-primary/20 outline-dashed outline-2 outline-offset-[-2px] outline-primary" // 放置时的视觉反馈
      )}
    >
      {children}
    </div>
  );
}


export function CalendarView() {
  const { toast } = useToast();
  const today = startOfToday()
  
  // 核心状态
  const [currentDate, setCurrentDate] = useState(today) // 用于日历导航的主要日期锚点 (例如，当前月份的任何一天，当前周的任何一天)
  const [selectedDate, setSelectedDate] = useState(today) // 用户明确选择的日期，用于右侧边栏或日视图显示
  const [currentView, setCurrentView] = useState<"day" | "week" | "month">("week")
  
  // 数据状态
  const [allTimeBlocks, setAllTimeBlocks] = useState<TimeBlock[]>([])
  const [activityCategories, setActivityCategories] = useState<ActivityCategory[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  
  // UI状态
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 模态框状态
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<TimeBlockModalMode>("plan-create")
  const [modalInitialData, setModalInitialData] = useState<Partial<TimeBlock & { originalPlan?: { startTime: Date; endTime: Date } }> | undefined>(undefined)

  // 当前时间状态，用于日视图指示器
  const [currentTimeForIndicator, setCurrentTimeForIndicator] = useState(new Date());

  // DND 状态
  const [activeDragItem, setActiveDragItem] = useState<TimeBlock | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 拖动8px后才激活，防止误触
      },
    })
  );

  // 添加删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [blockToDelete, setBlockToDelete] = useState<{id: number, title: string} | null>(null)

  // 数据获取函数
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [timeBlocksData, categoriesData, tasksData] = await Promise.all([
        getAllDB<TimeBlock>(ObjectStores.TIME_BLOCKS),
        getAllDB<ActivityCategory>(ObjectStores.ACTIVITY_CATEGORIES),
        getAllDB<Task>(ObjectStores.TASKS),
      ]);
      setAllTimeBlocks(processTimeBlocks(timeBlocksData));
      setActivityCategories(categoriesData);
      setTasks(tasksData.filter(task => task.isDeleted === 0));
    } catch (err) {
      console.error("Error fetching data for calendar:", err);
      setError("无法加载日历数据，请稍后重试。");
      toast({
        title: "数据加载失败",
        description: "无法从数据库获取所需信息。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // 初始化数据加载
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 获取当前周的日期 (基于 currentDate)
  const currentWeekDays = useMemo(() => {
    const startOfGivenWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({
      start: startOfGivenWeek,
      end: addDays(startOfGivenWeek, 6),
    });
  }, [currentDate]);

  // 根据 selectedDate 获取其时间块 (已排序)
  const timeBlocksForSelectedDate = useMemo(() => {
    const selectedDateStr = formatDateToYYYYMMDD(selectedDate);
    return allTimeBlocks
      .filter(block => block.date === selectedDateStr)
      .sort((a, b) => {
        const startTimeA = a.isLogged ? a.actualStartTime : a.startTime;
        const startTimeB = b.isLogged ? b.actualStartTime : b.startTime;
        if (!startTimeA || !startTimeB) return 0; 
        return startTimeA.getTime() - startTimeB.getTime();
      });
  }, [allTimeBlocks, selectedDate]);
  
  // 获取即将到来的事件 (未来7天内未记录的)
  const upcomingTimeBlocks = useMemo(() => {
    const tomorrow = addDays(today, 1);
    const sevenDaysLater = addDays(today, 7);
    
    return allTimeBlocks
      .filter(block => {
        if (block.isLogged === 1) return false;
        const blockStartTime = block.startTime;
        if (!blockStartTime) return false;
        return differenceInCalendarDays(blockStartTime, tomorrow) >= 0 && differenceInCalendarDays(blockStartTime, sevenDaysLater) <= 0;
      })
      .sort((a, b) => {
        if (!a.startTime || !b.startTime) return 0;
        return a.startTime.getTime() - b.startTime.getTime();
      })
      .slice(0, 5); 
  }, [allTimeBlocks, today]);


  // 辅助函数：获取活动分类的颜色和标签
  const getActivityCategoryInfo = useCallback((activityCategoryId?: number) => {
    const category = activityCategories.find(cat => cat.id === activityCategoryId);
    return {
      name: category?.name || "未知分类",
      color: category?.color || "#808080", 
      icon: category?.icon 
    };
  }, [activityCategories]);
  
  // 获取事件类型标签 (旧逻辑，将用 getActivityCategoryInfo 替代)
  const getEventTypeLabel = (block: TimeBlock) => {
    return getActivityCategoryInfo(block.activityCategoryId).name;
  };


  // 顶部导航栏操作
  const goToPreviousPeriod = () => {
    if (currentView === "day") {
      const newDate = addDays(selectedDate, -1);
      setSelectedDate(newDate);
      setCurrentDate(newDate); 
    } else if (currentView === "week") {
      setCurrentDate(addWeeks(currentDate, -1));
    } else { // month
      setCurrentDate(addDays(startOfMonth(currentDate), -1)); 
    }
  };

  const goToNextPeriod = () => {
    if (currentView === "day") {
      const newDate = addDays(selectedDate, 1);
      setSelectedDate(newDate);
      setCurrentDate(newDate);
    } else if (currentView === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else { // month
      setCurrentDate(addDays(endOfMonth(currentDate), 1)); 
    }
  };

  const goToToday = () => {
    setCurrentDate(today);
    setSelectedDate(today);
  };
  
  const handleViewChange = (view: "day" | "week" | "month") => {
    setCurrentView(view);
  };

  const handleAddEventClick = () => {
    let modalDate = selectedDate;
    if (currentView === 'month') {
        if (!isSameDay(startOfMonth(selectedDate), startOfMonth(currentDate))) {
            modalDate = startOfMonth(currentDate);
        }
    } else if (currentView === 'week') {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        if (selectedDate < weekStart || selectedDate > weekEnd) {
            modalDate = weekStart;
        }
    }
    setModalInitialData({ date: formatDateToYYYYMMDD(modalDate) });
    setModalMode("plan-create");
    setIsModalOpen(true);
  };
  
  const handleModalSubmitSuccess = (timeBlock: TimeBlock) => {
    fetchData(); 
    setIsModalOpen(false);
    toast({
      title: modalMode.includes("create") ? "创建成功" : "更新成功",
      description: `时间块 "${timeBlock.title}" 已保存。`,
    });
  };

  // --- 右侧边栏事件处理函数 ---
  const handleEditBlockInSidebar = (block: TimeBlock) => {
    setModalInitialData({...block});
    setModalMode(block.isLogged ? "log-edit" : "plan-edit");
    setIsModalOpen(true);
  };

  const handleConvertToLogInSidebar = (block: TimeBlock) => {
    setModalInitialData({...block, originalPlan: { startTime: block.startTime, endTime: block.endTime } });
    setModalMode("plan-to-log");
    setIsModalOpen(true);
  };

  const handleDeleteBlockInSidebar = async (blockId: number, blockTitle: string) => {
    setBlockToDelete({ id: blockId, title: blockTitle });
    setDeleteConfirmOpen(true);
  };
  
  const handleAddEventToSelectedDateFromSidebar = () => {
    setModalInitialData({ date: formatDateToYYYYMMDD(selectedDate) });
    setModalMode("plan-create");
    setIsModalOpen(true);
  };

  const handleSelectUpcomingEventInSidebar = (block: TimeBlock) => {
    // Upcoming events are always plans, so open in plan-edit mode
    setModalInitialData({...block});
    setModalMode("plan-edit");
    setIsModalOpen(true);
  };

  // 确认删除时间块的处理函数
  const confirmDeleteBlock = async () => {
    if (!blockToDelete) return;
    
    try {
      await removeDB(ObjectStores.TIME_BLOCKS, blockToDelete.id);
      fetchData();
      toast({ title: "已删除", description: `"${blockToDelete.title}" 已被删除。`});
      setBlockToDelete(null);
    } catch (e) {
      toast({ title: "删除失败", description: `无法删除: ${e}`, variant: "destructive"});
    }
  };

  // --- 月视图相关计算 ---
  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  const timeBlocksForMonthView = useMemo(() => {
    const monthStartStr = formatDateToYYYYMMDD(startOfMonth(currentDate));
    const monthEndStr = formatDateToYYYYMMDD(endOfMonth(currentDate));
    
    return allTimeBlocks.filter(block => {
        return block.date >= monthStartStr && block.date <= monthEndStr;
    });
  }, [allTimeBlocks, currentDate]);

  useEffect(() => {
    if (currentView === "day" && dateFnsIsToday(selectedDate)) {
      const timerId = setInterval(() => {
        setCurrentTimeForIndicator(new Date());
      }, 60000); 
      return () => clearInterval(timerId);
    }
  }, [currentView, selectedDate]);

  // DND拖拽结束处理
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragItem(null);
    const {active, over} = event;

    if (active && over && active.id !== over.id) {
      const draggedBlock = active.data.current?.block as TimeBlock | undefined;
      const targetDroppableId = over.id.toString();
      
      // 日视图拖拽逻辑
      if (draggedBlock && draggedBlock.id !== undefined && targetDroppableId.startsWith('droppable-hour-') && currentView === 'day' && draggedBlock.isLogged === 0) {
        const targetHour = parseInt(targetDroppableId.replace('droppable-hour-', ''), 10);
        if (isNaN(targetHour)) return;

        const originalStartTime = draggedBlock.startTime;
        const duration = differenceInMinutes(draggedBlock.endTime, originalStartTime);
        
        // 计算基于鼠标位置的精确分钟
        let newStartMinute = 0;
        if (active.rect.current.translated && over.rect) {
            const hourSlotHeight = over.rect.height; // 通常是48px
            const relativeY = active.rect.current.translated.top - over.rect.top;
            // 将 slotHeight 分为4段 (0-14, 15-29, 30-44, 45-59)
            const segmentHeight = hourSlotHeight / 4;
            const segmentIndex = Math.floor(relativeY / segmentHeight);
            newStartMinute = Math.max(0, Math.min(3, segmentIndex)) * 15; // 对齐到0, 15, 30, 45
        }

        const newStartTime = set(originalStartTime, { hours: targetHour, minutes: newStartMinute, seconds: 0, milliseconds: 0 });
        let tempEndTime = new Date(newStartTime);
        tempEndTime.setMinutes(tempEndTime.getMinutes() + duration);

        // 如果拖动后的小时和计算出的分钟与原块的开始时间和分钟相同，则不更新
        if (newStartTime.getHours() === originalStartTime.getHours() && newStartTime.getMinutes() === originalStartTime.getMinutes()) {
            console.log("Block dragged but resulted in no change to start time. No update needed.");
            return;
        }

        const updatedBlock: TimeBlock = {
          ...draggedBlock,
          startTime: newStartTime,
          endTime: tempEndTime,
          updatedAt: new Date(),
        };

        try {
          setIsLoading(true);
          await updateDB(ObjectStores.TIME_BLOCKS, updatedBlock);
          toast({
            title: "时间块已移动",
            description: `"${updatedBlock.title}" 已更新到新的时间。`,
          });
          fetchData(); 
        } catch (dbError) {
          console.error("Error updating time block after drag:", dbError);
          toast({
            title: "移动失败",
            description: "无法保存时间块的更改。",
            variant: "destructive",
          });
          fetchData(); 
        } finally {
          setIsLoading(false);
        }
      } else if (draggedBlock && targetDroppableId.startsWith('droppable-day-')) { 
        // 周视图拖拽逻辑 (TODO)
        console.log("Dragged to week view day cell:", targetDroppableId, draggedBlock);
      }
    }
  };
  
  const handleDragStart = (event: DragEndEvent) => {
    const { active } = event;
    const item = allTimeBlocks.find(b => `draggable-${b.id}` === active.id);
    if (item) {
        setActiveDragItem(item);
    }
  };


  // --- 渲染占位符和加载状态 ---
  if (isLoading && allTimeBlocks.length === 0) {
    return (
      <div className="container py-6 space-y-8 flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">正在加载日历数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-6 space-y-8 flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive-foreground mt-4">{error}</p>
        <Button onClick={fetchData} className="mt-4">重试</Button>
      </div>
    );
  }
  
  // 获取用于卡片头部显示的日期范围或标题
  const getCalendarHeaderTitle = () => {
    if (currentView === "day") {
      return format(selectedDate, "yyyy年MM月dd日 EEEE", { locale: zhCN });
    } else if (currentView === "week") {
      const weekStart = currentWeekDays[0];
      const weekEnd = currentWeekDays[6];
      // Handle case where week spans across two months or years
      if (getYear(weekStart) !== getYear(weekEnd)) {
        return `${format(weekStart, "yyyy年MM月dd日", { locale: zhCN })} - ${format(weekEnd, "yyyy年MM月dd日", { locale: zhCN })}`;
      } else if (getMonth(weekStart) !== getMonth(weekEnd)) {
        return `${format(weekStart, "yyyy年MM月dd日", { locale: zhCN })} - ${format(weekEnd, "MM月dd日", { locale: zhCN })}`;
      } else {
        return `${format(weekStart, "yyyy年MM月dd日", { locale: zhCN })} - ${format(weekEnd, "dd日", { locale: zhCN })}`;
      }
    } else { // month
      return format(currentDate, "yyyy年MM月", { locale: zhCN });
    }
  };


  return (
    <div className="container py-6 space-y-8">
      {/* 顶部控制栏 */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">日历</h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              今天
            </Button>
            <Button variant="outline" size="icon" onClick={goToPreviousPeriod}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextPeriod}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Select value={currentView} onValueChange={(value) => handleViewChange(value as "day" | "week" | "month")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="选择视图" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">日视图</SelectItem>
                <SelectItem value="week">周视图</SelectItem>
                <SelectItem value="month">月视图</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddEventClick}>
              <Plus className="h-4 w-4 mr-2" />
              添加时间块
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
           {/* 显示当前导航锚点的月份，例如周视图跨月份时，显示currentDate所在的月份 */}
          {currentView === 'week' ? 
            `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy年MM月", { locale: zhCN })}` + 
            (getMonth(startOfWeek(currentDate, { weekStartsOn: 1 })) !== getMonth(endOfWeek(currentDate, { weekStartsOn: 1 })) ? 
             ` - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MM月", { locale: zhCN })}` : "")
            : format(currentDate, "yyyy年MM月", { locale: zhCN })
          }
        </p>
      </div>

      {/* 主日历区域和右侧边栏 */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {/* 主日历 */}
        <div className="md:col-span-5">
          <Card className="h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>
                  {getCalendarHeaderTitle()}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    筛选
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-h-[600px]"> {/* 确保内容区域有足够高度 */}
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <Tabs defaultValue="week" value={currentView} className="h-full">
                  <TabsList className="hidden"> {/* 实际切换通过顶部的Select完成 */}
                    <TabsTrigger value="day">日视图</TabsTrigger>
                    <TabsTrigger value="week">周视图</TabsTrigger>
                    <TabsTrigger value="month">月视图</TabsTrigger>
                  </TabsList>

                  {/* 日视图内容 */}
                  <TabsContent value="day" className="h-full">
                    <div className="space-y-0.5 h-full overflow-y-auto pr-1 relative" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                      {/* 当前时间指示器 */}
                      {currentView === 'day' && dateFnsIsToday(selectedDate) && (
                        <div 
                          className="absolute left-16 right-0 h-0.5 bg-red-500 z-10" 
                          style={{ top: `${(currentTimeForIndicator.getHours() * 60 + currentTimeForIndicator.getMinutes()) / (24*60) * (48*24)}px`}}
                          title={`当前时间: ${format(currentTimeForIndicator, "HH:mm")}`}
                        >
                          <div className="absolute -left-1.5 -top-1 h-3 w-3 bg-red-500 rounded-full"></div>
                        </div>
                      )}
                      {Array.from({ length: 24 }).map((_, hour) => (
                        <div key={hour} className="flex items-start min-h-[48px]"> {/* Ensure min height for hour slot */}
                          <div className="w-16 text-xs text-muted-foreground py-2 pr-2 text-right shrink-0">
                            {hour.toString().padStart(2, "0")}:00
                          </div>
                          <DroppableHourSlot hour={hour}>
                            <div 
                              className="h-full w-full" // 使内部div充满DroppableHourSlot，用于双击
                              onDoubleClick={() => {
                                if (currentView === 'day') {
                                  const newStartTime = new Date(selectedDate);
                                  newStartTime.setHours(hour, 0, 0, 0);
                                  const newEndTime = new Date(selectedDate);
                                  newEndTime.setHours(hour + 1, 0, 0, 0);

                                  setModalInitialData({
                                    date: formatDateToYYYYMMDD(selectedDate),
                                    startTime: newStartTime,
                                    endTime: newEndTime,
                                  });
                                  setModalMode("plan-create");
                                  setIsModalOpen(true);
                                }
                              }}
                            />
                            {timeBlocksForSelectedDate
                              .filter(block => {
                                const blockStartTime = block.isLogged ? block.actualStartTime : block.startTime;
                                return blockStartTime && blockStartTime.getHours() === hour;
                              })
                              .map((block) => (
                                <DraggableTimeBlock 
                                  key={block.id} 
                                  block={block}
                                  tasks={tasks}
                                  getActivityCategoryInfo={getActivityCategoryInfo}
                                  setModalInitialData={setModalInitialData}
                                  setModalMode={setModalMode}
                                  setIsModalOpen={setIsModalOpen}
                                />
                              ))}
                          </DroppableHourSlot>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* 周视图内容 */}
                  <TabsContent value="week" className="h-full">
                    <div className="grid grid-cols-7 gap-px border-l border-t border-muted"> {/* 使用gap-px和边框创建单元格线 */}
                      {currentWeekDays.map((day) => (
                        <div
                          key={day.toString()}
                          className={cn(
                            "p-2 border-r border-b border-muted min-h-[120px] relative", // 每个单元格加右和下边框
                            formatDateToYYYYMMDD(day) === formatDateToYYYYMMDD(selectedDate)
                              ? "bg-primary/10" // 淡色高亮选中日
                              : "hover:bg-muted/50",
                            dateFnsIsToday(day) && "bg-amber-100/50 dark:bg-amber-800/20" // 今天特殊背景
                          )}
                          onClick={() => setSelectedDate(day)}
                        >
                          <div className="text-center mb-1">
                            <div className="text-xs font-medium mb-0.5">{format(day, "EEE", { locale: zhCN })}</div>
                          <div
                            className={cn(
                              "text-2xl",
                                dateFnsIsToday(day) && "text-primary font-bold"
                            )}
                          >
                            {format(day, "d")}
                            </div>
                          </div>
                          <div className="mt-1 space-y-1">
                            {allTimeBlocks
                              .filter(block => block.date === formatDateToYYYYMMDD(day))
                              .sort((a,b) => (a.startTime?.getTime() ?? 0) - (b.startTime?.getTime() ?? 0))
                              .slice(0, 3) // 最多显示3个
                              .map((block) => {
                                // 使用一致的颜色逻辑
                                const blockClassNames = getTimeBlockClassName(block);
                                return (
                                  <div
                                    key={block.id}
                                    className={cn(
                                      blockClassNames,
                                      "text-xs p-1 rounded truncate cursor-pointer"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation(); // 防止触发父级onClick (setSelectedDate)
                                      setModalInitialData({...block});
                                      setModalMode(block.isLogged ? "log-edit" : "plan-edit");
                                      setIsModalOpen(true);
                                    }}
                                    title={`${format(block.startTime, "HH:mm")} ${block.title}`}
                                  >
                                    {format(block.startTime, "HH:mm")} {block.title}
                                  </div>
                                );
                              })}
                            {allTimeBlocks.filter(block => block.date === formatDateToYYYYMMDD(day)).length > 3 && (
                              <div className="text-xs text-muted-foreground text-center mt-1">
                                +
                                {allTimeBlocks.filter(block => block.date === formatDateToYYYYMMDD(day)).length - 3}{" "}
                                更多
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* 月视图内容 */}
                  <TabsContent value="month" className="h-full">
                    <div className="grid grid-cols-7">
                      {/* 月视图表头：周一到周日 */}
                      {["一", "二", "三", "四", "五", "六", "日"].map((dayHeader) => (
                        <div key={dayHeader} className="text-center p-2 text-sm font-medium text-muted-foreground border-b border-r border-muted">
                          {dayHeader}
                        </div>
                      ))}
                       {/* 月视图日期单元格 */}
                      {daysInMonth.map((day, i) => {
                        const dayStr = formatDateToYYYYMMDD(day);
                        const blocksForThisDay = timeBlocksForMonthView.filter(b => b.date === dayStr);
                        const isCurrentMonth = getMonth(day) === getMonth(currentDate) && getYear(day) === getYear(currentDate);
                        return (
                          <div
                            key={day.toString()}
                            className={cn(
                              "border-r border-b border-muted p-1 h-28 overflow-hidden hover:bg-muted/30 dark:hover:bg-muted/20 cursor-pointer flex flex-col",
                              !isCurrentMonth && "bg-muted/20 dark:bg-slate-800/30 text-muted-foreground/50",
                              dateFnsIsToday(day) && "bg-amber-100/70 dark:bg-amber-700/40 relative", 
                              formatDateToYYYYMMDD(day) === formatDateToYYYYMMDD(selectedDate) && "ring-2 ring-primary dark:ring-primary-focus ring-inset"
                            )}
                            onClick={(e) => {
                              if (e.target === e.currentTarget) { //确保点击的是单元格本身，而不是内部的事件
                                  setSelectedDate(day);
                                  if (!isCurrentMonth) setCurrentDate(day); 
                                  // Optionally switch to day view: setCurrentView("day"); 
                              }
                            }}
                            onDoubleClick={(e) => {
                              if (e.target === e.currentTarget && currentView === 'week') {
                                setSelectedDate(day); // Ensure the correct date is selected
                                // For week view, let's default to a morning time, e.g., 9 AM for 1 hour
                                const newStartTime = new Date(day);
                                newStartTime.setHours(9, 0, 0, 0);
                                const newEndTime = new Date(day);
                                newEndTime.setHours(10, 0, 0, 0);
                                
                                setModalInitialData({
                                  date: formatDateToYYYYMMDD(day),
                                  startTime: newStartTime,
                                  endTime: newEndTime,
                                });
                                setModalMode("plan-create");
                                setIsModalOpen(true);
                              }
                            }}
                          >
                            {dateFnsIsToday(day) && <div className="absolute top-0.5 right-0.5 h-1.5 w-1.5 bg-primary rounded-full" title="今天"></div>}
                            <div className={cn(
                              "text-xs text-right",
                              !isCurrentMonth ? "text-muted-foreground/50" : "text-muted-foreground"
                            )}>
                              {format(day, "d")}
                            </div>
                            <div className="mt-0.5 space-y-0.5 flex-grow overflow-y-auto text-[9px]">
                              {blocksForThisDay.slice(0,3).map(block => {
                                // 使用一致的颜色逻辑
                                const blockClassNames = getTimeBlockClassName(block);
                                return (
                                <div
                                  key={block.id}
                                  className={cn(
                                    blockClassNames,
                                    "p-0.5 rounded truncate leading-tight mb-px cursor-pointer"
                                  )}
                                  title={block.title}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalInitialData({...block});
                                    setModalMode(block.isLogged ? "log-edit" : "plan-edit");
                                    setIsModalOpen(true);
                                  }}
                                >
                                  {block.title}
                                </div>
                              ); 
                            })}
                              {blocksForThisDay.length > 3 && (
                                <div className="text-[9px] text-muted-foreground/80 text-center">+ {blocksForThisDay.length - 3}更多</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>
              </DndContext>
            </CardContent>
          </Card>
        </div>

        {/* 右侧边栏 */}
        <div className="md:col-span-2">
          <div className="space-y-4">
            {/* 选中日期的事件列表 */}
            <SelectedDateEvents
              selectedDate={selectedDate}
              timeBlocks={timeBlocksForSelectedDate}
              tasks={tasks}
              activityCategories={activityCategories} // Pass full list for now, SelectedDateEvents can filter if needed or use hook
              getActivityCategoryInfo={getActivityCategoryInfo}
              onEditBlock={handleEditBlockInSidebar}
              onConvertToLog={handleConvertToLogInSidebar}
              onDeleteBlock={handleDeleteBlockInSidebar}
              onAddEventToSelectedDate={handleAddEventToSelectedDateFromSidebar}
            />

            {/* 即将到来的事件 */}
            <UpcomingEvents
              upcomingTimeBlocks={upcomingTimeBlocks}
              getActivityCategoryInfo={getActivityCategoryInfo}
              onSelectEvent={handleSelectUpcomingEventInSidebar}
            />
          </div>
        </div>
      </div>
      
      {/* 时间块添加/编辑模态框 */}
      {isModalOpen && (
        <TimeBlockEntryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmitSuccess={handleModalSubmitSuccess}
          mode={modalMode}
          initialData={modalInitialData}
          selectedDate={selectedDate} // Pass selectedDate for context, modal might use initialData.date primarily
          tasks={tasks}
          activityCategories={activityCategories}
        />
      )}
      
      {/* 添加确认删除时间块对话框 */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="确认删除时间块"
        description={blockToDelete ? `确定要删除时间块"${blockToDelete.title}"吗？` : "确定要删除此时间块吗？"}
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={confirmDeleteBlock}
        variant="destructive"
      />
    </div>
  )
}
