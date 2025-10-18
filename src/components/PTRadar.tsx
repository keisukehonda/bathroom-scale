import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'

import type { PreparedRadarAxis, RadarAxis } from '../lib/pt/radar'
import { prepareRadarAxes } from '../lib/pt/radar'

export type PTRadarProps = {
  data: RadarAxis[]
  size?: number
  onAxisClick?: (slug: RadarAxis['movementSlug']) => void
}

const MOVEMENT_LABEL: Record<RadarAxis['movementSlug'], string> = {
  pushup: 'Pushup',
  squat: 'Squat',
  pullup: 'Pullup',
  legraise: 'Leg Raise',
  bridge: 'Bridge',
  hspu: 'HSPU',
}

const TIER_DISPLAY: Record<RadarAxis['tier'], string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
}

const LOCK_COLOR = '#94a3b8'
const ACTIVE_COLOR = '#38bdf8'

export default function PTRadar({ data, size = 360, onAxisClick }: PTRadarProps) {
  const prepared = useMemo<PreparedRadarAxis[]>(() => prepareRadarAxes(data), [data])

  const indicator = useMemo(
    () =>
      prepared.map((axis) => ({
        name: MOVEMENT_LABEL[axis.movementSlug],
        max: 10,
        color: axis.locked ? LOCK_COLOR : '#0f172a',
      })),
    [prepared],
  )

  const valueSeries = prepared.map((axis) => parseFloat(axis.score.toFixed(2)))
  const lockedMask = prepared.map((axis) => (axis.locked ? 10 : NaN))

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: () =>
          prepared
            .map((axis) => {
              const label = MOVEMENT_LABEL[axis.movementSlug]
              if (axis.locked) {
                return `${label}：Locked${axis.lockReason ? `（${axis.lockReason}）` : ''}`
              }
              const score = axis.score.toFixed(2)
              return `${label}：Step ${axis.stepNo} / Tier ${TIER_DISPLAY[axis.tier]}（${score}）`
            })
            .join('<br/>'),
      },
      radar: {
        indicator,
        center: ['50%', '55%'],
        radius: size / 2 - 24,
        splitNumber: 30,
        startAngle: 90,
        name: {
          formatter: (value: string) => value,
          color: '#0f172a',
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: '#cbd5f5',
          },
        },
        splitLine: {
          lineStyle: {
            color: Array.from({ length: 30 }, (_, idx) =>
              (idx + 1) % 3 === 0 ? 'rgba(148, 163, 184, 0.55)' : 'rgba(203, 213, 225, 0.35)',
            ),
            width: 1,
          },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: Array.from({ length: 30 }, (_, idx) =>
              (idx + 1) % 3 === 0 ? 'rgba(56, 189, 248, 0.05)' : 'rgba(148, 163, 184, 0.03)',
            ),
          },
        },
      },
      series: [
        {
          type: 'radar',
          name: 'Progress',
          data: [
            {
              value: valueSeries,
              areaStyle: {
                color: 'rgba(56, 189, 248, 0.35)',
              },
              lineStyle: {
                color: ACTIVE_COLOR,
                width: 2,
              },
              itemStyle: {
                color: ACTIVE_COLOR,
              },
            },
          ],
        },
        {
          type: 'radar',
          name: 'Locks',
          silent: true,
          symbol: 'none',
          data: [
            {
              value: lockedMask,
              lineStyle: {
                color: LOCK_COLOR,
                type: 'dashed',
                width: 1,
              },
              itemStyle: {
                color: LOCK_COLOR,
              },
              areaStyle: {
                opacity: 0,
              },
            },
          ],
        },
      ],
    }),
    [indicator, lockedMask, prepared, size, valueSeries],
  )

  const handleClick = (params: { name?: string }) => {
    if (!onAxisClick || !params?.name) return
    const entry = Object.entries(MOVEMENT_LABEL).find(([, label]) => label === params.name)
    if (!entry) return
    onAxisClick(entry[0] as RadarAxis['movementSlug'])
  }

  return (
    <ReactECharts
      option={option}
      style={{ width: size, height: size }}
      onEvents={{ click: handleClick }}
      opts={{ renderer: 'svg' }}
    />
  )
}
