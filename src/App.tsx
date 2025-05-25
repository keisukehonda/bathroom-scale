import { useEffect, useState } from "react";

type Record = {
  date: string;
  weight: string;
};

const BASE_WEIGHT = 99.6;

function App() {
  const [records, setRecords] = useState<Record[]>([]);
  const [date, setDate] = useState("");
  const [weight, setWeight] = useState("");

  // ✅ 初回ロード：Upstashから取得
  useEffect(() => {
    fetch("/api/load")
      .then((res) => res.json())
      .then((data) => setRecords(data));
  }, []);

  // ✅ 差分表示
  const getDifference = (w: string) => {
    const num = parseFloat(w);
    if (isNaN(num)) return "±0.0kg";
    const diff = num - BASE_WEIGHT;
    const sign = diff >= 0 ? "+" : "";
    return `${sign}${diff.toFixed(1)}kg`;
  };

  // ✅ 記録を追加：UpstashへPOST → 再取得
  const addRecord = async () => {
    if (!date || !weight) return;
    await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, weight }),
    });

    // 保存成功後、再取得
    const res = await fetch("/api/load");
    const data = await res.json();
    setRecords(data);

    // フォームリセット
    setDate("");
    setWeight("");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Bathroom Scale</h1>

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
          {records.map((r, i) => (
            <tr key={i}>
              <td>{r.date}</td>
              <td>{r.weight}</td>
              <td>{getDifference(r.weight)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
