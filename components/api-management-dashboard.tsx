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
  method: string
  url: string
  headers?: string
  body?: string
  cron: string
  enabled: boolean
  isOnline?: boolean
  responseTime?: number
  lastRun?: string
  scheduleGroupId?: string
  schedule?: { [day: number]: string[] }
}

interface ServiceState {
  isMessageSendingEnabled: boolean
  lastRunTimestamp: string
  lastRunStatus: string
  nextRunTimestamp: string
  lastFailedApis: string[]
  apis: ApiData[]
}

const MOCK_DATA: ServiceState = {
  isMessageSendingEnabled: true,
  lastRunTimestamp: "01/09/2025, 14:30:15",
  lastRunStatus: "✅ Todas as APIs estão operacionais.",
  nextRunTimestamp: "01/09/2025, 14:40:15",
  lastFailedApis: [],
  apis: [
    {
      id: "1",
      name: "API de Usuários",
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
  const [basicAuth, setBasicAuth] = useState({ username: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)

  const [headers, setHeaders] = useState<ApiHeader[]>([
    { key: "Content-Type", value: "application/json", enabled: true },
    { key: "Cache-Control", value: "no-cache", enabled: false },
    { key: "User-Agent", value: "API-Monitor/1.0", enabled: true },
  ])

  const [formData, setFormData] = useState<ApiData>({
    name: "",
    method: "GET",
    url: "",
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

  // Função para gerar crons do calendário
  function generateCronsFromSchedule(schedule: { [day: number]: string[] }) {
    const crons: string[] = []
    Object.entries(schedule).forEach(([day, times]) => {
      times.forEach((time) => {
        const [hour, minute] = time.split(":")
        crons.push(`${minute} ${hour} * * ${day}`)
      })
    })
    return crons
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
      const headersObj = headers
        .filter((h) => h.enabled && h.key && h.value)
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {})

      const apiData = {
        ...formData,
        id: selectedApi?.id || Date.now().toString(),
        headers: JSON.stringify(headersObj),
        scheduleGroupId: selectedScheduleGroupId,
        cron: generateCronsFromSchedule(schedule).join(";"),
        schedule, // salva o calendário completo
      }

      if (isConnected) {
        await fetch("http://localhost:8033/api/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiData),
        })
        fetchStatus()
      } else {
        setServiceState((prev) => ({
          ...prev,
          apis: selectedApi
            ? prev.apis.map((api) => (api.id === selectedApi.id ? { ...apiData, scheduleGroupId: apiData.scheduleGroupId ?? undefined } : api))
            : [...prev.apis, { ...apiData, scheduleGroupId: apiData.scheduleGroupId ?? undefined }],
        }))
      }

      setIsEditing(false)
      setSelectedApi(null)
      resetForm()
    } catch (error) {
      console.error("Erro ao salvar API:", error)
    }
  }

  const deleteApi = async (id: string) => {
    if (isConnected) {
      try {
        await fetch("http://localhost:8033/api/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        })
        fetchStatus()
      } catch (error) {
        console.error("Erro ao deletar API:", error)
      }
    } else {
      setServiceState((prev) => ({
        ...prev,
        apis: prev.apis.filter((api) => api.id !== id),
      }))
    }
  }

  const testApi = async (id: string) => {
    if (isConnected) {
      try {
        await fetch("http://localhost:8033/api/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        })
        setTimeout(fetchStatus, 2000)
      } catch (error) {
        console.error("Erro ao testar API:", error)
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
          variant: "default",
        })
      }
    } catch (error) {
      toast({ title: "WhatsApp", description: "Erro ao enviar mensagem de rotas offline.", variant: "destructive" })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      method: "GET",
      url: "",
      headers: "",
      body: "",
      cron: "*/10 * * * *",
      enabled: true,
    })
    setAuthType("none")
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

    if (api.headers) {
      try {
        const parsedHeaders = JSON.parse(api.headers)
        const headerArray = Object.entries(parsedHeaders).map(([key, value]) => ({
          key,
          value: value as string,
          enabled: true,
        }))
        setHeaders(headerArray)
      } catch (e) {
        console.error("Erro ao parsear headers:", e)
      }
    }

    setSelectedScheduleGroupId(api.scheduleGroupId || "none")
    setSchedule(
      api.schedule || {
        1: ["08:00", "14:00"],
        2: ["08:00", "14:00"],
        3: ["08:00", "14:00"],
        4: ["08:00", "14:00"],
        5: ["08:00", "14:00"],
      },
    )
  }

  const handleAuthTypeChange = (newAuthType: string) => {
    setAuthType(newAuthType)

    // Remove existing Authorization header
    const filteredHeaders = headers.filter((h) => h.key !== "Authorization")

    if (newAuthType === "basic" && basicAuth.username && basicAuth.password) {
      // Add Authorization header for Basic Auth
      const credentials = btoa(`${basicAuth.username}:${basicAuth.password}`)
      setHeaders([{ key: "Authorization", value: `Basic ${credentials}`, enabled: true }, ...filteredHeaders])
    } else {
      setHeaders(filteredHeaders)
    }
  }

  const handleBasicAuthChange = (field: "username" | "password", value: string) => {
    const newBasicAuth = { ...basicAuth, [field]: value }
    setBasicAuth(newBasicAuth)

    if (authType === "basic" && newBasicAuth.username && newBasicAuth.password) {
      const credentials = btoa(`${newBasicAuth.username}:${newBasicAuth.password}`)
      const filteredHeaders = headers.filter((h) => h.key !== "Authorization")
      setHeaders([{ key: "Authorization", value: `Basic ${credentials}`, enabled: true }, ...filteredHeaders])
    }
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
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
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
                </div>

                {/* Request Configuration */}
                <div className="flex gap-2">
                  <Select
                    value={formData.method}
                    onValueChange={(value) => setFormData({ ...formData, method: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um grupo de agendamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="none">Nenhum grupo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tabs para configuração detalhada */}
                <Tabs defaultValue="headers" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="headers">Headers</TabsTrigger>
                    <TabsTrigger value="auth">Authorization</TabsTrigger>
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

                  <TabsContent value="auth" className="space-y-4">
                    <div>
                      <Label>Auth Type</Label>
                      <Select value={authType} onValueChange={handleAuthTypeChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Auth</SelectItem>
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

                    {authType === "basic" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="username">Username</Label>
                            <Input
                              id="username"
                              value={basicAuth.username}
                              onChange={(e) => handleBasicAuthChange("username", e.target.value)}
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
                                onChange={(e) => handleBasicAuthChange("password", e.target.value)}
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
