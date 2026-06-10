import type { LogEntryType } from "@/lib/logParser"
import { Badge as ShadBadge } from "@/components/ui/badge"

const BADGE_CONFIG: Record<LogEntryType, { label: string; className: string }> =
  {
    START: {
      label: "START",
      className:
        "bg-greencremona/20 text-greencremona border-greencremona/30 hover:bg-greencremona/30 rounded",
    },
    STOP: {
      label: "STOP",
      className:
        "bg-redcremona/20 text-redcremona border-redcremona/30 hover:bg-redcremona/30 rounded",
    },
    AUTO_STOP: {
      label: "AUTO",
      className:
        "bg-orangecremona/20 text-orangecremona border-orangecremona/30 hover:bg-orangecremona/30 rounded",
    },
    FORCED_STOP: {
      label: "VM APAGADA",
      className:
        "bg-redcremona/20 text-redcremona border-redcremona/50 hover:bg-redcremona/30 rounded",
    },
    VM_IDLE: {
      label: "VM SIN USO",
      className:
        "bg-yellowcremona/20 text-yellowcremona border-yellowcremona/30 hover:bg-yellowcremona/30 rounded",
    },
    SISTEMA: {
      label: "SISTEMA",
      className:
        "bg-yellowcremona/20 text-yellowcremona border-yellowcremona/30 hover:bg-yellowcremona/30 rounded",
    },
    MONITOR_START: {
      label: "INICIO",
      className:
        "bg-bluecremona/20 text-bluecremona border-bluecremona/30 hover:bg-bluecremona/30 rounded",
    },
  }

export function Badge({ type }: { type: LogEntryType }) {
  const config = BADGE_CONFIG[type] ?? BADGE_CONFIG.MONITOR_START
  return (
    <ShadBadge variant="outline" className={config.className}>
      {config.label}
    </ShadBadge>
  )
}
