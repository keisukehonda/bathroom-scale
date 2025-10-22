import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropsWithChildren, AnchorHTMLAttributes } from 'react'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    NavLink: ({ children, ...props }: PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement>>) => (
      <a {...props}>{children}</a>
    ),
  }
})

import PTSettings from './PTSettings'
import { makeDefaultProgress } from '../../../lib/schemas/pt'

const renderSettings = () => render(<PTSettings />)

describe('PTSettings', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows the profile display name returned by the API', async () => {
    const mockFetch = vi.fn((input: RequestInfo | URL) => {
      if (input === '/api/pt/load') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            profile: { displayName: 'Alice', updatedAt: '2024-01-01T00:00:00.000Z' },
            progress: makeDefaultProgress(),
          }),
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })
    vi.stubGlobal('fetch', mockFetch)

    renderSettings()

    expect(await screen.findByText('Alice')).toBeInTheDocument()
  })

  it('falls back to Guest when the profile is malformed', async () => {
    const mockFetch = vi.fn((input: RequestInfo | URL) => {
      if (input === '/api/pt/load') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            profile: { updatedAt: '2024-01-01T00:00:00.000Z' } as unknown,
            progress: makeDefaultProgress(),
          }),
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })
    vi.stubGlobal('fetch', mockFetch)

    renderSettings()

    expect(await screen.findByText('Guest')).toBeInTheDocument()
  })
})
