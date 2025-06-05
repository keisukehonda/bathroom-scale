import { useEffect, useState } from "react"
import WeightChart from './components/WeightChart'

type Record = {
  date: string
  weight: string
}

const BASE_WEIGHT = 99.6
const ITEMS_PER_PAGE = 10

function App() {
  const [records, setRecords] = useState<Record[]>([])
  const [date, setDate] = useState("")
  const [weight, setWeight] = useState("")
  const [page, setPage] = useState(1)

  const getDifference = (w: string) => {
    const num = parseFloat(w)
    if (isNaN(num)) return "±0.0kg"
    const diff = num - BASE_WEIGHT
    const sign = diff >= 0 ? "+" : ""
    return `${sign}${diff.toFixed(1)}kg`
  }

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/load")
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()

      const sorted = data.sort((a: Record, b: Record) =>
        b.date.localeCompare(a.date)
      )
      setRecords(sorted)
    } catch (err) {
      console.error("load failed:", (err as Error).message)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  const addRecord = async () => {
    if (!date || !weight) return
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, weight }),
      })
      if (!res.ok) throw new Error(await res.text())

      await fetchRecords()
      setDate("")
      setWeight("")
      setPage(1)
    } catch (err) {
      console.error("save failed:", (err as Error).message)
    }
  }

  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE)
  const pagedRecords = records.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  const chartData = records
    .map((r) => ({
      date: r.date,
      weight: parseFloat(r.weight),
    }))
    .filter((r) => !isNaN(r.weight))
    .sort((a, b) => a.date.localeCompare(b.date)) // グラフは昇順

  return (
    <div style={{ padding: "20px" }}>
      <h1>Bathroom Scale</h1>

      <h2>体重グラフ</h2>
      <WeightChart data={chartData} />

      <h2>記録を追加</h2>
      <div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="text"
          placeholder="体重 (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          style={{ marginLeft: "10px" }}
        />
        <button onClick={addRecord} style={{ marginLeft: "10px" }}>
          追加
        </button>
      </div>

      <h2>記録一覧</h2>
      <table border={1} cellPadding={5}>
        <thead>
          <tr>
            <th>日付</th>
            <th>体重 (kg)</th>
            <th>差分</th>
          </tr>
        </thead>
        <tbody>
          {pagedRecords.map((r, i) => (
            <tr key={i}>
              <td>{r.date}</td>
              <td>{r.weight}</td>
              <td>{getDifference(r.weight)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ marginTop: "10px" }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              disabled={page === i + 1}
              style={{ marginRight: "5px" }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
