"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Goal as DBGoal } from "@/lib/db"; // Removed DBProject as it's not directly used for ProjectFormData fields
import { toast } from "sonner";

export const NO_GOAL_PROJECT_FORM_VALUE = "--no-goal-for-project--";

// Define the structure of the data this form will output
export interface ProjectFormData {
  name: string;
  description?: string;
  dueDate?: Date;
  goalId?: number; // Will be number (ID of the goal) or undefined
}

interface ProjectFormFieldsProps {
  initialData?: Partial<ProjectFormData>; // Accepts partial data, goalId should be number | undefined
  availableGoals: DBGoal[];
  onSave: (projectData: ProjectFormData) => Promise<void>;
  onCancel: () => void;
  submitButtonText?: string;
  showCancelButton?: boolean;
  formId?: string; // Optional unique ID for form elements
}

export function ProjectFormFields({
  initialData,
  availableGoals,
  onSave,
  onCancel,
  submitButtonText = "保存项目",
  showCancelButton = true,
  formId = "project-form", // Default formId
}: ProjectFormFieldsProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  // Internal state for the Select component's value (string)
  const [selectedGoalSelectValue, setSelectedGoalSelectValue] = useState<string>(NO_GOAL_PROJECT_FORM_VALUE);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setDueDate(initialData.dueDate ? new Date(initialData.dueDate) : undefined);
      // Map initialData.goalId (number | undefined) to the string value for the Select
      setSelectedGoalSelectValue(
        initialData.goalId !== undefined ? String(initialData.goalId) : NO_GOAL_PROJECT_FORM_VALUE
      );
    } else {
      // Reset form if no initialData (e.g., for a new project) or if initialData becomes undefined
      setName("");
      setDescription("");
      setDueDate(undefined);
      setSelectedGoalSelectValue(NO_GOAL_PROJECT_FORM_VALUE);
    }
  }, [initialData]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("项目名称不能为空");
      return;
    }

    // Convert the selected string value from Select back to number | undefined
    const finalGoalId = 
      selectedGoalSelectValue === NO_GOAL_PROJECT_FORM_VALUE 
      ? undefined 
      : parseInt(selectedGoalSelectValue, 10);

    const projectDataToSave: ProjectFormData = {
      name,
      description: description || undefined,
      dueDate,
      goalId: finalGoalId,
    };
    await onSave(projectDataToSave);
  };
  
  const uniqueId = (field: string) => `${formId}-${field}-${initialData?.name || 'new'}`;

  return (
    <div className="space-y-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor={uniqueId("name")}>项目名称 <span className="text-red-500">*</span></Label>
        <Input id={uniqueId("name")} value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：新产品发布计划" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={uniqueId("description")}>描述</Label>
        <Textarea id={uniqueId("description")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="详细说明项目内容（可选）" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={uniqueId("dueDate")}>截止日期</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button id={uniqueId("dueDate-trigger")} variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(new Date(dueDate), "yyyy-MM-dd") : <span>选择日期</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={uniqueId("goal")}>关联目标</Label>
           <Select
            value={selectedGoalSelectValue}
            onValueChange={setSelectedGoalSelectValue}
            >
            <SelectTrigger id={uniqueId("goal-trigger")}> <SelectValue placeholder="选择目标（可选）" /> </SelectTrigger>
            <SelectContent>
                <SelectItem value={NO_GOAL_PROJECT_FORM_VALUE}>无目标</SelectItem>
                {availableGoals.map((goal) => (
                goal.id !== undefined && <SelectItem key={goal.id} value={String(goal.id)}>{goal.name}</SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-6">
        {showCancelButton && <Button variant="outline" onClick={onCancel}>取消</Button>}
        <Button onClick={handleSubmit}>{submitButtonText}</Button>
      </div>
    </div>
  );
} 