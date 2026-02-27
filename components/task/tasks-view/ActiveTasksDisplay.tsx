// 此组件作为活动任务（非回收站视图）的主要显示区域，
// 负责组织和渲染 TaskListHeader、TaskList 或 TaskBoardView，以及 TasksListFooter。
import { Task } from "@/lib/task-utils";
import { TaskListHeader } from "./TaskListHeader";
import { TaskList } from "./TaskList";
import { TaskBoardView } from "./TaskBoardView";
import { TasksListFooter } from "./TasksListFooter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ActiveTasksDisplayProps {
    // From useTaskFiltersAndSort & TasksView state
    viewMode: "list" | "board";
    onViewModeChange: (mode: "list" | "board") => void;
    sortedTasks: Task[];
    dynamicListTitle: string;
    searchTermInput: string;
    onSearchTermChange: (term: string) => void;
    sortBy: string;
    onSortByChange: (sortKey: string) => void;
    // From useTaskSelection
    selectedTaskIds: number[];
    headerCheckboxState: boolean | 'indeterminate';
    onToggleSelectAll: () => void;
    // From useTaskData & TasksView (callbacks for items/dialogs)
    getProjectNameById: (projectId: number | string | undefined) => string;
    onSelectTask: (taskId: number, checked: boolean) => void;
    onToggleComplete: (taskId: number) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: number) => void;
    onToggleFrogStatus: (taskId: number) => void;
    onAddTaskToTimeline: (task: Task) => void;
    onPomodoroClick: (taskId: number, taskTitle: string) => void;
    onOpenCreateDialog: () => void; // For footer button and empty list button
    showSelectAll: boolean; // To control visibility of header checkbox
    projects?: { id?: number; name: string }[];
    onUpdateTask?: (task: Task) => void;
}

export function ActiveTasksDisplay({
    viewMode,
    onViewModeChange,
    sortedTasks,
    dynamicListTitle,
    searchTermInput,
    onSearchTermChange,
    sortBy,
    onSortByChange,
    selectedTaskIds,
    headerCheckboxState,
    onToggleSelectAll,
    getProjectNameById,
    onSelectTask,
    onToggleComplete,
    onEditTask,
    onDeleteTask,
    onToggleFrogStatus,
    onAddTaskToTimeline,
    onPomodoroClick,
    onOpenCreateDialog,
    showSelectAll,
    projects,
    onUpdateTask,
}: ActiveTasksDisplayProps) {

    const completedTaskCount = sortedTasks.filter(task => task.completed).length;

    return (
        <Card>
            <CardHeader className="px-4 pt-4 pb-2 md:px-6 md:pt-6 md:pb-3"> {/* Adjusted padding */}
                <TaskListHeader
                    dynamicListTitle={dynamicListTitle}
                    taskCount={sortedTasks.length}
                    searchTermInput={searchTermInput}
                    onSearchTermChange={onSearchTermChange}
                    sortBy={sortBy}
                    onSortByChange={onSortByChange}
                    viewMode={viewMode}
                    onViewModeChange={onViewModeChange}
                    showSelectAllCheckbox={showSelectAll && sortedTasks.length > 0}
                    headerCheckboxState={headerCheckboxState}
                    onToggleSelectAll={onToggleSelectAll}
                />
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-3"> {/* Adjusted padding */}
                {viewMode === "list" ? (
                    <TaskList
                        tasks={sortedTasks}
                        selectedTaskIds={selectedTaskIds}
                        viewMode="list"
                        searchQuery={searchTermInput} // Pass debouncedSearchTerm if preferred for empty state
                        getProjectNameById={getProjectNameById}
                        onSelectTask={onSelectTask}
                        onToggleComplete={onToggleComplete}
                        onEditTask={onEditTask}
                        onDeleteTask={onDeleteTask}
                        onToggleFrogStatus={onToggleFrogStatus}
                        onAddTaskToTimeline={onAddTaskToTimeline}
                        onPomodoroClick={onPomodoroClick}
                        onOpenCreateDialog={onOpenCreateDialog}
                        projects={projects}
                        onUpdateTask={onUpdateTask}
                    />
                ) : (
                    <TaskBoardView
                        tasks={sortedTasks}
                        selectedTaskIds={selectedTaskIds}
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
                )}
            </CardContent>
            {/* Footer should be outside CardContent if it needs to span full width or have different styling context */}
            {/* For now, keeping it inside Card but outside CardContent might be better if Card has its own padding */}
            {/* Let's put it inside Card but ensure it has its own padding or is part of CardFooter component from shadcn */}
            {/* Re-evaluating: TasksListFooter is a simple div, let's wrap it in CardFooter for consistency if available */}
            {/* For simplicity, current TasksListFooter is a div, so it can be directly placed. If CardFooter from shadcn is used, structure changes */}
             <div className="p-4 md:p-6 border-t">
                <TasksListFooter
                    completedTaskCount={completedTaskCount}
                    totalTaskCount={sortedTasks.length}
                    onOpenCreateDialog={onOpenCreateDialog}
                />
            </div>
        </Card>
    );
}
