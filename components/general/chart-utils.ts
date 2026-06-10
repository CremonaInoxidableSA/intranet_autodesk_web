import type { LogEntryDTO } from "@/lib/logParser"

export interface Sesion {
  nombrePrograma: string
  fecha: string
  horaInicio: number
  horaFin: number
}

export interface GruposSesionesPorDia {
  porDia: Map<string, Sesion[]>
  maxRanuras: number
}

export const COLOR_INVENTOR = {
  fondo: "rgba(239,130,37,0.80)",
  borde: "#ef8225",
} as const

export const COLOR_AUTOCAD = {
  fondo: "rgba(48,160,240,0.80)",
  borde: "#30a0f0",
} as const

export const esInventor = (nombre: string): boolean =>
  nombre.toLowerCase().includes("inventor")

export const esAutocad = (nombre: string): boolean =>
  nombre.toLowerCase().includes("autocad") ||
  nombre.toLowerCase().includes("acad")

export const parsearHora = (timestamp: string): number => {
  const parteTiempo = timestamp.split(" ")[1] ?? "00:00:00"
  const [h, m, s] = parteTiempo.split(":").map(Number)
  return h + m / 60 + (s ?? 0) / 3600
}

export const formatearHora = (h: number): string => {
  const horas = Math.floor(h)
  const minutos = Math.round((h - horas) * 60)
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`
}

export function extraerSesiones(entradas: LogEntryDTO[]): Sesion[] {
  type ProcesoAbierto = { nombre: string; timestampInicio: string }
  const abiertosPorPid = new Map<number, ProcesoAbierto>()
  const abiertosPorNombre = new Map<string, ProcesoAbierto[]>()
  const sesiones: Sesion[] = []

  for (const entrada of entradas) {
    if (entrada.type === "START" && entrada.processName) {
      const proceso: ProcesoAbierto = {
        nombre: entrada.processName,
        timestampInicio: entrada.timestamp,
      }
      if (entrada.pid !== undefined) {
        abiertosPorPid.set(entrada.pid, proceso)
      } else {
        const pila = abiertosPorNombre.get(entrada.processName) ?? []
        pila.push(proceso)
        abiertosPorNombre.set(entrada.processName, pila)
      }
    } else if (
      (entrada.type === "STOP" ||
        entrada.type === "AUTO_STOP" ||
        entrada.type === "FORCED_STOP") &&
      entrada.processName
    ) {
      if (entrada.pid !== undefined) {
        const proceso = abiertosPorPid.get(entrada.pid)
        if (proceso) {
          sesiones.push({
            nombrePrograma: proceso.nombre,
            fecha: proceso.timestampInicio.slice(0, 10),
            horaInicio: parsearHora(proceso.timestampInicio),
            horaFin: parsearHora(entrada.timestamp),
          })
          abiertosPorPid.delete(entrada.pid)
        }
      } else {
        const pila = abiertosPorNombre.get(entrada.processName)
        if (pila && pila.length > 0) {
          const proceso = pila.shift()!
          sesiones.push({
            nombrePrograma: proceso.nombre,
            fecha: proceso.timestampInicio.slice(0, 10),
            horaInicio: parsearHora(proceso.timestampInicio),
            horaFin: parsearHora(entrada.timestamp),
          })
        }
      }
    }
  }

  return sesiones
}

export function construirDiasEnRango(desde: string, hasta: string): string[] {
  const dias: string[] = []
  const actual = new Date(desde + "T00:00:00")
  const fin = new Date(hasta + "T00:00:00")
  while (actual <= fin) {
    dias.push(actual.toISOString().slice(0, 10))
    actual.setDate(actual.getDate() + 1)
  }
  return dias
}

export function construirEtiquetasDias(dias: string[]): string[] {
  return dias.map((d) => {
    const [a, m, dia] = d.split("-").map(Number)
    return new Date(a, m - 1, dia).toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  })
}

export function agruparSesionesPorDia(
  sesiones: Sesion[]
): Map<string, Sesion[]> {
  const map = new Map<string, Sesion[]>()
  for (const s of sesiones) {
    const list = map.get(s.fecha) ?? []
    list.push(s)
    map.set(s.fecha, list)
  }
  return map
}

export function agruparSesionesDePrograma(
  todasLasSesiones: Sesion[],
  dias: string[],
  fechaDesde: string,
  fechaHasta: string,
  filtro: (nombre: string) => boolean
): GruposSesionesPorDia {
  const filtradas = todasLasSesiones.filter(
    (s) =>
      filtro(s.nombrePrograma) && s.fecha >= fechaDesde && s.fecha <= fechaHasta
  )
  const porDia = agruparSesionesPorDia(filtradas)
  const maxRanuras = Math.max(0, ...dias.map((d) => porDia.get(d)?.length ?? 0))
  return { porDia, maxRanuras }
}

export function obtenerRangoSemanaActual(): { desde: string; hasta: string } {
  const ahora = new Date()
  const dia = ahora.getDay()
  const lunes = new Date(ahora)
  lunes.setDate(ahora.getDate() - (dia === 0 ? 6 : dia - 1))
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)
  return {
    desde: lunes.toISOString().slice(0, 10),
    hasta: domingo.toISOString().slice(0, 10),
  }
}

export function graficoAImagenPNG(grafico: {
  canvas: HTMLCanvasElement
}): string {
  const fuente = grafico.canvas
  const lienzo = document.createElement("canvas")
  lienzo.width = fuente.width
  lienzo.height = fuente.height
  const ctx = lienzo.getContext("2d")!
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, lienzo.width, lienzo.height)
  ctx.drawImage(fuente, 0, 0)
  return lienzo.toDataURL("image/png")
}
