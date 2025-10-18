export type RadarTier = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type RadarAxis = {
  movementSlug: 'pushup' | 'squat' | 'pullup' | 'legraise' | 'bridge' | 'hspu'
  stepNo: number
  tier: RadarTier
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
    const score = axis.locked ? 0 : toScore(axis.stepNo, axis.tier)
    return { ...axis, score }
  })
}

export async function getProfileRadarData(userId: string, today: string): Promise<RadarAxis[]> {
  const params = new URLSearchParams({ userId, today })
  const response = await fetch(`/api/pt/radar?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Failed to load radar data: ${response.statusText}`)
  }
  const payload = (await response.json()) as RadarAxis[]
  return payload
}
