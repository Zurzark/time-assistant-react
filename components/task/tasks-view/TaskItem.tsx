// 此组件负责渲染任务列表中的单个任务项的所有视觉元素和基础交互，
// 包括任务选择、标题、元数据展示以及快捷操作菜单。
import { Task, TaskPriority, TaskCategory } from "@/lib/task-utils";
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
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    Calendar,
    Check,
    ChevronDown,
    Circle,
    Clock,
    Edit,
    Flag,
    FolderOpen,
    Lightbulb, // 用于将来/也许
    MoreHorizontal,
    Play,      // 用于下一步行动
    Tag as TagIcon,
    Timer,
    Trash2,
    Undo,
    CalendarDays,
    Hourglass, // 用于等待中
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast, isToday, differenceInDays, startOfDay, isFuture } from 'date-fns';

interface TaskItemProps {
    task: Task;
    isSelected: boolean;
    viewMode: "list" | "board";
    getProjectNameById: (projectId: number | string | undefined) => string;
    onSelectTask: (taskId: number, checked: boolean) => void;
    onToggleComplete: (taskId: number) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: number) => void;
    onToggleFrogStatus: (taskId: number) => void;
    onAddTaskToTimeline: (task: Task) => void;
    onPomodoroClick: (taskId: number, taskTitle: string) => void;
}

const PriorityDisplay: React.FC<{ priority: TaskPriority | undefined }> = ({ priority }) => {
    const priorityStyles: Record<TaskPriority, { color: string; text: string; dotColor: string }> = {
        "importantUrgent": { color: "text-red-600 dark:text-red-400", text: "重要且紧急", dotColor: "bg-red-500" },
        "importantNotUrgent": { color: "text-amber-600 dark:text-amber-400", text: "重要不紧急", dotColor: "bg-amber-500" },
        "notImportantUrgent": { color: "text-blue-600 dark:text-blue-400", text: "不重要紧急", dotColor: "bg-blue-500" },
        "notImportantNotUrgent": { color: "text-green-600 dark:text-green-400", text: "不重要不紧急", dotColor: "bg-green-500" },
    };
    if (!priority || !priorityStyles[priority]) return null;
    const style = priorityStyles[priority];
    return (
        <span className={cn("flex items-center text-xs", style.color)}>
            <span className={cn("h-2 w-2 rounded-full mr-1.5", style.dotColor)} />
            {style.text}
        </span>
    );
};

const taskCategoryKeys: TaskCategory[] = ["next_action", "someday_maybe", "waiting_for"];

