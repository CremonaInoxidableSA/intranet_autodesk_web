import * as fs from "fs"
import * as path from "path"

export const LOGS_DIR =
  process.env.DIRECTORIO_ARCHIVOS ?? "\\\\192.168.20.243\\Logs"

export type LogEntryType =
  | "START"
  | "STOP"
  | "AUTO_STOP"
  | "FORCED_STOP"
  | "VM_IDLE"
  | "VM_ON"
  | "VM_OFF"
  | "MONITOR_START"
  | "SISTEMA"

const AUTODESK_PROGRAMS = new Set([
  "AutoCAD",
  "Inventor",
  "Revit",
  "3ds Max",
  "Maya",
  "Fusion 360",
  "AutoCAD LT",
  "Civil 3D",
  "Plant 3D",
])

function isAutodeskProgram(name: string): boolean {
  if (AUTODESK_PROGRAMS.has(name)) return true
  const lower = name.toLowerCase()
  return (
    lower.includes("autocad") ||
    lower.includes("inventor") ||
    lower.includes("revit") ||
    lower.includes("autodesk")
  )
}

export interface LogEntryDTO {
  timestamp: string
  type: LogEntryType
  source?: string
  processName?: string
  status?: string
  pid?: number
  message?: string
}

export interface ProcessStatsDTO {
  processName: string
  totalSessions: number
  totalDurationSeconds: number
  avgPerDaySeconds: number
  avgPerWeekSeconds: number
  avgPerMonthSeconds: number
  daysWithUsage: number
  businessDaysInPeriod: number
  avgPerActiveDaySeconds: number
  avgPerBusinessDaySeconds: number
}

export interface LogDataResponse {
  entries: LogEntryDTO[]
  stats: ProcessStatsDTO[]
}

function isoWeek(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  )
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  )
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

function countBusinessDays(start: Date, end: Date): number {
  if (end < start) return 0
  let count = 0
  const cursor = new Date(start)
  cursor.setHours(12, 0, 0, 0)
  const finish = new Date(end)
  finish.setHours(12, 0, 0, 0)

  while (cursor <= finish) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
}

function countBusinessDaysInMonth(year: number, month: number): number {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  return countBusinessDays(firstDay, lastDay)
}

const BRACKETED_LINE =
  /^\[?(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]? - \[([^\]]+)\] - \[([^\]]+)\] - \[([^\]]+)\](?:\s*-\s*(.+))?$/
const PROCESS_LINE =
  /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) - (START|STOP)\s*-\s*(.+?)(?:\s*\((\d+)\))?$/
const MONITOR_LINE = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) - (=====.*=====)/
const SISTEMA_LINE =
  /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) - SISTEMA\s+-\s+(.+)/

const AUTO_STOP_MSG = "No se registró un cierre, registro automático a las 17hs"

function injectAutoStops(entries: LogEntryDTO[], now: Date): LogEntryDTO[] {
  const today = now.toISOString().slice(0, 10)
  const currentHour = now.getHours() + now.getMinutes() / 60
  const isDayClosed = (date: string) =>
    date < today || (date === today && currentHour >= 20)

  const autoStops: LogEntryDTO[] = []
  const openByName = new Map<string, string>()

  const flushPreviousDays = (currentDate: string) => {
    for (const [proc, startDate] of [...openByName.entries()]) {
      if (startDate < currentDate && isDayClosed(startDate)) {
        autoStops.push({
          timestamp: `${startDate} 17:00:00`,
          type: "AUTO_STOP",
          processName: proc,
          message: AUTO_STOP_MSG,
        })
        openByName.delete(proc)
      }
    }
  }

  for (const entry of entries) {
    const entryDate = entry.timestamp.slice(0, 10)
    flushPreviousDays(entryDate)

    if (entry.type === "START" && entry.processName) {
      openByName.set(entry.processName, entryDate)
    } else if (
      (entry.type === "STOP" ||
        entry.type === "AUTO_STOP" ||
        entry.type === "FORCED_STOP") &&
      entry.processName
    ) {
      openByName.delete(entry.processName)
    }
  }

  for (const [proc, startDate] of openByName) {
    if (isDayClosed(startDate)) {
      autoStops.push({
        timestamp: `${startDate} 17:00:00`,
        type: "AUTO_STOP",
        processName: proc,
        message: AUTO_STOP_MSG,
      })
    }
  }

  if (autoStops.length === 0) return entries
  return [...entries, ...autoStops].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  )
}

