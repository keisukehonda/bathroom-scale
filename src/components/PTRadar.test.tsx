import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import PTRadar from './PTRadar'
import type { RadarAxis } from '../lib/pt/radar'
import { prepareRadarAxes } from '../lib/pt/radar'

vi.mock('echarts-for-react', () => ({
  __esModule: true,
  default: ({ option }: { option: unknown }) => (
    <pre data-testid="echarts-mock">{JSON.stringify(option)}</pre>
  ),
}))

const sampleData: RadarAxis[] = [
  { movementSlug: 'pushup', stepNo: 6, tier: 'INTERMEDIATE', locked: false },
  { movementSlug: 'squat', stepNo: 8, tier: 'ADVANCED', locked: false },
  { movementSlug: 'pullup', stepNo: 3, tier: 'BEGINNER', locked: true, lockReason: '器具なし' },
  { movementSlug: 'legraise', stepNo: 5, tier: 'INTERMEDIATE', locked: false },
  { movementSlug: 'bridge', stepNo: 4, tier: 'BEGINNER', locked: false },
  { movementSlug: 'hspu', stepNo: 2, tier: 'BEGINNER', locked: true, lockReason: '壁スペースなし' },
]

describe('PTRadar', () => {
  it('converts locked axes to zero score', () => {
    const prepared = prepareRadarAxes(sampleData)
    const pullup = prepared.find((axis) => axis.movementSlug === 'pullup')
    expect(pullup?.score).toBe(0)
  })

  it('renders consistent radar chart options', () => {
    render(<PTRadar data={sampleData} />)
    const pre = screen.getByTestId('echarts-mock')
    expect(pre).toBeTruthy()
    const option = JSON.parse(pre.textContent ?? '{}')

    expect(option.radar.splitNumber).toBe(30)
    expect(option.series[0].data[0].value[0]).toBeCloseTo(5.67, 2)
    expect(option.series[0].data[0].value[2]).toBe(0)
    expect(option.series[1].data[0].value[2]).toBe(10)
  })
})
