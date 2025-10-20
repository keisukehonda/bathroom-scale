import { toScore } from './radar'

export type Tier = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type PTGenerationConfig = {
  daily_max_movements: number
  allow_same_category_twice: boolean
  min_rest_days_per_movement: number
  prefer_undertrained: boolean
  prefer_rotation_days: number
  include_locked_as_suggestions: boolean
}

export const DEFAULT_GENERATION_CONFIG: PTGenerationConfig = {
  daily_max_movements: 2,
  allow_same_category_twice: false,
  min_rest_days_per_movement: 1,
  prefer_undertrained: true,
  prefer_rotation_days: 2,
  include_locked_as_suggestions: false,
}

export type MovementId =
  | 'pushup'
  | 'squat'
  | 'leg-raise'
  | 'pullup'
  | 'bridge'
  | 'handstand-pushup'

export type MovementCategory =
  | 'push'
  | 'pull'
  | 'legs'
  | 'core'
  | 'bridge'
  | 'skill'

export type MovementProgressSnapshot = {
  step: number
  tier: Tier
}

export type MovementProgressMap = Partial<Record<MovementId, MovementProgressSnapshot>>

export type EquipmentSnapshot = {
  hasPullupBar: boolean
  hasWallSpace: boolean
}

export type MovementRuleSnapshot = {
  bridgeDependsOn: 'any-step5' | 'none'
}

export type RadarScoreMap = Partial<Record<MovementId, number>>

export type DailyPlanItem = {
  movementId: MovementId
  stepId: string
  tier: Tier
  note?: string
  reasonTags: string[]
}

export type DailyPlanSuggestion = {
  movementId: MovementId
  reason: string
  tier: Tier
  stepId: string
}

export type DailyPlan = {
  date: string
  items: DailyPlanItem[]
  seed?: string
  lockedSuggestions?: DailyPlanSuggestion[]
}

export type StoredDailyPlan = DailyPlan & {
  rerollCount: number
}

type MovementDefinition = {
  id: MovementId
  name: string
  category: MovementCategory
  baseRank: number
  minRestDays: number
  requiredEquipment?: 'pullupBar' | 'wallSpace'
  unlockPredicate?: (input: {
    progress: MovementProgressMap
    rules: MovementRuleSnapshot
  }) => { unlocked: true } | { unlocked: false; reason: string }
}

const DEFAULT_MOVEMENTS: MovementDefinition[] = [
  {
    id: 'pushup',
    name: 'Pushup',
    category: 'push',
    baseRank: 10,
    minRestDays: 1,
  },
  {
    id: 'squat',
    name: 'Squat',
    category: 'legs',
    baseRank: 9.5,
    minRestDays: 1,
  },
  {
    id: 'pullup',
    name: 'Pullup',
    category: 'pull',
    baseRank: 9,
    minRestDays: 2,
    requiredEquipment: 'pullupBar',
  },
  {
    id: 'leg-raise',
    name: 'Leg Raise',
    category: 'core',
    baseRank: 8.5,
    minRestDays: 1,
  },
  {
    id: 'bridge',
    name: 'Bridge',
    category: 'bridge',
    baseRank: 8,
    minRestDays: 2,
    unlockPredicate: ({ progress, rules }) => {
      if (rules.bridgeDependsOn === 'none') return { unlocked: true }
      const candidates: MovementId[] = ['pushup', 'squat', 'leg-raise']
      const unlocked = candidates.some((slug) => (progress[slug]?.step ?? 0) >= 5)
      return unlocked
        ? { unlocked: true }
        : { unlocked: false, reason: '前提未達：Step5' }
    },
  },
  {
    id: 'handstand-pushup',
    name: 'Handstand Pushup',
    category: 'skill',
    baseRank: 7.5,
    minRestDays: 2,
    requiredEquipment: 'wallSpace',
  },
]

export const MOVEMENT_LOOKUP = DEFAULT_MOVEMENTS.reduce(
  (acc, movement) => acc.set(movement.id, movement),
  new Map<MovementId, MovementDefinition>(),
)

const STORAGE_KEY_PREFIX = 'pt-daily-plan'
const CONFIG_KEY_PREFIX = 'pt-generation-config'

const DAILY_MS = 24 * 60 * 60 * 1000

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const toStepId = (movementId: MovementId, step: number) => `${movementId}-step${step}`

