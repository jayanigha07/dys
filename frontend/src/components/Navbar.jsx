import { NavLink, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <nav className={`navbar ${isHome ? 'navbar-light' : ''}`}>
      <NavLink to="/" className={`navbar-brand ${isHome ? 'navbar-brand-light' : ''}`}>
        <span className="brain-icon">🧠</span>
        DysLexia<span style={{ color: isHome ? '#7C3AED' : 'var(--accent)' }}>Screen</span>
      </NavLink>
      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isHome ? 'nav-link-light' : ''} ${isActive ? 'active' : ''}`}>Home</NavLink>
        <NavLink to="/children" className={({ isActive }) => `nav-link ${isHome ? 'nav-link-light' : ''} ${isActive ? 'active' : ''}`}>👨‍👩‍👧 Children</NavLink>
        <NavLink to="/games" className={({ isActive }) => `nav-link ${isHome ? 'nav-link-light' : ''} ${isActive ? 'active' : ''}`}>🎮 Assessment</NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isHome ? 'nav-link-light' : ''} ${isActive ? 'active' : ''}`}>📊 Dashboard</NavLink>
        <NavLink to="/improvement" className={({ isActive }) => `nav-link ${isHome ? 'nav-link-light' : ''} ${isActive ? 'active' : ''}`}>🚀 Practice</NavLink>
      </div>
    </nav>
  )
}
