"use client"

import { useEffect, useRef, useState } from "react"
import type { LogDataResponse } from "@/lib/logParser"
import { StatsTable } from "./tablaEstadistica"
import { EntriesTable } from "./EntriesTable"
import { VistaGraficos } from "./graficos"
import { GlobalTable } from "./tablaGlobal"
import {
  exportToExcelMultiSheet,
  formatDuration,
  getEntryDetail,
} from "./utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function LogViewer() {
  const [pcs, setPcs] = useState<string[]>([])
  const [selectedPC, setSelectedPC] = useState<string>("")
  const [logData, setLogData] = useState<LogDataResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"tablas" | "graficos" | "global">("tablas")
  const chartsRef = useRef<{ exportarPDF: () => Promise<void> }>(null)

  useEffect(() => {
    fetch("/api/logs")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setPcs(data.pcs as string[])
        if (data.pcs.length > 0) setSelectedPC(data.pcs[0])
      })
      .catch((e) => setError(String(e.message ?? e)))
  }, [])

  useEffect(() => {
    if (!selectedPC) return
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setLogData(null)
      try {
        const r = await fetch(`/api/logs/${encodeURIComponent(selectedPC)}`)
        const data = await r.json()
        if (data.error) throw new Error(data.error)
        setLogData(data as LogDataResponse)
      } catch (e) {
        setError(String(e instanceof Error ? e.message : e))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedPC])

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-bold">Monitor de Procesos</h1>
        <div className="flex gap-1">
          <Button
            variant={view === "tablas" ? "default" : "outline"}
            className={
              view === "tablas"
                ? "border-greencremona bg-greencremona/30 text-greencremona"
                : ""
            }
            size="sm"
            onClick={() => setView("tablas")}
          >
            Tablas
          </Button>
          <Button
            variant={view === "graficos" ? "default" : "outline"}
            className={
              view === "graficos"
                ? "border-greencremona bg-greencremona/30 text-greencremona"
                : ""
            }
            size="sm"
            onClick={() => setView("graficos")}
          >
            Gráficos
          </Button>
          <Button
            variant={view === "global" ? "default" : "outline"}
            className={
              view === "global"
                ? "border-greencremona bg-greencremona/30 text-greencremona"
                : ""
            }
            size="sm"
            onClick={() => setView("global")}
          >
            Global
          </Button>
        </div>
        {view !== "global" && (
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="pc-select" className="text-sm">
              Equipo:
            </label>
            <Select
              value={selectedPC}
              onValueChange={setSelectedPC}
              disabled={pcs.length === 0}
            >
              <SelectTrigger id="pc-select" className="min-w-50">
                <SelectValue placeholder="Cargando equipos..." />
              </SelectTrigger>
              <SelectContent position="popper">
                {pcs.map((pc) => (
                  <SelectItem key={pc} value={pc}>
                    {pc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {view === "tablas" && logData && !loading && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const statsRows = logData.stats.map((s) => ({
                    Equipo: selectedPC,
                    Proceso: s.processName,
                    Sesiones: s.totalSessions,
                    Total: formatDuration(s.totalDurationSeconds),
                    "Avg/Día": formatDuration(s.avgPerDaySeconds),
                    "Avg/Semana": formatDuration(s.avgPerWeekSeconds),
                    "Avg/Mes": formatDuration(s.avgPerMonthSeconds),
                  }))
                  const entriesRows = logData.entries.map((e) => ({
                    Equipo: selectedPC,
                    Timestamp: e.timestamp,
                    Origen: e.source ?? "",
                    Proceso: e.processName ?? "",
                    Estado: e.type,
                    Detalles: getEntryDetail(e),
                  }))
                  exportToExcelMultiSheet(
                    [
                      { name: "Tiempo promedio", rows: statsRows },
                      { name: "Registro de eventos", rows: entriesRows },
                    ],
                    `reporte_${selectedPC}`
                  )
                }}
                title="Descargar Excel con ambas tablas"
              >
                ↓ Excel
              </Button>
            )}
            {view === "graficos" && logData && !loading && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => chartsRef.current?.exportarPDF()}
                title="Descargar PDF con ambos gráficos"
              >
                ↓ PDF
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded border border-redcremona/40 bg-redcremona/10 px-4 py-3 text-sm text-redcremona">
          Error: {error}
        </div>
      )}

      {loading && (
        <div className="2 flex items-center justify-center py-16">
          Cargando logs…
        </div>
      )}

      {logData && !loading && (
        <>
          {view === "tablas" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded border border-background4 bg-background2 px-4 py-3">
                  <p className="2 text-xs tracking-wide uppercase">Eventos</p>
                  <p className="text-2xl font-bold">{logData.entries.length}</p>
                </div>
                <div className="rounded border border-background4 bg-background2 px-4 py-3">
                  <p className="2 text-xs tracking-wide uppercase">
                    Procesos únicos
                  </p>
                  <p className="text-2xl font-bold">{logData.stats.length}</p>
                </div>
                <div className="rounded border border-background4 bg-background2 px-4 py-3">
                  <p className="2 text-xs tracking-wide uppercase">
                    Sesiones registradas
                  </p>
                  <p className="text-2xl font-bold">
                    {logData.stats.reduce((acc, s) => acc + s.totalSessions, 0)}
                  </p>
                </div>
              </div>

              <StatsTable stats={logData.stats} />
              <EntriesTable entries={logData.entries} />
            </>
          )}

          {view === "graficos" && (
            <VistaGraficos ref={chartsRef} datosLog={logData} pc={selectedPC} />
          )}
        </>
      )}

      {view === "global" && <GlobalTable />}
    </div>
  )
}
