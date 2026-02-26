"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTaskStats } from "../task/task-stats-updater"
import { Sigma, PlayCircle, CheckCircle2, AlertCircle, ArrowRightCircle, Repeat, Info } from "lucide-react"
import { useEffect, useState } from 'react';

interface TaskStatsCardProps {
  // Props are no longer needed as context handles timeRange and its update.
}

export function TaskStatsCard({}: TaskStatsCardProps) {
  const { stats, timeRange, setTimeRange, isLoading, error, refreshStats } = useTaskStats();

  // 强制本地刷新机制，确保统计卡片100%自动刷新
  const [, setForceUpdate] = useState(0);
  useEffect(() => {
    const handler = () => {
      setForceUpdate(v => v + 1);
      refreshStats();
    };
    window.addEventListener('taskDataChangedForStats', handler);
    return () => window.removeEventListener('taskDataChangedForStats', handler);
  }, [refreshStats]);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value as "today" | "week" | "month" | "all");
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">任务统计</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 pt-2">
          <div className="text-center text-muted-foreground">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">任务统计</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 pt-2">
          <div className="text-center text-destructive">加载统计数据失败: {error}</div>
        </CardContent>
      </Card>
    );
  }

  // StatItem sub-component for displaying each statistic
  const StatItem = ({ value, label, colorClassName, isSubStat = false }: { 
    value: number, 
    label: string, 
    colorClassName?: string, 
    isSubStat?: boolean 
  }) => (
    <div className={`flex flex-col items-center justify-center p-1 sm:p-2 rounded-lg ${isSubStat ? 'bg-muted/30 dark:bg-muted/20' : ''}`}>
      <div className="flex items-center">
        <span className={`${isSubStat ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'} font-bold ${colorClassName || 'text-primary dark:text-gray-200'}`}>{value}</span>
      </div>
      <span className={`text-xs ${isSubStat ? 'text-muted-foreground/80 dark:text-slate-400' : 'text-muted-foreground dark:text-slate-400'}`}>{label}</span>
    </div>
  );
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-x-2">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-md font-medium whitespace-nowrap">任务统计</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px] text-xs space-y-2 p-3" side="right">
                <div className="font-semibold border-b pb-1 mb-1">统计口径说明</div>
                <div className="space-y-1">
                  <p><span className="font-medium text-primary">总任务:</span> 选定时间范围内的所有非删除任务</p>
                  <p><span className="font-medium text-sky-600">下一步:</span> 总任务中类别为"下一步行动"的任务</p>
                  <p><span className="font-medium text-purple-600">重复:</span> 范围内有实例的重复任务</p>
                  <p><span className="font-medium text-blue-600">进行中:</span> 下一步行动 + 未完成 + 未过期(截止日期&ge;今天)</p>
                  <p><span className="font-medium text-green-600">已完成:</span> 下一步行动 + 已完成 + 完成时间在范围内</p>
                  <p><span className="font-medium text-red-600">已过期:</span> 下一步行动 + 未完成 + 已过期(截止日期&lt;今天)</p>
                  <div className="text-[10px] text-muted-foreground pt-1 border-t mt-1">
                    * 支持切换：今日、本周、本月、全部
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Select value={timeRange} onValueChange={handleTimeRangeChange}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="时间范围" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">今日</SelectItem>
            <SelectItem value="week">本周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
            <SelectItem value="all">全部</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pb-4 pt-2 space-y-2 sm:space-y-3">
        {/* 第一排：总任务、下一步、重复 */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <StatItem 
            value={stats.total} 
            label="总任务" 
            colorClassName="text-slate-700 dark:text-slate-300"
          />
          <StatItem 
            value={stats.nextAction} 
            label="下一步" 
            colorClassName="text-sky-600 dark:text-sky-400"
          />
          <StatItem 
            value={stats.recurring} 
            label="重复" 
            colorClassName="text-purple-600 dark:text-purple-400"
          />
        </div>
        {/* 第二排：进行中、已完成、已过期 */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1 sm:pt-2">
          <StatItem 
            value={stats.inProgress} 
            label="进行中" 
            colorClassName="text-blue-600 dark:text-blue-400"
            isSubStat
          />
          <StatItem 
            value={stats.completedInRange} 
            label="已完成" 
            colorClassName="text-green-600 dark:text-green-400"
            isSubStat
          />
          <StatItem 
            value={stats.overdue} 
            label="已过期" 
            colorClassName="text-red-600 dark:text-red-400"
            isSubStat
          />
        </div>
      </CardContent>
      {/* CardFooter with progress bar has been removed as per instructions */}
    </Card>
  );
} 