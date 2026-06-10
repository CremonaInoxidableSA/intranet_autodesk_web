import type { LogEntryDTO } from "@/lib/logParser"

export function getEntryDetail(entry: LogEntryDTO): string {
  const proc = entry.processName ?? ""
  const onVM = entry.source === "VM"

  switch (entry.type) {
    case "START":
      return onVM
        ? `${proc} iniciado en VM`
        : `${proc} iniciado en equipo físico`
    case "STOP":
      return onVM ? `${proc} cerrado en VM` : `${proc} cerrado`
    case "AUTO_STOP":
      return `${proc} — cierre automático (sin registro de cierre antes de las 17hs)`
    case "FORCED_STOP":
      return `VM apagada mientras ${proc} estaba activo`
    case "VM_ON":
      return "VM encendida"
    case "VM_OFF":
      return "VM apagada"
    case "VM_IDLE": {
      const until = entry.message?.match(/hasta (.+)\)/)?.[1]
      return until
        ? `VM encendida sin usar Autodesk (hasta ${until})`
        : "VM encendida sin uso de Autodesk"
    }
    default:
      return entry.message ?? ""
  }
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function exportToExcelMultiSheet(
  sheets: { name: string; rows: Record<string, unknown>[] }[],
  filename: string
) {
  import("xlsx").then(({ utils, writeFile }) => {
    const wb = utils.book_new()
    for (const { name, rows } of sheets) {
      const ws = utils.json_to_sheet(rows)
      utils.book_append_sheet(wb, ws, name)
    }
    writeFile(wb, `${filename}.xlsx`)
  })
}
