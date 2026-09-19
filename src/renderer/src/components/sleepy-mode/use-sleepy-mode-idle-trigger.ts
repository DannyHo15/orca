import { useEffect } from 'react'

/** Input events that count as "the user is still here". Pointer moves are included so a
 *  mouse nudge behaves like every other screensaver. */
const ACTIVITY_EVENTS = ['keydown', 'pointerdown', 'pointermove', 'wheel', 'touchstart'] as const

/**
 * Fires `onIdle` once after `delayMs` without renderer input. Disabled while `delayMs` is 0
 * (auto-start off) or `suspended` (the scene is already up).
 */
export function useSleepyModeIdleTrigger({
  delayMs,
  suspended,
  onIdle
}: {
  delayMs: number
  suspended: boolean
  onIdle: () => void
}): void {
  useEffect(() => {
    if (delayMs <= 0 || suspended) {
      return
    }

    // One controller owns every listener, so the cleanup can't miss one.
    const controller = new AbortController()
    let timer = window.setTimeout(onIdle, delayMs)
    const restart = (): void => {
      window.clearTimeout(timer)
      timer = window.setTimeout(onIdle, delayMs)
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, restart, { passive: true, signal: controller.signal })
    }
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [delayMs, suspended, onIdle])
}
