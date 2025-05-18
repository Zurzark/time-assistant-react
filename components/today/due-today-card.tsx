"use client"

import { useState, useEffect, useCallback } from "react"
import { CheckCircle2, Clock, Loader2, MoreHorizontal, Timer, CalendarDays } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useTaskStats } from "../task/task-stats-updater" // 调整导入路径
import { type Task, getAll as getAllDB, add as addDB, update as updateDB, get as getDB, ObjectStores as DBObjectStores, type TimeBlock as DBTimeBlock } from "@/lib/db"; // 显式导入所需DB内容和类型
// 注意: @/lib/db 的导入是动态的，将在组件内部处理
import { formatTimeForDisplay, checkTimeOverlap } from "@/lib/utils";

interface DueTodayCardProps {
  onPomodoroClick: (taskId: string, taskTitle: string) => void;
  onViewAll: () => void;
}

export function DueTodayCard({ onPomodoroClick, onViewAll }: DueTodayCardProps) {
  const { updateTaskStats } = useTaskStats();
  
  // 状态管理
  const [tasks, setTasks] = useState<Array<{
    id: string | number, 
    title: string, 
    completed: boolean, 
    priority?: string,
    time?: string,
    dueDate?: Date; // 添加 dueDate 用于排序
    estimatedPomodoros?: number; // 新增：用于计算添加到时间轴的时长
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null); // 新增：加载错误状态
  
  // 优先级映射
  const priorityMap: { [key: string]: number } = {
    high: 1,
    medium: 2,
    low: 3,
  };
  
  // 从 IndexedDB 加载今日到期任务
  const loadDueTasks = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null); // 重置错误状态
      
      // 获取今日日期（不含时间）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      // 从 IndexedDB 获取今日到期任务
      const { getAll, ObjectStores } = await import('@/lib/db');
      const allTasks = await getAll(ObjectStores.TASKS);
      
      // 过滤出未删除的今日到期任务
      const dueTasksDB = allTasks.filter((task: any) => {
        // 检查任务是否未被删除
        if (task.isDeleted) return false;
        
        // 如果有截止日期，检查是否在今天
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          // dueDate.setHours(0, 0, 0, 0); // 保持时间用于排序，但在过滤时应与当天比较
          const checkDate = new Date(task.dueDate);
          checkDate.setHours(0,0,0,0);
          return checkDate >= today && checkDate < tomorrow;
        }
        
        return false;
      });
      
      // 转换优先级格式，并按优先级排序
      const mappedTasks = dueTasksDB.map((task: any) => {
        // 将数据库中的优先级映射为显示格式
        let priority = 'medium';
        if (task.priority === 'importantUrgent') {
          priority = 'high';
        } else if (task.priority === 'importantNotUrgent') {
          priority = 'medium';
        } else if (task.priority === 'notImportantNotUrgent') {
          priority = 'low';
        } else if (task.priority === 'notImportantUrgent') {
          // 假设 'notImportantUrgent' 也是一种低优先级或特定处理
          priority = 'low'; // 或者其他适合的映射
        }
        
        // 格式化时间（如果有）
        let timeStr = '';
        let taskDueDate: Date | undefined = undefined;
        if (task.dueDate) {
          taskDueDate = new Date(task.dueDate);
          timeStr = taskDueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        return {
          id: task.id,
          title: task.title,
          completed: task.completed,
          priority,
          time: timeStr,
          dueDate: taskDueDate, // 保留 Date 对象用于排序
          estimatedPomodoros: task.estimatedPomodoros, // 新增：传递预估番茄钟
        };
      }).sort((a, b) => {
        // 排序：优先级 (高 > 中 > 低)，然后按时间 (早 > 晚)
        const priorityComparison = (priorityMap[a.priority!] || 3) - (priorityMap[b.priority!] || 3);
        if (priorityComparison !== 0) {
          return priorityComparison;
        }
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        return 0;
      });
      
      // 更新状态
      setTasks(mappedTasks);
      
    } catch (error) {
      console.error('加载到期任务时出错:', error);
      setLoadError('加载到期任务时出错，请重试。');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 初始加载任务
  useEffect(() => {
    loadDueTasks();
  }, [loadDueTasks]);
  
  // 处理复选框点击 - 更新任务完成状态
  const handleCheckboxChange = async (taskId: string | number) => {
    // 在本地状态中找到任务
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;
    
    const newCompleted = !task.completed;
    
    // 先更新本地状态，使 UI 立即响应
    setTasks(prev => 
      prev.map(t => t.id == taskId 
        ? { ...t, completed: newCompleted } 
        : t
      )
    );
    
    try {
      // 更新 IndexedDB
      await updateTaskStats(taskId, newCompleted);
    } catch (error) {
      console.error('更新任务状态时出错:', error);
      
      // 发生错误时回滚 UI 状态
      setTasks(prev => 
        prev.map(t => t.id == taskId 
          ? { ...t, completed: task.completed } // 回滚到原始状态
          : t
        )
      );
      alert('更新任务状态失败，请重试。'); // 通知用户
    }
  };

  // 新增：处理任务删除
  const handleDeleteTask = async (taskId: string | number) => {
    const originalTasks = [...tasks]; // 将 originalTasks 移到 try 块外部
    try {
      // 乐观更新UI
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));

      const { update, ObjectStores, get } = await import('@/lib/db');
      
      const taskToUpdate = await get<Task>(ObjectStores.TASKS, taskId as number); // 明确类型，假设 taskId 可以安全转为 number
      if (taskToUpdate) {
        taskToUpdate.isDeleted = 1; // 根据 Task 接口
        taskToUpdate.updatedAt = new Date(); // 根据 Task 接口
        await update(ObjectStores.TASKS, taskToUpdate);
      } else {
        throw new Error("Task not found for deletion");
      }
      // loadDueTasks(); // 如果删除后需要重新排序或过滤，可以重新加载
    } catch (error) {
      console.error('删除任务时出错:', error);
      setTasks(originalTasks); // 回滚UI
      // TODO: 通知用户删除失败
      alert('删除任务失败，请重试。');
    }
  };

  // 新增：处理添加到时间轴
  const handleAddToTimeline = async (taskItem: { id: string | number; title: string; estimatedPomodoros?: number }) => {
    if (!taskItem.id) {
      alert("任务ID无效，无法添加到时间轴。");
      return;
    }
    try {
      const todayString = new Date().toISOString().split('T')[0];
      // const todayDateObj = new Date(todayString + 'T00:00:00Z'); // UTC date for reference

      const taskId = String(taskItem.id);
      const title = taskItem.title;
      const type = 'task';
      // const date = todayString; // date for new block will be derived from proposedStartTime

      let durationMinutes = 60; 
      if (taskItem.estimatedPomodoros && taskItem.estimatedPomodoros > 0) {
        durationMinutes = taskItem.estimatedPomodoros * 25; 
      }
      const durationMilliseconds = durationMinutes * 60 * 1000;

      const existingDbBlocks = await getAllDB<DBTimeBlock>(DBObjectStores.TIME_BLOCKS);
      const todayBlocks = existingDbBlocks
        .filter(block => block.date === todayString && block.id !== undefined)
        .map(block => ({
          ...block,
          startTime: new Date(block.startTime),
          endTime: new Date(block.endTime),
        }))
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      let proposedStartTime: Date | null = null;
      let proposedEndTime: Date | null = null;
      
      const now = new Date();
      const localTodayDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Local today at 00:00

      const earliestPossibleStart = new Date(localTodayDateObj);
      earliestPossibleStart.setHours(7, 0, 0, 0); 
      let searchStart = now > earliestPossibleStart ? new Date(now.getTime()) : new Date(earliestPossibleStart.getTime());
      
      const minutes = searchStart.getMinutes();
      const remainder = minutes % 5;
      if (remainder !== 0) {
        searchStart.setMinutes(minutes + (5 - remainder), 0, 0);
      }

      let slotFound = false;
      const MIN_GAP_MINUTES = 5; 
      const MAX_ITERATIONS = 100; 
      let iterations = 0;

      while(!slotFound && iterations < MAX_ITERATIONS) {
        iterations++;
        let currentProposedStart = new Date(searchStart);
        let currentProposedEnd = new Date(currentProposedStart.getTime() + durationMilliseconds);
        let overlap = false;
        for (const block of todayBlocks) {
          if (checkTimeOverlap(currentProposedStart, currentProposedEnd, block.startTime, block.endTime, MIN_GAP_MINUTES)) {
            overlap = true;
            searchStart = new Date(block.endTime.getTime() + MIN_GAP_MINUTES * 60 * 1000);
            const currentMinutesLoop = searchStart.getMinutes();
            const currentRemainderLoop = currentMinutesLoop % 5;
            if (currentRemainderLoop !== 0) {
              searchStart.setMinutes(currentMinutesLoop + (5 - currentRemainderLoop), 0, 0);
            }
            break;
          }
        }

        if (!overlap) {
          const endOfDayLimit = new Date(localTodayDateObj);
          endOfDayLimit.setHours(22, 0, 0, 0); 
          if (currentProposedEnd > endOfDayLimit) {
            alert(`未能为任务 "${title}" 找到今天 ${durationMinutes} 分钟的合适时段（已到${formatTimeForDisplay(endOfDayLimit)}）。请尝试缩短任务时长或手动在时间轴上安排。`);
            return;
          }
          proposedStartTime = currentProposedStart;
          proposedEndTime = currentProposedEnd;
          slotFound = true;
        }
      }
      
      if (!slotFound || !proposedStartTime || !proposedEndTime) { 
          alert(`无法为任务 "${title}" 自动找到 ${durationMinutes} 分钟的空闲时间段。请尝试手动安排或检查当天日程。`);
          return;
      }

      const newTimeBlock: Omit<DBTimeBlock, 'id'> = {
        taskId: taskId,
        title: title,
        type: type,
        startTime: proposedStartTime,
        endTime: proposedEndTime,
        date: proposedStartTime.toISOString().split('T')[0], // Date string from the actual start time
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDB(DBObjectStores.TIME_BLOCKS, newTimeBlock);
      window.dispatchEvent(new CustomEvent('timelineShouldUpdate'));
      alert(`任务 "${title}" 已添加到今日时间轴 ${formatTimeForDisplay(proposedStartTime)} - ${formatTimeForDisplay(proposedEndTime)}。`);

    } catch (error) {
      console.error("添加到时间轴时出错:", error);
      let errorMessage = "添加到时间轴时发生未知错误。";
      if (error instanceof Error) {
        errorMessage = `添加到时间轴失败: ${error.message}`;
      }
      alert(errorMessage);
    }
  };

  // 新增：处理任务编辑 (占位符)
  const handleEditTask = (taskId: string | number) => {
    console.log("准备编辑任务:", taskId);
    // TODO: 实现编辑逻辑，例如打开一个模态框
    alert(`编辑功能待实现 (任务ID: ${taskId})`);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">今日到期任务</CardTitle>
        <CardDescription>需要今天完成的任务</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? ( // 新增：显示加载错误
          <div className="flex flex-col items-center justify-center py-6 text-center text-red-600">
            <p>{loadError}</p>
            <Button onClick={loadDueTasks} variant="outline" size="sm" className="mt-2">重试</Button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">今天没有到期的任务</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`due-${task.id}`} 
                  checked={task.completed} 
                  onCheckedChange={() => handleCheckboxChange(task.id)}
                />
                <div className="flex-1">
                  <label
                    htmlFor={`due-${task.id}`}
                    className={cn(
                      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1",
                      task.completed && "line-through text-muted-foreground",
                    )}
                  >
                    {task.title}
                  </label>
                  <div className="flex items-center mt-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs mr-2",
                        task.priority === "high"
                          ? "border-red-500 text-red-500"
                          : task.priority === "medium"
                            ? "border-amber-500 text-amber-500"
                            : "border-green-500 text-green-500", // 默认为 low
                      )}
                    >
                      {task.priority === "high" ? "紧急" : task.priority === "medium" ? "中等" : "低优先级"}
                    </Badge>
                    {task.time && (
                      <span className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {task.time}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPomodoroClick(String(task.id), task.title)}
                >
                  <Timer className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditTask(task.id)}>编辑</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddToTimeline(task)}>
                       <CalendarDays className="mr-2 h-4 w-4" /> 添加到时间轴
                    </DropdownMenuItem>
                    <DropdownMenuItem>推迟</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50">删除</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onViewAll}>
          查看全部到期任务
        </Button>
      </CardFooter>
    </Card>
  );
} 