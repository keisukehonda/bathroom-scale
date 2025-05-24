import React, { useState, useEffect } from "react";

type Record = {
  date: string;
  weight: string;
};

const STORAGE_KEY = "weight-records";
const BASE_WEIGHT = 99.6;

function App() {
  const [records, setRecords] = useState<Record[]>([]);
  const [date, setDate] = useState("");
  const [weight, setWeight] = useState("");

  // 初回：localStorageから読み込み
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setRecords(JSON.parse(saved));
    }
  }, []);

  // 変更時：localStorageへ保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const addRecord = () => {
    if (!date || !weight) return;
    const newRecords = [...records, { date, weight }];
    setRecords(newRecords);
    setDate("");
    setWeight("");
  };

  // 差分を計算する関数
  const getDifference = (w: string) => {
    const num = parseFloat(w);
    if (isNaN(num)) return "±0.0kg";
    const diff = num - BASE_WEIGHT;
    const sign = diff >= 0 ? "+" : "";
    return `${sign}${diff.toFixed(1)}kg`;
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
