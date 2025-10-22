import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes, PropsWithChildren } from 'react'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    NavLink: ({ children, ...props }: PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement>>) => (
      <a {...props}>{children}</a>
    ),
  }
})

import PTDashboard from './PTDashboard'
import { makeDefaultProgress } from '../../../lib/schemas/pt'

const renderDashboard = () => render(<PTDashboard />)

describe('PTDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders the display name returned by the API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: { displayName: 'Alice', updatedAt: '2024-01-01T00:00:00.000Z' },
        progress: makeDefaultProgress(),
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    renderDashboard()

    expect(await screen.findByText('現在の表示名: Alice')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith('/api/pt/load')
  })

  it('falls back to a safe display name when the API response is malformed', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: { updatedAt: '2024-01-01T00:00:00.000Z' } as unknown,
        progress: makeDefaultProgress(),
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    renderDashboard()

    expect(await screen.findByText('現在の表示名: Guest')).toBeInTheDocument()
  })
})
