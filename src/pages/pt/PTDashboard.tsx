import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import PTRadar from '../../components/PTRadar'
import type { RadarAxis } from '../../lib/pt/radar'
import {
  makeDefaultProfile,
  makeDefaultProgress,
  normaliseProgress,
  type MovementProgress,
  type Profile,
  type Progress as ProgressPayload,
  type Tier,
} from '../../../lib/schemas/pt'

type PTLoadResponse = {
  profile?: Profile
  progress?: ProgressPayload
}

type PTSettings = {
  equipment: {
    hasPullupBar: boolean
    hasWallSpace: boolean
  }
  rules: {
    bridgeDependsOn: 'any-step5' | 'none'
  }
}

type MovementMeta = {
  name: string
  slug: string
  progressSlug: RadarAxis['movementSlug']
  requires?: 'bar' | 'wall'
}

const MOVEMENTS: MovementMeta[] = [
  { name: 'Pushup', slug: 'pushup', progressSlug: 'pushup' },
  { name: 'Squat', slug: 'squat', progressSlug: 'squat' },
  { name: 'Leg Raise', slug: 'leg-raise', progressSlug: 'legraise' },
  { name: 'Pullup', slug: 'pullup', progressSlug: 'pullup', requires: 'bar' },
  { name: 'Bridge', slug: 'bridge', progressSlug: 'bridge' },
  { name: 'Handstand Pushup', slug: 'handstand-pushup', progressSlug: 'hspu', requires: 'wall' },
]

const RADAR_TO_ROUTE: Record<RadarAxis['movementSlug'], MovementMeta['slug']> = {
  pushup: 'pushup',
  squat: 'squat',
  pullup: 'pullup',
  legraise: 'leg-raise',
  bridge: 'bridge',
  hspu: 'handstand-pushup',
}

const DEFAULT_SETTINGS: PTSettings = {
  equipment: {
    hasPullupBar: false,
    hasWallSpace: false,
  },
  rules: {
    bridgeDependsOn: 'any-step5',
  },
}

type ProgressState = {
  movements: MovementProgress[]
  version: number
}

const createDefaultProgressState = (): ProgressState => {
  const base: ProgressPayload = makeDefaultProgress()
  const movements = MOVEMENTS.map((movement) => {
    const entry = base.movements.find((item: MovementProgress) => item.slug === movement.progressSlug)
    if (entry) return entry
    return {
      slug: movement.progressSlug,
      stepNo: 1,
      tier: 'BEGINNER',
      score: 0,
      updatedAt: new Date().toISOString(),
    } satisfies MovementProgress
  })
  return {
    movements,
    version: base.version ?? 1,
  }
}

const buildProgressState = (payload: ProgressPayload | null | undefined): ProgressState => {
  if (!payload) return createDefaultProgressState()
  const normalised: ProgressPayload = normaliseProgress(payload)
  const movements = MOVEMENTS.map((movement) => {
    const entry = normalised.movements.find((item: MovementProgress) => item.slug === movement.progressSlug)
    if (entry) return entry
    return {
      slug: movement.progressSlug,
      stepNo: 1,
      tier: 'BEGINNER',
      score: 0,
      updatedAt: new Date().toISOString(),
    } satisfies MovementProgress
  })
  return {
    movements,
    version: normalised.version ?? 1,
  }
}

const TIER_LABEL: Record<Tier, string> = {
  BEGINNER: '初級',
  INTERMEDIATE: '中級',
  ADVANCED: '上級',
}

type Availability = {
  available: boolean
  reason?: string
}

const checkBridgeUnlocked = (
  progress: Record<string, MovementProgress | undefined>,
  rule: PTSettings['rules']['bridgeDependsOn'],
) => {
  if (rule === 'none') return true
  const required = ['pushup', 'squat', 'leg-raise']
  return required.some((slug) => (progress[slug]?.stepNo ?? 0) >= 5)
}

const getAvailability = (
  movement: MovementMeta,
  settings: PTSettings,
  progress: Record<string, MovementProgress | undefined>,
): Availability => {
  const { equipment, rules } = settings

  if (movement.requires === 'bar' && !equipment.hasPullupBar) {
    return { available: false, reason: '器具なし' }
  }
  if (movement.requires === 'wall' && !equipment.hasWallSpace) {
    return { available: false, reason: '壁スペースなし' }
  }

  if (movement.slug === 'bridge' && !checkBridgeUnlocked(progress, rules.bridgeDependsOn)) {
    return { available: false, reason: '前提未達：Step5' }
  }

  return { available: true }
}

const tierHint = (tier: Tier) => {
  switch (tier) {
    case 'BEGINNER':
      return '基礎を固める段階'
    case 'INTERMEDIATE':
      return '中強度の練習'
    case 'ADVANCED':
      return '高強度の練習'
    default:
      return ''
  }
}

