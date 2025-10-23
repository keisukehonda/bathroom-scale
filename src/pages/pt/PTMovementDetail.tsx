import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'

import { toScore } from '../../lib/pt/radar'
import { api } from '../../lib/api'
import {
  makeDefaultProgress,
  normaliseProgress,
  type MovementProgress,
  type Progress,
  type PTLoadResponse,
  type PTSaveResponse,
  type Tier,
} from '../../../lib/schemas/pt'

type SetRow = {
  reps: number
  rpe?: number
  formOk?: boolean
  feedback?: 'HARD' | 'JUST' | 'EASY'
}

const MOVEMENT_LABELS: Record<string, string> = {
  pushup: 'Pushup',
  squat: 'Squat',
  'leg-raise': 'Leg Raise',
  pullup: 'Pullup',
  bridge: 'Bridge',
  'handstand-pushup': 'Handstand Pushup',
}

const ROUTE_TO_PROGRESS_SLUG: Record<string, MovementProgress['slug']> = {
  pushup: 'pushup',
  squat: 'squat',
  'leg-raise': 'legraise',
  pullup: 'pullup',
  bridge: 'bridge',
  'handstand-pushup': 'hspu',
}

const TIER_LABEL: Record<Tier, string> = {
  BEGINNER: '初級',
  INTERMEDIATE: '中級',
  ADVANCED: '上級',
}

const tierOptions: Tier[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']

function PTMovementDetail() {
  const params = useParams()
  const slug = params.slug ?? ''
  const navigate = useNavigate()
  const progressSlug = ROUTE_TO_PROGRESS_SLUG[slug]

  const [progress, setProgress] = useState<{ stepNo: number; tier: Tier }>({ stepNo: 1, tier: 'BEGINNER' })
  const [progressPayload, setProgressPayload] = useState<Progress>(() => makeDefaultProgress())
  const [sets, setSets] = useState<SetRow[]>([{ reps: 0 }])
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(api('/api/pt/load'))
        if (!res.ok) throw new Error(await res.text())
        const data = (await res.json()) as PTLoadResponse
        const payload = normaliseProgress(data.progress)
        const version = payload.version
        const movements = payload.movements
        const current = progressSlug
          ? movements.find((movement) => movement.slug === progressSlug)
          : undefined
        if (!current) {
          navigate('/pt')
          return
        }
        setProgress({ stepNo: current.stepNo, tier: current.tier })
        setProgressPayload({ movements, version })
      } catch (error) {
        console.warn('pt detail load failed:', (error as Error).message)
      }
    }

    if (!slug || !MOVEMENT_LABELS[slug] || !progressSlug) {
      navigate('/pt')
      return
    }

    load()
  }, [navigate, progressSlug, slug])

  const updateSet = (index: number, field: keyof SetRow, value: number | boolean | undefined | string) => {
    setSets((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    )
  }

  const addSet = () => {
    setSets((prev) => [...prev, { reps: 0 }])
  }

  const removeSet = (index: number) => {
    setSets((prev) => prev.filter((_, rowIndex) => rowIndex !== index))
  }

  const saveSession = async () => {
    if (!progressSlug) {
      setStatusMessage('対象のムーブメントが見つかりませんでした')
      return
    }

    setSaving(true)
    setStatusMessage('')
    try {
      const res = await fetch(api('/api/pt/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: {
            version: progressPayload.version,
            movements: progressPayload.movements.map((movement) =>
              movement.slug === progressSlug
                ? {
                    ...movement,
                    stepNo: progress.stepNo,
                    tier: progress.tier,
                    score: toScore(progress.stepNo, progress.tier),
                    updatedAt: new Date().toISOString(),
                  }
                : movement,
            ),
          },
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as PTSaveResponse
      if (!data.ok || !data.progress) {
        throw new Error(data.error ?? 'unknown error')
      }
      const nextProgress = normaliseProgress(data.progress)
      setProgressPayload(nextProgress)
      const updated = nextProgress.movements.find((movement) => movement.slug === progressSlug)
      if (updated) {
        setProgress({ stepNo: updated.stepNo, tier: updated.tier })
      }
      setStatusMessage('保存しました')
    } catch (error) {
      const message = (error as Error).message
      setStatusMessage(`保存に失敗しました: ${message}`)
      console.warn('pt save failed:', message)
    } finally {
      setSaving(false)
    }
  }

  const movementName = MOVEMENT_LABELS[slug]

  return (
    <div className="card">
      <section className="section">
        <NavLink to="/pt" className="link-button">
          ← PTダッシュボードへ戻る
        </NavLink>
      </section>

      <section className="section">
        <header className="section__header">
          <h2>{movementName}</h2>
          <p className="section__hint">ステップとレベルを調整し、セット内容を記録します。</p>
        </header>
        <div className="form-grid">
          <label className="form-field">
            <span className="form-field__label">ステップ</span>
            <input
              type="number"
              min={1}
              max={10}
              value={progress.stepNo}
              onChange={(event) =>
                setProgress((prev) => ({ ...prev, stepNo: Number(event.target.value) }))
              }
            />
          </label>
          <label className="form-field">
            <span className="form-field__label">練習レベル</span>
            <select
              value={progress.tier}
              onChange={(event) =>
                setProgress((prev) => ({ ...prev, tier: event.target.value as Tier }))
              }
            >
              {tierOptions.map((tier) => (
                <option key={tier} value={tier}>
                  {TIER_LABEL[tier]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="section">
        <header className="section__header">
          <h3>セット記録</h3>
          <p className="section__hint">各セットの回数、RPE、フォーム、体感を入力します。</p>
        </header>
        <div className="set-table">
          {sets.map((set, index) => (
            <div key={index} className="set-table__row">
              <span className="set-table__index">#{index + 1}</span>
              <label className="form-field">
                <span className="form-field__label">回数</span>
                <input
                  type="number"
                  min={0}
                  value={set.reps}
                  onChange={(event) => updateSet(index, 'reps', Number(event.target.value))}
                />
              </label>
              <label className="form-field">
                <span className="form-field__label">RPE</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={set.rpe ?? ''}
                  onChange={(event) =>
                    updateSet(index, 'rpe', event.target.value === '' ? undefined : Number(event.target.value))
                  }
                />
              </label>
              <label className="form-field form-field--checkbox">
                <input
                  type="checkbox"
                  checked={set.formOk ?? false}
                  onChange={(event) => updateSet(index, 'formOk', event.target.checked)}
                />
                <span>フォーム良好</span>
              </label>
              <label className="form-field">
                <span className="form-field__label">体感</span>
                <select
                  value={set.feedback ?? ''}
                  onChange={(event) =>
                    updateSet(
                      index,
                      'feedback',
                      event.target.value === '' ? undefined : (event.target.value as SetRow['feedback']),
                    )
                  }
                >
                  <option value="">選択</option>
                  <option value="HARD">辛い</option>
                  <option value="JUST">ちょうど</option>
                  <option value="EASY">余裕</option>
                </select>
              </label>
              {sets.length > 1 && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => removeSet(index)}
                >
                  削除
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="set-actions">
          <button type="button" className="secondary-button" onClick={addSet}>
            セットを追加
          </button>
        </div>
      </section>

      <section className="section">
        <button type="button" className="primary-button" onClick={saveSession} disabled={saving}>
          {saving ? '保存中...' : '今日のセッションを保存'}
        </button>
        {statusMessage && <p className="section__hint">{statusMessage}</p>}
      </section>
    </div>
  )
}

export default PTMovementDetail
