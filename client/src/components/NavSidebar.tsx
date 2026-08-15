import { NavLink } from 'react-router-dom'
import './NavSidebar.css'

const navItems = [
  { path: '/', label: '任务运行', icon: '🏠' },
  { path: '/governance', label: '治理护栏', icon: '🛡️' },
  { path: '/feedback', label: '反馈闭环', icon: '🔄' },
  { path: '/demo', label: '机制演示', icon: '🎯' },
  { path: '/credentials', label: '凭据管理', icon: '🔑' },
  { path: '/status', label: '系统状态', icon: '📊' },
]

export default function NavSidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">🔧</span>
        <span className="sidebar-title">HarnessX</span>
      </div>
      <ul className="sidebar-nav">
        {navItems.map(item => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}