"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Project as DBProject, Task as DBTask } from "@/lib/db";
import { NO_PROJECT_VALUE } from "@/lib/task-utils";
import { toast } from "sonner";

// Priority type, consistent with UIPriority used elsewhere
// Export this type so it can be imported by other components like EditTaskDialog
export type UIPriority = "importantUrgent" | "importantNotUrgent" | "notImportantUrgent" | "notImportantNotUrgent";

export interface TaskFormData extends Partial<Omit<DBTask, 'id' | 'createdAt' | 'updatedAt' | 'completed' | 'isDeleted' | 'isRecurring' | 'actualPomodoros' | 'subtasks' | 'priority' | 'isFrog' | 'projectId'>> {
  title: string;
  description?: string;
  priority: UIPriority;
  dueDate?: Date;
  projectId?: number | string; // Can be number (existing) or string (special values like NO_PROJECT_VALUE)
  tags: string[];
  isFrog: boolean;
  estimatedPomodoros?: number;
}

interface TaskFormFieldsProps {
  initialData?: Partial<TaskFormData>; // For editing, not used by UnifiedAddModal for creation yet
  availableProjects: DBProject[];
  onSave: (taskData: TaskFormData) => Promise<void>;
  onCancel: () => void;
  onCreateNewProjectInForm?: (name: string) => Promise<number | undefined>; // Optional, for UnifiedAddModal
  submitButtonText?: string;
  showCancelButton?: boolean;
}

export function TaskFormFields({
  initialData,
  availableProjects,
  onSave,
  onCancel,
  onCreateNewProjectInForm,
  submitButtonText = "保存任务",
  showCancelButton = true,
}: TaskFormFieldsProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [priority, setPriority] = useState<UIPriority>(initialData?.priority || "notImportantNotUrgent");
  const [dueDate, setDueDate] = useState<Date | undefined>(initialData?.dueDate ? new Date(initialData.dueDate) : undefined);
  const [projectId, setProjectId] = useState<string | number | undefined>(initialData?.projectId);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [isFrog, setIsFrog] = useState<boolean>(initialData?.isFrog || false);
  const [estimatedPomodoros, setEstimatedPomodoros] = useState<number>(initialData?.estimatedPomodoros || 0);
  
  const [internalProjects, setInternalProjects] = useState<DBProject[]>(availableProjects);

  useEffect(() => {
    setInternalProjects(availableProjects);
  }, [availableProjects]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setPriority(initialData.priority || "notImportantNotUrgent");
      setDueDate(initialData.dueDate ? new Date(initialData.dueDate) : undefined);
      setProjectId(initialData.projectId);
      setTags(initialData.tags || []);
      setIsFrog(initialData.isFrog || false);
      setEstimatedPomodoros(initialData.estimatedPomodoros || 0);
    }
  }, [initialData]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("任务标题不能为空");
      return;
    }
    const taskDataToSave: TaskFormData = {
      title,
      description: description || undefined,
      priority,
      dueDate,
      projectId,
      tags,
      isFrog,
      estimatedPomodoros: estimatedPomodoros > 0 ? estimatedPomodoros : 0,
    };
    await onSave(taskDataToSave);
  };
  
  const handleInternalCreateNewProject = async (name: string): Promise<number | undefined> => {
    if (onCreateNewProjectInForm) {
        const newProjectId = await onCreateNewProjectInForm(name);
        if (newProjectId) {
            // Refresh local project list for select dropdown
            // This assumes the parent (UnifiedAddModal) will refresh the availableProjects list
            // For a more robust solution, the parent might need to pass down a function to refetch or update internalProjects
            // Or, a global state/context for projects could be used.
            // For now, let's rely on the parent to update `availableProjects` prop which triggers the useEffect.
            setProjectId(newProjectId); // Select the newly created project
        }
        return newProjectId;
    }
    return undefined;
  };

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
        <div className="grid gap-2">
          <Label htmlFor={`task-dueDate-${initialData?.title || 'new'}`}>截止日期</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Label htmlFor={`task-estimatedPomodoros-${initialData?.title || 'new'}`}>预估番茄钟</Label>
            <Input 
                id={`task-estimatedPomodoros-${initialData?.title || 'new'}`}
                type="number"
                min="0"
                value={estimatedPomodoros}
                onChange={(e) => setEstimatedPomodoros(parseInt(e.target.value, 10) || 0)}
                placeholder="例如: 2"
            />
        </div>
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
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox id={`task-isFrog-${initialData?.title || 'new'}`} checked={isFrog} onCheckedChange={(checked) => setIsFrog(!!checked)} />
        <Label htmlFor={`task-isFrog-${initialData?.title || 'new'}`} className="text-sm font-medium">标记为青蛙任务</Label>
      </div>
      <div className="flex justify-end space-x-2 pt-6">
        {showCancelButton && <Button variant="outline" onClick={onCancel}>取消</Button>}
        <Button onClick={handleSubmit}>{submitButtonText}</Button>
      </div>
    </div>
  );
} 