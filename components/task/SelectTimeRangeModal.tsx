"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Task } from "@/lib/task-utils"; // 假设 Task 类型定义在此
import { toast } from "sonner";

interface SelectTimeRangeModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  task: Task | null;
  onConfirm: (
    taskId: string,
    taskTitle: string,
    date: string,
    startTime: string,
    endTime: string
  ) => void;
}

export function SelectTimeRangeModal({
  isOpen,
  onOpenChange,
  task,
  onConfirm,
}: SelectTimeRangeModalProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    if (isOpen && task) {
      // 默认日期为今天
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const todayLocal = new Date(today.getTime() - offset * 60 * 1000);
      setSelectedDate(todayLocal.toISOString().split("T")[0]);
      
      // 简单的默认时间，例如 09:00 到 10:00
      setStartTime("09:00");
      setEndTime("10:00");
    }
  }, [isOpen, task]);

  if (!task) return null;

  const handleSubmit = () => {
    if (!selectedDate || !startTime || !endTime) {
      toast.error("请选择日期、开始时间和结束时间。");
      return;
    }
    if (new Date(`${selectedDate}T${startTime}`) >= new Date(`${selectedDate}T${endTime}`)) {
        toast.error("结束时间必须晚于开始时间。");
        return;
    }
    onConfirm(String(task.id), task.title, selectedDate, startTime, endTime);
    onOpenChange(false); // 关闭模态框
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>添加到时间轴: {task.title}</DialogTitle>
          <DialogDescription>
            请为任务 "{task.title}" 选择一个时间段。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              日期
            </Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start-time" className="text-right">
              开始时间
            </Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="col-span-3"
              step="300" // 5分钟间隔
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-time" className="text-right">
              结束时间
            </Label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="col-span-3"
              step="300" // 5分钟间隔
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              取消
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit}>
            确认添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
