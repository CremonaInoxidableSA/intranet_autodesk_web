"use client"

import { forwardRef, useMemo, type Ref } from "react"
import { Chart as ChartJS } from "chart.js"
import { Bar } from "react-chartjs-2"
import {
  type Sesion,
  construirDiasEnRango,
  construirEtiquetasDias,
  agruparSesionesDePrograma,
  esInventor,
  esAutocad,
  formatearHora,
  COLOR_INVENTOR,
  COLOR_AUTOCAD,
} from "./chart-utils"

interface Propiedades {
  sesiones: Sesion[]
  fechaDesde: string
  fechaHasta: string
}

export const GraficoHorario = forwardRef<ChartJS<"bar">, Propiedades>(
  function GraficoHorario({ sesiones, fechaDesde, fechaHasta }, ref) {
    const datosGrafico = useMemo(() => {
      if (fechaDesde > fechaHasta) return null

      const dias = construirDiasEnRango(fechaDesde, fechaHasta)
      const etiquetas = construirEtiquetasDias(dias)

      const inventor = agruparSesionesDePrograma(
        sesiones,
        dias,
        fechaDesde,
        fechaHasta,
        esInventor
      )
      const autocad = agruparSesionesDePrograma(
        sesiones,
        dias,
        fechaDesde,
        fechaHasta,
        esAutocad
      )

      const conjuntosInventor = Array.from(
        { length: inventor.maxRanuras },
        (_, indice) => ({
          label: indice === 0 ? "Inventor" : "",
          stack: `inv-${indice}`,
          data: dias.map((dia) => {
            const s = inventor.porDia.get(dia)?.[indice]
            return s ? [s.horaInicio, s.horaFin] : null
          }),
          backgroundColor: COLOR_INVENTOR.fondo,
          borderColor: COLOR_INVENTOR.borde,
          borderWidth: 1,
          borderSkipped: false,
          barPercentage: 0.4,
          categoryPercentage: 0.9,
        })
      )

      const conjuntosAutocad = Array.from(
        { length: autocad.maxRanuras },
        (_, indice) => ({
          label: indice === 0 ? "AutoCAD" : "",
          stack: `cad-${indice}`,
          data: dias.map((dia) => {
            const s = autocad.porDia.get(dia)?.[indice]
            return s ? [s.horaInicio, s.horaFin] : null
          }),
          backgroundColor: COLOR_AUTOCAD.fondo,
          borderColor: COLOR_AUTOCAD.borde,
          borderWidth: 1,
          borderSkipped: false,
          barPercentage: 0.4,
          categoryPercentage: 0.9,
        })
      )

      return {
        labels: etiquetas,
        datasets: [...conjuntosInventor, ...conjuntosAutocad],
        dias,
        inventorPorDia: inventor.porDia,
        autocadPorDia: autocad.porDia,
        maxRanurasInventor: inventor.maxRanuras,
      }
    }, [sesiones, fechaDesde, fechaHasta])

    if (!datosGrafico || datosGrafico.datasets.length === 0) {
      return (
        <p className="py-8 text-center text-muted-foreground">
          {fechaDesde > fechaHasta
            ? "El rango de fechas es invalido."
            : "No hay sesiones de Inventor o AutoCAD en el periodo seleccionado."}
        </p>
      )
    }

    return (
      <Bar
        ref={ref as Ref<any>}
        data={datosGrafico as Parameters<typeof Bar>[0]["data"]}
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
                  const valor = ctx.raw as [number, number] | null
                  if (!valor || !Array.isArray(valor)) return ""
                  const {
                    dias,
                    inventorPorDia,
                    autocadPorDia,
                    maxRanurasInventor,
                  } = datosGrafico
                  const fechaDia = dias[ctx.dataIndex]
                  const esDeInventor = ctx.datasetIndex < maxRanurasInventor
                  const indice = esDeInventor
                    ? ctx.datasetIndex
                    : ctx.datasetIndex - maxRanurasInventor
                  const sesion = esDeInventor
                    ? inventorPorDia.get(fechaDia)?.[indice]
                    : autocadPorDia.get(fechaDia)?.[indice]
                  const etiqueta = ctx.dataset.label
                  const nombre =
                    etiqueta && etiqueta !== "" ? etiqueta : "Sesion"
                  if (sesion) {
                    const duracion = sesion.horaFin - sesion.horaInicio
                    const horas = Math.floor(duracion)
                    const minutos = Math.round((duracion - horas) * 60)
                    return ` ${nombre}: ${formatearHora(sesion.horaInicio)} â€“ ${formatearHora(sesion.horaFin)} (${horas}h ${minutos}m)`
                  }
                  return ` ${nombre}: ${formatearHora(valor[0])} â€“ ${formatearHora(valor[1])}`
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
                text: "Hora del di­a",
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
    )
  }
)
