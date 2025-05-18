"use client"

import { useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTaskStats } from "../task/task-stats-updater" // 调整导入路径

interface TaskStatsCardProps {
  timeRange: string;
  setTimeRange: (value: string) => void;
}

export function TaskStatsCard({ timeRange, setTimeRange }: TaskStatsCardProps) {
  const { stats, timeRange: taskTimeRange, setTimeRange: updateTimeRange } = useTaskStats();
  
  // 同步外部时间范围到任务统计上下文
  useEffect(() => {
    if (timeRange !== taskTimeRange) {
      updateTimeRange(timeRange as any);
    }
  }, [timeRange, taskTimeRange, updateTimeRange]);
  
  // 处理时间范围变化
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    updateTimeRange(value as any);
  };
  
  // 计算完成百分比，避免除以零错误
  const completionPercentage = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">任务统计</CardTitle>
        <Select value={timeRange} onValueChange={handleTimeRangeChange}>
          <SelectTrigger className="w-[120px] h-8">
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
      <CardContent className="pb-2">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{stats.total}</span>
            <span className="text-xs text-muted-foreground">总任务数</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-green-500">{stats.completed}</span>
            <span className="text-xs text-muted-foreground">已完成</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-amber-500">{stats.pending}</span>
            <span className="text-xs text-muted-foreground">待处理</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="w-full bg-muted rounded-full h-2.5">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        <div className="w-full text-right text-xs text-muted-foreground mt-1">
          {completionPercentage}%
        </div>
      </CardFooter>
    </Card>
  );
} 