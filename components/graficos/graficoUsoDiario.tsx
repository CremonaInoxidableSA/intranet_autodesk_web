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
} from "../general/chart-utils"

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
      const etiquetasDias = construirEtiquetasDias(dias)

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

      // Cada dia genera dos entradas en el eje X: una para Inventor y otra para AutoCAD.
      // Con grouped:false los datasets del mismo programa se superponen en la misma
      // columna en lugar de aparecer uno al lado del otro por cada sesion.
      const diasPares: string[] = []
      for (const dia of dias) {
        diasPares.push(`${dia}|inv`, `${dia}|cad`)
      }

      const conjuntosInventor = Array.from(
        { length: Math.max(inventor.maxRanuras, 1) },
        (_, indice) => ({
          label: indice === 0 ? "Inventor" : "",
          data: diasPares.map((clave) => {
            if (!clave.endsWith("|inv")) return null
            const dia = clave.slice(0, -4)
            const s = inventor.porDia.get(dia)?.[indice]
            return s ? [s.horaInicio, s.horaFin] : null
          }),
          backgroundColor: COLOR_INVENTOR.fondo,
          borderColor: COLOR_INVENTOR.borde,
          borderWidth: 1,
          borderSkipped: false,
          barPercentage: 0.85,
          categoryPercentage: 0.9,
        })
      )

      const conjuntosAutocad = Array.from(
        { length: Math.max(autocad.maxRanuras, 1) },
        (_, indice) => ({
          label: indice === 0 ? "AutoCAD" : "",
          data: diasPares.map((clave) => {
            if (!clave.endsWith("|cad")) return null
            const dia = clave.slice(0, -4)
            const s = autocad.porDia.get(dia)?.[indice]
            return s ? [s.horaInicio, s.horaFin] : null
          }),
          backgroundColor: COLOR_AUTOCAD.fondo,
          borderColor: COLOR_AUTOCAD.borde,
          borderWidth: 1,
          borderSkipped: false,
          barPercentage: 0.85,
          categoryPercentage: 0.9,
        })
      )

      return {
        labels: diasPares,
        datasets: [...conjuntosInventor, ...conjuntosAutocad],
        diasPares,
        etiquetasDias,
        inventorPorDia: inventor.porDia,
        autocadPorDia: autocad.porDia,
        maxRanurasInventor: Math.max(inventor.maxRanuras, 1),
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
        options={
          {
            responsive: true,
            grouped: false,
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
                      diasPares,
                      inventorPorDia,
                      autocadPorDia,
                      maxRanurasInventor,
                    } = datosGrafico
                    const clave = diasPares[ctx.dataIndex]
                    const esDeInventor = clave?.endsWith("|inv") ?? false
                    const dia =
                      clave?.replace("|inv", "").replace("|cad", "") ?? ""
                    const indice = esDeInventor
                      ? ctx.datasetIndex
                      : ctx.datasetIndex - maxRanurasInventor
                    const sesion = esDeInventor
                      ? inventorPorDia.get(dia)?.[indice]
                      : autocadPorDia.get(dia)?.[indice]
                    const etiqueta = ctx.dataset.label
                    const nombre =
                      etiqueta && etiqueta !== ""
                        ? etiqueta
                        : esDeInventor
                          ? "Inventor"
                          : "AutoCAD"
                    if (sesion) {
                      const duracion = sesion.horaFin - sesion.horaInicio
                      const horas = Math.floor(duracion)
                      const minutos = Math.round((duracion - horas) * 60)
                      return ` ${nombre}: ${formatearHora(sesion.horaInicio)} - ${formatearHora(sesion.horaFin)} (${horas}h ${minutos}m)`
                    }
                    return ` ${nombre}: ${formatearHora(valor[0])} - ${formatearHora(valor[1])}`
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
                  text: "Hora del dia",
                  color: "#a0a0a0",
                },
              },
              x: {
                ticks: {
                  color: "#a0a0a0",
                  callback: (_, i) => {
                    const clave = datosGrafico.diasPares[i]
                    if (!clave) return ""
                    if (clave.endsWith("|inv")) {
                      return datosGrafico.etiquetasDias[Math.floor(i / 2)] ?? ""
                    }
                    return ""
                  },
                },
                grid: { color: "rgba(255,255,255,0.06)" },
              },
            },
          } as Parameters<typeof Bar>[0]["options"]
        }
      />
    )
  }
)
