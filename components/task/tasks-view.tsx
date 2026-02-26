// 此文件定义了重构后的任务管理视图组件 (TasksView)，
// 主要承担页面级布局和状态协调的角色，动态渲染合适的子组件，并管理各种对话框状态。
"use client"

import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { PomodoroModal } from "@/components/pomodoro/pomodoro-modal";
import { EditTaskDialog } from "./edit-task-dialog";
import { TrashView } from "../views/trash-view";
import { ConfirmationDialog } from "../common/confirmation-dialog";
import { TaskFormFields, TaskFormData } from "./TaskFormFields";
import { BatchOperationsBar } from "./batch-operations-bar";
import { TaskFilterSidebar, DateFilterType } from "./task-filter-sidebar";

// Import new hooks and components
import { useTaskData } from "./tasks-view/hooks/useTaskData";
// TODO: (ActivityCategories) 从后端获取活动类别数据，并通过 useTaskData 传递下来。需要定义 ActivityCategory 类型 (例如在 @/types 或 @/lib/db)。
// import { ActivityCategory } from "@/types"; // 假设类型定义位置
import { useTaskFiltersAndSort } from "./tasks-view/hooks/useTaskFiltersAndSort";
import { useTaskSelection } from "./tasks-view/hooks/useTaskSelection";
import { ActiveTasksDisplay } from "./tasks-view/ActiveTasksDisplay";
import { Task } from "@/lib/task-utils";
import { SelectTimeRangeModal } from "./SelectTimeRangeModal";
import { usePomodoroController } from "@/components/pomodoro/pomodoro-context"

