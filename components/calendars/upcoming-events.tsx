// 该组件用于在日历视图的右侧边栏显示即将到来的事件/时间块列表。
// 每个列表项将采用三列布局：日期信息、事件核心信息和活动分类胶囊，
// 严格按照用户提供的视觉和信息布局要求进行设计。
"use client"

import { format, differenceInMinutes } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimeBlock, ActivityCategory } from "@/lib/db";

// 辅助函数：格式化时长 (与 selected-date-events.tsx 中的一致)
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

interface UpcomingEventsProps {
  upcomingTimeBlocks: TimeBlock[];
  // tasks: Task[]; // Assuming tasks are not directly needed here, or title is part of TimeBlock if pre-fetched
  // activityCategories: ActivityCategory[]; // Not directly used, getActivityCategoryInfo is preferred
  getActivityCategoryInfo: (activityCategoryId?: number) => { name: string; color: string; icon?: string };
  onSelectEvent: (block: TimeBlock) => void; // To open modal or navigate
}

export function UpcomingEvents({
  upcomingTimeBlocks,
  getActivityCategoryInfo,
  onSelectEvent,
}: UpcomingEventsProps) {
  // 生成时间块状态胶囊
  const getStatusCapsule = (block: TimeBlock) => {
    let text = "";
    let className = "";

    if (block.sourceType === 'fixed_break') {
      text = "固定休息";
      className = "bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300";
    } else if (block.sourceType === 'task_plan' || block.sourceType === 'task_plan_manual' || block.isLogged === 0) {
      text = "计划";
      className = "bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300";
    } else if (block.isLogged === 1) {
      text = "已记录";
      className = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300";
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
        <CardTitle className="text-lg">即将到来的安排</CardTitle>
        {/* 移除了副标题 */}
      </CardHeader>
      <CardContent className="pb-2 max-h-[300px] overflow-y-auto">
        {upcomingTimeBlocks.filter(block => block.sourceType !== 'fixed_break').length > 0 ? (
          <div className="space-y-0">
            {upcomingTimeBlocks
              .filter(block => block.sourceType !== 'fixed_break')
              .map((block, index, filteredArray) => {
              const categoryInfo = getActivityCategoryInfo(block.activityCategoryId);
              // startTime and endTime should be asserted as non-null for upcoming blocks as they are plans
              const startTime = block.startTime!;
              const endTime = block.endTime!;
              const duration = differenceInMinutes(endTime, startTime);

              return (
                <div 
                  key={block.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 hover:bg-muted/30 dark:hover:bg-muted/20 cursor-pointer",
                    index < filteredArray.length - 1 && "border-b border-muted"
                  )}
                  onClick={() => onSelectEvent(block)}
                >
                  {/* 左侧列：日期信息 */}
                  <div className="flex flex-col items-center w-12 text-center shrink-0">
                    <div className="text-xs text-muted-foreground">
                      {format(startTime, "EEE", { locale: zhCN })}
                    </div>
                    <div className="text-xl font-bold text-primary dark:text-primary-focus">
                      {format(startTime, "d")}
                    </div>
                  </div>

                  {/* 中间列：事件核心信息 */}
                  <div className="flex-grow min-w-0">
                    <div className="font-medium text-sm truncate" title={block.title}>
                      {block.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")} | {formatDuration(duration)}
                    </div>
                  </div>

                  {/* 右侧列：时间块状态胶囊 + 分类胶囊 */}
                  <div className="shrink-0 flex flex-col items-end space-y-1.5">
                    {/* 时间块状态胶囊 */}
                    {getStatusCapsule(block)}
                    
                    {/* 活动分类胶囊 - 只在非"未知分类"时显示 */}
                    {categoryInfo.name !== "未知分类" && (
                      <Badge
                        className="text-xs px-1.5 py-0.5 whitespace-nowrap leading-tight h-5"
                        style={{
                          backgroundColor: `${categoryInfo.color}26`, // 15% opacity
                          color: categoryInfo.color,
                        }}
                      >
                        {categoryInfo.name}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">未来7天内没有计划中的时间块。</p>
        )}
      </CardContent>
    </Card>
  );
} 