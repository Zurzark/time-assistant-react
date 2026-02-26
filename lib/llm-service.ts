
import { AppSetting, ObjectStores, get, update, add, getAll, Project, Tag, ActivityCategory, LLMUsageLog, LLMUsageStats, remove } from "@/lib/db";

export interface LLMConfig {
  id: string;
  name: string;
  provider: "openai" | "custom"; // For now, mostly OpenAI compatible
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  inputPrice?: number; // per 1M tokens
  outputPrice?: number; // per 1M tokens
}

export interface AISettings {
  activeConfigId?: string;
  configs: LLMConfig[];
  systemPrompt?: string;
}

const DEFAULT_SYSTEM_PROMPT = `# Role
你是一个专业的智能任务管理助手。你的目标是将用户的自然语言输入解析为结构清晰、逻辑严谨的 JSON 任务数据。

# Context
- **当前时间**: {current_datetime}
- **已有项目上下文** (格式: ID: 名称):
{available_projects}
- **已有标签上下文**:
{available_tags}
- **已有活动分类上下文** (格式: ID: 名称):
{available_activity_categories}

# Processing Rules (核心处理逻辑)

## 1. 内容润色与提炼 (NLP Polishing)
- **Title**: 必须简短精炼（建议 5-15 字）。提取核心动词+名词（如“修复登录Bug”、“撰写Q1报告”）。
- **Description**: 将输入中冗长的背景信息、具体细节、备注内容进行润色后放入此处（润色的要求是逻辑通顺，阅读顺畅，保留必要信息）。如果用户输入非常简短，此项可为空。

## 2. 智能分类与标签 (Classification & Tagging)
- **Category**: 必须是 "next_action"（下一步行动）、"someday_maybe"（将来/也许）、"waiting_for"（等待中）之一。
- **Tags**: 必须使用上下文中提供的**已有标签**。如果上下文中没有合适的，则留空。
- **ProjectId**: 根据任务内容，从**已有项目上下文**中选择最匹配的项目 ID。如果没有匹配的项目，则留空。
- **DefaultActivityCategoryId**: 根据任务内容，从**已有活动分类上下文**中选择最匹配的活动分类 ID。如果没有匹配的分类，则留空。

## 3. 优先级判断 (Priority Matrix)
基于任务性质判断：
- **Priority**: 综合推断：
  - 'importantUrgent': 重要且紧急
  - 'importantNotUrgent': 重要不紧急
  - 'notImportantUrgent': 不重要但紧急
  - 'notImportantNotUrgent': 不重要不紧急
- **isFrog**: boolean (true/false). 是否为"青蛙任务" (最困难/最重要的任务，或者当前最应该关注的问题).

## 4. 时间解析 (Time Extraction)
基于当前时间推断绝对时间 (YYYY-MM-DD 格式)。如果提取不到则忽略该字段：
- **plannedDate**: “明天开始”、“下周一做”
- **dueDate**: “截止到...”、“周五前完成”
- **estimatedDurationHours**: 提取时长描述（如“开会1小时” -> 1, “30分钟” -> 0.5）。如果没有明确提到时长，请根据任务的复杂度和性质，给出一个合理的预估时长。不要留空。

## 5. ID分配机制
- **originalId**: 必须返回输入中对应的 **originalId**，用于关联原始想法。

# Output Format
**必须**仅输出一个符合 JSON 语法的数组。不要包含 Markdown 代码块标记（json）。

## JSON字段定义
[
  {
    "originalId": Number,
    "title": "String",
    "description": "String",
    "category": "next_action|someday_maybe|waiting_for",
    "priority": "importantUrgent|importantNotUrgent|notImportantUrgent|notImportantNotUrgent",
    "isFrog": Boolean,
    "projectId": Number | null,
    "defaultActivityCategoryId": Number | null,
    "tags": ["String"],
    "plannedDate": "String (YYYY-MM-DD)",
    "dueDate": "String (YYYY-MM-DD)",
    "estimatedDurationHours": Number
  }
]`;

const APP_SETTINGS_KEY = "ai_settings";

export async function getAISettings(): Promise<AISettings> {
  try {
    const settings = await get<AppSetting>(ObjectStores.APP_SETTINGS, APP_SETTINGS_KEY);
    if (settings && settings.value) {
        // Ensure defaults if fields are missing in stored data
        return {
            configs: settings.value.configs || [],
            activeConfigId: settings.value.activeConfigId,
            systemPrompt: settings.value.systemPrompt || DEFAULT_SYSTEM_PROMPT
        };
    }
  } catch (error) {
    // Ignore error if setting doesn't exist
  }
  
  return {
    configs: [],
    systemPrompt: DEFAULT_SYSTEM_PROMPT
  };
}

