import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'

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

  const [progress, setProgress] = useState<MovementProgress>({ step: 1, tier: 'BEGINNER' })
  const [sets, setSets] = useState<SetRow[]>([{ reps: 0 }])
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/pt/load')
        if (!res.ok) throw new Error(await res.text())
        const data = (await res.json()) as PTProgressResponse
        const current = data.progress[slug]
        if (!current) {
          navigate('/pt')
          return
        }
        setProgress(current)
      } catch (error) {
        console.warn('pt detail load failed:', (error as Error).message)
      }
    }

    if (!slug || !MOVEMENT_LABELS[slug]) {
      navigate('/pt')
      return
    }

    load()
  }, [navigate, slug])

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
    setSaving(true)
    setStatusMessage('')
    try {
      const res = await fetch('/api/pt/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movementSlug: slug,
          step: progress.step,
          tier: progress.tier,
          sets,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
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
              value={progress.step}
              onChange={(event) =>
                setProgress((prev) => ({ ...prev, step: Number(event.target.value) }))
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
