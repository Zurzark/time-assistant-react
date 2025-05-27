
Ran tool

Ran tool

Read file: components/pomodoro/pomodoro-card.tsx

Read file: components/pomodoro/pomodoro-view.tsx

Read file: components/pomodoro/pomodoro-modal.tsx

Read file: components/pomodoro/pomodoro-context.tsx

Read file: components/pomodoro/pomodoro-view.tsx

Read file: components/pomodoro/pomodoro-card.tsx

Read file: components/pomodoro/pomodoro-modal.tsx

Read file: components/pomodoro/pomodoro-context.tsx

Read file: components/pomodoro/pomodoro-card.tsx

Read file: components/pomodoro/pomodoro-view.tsx

Read file: components/pomodoro/pomodoro-modal.tsx

Read file: components/pomodoro/pomodoro-context.tsx

Read file: components/pomodoro/pomodoro-view.tsx

Read file: components/pomodoro/pomodoro-card.tsx

Read file: components/pomodoro/pomodoro-modal.tsx

Read file: components/pomodoro/pomodoro-context.tsx

Read file: components/pomodoro/pomodoro-card.tsx

Read file: components/pomodoro/pomodoro-view.tsx

Read file: components/pomodoro/pomodoro-card.tsx

Read file: components/pomodoro/pomodoro-view.tsx

Read file: components/pomodoro/pomodoro-modal.tsx

Read file: components/pomodoro/pomodoro-context.tsx

Read file: components/pomodoro/pomodoro-card.tsx

Read file: components/pomodoro/pomodoro-view.tsx




Ran tool

Ran tool

Ran tool

Read file: app/pomodoro/page.tsx

Read file: components/pomodoro/pomodoro-modal.tsx

Read file: components/pomodoro/pomodoro-view.tsx

Read file: components/pomodoro/pomodoro-context.tsx

Read file: components/pomodoro/pomodoro-card.tsx

Read file: components/pomodoro/pomodoro-modal.tsx

Read file: components/pomodoro/pomodoro-card.tsx

Read file: components/pomodoro/pomodoro-view.tsx

Read file: components/pomodoro/pomodoro-context.tsx

Read file: components/pomodoro/pomodoro-modal.tsx

Read file: components/pomodoro/pomodoro-view.tsx

Read file: components/pomodoro/pomodoro-context.tsx

Read file: components/pomodoro/pomodoro-card.tsx

Read file: components/pomodoro/pomodoro-modal.tsx

Read file: components/pomodoro/pomodoro-context.tsx

Read file: components/pomodoro/pomodoro-card.tsx

Read file: components/pomodoro/pomodoro-view.tsx
根据你项目 `components/pomodoro` 目录下的文件和代码分析，目前番茄钟相关的核心组件有如下四个，分别作用如下：

---

### 1. `pomodoro-context.tsx`
**作用：**
- 提供全局番茄钟状态管理（如当前计时、模式、是否激活、选中任务等）。
- 状态持久化到 localStorage，保证页面切换、刷新时状态不丢失。
- 通过 React Context 实现全局唯一番茄钟实例，所有番茄钟相关组件都可共享和操作同一份状态。

---

### 2. `pomodoro-modal.tsx`
**作用：**
- 全局弹窗式番茄钟主控组件，配合 `PomodoroContext` 实现全局唯一、状态持久化。
- 支持最小化、任务选择、音效、关闭确认等功能。
- 适合在全局范围内随时弹出，进行番茄钟专注计时。
- 内部包含番茄钟的完整交互逻辑（开始/暂停/重置/跳过/完成/音效/动画等）。

---

### 3. `pomodoro-card.tsx`
**作用：**
- 卡片式番茄钟组件，适合嵌入到页面的某个区域（如任务列表旁边）。
- 支持选择任务、计时、音效、动画等功能，逻辑与 `pomodoro-modal` 类似，但更适合局部展示。
- 适合在任务详情页、仪表盘等场景下使用。

---

### 4. `pomodoro-view.tsx`
**作用：**
- 番茄钟主页面组件，通常作为 `/pomodoro` 路由的主内容。
- 负责整合番茄钟计时、历史记录、设置面板等多个功能区块。
- 通过 `PomodoroView` 组件，用户可以在主页面直接进行番茄钟操作、查看历史、调整设置等。

---

#### 关系说明
- `pomodoro-context.tsx` 提供全局状态，`pomodoro-modal.tsx` 和 `pomodoro-card.tsx` 都会用到它。
- `pomodoro-view.tsx` 作为主页面，可能会组合使用 `pomodoro-card` 或直接集成番茄钟核心逻辑。
- `pomodoro-modal.tsx` 适合全局弹窗，`pomodoro-card.tsx` 适合页面内嵌，二者功能类似但场景不同。

---

如需详细了解每个组件的具体 props、方法或内部结构，可进一步查看对应文件的实现。

请确认以上梳理是否满足你的需求，或是否需要对某个组件做更详细的说明？
