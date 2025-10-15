import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

type PTProgressResponse = {
  equipment: {
    hasPullupBar: boolean
    hasWallSpace: boolean
  }
  progress: Record<string, { step: number; tier: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' }>
  rules: {
    bridgeDependsOn: 'any-step5' | 'none'
  }
}

type SettingsPayload = {
  hasPullupBar: boolean
  hasWallSpace: boolean
  rules: {
    bridgeDependsOn: 'any-step5' | 'none'
  }
}

const DEFAULT_STATE: SettingsPayload = {
  hasPullupBar: false,
  hasWallSpace: false,
  rules: {
    bridgeDependsOn: 'any-step5',
  },
}

function PTSettings() {
  const [settings, setSettings] = useState<SettingsPayload>(DEFAULT_STATE)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/pt/load')
        if (!res.ok) throw new Error(await res.text())
        const data = (await res.json()) as PTProgressResponse
        setSettings({
          hasPullupBar: data.equipment.hasPullupBar,
          hasWallSpace: data.equipment.hasWallSpace,
          rules: data.rules,
        })
      } catch (error) {
        console.warn('settings load failed:', (error as Error).message)
      }
    }

    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setStatusMessage('')
    try {
      const res = await fetch('/api/pt/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error(await res.text())
      setStatusMessage('設定を保存しました')
    } catch (error) {
      const message = (error as Error).message
      setStatusMessage(`保存に失敗しました: ${message}`)
      console.warn('settings save failed:', message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <section className="section">
        <NavLink to="/pt" className="link-button">
          ← PTダッシュボードへ戻る
        </NavLink>
      </section>

      <section className="section">
        <header className="section__header">
          <h2>PT設定</h2>
          <p className="section__hint">器具環境と出現条件テンプレートを管理します。</p>
        </header>

        <div className="form-grid">
          <label className="form-field form-field--checkbox">
            <input
              type="checkbox"
              checked={settings.hasPullupBar}
              onChange={(event) => setSettings((prev) => ({ ...prev, hasPullupBar: event.target.checked }))}
            />
            <span>プルアップバーあり</span>
          </label>

          <label className="form-field form-field--checkbox">
            <input
              type="checkbox"
              checked={settings.hasWallSpace}
              onChange={(event) => setSettings((prev) => ({ ...prev, hasWallSpace: event.target.checked }))}
            />
            <span>壁スペースあり</span>
          </label>
        </div>
      </section>

      <section className="section">
        <header className="section__header">
          <h3>出現条件テンプレート</h3>
          <p className="section__hint">Bridgeの解放条件を選択します。</p>
        </header>
        <div className="radio-group">
          <label className="radio-option">
            <input
              type="radio"
              name="bridge"
              value="any-step5"
              checked={settings.rules.bridgeDependsOn === 'any-step5'}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  rules: { ...prev.rules, bridgeDependsOn: event.target.value as SettingsPayload['rules']['bridgeDependsOn'] },
                }))
              }
            />
            <div>
              <strong>標準設定</strong>
              <p className="section__hint">Pushup / Squat / Leg Raise のいずれかで Step5 到達後に解放。</p>
            </div>
          </label>
          <label className="radio-option">
            <input
              type="radio"
              name="bridge"
              value="none"
              checked={settings.rules.bridgeDependsOn === 'none'}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  rules: { ...prev.rules, bridgeDependsOn: event.target.value as SettingsPayload['rules']['bridgeDependsOn'] },
                }))
              }
            />
            <div>
              <strong>常時解放</strong>
              <p className="section__hint">前提条件なしで常に選択可能。</p>
            </div>
          </label>
        </div>
      </section>

      <section className="section">
        <button type="button" className="primary-button" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '設定を保存'}
        </button>
        {statusMessage && <p className="section__hint">{statusMessage}</p>}
      </section>
    </div>
  )
}

export default PTSettings
