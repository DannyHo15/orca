// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentStatusEntry } from '../../../../shared/agent-status-types'
import SleepyModeOverlay from './SleepyModeOverlay'

type SleepyStoreState = {
  sleepyModeActive: boolean
  setSleepyModeActive: (active: boolean) => void
  settings: { sleepyModeIdleMinutes: number }
  agentStatusByPaneKey: Record<string, AgentStatusEntry>
  agentStatusEpoch: number
  retainedAgentsByPaneKey: Record<string, unknown>
  petVisible: boolean
  petId: string
  customPets: never[]
}

const storeMocks = vi.hoisted(() => ({
  state: {
    sleepyModeActive: false,
    setSleepyModeActive: vi.fn(),
    settings: { sleepyModeIdleMinutes: 0 },
    agentStatusByPaneKey: {},
    agentStatusEpoch: 0,
    retainedAgentsByPaneKey: {},
    petVisible: true,
    petId: 'claude-the-mage',
    customPets: []
  }
}))

vi.mock('../../store', () => ({
  useAppStore: (selector: (state: SleepyStoreState) => unknown) => selector(storeMocks.state)
}))

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => true
}))

vi.mock('@/lib/agent-status-epoch-clock', () => ({
  getAgentStatusEpochNow: () => 1_000
}))

function entry(paneKey: string, state: AgentStatusEntry['state']): AgentStatusEntry {
  return { state, prompt: '', updatedAt: 1_000, stateStartedAt: 1_000, paneKey, stateHistory: [] }
}

function setState(next: Partial<SleepyStoreState>): void {
  Object.assign(storeMocks.state, next)
}

describe('SleepyModeOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setState({
      sleepyModeActive: false,
      setSleepyModeActive: vi.fn(),
      settings: { sleepyModeIdleMinutes: 0 },
      agentStatusByPaneKey: {}
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders nothing until it is active', () => {
    render(<SleepyModeOverlay />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('starts after the configured idle delay and not before', () => {
    setState({ settings: { sleepyModeIdleMinutes: 5 } })
    render(<SleepyModeOverlay />)

    act(() => {
      vi.advanceTimersByTime(299_000)
    })
    expect(storeMocks.state.setSleepyModeActive).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(storeMocks.state.setSleepyModeActive).toHaveBeenCalledWith(true)
  })

  it('does not start when auto-start is off', () => {
    render(<SleepyModeOverlay />)
    act(() => {
      vi.advanceTimersByTime(60 * 60_000)
    })
    expect(storeMocks.state.setSleepyModeActive).not.toHaveBeenCalled()
  })

  it('restarts the countdown on input', () => {
    setState({ settings: { sleepyModeIdleMinutes: 5 } })
    render(<SleepyModeOverlay />)

    act(() => {
      vi.advanceTimersByTime(299_000)
    })
    fireEvent.keyDown(window, { key: 'a' })
    act(() => {
      vi.advanceTimersByTime(299_000)
    })
    expect(storeMocks.state.setSleepyModeActive).not.toHaveBeenCalled()
  })

  it('shows the live fleet and wakes on a keypress', () => {
    setState({
      sleepyModeActive: true,
      agentStatusByPaneKey: { a: entry('a', 'working'), b: entry('b', 'waiting') }
    })
    render(<SleepyModeOverlay />)

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('1 working · 1 waiting')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'a' })
    expect(storeMocks.state.setSleepyModeActive).toHaveBeenCalledWith(false)
  })
})
