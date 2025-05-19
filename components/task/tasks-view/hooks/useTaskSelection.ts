// 此 Hook 负责管理任务列表中的任务选择状态，包括选择/取消选择单个任务、全选/取消全选的逻辑，
// 以及计算与头部全选复选框相关的状态。
import { useState, useMemo, useCallback } from 'react';
import { Task } from '@/lib/task-utils';

interface UseTaskSelectionProps {
    sortedTasks: Task[]; // From useTaskFiltersAndSort
}

export function useTaskSelection({ sortedTasks }: UseTaskSelectionProps) {
    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

    const handleTaskSelection = useCallback((taskId: number, isSelected: boolean) => {
        setSelectedTaskIds(prevSelectedIds =>
            isSelected
                ? [...prevSelectedIds, taskId]
                : prevSelectedIds.filter(id => id !== taskId)
        );
    }, []);

    const areAllVisibleTasksSelected = useMemo(() =>
        sortedTasks.length > 0 && selectedTaskIds.length === sortedTasks.length && sortedTasks.every(task => task.id !== undefined && selectedTaskIds.includes(task.id)), 
    [sortedTasks, selectedTaskIds]);

    const areSomeTasksSelected = useMemo(() =>
        selectedTaskIds.length > 0 && !areAllVisibleTasksSelected, 
    [selectedTaskIds, areAllVisibleTasksSelected]);

    const headerCheckboxState: boolean | 'indeterminate' = useMemo(() => {
        if (sortedTasks.length === 0) return false;
        return areAllVisibleTasksSelected ? true : (areSomeTasksSelected ? 'indeterminate' : false);
    }, [areAllVisibleTasksSelected, areSomeTasksSelected, sortedTasks.length]);

    const handleToggleSelectAll = useCallback(() => {
        if (areAllVisibleTasksSelected) {
            setSelectedTaskIds([]);
        } else {
            setSelectedTaskIds(sortedTasks.map(t => t.id).filter(id => id !== undefined) as number[]);
        }
    }, [areAllVisibleTasksSelected, sortedTasks]);

    const clearSelection = useCallback(() => {
        setSelectedTaskIds([]);
    }, []);

    return {
        selectedTaskIds,
        setSelectedTaskIds, // Expose setter if BatchOperationsBar needs to modify it directly after an op
        handleTaskSelection,
        handleToggleSelectAll,
        headerCheckboxState,
        clearSelection, // For BatchOperationsBar
        // No need to export areAllVisibleTasksSelected and areSomeTasksSelected if headerCheckboxState is enough
    };
}
