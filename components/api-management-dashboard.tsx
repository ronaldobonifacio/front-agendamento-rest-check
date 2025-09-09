"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Play, Settings, MessageSquare, AlertCircle, Eye, EyeOff, Calendar } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { VisualScheduleModal } from "./visual-schedule-modal"

interface ApiHeader {
  key: string
  value: string
  enabled: boolean
}

interface ApiData {
  id?: string
  name: string
  type?: "API" | "PING" // Added type field for API or PING monitoring
  method: string
  url: string
  host?: string // Added host field for ping monitoring
  port?: number // Added port field for ping monitoring
  headers?: string
  body?: string
  cron: string
  enabled: boolean
  isOnline?: boolean
  responseTime?: number
  lastRun?: string
  scheduleGroupId?: string
}

interface ServiceState {
  isMessageSendingEnabled: boolean
  lastRunTimestamp: string
  lastRunStatus: string
  nextRunTimestamp: string
  lastFailedApis: string[]
  apis: ApiData[]
  notificationInterval: number
}

const MOCK_DATA: ServiceState = {
  isMessageSendingEnabled: true,
  lastRunTimestamp: "01/09/2025, 14:30:15",
  lastRunStatus: "✅ Todas as APIs estão operacionais.",
  nextRunTimestamp: "01/09/2025, 14:40:15",
  notificationInterval: 10,
  lastFailedApis: [],
  apis: [
    {
      id: "1",
      name: "API de Usuários",
      type: "API",
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/users",
      headers: '{"Content-Type": "application/json"}',
      body: "",
      cron: "*/10 * * * *",
      enabled: true,
      isOnline: true,
      responseTime: 245,
      lastRun: "01/09/2025, 14:30:15",
    },
    {
      id: "2",
      name: "API de Posts",
      type: "API",
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/posts",
      headers: '{"Content-Type": "application/json"}',
      body: "",
      cron: "*/5 * * * *",
      enabled: true,
      isOnline: false,
      responseTime: 1200,
      lastRun: "01/09/2025, 14:25:10",
    },
  ],
}