function PTDashboard() {
  const [settings, setSettings] = useState<PTSettings>(DEFAULT_SETTINGS)
  const [profile, setProfile] = useState<Profile>(() => makeDefaultProfile())
  const [progress, setProgress] = useState<ProgressState>(() => createDefaultProgressState())
  const [profileError, setProfileError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const navigate = useNavigate()

  const loadState = async () => {
    setLoading(true)
    setProfileError(null)
    try {
      const res = await fetch('/api/pt/load')
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as PTLoadResponse
      setProfile(data.profile ?? makeDefaultProfile())
      setProgress(buildProgressState(data.progress))
    } catch (error) {
      console.warn('pt load failed:', (error as Error).message)
      const fallbackProfile = makeDefaultProfile()
      setProfile(fallbackProfile)
      setProgress(createDefaultProgressState())
      setProfileError('PTデータの読み込みに失敗しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadState()
  }, [])

  const updateEquipment = async (key: 'hasPullupBar' | 'hasWallSpace', value: boolean) => {
    let equipmentSnapshot = settings.equipment
    let rulesSnapshot = settings.rules

    setSettings((prev) => {
      const updatedEquipment = { ...prev.equipment, [key]: value }
      equipmentSnapshot = updatedEquipment
      rulesSnapshot = prev.rules
      return {
        ...prev,
        equipment: updatedEquipment,
      }
    })

    setSaving(true)
    try {
      await fetch('/api/pt/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...equipmentSnapshot,
          rules: rulesSnapshot,
        }),
      })
    } catch (error) {
      console.warn('equipment update failed:', (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const progressByRoute = useMemo(
    () =>
      MOVEMENTS.reduce<Record<string, MovementProgress | undefined>>((acc, movement) => {
        const entry = progress.movements.find((item) => item.slug === movement.progressSlug)
        if (entry) {
          acc[movement.slug] = entry
        }
        return acc
      }, {}),
    [progress],
  )

  const availabilityMap = useMemo(
    () =>
      MOVEMENTS.reduce<Record<string, Availability>>((acc, movement) => {
        acc[movement.slug] = getAvailability(movement, settings, progressByRoute)
        return acc
      }, {}),
    [progressByRoute, settings],
  )

  const radarBaseData = useMemo<RadarAxis[]>(
    () =>
      MOVEMENTS.map((movement) => {
        const entry = progressByRoute[movement.slug]
        return {
          movementSlug: movement.progressSlug,
          stepNo: entry?.stepNo ?? 1,
          tier: entry?.tier ?? 'BEGINNER',
          score: entry?.score,
          locked: false,
        }
      }),
    [progressByRoute],
  )

  const radarDisplayData = useMemo(() => {
    return radarBaseData.map((axis) => {
      const routeSlug = RADAR_TO_ROUTE[axis.movementSlug]
      if (!routeSlug) return axis
      const availability = availabilityMap[routeSlug]
      if (availability && !availability.available) {
        return {
          ...axis,
          locked: true,
          lockReason: availability.reason ?? axis.lockReason,
        }
      }
      return axis
    })
  }, [availabilityMap, radarBaseData])

  const handleAxisClick = useCallback(
    (slug: RadarAxis['movementSlug']) => {
      const routeSlug = RADAR_TO_ROUTE[slug]
      if (!routeSlug) return
      navigate(`/pt/movement/${routeSlug}`)
    },
    [navigate],
  )

  return (
    <div className="card">
      <section className="section">
        <header className="section__header">
          <h2>PTダッシュボード</h2>
          <p className="section__hint">解放済みのムーブメントを確認し、詳細画面から記録します。</p>
        </header>
        <p className="section__hint">現在の表示名: {loading ? '読込中...' : profile.displayName}</p>
        {profileError && <p className="section__hint pt-dashboard__error">{profileError}</p>}
      </section>

      <section className="section pt-radar-section">
        <header className="section__header">
          <h3>到達度レーダー</h3>
          <p className="section__hint">現在の6種目の進捗をRPGスキルツリー風に表示します。</p>
        </header>
        <div className="pt-radar-wrapper">
          {loading ? (
            <div className="pt-radar__skeleton" aria-label="loading" />
          ) : (
            <PTRadar data={radarDisplayData} onAxisClick={handleAxisClick} />
          )}
        </div>
      </section>

      <section className="section">
        <div className="equipment-toggle">
          <label>
            <input
              type="checkbox"
              checked={settings.equipment.hasPullupBar}
              onChange={(event) => updateEquipment('hasPullupBar', event.target.checked)}
            />
            プルアップバーあり
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.equipment.hasWallSpace}
              onChange={(event) => updateEquipment('hasWallSpace', event.target.checked)}
            />
            壁スペースあり
          </label>
          {saving && <span className="section__hint">保存中...</span>}
        </div>
      </section>

      <section className="section">
        <div className="pt-grid">
          {MOVEMENTS.map((movement) => {
            const movementProgress = progressByRoute[movement.slug]
            const availability = availabilityMap[movement.slug]
            const unlocked = availability?.available ?? false

            return (
              <article
                key={movement.slug}
                className={unlocked ? 'pt-card' : 'pt-card pt-card--locked'}
                aria-disabled={!unlocked}
              >
                <header className="pt-card__header">
                  <h3>{movement.name}</h3>
                  <span className="pt-card__step">Step {movementProgress?.stepNo ?? 1}</span>
                </header>
                <dl className="pt-card__meta">
                  <div>
                    <dt>練習レベル</dt>
                    <dd>
                      {movementProgress ? TIER_LABEL[movementProgress.tier] : '初級'}（
                      {tierHint(movementProgress?.tier ?? 'BEGINNER')}）
                    </dd>
                  </div>
                  <div>
                    <dt>目安レンジ</dt>
                    <dd>係数反映まで準備中</dd>
                  </div>
                </dl>
                {unlocked ? (
                  <NavLink to={`/pt/movement/${movement.slug}`} className="pt-card__link">
                    詳細を見る
                  </NavLink>
                ) : (
                  <p className="pt-card__reason">{availability?.reason ?? '出現条件未達'}</p>
                )}
              </article>
            )
          })}
        </div>
        {loading && <p className="section__hint">読込中...</p>}
      </section>

      <section className="section">
        <NavLink to="/pt/settings" className="link-button">
          出現条件を編集
        </NavLink>
      </section>
    </div>
  )
}

export default PTDashboard
