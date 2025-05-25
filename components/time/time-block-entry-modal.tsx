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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  allowCreationModeSwitch?: boolean;
}

interface FormData {
  title: string;
  activityCategoryId: string; // Store as string for Select component
  taskId: string;           // Store as string for Select component
  date: Date;
  startTime: string;        // HH:mm format
  endTime: string;          // HH:mm format
  notes: string;
  userInputDurationMinutes: string; // New field for editable duration in log modes (input as string)
}

const DEFAULT_DURATION_HOURS = 1;

// Helper function to determine if the current mode is a "log" mode
const isLogMode = (modeToCheck: TimeBlockModalMode): boolean => {
  return ["log-create", "log-edit", "plan-to-log"].includes(modeToCheck);
};

export const TimeBlockEntryModal: React.FC<TimeBlockEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  mode,
  initialData,
  selectedDate,
  tasks = [],
  activityCategories = [],
  allowCreationModeSwitch = false,
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
    userInputDurationMinutes: "", // Initialize new field
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData | 'userInputDurationMinutes', string>>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Internal mode to handle switching between plan-create and log-create when allowCreationModeSwitch is true
  const [currentInternalMode, setCurrentInternalMode] = useState<TimeBlockModalMode>(mode);
  const isDurationManuallySetRef = useRef(false); // Ref to track if duration was manually set by user

  // 使用useRef跟踪模态框是否已初始化，防止重复初始化
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // 只在模态框首次打开时或关闭后重新打开时初始化表单
    if (isOpen && !hasInitializedRef.current) {
      setFormErrors({});
      isDurationManuallySetRef.current = false; // Reset manual flag
      
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
          const timeSource = (currentInternalMode === 'log-edit' || currentInternalMode === 'plan-to-log' || currentInternalMode === 'log-create') && initialData.actualStartTime 
              ? initialData.actualStartTime 
              : initialData.startTime;
              
          if (timeSource) {
              defaultStartTime = typeof timeSource === 'string' ? parseISO(timeSource) : timeSource;
          }
          
          // 处理结束时间
          const endTimeSource = (currentInternalMode === 'log-edit' || currentInternalMode === 'plan-to-log' || currentInternalMode === 'log-create') && initialData.actualEndTime 
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
      
        let initialUserInputDurationMinutes = "";
        
        // 直接检查是否存在durationMinutes字段，不再嵌套在isLogMode条件中
        if (initialData?.durationMinutes !== undefined) {
          console.log("Using explicit durationMinutes from initialData:", initialData.durationMinutes);
          initialUserInputDurationMinutes = initialData.durationMinutes.toString();
          isDurationManuallySetRef.current = true;
        } 
        // 不存在durationMinutes字段时，再根据模式计算默认值
        else if (isLogMode(currentInternalMode)) {
          const sDate = combineDateTime(defaultDate, format(defaultStartTime, "HH:mm"));
          const eDate = combineDateTime(defaultDate, format(defaultEndTime, "HH:mm"));
          if (sDate && eDate && eDate >= sDate) {
            initialUserInputDurationMinutes = differenceInMinutes(eDate, sDate).toString();
          } else {
            initialUserInputDurationMinutes = "0";
          }
          isDurationManuallySetRef.current = false;
        }
        
        // 尝试从taskId获取默认活动分类ID
        let defaultActivityCategoryId = initialData?.activityCategoryId?.toString() || "";
        if (!defaultActivityCategoryId && initialData?.taskId) {
          const taskId = typeof initialData.taskId === 'string' ? initialData.taskId : initialData.taskId.toString();
          if (taskId !== "_none_") {
            const task = tasks.find(t => t.id?.toString() === taskId);
            if (task && task.defaultActivityCategoryId !== undefined) {
              console.log(`从任务 "${task.title}" 获取默认活动分类ID: ${task.defaultActivityCategoryId}`);
              defaultActivityCategoryId = task.defaultActivityCategoryId?.toString() || "";
            }
          }
        }

        return {
          title: initialData?.title || "",
          activityCategoryId: defaultActivityCategoryId,
          taskId: initialData?.taskId?.toString() || "",
          date: defaultDate,
          startTime: format(defaultStartTime, "HH:mm"),
          endTime: format(defaultEndTime, "HH:mm"),
          notes: initialData?.notes || "",
          userInputDurationMinutes: initialUserInputDurationMinutes,
        };
      };
      
      const newFormData = getInitialValues();
      setFormData(newFormData);
      hasInitializedRef.current = true;
      // 如果是创建模式且允许切换，默认显示直接记录页签
      if (mode === "plan-create" && allowCreationModeSwitch) {
        setCurrentInternalMode("log-create");
      } else {
        setCurrentInternalMode(mode);
      }
      
      console.log("Modal initialized with:", 
        newFormData.startTime, 
        newFormData.endTime, 
        "Mode:", mode,
        "Internal Mode:", currentInternalMode,
        "Initial Duration Input:", newFormData.userInputDurationMinutes,
        "Raw durationMinutes from initialData:", initialData?.durationMinutes
      );
    } else if (!isOpen) {
      // 当模态框关闭时，重置初始化标志
      hasInitializedRef.current = false;
    }
  }, [isOpen, initialData]); // 添加initialData为依赖项，确保当初始数据变化时重新计算

  const modalConfig = useMemo(() => {
    switch (currentInternalMode) {
      case "plan-create":
        return { title: "创建计划", submitText: "创建时间块", timeLabelPrefix: "计划" };
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
  }, [currentInternalMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // 直接更新表单值，不做任何自动计算或调整，完全由用户控制
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // 打印一下当前修改，以便调试
    console.log(`InputChange: ${name} = ${value}`);
  };

  const handleSelectChange = (name: keyof FormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // 当选择任务时，自动设置对应的活动分类（如果任务有默认活动分类）
    if (name === "taskId" && value && value !== "_none_") {
      const selectedTask = tasks.find(task => task.id?.toString() === value);
      if (selectedTask && selectedTask.defaultActivityCategoryId !== undefined) {
        console.log(`自动设置活动分类: 任务 "${selectedTask.title}" 的默认分类ID: ${selectedTask.defaultActivityCategoryId}`);
        setFormData(prev => ({ ...prev, activityCategoryId: selectedTask.defaultActivityCategoryId?.toString() || "" }));
      }
    }
  };

  const handleDurationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (isLogMode(currentInternalMode)) {
        isDurationManuallySetRef.current = true;
    }
    if (formErrors.userInputDurationMinutes) {
        setFormErrors(prev => ({...prev, userInputDurationMinutes: undefined}));
    }
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
    // This is for Plan modes' display. Log modes will use calendarTimeInfo and userInputDurationMinutes.
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

  // Calculate calendar duration based on current start/end times for log mode reference and validation
  const calendarTimeInfo = useMemo(() => {
    const startDt = combineDateTime(formData.date, formData.startTime);
    const endDt = combineDateTime(formData.date, formData.endTime);

    if (startDt && endDt) {
      const diffMins = differenceInMinutes(endDt, startDt); // Can be negative
      const absDiffMins = Math.abs(diffMins);
      const hours = Math.floor(absDiffMins / 60);
      const minutes = absDiffMins % 60;
      let durationStr = "";
      if (hours > 0) durationStr += `${hours}小时 `;
      if (minutes > 0 || (hours === 0 && diffMins === 0)) durationStr += `${minutes}分钟`;
      
      return {
        minutes: diffMins, // Actual difference, can be negative
        display: durationStr.trim() || (diffMins === 0 ? "0分钟" : " - "),
        isNegative: diffMins < 0,
      };
    }
    return { minutes: 0, display: " - ", isNegative: false }; // Default/error state
  }, [formData.date, formData.startTime, formData.endTime]);

  // Effect to sync userInputDurationMinutes when start/end times change in log mode
  useEffect(() => {
    if (!isOpen || !isLogMode(currentInternalMode)) {
      return;
    }
  
    console.log("Duration sync effect running, isDurationManuallySet:", isDurationManuallySetRef.current);
    console.log("Current userInputDurationMinutes:", formData.userInputDurationMinutes);
    console.log("initialData?.durationMinutes:", initialData?.durationMinutes);
  
    // 如果是初次渲染且有明确设置的durationMinutes，永远优先使用它
    if (initialData?.durationMinutes !== undefined && !formData.userInputDurationMinutes) {
      setFormData(prev => ({
        ...prev,
        userInputDurationMinutes: String(initialData.durationMinutes)
      }));
      isDurationManuallySetRef.current = true;
      return;
    }
  
    const currentMaxAllowedDuration = calendarTimeInfo.isNegative ? 0 : calendarTimeInfo.minutes;
  
    if (isDurationManuallySetRef.current) {
      const currentUserInputDuration = parseInt(formData.userInputDurationMinutes, 10);
      if (
        isNaN(currentUserInputDuration) ||
        currentUserInputDuration < 0 ||
        currentUserInputDuration > currentMaxAllowedDuration
      ) {
        setFormData((prev) => ({
          ...prev,
          userInputDurationMinutes: currentMaxAllowedDuration.toString(),
        }));
        isDurationManuallySetRef.current = false; 
        toast({
          title: "时长已调整",
          description: "开始/结束时间已更改，或原自定义时长不合法，已自动调整为当前允许的最大时长。",
          variant: "default", 
        });
      }
    } else {
      // Duration was not manually set, so update it to the new calendar duration
      setFormData((prev) => ({
        ...prev,
        userInputDurationMinutes: currentMaxAllowedDuration.toString(),
      }));
    }
  }, [isOpen, currentInternalMode, calendarTimeInfo, formData.userInputDurationMinutes, toast, initialData?.durationMinutes]); // formData.userInputDurationMinutes is needed to re-evaluate if it was changed by other means or needs validation against new calendarTimeInfo

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData | 'userInputDurationMinutes', string>> = {};
    if (!formData.title.trim()) errors.title = "标题不能为空。";
    if (!formData.activityCategoryId) errors.activityCategoryId = "请选择一个活动分类。";
    
    const startDateTime = combineDateTime(formData.date, formData.startTime);
    const endDateTime = combineDateTime(formData.date, formData.endTime);

    if (!formData.startTime) errors.startTime = "开始时间不能为空。";
    else if (!startDateTime) errors.startTime = "开始时间格式无效。";
    
    if (!formData.endTime) errors.endTime = "结束时间不能为空。";
    else if (!endDateTime) errors.endTime = "结束时间格式无效。";

    // No longer enforcing end time > start time here, but calendarTimeInfo handles negative spans
    
    if (isLogMode(currentInternalMode)) {
      const maxAllowedDuration = calendarTimeInfo.isNegative ? 0 : calendarTimeInfo.minutes;
      if (!formData.userInputDurationMinutes.trim()) {
        errors.userInputDurationMinutes = "时长不能为空。";
      } else {
        const durationValue = parseInt(formData.userInputDurationMinutes, 10);
        if (isNaN(durationValue)) {
          errors.userInputDurationMinutes = "时长必须为整数。";
        } else {
          if (durationValue < 0) {
            errors.userInputDurationMinutes = "时长不能为负数。";
          } else if (durationValue > maxAllowedDuration) {
            if (calendarTimeInfo.isNegative) {
                 errors.userInputDurationMinutes = `结束时间早于开始时间，有效时长只能为0分钟。`;
            } else {
                 errors.userInputDurationMinutes = `时长不能超过日历总时长 (${maxAllowedDuration}分钟)。`;
            }
          }
        }
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    
    // 打印提交前的表单状态，确认时间没有被修改
    console.log("FormData at submit:", formData.startTime, formData.endTime, "duration:", formData.userInputDurationMinutes);
    
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

    if (currentInternalMode === "plan-create" || currentInternalMode === "plan-edit") {
      let determinedSourceType = 'manual_entry'; // 默认为 manual_entry
      if (currentInternalMode === 'plan-edit' && initialData?.sourceType === 'task_plan') {
        determinedSourceType = 'task_plan'; // 如果是编辑已有的 task_plan，则保持
      }
      // 如果 mode 是 plan-create，且 initialData 中带有 taskId，这通常意味着从任务列表的"添加到时间轴"入口（但不是时间轴直接创建）
      // 这种情况下，根据用户规则 "任务 -> 添加到时间轴 sourceType task_plan 0"
      if (currentInternalMode === 'plan-create' && initialData?.taskId) {
         determinedSourceType = 'task_plan';
      }


      finalDbPayload = {
        ...commonPayload,
        startTime: startDateTime,
        endTime: endDateTime,
        isLogged: 0,
        sourceType: determinedSourceType,
        actualStartTime: undefined,
        actualEndTime: undefined,
      };
    } else { // log-create, log-edit, plan-to-log
      // 修正：如果原始sourceType为pomodoro_log，则保持为pomodoro_log，否则为time_log
      let determinedSourceType = 'time_log';
      if (initialData?.sourceType === 'pomodoro_log') {
        determinedSourceType = 'pomodoro_log';
      }
      finalDbPayload = {
        ...commonPayload,
        actualStartTime: startDateTime, // 实际时间来自表单
        actualEndTime: endDateTime,   // 实际时间来自表单
        isLogged: 1,
        sourceType: determinedSourceType, // 关键修正
      };

      // 设置计划开始/结束时间 (startTime, endTime)
      if (currentInternalMode === 'log-create') {
        // 对于直接创建日志，计划时间等于实际时间
        finalDbPayload.startTime = startDateTime;
        finalDbPayload.endTime = endDateTime;
      } else { // log-edit 或 plan-to-log
        // 优先使用 initialData 中的原计划时间
        finalDbPayload.startTime = initialData?.startTime 
          ? (typeof initialData.startTime === 'string' ? parseISO(initialData.startTime) : initialData.startTime) 
          : startDateTime; // Fallback to actual times if original plan times are not available
        finalDbPayload.endTime = initialData?.endTime 
          ? (typeof initialData.endTime === 'string' ? parseISO(initialData.endTime) : initialData.endTime) 
          : endDateTime;   // Fallback to actual times
        
        // 对于 plan-to-log，确保 sourceType 也被更新 (虽然上面已经设为 time_log，这里再次强调)
        // 并且，如果 initialData 中有 sourceType，且不是 time_log，也需要确保最终是 time_log
        if (initialData?.sourceType && initialData.sourceType !== 'time_log') {
            // This is handled by the blanket sourceType: 'time_log' assignment above.
            // No specific action needed here for sourceType if it's already set.
        }
      }
    }
    
    // 针对日志类型条目，直接使用用户输入的时长
    if (isLogMode(currentInternalMode)) {
      const parsedDuration = parseInt(formData.userInputDurationMinutes, 10);
      // 确保是有效数字，否则回退到默认计算
      if (!isNaN(parsedDuration) && parsedDuration >= 0) {
        console.log("Using user input duration:", parsedDuration);
        finalDbPayload.durationMinutes = parsedDuration;
      } else {
        // 如果用户输入无效，使用计算值
        const relevantStartTime = finalDbPayload.actualStartTime!;
        const relevantEndTime = finalDbPayload.actualEndTime!;
        const diff = differenceInMinutes(relevantEndTime, relevantStartTime);
        finalDbPayload.durationMinutes = diff >= 0 ? diff : 0;
      }
    } else {
      // 计划条目的时长计算
      const relevantStartTime = finalDbPayload.startTime! ;
      const relevantEndTime = finalDbPayload.endTime!;
      const diff = differenceInMinutes(relevantEndTime, relevantStartTime);
      finalDbPayload.durationMinutes = diff >= 0 ? diff : 0;
    }

    try {
      let savedTimeBlock: TimeBlock;

      const isUpdateOperation = (currentInternalMode === "plan-edit" || currentInternalMode === "log-edit" || (currentInternalMode === "plan-to-log" && initialData?.id !== undefined));

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
          {currentInternalMode === 'plan-to-log' && initialData?.originalPlan && (
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

        {allowCreationModeSwitch && (currentInternalMode === "plan-create" || currentInternalMode === "log-create") && (
          <Tabs
            value={currentInternalMode}
            onValueChange={(value) => setCurrentInternalMode(value as TimeBlockModalMode)}
            className="w-full pt-2 pb-0"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="log-create">直接记录</TabsTrigger>
              <TabsTrigger value="plan-create">创建计划</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

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
                disabled={currentInternalMode === 'plan-to-log' && !!initialData?.taskId} 
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择关联任务 (可选)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">不关联任务</SelectItem>
                  {tasks.filter(task => !task.isDeleted).map((task) => (
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

          {/* Duration Display/Input Field */}
          {isLogMode(currentInternalMode) ? (
            <>
              {/* Duration Input Field Group (Log Modes Only) */}
              <div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="userInputDurationMinutes" className="text-right">时长</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      id="userInputDurationMinutes"
                      name="userInputDurationMinutes"
                      type="number"
                      value={formData.userInputDurationMinutes}
                      onChange={handleDurationInputChange}
                      className={cn("w-full", formErrors.userInputDurationMinutes && "border-red-500")}
                      placeholder="分钟"
                      min="0"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">分钟</span>
                  </div>
                </div>
                {/* Display calculated calendar duration as reference */}
                <div className="grid grid-cols-4 items-center gap-4 mt-1">
                    <div className="col-start-2 col-span-3 text-xs text-muted-foreground">
                      日历时长: {calendarTimeInfo.display}
                      {calendarTimeInfo.isNegative && <span className="text-orange-600"> (结束时间早于开始时间)</span>}
                      {/* 添加调试信息 */}
                      <span className="hidden">{JSON.stringify({userInput: formData.userInputDurationMinutes, initialDataDuration: initialData?.durationMinutes})}</span>
                    </div>
                </div>
                {formErrors.userInputDurationMinutes && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="col-start-2 col-span-3 text-red-500 text-xs mt-1">{formErrors.userInputDurationMinutes}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Existing Duration Display (Plan Modes)
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">时长</Label>
              <p className="col-span-3 text-sm text-muted-foreground">{calculatedDuration}</p>
            </div>
          )}

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