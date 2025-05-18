import { ObjectStores, add, getByIndex, Task, TimeBlock, Event } from '../lib/db';

const POMODORO_DURATION_MINUTES = 25; // 每个番茄钟的分钟数
const DEFAULT_EVENT_DURATION_MINUTES = 60; // 默认事件时长（分钟）

/**
 * 将任务安排到今日时间轴的下一个可用时段。
 * @param task 要安排的任务对象。
 * @param getWorkdayStartHour 一个可选的异步函数，用于获取用户设置的工作日开始小时 (0-23)。如果未提供，默认为9点。
 * @returns 一个包含操作结果的对象 { success: boolean, message: string, event?: TimeBlock & { id: number } }
 */
export async function scheduleTaskToTimeline(
  task: Task,
  getWorkdayStartHour?: () => Promise<number>
): Promise<{ success: boolean; message: string; event?: TimeBlock & { id: number } }> {
  // 1. 确保任务ID有效
  if (typeof task.id !== 'number') {
    return { success: false, message: '任务ID无效，无法安排到时间轴。' };
  }

  // 2. 计算任务时长
  let taskDurationMinutes = DEFAULT_EVENT_DURATION_MINUTES;
  if (task.estimatedPomodoros && task.estimatedPomodoros > 0) {
    taskDurationMinutes = task.estimatedPomodoros * POMODORO_DURATION_MINUTES;
  }
  if (taskDurationMinutes <= 0) {
    taskDurationMinutes = DEFAULT_EVENT_DURATION_MINUTES; // 防止0或负时长
  }

  // 3. 确定查找时间范围和工作日开始时间
  const todayDate = new Date(); // 当前日期和时间
  const startOfToday = new Date(todayDate);
  startOfToday.setHours(0, 0, 0, 0);

  const todayDateString = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  // const endOfToday = new Date(todayDate); // 不再需要 endOfToday 用于查询
  // endOfToday.setHours(23, 59, 59, 999);

  let workdayStartHour = 9; // 默认工作日开始小时
  if (getWorkdayStartHour) {
    try {
      workdayStartHour = await getWorkdayStartHour();
    } catch (error) {
      console.warn('获取工作日开始时间设置失败，使用默认值9点。', error);
    }
  }

  const workdayCanonicalStart = new Date(startOfToday);
  workdayCanonicalStart.setHours(workdayStartHour, 0, 0, 0);

  // searchPointer 是新事件可以开始的最早时间
  let searchPointer = new Date(Math.max(todayDate.getTime(), workdayCanonicalStart.getTime()));

  // 4. 获取今天的已有时间块，并按开始时间排序
  let timeBlocksToday: (TimeBlock & { id: number })[];
  try {
    // const range = IDBKeyRange.bound(startOfToday, endOfToday, false, false); // 查询范围为今天 // 不再需要 range
    timeBlocksToday = (await getByIndex<TimeBlock>(ObjectStores.TIME_BLOCKS, 'byDate', todayDateString))
      .map(tb => ({ ...tb, id: tb.id! as number })) // 确保 id 存在且为 number
      .sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
  } catch (error) {
    console.error("获取今日时间块列表失败:", error);
    return { success: false, message: "无法获取今日事件列表以查找可用时间。" };
  }

  // 5. 查找下一个可用时间槽
  // 遍历今日事件，不断向前推进 searchPointer 以找到空隙
  for (const block of timeBlocksToday) {
    const blockStartTime = new Date(block.startTime);
    const blockEndTime = new Date(block.endTime);

    // 如果 searchPointer 加上任务时长后，仍然早于或等于当前事件的开始时间，
    // 说明找到了一个在当前事件之前的空隙。
    if (searchPointer.getTime() + taskDurationMinutes * 60000 <= blockStartTime.getTime()) {
      break; // searchPointer 当前值即为新事件的开始时间
    }

    // 否则，当前时间段已被占用。将 searchPointer 推到当前事件的结束时间之后。
    // 确保 searchPointer 只前进不后退。
    if (blockEndTime.getTime() > searchPointer.getTime()) {
      searchPointer = new Date(blockEndTime.getTime());
    }
  }
  // 循环结束后，searchPointer 即为新事件的最佳开始时间点

  const newEventStartTime = new Date(searchPointer);
  const newEventEndTime = new Date(newEventStartTime.getTime() + taskDurationMinutes * 60000);

  // 6. 创建新的 TimeBlock 对象
  const newTimeBlockPayload: Omit<TimeBlock, 'id'> = {
    title: task.title,
    taskId: task.id,
    type: 'task', // 默认类型为 task
    startTime: newEventStartTime,
    endTime: newEventEndTime,
    date: `${newEventStartTime.getFullYear()}-${String(newEventStartTime.getMonth() + 1).padStart(2, '0')}-${String(newEventStartTime.getDate()).padStart(2, '0')}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 7. 将新事件存储到 IndexedDB
  try {
    const newTimeBlockId = await add<Omit<TimeBlock, 'id'>>(ObjectStores.TIME_BLOCKS, newTimeBlockPayload);
    
    // 构建完整的事件对象返回，包含生成的ID
    const createdTimeBlock: TimeBlock & { id: number } = {
        ...newTimeBlockPayload,
        id: newTimeBlockId,
    };

    const startTimeStr = newEventStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTimeStr = newEventEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const successMsg = `任务 "${task.title}" 已添加到今日时间轴 ${startTimeStr} - ${endTimeStr}。`;
    
    return { success: true, message: successMsg, event: createdTimeBlock };
  } catch (dbError) {
    console.error("保存时间块到数据库失败:", dbError);
    return { success: false, message: "任务安排失败，无法保存到数据库。" };
  }
}
