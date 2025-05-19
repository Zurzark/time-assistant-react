// 此组件负责渲染任务列表中的单个任务项的所有视觉元素和基础交互，
// 包括任务选择、标题、元数据展示以及快捷操作菜单。
import { Task } from "@/lib/task-utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ArrowDown,
    ArrowUp,
    Calendar,
    Check,
    ChevronDown,
    Edit,
    Flag,
    MoreHorizontal,
    Tag as TagIcon, // Renamed to avoid conflict with HTML tag
    Timer,
    Trash2,
    Undo,
    CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

interface TaskItemProps {
    task: Task;
    isSelected: boolean;
    viewMode: "list" | "board"; // To slightly adjust styling if needed
    getProjectNameById: (projectId: number | string | undefined) => string;
    onSelectTask: (taskId: number, checked: boolean) => void;
    onToggleComplete: (taskId: number) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: number) => void;
    onToggleFrogStatus: (taskId: number) => void;
    onAddTaskToTimeline: (task: Task) => void;
    onPomodoroClick: (taskId: number, taskTitle: string) => void;
}

export function TaskItem({
    task,
    isSelected,
    viewMode, // currently not used for major style changes, but available
    getProjectNameById,
    onSelectTask,
    onToggleComplete,
    onEditTask,
    onDeleteTask,
    onToggleFrogStatus,
    onAddTaskToTimeline,
    onPomodoroClick,
}: TaskItemProps) {
    if (!task || task.id === undefined) {
        // Handle cases where task or task.id is undefined, perhaps log an error or return null
        console.error("TaskItem received invalid task prop:", task);
        return null;
    }

    const handleTimelineAdd = () => {
        if(task.id === undefined) { // Redundant check, but good practice
            toast.error("任务ID无效，无法添加到时间轴。");
            return;
        }
        onAddTaskToTimeline(task);
    };

    const handlePomodoro = () => {
        if(task.id === undefined) return; // Redundant check
        onPomodoroClick(task.id, task.title);
    }

    if (viewMode === 'list') {
        return (
            <div
                className={cn(
                    "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                    isSelected
                        ? "bg-primary/10 border-primary/40 dark:bg-primary/20"
                        : (task.completed ? "bg-muted/50 border-transparent hover:bg-muted/70" : "bg-card hover:bg-muted/30 border-transparent"),
                )}
            >
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectTask(task.id!, checked === true)}
                    aria-label={`选择任务 ${task.title}`}
                    className="mt-1 flex-shrink-0"
                />
                <div className="flex-1 space-y-1.5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center">
                                <h3
                                    className={cn(
                                        "text-base font-medium cursor-pointer hover:underline",
                                        task.completed && "line-through text-muted-foreground",
                                    )}
                                    onClick={() => onEditTask(task)} // Click title to edit
                                >
                                    {task.isFrog && "🐸 "}
                                    {task.title}
                                </h3>
                            </div>
                            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                        </div>
                        <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePomodoro}>
                                <Timer className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onToggleComplete(task.id!)}>
                                        {task.completed ? (
                                            <><Undo className="h-4 w-4 mr-2" /> 标记为未完成</>
                                        ) : (
                                            <><Check className="h-4 w-4 mr-2" /> 标记为完成</>
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onEditTask(task)}>
                                        <Edit className="h-4 w-4 mr-2" /> 编辑
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onToggleFrogStatus(task.id!)}>
                                        <Flag className="h-4 w-4 mr-2" />
                                        {task.isFrog ? "取消标记为青蛙" : "标记为青蛙"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleTimelineAdd} disabled={task.completed}>
                                        <CalendarDays className="h-4 w-4 mr-2" /> 添加到时间轴
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onDeleteTask(task.id!)} className="text-red-500 hover:!text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" /> 删除
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div
                            className={cn(
                                "h-3 w-3 rounded-sm",
                                task.priority === "important-urgent" ? "bg-red-500"
                                : task.priority === "important-not-urgent" ? "bg-amber-500"
                                : task.priority === "not-important-urgent" ? "bg-blue-500"
                                : "bg-green-500",
                            )}
                        />
                        <span className="text-xs text-muted-foreground">
                            {task.priority === "important-urgent" ? (<span className="flex items-center">重要 <ArrowUp className="h-3 w-3 mx-1" /> 紧急 <ArrowUp className="h-3 w-3 mx-1" /></span>)
                            : task.priority === "important-not-urgent" ? (<span className="flex items-center">重要 <ArrowUp className="h-3 w-3 mx-1" /> 紧急 <ArrowDown className="h-3 w-3 mx-1" /></span>)
                            : task.priority === "not-important-urgent" ? (<span className="flex items-center">重要 <ArrowDown className="h-3 w-3 mx-1" /> 紧急 <ArrowUp className="h-3 w-3 mx-1" /></span>)
                            : (<span className="flex items-center">重要 <ArrowDown className="h-3 w-3 mx-1" /> 紧急 <ArrowDown className="h-3 w-3 mx-1" /></span>)}
                        </span>

                        {task.dueDate && (
                            <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {task.dueDate.toLocaleDateString()}
                            </Badge>
                        )}
                        {task.plannedDate && (
                            <Badge variant="outline" className="text-xs" title={`计划于: ${task.plannedDate.toLocaleDateString()}`}>
                                <CalendarDays className="h-3 w-3 mr-1" />
                                {task.plannedDate.toLocaleDateString()} (计划)
                            </Badge>
                        )}

                        {task.projectId && (
                            <Badge variant="outline" className="text-xs">
                                <Flag className="h-3 w-3 mr-1" />
                                {getProjectNameById(task.projectId)}
                            </Badge>
                        )}

                        {task.tags && task.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                                <TagIcon className="h-3 w-3 mr-1" />
                                {tag}
                            </Badge>
                        ))}
                    </div>

                    {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-3 pl-2 border-l-2 border-muted">
                            <div className="text-xs font-medium mb-1 flex items-center">
                                <ChevronDown className="h-3 w-3 mr-1" />
                                子任务 ({task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length})
                            </div>
                            <div className="space-y-1">
                                {task.subtasks.map((subtask) => (
                                    <div key={subtask.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`subtask-${task.id}-${subtask.id}`}
                                            checked={subtask.completed}
                                            // onClick stop propagation if needed, but usually fine for subtask checkbox
                                            onCheckedChange={() => {
                                                if (task.id !== undefined && subtask.id !== undefined) {
                                                    // Here you would call the subtask completion toggle from props if it existed
                                                    // For now, this interaction is not fully wired up from TaskItem props
                                                    // This would typically be: onToggleSubtaskComplete(task.id, subtask.id)
                                                    console.warn("Subtask completion toggle from TaskItem not yet fully wired to props.");
                                                }
                                            }}
                                            className="h-3 w-3"
                                        />
                                        <label
                                            htmlFor={`subtask-${task.id}-${subtask.id}`}
                                            className={cn("text-xs", subtask.completed && "line-through text-muted-foreground")}
                                        >
                                            {subtask.title}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Simplified Board View Item (can be expanded or made into a separate component if vastly different)
    if (viewMode === 'board') {
        return (
             <div
                className={cn(
                    "border rounded-lg p-3 bg-card dark:bg-gray-800 transition-colors",
                    isSelected 
                        ? "ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-800" 
                        : (task.completed ? "bg-muted/50 opacity-70" : "hover:bg-muted/30"),
                )}
            >
                <div className="flex items-start space-x-2">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectTask(task.id!, checked === true)}
                        aria-label={`选择任务 ${task.title}`}
                        className="mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h3
                                className={cn(
                                    "text-sm font-medium cursor-pointer hover:underline",
                                    task.completed && "line-through text-muted-foreground",
                                )}
                                onClick={() => onEditTask(task)}
                            >
                                {task.isFrog && "🐸 "}
                                {task.title}
                            </h3>
                            <div className="flex items-center">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePomodoro}>
                                    <Timer className="h-3 w-3" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onToggleComplete(task.id!)}>
                                            {task.completed ? (
                                                <><Undo className="h-4 w-4 mr-2" /> 标记为未完成</>
                                            ) : (
                                                <><Check className="h-4 w-4 mr-2" /> 标记为完成</>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onEditTask(task)}>
                                            <Edit className="h-4 w-4 mr-2" /> 编辑
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onToggleFrogStatus(task.id!)}>
                                            <Flag className="h-4 w-4 mr-2" /> {task.isFrog ? "取消青蛙" : "标记青蛙"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleTimelineAdd} disabled={task.completed}>
                                            <CalendarDays className="h-4 w-4 mr-2" /> 添加到时间轴
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onDeleteTask(task.id!)} className="text-red-500 hover:!text-red-600">
                                            <Trash2 className="h-4 w-4 mr-2"/> 删除
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-1 text-xs">
                            {task.dueDate && (
                                <Badge variant="outline" className="text-xs">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {task.dueDate.toLocaleDateString()}
                                </Badge>
                            )}
                             {task.plannedDate && (
                                <Badge variant="outline" className="text-xs" title={`计划: ${task.plannedDate.toLocaleDateString()}`}>
                                    <CalendarDays className="h-3 w-3 mr-1" /> (P)
                                </Badge>
                            )}
                            {task.projectId && (
                                <Badge variant="outline" className="text-xs">
                                    <Flag className="h-3 w-3 mr-1"/>
                                    {getProjectNameById(task.projectId)}
                                </Badge>
                            )}
                            {/* Consider showing only one or two tags in board view to save space */}
                            {task.tags && task.tags.slice(0, 1).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                    <TagIcon className="h-3 w-3 mr-1" />
                                    {tag}
                                </Badge>
                            ))}
                            {task.tags && task.tags.length > 1 && <span className="text-muted-foreground">...</span>}
                        </div>
                         {/* Subtasks might be too verbose for board view, consider a summary or omitting */}
                    </div>
                </div>
            </div>
        );
    }
    return null; // Should not happen if viewMode is always list or board
}
