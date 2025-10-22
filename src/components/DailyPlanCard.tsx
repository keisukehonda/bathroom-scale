import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'

import {
  DEFAULT_USER_ID,
  type PTGenerationConfig,
  type RadarScoreMap,
  type MovementProgressMap,
  type StoredDailyPlan,
  generateDailyPlan,
  loadGenerationConfig,
  loadStoredDailyPlan,
  saveStoredDailyPlan,
  MOVEMENT_LOOKUP,
  MOVEMENTS,
} from '../lib/pt/dailyPlan'
import type { RadarAxis } from '../lib/pt/radar'
import { toScore } from '../lib/pt/radar'

const TIER_DISPLAY: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
}

const TAG_DISPLAY: Record<string, string> = {
  available: '選択可',
  undertrained: '弱点優先',
  rotation: 'ローテ重視',
}

type StoredMovementProgress = {
  slug: RadarAxis['movementSlug']
  stepNo: number
  tier: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  score?: number
  updatedAt: string
}

type PTLoadResponse = {
  profile: { displayName: string; updatedAt: string }
  progress: {
    movements: StoredMovementProgress[]
    version?: number
  }
  // equipment and rules remain managed separately via settings API
  equipment?: { hasPullupBar: boolean; hasWallSpace: boolean }
  rules?: { bridgeDependsOn: 'any-step5' | 'none' }
}

type LoadedContext = {
  config: PTGenerationConfig
  progress: MovementProgressMap
  equipment: { hasPullupBar: boolean; hasWallSpace: boolean }
  rules: { bridgeDependsOn: 'any-step5' | 'none' }
  radarScores: RadarScoreMap
}

type CardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; plan: StoredDailyPlan; context: LoadedContext }

const RADAR_TO_MOVEMENT: Record<RadarAxis['movementSlug'], typeof MOVEMENTS[number]['id']> = {
  pushup: 'pushup',
  squat: 'squat',
  pullup: 'pullup',
  legraise: 'leg-raise',
  bridge: 'bridge',
  hspu: 'handstand-pushup',
}

const parseStepNo = (stepId: string) => {
  const match = stepId.match(/step(\d+)/)
  return match ? Number.parseInt(match[1] ?? '1', 10) : 1
}

const formatDateKey = (date: Date) => date.toISOString().slice(0, 10)

const translateTag = (tag: string) => TAG_DISPLAY[tag] ?? tag

const buildProgressMap = (movements: StoredMovementProgress[]): MovementProgressMap => {
  return movements.reduce<MovementProgressMap>((acc, movement) => {
    const movementId = RADAR_TO_MOVEMENT[movement.slug]
    if (movementId) {
      acc[movementId] = { step: movement.stepNo, tier: movement.tier }
    }
    return acc
  }, {})
}

const buildRadarScores = (movements: StoredMovementProgress[]): RadarScoreMap => {
  return movements.reduce<RadarScoreMap>((acc, movement) => {
    const movementId = RADAR_TO_MOVEMENT[movement.slug]
    if (!movementId) return acc
    const baseScore = typeof movement.score === 'number' ? movement.score : toScore(movement.stepNo, movement.tier)
    const clamped = Math.max(0, Math.min(10, Number.isFinite(baseScore) ? baseScore : 0))
    acc[movementId] = clamped
    return acc
  }, {})
}

