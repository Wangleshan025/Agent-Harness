import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import TaskRunner from './pages/TaskRunner'
import Governance from './pages/Governance'
import Feedback from './pages/Feedback'
import Demo from './pages/Demo'
import Credentials from './pages/Credentials'
import SystemStatus from './pages/SystemStatus'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TaskRunner />} />
        <Route path="/governance" element={<Governance />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/credentials" element={<Credentials />} />
        <Route path="/status" element={<SystemStatus />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}