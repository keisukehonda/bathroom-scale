export type RadarTier = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type RadarAxis = {
  movementSlug: 'pushup' | 'squat' | 'pullup' | 'legraise' | 'bridge' | 'hspu'
  stepNo: number
  tier: RadarTier
  score?: number
  recentMedianReps?: number
  requiredReps?: number
  locked: boolean
  lockReason?: string
}

export const MOVEMENT_ORDER: RadarAxis['movementSlug'][] = [
  'pushup',
  'squat',
  'pullup',
  'legraise',
  'bridge',
  'hspu',
]

export type PreparedRadarAxis = RadarAxis & { score: number }

export function toScore(stepNo: number, tier: RadarTier) {
  const base = Math.max(stepNo - 1, 0)
  const tierBase = tier === 'BEGINNER' ? 1 / 3 : tier === 'INTERMEDIATE' ? 2 / 3 : 1
  return Math.min(10, parseFloat((base + tierBase).toFixed(2)))
}

export function prepareRadarAxes(data: RadarAxis[]): PreparedRadarAxis[] {
  const axesBySlug = new Map(data.map((axis) => [axis.movementSlug, axis]))
  return MOVEMENT_ORDER.map((slug) => {
    const axis = axesBySlug.get(slug)
    if (!axis) {
      return {
        movementSlug: slug,
        stepNo: 0,
        tier: 'BEGINNER',
        locked: true,
        score: 0,
      } as PreparedRadarAxis
    }
    const baseScore = typeof axis.score === 'number' ? axis.score : toScore(axis.stepNo, axis.tier)
    const clamped = Math.max(0, Math.min(10, Number.isFinite(baseScore) ? baseScore : 0))
    const score = axis.locked ? 0 : clamped
    return { ...axis, score }
  })
}


