"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, Activity, MessageSquare, Play, LogOut, Plus, RefreshCw, Info } from "lucide-react"

interface ApiStatus {
  name: string
  isOnline: boolean
}

interface DashboardData {
  lastRunTimestamp: string
  nextRunTimestamp: string
  lastRunStatus: string
  isMessageSendingEnabled: boolean
  apis: ApiStatus[]
}

export function ResourceDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    lastRunTimestamp: "Carregando...",
    nextRunTimestamp: "Carregando...",
    lastRunStatus: "Carregando...",
    isMessageSendingEnabled: false,
    apis: [],
  })

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchStatus = async () => {
    try {
      const mockData: DashboardData = {
        lastRunTimestamp: "01/09/2025, 11:55:37",
        nextRunTimestamp: "01/09/2025, 12:00:00",
        lastRunStatus: "Sucesso - Todas as APIs responderam",
        isMessageSendingEnabled: true,
        apis: [
          { name: "API Principal", isOnline: true },
          { name: "API Secundária", isOnline: true },
          { name: "API de Backup", isOnline: false },
          { name: "API de Logs", isOnline: true },
          { name: "API de Notificações", isOnline: true },
          { name: "API de Relatórios", isOnline: false },
        ],
      }
      setDashboardData(mockData)
    } catch (error) {
      console.error("Erro ao buscar status:", error)
    }
  }

  const toggleMessages = async () => {
    try {
      setDashboardData((prev) => ({
        ...prev,
        isMessageSendingEnabled: !prev.isMessageSendingEnabled,
      }))
    } catch (error) {
      console.error("Erro ao alternar envio de mensagens:", error)
    }
  }

  const runTest = async () => {
    try {
      await fetchStatus()
    } catch (error) {
      console.error("Erro ao executar teste manual:", error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Gerenciador de Recursos</h1>
          <div className="flex items-center gap-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/diverse-user-avatars.png" />
              <AvatarFallback>RC</AvatarFallback>
            </Avatar>
            <span className="text-sm">Ronaldo Correia</span>
            <Button variant="destructive" size="sm" className="bg-destructive hover:bg-destructive/90">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
            <Button variant="secondary" size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
            <Button size="sm" className="bg-chart-4 hover:bg-chart-4/90 text-foreground">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar PRs
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <h1 className="text-3xl font-bold text-foreground border-b-2 border-border pb-2">
          Dashboard Avançado de Monitoramento
        </h1>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-primary bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Última Verificação</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-foreground">{dashboardData.lastRunTimestamp}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Próxima Verificação</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-foreground">{dashboardData.nextRunTimestamp}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status da Última Verificação</CardTitle>
              <Info className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-foreground break-words">{dashboardData.lastRunStatus}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Envio de Mensagens</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <span className="text-sm">Status:</span>
                <span
                  className={`font-bold ${dashboardData.isMessageSendingEnabled ? "text-accent" : "text-destructive"}`}
                >
                  {dashboardData.isMessageSendingEnabled ? "Ativado" : "Desativado"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schedule Info */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle>Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Execução do Monitor:</strong> Seg-Sex (24h), Sáb (até 20:00)
            </p>
            <p>
              <strong>Janela de Envio de Alertas:</strong> Seg-Sex (08-12h, 14-22h), Sáb (08-12:40h)
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Button onClick={toggleMessages} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {dashboardData.isMessageSendingEnabled ? "Desativar Envios" : "Ativar Envios"}
          </Button>
          <Button onClick={runTest} className="bg-primary hover:bg-primary/90">
            <Play className="h-4 w-4 mr-2" />
            Testar Agora
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboardData.apis.map((api, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 rounded-lg border-l-4 bg-muted/50 ${
                api.isOnline ? "border-l-accent" : "border-l-destructive"
              }`}
            >
              <span className="font-medium text-foreground">{api.name}</span>
              <span className={`font-bold ${api.isOnline ? "text-accent" : "text-destructive"}`}>
                {api.isOnline ? "ON" : "OFF"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
