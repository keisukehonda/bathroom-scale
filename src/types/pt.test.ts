import { describe, expect, it } from 'vitest'

import { PROFILE_FALLBACK_DISPLAY_NAME } from '../../lib/schemas/pt'
import { isProfile, safeDisplayName } from './pt'

describe('isProfile', () => {
  it('identifies profile-like objects', () => {
    expect(
      isProfile({ displayName: 'Alice', updatedAt: '2024-01-01T00:00:00.000Z' }),
    ).toBe(true)
  })

  it('rejects primitives and partial objects', () => {
    expect(isProfile(null)).toBe(false)
    expect(isProfile({ displayName: 'Bob' })).toBe(false)
    expect(isProfile({ updatedAt: '2024-01-01T00:00:00.000Z' })).toBe(false)
  })
})

describe('safeDisplayName', () => {
  it('returns the provided string when non-empty', () => {
    expect(safeDisplayName('Alice')).toBe('Alice')
  })

  it('falls back to the guest display name for empty or invalid input', () => {
    expect(safeDisplayName('   ')).toBe(PROFILE_FALLBACK_DISPLAY_NAME)
    expect(safeDisplayName(null)).toBe(PROFILE_FALLBACK_DISPLAY_NAME)
    expect(safeDisplayName(undefined)).toBe(PROFILE_FALLBACK_DISPLAY_NAME)
    expect(safeDisplayName({})).toBe(PROFILE_FALLBACK_DISPLAY_NAME)
    expect(safeDisplayName([])).toBe(PROFILE_FALLBACK_DISPLAY_NAME)
  })

  it('reads displayName from profile objects defensively', () => {
    expect(
      safeDisplayName({ displayName: ' Charlie ', updatedAt: '2024-01-01T00:00:00.000Z' }),
    ).toBe('Charlie')
    expect(
      safeDisplayName({ displayName: '   ', updatedAt: '2024-01-01T00:00:00.000Z' }),
    ).toBe(PROFILE_FALLBACK_DISPLAY_NAME)
  })
})
