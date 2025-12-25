import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import DeclarationDetail from './pages/DeclarationDetail'
import { Layout } from 'lucide-react'

function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <header className="header">
          <div className="logo">
             <Layout style={{color: 'var(--primary)'}} />
             <span>POTHEN Watch</span>
          </div>
          <nav>
            <Link to="/" className="nav-link">Dashboard</Link>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/declaration/:id" element={<DeclarationDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
