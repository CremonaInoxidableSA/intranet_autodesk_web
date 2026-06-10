"use client"

import { forwardRef, useMemo, type Ref } from "react"
import type { ProcessStatsDTO } from "@/lib/logParser"
import { Chart as ChartJS } from "chart.js"
import { Pie } from "react-chartjs-2"
import { esInventor, esAutocad } from "./chart-utils"

interface Propiedades {
  estadisticas: ProcessStatsDTO[]
}

export const GraficoTortaUso = forwardRef<ChartJS<"pie">, Propiedades>(
  function GraficoTortaUso({ estadisticas }, ref) {
    const datosTorta = useMemo(() => {
      const totalInventor = estadisticas
        .filter((s) => esInventor(s.processName))
        .reduce((acc, s) => acc + s.totalDurationSeconds, 0)
      const totalAutocad = estadisticas
        .filter((s) => esAutocad(s.processName))
        .reduce((acc, s) => acc + s.totalDurationSeconds, 0)
      const otros = estadisticas
        .filter((s) => !esInventor(s.processName) && !esAutocad(s.processName))
        .reduce((acc, s) => acc + s.totalDurationSeconds, 0)

      const etiquetas = ["Inventor", "AutoCAD"]
      const datos = [totalInventor, totalAutocad]
      const coloresFondo = ["rgba(239,130,37,0.85)", "rgba(48,160,240,0.85)"]
      const coloresBorde = ["#ef8225", "#30a0f0"]

      if (otros > 0) {
        etiquetas.push("Otros")
        datos.push(otros)
        coloresFondo.push("rgba(140,140,140,0.6)")
        coloresBorde.push("#8c8c8c")
      }

      return {
        labels: etiquetas,
        datasets: [
          {
            data: datos,
            backgroundColor: coloresFondo,
            borderColor: coloresBorde,
            borderWidth: 2,
          },
        ],
      }
    }, [estadisticas])

    const tieneDatos = datosTorta.datasets[0].data.some((v) => v > 0)

    if (!tieneDatos) {
      return (
        <p className="py-8 text-center text-muted-foreground">
          No se encontraron datos de Inventor o AutoCAD.
        </p>
      )
    }

    return (
      <div className="flex justify-center">
        <div style={{ maxWidth: 340, width: "100%" }}>
          <Pie
            ref={ref as Ref<any>}
            data={datosTorta}
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
                      const valor = ctx.raw as number
                      const total = (ctx.dataset.data as number[]).reduce(
                        (a, b) => a + b,
                        0
                      )
                      const porcentaje =
                        total > 0 ? ((valor / total) * 100).toFixed(1) : "0"
                      const horas = Math.floor(valor / 3600)
                      const minutos = Math.floor((valor % 3600) / 60)
                      return ` ${ctx.label}: ${porcentaje}% (${horas}h ${minutos}m)`
                    },
                  },
                },
              },
            }}
          />
        </div>
      </div>
    )
  }
)