export async function saveAISettings(settings: AISettings): Promise<void> {
  await update(ObjectStores.APP_SETTINGS, {
    key: APP_SETTINGS_KEY,
    value: settings
  });
}

export interface AnalyzedTask {
    originalContent: string;
    originalId?: number;
    title: string;
    description?: string;
    category: "next_action" | "someday_maybe" | "waiting_for";
    priority: "importantUrgent" | "importantNotUrgent" | "notImportantUrgent" | "notImportantNotUrgent";
    isFrog: boolean;
    projectId?: number;
    defaultActivityCategoryId?: number;
    tags?: string[];
    plannedDate?: string;
    dueDate?: string;
    estimatedDurationHours?: number;
}

async function getContextData() {
    try {
        const [projects, tags, activityCategories] = await Promise.all([
            getAll<Project>(ObjectStores.PROJECTS),
            getAll<Tag>(ObjectStores.TAGS),
            getAll<ActivityCategory>(ObjectStores.ACTIVITY_CATEGORIES)
        ]);

        return {
            projects: projects.map(p => `${p.id}: ${p.name}`).join("\n"),
            tags: tags.map(t => t.name).join(", "),
            activityCategories: activityCategories.map(c => `${c.id}: ${c.name}`).join("\n")
        };
    } catch (error) {
        console.error("Failed to fetch context data:", error);
        return { projects: "", tags: "", activityCategories: "" };
    }
}

export async function analyzeInboxItems(items: { id?: number; content: string }[]): Promise<AnalyzedTask[]> {
  const settings = await getAISettings();
  const activeConfig = settings.configs.find(c => c.id === settings.activeConfigId);

  if (!activeConfig) {
    throw new Error("No active LLM configuration found. Please configure AI settings.");
  }

  // Fetch context data
  const contextData = await getContextData();
  const currentDateTime = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });

  let systemPrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  
  // Inject context
  systemPrompt = systemPrompt
      .replace("{current_datetime}", currentDateTime)
      .replace("{available_projects}", contextData.projects || "无")
      .replace("{available_tags}", contextData.tags || "无")
      .replace("{available_activity_categories}", contextData.activityCategories || "无");

  const prompt = `Here are the inbox items to process:
${JSON.stringify(items.map(item => ({ originalId: item.id, content: item.content })))}

Please generate the task list JSON based on the rules.`;

  const startTime = Date.now();

  try {
    const response = await fetch(`${activeConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activeConfig.apiKey}`
      },
      body: JSON.stringify({
        model: activeConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: activeConfig.temperature ?? 0.7,
        stream: false
      })
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    // Log usage
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const inputCost = (usage.prompt_tokens / 1000000) * (activeConfig.inputPrice || 0);
    const outputCost = (usage.completion_tokens / 1000000) * (activeConfig.outputPrice || 0);
    const totalCost = inputCost + outputCost;

    const logEntry: LLMUsageLog = {
        model: activeConfig.name, // Use config name instead of model ID for display
        provider: activeConfig.provider,
        tokens: {
            prompt: usage.prompt_tokens,
            completion: usage.completion_tokens,
            total: usage.total_tokens
        },
        cost: totalCost,
        duration: duration,
        createdAt: new Date()
    };

    try {
        await add(ObjectStores.LLM_USAGE_LOGS, logEntry);

        // Update aggregated stats
        let stats = await get<LLMUsageStats>(ObjectStores.LLM_USAGE_STATS, 'global').catch(() => null);
        if (!stats) {
            stats = { id: 'global', totalCost: 0, totalCount: 0, updatedAt: new Date() };
            await add(ObjectStores.LLM_USAGE_STATS, stats);
        }
        
        stats.totalCost += totalCost;
        stats.totalCount += 1;
        stats.updatedAt = new Date();
        await update(ObjectStores.LLM_USAGE_STATS, stats);

        // Prune logs to keep only latest 50
        const allLogs = await getAll<LLMUsageLog>(ObjectStores.LLM_USAGE_LOGS);
        if (allLogs.length > 50) {
            const sortedLogs = allLogs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            const logsToDelete = sortedLogs.slice(0, allLogs.length - 50);
            await Promise.all(logsToDelete.map(log => remove(ObjectStores.LLM_USAGE_LOGS, log.id!)));
        }

    } catch (e) {
        console.error("Failed to save LLM usage log or update stats:", e);
    }

    if (!content) {
      throw new Error("No content received from LLM.");
    }

    // Attempt to extract JSON from the content (handling potential markdown code blocks)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;

    const parsedTasks = JSON.parse(jsonString);
    
    return parsedTasks.map((task: any, index: number) => ({
        ...task,
        originalContent: items.find(i => i.id === task.originalId)?.content || items[index]?.content || "",
        originalId: task.originalId 
    }));

  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw error;
  }
}
