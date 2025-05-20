"use client"
// 这是一个统一的模态框组件，用于创建和编辑时间块（计划）和时间日志（实际记录）。
// 它支持多种模式（如 plan-create, plan-edit, log-create, log-edit, plan-to-log），
// 并根据模式调整表单行为、标题和预填数据。
// 它处理时间块的各种属性，包括标题、分类、关联任务、起止时间、实际起止时间、备注等。

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  TimeBlock,
  Task,
  ActivityCategory,
  ObjectStores,
  add as addDB,
  update as updateDB,
} from "@/lib/db";
import { format, parse, differenceInMinutes, addHours, setHours, setMinutes, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon, Loader2, Tag } from "lucide-react";

export type TimeBlockModalMode =
  | "plan-create"   // 创建新的计划时间块
  | "plan-edit"     // 编辑现有的计划时间块
  | "log-create"    // 创建新的实际时间日志 (直接记录)
  | "log-edit"      // 编辑现有的实际时间日志
  | "plan-to-log";  // 将一个计划时间块确认为实际日志

interface TimeBlockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (timeBlock: TimeBlock) => void;
  mode: TimeBlockModalMode;
  initialData?: Partial<TimeBlock & { originalPlan?: { startTime: Date; endTime: Date } }>;
  selectedDate?: Date; // 用于创建时默认填充日期
  tasks?: Task[];
  activityCategories?: ActivityCategory[];
}

interface FormData {
  title: string;
  activityCategoryId: string; // Store as string for Select component
  taskId: string;           // Store as string for Select component
  date: Date;
  startTime: string;        // HH:mm format
  endTime: string;          // HH:mm format
  notes: string;
}

const DEFAULT_DURATION_HOURS = 1;

