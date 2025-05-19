"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { format, addDays, getDay, formatISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Project as DBProject, Task as DBTask } from "@/lib/db";
import { NO_PROJECT_VALUE, TaskPriority as UtilTaskPriority } from "@/lib/task-utils";
import { toast } from "sonner";
import { 
  RecurrenceRule, 
  serializeRecurrenceRule, 
  getRecurrenceDescription 
} from '@/lib/recurrence-utils';

// Priority type, consistent with UIPriority used elsewhere
// Export this type so it can be imported by other components like EditTaskDialog
export type UIPriority = "importantUrgent" | "importantNotUrgent" | "notImportantUrgent" | "notImportantNotUrgent";

// Task Category Type - matches definition in task-utils.ts
export type TaskCategory = "next_action" | "someday_maybe" | "waiting_for";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly" | "workdays";
export type RecurrenceEndsType = "never" | "on_date" | "after_occurrences";

export interface TaskFormData {
  title: string;
  description?: string;
  
  category: TaskCategory;
  priority: UIPriority;
  
  plannedDate?: Date;
  dueDate?: Date;
  
  estimatedDurationHours?: number;

  projectId?: number | string;
  tags: string[];
  isFrog: boolean;

  isRecurring: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceRule?: string;
  recurrenceEndsType?: RecurrenceEndsType;
  recurrenceEndDate?: Date;
  recurrenceCount?: number;
}

interface TaskFormFieldsProps {
  initialData?: Partial<TaskFormData & {priority: UIPriority}>;
  availableProjects: DBProject[];
  onSave: (taskData: TaskFormData) => Promise<void>;
  onCancel: () => void;
  onCreateNewProjectInForm?: (name: string) => Promise<number | undefined>;
  submitButtonText?: string;
  showCancelButton?: boolean;
  pomodoroDurationMinutes?: number;
}

