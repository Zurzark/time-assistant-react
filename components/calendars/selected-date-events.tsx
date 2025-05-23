// 该组件用于在日历视图的右侧边栏显示特定选定日期的事件/时间块列表。
// 它会根据事件的状态（固定休息、计划中、已记录）和活动分类来展示不同的胶囊标签，
// 并提供任务关联、时间详情和备注等信息。
"use client"

import { format, differenceInMinutes } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Clock, MoreHorizontal, Plus, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { TimeBlock, Task, ActivityCategory } from "@/lib/db";

// 辅助函数：格式化时长
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}小时`;
  }
  return `${hours}小时${remainingMinutes}分钟`;
};

interface SelectedDateEventsProps {
  selectedDate: Date;
  timeBlocks: TimeBlock[];
  tasks: Task[];
  activityCategories: ActivityCategory[];
  getActivityCategoryInfo: (activityCategoryId?: number) => { name: string; color: string; icon?: string };
  onEditBlock: (block: TimeBlock) => void;
  onConvertToLog: (block: TimeBlock) => void;
  onDeleteBlock: (blockId: number, blockTitle: string) => void;
  onAddEventToSelectedDate: () => void;
}

export function SelectedDateEvents({
  selectedDate,
  timeBlocks,
  tasks,
  // activityCategories, // Not directly used, getActivityCategoryInfo is preferred
  getActivityCategoryInfo,
  onEditBlock,
  onConvertToLog,
  onDeleteBlock,
  onAddEventToSelectedDate,
}: SelectedDateEventsProps) {

  const getStatusCapsule = (block: TimeBlock) => {
    let text = "";
    let className = "";

    if (block.sourceType === 'fixed_break') {
      text = "固定休息";
      className = "bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300";
    } else if (block.isLogged === 1) {
      if (block.sourceType === 'time_log') {
        text = "已记录";
        className = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300";
      } else if (block.sourceType === 'pomodoro_log') {
        text = "番茄记录";
        className = "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300";
      } else {
        text = "已记录未知";
        className = "bg-red-100 text-red-700"; 
      }
    } else {
      if (block.sourceType === 'manual_entry' || block.sourceType === 'task_plan') {
        text = "计划";
        className = "bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300";
      } else if (block.sourceType !== 'fixed_break'){
        text = "计划外";
        className = "bg-purple-100 text-purple-700"; 
      }
    }

    if (!text) return null;

    return (
      <Badge className={cn("text-xs px-1.5 py-0.5 whitespace-nowrap leading-tight h-5", className)}>
        {text}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          {format(selectedDate, "yyyy年MM月dd日 EEEE", { locale: zhCN })}
        </CardTitle>
        <CardDescription>
          {/* 过滤掉固定休息项后的数量 */}
          {timeBlocks.filter(block => block.sourceType !== 'fixed_break').length > 0 
            ? `${timeBlocks.filter(block => block.sourceType !== 'fixed_break').length} 个安排` 
            : "今日无安排"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2 max-h-[400px] overflow-y-auto">
        {timeBlocks.filter(block => block.sourceType !== 'fixed_break').length > 0 ? (
          <div className="space-y-2">
            {timeBlocks
              .filter(block => block.sourceType !== 'fixed_break') // 过滤掉固定休息项
              .map((block) => {
              const categoryInfo = getActivityCategoryInfo(block.activityCategoryId);
              const task = block.taskId ? tasks.find(t => t.id === block.taskId) : undefined;
              
              const startTime = block.isLogged ? block.actualStartTime! : block.startTime!;
              const endTime = block.isLogged ? block.actualEndTime! : block.endTime!;
              const duration = differenceInMinutes(endTime, startTime);

              return (
                <div 
                  key={block.id}
                  className="p-3 rounded-md border-b border-muted last:border-b-0 hover:bg-muted/30 dark:hover:bg-muted/20 cursor-pointer"
                  onClick={() => onEditBlock(block)}
                >
                  {/* 第一行：状态、分类与标题 */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5 flex-grow min-w-0">
                      {getStatusCapsule(block)}
                      {categoryInfo.name !== "未知分类" && (
                        <Badge
                          className="text-xs px-1.5 py-0.5 whitespace-nowrap leading-tight h-5"
                          style={{
                            backgroundColor: `${categoryInfo.color}26`,
                            color: categoryInfo.color,
                          }}
                        >
                          {categoryInfo.name}
                        </Badge>
                      )}
                      <span className="text-sm font-medium truncate" title={block.title}>
                        {block.title}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => onEditBlock(block)}>编辑</DropdownMenuItem>
                        {!block.isLogged && block.sourceType !== 'fixed_break' && (
                          <DropdownMenuItem onClick={() => onConvertToLog(block)}>转换为日志</DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-red-500 hover:!text-red-600 focus:!text-red-500 dark:text-red-500 dark:hover:!text-red-400 dark:focus:!text-red-500" 
                          onClick={() => block.id && onDeleteBlock(block.id, block.title)}
                        >
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* 第二行：描述/备注（如果存在）、关联任务（如果存在） */}
                  {(block.notes || (block.isLogged === 1 && task)) && (
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      {/* 左侧：描述/备注 */}
                      <div className="flex-grow min-w-0 mr-2">
                        {block.notes && (
                          <p className="text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-words truncate max-w-full leading-snug">
                            {block.notes.length > 25 ? block.notes.substring(0, 25) + "..." : block.notes}
                          </p>
                        )}
                      </div>
                      
                      {/* 右侧：关联任务 */}
                      <div className="shrink-0">
                        {block.isLogged === 1 && task && (
                          <Badge 
                            variant="secondary"
                            className="text-xs px-1.5 py-0.5 whitespace-nowrap leading-tight h-5 bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200 truncate max-w-[150px] sm:max-w-[200px]"
                            title={task.title}
                          >
                            任务: {task.title}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 第三行：时间/时长 (右对齐) */}
                  <div className="flex items-center justify-end text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>
                      {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                    </span>
                    <span className="mx-1">|</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarIcon className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">没有安排</h3>
            <p className="text-sm text-muted-foreground mb-4">这一天没有时间块。</p>
            <Button size="sm" onClick={onAddEventToSelectedDate}>
              <Plus className="h-4 w-4 mr-2" />
              添加到此日期
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full" onClick={onAddEventToSelectedDate}>
          <Plus className="h-4 w-4 mr-2" />
          添加到 {format(selectedDate, "MM月dd日")}
        </Button>
      </CardFooter>
    </Card>
  );
} 