export default function DailyPlanCard({ userId = DEFAULT_USER_ID }: { userId?: string }) {
  const [state, setState] = useState<CardState>({ status: 'loading' })
  const [rerolling, setRerolling] = useState(false)

  const today = useMemo(() => formatDateKey(new Date()), [])

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const config = loadGenerationConfig(userId)
      const response = await fetch('/api/pt/load')
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const data = (await response.json()) as PTLoadResponse

      const progressMovements = data.progress?.movements ?? []
      const radarScores = buildRadarScores(progressMovements)

      const context: LoadedContext = {
        config,
        progress: buildProgressMap(progressMovements),
        equipment: data.equipment ?? { hasPullupBar: false, hasWallSpace: false },
        rules: data.rules ?? { bridgeDependsOn: 'any-step5' },
        radarScores,
      }

      let stored = loadStoredDailyPlan(userId, today)
      if (!stored) {
        const generated = generateDailyPlan({
          date: today,
          config: context.config,
          progress: context.progress,
          equipment: context.equipment,
          rules: context.rules,
          radarScores: context.radarScores,
          seed: `${today}#0`,
        })
        stored = { ...generated, rerollCount: 0 }
        saveStoredDailyPlan(userId, stored)
      }

      setState({ status: 'ready', plan: stored, context })
    } catch (error) {
      setState({ status: 'error', message: (error as Error).message })
    }
  }, [today, userId])

  useEffect(() => {
    load()
  }, [load])

  const handleReroll = () => {
    setRerolling(true)
    setState((prev) => {
      if (prev.status !== 'ready') return prev
      const rerollCount = prev.plan.rerollCount + 1
      const nextPlan = generateDailyPlan({
        date: today,
        config: prev.context.config,
        progress: prev.context.progress,
        equipment: prev.context.equipment,
        rules: prev.context.rules,
        radarScores: prev.context.radarScores,
        seed: `${today}#${rerollCount}`,
      })
      const stored: StoredDailyPlan = { ...nextPlan, rerollCount }
      saveStoredDailyPlan(userId, stored)
      return { status: 'ready', plan: stored, context: prev.context }
    })
    setRerolling(false)
  }

  const content = useMemo(() => {
    if (state.status === 'loading') {
      return <div className="daily-plan__loading" aria-label="loading">生成中...</div>
    }

    if (state.status === 'error') {
      return (
        <div className="daily-plan__error">
          <p className="section__hint">メニュー生成に失敗しました: {state.message}</p>
          <button type="button" className="secondary-button" onClick={load}>
            再試行する
          </button>
        </div>
      )
    }

    const { plan } = state

    return (
      <>
        {plan.rerollCount > 0 && (
          <p className="section__hint">本日 {plan.rerollCount} 回再生成しました。</p>
        )}
        {plan.items.length > 0 ? (
          <ol className="daily-plan__list">
            {plan.items.map((item, index) => {
              const movement = MOVEMENT_LOOKUP.get(item.movementId)
              const displayName = movement?.name ?? item.movementId
              const stepNo = parseStepNo(item.stepId)

              return (
                <li key={`${item.movementId}-${index}`} className="daily-plan__item">
                  <div className="daily-plan__item-header">
                    <div>
                      <span className="daily-plan__movement">{displayName}</span>
                      <span className="daily-plan__step">Step {stepNo} / {TIER_DISPLAY[item.tier]}</span>
                    </div>
                    <NavLink to={`/pt/movement/${item.movementId}`} className="daily-plan__start">
                      開始
                    </NavLink>
                  </div>
                  {item.reasonTags.length > 0 && (
                    <ul className="daily-plan__tags">
                      {item.reasonTags.map((tag) => (
                        <li key={tag} className="daily-plan__tag">
                          {translateTag(tag)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {item.note && <p className="daily-plan__note">{item.note}</p>}
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="daily-plan__empty">候補が足りません（器具や前提条件を確認してください）</p>
        )}

        {plan.lockedSuggestions && plan.lockedSuggestions.length > 0 && (
          <div className="daily-plan__suggestions">
            <h4>ロック中の候補</h4>
            <ul>
              {plan.lockedSuggestions.map((suggestion, index) => {
                const movement = MOVEMENT_LOOKUP.get(suggestion.movementId)
                return (
                  <li key={`${suggestion.movementId}-suggestion-${index}`}>
                    <span>{movement?.name ?? suggestion.movementId}</span>
                    <span className="daily-plan__suggestion-reason"> — {suggestion.reason}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </>
    )
  }, [load, state, today])

  return (
    <section className="section daily-plan">
      <header className="section__header">
        <h2>今日のメニュー</h2>
        <p className="section__hint">設定に基づき本日の練習候補を提案します。</p>
      </header>

      {content}

      <div className="daily-plan__actions">
        <button
          type="button"
          className="secondary-button"
          onClick={handleReroll}
          disabled={state.status !== 'ready' || rerolling}
        >
          {rerolling ? '再生成中...' : '再生成'}
        </button>
        <NavLink to="/pt/settings" className="link-button">
          生成設定を開く
        </NavLink>
      </div>
    </section>
  )
}