const computeSeedBias = (movementId: MovementId, seed: string) => {
  const key = `${seed}:${movementId}`
  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 33 + key.charCodeAt(index)) % 1000003
  }
  const normalized = hash / 1000003
  return normalized * 0.6 - 0.3
}

type AvailabilityResult = {
  available: boolean
  reason?: string
  daysSinceLast?: number | null
}

const daysBetween = (recent: string | null | undefined, today: string): number | null => {
  if (!recent) return null
  const reference = new Date(`${today}T00:00:00Z`).getTime()
  const last = new Date(`${recent}T00:00:00Z`).getTime()
  if (Number.isNaN(reference) || Number.isNaN(last)) return null
  const diff = Math.floor((reference - last) / DAILY_MS)
  return diff < 0 ? 0 : diff
}

type AvailabilityInput = {
  movement: MovementDefinition
  config: PTGenerationConfig
  progress: MovementProgressMap
  equipment: EquipmentSnapshot
  rules: MovementRuleSnapshot
  lastSessions: Partial<Record<MovementId, string | null>>
  date: string
}

const evaluateAvailability = ({
  movement,
  config,
  progress,
  equipment,
  rules,
  lastSessions,
  date,
}: AvailabilityInput): AvailabilityResult => {
  const snapshot = progress[movement.id]
  if (!snapshot) {
    return { available: false, reason: '進捗未登録', daysSinceLast: null }
  }

  if (movement.requiredEquipment === 'pullupBar' && !equipment.hasPullupBar) {
    return { available: false, reason: '器具なし', daysSinceLast: null }
  }
  if (movement.requiredEquipment === 'wallSpace' && !equipment.hasWallSpace) {
    return { available: false, reason: '壁スペースなし', daysSinceLast: null }
  }

  if (movement.unlockPredicate) {
    const result = movement.unlockPredicate({ progress, rules })
    if (!result.unlocked) {
      return { available: false, reason: result.reason, daysSinceLast: null }
    }
  }

  const daysSinceLast = daysBetween(lastSessions[movement.id], date)
  const restThreshold = Math.max(movement.minRestDays, config.min_rest_days_per_movement)
  if (daysSinceLast !== null && daysSinceLast < restThreshold) {
    return { available: false, reason: '休息不足', daysSinceLast }
  }

  return { available: true, daysSinceLast }
}

type GenerateDailyPlanInput = {
  date: string
  config: PTGenerationConfig
  progress: MovementProgressMap
  equipment: EquipmentSnapshot
  rules: MovementRuleSnapshot
  radarScores?: RadarScoreMap
  lastSessions?: Partial<Record<MovementId, string | null>>
  seed?: string
  movements?: MovementDefinition[]
}

type RankedCandidate = {
  movement: MovementDefinition
  progress: MovementProgressSnapshot
  availability: AvailabilityResult
  rank: number
  note?: string
  reasonTags: string[]
}

const computeReasonTags = (
  tags: string[],
  include: Array<{ tag: string; condition: boolean }>,
): string[] => {
  const merged = new Set(tags)
  include.forEach(({ tag, condition }) => {
    if (condition) merged.add(tag)
  })
  return Array.from(merged)
}

