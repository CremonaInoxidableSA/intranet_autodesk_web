"use client";

import { useEffect, useState } from "react";
import type { LogDataResponse } from "@/lib/logParser";
import { formatDuration, exportToExcelMultiSheet } from "./utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProgramStats {
  totalSecs: number;
  avgDaySecs: number;
  avgWeekSecs: number;
  avgMonthSecs: number;
}

interface PCRow {
  pc: string;
  autocad: ProgramStats;
  inventor: ProgramStats;
}

const isInventor = (name: string) => name.toLowerCase().includes("inventor");
const isAutocad = (name: string) =>
  name.toLowerCase().includes("autocad") || name.toLowerCase().includes("acad");

const EMPTY: ProgramStats = {
  totalSecs: 0,
  avgDaySecs: 0,
  avgWeekSecs: 0,
  avgMonthSecs: 0,
};

const fmtSecs = (s: number) => (s === 0 ? "—" : formatDuration(s));

export function GlobalTable() {
  const [rows, setRows] = useState<PCRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/logs");
        const data = await r.json();
        if (data.error) throw new Error(data.error);
        const pcs = data.pcs as string[];

        const results = await Promise.allSettled(
          pcs.map((pc) =>
            fetch(`/api/logs/${encodeURIComponent(pc)}`).then((res) =>
              res.json(),
            ),
          ),
        );

        const built: PCRow[] = pcs.map((pc, i) => {
          const result = results[i];
          if (result.status === "rejected") {
            return { pc, autocad: { ...EMPTY }, inventor: { ...EMPTY } };
          }
          const logData = result.value as LogDataResponse & { error?: string };
          if (logData.error) {
            return { pc, autocad: { ...EMPTY }, inventor: { ...EMPTY } };
          }

          const aggregate = (filter: (n: string) => boolean): ProgramStats => {
            const matched = logData.stats.filter((s) => filter(s.processName));
            return {
              totalSecs: matched.reduce(
                (a, s) => a + s.totalDurationSeconds,
                0,
              ),
              avgDaySecs: matched.reduce((a, s) => a + s.avgPerDaySeconds, 0),
              avgWeekSecs: matched.reduce((a, s) => a + s.avgPerWeekSeconds, 0),
              avgMonthSecs: matched.reduce(
                (a, s) => a + s.avgPerMonthSeconds,
                0,
              ),
            };
          };

          return {
            pc,
            autocad: aggregate(isAutocad),
            inventor: aggregate(isInventor),
          };
        });

        built.sort(
          (a, b) =>
            b.autocad.totalSecs +
            b.inventor.totalSecs -
            (a.autocad.totalSecs + a.inventor.totalSecs),
        );

        setRows(built);
      } catch (e) {
        setError(String(e instanceof Error ? e.message : e));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 2">
        Cargando datos de todos los equipos…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-redcremona/40 bg-redcremona/10 px-4 py-3 text-sm text-redcremona">
        Error: {error}
      </div>
    );
  }

  const totalAutocadSecs = rows.reduce(
    (acc, r) => acc + r.autocad.totalSecs,
    0,
  );
  const totalInventorSecs = rows.reduce(
    (acc, r) => acc + r.inventor.totalSecs,
    0,
  );

  function handleExport() {
    const excelRows = rows.map((r) => ({
      Equipo: r.pc,
      "AutoCAD Total": fmtSecs(r.autocad.totalSecs),
      "AutoCAD Avg/Día": fmtSecs(r.autocad.avgDaySecs),
      "AutoCAD Avg/Semana": fmtSecs(r.autocad.avgWeekSecs),
      "AutoCAD Avg/Mes": fmtSecs(r.autocad.avgMonthSecs),
      "Inventor Total": fmtSecs(r.inventor.totalSecs),
      "Inventor Avg/Día": fmtSecs(r.inventor.avgDaySecs),
      "Inventor Avg/Semana": fmtSecs(r.inventor.avgWeekSecs),
      "Inventor Avg/Mes": fmtSecs(r.inventor.avgMonthSecs),
    }));
    exportToExcelMultiSheet(
      [{ name: "Uso global", rows: excelRows }],
      "uso_global_equipos",
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold ">Uso global por equipo</h2>
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
          <TableHeader className="bg-background3 2 uppercase text-xs">
            <TableRow className="border-background4">
              <TableHead className="px-4 py-2 h-auto" rowSpan={2}>
                Equipo
              </TableHead>
              <TableHead
                className="px-4 py-2 h-auto text-center border-l border-background4 text-cyancremona"
                colSpan={4}
              >
                AutoCAD
              </TableHead>
              <TableHead
                className="px-4 py-2 h-auto text-center border-l border-background4 text-orangecremona"
                colSpan={4}
              >
                Inventor
              </TableHead>
            </TableRow>
            <TableRow className="border-background4">
              <TableHead className="px-4 py-2 h-auto text-right border-l border-background4">
                Total
              </TableHead>
              <TableHead className="px-4 py-2 h-auto text-right">
                Avg/Día
              </TableHead>
              <TableHead className="px-4 py-2 h-auto text-right">
                Avg/Sem
              </TableHead>
              <TableHead className="px-4 py-2 h-auto text-right">
                Avg/Mes
              </TableHead>
              <TableHead className="px-4 py-2 h-auto text-right border-l border-background4">
                Total
              </TableHead>
              <TableHead className="px-4 py-2 h-auto text-right">
                Avg/Día
              </TableHead>
              <TableHead className="px-4 py-2 h-auto text-right">
                Avg/Sem
              </TableHead>
              <TableHead className="px-4 py-2 h-auto text-right">
                Avg/Mes
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="px-4 py-6 text-center 2">
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
                <TableCell className="px-4 py-2.5 font-medium ">
                  {row.pc}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right  border-l border-background4">
                  {fmtSecs(row.autocad.totalSecs)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-cyancremona">
                  {fmtSecs(row.autocad.avgDaySecs)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-cyancremona">
                  {fmtSecs(row.autocad.avgWeekSecs)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-cyancremona">
                  {fmtSecs(row.autocad.avgMonthSecs)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right  border-l border-background4">
                  {fmtSecs(row.inventor.totalSecs)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-orangecremona">
                  {fmtSecs(row.inventor.avgDaySecs)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-orangecremona">
                  {fmtSecs(row.inventor.avgWeekSecs)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right text-orangecremona">
                  {fmtSecs(row.inventor.avgMonthSecs)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {rows.length > 1 && (
            <TableFooter className="border-t-2 border-background4 bg-background3">
              <TableRow>
                <TableCell className="px-4 py-2.5 font-semibold 2 uppercase text-xs tracking-wide">
                  Total
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right font-semibold  border-l border-background4">
                  {fmtSecs(totalAutocadSecs)}
                </TableCell>
                <TableCell colSpan={3} />
                <TableCell className="px-4 py-2.5 text-right font-semibold  border-l border-background4">
                  {fmtSecs(totalInventorSecs)}
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
