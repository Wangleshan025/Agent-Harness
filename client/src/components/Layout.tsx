import { ReactNode } from 'react'
import NavSidebar from './NavSidebar'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <NavSidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}