export function generateDailyPlan(input: GenerateDailyPlanInput): DailyPlan {
  const {
    date,
    config,
    progress,
    equipment,
    rules,
    radarScores = {},
    lastSessions = {},
    seed = date,
    movements = DEFAULT_MOVEMENTS,
  } = input

  const plan: DailyPlan = {
    date,
    items: [],
    seed,
  }

  const lockedSuggestions: DailyPlanSuggestion[] = []

  const candidates: RankedCandidate[] = []

  movements.forEach((movement) => {
    const availability = evaluateAvailability({
      movement,
      config,
      progress,
      equipment,
      rules,
      lastSessions,
      date,
    })
    const progressSnapshot = progress[movement.id]
    if (!progressSnapshot) {
      if (config.include_locked_as_suggestions) {
        lockedSuggestions.push({
          movementId: movement.id,
          reason: '進捗未登録',
          tier: 'BEGINNER',
          stepId: toStepId(movement.id, 1),
        })
      }
      return
    }

    const score = clamp(radarScores[movement.id] ?? toScore(progressSnapshot.step, progressSnapshot.tier), 0, 10)

    if (!availability.available) {
      if (config.include_locked_as_suggestions) {
        lockedSuggestions.push({
          movementId: movement.id,
          reason: availability.reason ?? 'ロック中',
          tier: progressSnapshot.tier,
          stepId: toStepId(movement.id, progressSnapshot.step),
        })
      }
      return
    }

    let rank = movement.baseRank
    const reasonTags: string[] = ['available']
    const noteLines = new Set<string>()

    if (config.prefer_undertrained) {
      const bonus = (10 - score) * 0.5
      rank += bonus
      if (bonus > 0.5) {
        reasonTags.push('undertrained')
        noteLines.add('弱点優先')
      }
    }

    const daysSinceLast = availability.daysSinceLast ?? Number.POSITIVE_INFINITY
    if (config.prefer_rotation_days > 0 && Number.isFinite(daysSinceLast)) {
      if (daysSinceLast < config.prefer_rotation_days) {
        rank -= 2
      } else if (daysSinceLast >= config.prefer_rotation_days) {
        reasonTags.push('rotation')
        noteLines.add('ローテ優先')
      }
    } else if (!Number.isFinite(daysSinceLast)) {
      reasonTags.push('rotation')
      noteLines.add('ローテ優先')
    }

    rank += computeSeedBias(movement.id, seed)

    candidates.push({
      movement,
      progress: progressSnapshot,
      availability,
      rank,
      note: noteLines.size ? Array.from(noteLines).join(' / ') : undefined,
      reasonTags: computeReasonTags(reasonTags, []),
    })
  })

  candidates.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank
    return a.movement.name.localeCompare(b.movement.name)
  })

  const usedCategories = new Set<MovementCategory>()

  candidates.forEach((candidate) => {
    if (plan.items.length >= config.daily_max_movements) return
    if (!config.allow_same_category_twice && usedCategories.has(candidate.movement.category)) {
      return
    }

    plan.items.push({
      movementId: candidate.movement.id,
      stepId: toStepId(candidate.movement.id, candidate.progress.step),
      tier: candidate.progress.tier,
      note: candidate.note,
      reasonTags: candidate.reasonTags,
    })

    usedCategories.add(candidate.movement.category)
  })

  if (config.include_locked_as_suggestions && lockedSuggestions.length > 0) {
    plan.lockedSuggestions = lockedSuggestions
  }

  return plan
}

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const resolveStorage = (storage?: Storage | null) => {
  if (storage) return storage
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  return null
}

export function loadStoredDailyPlan(
  userId: string,
  date: string,
  storage?: Storage | null,
): StoredDailyPlan | null {
  const resolved = resolveStorage(storage)
  if (!resolved) return null
  const key = `${STORAGE_KEY_PREFIX}:${userId}:${date}`
  return safeParse<StoredDailyPlan | null>(resolved.getItem(key), null)
}

export function saveStoredDailyPlan(
  userId: string,
  plan: StoredDailyPlan,
  storage?: Storage | null,
) {
  const resolved = resolveStorage(storage)
  if (!resolved) return
  const key = `${STORAGE_KEY_PREFIX}:${userId}:${plan.date}`
  resolved.setItem(key, JSON.stringify(plan))
}

export function loadGenerationConfig(
  userId: string,
  storage?: Storage | null,
): PTGenerationConfig {
  const resolved = resolveStorage(storage)
  if (!resolved) return { ...DEFAULT_GENERATION_CONFIG }
  const key = `${CONFIG_KEY_PREFIX}:${userId}`
  const parsed = safeParse<PTGenerationConfig | null>(resolved.getItem(key), null)
  if (!parsed) return { ...DEFAULT_GENERATION_CONFIG }
  return { ...DEFAULT_GENERATION_CONFIG, ...parsed }
}

export function saveGenerationConfig(
  userId: string,
  config: PTGenerationConfig,
  storage?: Storage | null,
) {
  const resolved = resolveStorage(storage)
  if (!resolved) return
  const key = `${CONFIG_KEY_PREFIX}:${userId}`
  resolved.setItem(key, JSON.stringify(config))
}

export type DailyPlanContext = {
  config: PTGenerationConfig
  progress: MovementProgressMap
  equipment: EquipmentSnapshot
  rules: MovementRuleSnapshot
  radarScores: RadarScoreMap
}

export const DEFAULT_USER_ID = 'demo-user'

export const MOVEMENTS = DEFAULT_MOVEMENTS

