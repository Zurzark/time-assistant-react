// 日期工具函数
// 提供日期格式化和处理的实用函数

/**
 * 将日期格式化为相对时间字符串（如"今天 09:15"、"昨天 18:30"、"2天前"）
 * @param date 要格式化的日期
 * @returns 格式化后的相对时间字符串
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  // 格式化时间部分
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}`;
  
  // 判断是今天、昨天还是更早
  if (dateOnly.getTime() === today.getTime()) {
    return `今天 ${timeString}`;
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return `昨天 ${timeString}`;
  } else {
    // 计算天数差
    const diffTime = today.getTime() - dateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      // 超过一周，显示具体日期
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
}

/**
 * 判断日期是否在最近几天内
 * @param date 要检查的日期
 * @param days 天数范围，默认为2（今天和昨天）
 * @returns 是否在指定的最近几天内
 */
export function isRecent(date: Date, days: number = 2): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffTime = today.getTime() - dateOnly.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays < days;
} 