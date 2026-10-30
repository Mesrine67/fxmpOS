"use client"

import { useEffect, useRef, useState } from "react"
import { invoke, isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react"

type InputSnapshot = {
  x: number
  y: number
  normalizedX: number
  normalizedY: number
  deltaX: number
  deltaY: number
  scrollDelta: number
  cursorVisible: boolean
  mouseButtons: string[]
  pressedKeys: string[]
}

const rows = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
]

const emptySnapshot: InputSnapshot = {
  x: 0, y: 0, normalizedX: 0, normalizedY: 0, deltaX: 0, deltaY: 0,
  scrollDelta: 0, cursorVisible: false, mouseButtons: [], pressedKeys: [],
}

export function InputViewerOverlay() {
  const [snapshot, setSnapshot] = useState(emptySnapshot)
  const [collapsed, setCollapsed] = useState(false)
  const inFlight = useRef(false)

  useEffect(() => {
    document.documentElement.dataset.fxmpInputViewer = "true"
    if (!isTauri()) return () => { delete document.documentElement.dataset.fxmpInputViewer }
    let active = true
    const sample = async () => {
      if (!active || inFlight.current || document.visibilityState !== "visible") return
      inFlight.current = true
      try {
        const current = await invoke<InputSnapshot>("get_input_snapshot")
        if (active) setSnapshot(current)
      } catch (cause) {
        console.error("Impossible de lire l’état actuel de la souris et du clavier", cause)
      } finally {
        inFlight.current = false
      }
    }
    const timer = window.setInterval(() => void sample(), 50)
    void sample()
    return () => {
      active = false
      window.clearInterval(timer)
      delete document.documentElement.dataset.fxmpInputViewer
    }
  }, [])

  const close = async () => {
    if (isTauri()) await invoke("set_input_viewer_state", { visible: false })
  }
  const startDragging = () => {
    if (isTauri()) void getCurrentWindow().startDragging()
  }
  const pressed = new Set(snapshot.pressedKeys)
  const buttons = new Set(snapshot.mouseButtons)

  return (
    <main className="flex h-screen w-screen items-center justify-center overflow-hidden bg-transparent p-2 text-[#ededed]">
      <section aria-label="Input Viewer" className="input-viewer-panel h-full w-full overflow-hidden rounded-[8px] border border-[#343434] bg-[#090909]/95 shadow-2xl">
        <header className="flex h-8 select-none items-center gap-2 bg-[#191919] px-3 text-[11px] text-[#e5e5e5]">
          <span aria-hidden="true" className="flex flex-1 items-center gap-2" onMouseDown={startDragging}>
          <button aria-label={collapsed ? "Développer Input Viewer" : "Réduire Input Viewer"} className="flex size-5 items-center justify-center text-white/65 hover:text-white" onClick={() => setCollapsed((value) => !value)} type="button">
            {collapsed ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
          </button>
          <span>Input Viewer</span>
          </span>
          <button aria-label="Fermer Input Viewer" className="flex size-5 items-center justify-center text-white/60 hover:text-white" onClick={() => void close()} type="button"><XIcon className="size-3.5" /></button>
        </header>

        {!collapsed && <div className="h-[calc(100%-2rem)] overflow-y-auto px-3.5 py-3 text-[11px]">
          <h2 className="border-b border-white/10 pb-2 text-[13px] font-medium">Mouse Info</h2>
          <div className="grid gap-3 py-3 font-mono text-[10px] text-white/75">
            <p>Position: ({snapshot.x.toFixed(3)}, {snapshot.y.toFixed(3)})</p>
            <p>Normal Position: ({snapshot.normalizedX.toFixed(3)}, {snapshot.normalizedY.toFixed(3)})</p>
            <p>Delta: ({snapshot.deltaX.toFixed(3)}, {snapshot.deltaY.toFixed(3)})</p>
            <p>Scroll Delta: {snapshot.scrollDelta}</p>
          </div>

          <div className="flex h-9 items-center gap-2.5">
            <span aria-hidden="true" className={`flex size-7 items-center justify-center rounded-md ${snapshot.cursorVisible ? "bg-[#293d24] text-[#78c850]" : "bg-[#252525] text-white/45"}`}>{snapshot.cursorVisible ? "✓" : "–"}</span>
            <span>Show Cursor?</span>
          </div>
          <p className="pb-3 pt-1 text-[10px] text-white/55">Cursor Style: {snapshot.cursorVisible ? "Windows pointer" : "Hidden"}</p>

          <div className="border-b border-white/10 pb-3">
            <p className="font-semibold">Buttons:</p>
            <div className="flex gap-3 px-5 pt-2 text-[10px] text-white/40">
              {["Left", "Middle", "Right"].map((button) => <span className={buttons.has(button) ? "font-semibold text-[#78c850]" : ""} key={button}>{button}</span>)}
            </div>
          </div>

          <h2 className="mt-4 border-b border-white/10 pb-2 text-[13px] font-medium">Keyboard Info</h2>
          <div aria-label="Touches actuellement maintenues" className="flex flex-col gap-2.5 py-4">
            {rows.map((row) => <div className="flex justify-center gap-1.5" key={row.join("")}>{row.map((key) => <span aria-label={pressed.has(key) ? `${key} pressée` : key} className={`flex h-5 min-w-4 items-center justify-center rounded-sm px-0.5 font-mono text-[9px] ${pressed.has(key) ? "bg-[#355d31] text-white" : "text-white/45"}`} key={key}>{key}</span>)}</div>)}
          </div>
          <div className="flex justify-center gap-3 pb-1 text-[9px] text-white/50">{["Ctrl", "Alt", "Space", "Shift", "↑", "←", "↓", "→"].map((key) => <span className={pressed.has(key) ? "text-[#78c850]" : ""} key={key}>{key}</span>)}</div>
        </div>}
      </section>
    </main>
  )
}
