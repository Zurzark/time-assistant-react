import { 
  addDays, addWeeks, addMonths, addYears, 
  isWeekend, format, parseISO, getDay,
  startOfDay, endOfDay
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

// 重复频率类型
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'workdays';

// 结束条件类型
export type RecurrenceEndsType = 'never' | 'on_date' | 'after_occurrences';

// 重复规则接口
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  startDate: Date;
  endsType: RecurrenceEndsType;
  endDate?: Date;
  occurrences?: number;
  // 附加字段，如果需要保存其他信息
  dayOfWeek?: number; // 0-6，用于 weekly
}

// 将重复规则转换为字符串存储
export function serializeRecurrenceRule(rule: RecurrenceRule): string {
  return JSON.stringify({
    ...rule,
    startDate: rule.startDate.toISOString(),
    endDate: rule.endDate ? rule.endDate.toISOString() : undefined,
  });
}

// 从字符串解析重复规则
export function parseRecurrenceRule(ruleString: string): RecurrenceRule | null {
  try {
    const parsed = JSON.parse(ruleString);
    return {
      ...parsed,
      startDate: new Date(parsed.startDate),
      endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
    };
  } catch (e) {
    console.error('Failed to parse recurrence rule:', e);
    return null;
  }
}

// 计算下一次发生的日期
export function getNextOccurrence(baseDate: Date, rule: RecurrenceRule): Date | null {
  if (!rule || !rule.frequency) return null;
  
  // 确保我们处理的是日期的副本
  const nextDate = new Date(baseDate);
  
  switch(rule.frequency) {
    case 'daily':
      return addDays(nextDate, 1);
      
    case 'weekly':
      return addWeeks(nextDate, 1);
      
    case 'monthly':
      return addMonths(nextDate, 1);
      
    case 'yearly':
      return addYears(nextDate, 1);
      
    case 'workdays':
      // 跳过周末
      let candidateDate = addDays(nextDate, 1);
      while(isWeekend(candidateDate)) {
        candidateDate = addDays(candidateDate, 1);
      }
      return candidateDate;
      
    default:
      return null;
  }
}

// 检查重复规则是否已经结束
export function isRecurrenceFinished(rule: RecurrenceRule, currentDate: Date = new Date()): boolean {
  if (rule.endsType === 'never') return false;
  
  if (rule.endsType === 'on_date' && rule.endDate) {
    return currentDate > rule.endDate;
  }
  
  // 对于 'after_occurrences'，我们需要计算已经发生的次数
  // 这需要额外的逻辑，可能需要保存已发生次数或从开始计算
  // 这里简单返回 false，实际实现需要更复杂的逻辑
  return false;
}

// 生成可读的重复规则描述
export function getRecurrenceDescription(rule: RecurrenceRule): string {
  if (!rule) return '';
  
  // 基本频率描述
  let desc = '';
  const startDateStr = format(rule.startDate, 'yyyy-MM-dd');
  
  switch(rule.frequency) {
    case 'daily':
      desc = `从 ${startDateStr} 开始，每天重复`;
      break;
      
    case 'weekly': {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dayOfWeek = rule.dayOfWeek !== undefined ? rule.dayOfWeek : getDay(rule.startDate);
      desc = `从 ${startDateStr} 开始，每周${days[dayOfWeek]}重复`;
      break;
    }
    
    case 'monthly':
      desc = `从 ${startDateStr} 开始，每月${format(rule.startDate, 'dd')}日重复`;
      break;
      
    case 'yearly':
      desc = `从 ${startDateStr} 开始，每年${format(rule.startDate, 'MM月dd日')}重复`;
      break;
      
    case 'workdays':
      desc = `从 ${startDateStr} 开始，每个工作日重复 (周一至周五)`;
      break;
  }
  
  // 添加结束条件描述
  if (rule.endsType === 'on_date' && rule.endDate) {
    desc += `，直到 ${format(rule.endDate, 'yyyy-MM-dd')}`;
  } else if (rule.endsType === 'after_occurrences' && rule.occurrences) {
    desc += `，共 ${rule.occurrences} 次后结束`;
  } else {
    desc += '，一直重复';
  }
  
  return desc;
}

// 生成未来的重复实例
export function generateFutureOccurrences(
  rule: RecurrenceRule, 
  count: number = 10, 
  startFrom: Date = new Date()
): Date[] {
  if (!rule || !rule.frequency) return [];
  
  const occurrences: Date[] = [];
  let currentDate = new Date(Math.max(rule.startDate.getTime(), startFrom.getTime()));
  
  // 如果开始日期在过去，找到第一个未来的发生日期
  while (currentDate < startFrom) {
    const next = getNextOccurrence(currentDate, rule);
    if (!next) break;
    currentDate = next;
  }
  
  // 生成指定数量的未来实例
  for (let i = 0; i < count; i++) {
    // 检查是否已结束
    if (rule.endsType === 'on_date' && rule.endDate && currentDate > rule.endDate) {
      break;
    }
    
    if (rule.endsType === 'after_occurrences' && rule.occurrences && i >= rule.occurrences) {
      break;
    }
    
    occurrences.push(new Date(currentDate));
    
    const next = getNextOccurrence(currentDate, rule);
    if (!next) break;
    currentDate = next;
  }
  
  return occurrences;
}
