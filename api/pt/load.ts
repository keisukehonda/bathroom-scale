import type { VercelRequest, VercelResponse } from '@vercel/node'

const defaultResponse = {
  equipment: {
    hasPullupBar: false,
    hasWallSpace: false,
  },
  progress: {
    pushup: { step: 1, tier: 'BEGINNER' },
    squat: { step: 1, tier: 'BEGINNER' },
    'leg-raise': { step: 1, tier: 'BEGINNER' },
    pullup: { step: 1, tier: 'BEGINNER' },
    bridge: { step: 1, tier: 'BEGINNER' },
    'handstand-pushup': { step: 1, tier: 'BEGINNER' },
  },
  rules: {
    bridgeDependsOn: 'any-step5',
  },
}

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json(defaultResponse)
}
