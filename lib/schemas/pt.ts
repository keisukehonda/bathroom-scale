import { z } from 'zod'

export const Tier = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const)
export type Tier = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export const MovementSlug = z.enum(['pushup', 'squat', 'pullup', 'legraise', 'bridge', 'hspu'] as const)
export type MovementSlug = 'pushup' | 'squat' | 'pullup' | 'legraise' | 'bridge' | 'hspu'

export const MovementProgress = z.object({
  slug: MovementSlug,
  stepNo: z.number().int().min(0).max(10),
  tier: Tier,
  score: z.number().min(0).max(10).optional(),
  updatedAt: z.string().datetime(),
})
export type MovementProgress = {
  slug: MovementSlug
  stepNo: number
  tier: Tier
  score?: number
  updatedAt: string
}

export const ProgressSchema = z.object({
  movements: z.array(MovementProgress).length(6),
  version: z.number().int().optional(),
})
export type Progress = {
  movements: MovementProgress[]
  version?: number
}

export const ProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(50),
  updatedAt: z.string().datetime(),
})
export type Profile = {
  displayName: string
  updatedAt: string
}

export const SavePayloadSchema = z.object({
  profile: ProfileSchema.optional(),
  progress: ProgressSchema.optional(),
})
export type SavePayload = {
  profile?: Profile
  progress?: Progress
}

export const MOVEMENT_SLUGS: MovementSlug[] = ['pushup', 'squat', 'pullup', 'legraise', 'bridge', 'hspu']

export const makeDefaultProfile = (): Profile => ({
  displayName: 'Guest',
  updatedAt: new Date().toISOString(),
})

export const makeDefaultProgress = (): Progress => {
  const now = new Date().toISOString()
  return {
    movements: MOVEMENT_SLUGS.map((slug) => ({
      slug,
      stepNo: 1,
      tier: 'BEGINNER',
      score: 0,
      updatedAt: now,
    })),
    version: 1,
  }
}

export const normaliseProgress = (input: Progress): Progress => {
  const now = new Date().toISOString()
  const map = new Map(input.movements.map((movement) => [movement.slug, movement]))
  const movements = MOVEMENT_SLUGS.map((slug) => {
    const entry = map.get(slug)
    if (!entry) {
      return {
        slug,
        stepNo: 1,
        tier: 'BEGINNER' as Tier,
        score: 0,
        updatedAt: now,
      }
    }
    const score =
      typeof entry.score === 'number'
        ? Math.min(10, Math.max(0, Number.isFinite(entry.score) ? entry.score : 0))
        : undefined
    return { ...entry, score }
  })
  return {
    movements,
    version: input.version ?? 1,
  }
}

export const normaliseProfile = (input: Profile): Profile => ({
  displayName: input.displayName.trim(),
  updatedAt: input.updatedAt,
})
