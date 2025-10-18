import type { VercelRequest, VercelResponse } from '@vercel/node'

type RadarTier = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

type RadarAxis = {
  movementSlug: 'pushup' | 'squat' | 'pullup' | 'legraise' | 'bridge' | 'hspu'
  stepNo: number
  tier: RadarTier
  recentMedianReps?: number
  requiredReps?: number
  locked: boolean
  lockReason?: string
}

const demoResponse: RadarAxis[] = [
  {
    movementSlug: 'pushup',
    stepNo: 6,
    tier: 'INTERMEDIATE',
    recentMedianReps: 14,
    requiredReps: 16,
    locked: false,
  },
  {
    movementSlug: 'squat',
    stepNo: 8,
    tier: 'ADVANCED',
    recentMedianReps: 18,
    requiredReps: 20,
    locked: false,
  },
  {
    movementSlug: 'pullup',
    stepNo: 3,
    tier: 'BEGINNER',
    recentMedianReps: 6,
    requiredReps: 8,
    locked: true,
    lockReason: '器具なし',
  },
  {
    movementSlug: 'legraise',
    stepNo: 5,
    tier: 'INTERMEDIATE',
    recentMedianReps: 12,
    requiredReps: 12,
    locked: false,
  },
  {
    movementSlug: 'bridge',
    stepNo: 4,
    tier: 'BEGINNER',
    recentMedianReps: 10,
    requiredReps: 12,
    locked: false,
  },
  {
    movementSlug: 'hspu',
    stepNo: 2,
    tier: 'BEGINNER',
    recentMedianReps: 5,
    requiredReps: 6,
    locked: true,
    lockReason: '壁スペースなし',
  },
]

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json(demoResponse)
}
