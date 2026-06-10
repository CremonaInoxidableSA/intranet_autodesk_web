"use client"

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import type { LogDataResponse } from "@/lib/logParser"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js"
import { Input } from "@/components/ui/input"
import {
  extraerSesiones,
  obtenerRangoSemanaActual,
  graficoAImagenPNG,
} from "./chart-utils"
import { GraficoTortaUso } from "./graficoTorta"
import { GraficoBarrasDuracion } from "./graficoHorario"
import { GraficoHorario } from "./graficoUsoDiario"

// Registrar los componentes de Chart.js una sola vez a nivel de modulo
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
)

export const VistaGraficos = forwardRef<
  { exportarPDF: () => Promise<void> },
  { datosLog: LogDataResponse; pc?: string }
>(function VistaGraficos({ datosLog, pc }, ref) {
  const rangoInicial = obtenerRangoSemanaActual()
  const [fechaDesde, setFechaDesde] = useState(rangoInicial.desde)
  const [fechaHasta, setFechaHasta] = useState(rangoInicial.hasta)

  // Los refs dan acceso al canvas de cada grafico para el exportador de PDF
  const refGraficoTorta = useRef<ChartJS<"pie"> | null>(null)
  const refGraficoBarras = useRef<ChartJS<"bar"> | null>(null)
  const refGraficoHorario = useRef<ChartJS<"bar"> | null>(null)

  // Extraer sesiones una sola vez y compartirlas con ambos graficos de barras
  const todasLasSesiones = useMemo(
    () => extraerSesiones(datosLog.entries),
    [datosLog.entries]
  )

  const hayDatosTorta = datosLog.stats.some((s) => s.totalDurationSeconds > 0)

  // Exportar a PDF
  async function exportarPDF() {
    const { default: jsPDF } = await import("jspdf")

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const anchoPagina = doc.internal.pageSize.getWidth()
    const margen = 14
    const anchoContenido = anchoPagina - margen * 2

    // Encabezado de portada
    doc.setFontSize(15)
    doc.setTextColor(40, 40, 40)
    doc.text("Reporte de Uso de Programas", margen, 18)
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    const subtitulo = [
      pc ? `Equipo: ${pc}` : null,
      `Generado: ${new Date().toLocaleDateString("es-AR")}`,
    ]
      .filter(Boolean)
      .join("   .   ")
    doc.text(subtitulo, margen, 25)

    function agregarTituloSeccion(texto: string, x: number, y: number, w: number) {
      doc.setFontSize(14)
      doc.setTextColor(30, 30, 30)
      doc.text(texto, x, y)
      const anchoTexto = doc.getTextWidth(texto)
      doc.setDrawColor(30, 30, 30)
      doc.setLineWidth(0.4)
      doc.line(x, y + 1.2, x + Math.min(anchoTexto, w), y + 1.2)
    }

    function agregarPaginaHorizontal(grafico: ChartJS, titulo: string) {
      doc.addPage("a4", "landscape")
      const anchoPaginaH = doc.internal.pageSize.getWidth()
      const anchoContenidoH = anchoPaginaH - margen * 2
      let yH = margen + 4
      agregarTituloSeccion(titulo, margen, yH, anchoContenidoH)
      yH += 10
      const datosImagen = graficoAImagenPNG(grafico)
      const { width, height } = grafico.canvas
      const altoPaginaH = doc.internal.pageSize.getHeight()
      const altoDisponible = altoPaginaH - yH - margen
      const anchoImg = anchoContenidoH
      const altoImg = Math.min((anchoImg * height) / width, altoDisponible)
      doc.addImage(datosImagen, "PNG", margen, yH, anchoImg, altoImg)
    }

    // Pagina 1: grafico de torta (vertical)
    let y = 34
    if (refGraficoTorta.current && hayDatosTorta) {
      agregarTituloSeccion("Uso por programa - total acumulado", margen, y, anchoContenido)
      y += 10
      const datosImagen = graficoAImagenPNG(refGraficoTorta.current)
      const { width, height } = refGraficoTorta.current.canvas
      const anchoImg = anchoContenido * 0.6
      const altoImg = (anchoImg * height) / width
      doc.addImage(datosImagen, "PNG", margen + (anchoContenido - anchoImg) / 2, y, anchoImg, altoImg)
    }

    // Pagina 2: grafico de barras apiladas de duracion (horizontal)
    if (refGraficoBarras.current) {
      agregarPaginaHorizontal(
        refGraficoBarras.current,
        `Horas de uso diarias (${fechaDesde} - ${fechaHasta})`
      )
    }

    // Pagina 3: grafico de horario flotante (horizontal)
    if (refGraficoHorario.current) {
      agregarPaginaHorizontal(
        refGraficoHorario.current,
        `Horario de uso (${fechaDesde} - ${fechaHasta})`
      )
    }

    const nombreArchivo = pc ? `graficos_${pc}.pdf` : "graficos_uso.pdf"
    doc.save(nombreArchivo)
  }

  useImperativeHandle(ref, () => ({ exportarPDF }))

  return (
    <div className="flex flex-col gap-6">
      {/* Torta: participacion total por programa */}
      <div className="rounded border border-background4 bg-background2 p-6">
        <h2 className="mb-4 text-base font-semibold">
          Uso por programa - total acumulado
        </h2>
        <GraficoTortaUso ref={refGraficoTorta} estadisticas={datosLog.stats} />
      </div>

      {/* Selector de rango de fechas compartido */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Rango de fechas:</span>
        <Input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="w-36"
        />
        <span className="text-sm text-muted-foreground">-</span>
        <Input
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          className="w-36"
        />
      </div>

      {/* Barras: horas de uso apiladas por dia */}
      <div className="rounded border border-background4 bg-background2 p-6">
        <h2 className="mb-5 text-base font-semibold">Horas de uso diarias</h2>
        <GraficoBarrasDuracion
          ref={refGraficoBarras}
          sesiones={todasLasSesiones}
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
        />
      </div>

      {/* Barras flotantes: en que horario del dia se usaron los programas */}
      <div className="rounded border border-background4 bg-background2 p-6">
        <h2 className="mb-5 text-base font-semibold">Horario de uso diario</h2>
        <GraficoHorario
          ref={refGraficoHorario}
          sesiones={todasLasSesiones}
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
        />
      </div>
    </div>
  )
})
