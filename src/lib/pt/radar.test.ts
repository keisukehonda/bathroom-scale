import { describe, expect, it } from 'vitest'

import { MOVEMENT_ORDER, toScore } from './radar'

describe('toScore', () => {
  it('returns tier score for step1 beginner', () => {
    expect(toScore(1, 'BEGINNER')).toBeCloseTo(0.33, 2)
  })

  it('returns tier score for step6 intermediate', () => {
    expect(toScore(6, 'INTERMEDIATE')).toBeCloseTo(5.67, 2)
  })

  it('caps the score at 10', () => {
    expect(toScore(10, 'ADVANCED')).toBe(10)
  })
})

describe('movement order', () => {
  it('maintains six radar axes', () => {
    expect(MOVEMENT_ORDER).toEqual(['pushup', 'squat', 'pullup', 'legraise', 'bridge', 'hspu'])
  })
})