export function TasksView() {
  // --- Main Data and DB interactions ---
  const {
    tasks, // Live tasks for general view
    projectList,
    tagList,
    activityCategories,
    deletedTasks, // For trash view
    loadingData, // General loading for tasks, projects, tags
    errorData, // General error for tasks, projects, tags
    loadTasks, // Callback to retry loading main tasks
    loadDeletedTasks, // Callback to load/retry deleted tasks
    loadingTrash, // Specific loading for trash
    trashError, // Specific error for trash
    getProjectNameById,
    handleCreateTask,
    handleUpdateTask,
    handleDeleteTask: triggerSoftDelete, // Renamed for clarity in TasksView context
    handleToggleComplete,
    handleToggleSubtaskComplete, // Ensure useTaskData provides this
    handleToggleFrogStatus,
    handleRestoreTask,
    handlePermanentlyDeleteTask: triggerPermanentDelete, // Renamed for clarity
    handleCreateNewProject,
    handleAddTaskToTimeline,
    taskToEdit,
    setTaskToEdit,
    selectedTaskForPomodoro,
    setSelectedTaskForPomodoro,
    dispatchStatsUpdate,
    emptyAllTrashItems, // Placeholder for the new function from useTaskData
    isEmplyingAllTrash, // Placeholder for the new state from useTaskData
    isSelectTimeModalOpen,
    setIsSelectTimeModalOpen,
    taskForTimelineModal,
    handleConfirmTimeRangeAndAddTask,
  } = useTaskData();

  // --- Filtering and Sorting ---
  const [selectedView, setSelectedView] = useState("all"); // Main view selector (e.g., "next-actions", "trash")
  const {
    sortedTasks, // Derived from filtered and sorted tasks from the hook
    tagCounts,
    dynamicListTitle,
    searchTermInput,
    setSearchTermInput,
    sortBy,
    setSortBy,
    selectedProjectIds, setSelectedProjectIds,
    selectedTagNames, setSelectedTagNames,
    activeDateFilter, setActiveDateFilter,
    customDateRange, setCustomDateRange,
    selectedPriorities, setSelectedPriorities,
    selectedDateFilterType, setSelectedDateFilterType,
    clearAllAdvancedFilters,
  } = useTaskFiltersAndSort({
    tasks, // Pass the live tasks from useTaskData
    projectList,
    tagList,
    selectedView,
    getProjectNameById,
  });

  // --- Task Selection ---
  const {
    selectedTaskIds,
    setSelectedTaskIds,
    handleTaskSelection, // Renamed from onSelectTask in hook for clarity
    handleToggleSelectAll,
    headerCheckboxState,
    clearSelection,
  } = useTaskSelection({ sortedTasks }); // Pass the final sorted tasks

  // --- UI State for Modals/Dialogs ---
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createTaskFormKey, setCreateTaskFormKey] = useState(() => `create-task-form-${Date.now()}`);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // taskToEdit comes from useTaskData

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [taskToDeleteIdConfirm, setTaskToDeleteIdConfirm] = useState<number | null>(null);

  const [isPermanentDeleteConfirmOpen, setIsPermanentDeleteConfirmOpen] = useState(false);
  const [taskToPermanentlyDeleteIdConfirm, setTaskToPermanentlyDeleteIdConfirm] = useState<number | null>(null);

  const { openPomodoroForTask } = usePomodoroController();

  // --- Effects for Modal Control based on data state ---
  useEffect(() => {
    setIsEditModalOpen(!!taskToEdit);
  }, [taskToEdit]);

  useEffect(() => {
    if (selectedTaskForPomodoro) {
      openPomodoroForTask(selectedTaskForPomodoro.id, selectedTaskForPomodoro.title);
    }
    // Modal controls its own closure, or reset selectedTaskForPomodoro to close it
  }, [selectedTaskForPomodoro, openPomodoroForTask]);

  // --- Callbacks for UI interaction ---
  const resetCreateTaskForm = useCallback(() => {
    setCreateTaskFormKey(`create-task-form-${Date.now()}`);
  }, []);

  const openCreateDialog = () => {
    resetCreateTaskForm();
    setIsCreateDialogOpen(true);
  };

  const handleActualCreateTask = async (formData: TaskFormData) => {
    await handleCreateTask(formData, () => {
      resetCreateTaskForm();
      setIsCreateDialogOpen(false);
      // dispatchStatsUpdate is called within useTaskData's handleCreateTask
    });
  };

  const handleActualUpdateTask = async (updatedData: Task) => { // Assuming TaskFormFields returns Task-like structure for edit
    if (!taskToEdit || taskToEdit.id === undefined) return;
    // The Task type for updatedData might need mapping if it's directly from form
    await handleUpdateTask(updatedData, taskToEdit.id, () => {
      setIsEditModalOpen(false);
      setTaskToEdit(null);
      // dispatchStatsUpdate is called within useTaskData's handleUpdateTask
    });
  };

  const openDeleteConfirmDialog = (id: number) => {
    setTaskToDeleteIdConfirm(id);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (taskToDeleteIdConfirm === null) return;
    await triggerSoftDelete(taskToDeleteIdConfirm, () => {
      setIsConfirmDeleteDialogOpen(false);
      setTaskToDeleteIdConfirm(null);
      clearSelection(); // Clear selection as deleted tasks might be part of it
      // dispatchStatsUpdate and loadTasks are called within useTaskData's handleDeleteTask
    });
  };

  const openPermanentDeleteConfirmDialog = (taskId: number) => {
    setTaskToPermanentlyDeleteIdConfirm(taskId);
    setIsPermanentDeleteConfirmOpen(true);
  };

  const confirmPermanentDeleteTask = async () => {
    if (taskToPermanentlyDeleteIdConfirm === null) return;
    await triggerPermanentDelete(taskToPermanentlyDeleteIdConfirm, () => {
      setIsPermanentDeleteConfirmOpen(false);
      setTaskToPermanentlyDeleteIdConfirm(null);
      // loadDeletedTasks is called within useTaskData's handlePermanentlyDeleteTask if needed
    });
  };

  const handlePomodoroClickFromItem = (taskId: number, taskTitle: string) => {
    openPomodoroForTask(taskId, taskTitle);
  };

  // --- Lifecycle Effect for loading initial data for trash view ---
  useEffect(() => {
    if (selectedView === 'trash') {
      loadDeletedTasks();
    }
    // Initial load for main tasks, projects, tags is handled by useTaskData's own useEffect
  }, [selectedView, loadDeletedTasks]);


  // --- Render Logic ---
  // Initial loading state for the entire view (non-trash)
  if (loadingData && tasks.length === 0 && selectedView !== 'trash') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Error state for the entire view (non-trash)
  if (errorData && selectedView !== 'trash') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-destructive">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">加载任务失败</h2>
        <p>{errorData.message}</p>
        <Button onClick={loadTasks} className="mt-4">重试</Button>
      </div>
    );
  }

  return (
    <div className="container py-6 mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">任务</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={(isOpen) => {
            setIsCreateDialogOpen(isOpen);
            if (!isOpen) resetCreateTaskForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                创建任务
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] md:max-w-[700px] lg:max-w-[750px]">
              <DialogHeader>
                <DialogTitle>创建新任务</DialogTitle>
                <DialogDescription>添加一个新任务到您的任务列表中</DialogDescription>
              </DialogHeader>
              <TaskFormFields
                key={createTaskFormKey}
                availableProjects={projectList}
                availableActivityCategories={activityCategories}
                onSave={handleActualCreateTask}
                onCancel={() => {
                  setIsCreateDialogOpen(false);
                  resetCreateTaskForm();
                }}
                onCreateNewProjectInForm={handleCreateNewProject} // Pass from useTaskData
                submitButtonText="创建任务"
                showCancelButton={true}
              />
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-muted-foreground">管理和组织您的所有任务。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <TaskFilterSidebar
          allProjects={projectList}
          allTags={tagList}
          selectedView={selectedView}
          onSelectedViewChange={setSelectedView}
          selectedProjectIds={selectedProjectIds}
          onSelectedProjectIdsChange={setSelectedProjectIds}
          selectedTagNames={selectedTagNames}
          onSelectedTagNamesChange={setSelectedTagNames}
          activeDateFilter={activeDateFilter}
          onActiveDateFilterChange={setActiveDateFilter}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          selectedPriorities={selectedPriorities}
          onSelectedPrioritiesChange={setSelectedPriorities}
          onClearAllAdvancedFilters={clearAllAdvancedFilters}
          getProjectNameById={getProjectNameById}
          className="lg:col-span-1"
          selectedDateFilterType={selectedDateFilterType}
          onSelectedDateFilterTypeChange={setSelectedDateFilterType}
          tagCounts={tagCounts}
        />

        <div className="lg:col-span-3 space-y-6">
          {selectedView !== 'trash' && selectedTaskIds.length > 0 && (
            <BatchOperationsBar
              selectedTaskIds={selectedTaskIds}
              onClearSelection={clearSelection}
              onOperationComplete={() => {
                loadTasks();
                dispatchStatsUpdate(); // General update for stats
              }}
              className="mb-4"
              // Pass other necessary props like allProjects, allTags if needed for operations
            />
          )}

          {selectedView === "trash" ? (
            <TrashView
              deletedTasks={deletedTasks}
              loadingTrash={loadingTrash}
              trashError={trashError}
              onRestoreTask={handleRestoreTask} // from useTaskData
              onPermanentlyDeleteTask={openPermanentDeleteConfirmDialog} // Opens confirm dialog
              onLoadRetry={loadDeletedTasks} // from useTaskData
              onEmptyTrash={emptyAllTrashItems} // Pass the new function from useTaskData
              isEmplyingTrash={isEmplyingAllTrash} // Pass the new state from useTaskData
            />
          ) : (
            <ActiveTasksDisplay
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortedTasks={sortedTasks}
              dynamicListTitle={dynamicListTitle}
              searchTermInput={searchTermInput}
              onSearchTermChange={setSearchTermInput}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              selectedTaskIds={selectedTaskIds}
              headerCheckboxState={headerCheckboxState}
              onToggleSelectAll={handleToggleSelectAll}
              getProjectNameById={getProjectNameById}
              onSelectTask={handleTaskSelection} // Pass the renamed selection handler
              onToggleComplete={handleToggleComplete} // from useTaskData
              onEditTask={(task: Task) => setTaskToEdit(task)} // Opens edit dialog via useEffect
              onDeleteTask={openDeleteConfirmDialog} // Opens confirm dialog for soft delete
              onToggleFrogStatus={handleToggleFrogStatus} // from useTaskData
              onAddTaskToTimeline={handleAddTaskToTimeline} // from useTaskData
              onPomodoroClick={handlePomodoroClickFromItem} // Opens pomodoro dialog
              onOpenCreateDialog={openCreateDialog} // For empty list and footer button
              showSelectAll={selectedView !== 'trash' && sortedTasks.length > 0}
              // onToggleSubtaskComplete={handleToggleSubtaskComplete} // Pass if ActiveTasksDisplay -> TaskList -> TaskItem needs it
            />
          )}
        </div>
      </div>

      <EditTaskDialog
        open={isEditModalOpen}
        onOpenChange={(isOpen) => {
          setIsEditModalOpen(isOpen);
          if (!isOpen) setTaskToEdit(null);
        }}
        task={taskToEdit}
        onSave={handleActualUpdateTask}
        availableProjects={projectList}
        onCreateNewProject={handleCreateNewProject} // from useTaskData
        availableActivityCategories={activityCategories}
      />

      <ConfirmationDialog
        open={isConfirmDeleteDialogOpen}
        onOpenChange={setIsConfirmDeleteDialogOpen}
        title="确认删除任务"
        description="您确定要删除此任务吗？任务将被移动到回收站。"
        onConfirm={confirmDeleteTask}
      />

      <ConfirmationDialog
        open={isPermanentDeleteConfirmOpen}
        onOpenChange={setIsPermanentDeleteConfirmOpen}
        title="确认永久删除任务"
        description="您确定要永久删除此任务吗？此操作无法撤销。"
        onConfirm={confirmPermanentDeleteTask}
      />

      <SelectTimeRangeModal
        isOpen={isSelectTimeModalOpen}
        onOpenChange={setIsSelectTimeModalOpen}
        task={taskForTimelineModal}
        onConfirm={handleConfirmTimeRangeAndAddTask}
      />

        {/* Optional: Global loading overlay for operations like batch updates if not handled by button states */}
        {/* Current loadingData is for initial data load, not transient operations. */}
        {/* Consider a separate loading state if a global overlay for actions is desired. */}
    </div>
  );
}