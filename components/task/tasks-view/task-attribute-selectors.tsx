// 此文件包含用于快速修改任务属性（项目、优先级、类别、日期）的交互式选择器组件。
// 这些组件通常以 Popover 或 Dropdown 的形式出现，允许用户在不打开完整编辑模态框的情况下进行内联编辑。

"use client";

import * as React from "react";
import { format, startOfDay, isValid } from "date-fns";
import { zhCN } from "date-fns/locale";
import { 
    Calendar as CalendarIcon, 
    Check, 
    Clock, 
    FolderOpen, 
    Tag as TagIcon, 
    Play, 
    Lightbulb, 
    Hourglass, 
    AlertTriangle,
    X
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Task, TaskPriority, TaskCategory } from "@/lib/task-utils";

// --- Types ---

interface SelectorProps {
    task: Task;
    onUpdate: (task: Task) => void;
    readOnly?: boolean;
}

interface ProjectSelectorProps extends SelectorProps {
    projects: { id?: number; name: string }[];
    getProjectNameById: (id: number | string | undefined) => string;
}

// --- Components ---

export function TaskProjectSelector({ task, onUpdate, projects, getProjectNameById, readOnly }: ProjectSelectorProps) {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (projectId: number) => {
        onUpdate({ ...task, projectId });
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-auto p-0 hover:bg-transparent text-left font-normal",
                        readOnly && "cursor-default opacity-100"
                    )}
                    disabled={readOnly}
                >
                    {task.projectId ? (
                        <Badge variant="outline" className="text-xs px-2 py-0.5 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex-shrink-0 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                            <FolderOpen className="h-3 w-3 mr-1 opacity-70" />
                            {getProjectNameById(task.projectId)}
                        </Badge>
                    ) : (
                         <Badge variant="outline" className="text-xs px-2 py-0.5 border-dashed border-gray-300 text-gray-400 hover:text-gray-600 cursor-pointer">
                            <FolderOpen className="h-3 w-3 mr-1" />
                            无项目
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="搜索项目..." />
                    <CommandList>
                        <CommandEmpty>未找到项目</CommandEmpty>
                        <CommandGroup>
                            {projects.filter(p => p.id !== undefined).map((project) => (
                                <CommandItem
                                    key={project.id}
                                    value={project.name}
                                    onSelect={() => handleSelect(project.id!)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            task.projectId === project.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {project.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export function TaskPrioritySelector({ task, onUpdate, readOnly }: SelectorProps) {
    const [open, setOpen] = React.useState(false);

    const priorities: { value: TaskPriority; label: string; color: string; dotColor: string }[] = [
        { value: "importantUrgent", label: "重要且紧急", color: "text-red-600 dark:text-red-400", dotColor: "bg-red-500" },
        { value: "importantNotUrgent", label: "重要不紧急", color: "text-amber-600 dark:text-amber-400", dotColor: "bg-amber-500" },
        { value: "notImportantUrgent", label: "不重要紧急", color: "text-blue-600 dark:text-blue-400", dotColor: "bg-blue-500" },
        { value: "notImportantNotUrgent", label: "不重要不紧急", color: "text-green-600 dark:text-green-400", dotColor: "bg-green-500" },
    ];

    const currentPriority = priorities.find(p => p.value === task.priority);

    const handleSelect = (priority: TaskPriority) => {
        onUpdate({ ...task, priority });
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-auto p-0 hover:bg-transparent", readOnly && "cursor-default")}
                    disabled={readOnly}
                >
                    {currentPriority ? (
                        <span className={cn("flex items-center text-xs cursor-pointer hover:underline", currentPriority.color)}>
                            <span className={cn("h-2 w-2 rounded-full mr-1.5", currentPriority.dotColor)} />
                            {currentPriority.label}
                        </span>
                    ) : (
                        <span className="text-xs text-gray-400 flex items-center cursor-pointer hover:text-gray-600">
                             <span className="h-2 w-2 rounded-full mr-1.5 bg-gray-300" />
                             无优先级
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandList>
                        <CommandGroup>
                            {priorities.map((priority) => (
                                <CommandItem
                                    key={priority.value}
                                    value={priority.label}
                                    onSelect={() => handleSelect(priority.value)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            task.priority === priority.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span className={cn("h-2 w-2 rounded-full mr-2", priority.dotColor)} />
                                    {priority.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export function TaskCategorySelector({ task, onUpdate, readOnly }: SelectorProps) {
    const [open, setOpen] = React.useState(false);

    const categories: { value: TaskCategory; label: string; icon: React.ReactNode; className: string }[] = [
        { value: "next_action", label: "下一步行动", icon: <Play className="h-3 w-3" />, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
        { value: "someday_maybe", label: "将来/也许", icon: <Lightbulb className="h-3 w-3" />, className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
        { value: "waiting_for", label: "等待中", icon: <Hourglass className="h-3 w-3" />, className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300" },
    ];

    const currentCategory = categories.find(c => c.value === task.category);

    const handleSelect = (category: TaskCategory) => {
        onUpdate({ ...task, category });
        setOpen(false);
    };

    if (!task.category && readOnly) return null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                 <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-auto p-0 hover:bg-transparent", readOnly && "cursor-default")}
                    disabled={readOnly}
                >
                    {currentCategory ? (
                        <Badge variant="outline" className={cn("text-xs px-2 py-0.5 border-transparent cursor-pointer hover:opacity-80", currentCategory.className)}>
                            {currentCategory.icon}
                            <span className="ml-1">{currentCategory.label}</span>
                        </Badge>
                    ) : (
                         <Badge variant="outline" className="text-xs px-2 py-0.5 border-dashed border-gray-300 text-gray-400 cursor-pointer hover:text-gray-600">
                            <TagIcon className="h-3 w-3 mr-1" />
                            无类别
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandList>
                        <CommandGroup>
                            {categories.map((category) => (
                                <CommandItem
                                    key={category.value}
                                    value={category.label}
                                    onSelect={() => handleSelect(category.value)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            task.category === category.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className={cn("flex items-center px-2 py-0.5 rounded text-xs", category.className)}>
                                        {category.icon}
                                        <span className="ml-1">{category.label}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

interface DateSelectorProps extends SelectorProps {
    type: 'planned' | 'due';
}

export function TaskDateSelector({ task, onUpdate, type, readOnly }: DateSelectorProps) {
    const [open, setOpen] = React.useState(false);
    
    const dateValue = type === 'planned' ? task.plannedDate : task.dueDate;
    const dateObj = dateValue ? new Date(dateValue) : undefined;
    const isDateValid = dateObj ? isValid(dateObj) : false;
    
    const isOverdue = type === 'due' && isDateValid && dateObj && !task.completed && startOfDay(new Date()) > startOfDay(dateObj);

    const handleSelect = (date: Date | undefined) => {
        if (type === 'planned') {
            onUpdate({ ...task, plannedDate: date });
        } else {
            onUpdate({ ...task, dueDate: date });
        }
        setOpen(false);
    };

    const clearDate = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleSelect(undefined);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-auto p-0 hover:bg-transparent", readOnly && "cursor-default")}
                    disabled={readOnly}
                >
                    {isDateValid && dateObj ? (
                        <span className={cn(
                            "flex items-center text-xs cursor-pointer hover:underline", 
                            type === 'due' && isOverdue ? "text-red-600 dark:text-red-500 font-medium" : ""
                        )}>
                            {type === 'planned' ? <Clock className="h-3.5 w-3.5 mr-1" /> : <CalendarIcon className="h-3.5 w-3.5 mr-1" />}
                            {format(dateObj, 'yyyy/MM/dd')}
                            <span className="text-muted-foreground ml-1">({type === 'planned' ? '计划' : '截止'})</span>
                            {type === 'due' && isOverdue && <AlertTriangle className="h-3.5 w-3.5 ml-1 text-red-500" />}
                        </span>
                    ) : (
                        <span className="text-xs text-gray-400 flex items-center cursor-pointer hover:text-gray-600">
                             {type === 'planned' ? <Clock className="h-3.5 w-3.5 mr-1" /> : <CalendarIcon className="h-3.5 w-3.5 mr-1" />}
                             设置{type === 'planned' ? '计划' : '截止'}日期
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="p-2 border-b flex justify-between items-center">
                    <span className="text-sm font-medium ml-2">选择日期</span>
                    {isDateValid && dateObj && (
                        <Button variant="ghost" size="sm" onClick={clearDate} className="h-6 px-2 text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3 mr-1" /> 清除
                        </Button>
                    )}
                </div>
                <Calendar
                    mode="single"
                    selected={isDateValid && dateObj ? dateObj : undefined}
                    onSelect={handleSelect}
                    initialFocus
                    locale={zhCN}
                />
            </PopoverContent>
        </Popover>
    );
}
