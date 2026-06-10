"use client";

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LogDataResponse, LogEntryDTO } from "@/lib/logParser";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { Input } from "@/components/ui/input";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
);

function getCurrentWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  };
}

const parseHour = (ts: string) => {
  const timePart = ts.split(" ")[1] ?? "00:00:00";
  const [h, m, s] = timePart.split(":").map(Number);
  return h + m / 60 + (s ?? 0) / 3600;
};

const formatHour = (h: number) => {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

interface Session {
  processName: string;
  date: string;
  startHour: number;
  endHour: number;
}

function extractSessions(entries: LogEntryDTO[]): Session[] {
  type OpenProcess = { name: string; startTimestamp: string };
  const open = new Map<number, OpenProcess>();
  const openByName = new Map<string, OpenProcess[]>();
  const sessions: Session[] = [];

  for (const entry of entries) {
    if (entry.type === "START" && entry.processName) {
      const proc: OpenProcess = {
        name: entry.processName,
        startTimestamp: entry.timestamp,
      };
      if (entry.pid !== undefined) {
        open.set(entry.pid, proc);
      } else {
        const stack = openByName.get(entry.processName) ?? [];
        stack.push(proc);
        openByName.set(entry.processName, stack);
      }
    } else if (
      (entry.type === "STOP" || entry.type === "AUTO_STOP") &&
      entry.processName
    ) {
      if (entry.pid !== undefined) {
        const proc = open.get(entry.pid);
        if (proc) {
          sessions.push({
            processName: proc.name,
            date: proc.startTimestamp.slice(0, 10),
            startHour: parseHour(proc.startTimestamp),
            endHour: parseHour(entry.timestamp),
          });
          open.delete(entry.pid);
        }
      } else {
        const stack = openByName.get(entry.processName);
        if (stack && stack.length > 0) {
          const proc = stack.shift()!;
          sessions.push({
            processName: proc.name,
            date: proc.startTimestamp.slice(0, 10),
            startHour: parseHour(proc.startTimestamp),
            endHour: parseHour(entry.timestamp),
          });
        }
      }
    }
  }

  return sessions;
}

const isInventor = (name: string) => name.toLowerCase().includes("inventor");
const isAutocad = (name: string) =>
  name.toLowerCase().includes("autocad") || name.toLowerCase().includes("acad");

export const ChartsView = forwardRef<
  { exportToPDF: () => Promise<void> },
  { logData: LogDataResponse; pc?: string }
>(function ChartsView({ logData, pc }, ref) {
  const defaultRange = getCurrentWeekRange();
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);

  const pieChartRef = useRef<ChartJS<"pie"> | null>(null);
  const barChartRef = useRef<ChartJS<"bar"> | null>(null);

  function chartToDataURL(chart: ChartJS): string {
    const src = chart.canvas;
    const offscreen = document.createElement("canvas");
    offscreen.width = src.width;
    offscreen.height = src.height;
    const ctx = offscreen.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.drawImage(src, 0, 0);
    return offscreen.toDataURL("image/png");
  }

  async function exportToPDF() {
    const { default: jsPDF } = await import("jspdf");

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentW = pageW - margin * 2;

    doc.setFontSize(15);
    doc.setTextColor(40, 40, 40);
    doc.text("Reporte de Uso de Programas", margin, 18);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const subtitle = [
      pc ? `Equipo: ${pc}` : null,
      `Generado: ${new Date().toLocaleDateString("es-AR")}`,
    ]
      .filter(Boolean)
      .join("   ·   ");
    doc.text(subtitle, margin, 25);

    function sectionTitle(text: string, x: number, yPos: number, w: number) {
      doc.setFontSize(14);
      doc.setTextColor(30, 30, 30);
      doc.text(text, x, yPos);
      const textW = doc.getTextWidth(text);
      doc.setDrawColor(30, 30, 30);
      doc.setLineWidth(0.4);
      doc.line(x, yPos + 1.2, x + Math.min(textW, w), yPos + 1.2);
    }

    let y = 34;

    if (pieChartRef.current && pieHasData) {
      sectionTitle("Uso por programa — total acumulado", margin, y, contentW);
      y += 10;
      const imgData = chartToDataURL(pieChartRef.current);
      const { width, height } = pieChartRef.current.canvas;
      const imgW = contentW * 0.6;
      const imgH = (imgW * height) / width;
      doc.addImage(
        imgData,
        "PNG",
        margin + (contentW - imgW) / 2,
        y,
        imgW,
        imgH,
      );
    }

    if (
      barChartRef.current &&
      timelineData &&
      timelineData.datasets.length > 0
    ) {
      doc.addPage("a4", "landscape");
      const lPageW = doc.internal.pageSize.getWidth();
      const lContentW = lPageW - margin * 2;
      let ly = margin + 4;

      sectionTitle(
        `Uso diario por horario (${dateFrom} \u2013 ${dateTo})`,
        margin,
        ly,
        lContentW,
      );
      ly += 10;

      const imgData = chartToDataURL(barChartRef.current);
      const { width, height } = barChartRef.current.canvas;
      const lPageH = doc.internal.pageSize.getHeight();
      const availH = lPageH - ly - margin;
      const imgW = lContentW;
      const imgH = Math.min((imgW * height) / width, availH);
      doc.addImage(imgData, "PNG", margin, ly, imgW, imgH);
    }

    const filename = pc ? `graficos_${pc}.pdf` : "graficos_uso.pdf";
    doc.save(filename);
  }

  useImperativeHandle(ref, () => ({ exportToPDF }));

  const pieData = useMemo(() => {
    const inventorTotal = logData.stats
      .filter((s) => isInventor(s.processName))
      .reduce((acc, s) => acc + s.totalDurationSeconds, 0);
    const autocadTotal = logData.stats
      .filter((s) => isAutocad(s.processName))
      .reduce((acc, s) => acc + s.totalDurationSeconds, 0);
    const other = logData.stats
      .filter((s) => !isInventor(s.processName) && !isAutocad(s.processName))
      .reduce((acc, s) => acc + s.totalDurationSeconds, 0);

    const labels = ["Inventor", "AutoCAD"];
    const data = [inventorTotal, autocadTotal];
    const bgColors = ["rgba(239,130,37,0.85)", "rgba(48,160,240,0.85)"];
    const borderColors = ["#ef8225", "#30a0f0"];

    if (other > 0) {
      labels.push("Otros");
      data.push(other);
      bgColors.push("rgba(140,140,140,0.6)");
      borderColors.push("#8c8c8c");
    }

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 2,
        },
      ],
    };
  }, [logData.stats]);

  const pieHasData = pieData.datasets[0].data.some((v) => v > 0);

  const timelineData = (() => {
    if (dateFrom > dateTo) return null;

    const allSessions = extractSessions(logData.entries);

    const days: string[] = [];
    const cur = new Date(dateFrom + "T00:00:00");
    const end = new Date(dateTo + "T00:00:00");
    while (cur <= end) {
      days.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    const inventorSessions = allSessions.filter(
      (s) =>
        isInventor(s.processName) && s.date >= dateFrom && s.date <= dateTo,
    );
    const autocadSessions = allSessions.filter(
      (s) => isAutocad(s.processName) && s.date >= dateFrom && s.date <= dateTo,
    );

    const groupByDay = (arr: Session[]) => {
      const map = new Map<string, Session[]>();
      for (const s of arr) {
        const list = map.get(s.date) ?? [];
        list.push(s);
        map.set(s.date, list);
      }
      return map;
    };

    const inventorByDay = groupByDay(inventorSessions);
    const autocadByDay = groupByDay(autocadSessions);

    const maxInventorSlots = Math.max(
      0,
      ...days.map((d) => inventorByDay.get(d)?.length ?? 0),
    );
    const maxAutocadSlots = Math.max(
      0,
      ...days.map((d) => autocadByDay.get(d)?.length ?? 0),
    );

    const inventorDatasets = Array.from(
      { length: maxInventorSlots },
      (_, slot) => ({
        label: slot === 0 ? "Inventor" : "",
        stack: "inventor",
        data: days.map((day) => {
          const s = inventorByDay.get(day)?.[slot];
          return s ? [s.startHour, s.endHour] : null;
        }),
        backgroundColor: "rgba(239,130,37,0.80)",
        borderColor: "#ef8225",
        borderWidth: 1,
        borderSkipped: false,
        barPercentage: 0.4,
        categoryPercentage: 0.9,
      }),
    );

    const autocadDatasets = Array.from(
      { length: maxAutocadSlots },
      (_, slot) => ({
        label: slot === 0 ? "AutoCAD" : "",
        stack: "autocad",
        data: days.map((day) => {
          const s = autocadByDay.get(day)?.[slot];
          return s ? [s.startHour, s.endHour] : null;
        }),
        backgroundColor: "rgba(48,160,240,0.80)",
        borderColor: "#30a0f0",
        borderWidth: 1,
        borderSkipped: false,
        barPercentage: 0.4,
        categoryPercentage: 0.9,
      }),
    );

    const datasets = [...inventorDatasets, ...autocadDatasets];

    const labels = days.map((d) => {
      const [y, m, day2] = d.split("-").map(Number);
      const date = new Date(y, m - 1, day2);
      return date.toLocaleDateString("es-AR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    });

    return { labels, datasets };
  })();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded border border-background4 bg-background2 p-6">
        <h2 className="text-base font-semibold  mb-4">
          Uso por programa — total acumulado
        </h2>
        {pieHasData ? (
          <div className="flex justify-center">
            <div style={{ maxWidth: 340, width: "100%" }}>
              <Pie
                ref={pieChartRef}
                data={pieData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: { color: "#a0a0a0", padding: 16 },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const val = ctx.raw as number;
                          const total = (ctx.dataset.data as number[]).reduce(
                            (a, b) => a + b,
                            0,
                          );
                          const pct =
                            total > 0 ? ((val / total) * 100).toFixed(1) : "0";
                          const hrs = Math.floor(val / 3600);
                          const mins = Math.floor((val % 3600) / 60);
                          return ` ${ctx.label}: ${pct}% (${hrs}h ${mins}m)`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        ) : (
          <p className="text-center 2 py-8">
            No se encontraron datos de Inventor o AutoCAD.
          </p>
        )}
      </div>

      <div className="rounded border border-background4 bg-background2 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-base font-semibold ">Uso diario por horario</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36"
            />
            <span className="2 text-sm">–</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36"
            />
          </div>
        </div>

        {timelineData && timelineData.datasets.length > 0 ? (
          <Bar
            ref={barChartRef}
            data={timelineData as Parameters<typeof Bar>[0]["data"]}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  labels: {
                    color: "#a0a0a0",
                    filter: (item) => item.text !== "",
                  },
                },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const val = ctx.raw as [number, number] | null;
                      if (!val || !Array.isArray(val)) return "";
                      const label = ctx.dataset.label;
                      const name = label && label !== "" ? label : "Sesión";
                      return ` ${name}: ${formatHour(val[0])} – ${formatHour(val[1])}`;
                    },
                  },
                },
              },
              scales: {
                y: {
                  min: 5,
                  max: 22,
                  ticks: {
                    color: "#a0a0a0",
                    stepSize: 1,
                    callback: (v) => `${v}:00`,
                  },
                  grid: { color: "rgba(255,255,255,0.06)" },
                  title: {
                    display: true,
                    text: "Hora del día",
                    color: "#a0a0a0",
                  },
                },
                x: {
                  ticks: { color: "#a0a0a0" },
                  grid: { color: "rgba(255,255,255,0.06)" },
                },
              },
            }}
          />
        ) : (
          <p className="text-center 2 py-8">
            {dateFrom > dateTo
              ? "El rango de fechas es inválido."
              : "No hay sesiones de Inventor o AutoCAD en el período seleccionado."}
          </p>
        )}
      </div>
    </div>
  );
});
