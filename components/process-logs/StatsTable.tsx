"use client";

import { useState, useMemo } from "react";
import type { ProcessStatsDTO } from "@/lib/logParser";
import { formatDuration } from "./utils";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function StatsTable({ stats }: { stats: ProcessStatsDTO[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () =>
      stats.filter((s) =>
        s.processName.toLowerCase().includes(search.toLowerCase()),
      ),
    [stats, search],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold ">
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
          <TableHeader className="bg-background3 2 uppercase text-xs">
            <TableRow className="border-background4">
              <TableHead className="px-4 py-3 h-auto">Proceso</TableHead>
              <TableHead className="px-4 py-3 h-auto text-right">
                Sesiones
              </TableHead>
              <TableHead className="px-4 py-3 h-auto text-right">
                Total
              </TableHead>
              <TableHead className="px-4 py-3 h-auto text-right">
                Avg/Día
              </TableHead>
              <TableHead className="px-4 py-3 h-auto text-right">
                Avg/Semana
              </TableHead>
              <TableHead className="px-4 py-3 h-auto text-right">
                Avg/Mes
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="px-4 py-6 text-center 2">
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
                <TableCell className="px-4 py-2.5 font-medium ">
                  {s.processName}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right 2">
                  {s.totalSessions}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right ">
                  {formatDuration(s.totalDurationSeconds)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-cyancremona">
                  {formatDuration(s.avgPerDaySeconds)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-cyancremona">
                  {formatDuration(s.avgPerWeekSeconds)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-cyancremona">
                  {formatDuration(s.avgPerMonthSeconds)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
