"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface NotificationSettingsProps {
  interval: number;
  onIntervalChange: (interval: number) => void;
  isConnected: boolean;
}

export function NotificationSettings({ interval, onIntervalChange, isConnected }: NotificationSettingsProps) {
  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle>Configurações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Intervalo de Notificação</h3>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="1"
              max="60"
              value={interval}
              onChange={(e) => onIntervalChange(parseInt(e.target.value))}
              disabled={!isConnected}
              className="w-20 px-2 py-1 border rounded bg-background"
            />
            <span className="text-sm text-muted-foreground">minutos</span>
            {!isConnected && (
              <span className="text-sm text-destructive">(Desconectado do backend)</span>
            )}
          </div>
        </div>
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-2">Agendamentos</h3>
          <p>
            <strong>Execução do Monitor:</strong> Seg-Sex (24h), Sáb (até 20:00)
          </p>
          <p>
            <strong>Janela de Envio de Alertas:</strong> Seg-Sex (08-12h, 14-22h), Sáb (08-12:40h)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}