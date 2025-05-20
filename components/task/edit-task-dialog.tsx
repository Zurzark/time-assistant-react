"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon } from "@radix-ui/react-icons"; // Or from lucide-react if preferred
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Project as DBProjectType, Task as DBTask, ActivityCategory } from "@/lib/db";
import { Task as TaskUtilsType, TaskPriority as TaskUtilsPriorityType, TaskCategory as UtilTaskCategory } from "@/lib/task-utils";
import { NO_PROJECT_VALUE } from "@/lib/task-utils"; // Added imports

// Import the new TaskFormFields and its data type
import { TaskFormFields, TaskFormData, UIPriority, RecurrenceFrequency, RecurrenceEndsType, TaskCategory } from "./TaskFormFields"; // Added TaskCategory and recurrence types

// priorityMapFromDB might be needed if displaying priority text differently than stored value
// For now, assuming priority prop is already in display format.
// If not, it should be imported or passed as prop.

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskUtilsType | null; // This is the task type from task-utils, might be slightly different from DBTask
  onSave: (updatedTask: TaskUtilsType) => void; // Expects TaskUtilsType
  availableProjects: DBProjectType[];
  availableActivityCategories: ActivityCategory[];
  onCreateNewProject: (name: string) => Promise<number | undefined>;
}

// Helper function to map UIPriority (camelCase) to TaskUtilsPriorityType (kebab-case)
// This function seems to cause type errors if TaskUtilsPriorityType expects camelCase.
// Assuming TaskUtilsPriorityType is effectively UIPriority (camelCase) based on linter errors.
function mapUiPriorityToTaskUtilsPriority(uiPriority: UIPriority): TaskUtilsPriorityType {
  // switch (uiPriority) {
  //   case "importantUrgent": return "important-urgent";
  //   case "importantNotUrgent": return "important-not-urgent";
  //   case "notImportantUrgent": return "not-important-urgent";
  //   case "notImportantNotUrgent": return "not-important-not-urgent";
  //   default: return "not-important-not-urgent"; // Fallback, though should not happen with typed input
  // }
  return uiPriority as unknown as TaskUtilsPriorityType; // Directly return, assuming types are compatible or TaskUtilsPriorityType is UIPriority
}

// Helper function to map TaskUtilsPriorityType (kebab-case) to UIPriority (camelCase)
// This might also be unnecessary if task.priority is already camelCase.
function mapTaskUtilsPriorityToUiPriority(taskPriority: TaskUtilsPriorityType | string | undefined): UIPriority {
    switch (taskPriority) {
        case "important-urgent": return "importantUrgent";
        case "important-not-urgent": return "importantNotUrgent";
        case "not-important-urgent": return "notImportantUrgent";
        case "not-important-not-urgent": return "notImportantNotUrgent";
        // If taskPriority is already camelCase (UIPriority), it will fall to default or match if cases are added
        case "importantUrgent": return "importantUrgent";
        case "importantNotUrgent": return "importantNotUrgent";
        case "notImportantUrgent": return "notImportantUrgent";
        case "notImportantNotUrgent": return "notImportantNotUrgent";
        default: return "notImportantNotUrgent"; // Fallback
    }
}

export function EditTaskDialog({ 
  open, 
  onOpenChange, 
  task, 
  onSave, 
  availableProjects,
  availableActivityCategories,
  onCreateNewProject
}: EditTaskDialogProps) {

  const [formInitialData, setFormInitialData] = useState<Partial<TaskFormData> | undefined>(undefined);

  useEffect(() => {
    if (task) {
      setFormInitialData({
        title: task.title || "",
        description: task.description || "",
        priority: mapTaskUtilsPriorityToUiPriority(task.priority), 
        
        category: task.category || "next_action", 
        plannedDate: task.plannedDate ? new Date(task.plannedDate) : undefined,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined, 
        estimatedDurationHours: task.estimatedDurationHours || 0,
        defaultActivityCategoryId: task.defaultActivityCategoryId,
        
        projectId: task.projectId,
        tags: task.tags || [],
        isFrog: task.isFrog || false,
        
        isRecurring: task.isRecurring || false,
        recurrenceRule: task.recurrenceRule, 
        recurrenceEndDate: task.recurrenceEndDate ? new Date(task.recurrenceEndDate) : undefined,
        recurrenceCount: task.recurrenceCount,
        // Default recurrenceFrequency and recurrenceEndsType for the form, TaskFormFields will handle these
        // based on isRecurring and other recurrence fields if these are undefined.
        recurrenceFrequency: undefined, 
        recurrenceEndsType: undefined,  
      });
    } else {
      setFormInitialData(undefined); 
    }
  }, [task]);

  if (!task) return null; 

  const handleFormSave = async (formData: TaskFormData) => {
    if (!task) return;

    const updatedTaskData: TaskUtilsType = {
      ...task, 
      title: formData.title,
      description: formData.description || "", 
      priority: mapUiPriorityToTaskUtilsPriority(formData.priority), 
      
      category: formData.category as UtilTaskCategory, 
      plannedDate: formData.plannedDate, 
      dueDate: formData.dueDate, // Already correctly set to undefined by TaskFormFields if recurring
      estimatedDurationHours: formData.estimatedDurationHours || 0,
      defaultActivityCategoryId: formData.defaultActivityCategoryId,

      projectId: typeof formData.projectId === 'string' && formData.projectId !== NO_PROJECT_VALUE 
        ? parseInt(formData.projectId) 
        : (typeof formData.projectId === 'number' ? formData.projectId : undefined),
      tags: formData.tags,
      isFrog: formData.isFrog,
      
      isRecurring: formData.isRecurring, 
      recurrenceRule: formData.recurrenceRule, 
      recurrenceEndDate: formData.isRecurring && formData.recurrenceEndsType === 'on_date' ? formData.recurrenceEndDate : undefined,
      recurrenceCount: formData.isRecurring && formData.recurrenceEndsType === 'after_occurrences' ? formData.recurrenceCount : undefined,
    };

    onSave(updatedTaskData);
    onOpenChange(false); 
  };

  const handleFormCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>编辑任务: {task.title}</DialogTitle>
        </DialogHeader>
        
        {formInitialData && (
          <TaskFormFields
            key={task.id || 'new-task-edit'} 
            initialData={formInitialData}
            availableProjects={availableProjects}
            availableActivityCategories={availableActivityCategories}
            onSave={handleFormSave} 
            onCancel={handleFormCancel}
            onCreateNewProjectInForm={onCreateNewProject} 
            submitButtonText="保存更改"
            showCancelButton={true} 
            // pomodoroDurationMinutes prop can be passed from a global setting if needed
          />
        )}
      </DialogContent>
    </Dialog>
  );
} 