function injectVMForcedStops(entries: LogEntryDTO[]): LogEntryDTO[] {
  const openVMProgs = new Set<string>()
  const injected: LogEntryDTO[] = []

  for (const entry of entries) {
    if (entry.type === "MONITOR_START" && entry.source === "VM") {
      openVMProgs.clear()
    }

    const isVMOff =
      entry.type === "SISTEMA" &&
      entry.source === "HOST" &&
      entry.processName === "VM" &&
      (entry.status === "OFF" || entry.status === "STOPPING")

    if (isVMOff && openVMProgs.size > 0) {
      for (const proc of openVMProgs) {
        injected.push({
          timestamp: entry.timestamp,
          type: "FORCED_STOP",
          source: "VM",
          processName: proc,
          status: "FORCED_STOP",
          message: "VM apagada con programa activo",
        })
      }
      openVMProgs.clear()
    }

    if (
      entry.source === "VM" &&
      entry.processName &&
      isAutodeskProgram(entry.processName)
    ) {
      if (entry.type === "START") {
        openVMProgs.add(entry.processName)
      } else if (
        entry.type === "STOP" ||
        entry.type === "FORCED_STOP" ||
        entry.type === "AUTO_STOP"
      ) {
        openVMProgs.delete(entry.processName)
      }
    }
  }

  if (injected.length === 0) return entries
  return [...entries, ...injected].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  )
}

function buildDisplayEntries(entries: LogEntryDTO[]): LogEntryDTO[] {
  type VMSession = {
    startEntry: LogEntryDTO
    stopTimestamp: string | null
    hadPrograms: boolean
  }
  const vmSessions: VMSession[] = []
  let currentVMSession: VMSession | null = null

  for (const entry of entries) {
    if (entry.type === "MONITOR_START") {
      currentVMSession = null
      continue
    }
    if (
      entry.type === "SISTEMA" &&
      entry.source === "HOST" &&
      entry.processName === "VM"
    ) {
      if (entry.status === "RUNNING" && !currentVMSession) {
        currentVMSession = {
          startEntry: entry,
          stopTimestamp: null,
          hadPrograms: false,
        }
        vmSessions.push(currentVMSession)
      } else if (
        (entry.status === "OFF" || entry.status === "STOPPING") &&
        currentVMSession
      ) {
        currentVMSession.stopTimestamp = entry.timestamp
        currentVMSession = null
      }
      continue
    }
    if (
      currentVMSession &&
      entry.source === "VM" &&
      entry.type === "START" &&
      entry.processName &&
      isAutodeskProgram(entry.processName)
    ) {
      currentVMSession.hadPrograms = true
    }
  }

  const vmOnWithPrograms = new Set<string>(
    vmSessions.filter((s) => s.hadPrograms).map((s) => s.startEntry.timestamp)
  )
  const vmOffWithPrograms = new Map<string, LogEntryDTO>(
    vmSessions
      .filter((s) => s.hadPrograms && s.stopTimestamp)
      .map((s) => [s.stopTimestamp!, s.startEntry])
  )
  const vmIdleSessions = new Map<string, { stop: string }>(
    vmSessions
      .filter((s) => !s.hadPrograms && s.stopTimestamp)
      .map((s) => [s.startEntry.timestamp, { stop: s.stopTimestamp! }])
  )

  const display: LogEntryDTO[] = []

  for (const entry of entries) {
    if (entry.type === "MONITOR_START") continue

    if (
      entry.type === "SISTEMA" &&
      entry.source === "HOST" &&
      entry.processName === "VM"
    ) {
      if (entry.status === "RUNNING") {
        if (vmOnWithPrograms.has(entry.timestamp)) {
          display.push({
            ...entry,
            type: "VM_ON",
            message: "VM encendida",
          })
        } else if (vmIdleSessions.has(entry.timestamp)) {
          const idleStop = vmIdleSessions.get(entry.timestamp)!
          display.push({
            timestamp: entry.timestamp,
            type: "VM_IDLE",
            source: "HOST",
            processName: "VM",
            status: "SIN USO",
            message: `VM activa sin uso de Autodesk (hasta ${idleStop.stop})`,
          })
        }
      } else if (entry.status === "OFF" || entry.status === "STOPPING") {
        if (vmOffWithPrograms.has(entry.timestamp)) {
          display.push({
            ...entry,
            type: "VM_OFF",
            message: "VM apagada",
          })
        }
      }
      continue
    }

    if (entry.processName && isAutodeskProgram(entry.processName)) {
      if (
        entry.type === "START" ||
        entry.type === "STOP" ||
        entry.type === "AUTO_STOP" ||
        entry.type === "FORCED_STOP"
      ) {
        display.push(entry)
      }
    }
  }

  return display
}

