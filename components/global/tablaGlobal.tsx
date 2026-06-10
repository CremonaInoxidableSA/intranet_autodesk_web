"use client"

import { useEffect, useState } from "react"
import type { LogDataResponse } from "@/lib/logParser"
import { formatDuration, exportToExcelMultiSheet } from "../general/utils"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ProgramStats {
  totalSecs: number
  avgDaySecs: number
  avgWeekSecs: number
  avgMonthSecs: number
  daysWithUsage: number
  businessDaysInPeriod: number
  avgActiveDaySecs: number
  avgBusinessDaySecs: number
}

interface PCRow {
  pc: string
  autocad: ProgramStats
  inventor: ProgramStats
}

const isInventor = (name: string) => name.toLowerCase().includes("inventor")
const isAutocad = (name: string) =>
  name.toLowerCase().includes("autocad") || name.toLowerCase().includes("acad")

const EMPTY: ProgramStats = {
  totalSecs: 0,
  avgDaySecs: 0,
  avgWeekSecs: 0,
  avgMonthSecs: 0,
  daysWithUsage: 0,
  businessDaysInPeriod: 0,
  avgActiveDaySecs: 0,
  avgBusinessDaySecs: 0,
}

const fmtSecs = (s: number) => (s === 0 ? "—" : formatDuration(s))

