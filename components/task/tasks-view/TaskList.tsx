// 此组件负责在标准的"列表视图"中渲染 TaskItem 组件列表，
// 并处理列表为空时的空状态显示。
import { Task } from "@/lib/task-utils";
import { TaskItem } from "./TaskItem";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus } from "lucide-react";

interface TaskListProps {
    tasks: Task[];
    selectedTaskIds: number[];
    viewMode: "list" | "board"; // Passed to TaskItem
    searchQuery: string; // For empty state message
    // Callbacks & data for TaskItem
    getProjectNameById: (projectId: number | string | undefined) => string;
    onSelectTask: (taskId: number, checked: boolean) => void;
    onToggleComplete: (taskId: number) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: number) => void;
    onToggleFrogStatus: (taskId: number) => void;
    onAddTaskToTimeline: (task: Task) => void;
    onPomodoroClick: (taskId: number, taskTitle: string) => void;
    // Callback for empty state button
    onOpenCreateDialog: () => void;
    projects?: { id?: number; name: string }[];
    onUpdateTask?: (task: Task) => void;
}

export function TaskList({
    tasks,
    selectedTaskIds,
    viewMode,
    searchQuery,
    getProjectNameById,
    onSelectTask,
    onToggleComplete,
    onEditTask,
    onDeleteTask,
    onToggleFrogStatus,
    onAddTaskToTimeline,
    onPomodoroClick,
    onOpenCreateDialog,
    projects,
    onUpdateTask,
}: TaskListProps) {
    if (tasks.length > 0) {
        return (
            <div className="space-y-4">
                {tasks.map((task) => (
                    <TaskItem
                        key={task.id}
                        task={task}
                        isSelected={task.id !== undefined && selectedTaskIds.includes(task.id)}
                        viewMode={viewMode} // Should be 'list' when rendered by TaskList
                        getProjectNameById={getProjectNameById}
                        onSelectTask={onSelectTask}
                        onToggleComplete={onToggleComplete}
                        onEditTask={onEditTask}
                        onDeleteTask={onDeleteTask}
                        onToggleFrogStatus={onToggleFrogStatus}
                        onAddTaskToTimeline={onAddTaskToTimeline}
                        onPomodoroClick={onPomodoroClick}
                        projects={projects}
                        onUpdateTask={onUpdateTask}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
                <CheckSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-1">没有找到任务</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
                {searchQuery
                    ? "没有找到匹配的任务，请尝试不同的搜索条件"
                    : "您当前没有任务，点击创建任务按钮添加新任务"}
            </p>
            <Button onClick={onOpenCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                创建任务
            </Button>
        </div>
    );
}
