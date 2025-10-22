import { describe, expect, it } from 'vitest'

import {
  DEFAULT_GENERATION_CONFIG,
  type MovementProgressMap,
  type RadarScoreMap,
  type PTGenerationConfig,
  generateDailyPlan,
} from './dailyPlan'

const BASE_PROGRESS: MovementProgressMap = {
  pushup: { step: 6, tier: 'INTERMEDIATE' },
  squat: { step: 7, tier: 'ADVANCED' },
  'leg-raise': { step: 5, tier: 'INTERMEDIATE' },
  pullup: { step: 3, tier: 'BEGINNER' },
  bridge: { step: 4, tier: 'BEGINNER' },
  'handstand-pushup': { step: 2, tier: 'BEGINNER' },
}

const EQUIPMENT = { hasPullupBar: true, hasWallSpace: true }
const RULES = { bridgeDependsOn: 'any-step5' as const }
const SCORES: RadarScoreMap = {
  pushup: 8,
  squat: 9,
  'leg-raise': 7,
  pullup: 5,
  bridge: 6,
  'handstand-pushup': 4,
}

describe('generateDailyPlan', () => {
  const date = '2024-05-15'

  it('respects the daily_max_movements limit', () => {
    const config: PTGenerationConfig = { ...DEFAULT_GENERATION_CONFIG, daily_max_movements: 2 }
    const plan = generateDailyPlan({
      date,
      config,
      progress: BASE_PROGRESS,
      equipment: EQUIPMENT,
      rules: RULES,
      radarScores: SCORES,
    })

    expect(plan.items).toHaveLength(2)
  })

  it('excludes movements that are locked due to rules, equipment, or rest', () => {
    const config: PTGenerationConfig = {
      ...DEFAULT_GENERATION_CONFIG,
      daily_max_movements: 4,
      include_locked_as_suggestions: false,
      min_rest_days_per_movement: 2,
    }

    const lockedByRule: MovementProgressMap = {
      ...BASE_PROGRESS,
      pushup: { step: 4, tier: 'BEGINNER' },
      squat: { step: 4, tier: 'BEGINNER' },
      'leg-raise': { step: 4, tier: 'BEGINNER' },
    }

    const plan = generateDailyPlan({
      date,
      config,
      progress: lockedByRule,
      equipment: { hasPullupBar: false, hasWallSpace: true },
      rules: RULES,
      radarScores: SCORES,
      lastSessions: {
        pushup: '2024-05-14',
      },
    })

    const movementIds = plan.items.map((item) => item.movementId)
    expect(movementIds).not.toContain('pullup')
    expect(movementIds).not.toContain('pushup')
    expect(movementIds).not.toContain('bridge')
  })

  it('boosts undertrained movements when prefer_undertrained is true', () => {
    const config: PTGenerationConfig = { ...DEFAULT_GENERATION_CONFIG, daily_max_movements: 2 }
    const skewedScores: RadarScoreMap = { ...SCORES, pullup: 2 }

    const plan = generateDailyPlan({
      date,
      config,
      progress: BASE_PROGRESS,
      equipment: EQUIPMENT,
      rules: RULES,
      radarScores: skewedScores,
    })

    expect(plan.items.map((item) => item.movementId)).toContain('pullup')
  })

  it('penalises recently trained movements when prefer_rotation_days is set', () => {
    const config: PTGenerationConfig = {
      ...DEFAULT_GENERATION_CONFIG,
      daily_max_movements: 2,
      prefer_rotation_days: 3,
    }

    const plan = generateDailyPlan({
      date,
      config,
      progress: BASE_PROGRESS,
      equipment: EQUIPMENT,
      rules: RULES,
      radarScores: SCORES,
      lastSessions: {
        pushup: '2024-05-14',
      },
    })

    expect(plan.items[0]?.movementId).not.toBe('pushup')
  })
})
