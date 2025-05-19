// 此组件负责渲染任务的"看板视图"（艾森豪威尔四象限矩阵），
// 将任务按优先级分发到四个象限列中，每个列内部渲染对应的 TaskItem。
import { Task, TaskPriority } from "@/lib/task-utils";
import { TaskItem } from "./TaskItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Clock, XCircle } from "lucide-react"; // 为不同象限提供不同图标

interface TaskBoardViewProps {
    tasks: Task[]; // Already sorted, but will be filtered by priority here
    selectedTaskIds: number[];
    // Callbacks & data for TaskItem
    getProjectNameById: (projectId: number | string | undefined) => string;
    onSelectTask: (taskId: number, checked: boolean) => void;
    onToggleComplete: (taskId: number) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: number) => void;
    onToggleFrogStatus: (taskId: number) => void;
    onAddTaskToTimeline: (task: Task) => void;
    onPomodoroClick: (taskId: number, taskTitle: string) => void;
}

// 定义象限配置
type QuadrantConfig = {
    title: string;
    priority: TaskPriority;
    icon: React.ReactNode;
    bgClass: string;
    borderClass: string;
    iconClass: string;
};

const QuadrantColumn: React.FC<{
    config: QuadrantConfig;
    tasks: Task[];
    selectedTaskIdsForQuadrant: number[];
} & Omit<TaskBoardViewProps, 'tasks' | 'selectedTaskIds'>> = (
    {
        config,
        tasks,
        selectedTaskIdsForQuadrant,
        ...taskItemProps
    }
) => {
    const quadrantTasks = tasks.filter(task => task.priority === config.priority);
    
    return (
        <Card className={`${config.bgClass} ${config.borderClass} h-full flex flex-col overflow-hidden`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center">
                        {config.icon}
                        {config.title}
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-background/70 dark:bg-background/30">
                        {quadrantTasks.length}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-auto space-y-2 min-h-[100px]">
                {quadrantTasks.length > 0 ? (
                    quadrantTasks.map(task => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            isSelected={task.id !== undefined && selectedTaskIdsForQuadrant.includes(task.id)}
                            viewMode="board"
                            {...taskItemProps}
                        />
                    ))
                ) : (
                    <div className="text-center py-3 text-sm text-muted-foreground">
                        没有{config.title}的任务
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export function TaskBoardView(props: TaskBoardViewProps) {
    const { tasks, selectedTaskIds, ...taskItemCallbacks } = props;

    // 定义四个象限的配置
    const quadrants: QuadrantConfig[] = [
        {
            title: "重要且紧急",
            priority: "important-urgent",
            icon: <AlertCircle className="h-4 w-4 mr-2 text-red-500" />,
            bgClass: "bg-red-50 dark:bg-red-950/30",
            borderClass: "border-red-200 dark:border-red-800",
            iconClass: "text-red-500"
        },
        {
            title: "重要不紧急",
            priority: "important-not-urgent",
            icon: <Clock className="h-4 w-4 mr-2 text-amber-500" />,
            bgClass: "bg-amber-50 dark:bg-amber-950/30",
            borderClass: "border-amber-200 dark:border-amber-800",
            iconClass: "text-amber-500"
        },
        {
            title: "不重要但紧急",
            priority: "not-important-urgent",
            icon: <AlertTriangle className="h-4 w-4 mr-2 text-blue-500" />,
            bgClass: "bg-blue-50 dark:bg-blue-950/30",
            borderClass: "border-blue-200 dark:border-blue-800",
            iconClass: "text-blue-500"
        },
        {
            title: "不重要不紧急",
            priority: "not-important-not-urgent",
            icon: <XCircle className="h-4 w-4 mr-2 text-green-500" />,
            bgClass: "bg-green-50 dark:bg-green-950/30",
            borderClass: "border-green-200 dark:border-green-800",
            iconClass: "text-green-500"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-220px)]">
            {quadrants.map((config, index) => (
                <QuadrantColumn
                    key={config.priority}
                    config={config}
                    tasks={tasks}
                    selectedTaskIdsForQuadrant={selectedTaskIds}
                    {...taskItemCallbacks}
                />
            ))}
        </div>
    );
}
