import './App.css'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import PTDashboard from './pages/pt/PTDashboard'
import PTMovementDetail from './pages/pt/PTMovementDetail'
import PTSettings from './pages/pt/PTSettings'
import WeightDashboard from './pages/WeightDashboard'

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header__inner">
            <h1 className="app-title">Bathroom Scale</h1>
            <nav className="app-nav" aria-label="メインナビゲーション">
              <NavLink to="/" end className="app-nav__link">
                体重記録
              </NavLink>
              <NavLink to="/pt" className="app-nav__link">
                PT 記録
              </NavLink>
              <NavLink to="/pt/settings" className="app-nav__link">
                PT 設定
              </NavLink>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<WeightDashboard />} />
            <Route path="/pt" element={<PTDashboard />} />
            <Route path="/pt/movement/:slug" element={<PTMovementDetail />} />
            <Route path="/pt/settings" element={<PTSettings />} />
            <Route path="*" element={<WeightDashboard />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <small>プリズナートレーニング記録モジュール β版</small>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