export function getAvailablePCs(): string[] {
  const files = fs.readdirSync(LOGS_DIR)
  return files
    .filter((f) => f.endsWith(".txt"))
    .map((f) => f.slice(0, -".txt".length))
    .sort()
}

export function parseLogFile(pcName: string): LogDataResponse {
  if (!/^[\w\-. ]+$/.test(pcName)) {
    throw new Error("Invalid PC name")
  }

  const filePath = path.join(LOGS_DIR, `${pcName}.txt`)
  const content = fs.readFileSync(filePath, "utf-8")
  const lines = content.split(/\r?\n/).filter((l) => l.trim())

  const rawEntries: LogEntryDTO[] = []

  for (const line of lines) {
    const bracketed = line.match(BRACKETED_LINE)
    if (bracketed) {
      const [, timestamp, source, subject, action, extra] = bracketed
      const normalizedAction = action.trim().toUpperCase()
      const status = action.trim()
      const message = extra ? `${action} - ${extra}` : action

      if (normalizedAction === "START" || normalizedAction === "STOP") {
        rawEntries.push({
          timestamp,
          type: normalizedAction as "START" | "STOP",
          source: source.trim(),
          processName: subject.trim(),
          status,
          message: extra?.trim(),
        })
        continue
      }

      if (
        normalizedAction === "MONITOR_START" ||
        (subject.trim().toUpperCase() === "MONITOR" &&
          normalizedAction === "INICIO")
      ) {
        rawEntries.push({
          timestamp,
          type: "MONITOR_START",
          source: source.trim(),
          processName: subject.trim(),
          status,
          message: extra?.trim() ?? action.trim(),
        })
        continue
      }

      rawEntries.push({
        timestamp,
        type: "SISTEMA",
        source: source.trim(),
        processName: subject.trim(),
        status,
        message,
      })
      continue
    }

    const pm = line.match(PROCESS_LINE)
    if (pm) {
      rawEntries.push({
        timestamp: pm[1],
        type: pm[2] as "START" | "STOP",
        processName: pm[3].trim(),
        status: pm[2],
        pid: pm[4] !== undefined ? parseInt(pm[4], 10) : undefined,
      })
      continue
    }
    const mm = line.match(MONITOR_LINE)
    if (mm) {
      rawEntries.push({
        timestamp: mm[1],
        type: "MONITOR_START",
        message: mm[2],
      })
      continue
    }
    const sm = line.match(SISTEMA_LINE)
    if (sm) {
      rawEntries.push({
        timestamp: sm[1],
        type: "SISTEMA",
        message: sm[2],
      })
    }
  }

  const entries: LogEntryDTO[] = []
  const lastTypeByProcess = new Map<string, "START" | "STOP">()
  for (const entry of rawEntries) {
    if (entry.type === "MONITOR_START") {
      lastTypeByProcess.clear()
      entries.push(entry)
      continue
    }
    if (
      (entry.type === "START" || entry.type === "STOP") &&
      entry.processName
    ) {
      const key = `${entry.source ?? ""}:${entry.processName}`
      const last = lastTypeByProcess.get(key)
      if (last === entry.type) {
        continue
      }
      lastTypeByProcess.set(key, entry.type)
    }
    entries.push(entry)
  }

  const withForcedStops = injectVMForcedStops(entries)
  const finalEntries = injectAutoStops(withForcedStops, new Date())

  type OpenProcess = { name: string; startTime: Date }
  const open = new Map<number, OpenProcess>()

  type Session = {
    processName: string
    startTime: Date
    endTime: Date
    durationSeconds: number
  }
  const sessions: Session[] = []

  const openByName = new Map<string, OpenProcess[]>()

  for (const entry of finalEntries) {
    if (entry.type === "START" && entry.processName) {
      const proc: OpenProcess = {
        name: entry.processName,
        startTime: new Date(entry.timestamp),
      }
      if (entry.pid !== undefined) {
        open.set(entry.pid, proc)
      } else {
        const stack = openByName.get(entry.processName) ?? []
        stack.push(proc)
        openByName.set(entry.processName, stack)
      }
    } else if (
      entry.type === "STOP" ||
      entry.type === "AUTO_STOP" ||
      entry.type === "FORCED_STOP"
    ) {
      if (entry.pid !== undefined) {
        const proc = open.get(entry.pid)
        if (proc) {
          const endTime = new Date(entry.timestamp)
          const durationSeconds =
            (endTime.getTime() - proc.startTime.getTime()) / 1_000
          sessions.push({
            processName: proc.name,
            startTime: proc.startTime,
            endTime: new Date(entry.timestamp),
            durationSeconds,
          })
          open.delete(entry.pid)
        }
      } else if (entry.processName) {
        const stack = openByName.get(entry.processName)
        if (stack && stack.length > 0) {
          const proc = stack.shift()!
          const endTime = new Date(entry.timestamp)
          const durationSeconds =
            (endTime.getTime() - proc.startTime.getTime()) / 1_000
          sessions.push({
            processName: proc.name,
            startTime: proc.startTime,
            endTime: new Date(entry.timestamp),
            durationSeconds,
          })
        }
      }
    }
  }

  const byProcess = new Map<string, Session[]>()
  for (const s of sessions) {
    const list = byProcess.get(s.processName) ?? []
    list.push(s)
    byProcess.set(s.processName, list)
  }

  const stats: ProcessStatsDTO[] = []
  for (const [processName, list] of byProcess) {
    if (!isAutodeskProgram(processName)) continue
    const totalDuration = list.reduce((acc, s) => acc + s.durationSeconds, 0)

    const days = new Set<string>()
    const weeks = new Set<string>()
    const months = new Set<string>()

    for (const s of list) {
      const d = s.startTime
      days.add(d.toISOString().slice(0, 10))
      days.add(s.endTime.toISOString().slice(0, 10))
      weeks.add(isoWeek(d))
      months.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      )
    }

    const businessDaysInPeriod = Array.from(months)
      .map((monthStr) => {
        const [year, month] = monthStr.split("-").map(Number)
        return countBusinessDaysInMonth(year, month - 1)
      })
      .reduce((a, b) => a + b, 0)

    stats.push({
      processName,
      totalSessions: list.length,
      totalDurationSeconds: totalDuration,
      avgPerDaySeconds: days.size > 0 ? totalDuration / days.size : 0,
      avgPerWeekSeconds: weeks.size > 0 ? totalDuration / weeks.size : 0,
      avgPerMonthSeconds: months.size > 0 ? totalDuration / months.size : 0,
      daysWithUsage: days.size,
      businessDaysInPeriod,
      avgPerActiveDaySeconds: days.size > 0 ? totalDuration / days.size : 0,
      avgPerBusinessDaySeconds:
        businessDaysInPeriod > 0 ? totalDuration / businessDaysInPeriod : 0,
    })
  }

  stats.sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds)

  return { entries: buildDisplayEntries(finalEntries), stats }
}