export function TaskFormFields({
  initialData,
  availableProjects,
  onSave,
  onCancel,
  onCreateNewProjectInForm,
  submitButtonText = "保存任务",
  showCancelButton = true,
  pomodoroDurationMinutes = 25,
}: TaskFormFieldsProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  
  const [category, setCategory] = useState<TaskCategory>(initialData?.category || "next_action");
  
  const [priority, setPriority] = useState<UIPriority>(initialData?.priority || "notImportantNotUrgent");

  const [plannedDate, setPlannedDate] = useState<Date | undefined>(
    initialData?.plannedDate ? new Date(initialData.plannedDate) : undefined
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialData?.dueDate ? new Date(initialData.dueDate) : undefined
  );

  const [projectId, setProjectId] = useState<string | number | undefined>(initialData?.projectId);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  
  const [estimatedDurationHours, setEstimatedDurationHours] = useState<number>(initialData?.estimatedDurationHours || 0);

  const [isRecurring, setIsRecurring] = useState<boolean>(initialData?.isRecurring || false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency | undefined>(initialData?.recurrenceFrequency || "daily");
  const [recurrenceEndsType, setRecurrenceEndsType] = useState<RecurrenceEndsType | undefined>(initialData?.recurrenceEndsType || "never");
  const [recurrenceEndDateVal, setRecurrenceEndDateVal] = useState<Date | undefined>(
    initialData?.recurrenceEndDate ? new Date(initialData.recurrenceEndDate) : undefined
  );
  const [recurrenceCount, setRecurrenceCount] = useState<number>(initialData?.recurrenceCount || 2);
  
  const [isFrog, setIsFrog] = useState<boolean>(initialData?.isFrog || false);

  const [internalProjects, setInternalProjects] = useState<DBProject[]>(availableProjects);

  const estimatedPomodorosDisplay = useMemo(() => {
    if (estimatedDurationHours > 0 && pomodoroDurationMinutes > 0) {
      const totalMinutes = estimatedDurationHours * 60;
      const pomodoros = Math.ceil(totalMinutes / pomodoroDurationMinutes);
      return pomodoros;
    }
    return 0;
  }, [estimatedDurationHours, pomodoroDurationMinutes]);
  
  useEffect(() => {
    if (category === "someday_maybe" || category === "waiting_for") {
      setIsFrog(false);
    }
  }, [category]);

  useEffect(() => {
    if (isRecurring) {
    }
  }, [isRecurring]);
  
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setCategory(initialData.category || "next_action");
      setPriority(initialData.priority || "notImportantNotUrgent");
      setPlannedDate(initialData.plannedDate ? new Date(initialData.plannedDate) : undefined);
      setDueDate(initialData.dueDate ? new Date(initialData.dueDate) : undefined);
      setProjectId(initialData.projectId);
      setTags(initialData.tags || []);
      setEstimatedDurationHours(initialData.estimatedDurationHours || 0);
      setIsFrog(initialData.isFrog || false);
      
      setIsRecurring(initialData.isRecurring || false);
      setRecurrenceFrequency(initialData.recurrenceFrequency || "daily");
      setRecurrenceEndsType(initialData.recurrenceEndsType || "never");
      setRecurrenceEndDateVal(initialData.recurrenceEndDate ? new Date(initialData.recurrenceEndDate) : undefined);
      setRecurrenceCount(initialData.recurrenceCount || 2);
    }
  }, [initialData]);

  useEffect(() => {
    setInternalProjects(availableProjects);
  }, [availableProjects]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("任务标题不能为空");
      return;
    }

    let finalDueDate = dueDate;
    if (isRecurring) {
      finalDueDate = undefined;
    }
    
    let recurrenceRuleString: string | undefined = undefined;
    if (isRecurring && recurrenceFrequency) {
      let startDate = plannedDate || dueDate;
      if (!startDate) {
        startDate = new Date();
      }

      const rule: RecurrenceRule = {
        frequency: recurrenceFrequency,
        startDate: startDate,
        endsType: recurrenceEndsType || 'never',
        endDate: recurrenceEndsType === 'on_date' ? recurrenceEndDateVal : undefined,
        occurrences: recurrenceEndsType === 'after_occurrences' ? recurrenceCount : undefined,
        dayOfWeek: startDate.getDay()
      };

      try {
        recurrenceRuleString = serializeRecurrenceRule(rule);
        console.log("Generated recurrence rule string:", recurrenceRuleString);
      } catch (e) {
        console.error("Error generating recurrence rule string:", e);
        toast.error("无法生成重复规则，请检查日期和选项。");
      }
    }

    const taskDataToSave: TaskFormData = {
      title,
      description: description || undefined,
      category,
      priority, 
      plannedDate,
      dueDate: finalDueDate, 
      estimatedDurationHours: estimatedDurationHours > 0 ? estimatedDurationHours : 0,
      projectId,
      tags,
      isFrog,
      isRecurring,
      recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
      recurrenceRule: isRecurring ? recurrenceRuleString : undefined, 
      recurrenceEndsType: isRecurring ? recurrenceEndsType : undefined,
      recurrenceEndDate: isRecurring && recurrenceEndsType === 'on_date' ? recurrenceEndDateVal : undefined,
      recurrenceCount: isRecurring && recurrenceEndsType === 'after_occurrences' ? recurrenceCount : undefined,
    };
    await onSave(taskDataToSave);
  };
  
  const handleInternalCreateNewProject = async (name: string): Promise<number | undefined> => {
    if (onCreateNewProjectInForm) {
        const newProjectId = await onCreateNewProjectInForm(name);
        if (newProjectId) {
            setProjectId(newProjectId);
        }
        return newProjectId;
    }
    return undefined;
  };

  const getRecurrenceHint = () => {
    if (!isRecurring || !recurrenceFrequency) return "";
    const startDate = plannedDate || dueDate;
    if (!startDate) return "请先选择一个计划日期或截止日期作为重复的起始点。";

    const rule: RecurrenceRule = {
      frequency: recurrenceFrequency,
      startDate: startDate,
      endsType: recurrenceEndsType || 'never',
      endDate: recurrenceEndsType === 'on_date' ? recurrenceEndDateVal : undefined,
      occurrences: recurrenceEndsType === 'after_occurrences' ? recurrenceCount : undefined,
      dayOfWeek: startDate.getDay()
    };

    return getRecurrenceDescription(rule);
  };

  const areDateTimeFieldsOptional = category === "someday_maybe" || category === "waiting_for";

  return (
    <div className="space-y-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor={`task-title-${initialData?.title || 'new'}`}>任务标题 <span className="text-red-500">*</span></Label>
        <Input id={`task-title-${initialData?.title || 'new'}`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：完成报告初稿" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`task-description-${initialData?.title || 'new'}`}>描述</Label>
        <Textarea id={`task-description-${initialData?.title || 'new'}`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="详细说明任务内容（可选）" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`task-category-${initialData?.title || 'new'}`}>任务类别</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as TaskCategory)}>
            <SelectTrigger id={`task-category-${initialData?.title || 'new'}`}><SelectValue placeholder="选择任务类别" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="next_action">下一步行动</SelectItem>
              <SelectItem value="someday_maybe">将来/也许</SelectItem>
              <SelectItem value="waiting_for">等待中</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`task-priority-${initialData?.title || 'new'}`}>优先级</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as UIPriority)}>
            <SelectTrigger id={`task-priority-${initialData?.title || 'new'}`}><SelectValue placeholder="选择优先级" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="importantUrgent"><div className="flex items-center"><div className="h-3 w-3 rounded-sm bg-red-500 mr-2" />重要且紧急</div></SelectItem>
              <SelectItem value="importantNotUrgent"><div className="flex items-center"><div className="h-3 w-3 rounded-sm bg-amber-500 mr-2" />重要不紧急</div></SelectItem>
              <SelectItem value="notImportantUrgent"><div className="flex items-center"><div className="h-3 w-3 rounded-sm bg-blue-500 mr-2" />不重要但紧急</div></SelectItem>
              <SelectItem value="notImportantNotUrgent"><div className="flex items-center"><div className="h-3 w-3 rounded-sm bg-green-500 mr-2" />不重要不紧急</div></SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`task-plannedDate-${initialData?.title || 'new'}`}>
            计划日期 {areDateTimeFieldsOptional && <span className="text-xs text-muted-foreground">(可选)</span>}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !plannedDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {plannedDate ? format(new Date(plannedDate), "yyyy-MM-dd") : <span>选择日期</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent mode="single" selected={plannedDate} onSelect={setPlannedDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid gap-2">
           <Label htmlFor={`task-dueDate-${initialData?.title || 'new'}`}>
            截止日期 {isRecurring ? <span className="text-xs text-muted-foreground">(由重复规则决定)</span> : areDateTimeFieldsOptional ? <span className="text-xs text-muted-foreground">(可选)</span> : ""}
          </Label>
          <Popover>
            <PopoverTrigger asChild disabled={isRecurring}>
              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground", isRecurring && "cursor-not-allowed opacity-50")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(new Date(dueDate), "yyyy-MM-dd") : <span>选择日期</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div className="grid gap-2">
          <Label htmlFor={`task-project-${initialData?.title || 'new'}`}>关联项目</Label>
           <Select
            value={projectId ? String(projectId) : NO_PROJECT_VALUE}
            onValueChange={async (value) => {
              if (value === 'new-project-in-task-form') { 
                const newName = prompt("请输入新项目的名称:");
                if (newName && onCreateNewProjectInForm) {
                  await handleInternalCreateNewProject(newName);
                } else if (newName && !onCreateNewProjectInForm){
                  toast.error("此表单不支持内部创建项目功能。")
                }
              } else if (value === NO_PROJECT_VALUE) {
                setProjectId(undefined);
              } else {
                setProjectId(value ? parseInt(value, 10) : undefined);
              }
            }}
          >
            <SelectTrigger id={`task-project-${initialData?.title || 'new'}`}><SelectValue placeholder="选择项目（可选）" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROJECT_VALUE}>无项目</SelectItem>
              {internalProjects.map((proj) => (
                proj.id !== undefined && <SelectItem key={proj.id} value={String(proj.id)}>{proj.name}</SelectItem>
              ))}
              {onCreateNewProjectInForm && 
                <SelectItem value="new-project-in-task-form">+ 创建新项目</SelectItem>
              }
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
            <Label htmlFor={`task-tags-${initialData?.title || 'new'}`}>标签 (逗号分隔)</Label>
            <Input 
                id={`task-tags-${initialData?.title || 'new'}`}
                placeholder="例如: 工作,个人"
                value={tags.join(", ")}
                onChange={(e) => setTags(e.target.value.split(",").map(tag => tag.trim()).filter(tag => tag))}
            />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
            <Label htmlFor={`task-estimatedDurationHours-${initialData?.title || 'new'}`}>
              预估用时 (小时) {areDateTimeFieldsOptional && <span className="text-xs text-muted-foreground">(可选)</span>}
            </Label>
            <Input 
                id={`task-estimatedDurationHours-${initialData?.title || 'new'}`}
                type="number"
                min="0"
                step="0.25"
                value={estimatedDurationHours}
                onChange={(e) => setEstimatedDurationHours(parseFloat(e.target.value) || 0)}
                placeholder="例如: 1.5"
            />
            {estimatedPomodorosDisplay > 0 && (
                <p className="text-xs text-muted-foreground mt-1">约 {estimatedPomodorosDisplay} 个番茄钟 (每个 {pomodoroDurationMinutes} 分钟)</p>
            )}
        </div>
      </div>
      <div className="space-y-3 pt-3 border-t border-border/40 mt-4">
        <div className="flex items-center space-x-2">
          <Switch
            id={`task-isRecurring-${initialData?.title || 'new'}`}
            checked={isRecurring}
            onCheckedChange={setIsRecurring}
          />
          <Label htmlFor={`task-isRecurring-${initialData?.title || 'new'}`} className="text-sm font-medium">重复任务</Label>
        </div>

        {isRecurring && (
          <div className="p-4 space-y-4 border rounded-md bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="grid gap-2">
                <Label htmlFor={`task-recurrenceFrequency-${initialData?.title || 'new'}`}>重复频率</Label>
                <Select value={recurrenceFrequency} onValueChange={(v) => setRecurrenceFrequency(v as RecurrenceFrequency)}>
                  <SelectTrigger><SelectValue placeholder="选择频率" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">每天</SelectItem>
                    <SelectItem value="workdays">仅工作日 (周一至五)</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                    <SelectItem value="monthly">每月</SelectItem>
                    <SelectItem value="yearly">每年</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground min-h-[1.5em]">{getRecurrenceHint()}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`task-recurrenceEndsType-${initialData?.title || 'new'}`}>结束条件</Label>
                <Select value={recurrenceEndsType} onValueChange={(v) => setRecurrenceEndsType(v as RecurrenceEndsType)}>
                   <SelectTrigger><SelectValue placeholder="选择结束条件" /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="never">一直重复</SelectItem>
                     <SelectItem value="on_date">按日期结束</SelectItem>
                     <SelectItem value="after_occurrences">按次数结束</SelectItem>
                   </SelectContent>
                </Select>
              </div>
            </div>
            {recurrenceEndsType === 'on_date' && (
              <div className="grid gap-2">
                <Label htmlFor={`task-recurrenceEndDate-${initialData?.title || 'new'}`}>结束于</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full md:w-1/2 justify-start text-left font-normal", !recurrenceEndDateVal && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {recurrenceEndDateVal ? format(new Date(recurrenceEndDateVal), "yyyy-MM-dd") : <span>选择结束日期</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={recurrenceEndDateVal} onSelect={setRecurrenceEndDateVal} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            {recurrenceEndsType === 'after_occurrences' && (
              <div className="grid gap-2">
                <Label htmlFor={`task-recurrenceCount-${initialData?.title || 'new'}`}>重复次数</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id={`task-recurrenceCount-${initialData?.title || 'new'}`}
                    type="number"
                    min="1"
                    value={recurrenceCount}
                    onChange={(e) => setRecurrenceCount(parseInt(e.target.value, 10) || 1)}
                    className="w-24"
                  />
                  <span>次后结束</span>
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground flex items-center">
                <InfoCircledIcon className="mr-1 h-3 w-3" />
                <span>当前使用内置重复逻辑。如需iCalendar兼容或更复杂规则，可考虑集成rrule.js等库。</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox 
          id={`task-isFrog-${initialData?.title || 'new'}`} 
          checked={isFrog} 
          onCheckedChange={(checked) => setIsFrog(!!checked)}
          disabled={category === "someday_maybe" || category === "waiting_for"} 
        />
        <Label 
          htmlFor={`task-isFrog-${initialData?.title || 'new'}`} 
          className={cn("text-sm font-medium", (category === "someday_maybe" || category === "waiting_for") && "text-muted-foreground cursor-not-allowed")}
        >
          标记为青蛙任务
        </Label>
      </div>
      <div className="flex justify-end space-x-2 pt-6">
        {showCancelButton && <Button variant="outline" onClick={onCancel}>取消</Button>}
        <Button onClick={handleSubmit}>{submitButtonText}</Button>
      </div>
    </div>
  );
} 