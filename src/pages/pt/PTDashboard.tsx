import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import PTRadar from '../../components/PTRadar'
import type { RadarAxis } from '../../lib/pt/radar'
import { getProfileRadarData } from '../../lib/pt/radar'

type Tier = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

type MovementProgress = {
  step: number
  tier: Tier
}

type PTProgressResponse = {
  equipment: {
    hasPullupBar: boolean
    hasWallSpace: boolean
  }
  progress: Record<string, MovementProgress>
  rules: {
    bridgeDependsOn: 'any-step5' | 'none'
  }
}

type MovementMeta = {
  name: string
  slug: string
  requires?: 'bar' | 'wall'
}

const MOVEMENTS: MovementMeta[] = [
  { name: 'Pushup', slug: 'pushup' },
  { name: 'Squat', slug: 'squat' },
  { name: 'Leg Raise', slug: 'leg-raise' },
  { name: 'Pullup', slug: 'pullup', requires: 'bar' },
  { name: 'Bridge', slug: 'bridge' },
  { name: 'Handstand Pushup', slug: 'handstand-pushup', requires: 'wall' },
]

const RADAR_TO_ROUTE: Record<RadarAxis['movementSlug'], MovementMeta['slug']> = {
  pushup: 'pushup',
  squat: 'squat',
  pullup: 'pullup',
  legraise: 'leg-raise',
  bridge: 'bridge',
  hspu: 'handstand-pushup',
}

const DEFAULT_STATE: PTProgressResponse = {
  equipment: {
    hasPullupBar: false,
    hasWallSpace: false,
  },
  progress: MOVEMENTS.reduce<Record<string, MovementProgress>>((acc, movement) => {
    acc[movement.slug] = { step: 1, tier: 'BEGINNER' }
    return acc
  }, {}),
  rules: {
    bridgeDependsOn: 'any-step5',
  },
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
  progress: Record<string, MovementProgress>,
  rule: PTProgressResponse['rules']['bridgeDependsOn'],
) => {
  if (rule === 'none') return true
  const required = ['pushup', 'squat', 'leg-raise']
  return required.some((slug) => (progress[slug]?.step ?? 0) >= 5)
}

const getAvailability = (
  movement: MovementMeta,
  state: PTProgressResponse,
): Availability => {
  const { equipment, progress, rules } = state

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
  const [state, setState] = useState<PTProgressResponse>(DEFAULT_STATE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [radarData, setRadarData] = useState<RadarAxis[] | null>(null)
  const [radarLoading, setRadarLoading] = useState(true)
  const [radarError, setRadarError] = useState<string | null>(null)

  const navigate = useNavigate()

  const loadState = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pt/load')
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as PTProgressResponse
      setState((current) => ({ ...current, ...data }))
    } catch (error) {
      console.warn('pt load failed:', (error as Error).message)
      setState(DEFAULT_STATE)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadState()
  }, [])

  const loadRadar = useCallback(async () => {
    setRadarLoading(true)
    setRadarError(null)
    try {
      const data = await getProfileRadarData('demo-user', new Date().toISOString().slice(0, 10))
      setRadarData(data)
    } catch (error) {
      setRadarError((error as Error).message)
    } finally {
      setRadarLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRadar()
  }, [loadRadar])

  const updateEquipment = async (key: 'hasPullupBar' | 'hasWallSpace', value: boolean) => {
    let equipmentSnapshot = state.equipment
    let rulesSnapshot = state.rules

    setState((prev) => {
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

  const availabilityMap = useMemo(
    () =>
      MOVEMENTS.reduce<Record<string, Availability>>((acc, movement) => {
        acc[movement.slug] = getAvailability(movement, state)
        return acc
      }, {}),
    [state],
  )

  const radarDisplayData = useMemo(() => {
    if (!radarData) return []
    return radarData.map((axis) => {
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
  }, [availabilityMap, radarData])

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
      </section>

      <section className="section pt-radar-section">
        <header className="section__header">
          <h3>到達度レーダー</h3>
          <p className="section__hint">現在の6種目の進捗をRPGスキルツリー風に表示します。</p>
        </header>
        <div className="pt-radar-wrapper">
          {radarLoading ? (
            <div className="pt-radar__skeleton" aria-label="loading" />
          ) : radarError ? (
            <div className="pt-radar__error">
              <p className="section__hint">レーダーデータの読込に失敗しました。</p>
              <button type="button" className="secondary-button" onClick={loadRadar}>
                再試行する
              </button>
            </div>
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
              checked={state.equipment.hasPullupBar}
              onChange={(event) => updateEquipment('hasPullupBar', event.target.checked)}
            />
            プルアップバーあり
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.equipment.hasWallSpace}
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
            const progress = state.progress[movement.slug]
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
                  <span className="pt-card__step">Step {progress?.step ?? 1}</span>
                </header>
                <dl className="pt-card__meta">
                  <div>
                    <dt>練習レベル</dt>
                    <dd>{progress ? TIER_LABEL[progress.tier] : '初級'}（{tierHint(progress?.tier ?? 'BEGINNER')}）</dd>
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
