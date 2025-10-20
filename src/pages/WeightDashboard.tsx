import { useEffect, useMemo, useState } from 'react'
import DailyPlanCard from '../components/DailyPlanCard'
import WeightChart from '../components/WeightChart'

type Record = {
  date: string
  weight: string
}

const BASE_WEIGHT = 99.6
const ITEMS_PER_PAGE = 10

const getDifference = (weight: string) => {
  const num = parseFloat(weight)
  if (Number.isNaN(num)) return '±0.0kg'
  const diff = num - BASE_WEIGHT
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${diff.toFixed(1)}kg`
}

const sortRecords = (entries: Record[]) =>
  [...entries].sort((a, b) => b.date.localeCompare(a.date))

function WeightDashboard() {
  const [records, setRecords] = useState<Record[]>([])
  const [date, setDate] = useState('')
  const [weight, setWeight] = useState('')
  const [page, setPage] = useState(1)

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/load')
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as Record[]
      setRecords(sortRecords(data))
    } catch (error) {
      console.error('load failed:', (error as Error).message)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  const addRecord = async () => {
    if (!date || !weight) return

    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, weight }),
      })
      if (!res.ok) throw new Error(await res.text())

      await fetchRecords()
      setDate('')
      setWeight('')
      setPage(1)
    } catch (error) {
      console.error('save failed:', (error as Error).message)
    }
  }

  const totalPages = Math.max(1, Math.ceil(records.length / ITEMS_PER_PAGE))
  const pagedRecords = useMemo(
    () =>
      records.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [page, records],
  )

  const chartData = useMemo(
    () =>
      records
        .map((record) => ({
          date: record.date,
          weight: parseFloat(record.weight),
        }))
        .filter((record) => !Number.isNaN(record.weight))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [records],
  )

  return (
    <div className="card">
      <DailyPlanCard />

      <section className="section">
        <header className="section__header">
          <h2>体重グラフ</h2>
          <p className="section__hint">過去の推移を折れ線で確認できます。</p>
        </header>
        <WeightChart data={chartData} />
      </section>

      <section className="section">
        <header className="section__header">
          <h2>記録を追加</h2>
          <p className="section__hint">日付と体重を入力して追加します。</p>
        </header>
        <div className="form-row">
          <label className="form-field">
            <span className="form-field__label">日付</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label className="form-field">
            <span className="form-field__label">体重 (kg)</span>
            <input
              type="text"
              placeholder="例: 70.5"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
            />
          </label>
          <button type="button" onClick={addRecord} className="primary-button">
            追加
          </button>
        </div>
      </section>

      <section className="section">
        <header className="section__header">
          <h2>記録一覧</h2>
          <p className="section__hint">最新10件ずつ表示します。</p>
        </header>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>日付</th>
                <th>体重 (kg)</th>
                <th>差分</th>
              </tr>
            </thead>
            <tbody>
              {pagedRecords.map((record, index) => (
                <tr key={`${record.date}-${index}`}>
                  <td>{record.date}</td>
                  <td>{record.weight}</td>
                  <td>{getDifference(record.weight)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPage(index + 1)}
                className={page === index + 1 ? 'pagination__button is-active' : 'pagination__button'}
              >
                {index + 1}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default WeightDashboard