const TaskCategoryDisplay: React.FC<{ category: TaskCategory | undefined }> = ({ category }) => {
    if (!category) return null;
    const categoryStyles: Record<TaskCategory, { icon: React.ReactNode; text: string; className: string }> = {
        "next_action": { icon: <Play className="h-3 w-3" />, text: "下一步行动", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
        "someday_maybe": { icon: <Lightbulb className="h-3 w-3" />, text: "将来/也许", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
        "waiting_for": { icon: <Hourglass className="h-3 w-3" />, text: "等待中", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300" },
    };
    const style = categoryStyles[category];
    if (!style) return null;
    return (
        <Badge variant="outline" className={cn("text-xs px-2 py-0.5 border-transparent", style.className)}>
            {style.icon}
            <span className="ml-1">{style.text}</span>
        </Badge>
    );
};

export function TaskItem({
    task,
    isSelected,
    viewMode,
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
        console.error("TaskItem received invalid task prop:", task);
        return null;
    }

    const handleTimelineAdd = () => {
        if(task.id === undefined) return;
        onAddTaskToTimeline(task);
    };

    const handlePomodoro = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        if(task.id === undefined) return;
        onPomodoroClick(task.id, task.title);
    }

    const handleCheckboxChange = (checked: boolean) => {
        onSelectTask(task.id!, checked);
    };

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (
            target.closest('button') || 
            target.closest('[role="checkbox"]') || 
            target.closest('[role="menuitem"]') ||
            target.closest('[data-no-edit-on-click="true"]')
        ) {
            return;
        }
        onEditTask(task);
    };

    const isOverdue = task.dueDate && isPast(task.dueDate) && !task.completed;
    const isNormal = !task.completed && !isOverdue;

    const cardClasses = cn(
        "w-full rounded-xl p-3.5 transition-all duration-200 ease-in-out cursor-pointer",
        "bg-white dark:bg-gray-800", 
        "shadow-md hover:shadow-lg dark:shadow-[0_2px_4px_rgba(0,0,0,0.3),_0_1px_2px_rgba(0,0,0,0.2)]",
        {
            "opacity-65 bg-gray-100 dark:bg-gray-800/60": task.completed,
            "bg-red-50 dark:bg-red-900/20": isOverdue && !task.completed,
            "border-l-4": true, 
            "border-red-500 dark:border-red-600": isOverdue,
            "border-sky-400 dark:border-sky-600": isNormal,
            "border-gray-600 dark:border-gray-500": task.completed && !isOverdue,
            "ring-2 ring-primary dark:ring-blue-500 ring-offset-2 dark:ring-offset-gray-800": isSelected && viewMode === 'board',
            "hover:bg-gray-50 dark:hover:bg-gray-700/70": !isSelected && isNormal, 
            "hover:bg-red-100 dark:hover:bg-red-900/30": !isSelected && isOverdue && !task.completed, 
            "hover:bg-gray-200 dark:hover:bg-gray-700/80": !isSelected && task.completed,
        }
    );
    
    let effectiveCardClasses = cardClasses;

    if (isSelected && viewMode === 'list') {
        let selectedListBg = "";
        if (task.completed) {
            selectedListBg = "bg-gray-200 dark:bg-gray-700/50";
        } else if (isOverdue) {
            selectedListBg = "bg-red-100 dark:bg-red-800/30";
        } else {
            selectedListBg = "bg-primary/10 dark:bg-primary/15";
        }
        
        effectiveCardClasses = cn(
            cardClasses, 
            selectedListBg 
        );
    }

    if (viewMode === 'list') {
        return (
            <div className={effectiveCardClasses} onClick={handleCardClick}>
                <div className="flex items-start space-x-3">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={handleCheckboxChange}
                        aria-label={`选择任务 ${task.title}`}
                        className="mt-1 flex-shrink-0 data-[no-edit-on-click]:true"
                        data-no-edit-on-click="true"
                    />
                    <div className="flex-1 space-y-1.5">
                        {/* First Row: Title and Actions */} 
                        <div className="flex items-center justify-between">
                            <div className="flex items-center min-w-0"> {/* Added min-w-0 for truncation */} 
                                {task.completed && <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />}
                                <h3
                                    className={cn(
                                        "text-base font-semibold text-gray-800 dark:text-gray-100 truncate", // Added truncate
                                        task.completed && "line-through text-gray-500 dark:text-gray-400",
                                    )}
                                    title={task.title} // Added title attribute for full text on hover
                                >
                                    {task.isFrog && <span role="img" aria-label="frog" className="mr-1">🐸</span>}
                                    {task.title}
                                    {/* "即将到期" (1-2 days away) visual cue - Moved to be next to title */}
                                    {task.dueDate && !task.completed && !isOverdue && (() => {
                                        const today = startOfDay(new Date());
                                        const dueDateObj = new Date(task.dueDate);
                                        const dueDateStart = startOfDay(dueDateObj);
                                        
                                        if (isFuture(dueDateStart) || isToday(dueDateStart)) {
                                            const daysDiff = differenceInDays(dueDateStart, today);
                                            if (daysDiff >= 0 && daysDiff <= 2) { // Today, Tomorrow or Day after tomorrow
                                                return (
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-2 !text-xs border-orange-500 text-orange-600 bg-orange-50 dark:border-orange-400 dark:text-orange-300 dark:bg-orange-900/40 px-1.5 py-0.5"
                                                    >
                                                        {daysDiff === 0 ? "今日到期" : daysDiff === 1 ? "明日到期" : "即将到期"}
                                                    </Badge>
                                                );
                                            }
                                        }
                                        return null;
                                    })()}
                                </h3>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0" data-no-edit-on-click="true">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-sky-400" onClick={handlePomodoro} title="启动番茄钟">
                                    <Timer className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-sky-400" title="更多操作">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleComplete(task.id!); }}>
                                            {task.completed ? (
                                                <><Undo className="h-4 w-4 mr-2" /> 标记为未完成</>
                                            ) : (
                                                <><Check className="h-4 w-4 mr-2" /> 标记为完成</>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditTask(task); }}>
                                            <Edit className="h-4 w-4 mr-2" /> 编辑任务
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFrogStatus(task.id!); }}>
                                            <Flag className="h-4 w-4 mr-2" />
                                            {task.isFrog ? "取消标记青蛙" : "标记为青蛙"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTimelineAdd();}} disabled={task.completed}>
                                            <CalendarDays className="h-4 w-4 mr-2" /> 添加到时间轴
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id!); }} className="text-red-500 hover:!text-red-600 focus:!text-red-600 focus:!bg-red-50 dark:focus:!bg-red-900/50">
                                            <Trash2 className="h-4 w-4 mr-2" /> 删除任务
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Second Row: Description (Optional) */} 
                        {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {task.description}
                            </p>
                        )}

                        {/* Third Row: Attributes & Metadata */} 
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 pt-0.5">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                {task.priority && <PriorityDisplay priority={task.priority} />}
                                {task.plannedDate && (
                                    <span className="flex items-center">
                                        <Clock className="h-3.5 w-3.5 mr-1" />
                                        {format(task.plannedDate, 'yyyy/MM/dd')} (计划)
                                    </span>
                                )}
                                {task.dueDate && (
                                    <span className={cn("flex items-center", isOverdue && "text-red-600 dark:text-red-500 font-medium")}>
                                        <Calendar className="h-3.5 w-3.5 mr-1" />
                                        {format(task.dueDate, 'yyyy/MM/dd')} (截止)
                                        {isOverdue && <AlertTriangle className="h-3.5 w-3.5 ml-1 text-red-500" />}
                                        
                                        {isToday(new Date(task.dueDate)) && !task.completed && !isOverdue && <Badge variant="outline" className="ml-1.5 !text-xs border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 px-1 py-0">今日到期</Badge>}
                                    </span>
                                )}
                                {task.projectId && (
                                    <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                                        <FolderOpen className="h-3 w-3 mr-1 opacity-70" />
                                        {getProjectNameById(task.projectId)}
                                    </Badge>
                                )}
                                {task.tags && task.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 border-transparent">
                                        <TagIcon className="h-3 w-3 mr-1" />
                                        {tag}
                                    </Badge>
                                ))}
                                {task.category && <TaskCategoryDisplay category={task.category} />}
                            </div>
                            {/* Metadata - Moved to the end of 3rd row for compactness */} 
                            {(task.createdAt || (task as any).updatedAt) && (
                                <div className="hidden md:flex items-center text-gray-400 dark:text-gray-500 flex-shrink-0">
                                    {task.createdAt && <span title={`创建于: ${format(task.createdAt, 'yyyy/MM/dd HH:mm')}`}>创: {format(task.createdAt, 'yy/MM/dd')}</span>}
                                    {(task as any).updatedAt && task.createdAt && <span className="mx-1">·</span>}
                                    {(task as any).updatedAt && <span title={`更新于: ${format((task as any).updatedAt, 'yyyy/MM/dd HH:mm')}`}>更: {format((task as any).updatedAt, 'yy/MM/dd')}</span>}
                                </div>
                            )}
                        </div>
                        
                        {/* Subtasks */} 
                        {task.subtasks && task.subtasks.length > 0 && (
                            <div className="mt-1.5 pt-1.5 pl-2 border-l-2 border-gray-200 dark:border-gray-700 space-y-1">
                                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center mb-0.5">
                                    <ChevronDown className="h-3.5 w-3.5 mr-0.5" />
                                    子任务 ({task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length})
                                </div>
                                {task.subtasks.map((subtask) => (
                                    <div key={subtask.id} className="flex items-center space-x-2" data-no-edit-on-click="true">
                                        <Checkbox
                                            id={`subtask-${task.id}-${subtask.id}`}
                                            checked={subtask.completed}
                                            className="h-3.5 w-3.5"
                                        />
                                        <label
                                            htmlFor={`subtask-${task.id}-${subtask.id}`}
                                            className={cn("text-xs text-gray-700 dark:text-gray-300", subtask.completed && "line-through text-gray-500 dark:text-gray-400")}
                                        >
                                            {subtask.title}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Board View
    if (viewMode === 'board') {
         const boardCardClasses = cn(
            cardClasses,
            isSelected && "ring-2 ring-primary dark:ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 shadow-lg",
        );
        return (
             <div 
                className={boardCardClasses} 
                onClick={handleCardClick}
             >
                <div className="flex items-start space-x-2">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={handleCheckboxChange}
                        aria-label={`选择任务 ${task.title}`}
                        className="mt-0.5 flex-shrink-0"
                        data-no-edit-on-click="true"
                    />
                    <div className="flex-1 min-w-0"> {/* Added min-w-0 */} 
                        <div className="flex items-center justify-between">
                             <div className="flex items-center min-w-0"> {/* Added min-w-0 */} 
                                {task.completed && <Check className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />}
                                <h3
                                    className={cn(
                                        "text-sm font-medium text-gray-800 dark:text-gray-100 truncate", // Added truncate
                                        task.completed && "line-through text-gray-500 dark:text-gray-400",
                                    )}
                                    title={task.title} // Added title attribute
                                >
                                    {task.isFrog && <span role="img" aria-label="frog" className="mr-1">🐸</span>}
                                    {task.title}
                                </h3>
                            </div>
                            <div className="flex items-center flex-shrink-0" data-no-edit-on-click="true">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-sky-400" onClick={handlePomodoro} title="启动番茄钟">
                                    <Timer className="h-3.5 w-3.5" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-sky-400" title="更多操作">
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                       <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleComplete(task.id!); }}>
                                            {task.completed ? (
                                                <><Undo className="h-4 w-4 mr-2" /> 标记为未完成</>
                                            ) : (
                                                <><Check className="h-4 w-4 mr-2" /> 标记为完成</>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditTask(task); }}>
                                            <Edit className="h-4 w-4 mr-2" /> 编辑任务
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFrogStatus(task.id!); }}>
                                            <Flag className="h-4 w-4 mr-2" /> {task.isFrog ? "取消青蛙" : "标记青蛙"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTimelineAdd();}} disabled={task.completed}>
                                            <CalendarDays className="h-4 w-4 mr-2" /> 添加到时间轴
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id!); }} className="text-red-500 hover:!text-red-600 focus:!text-red-600 focus:!bg-red-50 dark:focus:!bg-red-900/50">
                                            <Trash2 className="h-4 w-4 mr-2"/> 删除任务
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        
                        {task.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                                {task.description}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs">
                             {task.priority && <PriorityDisplay priority={task.priority} />}
                            {task.plannedDate && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-gray-300 dark:border-gray-600">
                                    <Clock className="h-3 w-3 mr-1 opacity-60"/>
                                    {format(task.plannedDate, 'MM/dd')} (计划)
                                </Badge>
                            )}
                            {task.dueDate && (
                                <Badge variant="outline" className={cn(
                                    "text-xs px-1.5 py-0.5 border-gray-300 dark:border-gray-600", 
                                    isOverdue && "!border-red-500 dark:!border-red-600 !text-red-600 dark:!text-red-500 !bg-red-50 dark:!bg-red-900/40"
                                )}>
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {format(new Date(task.dueDate), 'MM/dd')} (截止)
                                    
                                    {/* "即将到期" (1-2 days away) visual cue - REMOVED FROM HERE */}
                                    {/* {task.dueDate && !task.completed && !isOverdue && (() => {
                                        const today = startOfDay(new Date());
                                        const dueDateObj = new Date(task.dueDate);
                                        const dueDateStart = startOfDay(dueDateObj);

                                        if (isFuture(dueDateStart) || isToday(dueDateStart)) {
                                            const daysDiff = differenceInDays(dueDateStart, today);
                                            if (daysDiff === 1 || daysDiff === 2) {
                                                return (
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-1 !text-xs border-orange-500 text-orange-600 bg-orange-50 dark:border-orange-400 dark:text-orange-300 dark:bg-orange-900/40 px-1 py-0"
                                                    >
                                                        即将到期
                                                    </Badge>
                                                );
                                            }
                                        }
                                        return null;
                                    })()} */}

                                    {isToday(new Date(task.dueDate)) && !task.completed && !isOverdue && <span className="ml-1 font-medium text-blue-600 dark:text-blue-400">(今日)</span>}
                                </Badge>
                            )}
                             {task.projectId && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-gray-300 dark:border-gray-600">
                                    <FolderOpen className="h-3 w-3 mr-1 opacity-60"/>
                                    {getProjectNameById(task.projectId)?.substring(0,10) + (getProjectNameById(task.projectId)?.length > 10 ? '...' : '')}
                                </Badge>
                            )}
                            {task.tags && task.tags.slice(0, 1).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5 bg-teal-50 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 border-transparent">
                                    <TagIcon className="h-3 w-3 mr-0.5" />
                                    {tag.substring(0,8) + (tag.length > 8 ? '...':'')}
                                </Badge>
                            ))}
                            {task.tags && task.tags.length > 1 && <span className="text-muted-foreground text-xs">+{task.tags.length -1}</span>}
                            {task.category && <TaskCategoryDisplay category={task.category} />}
                        </div>
                         {/* Board view might not show created/updated dates due to space constraints */}
                    </div>
                </div>
            </div>
        );
    }
    return null;
}
