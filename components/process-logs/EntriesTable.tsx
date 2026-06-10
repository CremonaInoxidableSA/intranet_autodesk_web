"use client"

import { useState, useMemo } from "react"
import type { LogEntryDTO } from "@/lib/logParser"
import { Badge } from "./Badge"
import { getEntryDetail } from "./utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const PAGE_SIZE = 100

export function EntriesTable({ entries }: { entries: LogEntryDTO[] }) {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<
    "ALL" | "START" | "STOP" | "AUTO_STOP" | "FORCED_STOP" | "VM_IDLE"
  >("ALL")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchType = typeFilter === "ALL" || e.type === typeFilter
      const query = search.toLowerCase()
      const matchSearch =
        !search ||
        e.source?.toLowerCase().includes(query) ||
        e.processName?.toLowerCase().includes(query) ||
        e.status?.toLowerCase().includes(query) ||
        e.message?.toLowerCase().includes(query) ||
        getEntryDetail(e).toLowerCase().includes(query)
      return matchType && matchSearch
    })
  }, [entries, typeFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Registro de eventos</h2>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Buscar proceso..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-48"
          />
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v as typeof typeFilter)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="START">START</SelectItem>
              <SelectItem value="STOP">STOP</SelectItem>
              <SelectItem value="AUTO_STOP">AUTO CIERRE</SelectItem>
              <SelectItem value="FORCED_STOP">VM APAGADA</SelectItem>
              <SelectItem value="VM_IDLE">VM SIN USO</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded border border-background4">
        <Table>
          <TableHeader className="2 bg-background3 text-xs uppercase">
            <TableRow className="border-background4">
              <TableHead className="h-auto px-4 py-3">Fecha</TableHead>
              <TableHead className="h-auto px-4 py-3">Origen</TableHead>
              <TableHead className="h-auto px-4 py-3">Proceso</TableHead>
              <TableHead className="h-auto px-4 py-3">Estado</TableHead>
              <TableHead className="h-auto px-4 py-3">Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="2 px-4 py-6 text-center">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}
            {visible.map((entry, i) => (
              <TableRow
                key={i}
                className={`border-background4 hover:bg-background2 ${
                  i % 2 === 0 ? "bg-background" : "bg-background2/50"
                }`}
              >
                <TableCell className="2 px-4 py-2 font-mono whitespace-nowrap">
                  {entry.timestamp}
                </TableCell>
                <TableCell className="px-4 py-2">
                  {entry.source ?? "-"}
                </TableCell>
                <TableCell className="px-4 py-2">
                  {entry.processName ?? "-"}
                </TableCell>
                <TableCell className="px-4 py-2">
                  <Badge type={entry.type} />
                </TableCell>
                <TableCell className="px-4 py-2 text-sm text-muted-foreground">
                  {getEntryDetail(entry)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="2 flex items-center justify-between text-sm">
        <span>
          {filtered.length} evento{filtered.length !== 1 ? "s" : ""} • Página{" "}
          {currentPage} de {totalPages}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            ← Ant
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            Sig →
          </Button>
        </div>
      </div>
    </div>
  )
}
