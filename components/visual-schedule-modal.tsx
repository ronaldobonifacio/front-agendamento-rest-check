"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Plus, X, Timer } from "lucide-react"

interface VisualScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  schedule: { [day: number]: string[] }
  onScheduleChange: (schedule: { [day: number]: string[] }) => void
  onScheduleSave?: (cronExpression: string) => void
}

const WEEK_DAYS = [
  { value: 1, label: "Segunda", short: "SEG" },
  { value: 2, label: "Terça", short: "TER" },
  { value: 3, label: "Quarta", short: "QUA" },
  { value: 4, label: "Quinta", short: "QUI" },
  { value: 5, label: "Sexta", short: "SEX" },
  { value: 6, label: "Sábado", short: "SÁB" },
  { value: 0, label: "Domingo", short: "DOM" },
]

const PRESET_TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]

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

function generateIntervalSchedule(startTime: string, endTime: string, intervalMinutes: number, selectedDays: number[]) {
  const schedule: { [day: number]: string[] } = {}

  const [startHour, startMinute] = startTime.split(":").map(Number)
  const [endHour, endMinute] = endTime.split(":").map(Number)

  const startTotalMinutes = startHour * 60 + startMinute
  const endTotalMinutes = endHour * 60 + endMinute

  const times: string[] = []
  for (let minutes = startTotalMinutes; minutes <= endTotalMinutes; minutes += intervalMinutes) {
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60
    if (hour < 24) {
      times.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`)
    }
  }

  selectedDays.forEach((day) => {
    schedule[day] = times
  })

  return schedule
}

export function VisualScheduleModal({
  isOpen,
  onClose,
  schedule,
  onScheduleChange,
  onScheduleSave,
}: VisualScheduleModalProps) {
  const [localSchedule, setLocalSchedule] = useState(schedule)
  const [newTime, setNewTime] = useState("")
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const [intervalStartTime, setIntervalStartTime] = useState("09:00")
  const [intervalEndTime, setIntervalEndTime] = useState("17:00")
  const [intervalMinutes, setIntervalMinutes] = useState(30)
  const [intervalDays, setIntervalDays] = useState<number[]>([1, 2, 3, 4, 5])

  const addTimeSlot = (day: number, time: string) => {
    const dayTimes = localSchedule[day] || []
    if (!dayTimes.includes(time)) {
      setLocalSchedule({
        ...localSchedule,
        [day]: [...dayTimes, time].sort(),
      })
    }
  }

  const removeTimeSlot = (day: number, time: string) => {
    const dayTimes = localSchedule[day] || []
    setLocalSchedule({
      ...localSchedule,
      [day]: dayTimes.filter((t) => t !== time),
    })
  }

  const addCustomTime = () => {
    if (newTime && selectedDay !== null) {
      addTimeSlot(selectedDay, newTime)
      setNewTime("")
      setSelectedDay(null)
    }
  }

  const applyIntervalSchedule = () => {
    const intervalSchedule = generateIntervalSchedule(intervalStartTime, intervalEndTime, intervalMinutes, intervalDays)
    setLocalSchedule({ ...localSchedule, ...intervalSchedule })
  }

  const toggleIntervalDay = (day: number) => {
    setIntervalDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  const handleSave = () => {
    onScheduleChange(localSchedule)
    if (onScheduleSave) {
      const crons = generateCronsFromSchedule(localSchedule)
      const cronExpression = crons.join(";")
      onScheduleSave(cronExpression)
    }
    onClose()
  }

  const getTotalScheduledTimes = () => {
    return Object.values(localSchedule).reduce((total, times) => total + times.length, 0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto glass-effect modal-enter">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-balance">Agendamento Visual</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Configure os horários de monitoramento de forma visual e intuitiva
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <Badge variant="secondary" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {getTotalScheduledTimes()} horários configurados
            </Badge>
            <div className="text-sm text-muted-foreground">
              Selecione os dias e horários para executar o monitoramento
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="manual" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Horários Específicos
            </TabsTrigger>
            <TabsTrigger value="interval" className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Intervalos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-6">
            {/* Weekly Calendar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {WEEK_DAYS.map((day) => (
                <div key={day.value} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-card-foreground">{day.label}</h3>
                    <Badge variant="outline" className="text-xs">
                      {day.short}
                    </Badge>
                  </div>

                  {/* Time Slots */}
                  <div className="space-y-2">
                    {(localSchedule[day.value] || []).map((time, idx) => (
                      <div
                        key={idx}
                        className="schedule-slot schedule-slot-selected flex items-center justify-between p-2 rounded-lg text-sm"
                      >
                        <span className="font-medium">{time}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(day.value, time)}
                          className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}

                    {/* Preset Time Buttons */}
                    <div className="grid grid-cols-3 gap-1 mt-3">
                      {PRESET_TIMES.slice(0, 6).map((time) => (
                        <Button
                          key={time}
                          variant="outline"
                          size="sm"
                          onClick={() => addTimeSlot(day.value, time)}
                          disabled={(localSchedule[day.value] || []).includes(time)}
                          className="schedule-slot text-xs h-8 disabled:opacity-50"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>

                    {/* Add Custom Time */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDay(day.value)}
                      className="w-full mt-2 border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Horário personalizado
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Time Input */}
            {selectedDay !== null && (
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-accent-foreground">
                  Adicionar horário personalizado - {WEEK_DAYS.find((d) => d.value === selectedDay)?.label}
                </h4>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="custom-time" className="text-sm">
                      Horário (HH:MM)
                    </Label>
                    <Input
                      id="custom-time"
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button onClick={addCustomTime} disabled={!newTime}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedDay(null)
                        setNewTime("")
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Presets */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold">Presets Rápidos</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const businessHours = {
                      1: ["09:00", "17:00"],
                      2: ["09:00", "17:00"],
                      3: ["09:00", "17:00"],
                      4: ["09:00", "17:00"],
                      5: ["09:00", "17:00"],
                    }
                    setLocalSchedule(businessHours)
                  }}
                >
                  Horário Comercial
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const everyHour: { [key: number]: string[] } = {}
                    WEEK_DAYS.slice(0, 5).forEach((day) => {
                      everyHour[day.value] = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"]
                    })
                    setLocalSchedule(everyHour)
                  }}
                >
                  A cada 2 horas
                </Button>
                <Button variant="outline" size="sm" onClick={() => setLocalSchedule({})}>
                  Limpar Tudo
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="interval" className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Timer className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Agendamento por Intervalos</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure execuções automáticas em intervalos regulares
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Time Range */}
                <div className="space-y-4">
                  <h4 className="font-medium">Período de Execução</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="start-time" className="text-sm">
                        Hora de Início
                      </Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={intervalStartTime}
                        onChange={(e) => setIntervalStartTime(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-time" className="text-sm">
                        Hora de Fim
                      </Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={intervalEndTime}
                        onChange={(e) => setIntervalEndTime(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Interval */}
                <div className="space-y-4">
                  <h4 className="font-medium">Intervalo</h4>
                  <div>
                    <Label htmlFor="interval" className="text-sm">
                      A cada (minutos)
                    </Label>
                    <Select
                      value={intervalMinutes.toString()}
                      onValueChange={(value) => setIntervalMinutes(Number(value))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutos</SelectItem>
                        <SelectItem value="10">10 minutos</SelectItem>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                        <SelectItem value="180">3 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Days Selection */}
                <div className="space-y-4">
                  <h4 className="font-medium">Dias da Semana</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {WEEK_DAYS.map((day) => (
                      <Button
                        key={day.value}
                        variant={intervalDays.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleIntervalDay(day.value)}
                        className="text-xs"
                      >
                        {day.short}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <h5 className="font-medium text-sm">Preview do Agendamento</h5>
                <p className="text-sm text-muted-foreground">
                  Execução de <strong>{intervalStartTime}</strong> até <strong>{intervalEndTime}</strong> a cada{" "}
                  <strong>{intervalMinutes} minutos</strong> nos dias:{" "}
                  <strong>{intervalDays.map((day) => WEEK_DAYS.find((d) => d.value === day)?.short).join(", ")}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Aproximadamente{" "}
                  {Math.floor(
                    (Number.parseInt(intervalEndTime.split(":")[0]) * 60 +
                      Number.parseInt(intervalEndTime.split(":")[1]) -
                      (Number.parseInt(intervalStartTime.split(":")[0]) * 60 +
                        Number.parseInt(intervalStartTime.split(":")[1]))) /
                      intervalMinutes,
                  ) + 1}{" "}
                  execuções por dia
                </p>
              </div>

              <Button onClick={applyIntervalSchedule} className="w-full">
                <Timer className="w-4 h-4 mr-2" />
                Aplicar Agendamento por Intervalo
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {getTotalScheduledTimes() > 0
              ? `${getTotalScheduledTimes()} execuções programadas por semana`
              : "Nenhum horário configurado"}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
              <Calendar className="w-4 h-4 mr-2" />
              Salvar Agendamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
