import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date object or string into a HH:MM time string.
 * @param date The date or string to format.
 * @returns A string representing the time in HH:MM format.
 */
export function formatTimeForDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Checks if two time ranges overlap, considering an optional minimum gap between them.
 *
 * @param startA Start date of the first time range.
 * @param endA End date of the first time range.
 * @param startB Start date of the second time range.
 * @param endB End date of the second time range.
 * @param gapMinutes Optional minimum gap in minutes between the two ranges. Defaults to 0.
 * @returns True if the time ranges overlap (considering the gap), false otherwise.
 */
export function checkTimeOverlap(
  start1: Date, 
  end1: Date, 
  start2: Date, 
  end2: Date, 
  minGapMinutes: number = 0 // 默认为0，表示没有间隔要求
): boolean {
  const gapMilliseconds = minGapMinutes * 60 * 1000;

  // 调整时间段以包含间隔
  const adjustedEnd1 = new Date(end1.getTime() + gapMilliseconds);
  const adjustedStart2 = new Date(start2.getTime() - gapMilliseconds);

  // 重叠条件：第一个时间段的开始在第二个时间段结束之前，并且第一个时间段的结束在第二个时间段开始之后
  return start1 < adjustedEnd1 && adjustedStart2 < end1;
}
