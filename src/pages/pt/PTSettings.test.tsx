import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropsWithChildren, AnchorHTMLAttributes } from 'react'

import { api } from '../../lib/api'
import { DEFAULT_USER_ID } from '../../lib/pt/user'
import { saveStoredProfile } from '../../lib/pt/profileStorage'

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
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows the profile display name returned by the API', async () => {
    const loadUrl = api('/api/pt/load')
    const mockFetch = vi.fn((input: RequestInfo | URL) => {
      if (input === loadUrl) {
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
    const loadUrl = api('/api/pt/load')
    const mockFetch = vi.fn((input: RequestInfo | URL) => {
      if (input === loadUrl) {
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

  it('updates the current display name after a successful save', async () => {
    const loadUrl = api('/api/pt/load')
    const saveUrl = api('/api/pt/save')
    const mockFetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (input === loadUrl) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            profile: { displayName: 'Alice', updatedAt: '2024-01-01T00:00:00.000Z' },
            progress: makeDefaultProgress(),
          }),
        } as Response)
      }
      if (input === saveUrl) {
        const body = init?.body ? JSON.parse(init.body as string) : null
        if (!body || typeof body !== 'object') throw new Error('missing payload')
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true,
            profile: {
              displayName: body.profile.displayName,
              updatedAt: '2024-02-01T00:00:00.000Z',
            },
          }),
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })
    vi.stubGlobal('fetch', mockFetch)

    renderSettings()

    expect(await screen.findByDisplayValue('Alice')).toBeInTheDocument()

    const input = screen.getByLabelText(/表示名/)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.change(input, { target: { value: 'Bob' } })
    fireEvent.click(screen.getByRole('button', { name: '表示名を保存' }))

    const currentField = await screen.findByText('現在の表示名')
    expect(currentField.closest('.form-field')).toHaveTextContent('現在の表示名Bob')
  })

  it('restores the stored profile when loading fails', async () => {
    saveStoredProfile(DEFAULT_USER_ID, {
      displayName: 'Stored User',
      updatedAt: '2024-03-01T00:00:00.000Z',
    })

    const loadUrl = api('/api/pt/load')
    const mockFetch = vi.fn((input: RequestInfo | URL) => {
      if (input === loadUrl) {
        return Promise.resolve({
          ok: false,
          text: async () => 'failed',
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })
    vi.stubGlobal('fetch', mockFetch)

    renderSettings()

    expect(await screen.findByText('Stored User')).toBeInTheDocument()
  })
})
