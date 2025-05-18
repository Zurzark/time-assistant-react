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
import { Project as DBProjectType } from "@/lib/db"; // Assuming Project is DBProjectType
import { Task, NO_PROJECT_VALUE } from "@/lib/task-utils"; // Added imports

// priorityMapFromDB might be needed if displaying priority text differently than stored value
// For now, assuming priority prop is already in display format.
// If not, it should be imported or passed as prop.

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSave: (updatedTask: Task) => void;
  availableProjects: DBProjectType[];
  onCreateNewProject: (name: string) => Promise<number | undefined>; // Callback for creating new project
}

export function EditTaskDialog({ 
  open, 
  onOpenChange, 
  task, 
  onSave, 
  availableProjects,
  onCreateNewProject
}: EditTaskDialogProps) {
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedPriority, setEditedPriority] = useState<Task['priority']>("not-important-not-urgent");
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(undefined);
  const [editedProjectId, setEditedProjectId] = useState<string | number | undefined>(undefined);
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [editedIsFrog, setEditedIsFrog] = useState<boolean>(false);

  useEffect(() => {
    if (task) {
      setEditedTitle(task.title || "");
      setEditedDescription(task.description || "");
      setEditedPriority(task.priority || "not-important-not-urgent");
      setEditedDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setEditedProjectId(task.projectId);
      setEditedTags(task.tags || []);
      setEditedIsFrog(task.isFrog || false);
    } else {
      setEditedTitle("");
      setEditedDescription("");
      setEditedPriority("not-important-not-urgent");
      setEditedDueDate(undefined);
      setEditedProjectId(undefined);
      setEditedTags([]);
      setEditedIsFrog(false);
    }
  }, [task]);

  if (!task) return null; // Or some placeholder/error if called with null task while open

  const handleSubmit = () => {
    if (!task) return;
    onSave({
      ...task,
      title: editedTitle,
      description: editedDescription,
      priority: editedPriority,
      dueDate: editedDueDate,
      projectId: editedProjectId,
      tags: editedTags,
      isFrog: editedIsFrog,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>编辑任务: {task.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">任务标题</Label>
            <Input id="edit-title" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-description">描述</Label>
            <Textarea id="edit-description" value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-priority">优先级</Label>
              <Select value={editedPriority} onValueChange={(value) => setEditedPriority(value as Task["priority"]) }>
                <SelectTrigger id="edit-priority"><SelectValue placeholder="选择优先级" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="important-urgent"><div className="flex items-center"><div className="h-3 w-3 rounded-sm bg-red-500 mr-2" />重要且紧急</div></SelectItem>
                  <SelectItem value="important-not-urgent"><div className="flex items-center"><div className="h-3 w-3 rounded-sm bg-amber-500 mr-2" />重要不紧急</div></SelectItem>
                  <SelectItem value="not-important-urgent"><div className="flex items-center"><div className="h-3 w-3 rounded-sm bg-blue-500 mr-2" />不重要但紧急</div></SelectItem>
                  <SelectItem value="not-important-not-urgent"><div className="flex items-center"><div className="h-3 w-3 rounded-sm bg-green-500 mr-2" />不重要不紧急</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-dueDate">截止日期</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !editedDueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editedDueDate ? format(editedDueDate, "PPP") : <span>选择日期</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent mode="single" selected={editedDueDate} onSelect={setEditedDueDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-project">项目</Label>
              <Select 
                value={editedProjectId ? String(editedProjectId) : NO_PROJECT_VALUE} 
                onValueChange={async (value) => {
                  if (value === 'new-project-edit') { // This value should be unique
                    const newName = prompt("请输入新项目的名称:");
                    if (newName) {
                      const newProjectId = await onCreateNewProject(newName);
                      if (newProjectId !== undefined) {
                        setEditedProjectId(newProjectId);
                      }
                    }
                  } else if (value === NO_PROJECT_VALUE) {
                    setEditedProjectId(undefined);
                  } else {
                    setEditedProjectId(value ? parseInt(value, 10) : undefined);
                  }
                }}
              >
                <SelectTrigger id="edit-project"><SelectValue placeholder="选择项目（可选）" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT_VALUE}>无项目</SelectItem> 
                  {availableProjects.map((proj) => (
                    <SelectItem key={proj.id} value={String(proj.id)}>{proj.name}</SelectItem>
                  ))}
                  <SelectItem value="new-project-edit">+ 创建新项目</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tags">标签 (逗号分隔)</Label>
              <Input 
                id="edit-tags" 
                placeholder="例如: 工作,个人"
                value={editedTags.join(", ")}
                onChange={(e) => setEditedTags(e.target.value.split(",").map(tag => tag.trim()).filter(tag => tag))}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mt-2">
            <Checkbox 
              id="edit-isFrog"
              checked={editedIsFrog}
              onCheckedChange={(checked) => setEditedIsFrog(!!checked)} 
            />
            <Label htmlFor="edit-isFrog" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              标记为青蛙任务
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit}>保存更改</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 