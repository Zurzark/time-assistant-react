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
import { Project as DBProjectType, Task as DBTask } from "@/lib/db";
import { Task as TaskUtilsType, TaskPriority as TaskUtilsPriorityType } from "@/lib/task-utils";
import { NO_PROJECT_VALUE } from "@/lib/task-utils"; // Added imports

// Import the new TaskFormFields and its data type
import { TaskFormFields, TaskFormData, UIPriority } from "./TaskFormFields"; // Assuming UIPriority is also exported or defined locally

// priorityMapFromDB might be needed if displaying priority text differently than stored value
// For now, assuming priority prop is already in display format.
// If not, it should be imported or passed as prop.

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskUtilsType | null; // This is the task type from task-utils, might be slightly different from DBTask
  onSave: (updatedTask: TaskUtilsType) => void; // Expects TaskUtilsType
  availableProjects: DBProjectType[];
  onCreateNewProject: (name: string) => Promise<number | undefined>;
}

// Helper function to map UIPriority (camelCase) to TaskUtilsPriorityType (kebab-case)
function mapUiPriorityToTaskUtilsPriority(uiPriority: UIPriority): TaskUtilsPriorityType {
  switch (uiPriority) {
    case "importantUrgent": return "important-urgent";
    case "importantNotUrgent": return "important-not-urgent";
    case "notImportantUrgent": return "not-important-urgent";
    case "notImportantNotUrgent": return "not-important-not-urgent";
    default: return "not-important-not-urgent"; // Fallback, though should not happen with typed input
  }
}

// Helper function to map TaskUtilsPriorityType (kebab-case) to UIPriority (camelCase)
function mapTaskUtilsPriorityToUiPriority(taskPriority: TaskUtilsPriorityType | string | undefined): UIPriority {
    switch (taskPriority) {
        case "important-urgent": return "importantUrgent";
        case "important-not-urgent": return "importantNotUrgent";
        case "not-important-urgent": return "notImportantUrgent";
        case "not-important-not-urgent": return "notImportantNotUrgent";
        default: return "notImportantNotUrgent"; // Fallback
    }
}

export function EditTaskDialog({ 
  open, 
  onOpenChange, 
  task, 
  onSave, 
  availableProjects,
  onCreateNewProject
}: EditTaskDialogProps) {

  // The form state is now managed by TaskFormFields.
  // We only need to prepare initialData for it and handle the save callback.

  const [formInitialData, setFormInitialData] = useState<Partial<TaskFormData> | undefined>(undefined);

  useEffect(() => {
    if (task) {
      setFormInitialData({
        title: task.title || "",
        description: task.description || "",
        priority: mapTaskUtilsPriorityToUiPriority(task.priority), // Use mapping function
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        projectId: task.projectId,
        tags: task.tags || [],
        isFrog: task.isFrog || false,
        estimatedPomodoros: task.estimatedPomodoros || 0,
      });
    } else {
      // Should not happen if dialog is for editing an existing task
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
      dueDate: formData.dueDate, 
      projectId: typeof formData.projectId === 'string' && formData.projectId !== NO_PROJECT_VALUE ? parseInt(formData.projectId) : (typeof formData.projectId === 'number' ? formData.projectId : undefined),
      tags: formData.tags,
      isFrog: formData.isFrog,
      estimatedPomodoros: formData.estimatedPomodoros || 0,
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
        
        {/* Content area now uses TaskFormFields */} 
        {formInitialData && (
          <TaskFormFields
            key={task.id || 'new-task-edit'} // Ensure key is always present
            initialData={formInitialData}
            availableProjects={availableProjects}
            onSave={handleFormSave} 
            onCancel={handleFormCancel}
            onCreateNewProjectInForm={onCreateNewProject} 
            submitButtonText="保存更改"
            showCancelButton={true} 
          />
        )}
        {/* DialogFooter might be redundant if TaskFormFields handles its own buttons within its layout */}
        {/* If TaskFormFields includes its own footer with buttons, remove DialogFooter below */}
        {/* For now, assuming TaskFormFields does NOT have its own DialogFooter and uses the one from here */}
        {/* The TaskFormFields component was designed with its own footer buttons in mind though.*/}
        {/* Let's verify if TaskFormFields's internal buttons are sufficient. Yes, it has its own.*/}
        {/* So, we don't need a separate DialogFooter here if TaskFormFields renders the buttons.*/}

      </DialogContent>
    </Dialog>
  );
} 