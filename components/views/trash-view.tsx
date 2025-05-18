"use client";

import { AlertCircle, ArrowUpLeft, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Task as DBTaskType } from "@/lib/db"; // Assuming DBTaskType is the correct type for deleted tasks
import { cn } from "@/lib/utils"; // If cn is used for styling

// priorityMapFromDB might be needed if displaying priority text differently than stored value
// It should be passed as a prop if needed.
// For now, assuming priority prop is already in display format or not displayed in trash.
// Re-added priorityMapFromDB as it's used in the original TasksView trash display
const priorityMapFromDB: Record<string, string> = {
    importantUrgent: "important-urgent",
    importantNotUrgent: "important-not-urgent",
    notImportantUrgent: "not-important-urgent",
    notImportantNotUrgent: "not-important-not-urgent",
  };

interface TrashViewProps {
  deletedTasks: DBTaskType[];
  loadingTrash: boolean;
  trashError: Error | null;
  onRestoreTask: (taskId: number) => void;
  onPermanentlyDeleteTask: (taskId: number) => void; // This should trigger the confirmation in parent
  onLoadRetry: () => void;
  // priorityMapFromDB: Record<string, string>; // Pass this if used from parent
}

export function TrashView({
  deletedTasks,
  loadingTrash,
  trashError,
  onRestoreTask,
  onPermanentlyDeleteTask,
  onLoadRetry,
  // priorityMapFromDB // Destructure if passed as prop
}: TrashViewProps) {
  if (loadingTrash) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">正在加载已删除的任务...</p>
      </div>
    );
  }

  if (trashError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-500">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">加载回收站失败</h2>
        <p>{trashError.message}</p>
        <Button onClick={onLoadRetry} className="mt-4">重试</Button>
      </div>
    );
  }

  if (deletedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Trash2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">回收站是空的</h3>
        <p className="text-muted-foreground">没有已删除的任务。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deletedTasks.map((task) => (
        <div 
          key={task.id} 
          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="flex-1 space-y-1">
            <h3 className="text-base font-medium text-muted-foreground line-through">
              {task.isFrog ? "🐸 " : ""}{task.title}
            </h3>
            {task.deletedAt && (
              <p className="text-xs text-muted-foreground">
                删除于: {format(new Date(task.deletedAt), "yyyy-MM-dd HH:mm")}
              </p>
            )}
            {/* Optionally display original priority/dueDate, dimmed */}
            {task.priority && (
              <span className="text-xs text-muted-foreground/70 mr-2">
                原优先级: {priorityMapFromDB[task.priority as string] || task.priority}
              </span>
            )}
            {task.dueDate && (
              <span className="text-xs text-muted-foreground/70">
                原截止日期: {format(new Date(task.dueDate), "yyyy-MM-dd")}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => onRestoreTask(task.id!)}
            >
              <ArrowUpLeft className="h-4 w-4 mr-1.5" />
              恢复
            </Button>
            <Button 
              variant="destructive"
              size="sm" 
              onClick={() => onPermanentlyDeleteTask(task.id!)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              永久删除
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
} 