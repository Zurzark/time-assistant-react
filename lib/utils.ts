import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date object or string into a HH:MM time string.
 * @param date The date or string to format.
 * @returns A string representing the time in HH:MM format.
 */
export const formatTimeForDisplay = (date: Date | string): string => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

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
export const checkTimeOverlap = (
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
  gapMinutes: number = 0
): boolean => {
  const gapMilliseconds = gapMinutes * 60 * 1000;
  // A overlaps B if A starts before B ends (plus gap) AND A ends (plus gap) after B starts.
  return startA.getTime() < (endB.getTime() + gapMilliseconds) && 
         endA.getTime() > (startB.getTime() - gapMilliseconds);
};