export default function ApiManagementDashboard() {
  const [serviceState, setServiceState] = useState<ServiceState>(MOCK_DATA)
  const [selectedApi, setSelectedApi] = useState<ApiData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const [authType, setAuthType] = useState<string>("none")
  const [apiKeyConfig, setApiKeyConfig] = useState({ key: "", value: "", addTo: "header" })
  const [bearerToken, setBearerToken] = useState("")
  const [basicAuth, setBasicAuth] = useState({ username: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)

  const [headers, setHeaders] = useState<ApiHeader[]>([
    { key: "Content-Type", value: "application/json", enabled: true },
    { key: "Cache-Control", value: "no-cache", enabled: false },
    { key: "User-Agent", value: "API-Monitor/1.0", enabled: true },
  ])

  const [formData, setFormData] = useState<ApiData>({
    name: "",
    type: "API", // Default to API type
    method: "GET",
    url: "",
    host: "", // Added host field
    port: undefined, // Added port field
    headers: "",
    body: "",
    cron: "*/10 * * * *",
    enabled: true,
  })

  const [scheduleGroups, setScheduleGroups] = useState<any[]>([])
  const [selectedScheduleGroupId, setSelectedScheduleGroupId] = useState<string | null>("none")

  // Adicione constantes para dias da semana
  const WEEK_DAYS = [
    { value: 0, label: "Domingo" },
    { value: 1, label: "Segunda" },
    { value: 2, label: "Terça" },
    { value: 3, label: "Quarta" },
    { value: 4, label: "Quinta" },
    { value: 5, label: "Sexta" },
    { value: 6, label: "Sábado" },
  ]

  // Novo estado para o calendário de agendamento
  const [schedule, setSchedule] = useState<{ [day: number]: string[] }>({
    1: ["08:00", "14:00"], // Segunda
    2: ["08:00", "14:00"], // Terça
    3: ["08:00", "14:00"], // Quarta
    4: ["08:00", "14:00"], // Quinta
    5: ["08:00", "14:00"], // Sexta
  })

  const [isVisualScheduleOpen, setIsVisualScheduleOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("headers")

  function generateCronsFromSchedule(schedule: { [day: number]: string[] }) {
    const crons: string[] = []
    Object.entries(schedule).forEach(([day, times]) => {
      times.forEach((time) => {
        const [hour, minute] = time.split(":")
        crons.push(`${minute} ${hour} * * ${day}`)
      })
    })
    return crons.join(";") // Backend expects semicolon-separated crons
  }

  const fetchStatus = async () => {
    try {
      const response = await fetch("http://localhost:8033/status")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      setServiceState(data)
      setIsConnected(true)
      setConnectionError(null)
    } catch (error) {
      console.log("[v0] Backend não conectado, usando dados mock:", error)
      setIsConnected(false)
      setConnectionError("Backend não conectado - usando dados de demonstração")
      setServiceState(MOCK_DATA)
    }
  }

  const toggleMessages = async () => {
    if (!isConnected) {
      setServiceState((prev) => ({
        ...prev,
        isMessageSendingEnabled: !prev.isMessageSendingEnabled,
      }))
      return
    }

    try {
      await fetch("http://localhost:8033/toggle-messages", { method: "POST" })
      fetchStatus()
    } catch (error) {
      console.error("Erro ao alternar mensagens:", error)
    }
  }

  const saveApi = async () => {
    try {
      if (formData.type === "PING") {
        if (!formData.host || !formData.port) {
          toast({
            title: "Erro de Validação",
            description: "Host e porta são obrigatórios para monitoramento de ping",
            variant: "destructive",
          })
          return
        }
      } else if (formData.type === "API") {
        if (!formData.url) {
          toast({
            title: "Erro de Validação",
            description: "URL é obrigatória para monitoramento de API",
            variant: "destructive",
          })
          return
        }
      }

      // Process authentication headers (only for API type)
      const authHeaders: { [key: string]: string } = {}

      if (formData.type === "API") {
        if (authType === "apikey" && apiKeyConfig.key && apiKeyConfig.value) {
          if (apiKeyConfig.addTo === "header") {
            authHeaders[apiKeyConfig.key] = apiKeyConfig.value
          }
        } else if (authType === "bearer" && bearerToken) {
          authHeaders["Authorization"] = `Bearer ${bearerToken}`
        } else if (authType === "basic" && basicAuth.username && basicAuth.password) {
          const credentials = btoa(`${basicAuth.username}:${basicAuth.password}`)
          authHeaders["Authorization"] = `Basic ${credentials}`
        }
      }

      // Combine regular headers with auth headers (only for API type)
      const regularHeaders =
        formData.type === "API"
          ? headers.filter((h) => h.enabled && h.key && h.value).reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {})
          : {}

      const allHeaders = { ...regularHeaders, ...authHeaders }

      // Prepare API data in backend format
      const apiData = {
        ...formData,
        id: selectedApi?.id, // Let backend generate ID if not provided
        headers: formData.type === "API" ? JSON.stringify(allHeaders) : undefined,
        body: formData.type === "API" ? formData.body || "" : undefined, // Only for API type
        cron: generateCronsFromSchedule(schedule), // Convert to backend format
        scheduleGroupId: selectedScheduleGroupId === "none" ? undefined : selectedScheduleGroupId,
      }

      if (isConnected) {
        const response = await fetch("http://localhost:8033/api/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiData),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        if (!result.ok) {
          throw new Error(result.error || "Erro ao salvar API")
        }

        fetchStatus()
        toast({ title: "Sucesso", description: "API salva com sucesso!", variant: "default" })
      } else {
        // Mock mode
        setServiceState((prev) => ({
          ...prev,
          apis: selectedApi
            ? prev.apis.map((api) => (api.id === selectedApi.id ? { ...apiData, id: selectedApi.id } : api))
            : [...prev.apis, { ...apiData, id: Date.now().toString() }],
        }))
        toast({ title: "Modo Demo", description: "API salva localmente (modo demonstração)", variant: "default" })
      }

      setIsEditing(false)
      setSelectedApi(null)
      resetForm()
    } catch (error) {
      console.error("Erro ao salvar API:", error)
      toast({ title: "Erro", description: "Falha ao salvar API: " + error.message, variant: "destructive" })
    }
  }

  const deleteApi = async (id: string) => {
    if (isConnected) {
      try {
        const response = await fetch("http://localhost:8033/api/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        if (!result.ok) {
          throw new Error(result.error || "Erro ao deletar API")
        }

        fetchStatus()
        toast({ title: "Sucesso", description: "API deletada com sucesso!", variant: "default" })
      } catch (error) {
        console.error("Erro ao deletar API:", error)
        toast({ title: "Erro", description: "Falha ao deletar API: " + error.message, variant: "destructive" })
      }
    } else {
      setServiceState((prev) => ({
        ...prev,
        apis: prev.apis.filter((api) => api.id !== id),
      }))
      toast({ title: "Modo Demo", description: "API deletada localmente (modo demonstração)", variant: "default" })
    }
  }

  const testApi = async (id: string) => {
    if (isConnected) {
      try {
        const response = await fetch("http://localhost:8033/api/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        if (result.ok) {
          const typeLabel = result.result.type === "PING" ? "Ping" : "API"
          toast({
            title: "Teste Concluído",
            description: `${result.result.api} (${typeLabel}): ${result.result.online ? "Online" : "Offline"} (${result.result.responseTime}ms)`,
            variant: result.result.online ? "default" : "destructive",
          })
        }

        setTimeout(fetchStatus, 2000)
      } catch (error) {
        console.error("Erro ao testar API:", error)
        toast({ title: "Erro", description: "Falha ao testar API: " + error.message, variant: "destructive" })
      }
    } else {
      setServiceState((prev) => ({
        ...prev,
        apis: prev.apis.map((api) =>
          api.id === id
            ? { ...api, isOnline: Math.random() > 0.3, responseTime: Math.floor(Math.random() * 1000) + 100 }
            : api,
        ),
      }))
    }
  }

  const testWhatsapp = async () => {
    try {
      const res = await fetch("http://localhost:8033/test-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "🚀 Teste de envio WhatsApp realizado via dashboard!" }),
      })
      const data = await res.json()
      if (data.ok) {
        toast({ title: "WhatsApp", description: "Mensagem de teste enviada com sucesso!", variant: "default" })
      } else {
        toast({ title: "WhatsApp", description: "Falha ao enviar mensagem de teste.", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "WhatsApp", description: "Erro ao enviar mensagem de teste.", variant: "destructive" })
    }
  }

  const sendWhatsappOffline = async () => {
    try {
      const res = await fetch("http://localhost:8033/send-whatsapp-offline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (data.ok && data.sent) {
        toast({ title: "WhatsApp", description: "Mensagem de rotas offline enviada com sucesso!", variant: "default" })
      } else {
        toast({
          title: "WhatsApp",
          description: data.message || "Nenhuma rota offline para enviar.",
          variant: "secondary",
        })
      }
    } catch (error) {
      toast({ title: "WhatsApp", description: "Erro ao enviar mensagem de rotas offline.", variant: "destructive" })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      type: "API",
      method: "GET",
      url: "",
      host: "",
      port: undefined,
      headers: "",
      body: "",
      cron: "*/10 * * * *",
      enabled: true,
    })
    setAuthType("none")
    setApiKeyConfig({ key: "", value: "", addTo: "header" })
    setBearerToken("")
    setBasicAuth({ username: "", password: "" })
    setHeaders([
      { key: "Content-Type", value: "application/json", enabled: true },
      { key: "Cache-Control", value: "no-cache", enabled: false },
      { key: "User-Agent", value: "API-Monitor/1.0", enabled: true },
    ])
    setSelectedScheduleGroupId("none")
    setSchedule({
      1: ["08:00", "14:00"],
      2: ["08:00", "14:00"],
      3: ["08:00", "14:00"],
      4: ["08:00", "14:00"],
      5: ["08:00", "14:00"],
    })
  }

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "", enabled: true }])
  }

  const updateHeader = (index: number, field: keyof ApiHeader, value: string | boolean) => {
    const newHeaders = [...headers]
    newHeaders[index] = { ...newHeaders[index], [field]: value }
    setHeaders(newHeaders)
  }

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  const editApi = (api: ApiData) => {
    setSelectedApi(api)
    setFormData(api)
    setIsEditing(true)

    // Parse headers and detect authentication
    if (api.headers) {
      try {
        const parsedHeaders = JSON.parse(api.headers)

        // Detect auth type from headers
        if (parsedHeaders.Authorization) {
          const authHeader = parsedHeaders.Authorization
          if (authHeader.startsWith("Bearer ")) {
            setAuthType("bearer")
            setBearerToken(authHeader.substring(7))
            delete parsedHeaders.Authorization // Remove from regular headers
          } else if (authHeader.startsWith("Basic ")) {
            setAuthType("basic")
            try {
              const credentials = atob(authHeader.substring(6))
              const [username, password] = credentials.split(":")
              setBasicAuth({ username, password })
            } catch (e) {
              console.warn("Could not decode basic auth credentials")
            }
            delete parsedHeaders.Authorization // Remove from regular headers
          }
        } else {
          // Check for API key patterns
          const possibleApiKeys = ["X-API-Key", "ApiKey", "api-key", "Authorization"]
          let foundApiKey = false

          for (const key of possibleApiKeys) {
            if (
              parsedHeaders[key] &&
              !parsedHeaders[key].startsWith("Bearer ") &&
              !parsedHeaders[key].startsWith("Basic ")
            ) {
              setAuthType("apikey")
              setApiKeyConfig({ key, value: parsedHeaders[key], addTo: "header" })
              delete parsedHeaders[key] // Remove from regular headers
              foundApiKey = true
              break
            }
          }

          if (!foundApiKey) {
            setAuthType("none")
          }
        }

        // Convert remaining headers to array format
        const headerArray = Object.entries(parsedHeaders).map(([key, value]) => ({
          key,
          value: value as string,
          enabled: true,
        }))
        setHeaders(headerArray)
      } catch (e) {
        console.error("Erro ao parsear headers:", e)
        setAuthType("none")
      }
    }

    // Parse cron format (backend uses semicolon-separated crons)
    if (api.cron && api.cron.includes(";")) {
      // Convert backend cron format back to schedule
      const crons = api.cron.split(";")
      const newSchedule: { [day: number]: string[] } = {}

      crons.forEach((cronExp) => {
        const parts = cronExp.trim().split(" ")
        if (parts.length >= 5) {
          const minute = parts[0]
          const hour = parts[1]
          const dayOfWeek = parts[4]

          if (!isNaN(Number.parseInt(dayOfWeek))) {
            const day = Number.parseInt(dayOfWeek)
            const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`

            if (!newSchedule[day]) {
              newSchedule[day] = []
            }
            newSchedule[day].push(time)
          }
        }
      })

      setSchedule(newSchedule)
    }

    setSelectedScheduleGroupId(api.scheduleGroupId || "none")
  }

  const handleAuthTypeChange = (newAuthType: string) => {
    setAuthType(newAuthType)
    // Clear all auth fields when changing type
    setApiKeyConfig({ key: "", value: "", addTo: "header" })
    setBearerToken("")
    setBasicAuth({ username: "", password: "" })
  }

  const handleBasicAuthChange = (field: "username" | "password", value: string) => {
    const newBasicAuth = { ...basicAuth, [field]: value }
    setBasicAuth(newBasicAuth)
  }

  const fetchScheduleGroups = async () => {
    try {
      const res = await fetch("http://localhost:8033/schedule-group/list")
      const data = await res.json()
      setScheduleGroups(data.groups || [])
    } catch (error) {
      setScheduleGroups([])
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchScheduleGroups()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gerenciador de APIs</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-yellow-400"}`} />
              <span className="text-sm">{isConnected ? "Conectado" : "Modo Demo"}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={toggleMessages} className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {serviceState.isMessageSendingEnabled ? "Desabilitar" : "Habilitar"} WhatsApp
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              Nova API
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={testWhatsapp}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <MessageSquare className="w-4 h-4" />
              Testar WhatsApp
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={sendWhatsappOffline}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
            >
              <MessageSquare className="w-4 h-4" />
              Enviar Offline WhatsApp
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {connectionError && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="flex items-center gap-2 p-4">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-yellow-800 font-medium">Modo Demonstração</p>
                <p className="text-yellow-700 text-sm">
                  Para conectar ao backend real, certifique-se de que o servidor Node.js esteja rodando em
                  localhost:8033
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Última Verificação</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{serviceState.lastRunTimestamp}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Próxima Verificação</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{serviceState.nextRunTimestamp}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{serviceState.lastRunStatus}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={serviceState.isMessageSendingEnabled ? "default" : "secondary"}>
                {serviceState.isMessageSendingEnabled ? "Ativo" : "Inativo"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* API List */}
        <Card>
          <CardHeader>
            <CardTitle>APIs Monitoradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceState.apis.map((api) => (
                <div key={api.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${api.isOnline ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-xs text-muted-foreground">
                      {api.type === "PING" ? "📡" : "🌐"} {api.type || "API"}
                    </span>
                    <Badge variant={api.method === "GET" ? "default" : "secondary"}>{api.method}</Badge>
                    <div>
                      <h3 className="font-semibold">{api.name}</h3>
                      <p className="text-sm text-gray-600">{api.url}</p>
                      {api.lastRun && (
                        <p className="text-xs text-gray-500">
                          Última execução: {api.lastRun}
                          {api.responseTime && ` (${api.responseTime}ms)`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={api.isOnline ? "default" : "destructive"}>
                      {api.isOnline ? "Online" : "Offline"}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => testApi(api.id!)}>
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => editApi(api)}>
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteApi(api.id!)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* API Editor Dialog */}
        {isEditing && (
          <Dialog
            open={isEditing}
            onOpenChange={(open) => {
              if (!open) {
                setIsEditing(false)
                resetForm()
              }
            }}
          >
            <DialogContent className="w-[80vw] h-[80vh] min-w-[80vw] min-h-[80vh] max-w-none max-h-none overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedApi ? "Editar API" : "Nova API"}</DialogTitle>
                <DialogDescription>Configure os dados da API e o agendamento.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome da API</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: API de Usuários"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Tipo de Monitoramento</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "API" | "PING") => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        <SelectItem value="API">API REST</SelectItem>
                        <SelectItem value="PING">Ping (TCP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.type === "API" ? (
                  <>
                    {/* Request Configuration for API */}
                    <div className="flex gap-2">
                      <Select
                        value={formData.method}
                        onValueChange={(value) => setFormData({ ...formData, method: value })}
                      >
                        <SelectTrigger className="w-32 bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        className="flex-1"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        placeholder="https://api.exemplo.com/endpoint"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Ping Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="host">Host/IP</Label>
                        <Input
                          id="host"
                          value={formData.host || ""}
                          onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                          placeholder="exemplo.com ou 192.168.1.1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="port">Porta</Label>
                        <Input
                          id="port"
                          type="number"
                          min="1"
                          max="65535"
                          value={formData.port || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, port: Number.parseInt(e.target.value) || undefined })
                          }
                          placeholder="80, 443, 3306, etc."
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label htmlFor="cron">Agendamento (Cron)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsVisualScheduleOpen(true)}
                      className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Visual
                    </Button>
                  </div>
                  <Input
                    id="cron"
                    value={formData.cron}
                    onChange={(e) => setFormData({ ...formData, cron: e.target.value })}
                    placeholder="*/10 * * * * (a cada 10 minutos)"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use o botão "Visual" para configurar horários específicos ou digite uma expressão cron manualmente
                  </p>
                </div>

                {/* Grupo de Agendamento */}
                <div>
                  <Label>Grupo de Agendamento</Label>
                  <Select
                    value={selectedScheduleGroupId || "none"}
                    onValueChange={(value) => setSelectedScheduleGroupId(value === "none" ? null : value)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione um grupo de agendamento" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      {scheduleGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="none">Nenhum grupo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === "API" && (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="headers">Headers</TabsTrigger>
                      <TabsTrigger value="authorization">Authorization</TabsTrigger>
                      <TabsTrigger value="body">Body</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="headers" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Headers</h3>
                        <Button variant="outline" size="sm" onClick={addHeader}>
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Header
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {headers.map((header, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Switch
                              checked={header.enabled}
                              onCheckedChange={(checked) => updateHeader(index, "enabled", checked)}
                            />
                            <Input
                              placeholder="Key"
                              value={header.key}
                              onChange={(e) => updateHeader(index, "key", e.target.value)}
                              className="flex-1"
                            />
                            <Input
                              placeholder="Value"
                              value={header.value}
                              onChange={(e) => updateHeader(index, "value", e.target.value)}
                              className="flex-1"
                            />
                            <Button variant="outline" size="sm" onClick={() => removeHeader(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="authorization" className="space-y-4">
                      <div>
                        <Label>Auth Type</Label>
                        <Select value={authType} onValueChange={handleAuthTypeChange}>
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-border">
                            <SelectItem value="none">No Auth</SelectItem>
                            <SelectItem value="apikey">API Key</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="basic">Basic Auth</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {authType === "none" && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl">🔓</span>
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Auth</h3>
                          <p className="text-sm text-gray-500">This request does not use any authorization.</p>
                        </div>
                      )}

                      {authType === "apikey" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="apikey-key">Key</Label>
                              <Input
                                id="apikey-key"
                                value={apiKeyConfig.key}
                                onChange={(e) => setApiKeyConfig({ ...apiKeyConfig, key: e.target.value })}
                                placeholder="X-API-Key"
                              />
                            </div>
                            <div>
                              <Label htmlFor="apikey-value">Value</Label>
                              <div className="relative">
                                <Input
                                  id="apikey-value"
                                  type={showPassword ? "text" : "password"}
                                  value={apiKeyConfig.value}
                                  onChange={(e) => setApiKeyConfig({ ...apiKeyConfig, value: e.target.value })}
                                  placeholder="Enter API key value"
                                  className="pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label>Add to</Label>
                            <Select
                              value={apiKeyConfig.addTo}
                              onValueChange={(value) => setApiKeyConfig({ ...apiKeyConfig, addTo: value })}
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-background border-border">
                                <SelectItem value="header">Header</SelectItem>
                                <SelectItem value="query">Query Params</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                              The authorization header will be automatically generated when you send the request. Learn
                              more about <span className="underline cursor-pointer">API Key</span> authorization.
                            </p>
                          </div>
                        </div>
                      )}

                      {authType === "bearer" && (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="bearer-token">Token</Label>
                            <div className="relative">
                              <Input
                                id="bearer-token"
                                type={showPassword ? "text" : "password"}
                                value={bearerToken}
                                onChange={(e) => setBearerToken(e.target.value)}
                                placeholder="Enter bearer token"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                              The authorization header will be automatically generated when you send the request. Learn
                              more about <span className="underline cursor-pointer">Bearer Token</span> authorization.
                            </p>
                          </div>
                        </div>
                      )}

                      {authType === "basic" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="username">Username</Label>
                              <Input
                                id="username"
                                value={basicAuth.username}
                                onChange={(e) => setBasicAuth({ ...basicAuth, username: e.target.value })}
                                placeholder="Enter username"
                              />
                            </div>
                            <div>
                              <Label htmlFor="password">Password</Label>
                              <div className="relative">
                                <Input
                                  id="password"
                                  type={showPassword ? "text" : "password"}
                                  value={basicAuth.password}
                                  onChange={(e) => setBasicAuth({ ...basicAuth, password: e.target.value })}
                                  placeholder="Enter password"
                                  className="pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                              <strong>
                                The authorization header will be automatically generated when you send the request.
                              </strong>
                              {basicAuth.username && basicAuth.password && (
                                <span className="block mt-1 text-xs text-blue-600">
                                  Learn more about <span className="underline cursor-pointer">Basic Auth</span>{" "}
                                  authorization
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="body" className="space-y-4">
                      <div>
                        <Label htmlFor="body">Request Body (JSON)</Label>
                        <Textarea
                          id="body"
                          value={formData.body}
                          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                          placeholder='{"key": "value"}'
                          rows={8}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="enabled"
                          checked={formData.enabled}
                          onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                        />
                        <Label htmlFor="enabled">API Habilitada</Label>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}

                {/* Actions */}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      resetForm()
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={saveApi} className="bg-primary">
                    {selectedApi ? "Atualizar" : "Salvar"} API
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <VisualScheduleModal
          isOpen={isVisualScheduleOpen}
          onClose={() => setIsVisualScheduleOpen(false)}
          schedule={schedule}
          onScheduleChange={setSchedule}
          onScheduleSave={(cronExpression) => {
            setFormData({ ...formData, cron: cronExpression })
          }}
        />
      </div>
    </div>
  )
}