export function GlobalTable() {
  const [rows, setRows] = useState<PCRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await fetch("/api/logs")
        const data = await r.json()
        if (data.error) throw new Error(data.error)
        const pcs = data.pcs as string[]

        const results = await Promise.allSettled(
          pcs.map((pc) =>
            fetch(`/api/logs/${encodeURIComponent(pc)}`).then((res) =>
              res.json()
            )
          )
        )

        const built: PCRow[] = pcs.map((pc, i) => {
          const result = results[i]
          if (result.status === "rejected") {
            return { pc, autocad: { ...EMPTY }, inventor: { ...EMPTY } }
          }
          const logData = result.value as LogDataResponse & { error?: string }
          if (logData.error) {
            return { pc, autocad: { ...EMPTY }, inventor: { ...EMPTY } }
          }

          const aggregate = (filter: (n: string) => boolean): ProgramStats => {
            const matched = logData.stats.filter((s) => filter(s.processName))
            const totalSecs = matched.reduce(
              (a, s) => a + s.totalDurationSeconds,
              0
            )
            const daysWithUsage = matched.reduce(
              (a, s) => a + s.daysWithUsage,
              0
            )
            const businessDaysInPeriod = matched.reduce(
              (a, s) => Math.max(a, s.businessDaysInPeriod),
              0
            )
            return {
              totalSecs,
              avgDaySecs: matched.reduce((a, s) => a + s.avgPerDaySeconds, 0),
              avgWeekSecs: matched.reduce((a, s) => a + s.avgPerWeekSeconds, 0),
              avgMonthSecs: matched.reduce(
                (a, s) => a + s.avgPerMonthSeconds,
                0
              ),
              daysWithUsage,
              businessDaysInPeriod,
              avgActiveDaySecs:
                daysWithUsage > 0 ? totalSecs / daysWithUsage : 0,
              avgBusinessDaySecs:
                businessDaysInPeriod > 0 ? totalSecs / businessDaysInPeriod : 0,
            }
          }

          return {
            pc,
            autocad: aggregate(isAutocad),
            inventor: aggregate(isInventor),
          }
        })

        built.sort(
          (a, b) =>
            b.autocad.totalSecs +
            b.inventor.totalSecs -
            (a.autocad.totalSecs + a.inventor.totalSecs)
        )

        setRows(built)
      } catch (e) {
        setError(String(e instanceof Error ? e.message : e))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="2 flex items-center justify-center py-16">
        Cargando datos de todos los equipos…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded border border-redcremona/40 bg-redcremona/10 px-4 py-3 text-sm text-redcremona">
        Error: {error}
      </div>
    )
  }

  const totalAutocadSecs = rows.reduce((acc, r) => acc + r.autocad.totalSecs, 0)
  const totalInventorSecs = rows.reduce(
    (acc, r) => acc + r.inventor.totalSecs,
    0
  )

  function handleExport() {
    const excelRows = rows.map((r) => ({
      Equipo: r.pc,
      "AutoCAD Total Horas": fmtSecs(r.autocad.totalSecs),
      "AutoCAD Días con Uso": r.autocad.daysWithUsage,
      "AutoCAD Prom. Día con Uso": fmtSecs(r.autocad.avgActiveDaySecs),
      "AutoCAD Días hábiles": r.autocad.businessDaysInPeriod,
      "AutoCAD Prom. diario real": fmtSecs(r.autocad.avgBusinessDaySecs),
      "Inventor Total Horas": fmtSecs(r.inventor.totalSecs),
      "Inventor Días con Uso": r.inventor.daysWithUsage,
      "Inventor Prom. Día con Uso": fmtSecs(r.inventor.avgActiveDaySecs),
      "Inventor Días hábiles": r.inventor.businessDaysInPeriod,
      "Inventor Prom. diario real": fmtSecs(r.inventor.avgBusinessDaySecs),
    }))
    exportToExcelMultiSheet(
      [{ name: "Uso global", rows: excelRows }],
      "uso_global_equipos"
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Uso global por equipo</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={rows.length === 0}
          title="Descargar Excel"
        >
          ↓ Excel
        </Button>
      </div>
      <div className="rounded border border-background4">
        <Table>
          <TableHeader className="2 bg-background3 text-xs uppercase">
            <TableRow className="border-background4">
              <TableHead className="h-auto px-4 py-2" rowSpan={2}>
                Equipo
              </TableHead>
              <TableHead
                className="h-auto border-l border-background4 px-4 py-2 text-center text-cyancremona"
                colSpan={5}
              >
                AutoCAD
              </TableHead>
              <TableHead
                className="h-auto border-l border-background4 px-4 py-2 text-center text-orangecremona"
                colSpan={5}
              >
                Inventor
              </TableHead>
            </TableRow>
            <TableRow className="border-background4">
              <TableHead className="h-auto border-l border-background4 px-4 py-2 text-right">
                Total Horas
              </TableHead>
              <TableHead className="h-auto px-4 py-2 text-right">
                Días con Uso
              </TableHead>
              <TableHead className="h-auto px-4 py-2 text-right">
                Prom. Día con Uso
              </TableHead>
              <TableHead className="h-auto px-4 py-2 text-right">
                Días hábiles
              </TableHead>
              <TableHead className="h-auto px-4 py-2 text-right">
                Prom. diario real
              </TableHead>
              <TableHead className="h-auto border-l border-background4 px-4 py-2 text-right">
                Total Horas
              </TableHead>
              <TableHead className="h-auto px-4 py-2 text-right">
                Días con Uso
              </TableHead>
              <TableHead className="h-auto px-4 py-2 text-right">
                Prom. Día con Uso
              </TableHead>
              <TableHead className="h-auto px-4 py-2 text-right">
                Días hábiles
              </TableHead>
              <TableHead className="h-auto px-4 py-2 text-right">
                Prom. diario real
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="2 px-4 py-6 text-center">
                  Sin datos
                </TableCell>
              </TableRow>
            )}
            {rows.map((row, i) => (
              <TableRow
                key={row.pc}
                className={`border-background4 hover:bg-background2 ${
                  i % 2 === 0 ? "bg-background" : "bg-background2/50"
                }`}
              >
                <TableCell className="px-4 py-2.5 font-medium">
                  {row.pc}
                </TableCell>
                <TableCell className="border-l border-background4 px-4 py-2.5 text-right">
                  {fmtSecs(row.autocad.totalSecs)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-cyancremona">
                  {row.autocad.daysWithUsage}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-cyancremona">
                  {fmtSecs(row.autocad.avgActiveDaySecs)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-cyancremona">
                  {row.autocad.businessDaysInPeriod}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-cyancremona">
                  {fmtSecs(row.autocad.avgBusinessDaySecs)}
                </TableCell>
                <TableCell className="border-l border-background4 px-4 py-2.5 text-right">
                  {fmtSecs(row.inventor.totalSecs)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-orangecremona">
                  {row.inventor.daysWithUsage}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-orangecremona">
                  {fmtSecs(row.inventor.avgActiveDaySecs)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-orangecremona">
                  {row.inventor.businessDaysInPeriod}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-orangecremona">
                  {fmtSecs(row.inventor.avgBusinessDaySecs)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {rows.length > 1 && (
            <TableFooter className="border-t-2 border-background4 bg-background3">
              <TableRow>
                <TableCell className="2 px-4 py-2.5 text-xs font-semibold tracking-wide uppercase">
                  Total
                </TableCell>
                <TableCell className="border-l border-background4 px-4 py-2.5 text-right font-semibold">
                  {fmtSecs(totalAutocadSecs)}
                </TableCell>
                <TableCell colSpan={4} />
                <TableCell className="border-l border-background4 px-4 py-2.5 text-right font-semibold">
                  {fmtSecs(totalInventorSecs)}
                </TableCell>
                <TableCell colSpan={4} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  )
}
