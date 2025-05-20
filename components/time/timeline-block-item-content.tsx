"use client";
// 该组件负责渲染时间轴上的单个时间块卡片，展示其详细信息、状态和操作选项。
// 它接收一个时间块对象及相关上下文数据（如活动分类、任务列表、当前时间）和回调函数。

import React, { FC, ReactNode } from "react";
import {
  Activity,
  CheckCircle2,
  Coffee,
  MoreHorizontal,
  Play,
  Edit3,
  Trash2,
  User,
  Timer,
  Tag as CategoryIcon,
  ListChecks,
  StickyNote,
  CalendarDays,
  Pencil,
  ClipboardCheck,
  Clock,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { type TimeBlock as DBTimeBlock, ActivityCategory, Task } from "@/lib/db";

// UITimeBlock 应该与 timeline-card.tsx 中的定义一致，或者从共享类型文件导入
// 为简化，暂时在此处复制关键部分。理想情况下应共享。
export interface UITimeBlock extends Omit<DBTimeBlock, 'isLogged' | 'activityCategoryId' | 'startTime' | 'endTime' | 'actualStartTime' | 'actualEndTime'> {
  id: number;
  isCurrent?: boolean;
  isLogged: boolean;
  activityCategoryId?: number;
  startTime: Date;
  endTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  // date 字段仍为 string (YYYY-MM-DD)
}

const formatTime = (date: Date | string | undefined) => {
  if (!date) return "--:--";
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// 临时的 formatDuration 函数，后续可以移到 utils.ts
const formatDurationFromMinutes = (totalMinutes: number): string => {
    if (isNaN(totalMinutes) || totalMinutes <= 0) return "";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let result = "";
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;
    return result.trim();
  };

export interface TimelineBlockItemContentProps {
  block: UITimeBlock;
  isCurrentBlock: boolean;
  onPomodoroClick: (taskId: string, taskTitle: string) => void;
  handleOpenEditModal: (block: UITimeBlock) => void;
  handleDeleteBlock: (blockId: number, blockTitle: string) => void;
  handleOpenLogModalFromPlan: (block: UITimeBlock) => void;
  currentTime: Date;
  activityCategories: ActivityCategory[];
  tasks: Task[];
}

export const TimelineBlockItemContent: FC<TimelineBlockItemContentProps> = ({
  block,
  isCurrentBlock,
  onPomodoroClick,
  handleOpenEditModal,
  handleDeleteBlock,
  handleOpenLogModalFromPlan,
  currentTime,
  activityCategories,
  tasks,
}) => {
  const isPast = new Date(currentTime) > new Date(block.endTime);

  const category = activityCategories.find(
    (cat) => cat.id === block.activityCategoryId
  );
  const task = tasks.find((t) => t.id === block.taskId);
  const blockTitle = block.title || (task ? task.title : "未命名活动");

  // 视觉指示其来源类型的图标 (需求 三.1)
  let SourceTypeDisplayIcon: ReactNode;
  let sourceTypeDisplayText = "";

  switch (block.sourceType) {
    case 'fixed_break':
      SourceTypeDisplayIcon = <Coffee className="h-4 w-4" />;
      sourceTypeDisplayText = category?.name || "固定休息";
      break;
    case 'task_plan':
      SourceTypeDisplayIcon = <ClipboardCheck className="h-4 w-4" />;
      sourceTypeDisplayText = category?.name || "任务计划";
      break;
    case 'manual_entry':
      SourceTypeDisplayIcon = <Pencil className="h-4 w-4" />;
      sourceTypeDisplayText = category?.name || "手动条目";
      break;
    case 'pomodoro_log':
      SourceTypeDisplayIcon = <Timer className="h-4 w-4" />;
      sourceTypeDisplayText = "番茄记录";
      break;
    default:
      SourceTypeDisplayIcon = <Activity className="h-4 w-4" />;
      sourceTypeDisplayText = category?.name || "活动";
  }
  // If a category is present and it has an icon, it could potentially override SourceTypeDisplayIcon or be combined.
  // For V0, sourceType icon is primary on the left.

  // Card styling based on state (需求 四.1 - 方案A/B) -> Rewritten for 需求 三.1 (美化)
  const cardBaseClasses =
    "rounded-lg px-3 py-2.5 transition-all hover:shadow-md cursor-pointer shadow-[0px_1px_3px_rgba(0,0,0,0.04),_0px_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[0px_1px_3px_rgba(0,0,0,0.08),_0px_1px_2px_rgba(0,0,0,0.04)] flex-grow min-w-0";
  
  let cardSpecificStyles = "";
  let titleTextStyles = "text-gray-800 dark:text-gray-100";

  if (isCurrentBlock) {
    cardSpecificStyles = "border border-blue-300 dark:border-blue-700 ring-1 ring-blue-300 dark:ring-blue-600 bg-blue-50 dark:bg-blue-900/60";
    titleTextStyles = "text-blue-700 dark:text-blue-300 group-hover:text-blue-600 dark:group-hover:text-blue-200";
  } else if (block.sourceType === 'fixed_break') {
    cardSpecificStyles = "border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 hover:bg-green-100/70 dark:hover:bg-green-900/70";
  } else if (block.isLogged) {
    cardSpecificStyles = "border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"; 
  } else {
    cardSpecificStyles = "border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 hover:bg-gray-50/70 dark:hover:bg-slate-700/60";
  }
  
  const finalCardStyles = cn(cardBaseClasses, cardSpecificStyles);

  // 时长显示 (需求 二.2 - 方案A)
  let durationText = "";
  const relevantStartTime = block.isLogged ? block.actualStartTime : block.startTime;
  const relevantEndTime = block.isLogged ? block.actualEndTime : block.endTime;

  if (relevantStartTime && relevantEndTime) {
    const diffMins = Math.round((new Date(relevantEndTime).getTime() - new Date(relevantStartTime).getTime()) / (1000 * 60));
    durationText = formatDurationFromMinutes(diffMins);
  } else if (block.durationMinutes) {
    durationText = formatDurationFromMinutes(block.durationMinutes);
  }

  return (
    // mb-3 is removed because parent div now has pb-6
    // flex items-start group is kept
    <div className={cn("transition-shadow flex items-start group")}>
      {/* Left-side Source Type Icon (需求 三.1 & 三.2) - Demo style adjustment */}
      {/* Demo style: absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center */}
      <div
        className={cn(
            "absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center z-10", // Added z-10 to be above the timeline bar
            // Unified icon background for non-active states
            isCurrentBlock ? "bg-blue-500 text-white" :
            block.isLogged ? "bg-green-100 text-green-600" : // Logged items icon remains green
            block.sourceType === 'fixed_break' ? "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300" : // Fixed break icon bg: distinct light gray
            "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400" // Default for other planned items
        )}
        // Removed style prop, relying on classNames for demo consistency
        title={sourceTypeDisplayText}
      >
        {/* Icon mapping to match demo (simplified) */}
        {block.isLogged ? <CheckCircle2 className="h-4 w-4" /> :
         isCurrentBlock ? <Loader2 className="h-4 w-4 animate-spin" /> :
         block.sourceType === 'fixed_break' ? <Coffee className="h-4 w-4" /> :
         block.sourceType === 'task_plan' && task ? <ClipboardCheck className="h-4 w-4" /> :
         block.sourceType === 'manual_entry' ? <Pencil className="h-4 w-4" /> :
         block.sourceType === 'pomodoro_log' ? <Timer className="h-4 w-4" /> :
         <Activity className="h-4 w-4" /> // Default icon
        }
      </div>

      <div
        className={cn(finalCardStyles)}
        onClick={() => {
          if (block.sourceType !== 'pomodoro_log') { 
            handleOpenEditModal(block);
          }
        }}
      >
        <div className="flex flex-col justify-between h-full"> {/* Ensure content uses available height */} 
          {/* First line: Title and Time/Duration */} 
          <div className="flex items-start justify-between mb-1"> {/* Changed mb-1.5 to mb-1 */}
            <h4 className={cn("font-medium text-sm truncate flex-grow mr-2 group-hover:text-primary dark:group-hover:text-blue-400", titleTextStyles)} title={blockTitle}>
              {isCurrentBlock && <Timer className="h-3.5 w-3.5 mr-1.5 inline-block animate-pulse text-blue-500" />}
              {task && task.isFrog === 1 && <span className="mr-1" title="青蛙任务">🐸</span>}
              {blockTitle}
            </h4>
            <div className="text-right shrink-0">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {durationText && <span className="text-[0.68rem] text-gray-500 dark:text-gray-400 mr-1.5">({durationText})</span>}
                {formatTime(relevantStartTime)} - {formatTime(relevantEndTime)}
              </div>
            </div>
          </div>

          {/* Second line: Badges (Category, Task) and Menu */} 
          <div className="flex items-end justify-between text-xs mt-auto min-h-[1.75rem]"> {/* Adjusted min-h from 2rem to 1.75rem (28px) */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 overflow-hidden mr-1"> {/* Adjusted gap-y from 1 to 0.5 (2px) */}
              {/* 视觉区分：计划 vs 已记录 (需求 四.1 - 方案B) */} 
              {block.isLogged ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-700/50 dark:text-green-200 py-0.5 px-1.5 text-[0.68rem] leading-tight rounded shadow-xs"> {/* Unified py-0.5 and rounded */}
                    <CheckCircle2 className="h-3 w-3 mr-1" /> 已记录
                </Badge>
              ) : block.sourceType === 'fixed_break' ? (
                <div className="inline-flex items-center rounded border border-green-500 dark:border-green-600 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400"> {/* Changed rounded-full to rounded */}
                    <Clock className="h-3 w-3 mr-1" /> 固定休息
                </div>
              ) : (
                <Badge className="bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300 py-0.5 px-1.5 text-[0.68rem] leading-tight rounded shadow-xs"> {/* Unified py-0.5 and rounded */}
                    <Clock className="h-3 w-3 mr-1" /> 计划中
                </Badge>
              )}

              {category && (
                <Badge
                  variant="outline"
                  className="py-0.5 px-1.5 font-normal text-[0.68rem] leading-tight truncate max-w-[100px] rounded shadow-xs" /* Unified py-0.5 and rounded */
                  style={{
                    borderColor: category.color || "#D1D5DB", // gray-300
                    backgroundColor: `${category.color || "#E5E7EB"}2A`, // ~gray-200 with alpha (slightly more opaque)
                    color: category.color || "#4B5563", // gray-600
                  }}
                  title={category.name}
                >
                  {category.name}
                </Badge>
              )}
              {task && (
                <Badge
                  variant="default"
                  className="py-0.5 px-1.5 font-normal bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-[0.68rem] leading-tight truncate max-w-[120px] cursor-pointer rounded shadow-xs" /* Unified py-0.5 and rounded */
                  title={task.title}
                  // onClick={(e) => { e.stopPropagation(); alert(`Navigate to task: ${task.title}`); }} // Placeholder for task navigation
                >
                  <ListChecks className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{task.title}</span>
                </Badge>
              )}
            </div>

            {/* Action Menu - only if not a pomodoro log */} 
            {block.sourceType !== 'pomodoro_log' && (
                <div className="flex items-center space-x-0.5 shrink-0 ml-1">
                {block.taskId && !block.isLogged && (
                    <Button
                    variant="ghost"                    size="icon"
                    className="h-6 w-6 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-full"
                    title="启动专注"
                    onClick={(e) => {
                        e.stopPropagation();
                        block.taskId &&
                        onPomodoroClick(String(block.taskId), blockTitle);
                    }}
                    >
                    <Play className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                    </Button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MoreHorizontal className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => handleOpenEditModal(block)} className="text-sm">
                        <Edit3 className="mr-2 h-3.5 w-3.5" />
                        {block.isLogged ? "编辑日志" : "编辑计划"}
                    </DropdownMenuItem>

                    {!block.isLogged && (
                        <DropdownMenuItem
                        onClick={() => handleOpenLogModalFromPlan(block)}
                        // Enable if current or past, highlight if past and actionable
                        disabled={new Date(block.endTime) > currentTime && !isCurrentBlock } 
                        className={cn(
                            "text-sm",
                            (isPast || isCurrentBlock) && "text-green-600 focus:text-green-700 dark:text-green-400 dark:focus:text-green-300"
                        )}
                        >
                        <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> 记录实际时间
                        </DropdownMenuItem>
                    )}
                    
                    {/* Allow deleting non-logged items, or logged items that are not fixed breaks (fixed breaks are managed by rules) */} 
                    {(!block.isLogged || (block.isLogged && block.sourceType !== 'fixed_break')) && (
                        <DropdownMenuItem
                            className="text-sm text-red-600 hover:!text-red-600 focus:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-900/50 focus:!bg-red-50 dark:focus:!bg-red-900/50 dark:text-red-400 dark:focus:text-red-300"
                            onClick={() => handleDeleteBlock(block.id, blockTitle)}
                        >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            {block.isLogged ? "删除日志" : "删除计划"}
                        </DropdownMenuItem>
                    )}
                    </DropdownMenuContent>
                </DropdownMenu>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineBlockItemContent; 