export const TimeBlockEntryModal: React.FC<TimeBlockEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  mode,
  initialData,
  selectedDate,
  tasks = [],
  activityCategories = [],
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>({
    title: "",
    activityCategoryId: "",
    taskId: "",
    date: new Date(),
    startTime: "",
    endTime: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);



  // 使用useRef跟踪模态框是否已初始化，防止重复初始化
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // 只在模态框首次打开时或关闭后重新打开时初始化表单
    if (isOpen && !hasInitializedRef.current) {
      setFormErrors({});
      
      // 获取表单初始值函数
      const getInitialValues = (): FormData => {
        const defaultDate = initialData?.date 
          ? (typeof initialData.date === 'string' ? parseISO(initialData.date) : initialData.date) 
          : selectedDate || new Date();
        
        let defaultStartTime = new Date();
        let defaultEndTime = addHours(defaultStartTime, DEFAULT_DURATION_HOURS);

        // 初始化时设置默认时间
        if (initialData) {
          // 处理开始时间
          const timeSource = (mode === 'log-edit' || mode === 'plan-to-log') && initialData.actualStartTime 
              ? initialData.actualStartTime 
              : initialData.startTime;
              
          if (timeSource) {
              defaultStartTime = typeof timeSource === 'string' ? parseISO(timeSource) : timeSource;
          }
          
          // 处理结束时间
          const endTimeSource = (mode === 'log-edit' || mode === 'plan-to-log') && initialData.actualEndTime 
              ? initialData.actualEndTime 
              : initialData.endTime;
              
          if (endTimeSource) {
              defaultEndTime = typeof endTimeSource === 'string' ? parseISO(endTimeSource) : endTimeSource;
          }
        } else {
          // 新建模式
          const now = new Date();
          defaultStartTime = setMinutes(setHours(now, now.getHours()), Math.ceil(now.getMinutes()/15)*15); // next 15 min
          defaultEndTime = addHours(defaultStartTime, DEFAULT_DURATION_HOURS);
        }
      
        return {
          title: initialData?.title || "",
          activityCategoryId: initialData?.activityCategoryId?.toString() || "",
          taskId: initialData?.taskId?.toString() || "",
          date: defaultDate,
          startTime: format(defaultStartTime, "HH:mm"),
          endTime: format(defaultEndTime, "HH:mm"),
          notes: initialData?.notes || "",
        };
      };
      
      const newFormData = getInitialValues();
      setFormData(newFormData);
      hasInitializedRef.current = true;
      
      console.log("Modal initialized with:", 
        newFormData.startTime, 
        newFormData.endTime, 
        "Mode:", mode
      );
    } else if (!isOpen) {
      // 当模态框关闭时，重置初始化标志
      hasInitializedRef.current = false;
    }
  }, [isOpen]); // 只在isOpen变化时触发，其他依赖项通过函数闭包访问最新值

  const modalConfig = useMemo(() => {
    switch (mode) {
      case "plan-create":
        return { title: "添加新时间块", submitText: "创建时间块", timeLabelPrefix: "计划" };
      case "plan-edit":
        return { title: "编辑时间块", submitText: "保存更改", timeLabelPrefix: "计划" };
      case "log-create":
        return { title: "记录活动", submitText: "添加记录", timeLabelPrefix: "实际" };
      case "log-edit":
        return { title: "编辑时间日志", submitText: "保存日志", timeLabelPrefix: "实际" };
      case "plan-to-log":
        return { title: "确认并记录活动", submitText: "确认并记录", timeLabelPrefix: "实际" };
      default: // Should not happen
        return { title: "时间条目", submitText: "保存", timeLabelPrefix: "" };
    }
  }, [mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // 直接更新表单值，不做任何自动计算或调整，完全由用户控制
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // 打印一下当前修改，以便调试
    console.log(`InputChange: ${name} = ${value}`);
  };

  const handleSelectChange = (name: keyof FormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({ ...prev, date }));
    }
  };

  const combineDateTime = (date: Date, timeStr: string): Date | null => {
    try {
      const [hours, minutes] = timeStr.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) return null;
      const newDate = new Date(date);
      newDate.setHours(hours, minutes, 0, 0);
      return newDate;
    } catch (error) {
      return null;
    }
  };
  
  const calculatedDuration = useMemo(() => {
    const startDateTime = combineDateTime(formData.date, formData.startTime);
    const endDateTime = combineDateTime(formData.date, formData.endTime);
    if (startDateTime && endDateTime && endDateTime > startDateTime) {
      const diffMins = differenceInMinutes(endDateTime, startDateTime);
      const hours = Math.floor(diffMins / 60);
      const minutes = diffMins % 60;
      let durationStr = "";
      if (hours > 0) durationStr += `${hours}小时 `;
      if (minutes > 0) durationStr += `${minutes}分钟`;
      return durationStr.trim() || "0分钟";
    }
    return " - ";
  }, [formData.date, formData.startTime, formData.endTime]);


  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.title.trim()) errors.title = "标题不能为空。";
    if (!formData.activityCategoryId) errors.activityCategoryId = "请选择一个活动分类。";
    
    const startDateTime = combineDateTime(formData.date, formData.startTime);
    const endDateTime = combineDateTime(formData.date, formData.endTime);

    if (!formData.startTime) errors.startTime = "开始时间不能为空。";
    else if (!startDateTime) errors.startTime = "开始时间格式无效。";
    
    if (!formData.endTime) errors.endTime = "结束时间不能为空。";
    else if (!endDateTime) errors.endTime = "结束时间格式无效。";

    // 不再强制检查结束时间是否晚于开始时间，允许用户自由设置
    // 如果需要调试，可以打印一下：
    // console.log(`Start: ${formData.startTime}, End: ${formData.endTime}`);
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    
    // 打印提交前的表单状态，确认时间没有被修改
    console.log("FormData at submit:", formData.startTime, formData.endTime);
    
    const startDateTime = combineDateTime(formData.date, formData.startTime)!;
    const endDateTime = combineDateTime(formData.date, formData.endTime)!;

    // 处理 activityCategoryId，确保为数字或 undefined
    const activityIdString = formData.activityCategoryId;
    const parsedActivityId = (activityIdString && activityIdString.trim() !== "") ? parseInt(activityIdString, 10) : undefined;
    const finalActivityCategoryId = (typeof parsedActivityId === 'number' && !isNaN(parsedActivityId)) ? parsedActivityId : undefined;

    // 构建基础 payload，不包含 id
    const commonPayload: Omit<Partial<TimeBlock>, "id" | "createdAt" | "updatedAt"> & { updatedAt: Date } = {
      title: formData.title.trim(),
      activityCategoryId: finalActivityCategoryId, // 使用处理后的值
      taskId: formData.taskId === "_none_" || formData.taskId === "" ? undefined : (isNaN(parseInt(formData.taskId)) ? formData.taskId : parseInt(formData.taskId)),
      notes: formData.notes.trim() || undefined,
      date: format(formData.date, "yyyy-MM-dd"),
      updatedAt: new Date(),
      // startTime, endTime, actualStartTime, actualEndTime, isLogged, sourceType, durationMinutes, createdAt 将根据模式添加
    };

    let finalDbPayload: Partial<TimeBlock> = {};

    if (mode === "plan-create" || mode === "plan-edit") {
      finalDbPayload = {
        ...commonPayload,
        startTime: startDateTime,
        endTime: endDateTime,
        isLogged: 0,
        sourceType: formData.taskId ? 'task_plan' : (initialData?.sourceType || 'manual_entry'),
        actualStartTime: undefined,
        actualEndTime: undefined,
      };
    } else { // log-create, log-edit, plan-to-log
      finalDbPayload = {
        ...commonPayload,
        actualStartTime: startDateTime,
        actualEndTime: endDateTime,
        isLogged: 1,
      };
      if (mode === 'plan-to-log' && initialData) {
        finalDbPayload.startTime = initialData.startTime ? (typeof initialData.startTime === 'string' ? parseISO(initialData.startTime) : initialData.startTime) : undefined;
        finalDbPayload.endTime = initialData.endTime ? (typeof initialData.endTime === 'string' ? parseISO(initialData.endTime) : initialData.endTime) : undefined;
        finalDbPayload.sourceType = initialData.sourceType || 'manual_entry';
      } else if (initialData?.startTime && initialData?.endTime) { // log-edit with existing plan times
        finalDbPayload.startTime = typeof initialData.startTime === 'string' ? parseISO(initialData.startTime) : initialData.startTime;
        finalDbPayload.endTime = typeof initialData.endTime === 'string' ? parseISO(initialData.endTime) : initialData.endTime;
        finalDbPayload.sourceType = initialData.sourceType || 'manual_entry';
      } else {
        finalDbPayload.startTime = startDateTime;
        finalDbPayload.endTime = endDateTime;
        finalDbPayload.sourceType = initialData?.sourceType || 'manual_entry';
      }
    }
    
    const relevantStartTime = finalDbPayload.isLogged === 1 ? finalDbPayload.actualStartTime! : finalDbPayload.startTime! ;
    const relevantEndTime = finalDbPayload.isLogged === 1 ? finalDbPayload.actualEndTime! : finalDbPayload.endTime!;
    // 确保 relevantStartTime 和 relevantEndTime 不是 undefined 才进行计算
    let durationMins: number | undefined = undefined;
    if (relevantStartTime && relevantEndTime) {
        const diff = differenceInMinutes(relevantEndTime, relevantStartTime);
        if (diff > 0) {
            durationMins = diff;
        }
    }
    finalDbPayload.durationMinutes = durationMins;


    try {
      let savedTimeBlock: TimeBlock;

      const isUpdateOperation = (mode === "plan-edit" || mode === "log-edit" || (mode === "plan-to-log" && initialData?.id !== undefined));

      if (isUpdateOperation) {
        if (initialData?.id === undefined) {
          toast({ title: "错误", description: "更新失败：条目ID缺失。", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        const payloadToUpdate: TimeBlock = { 
            ...(initialData as TimeBlock), 
            ...finalDbPayload, 
            id: initialData.id 
        };
        await updateDB(ObjectStores.TIME_BLOCKS, payloadToUpdate);
        savedTimeBlock = payloadToUpdate;
        toast({ title: "更新成功", description: `"${savedTimeBlock.title}" 已更新。` });
      } else {
        const payloadToAdd: Omit<TimeBlock, "id"> = {
            ...(finalDbPayload as Omit<TimeBlock, "id" | "createdAt">), 
            createdAt: new Date() 
        };
        const newId = await addDB(ObjectStores.TIME_BLOCKS, payloadToAdd);
        savedTimeBlock = { ...payloadToAdd, id: newId } as TimeBlock;
        toast({ title: "创建成功", description: `"${savedTimeBlock.title}" 已添加。` });
      }
      
      onSubmitSuccess(savedTimeBlock);
      onClose();
    } catch (error) {
      console.error("Failed to save time block:", error);
      toast({
        title: "保存失败",
        description: "无法保存时间条目，请检查数据或稍后再试。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getCategoryColor = (categoryId: string | undefined) => {
    if (!categoryId) return undefined;
    const cat = activityCategories.find(c => c.id?.toString() === categoryId);
    return cat?.color;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{modalConfig.title}</DialogTitle>
          {mode === 'plan-to-log' && initialData?.originalPlan && (
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              原计划：
              {format(typeof initialData.originalPlan.startTime === 'string' ? parseISO(initialData.originalPlan.startTime) : initialData.originalPlan.startTime, "HH:mm", { locale: zhCN })} - 
              {format(typeof initialData.originalPlan.endTime === 'string' ? parseISO(initialData.originalPlan.endTime) : initialData.originalPlan.endTime, "HH:mm", { locale: zhCN })} 
              ({differenceInMinutes(
                typeof initialData.originalPlan.endTime === 'string' ? parseISO(initialData.originalPlan.endTime) : initialData.originalPlan.endTime,
                typeof initialData.originalPlan.startTime === 'string' ? parseISO(initialData.originalPlan.startTime) : initialData.originalPlan.startTime
              )}分钟)
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Title Field Group */}
          <div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">标题</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="例如：团队会议、晨间阅读"
              />
            </div>
            {formErrors.title && <div className="grid grid-cols-4 items-center gap-4"><p className="col-start-2 col-span-3 text-red-500 text-xs mt-1">{formErrors.title}</p></div>}
          </div>

          {/* Activity Category Field Group */}
          <div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="activityCategoryId" className="text-right">分类</Label>
              <Select
                name="activityCategoryId"
                value={formData.activityCategoryId}
                onValueChange={handleSelectChange("activityCategoryId")}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择活动分类">
                   {formData.activityCategoryId ? (
                      <span className="flex items-center">
                        {getCategoryColor(formData.activityCategoryId) && <Tag className="h-4 w-4 mr-2 rounded-full" style={{ color: getCategoryColor(formData.activityCategoryId) }} />}
                        {activityCategories.find(cat => cat.id?.toString() === formData.activityCategoryId)?.name || "选择活动分类"}
                      </span>
                    ) : "选择活动分类"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activityCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id!.toString()}>
                      <div className="flex items-center">
                        {cat.color && <span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: cat.color }} />}
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formErrors.activityCategoryId && <div className="grid grid-cols-4 items-center gap-4"><p className="col-start-2 col-span-3 text-red-500 text-xs mt-1">{formErrors.activityCategoryId}</p></div>}
          </div>
          
          {/* Associated Task (Optional) Field Group */}
          <div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taskId" className="text-right">关联任务</Label>
              <Select
                name="taskId"
                value={formData.taskId}
                onValueChange={handleSelectChange("taskId")}
                disabled={mode === 'plan-to-log' && !!initialData?.taskId} 
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择关联任务 (可选)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">不关联任务</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id!.toString()}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Field Group */}
          <div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">日期</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP", { locale: zhCN }) : <span>选择日期</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Start Time Field Group */}
          <div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startTime" className="text-right">{modalConfig.timeLabelPrefix}开始</Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                value={formData.startTime}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            {formErrors.startTime && <div className="grid grid-cols-4 items-center gap-4"><p className="col-start-2 col-span-3 text-red-500 text-xs mt-1">{formErrors.startTime}</p></div>}
          </div>

          {/* End Time Field Group */}
          <div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTime" className="text-right">{modalConfig.timeLabelPrefix}结束</Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                value={formData.endTime}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            {formErrors.endTime && <div className="grid grid-cols-4 items-center gap-4"><p className="col-start-2 col-span-3 text-red-500 text-xs mt-1">{formErrors.endTime}</p></div>}
          </div>

          {/* Duration Display (Not a field group with error, so no extra div wrapper needed unless error handling is added for it) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">时长</Label>
            <p className="col-span-3 text-sm text-muted-foreground">{calculatedDuration}</p>
          </div>

          {/* Notes (Optional) Field Group */}
          <div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notes" className="text-right pt-2">备注</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="添加额外说明..."
                rows={3}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>取消</Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="min-w-[100px]">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : modalConfig.submitText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TimeBlockEntryModal; 