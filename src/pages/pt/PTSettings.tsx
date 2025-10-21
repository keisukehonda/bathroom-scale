import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

import {
  DEFAULT_GENERATION_CONFIG,
  DEFAULT_USER_ID,
  type PTGenerationConfig,
  loadGenerationConfig,
  saveGenerationConfig,
} from '../../lib/pt/dailyPlan'

type PTLoadResponse = {
  profile: { displayName: string; updatedAt: string }
  progress: {
    movements: { slug: string; stepNo: number; tier: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'; score?: number; updatedAt: string }[]
    version?: number
  }
  equipment?: { hasPullupBar: boolean; hasWallSpace: boolean }
  rules?: { bridgeDependsOn: 'any-step5' | 'none' }
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
  const [generationConfig, setGenerationConfig] = useState<PTGenerationConfig>(DEFAULT_GENERATION_CONFIG)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/pt/load')
        if (!res.ok) throw new Error(await res.text())
        const data = (await res.json()) as PTLoadResponse
        setSettings({
          hasPullupBar: data.equipment?.hasPullupBar ?? DEFAULT_STATE.hasPullupBar,
          hasWallSpace: data.equipment?.hasWallSpace ?? DEFAULT_STATE.hasWallSpace,
          rules: data.rules ?? DEFAULT_STATE.rules,
        })
      } catch (error) {
        console.warn('settings load failed:', (error as Error).message)
      }
      setGenerationConfig(loadGenerationConfig(DEFAULT_USER_ID))
    }

    load()
  }, [])

  const updateGenerationConfig = (patch: Partial<PTGenerationConfig>) => {
    setGenerationConfig((prev) => ({ ...prev, ...patch }))
  }

  const handleSave = async () => {
    setSaving(true)
    setStatusMessage('')
    try {
      saveGenerationConfig(DEFAULT_USER_ID, generationConfig)
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
        <header className="section__header">
          <h3>デイリー生成</h3>
          <p className="section__hint">当日のメニュー候補のルールを調整します。</p>
        </header>

        <div className="form-grid">
          <label className="form-field">
            <span className="form-field__label">最大種目数（1〜6）</span>
            <input
              type="range"
              min={1}
              max={6}
              value={generationConfig.daily_max_movements}
              onChange={(event) =>
                updateGenerationConfig({ daily_max_movements: Number.parseInt(event.target.value, 10) })
              }
            />
            <span className="section__hint">本日は最大 {generationConfig.daily_max_movements} 種目を提示</span>
          </label>

          <label className="form-field form-field--checkbox">
            <input
              type="checkbox"
              checked={generationConfig.allow_same_category_twice}
              onChange={(event) => updateGenerationConfig({ allow_same_category_twice: event.target.checked })}
            />
            <span>同系統の重複を許可</span>
          </label>

          <label className="form-field form-field--checkbox">
            <input
              type="checkbox"
              checked={generationConfig.prefer_undertrained}
              onChange={(event) => updateGenerationConfig({ prefer_undertrained: event.target.checked })}
            />
            <span>不足部位を優先</span>
          </label>

          <label className="form-field">
            <span className="form-field__label">直近回避日数</span>
            <input
              type="number"
              min={0}
              max={14}
              value={generationConfig.prefer_rotation_days}
              onChange={(event) =>
                updateGenerationConfig({ prefer_rotation_days: Number.parseInt(event.target.value, 10) || 0 })
              }
            />
            <span className="section__hint">直近 {generationConfig.prefer_rotation_days} 日以内の種目を控えめに提案</span>
          </label>

          <label className="form-field form-field--checkbox">
            <input
              type="checkbox"
              checked={generationConfig.include_locked_as_suggestions}
              onChange={(event) => updateGenerationConfig({ include_locked_as_suggestions: event.target.checked })}
            />
            <span>ロック中の候補も表示</span>
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
