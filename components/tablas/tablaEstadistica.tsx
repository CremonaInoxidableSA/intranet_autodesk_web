"use client"

import { useState, useMemo } from "react"
import type { ProcessStatsDTO } from "@/lib/logParser"
import { formatDuration } from "../general/utils"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function StatsTable({
  stats,
  pcName,
}: {
  stats: ProcessStatsDTO[]
  pcName: string
}) {
  const [search, setSearch] = useState("")
  const filtered = useMemo(
    () =>
      stats.filter((s) =>
        s.processName.toLowerCase().includes(search.toLowerCase())
      ),
    [stats, search]
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          Tiempo promedio de uso por programa
        </h2>
        <Input
          type="text"
          placeholder="Filtrar proceso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
      </div>
      <div className="rounded border border-background4">
        <Table>
          <TableHeader className="2 bg-background3 text-xs uppercase">
            <TableRow className="border-background4">
              <TableHead className="h-auto px-4 py-3">Equipo</TableHead>
              <TableHead className="h-auto px-4 py-3">Proceso</TableHead>
              <TableHead className="h-auto px-4 py-3 text-right">
                Sesiones
              </TableHead>
              <TableHead className="h-auto px-4 py-3 text-right">
                Total Horas
              </TableHead>
              <TableHead className="h-auto px-4 py-3 text-right">
                Días con Uso
              </TableHead>
              <TableHead className="h-auto px-4 py-3 text-right">
                Prom. Día con Uso
              </TableHead>
              <TableHead className="h-auto px-4 py-3 text-right">
                Días hábiles
              </TableHead>
              <TableHead className="h-auto px-4 py-3 text-right">
                Prom. diario real
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="2 px-4 py-6 text-center">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}
            {filtered.map((s, i) => (
              <TableRow
                key={s.processName}
                className={`border-background4 hover:bg-background2 ${
                  i % 2 === 0 ? "bg-background" : "bg-background2/50"
                }`}
              >
                <TableCell className="px-4 py-2.5 font-medium">
                  {pcName}
                </TableCell>
                <TableCell className="px-4 py-2.5 font-medium">
                  {s.processName}
                </TableCell>
                <TableCell className="2 px-4 py-2.5 text-right">
                  {s.totalSessions}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right">
                  {formatDuration(s.totalDurationSeconds)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right">
                  {s.daysWithUsage}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-cyancremona">
                  {formatDuration(s.avgPerActiveDaySeconds)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right">
                  {s.businessDaysInPeriod}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-cyancremona">
                  {formatDuration(s.avgPerBusinessDaySeconds)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
