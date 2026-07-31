import React from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Screening from './pages/Screening';
import RecordDetail from './pages/RecordDetail';
import Categories from './pages/Categories';

export default function App() {
  const location = useLocation();

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <NavLink to="/" className="logo">
            <div className="logo-mark">K</div>
            <div className="logo-text">
              <span className="logo-title">K-PRO 스크리닝 도우미</span>
              <span className="logo-subtitle">㈜리얼게인 · RealGain</span>
            </div>
          </NavLink>
          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              대시보드
            </NavLink>
            <NavLink to="/screening" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              신규 스크리닝
            </NavLink>
            <NavLink to="/categories" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              기준 문서
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/screening" element={<Screening />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/categories" element={<Categories />} />
        </Routes>
      </main>
    </div>
  );
}
