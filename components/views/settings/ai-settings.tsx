
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Loader2, Plus, Trash2, Check, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { getAISettings, saveAISettings, AISettings, LLMConfig } from "@/lib/llm-service"

export function AISettingsPanel() {
  const [settings, setSettings] = useState<AISettings>({ configs: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form State for new/editing config
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null)
  const [configForm, setConfigForm] = useState<Partial<LLMConfig>>({})

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const data = await getAISettings()
      setSettings(data)
    } catch (e) {
      console.error("Failed to load AI settings", e)
      toast.error("加载 AI 设置失败")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async (newSettings: AISettings) => {
    setIsSaving(true)
    try {
      await saveAISettings(newSettings)
      setSettings(newSettings)
      toast.success("设置已保存")
    } catch (e) {
      console.error("Failed to save AI settings", e)
      toast.error("保存设置失败")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddConfig = () => {
    setEditingConfigId("new")
    setConfigForm({
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      temperature: 0.7
    })
  }

  const handleEditConfig = (config: LLMConfig) => {
    setEditingConfigId(config.id)
    setConfigForm({ ...config })
  }

  const handleDeleteConfig = async (id: string) => {
    const newConfigs = settings.configs.filter(c => c.id !== id)
    const newSettings = {
      ...settings,
      configs: newConfigs,
      activeConfigId: settings.activeConfigId === id ? undefined : settings.activeConfigId
    }
    await handleSaveSettings(newSettings)
  }

  const handleSaveConfigForm = async () => {
    if (!configForm.name || !configForm.baseUrl || !configForm.apiKey || !configForm.model) {
      toast.error("请填写所有必填字段")
      return
    }

    const newConfig: LLMConfig = {
      id: editingConfigId === "new" ? crypto.randomUUID() : editingConfigId!,
      name: configForm.name!,
      provider: configForm.provider as "openai" | "custom" || "openai",
      baseUrl: configForm.baseUrl!,
      apiKey: configForm.apiKey!,
      model: configForm.model!,
      temperature: configForm.temperature,
      inputPrice: configForm.inputPrice,
      outputPrice: configForm.outputPrice
    }

    let newConfigs = [...settings.configs]
    if (editingConfigId === "new") {
      newConfigs.push(newConfig)
    } else {
      newConfigs = newConfigs.map(c => c.id === editingConfigId ? newConfig : c)
    }

    // If it's the first config, make it active automatically
    let activeConfigId = settings.activeConfigId
    if (!activeConfigId && newConfigs.length > 0) {
        activeConfigId = newConfig.id
    }

    await handleSaveSettings({
      ...settings,
      configs: newConfigs,
      activeConfigId
    })
    
    setEditingConfigId(null)
    setConfigForm({})
  }

  const handleSetActive = async (id: string) => {
    await handleSaveSettings({
      ...settings,
      activeConfigId: id
    })
  }
  
  const handleSystemPromptChange = (value: string) => {
      setSettings(prev => ({ ...prev, systemPrompt: value }))
  }
  
  const handleSaveSystemPrompt = async () => {
      await handleSaveSettings(settings)
  }

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h3 className="text-lg font-medium">LLM 接口配置</h3>
        <p className="text-sm text-muted-foreground">配置用于 AI 解析的大语言模型接口。</p>
      </div>

      {settings.configs.length > 0 ? (
        <div className="grid gap-4">
          {settings.configs.map(config => (
            <Card key={config.id} className={settings.activeConfigId === config.id ? "border-primary" : ""}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                        checked={settings.activeConfigId === config.id}
                        onCheckedChange={() => handleSetActive(config.id)}
                    />
                    <Label>启用</Label>
                  </div>
                  <div>
                    <h4 className="font-medium">{config.name}</h4>
                    <p className="text-xs text-muted-foreground">{config.model} ({config.baseUrl})</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditConfig(config)}>
                    <Check className="h-4 w-4" /> {/* Reuse Check icon as Edit icon looks cleaner or just use text */}
                    <span className="sr-only">编辑</span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                    </svg>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteConfig(config.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
          暂无配置，请添加 LLM 接口。
        </div>
      )}

      {editingConfigId ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingConfigId === "new" ? "添加接口" : "编辑接口"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>配置名称</Label>
              <Input 
                value={configForm.name || ""} 
                onChange={e => setConfigForm({...configForm, name: e.target.value})}
                placeholder="例如: DeepSeek, OpenAI" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>API Base URL</Label>
                    <Input 
                        value={configForm.baseUrl || ""} 
                        onChange={e => setConfigForm({...configForm, baseUrl: e.target.value})}
                        placeholder="https://api.openai.com/v1" 
                    />
                </div>
                <div className="grid gap-2">
                    <Label>API Key</Label>
                    <Input 
                        type="password"
                        value={configForm.apiKey || ""} 
                        onChange={e => setConfigForm({...configForm, apiKey: e.target.value})}
                        placeholder="sk-..." 
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>模型名称 (Model)</Label>
                    <Input 
                        value={configForm.model || ""} 
                        onChange={e => setConfigForm({...configForm, model: e.target.value})}
                        placeholder="gpt-3.5-turbo, deepseek-chat" 
                    />
                </div>
                <div className="grid gap-2">
                    <Label>温度 (Temperature)</Label>
                    <Input 
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={configForm.temperature ?? 0.7} 
                        onChange={e => setConfigForm({...configForm, temperature: parseFloat(e.target.value)})}
                    />
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>输入价格 (CNY/1M tokens)</Label>
                    <Input 
                        type="number"
                        step="0.01"
                        value={configForm.inputPrice ?? ""} 
                        onChange={e => setConfigForm({...configForm, inputPrice: parseFloat(e.target.value)})}
                        placeholder="可选" 
                    />
                </div>
                <div className="grid gap-2">
                    <Label>输出价格 (CNY/1M tokens)</Label>
                    <Input 
                        type="number"
                        step="0.01"
                        value={configForm.outputPrice ?? ""} 
                        onChange={e => setConfigForm({...configForm, outputPrice: parseFloat(e.target.value)})}
                        placeholder="可选" 
                    />
                </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => { setEditingConfigId(null); setConfigForm({}); }}>取消</Button>
            <Button onClick={handleSaveConfigForm}>保存</Button>
          </CardFooter>
        </Card>
      ) : (
        <Button onClick={handleAddConfig} className="w-full">
          <Plus className="mr-2 h-4 w-4" /> 添加 LLM 接口
        </Button>
      )}

      <Separator />

      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <h3 className="text-lg font-medium">Prompt 设置</h3>
          <p className="text-sm text-muted-foreground">自定义 AI 解析时使用的系统提示词 (System Prompt)。</p>
        </div>
        
        <div className="grid gap-2">
            <Label>系统提示词</Label>
            <Textarea 
                value={settings.systemPrompt || ""}
                onChange={e => handleSystemPromptChange(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder="输入系统提示词..."
            />
            <div className="flex justify-end">
                <Button onClick={handleSaveSystemPrompt} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    保存 Prompt 设置
                </Button>
            </div>
        </div>
      </div>
    </div>
  )
}
