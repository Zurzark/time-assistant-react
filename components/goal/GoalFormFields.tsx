"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
// No specific DB types like DBGoal are needed here directly for form data if we define GoalFormData clearly.

export interface GoalFormData {
  name: string;
  description?: string;
  goalMeaning?: string;
  targetDate?: Date;
}

interface GoalFormFieldsProps {
  initialData?: Partial<GoalFormData>;
  onSave: (goalData: GoalFormData) => Promise<void>;
  onCancel: () => void;
  submitButtonText?: string;
  showCancelButton?: boolean;
  formId?: string; 
}

export function GoalFormFields({
  initialData,
  onSave,
  onCancel,
  submitButtonText = "保存目标",
  showCancelButton = true,
  formId = "goal-form",
}: GoalFormFieldsProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goalMeaning, setGoalMeaning] = useState("");
  const [targetDate, setTargetDate] = useState<Date | undefined>();

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setGoalMeaning(initialData.goalMeaning || "");
      setTargetDate(initialData.targetDate ? new Date(initialData.targetDate) : undefined);
    } else {
      // Reset form if no initialData
      setName("");
      setDescription("");
      setGoalMeaning("");
      setTargetDate(undefined);
    }
  }, [initialData]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("目标名称不能为空");
      return;
    }
    const goalDataToSave: GoalFormData = {
      name,
      description: description || undefined,
      goalMeaning: goalMeaning || undefined,
      targetDate,
    };
    await onSave(goalDataToSave);
  };

  const uniqueId = (field: string) => `${formId}-${field}-${initialData?.name || 'new'}`.replace(/\s+/g, '-').toLowerCase();


  return (
    <div className="space-y-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor={uniqueId("name")}>目标名称 <span className="text-red-500">*</span></Label>
        <Input 
          id={uniqueId("name")} 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="例如：学习一门新语言" 
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={uniqueId("description")}>描述</Label>
        <Textarea 
          id={uniqueId("description")} 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="详细说明目标内容（可选）"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={uniqueId("goalMeaning")}>目标意义</Label>
        <Textarea 
          id={uniqueId("goalMeaning")} 
          value={goalMeaning} 
          onChange={(e) => setGoalMeaning(e.target.value)} 
          placeholder="阐述这个目标对您的意义（可选）" 
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={uniqueId("targetDate")}>期望完成日期</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              id={uniqueId("targetDate-trigger")}
              variant={"outline"} 
              className={cn("w-full justify-start text-left font-normal", !targetDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {targetDate ? format(new Date(targetDate), "yyyy-MM-dd") : <span>选择日期</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent 
              mode="single" 
              selected={targetDate} 
              onSelect={setTargetDate} 
              initialFocus 
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex justify-end space-x-2 pt-6">
        {showCancelButton && <Button variant="outline" onClick={onCancel}>取消</Button>}
        <Button onClick={handleSubmit}>{submitButtonText}</Button>
      </div>
    </div>
  );
} 