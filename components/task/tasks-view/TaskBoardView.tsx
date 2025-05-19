// 此组件负责渲染任务的"看板视图"（四象限视图），
// 将任务按优先级分发到四个象限列中，每个列内部渲染对应的 TaskItem。
import { Task, TaskPriority } from "@/lib/task-utils";
import { TaskItem } from "./TaskItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react"; // For quadrant titles

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

const QuadrantColumn: React.FC<{
    title: string;
    tasks: Task[];
    priority: TaskPriority;
    iconColorClass: string;
} & Omit<TaskBoardViewProps, 'tasks' | 'selectedTaskIds'> & {selectedTaskIdsForQuadrant: number[]}> = (
    {
        title,
        tasks,
        priority,
        iconColorClass,
        selectedTaskIdsForQuadrant,
        ...taskItemProps
    }
) => {
    const quadrantTasks = tasks.filter(task => task.priority === priority);
    return (
        <Card className={`bg-${iconColorClass}-50 dark:bg-${iconColorClass}-950/30 border-${iconColorClass}-200 dark:border-${iconColorClass}-800`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                    <AlertCircle className={`h-4 w-4 mr-2 text-${iconColorClass}-500`} />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 min-h-[100px]">
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
                        没有 {title.toLowerCase()} 的任务
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export function TaskBoardView(props: TaskBoardViewProps) {
    const { tasks, selectedTaskIds, ...taskItemCallbacks } = props;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"> {/* Usually 2x2 for Eisenhower */} 
            <QuadrantColumn
                title="重要且紧急"
                tasks={tasks}
                priority="important-urgent"
                iconColorClass="red"
                selectedTaskIdsForQuadrant={selectedTaskIds}
                {...taskItemCallbacks}
            />
            <QuadrantColumn
                title="重要不紧急"
                tasks={tasks}
                priority="important-not-urgent"
                iconColorClass="amber"
                selectedTaskIdsForQuadrant={selectedTaskIds}
                {...taskItemCallbacks}
            />
            <QuadrantColumn
                title="不重要但紧急"
                tasks={tasks}
                priority="not-important-urgent"
                iconColorClass="blue"
                selectedTaskIdsForQuadrant={selectedTaskIds}
                {...taskItemCallbacks}
            />
            <QuadrantColumn
                title="不重要不紧急"
                tasks={tasks}
                priority="not-important-not-urgent"
                iconColorClass="green"
                selectedTaskIdsForQuadrant={selectedTaskIds}
                {...taskItemCallbacks}
            />
        </div>
    );
}
