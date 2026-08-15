import { useState, useEffect } from 'react'
import { apiGet } from '../api/client'
import './SystemStatus.css'

interface SystemInfo {
  version: string
  name: string
  description: string
  config: Record<string, unknown>
  nodeVersion: string
  platform: string
  cwd: string
  uptime: number
}

export default function SystemStatus() {
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<SystemInfo>('/status')
      .then(setInfo)
      .catch(err => setError(err.message))
  }, [])

  if (error) {
    return <div className="error-box">{error}</div>
  }

  if (!info) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="status-page">
      <h1 className="page-title">📊 系统状态</h1>
      <p className="page-desc">HarnessX 运行环境与配置信息。</p>

      <div className="status-grid">
        <div className="status-card">
          <h3>版本信息</h3>
          <div className="status-items">
            <div className="status-item">
              <span className="status-label">HarnessX</span>
              <span className="status-value">{info.version}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Node.js</span>
              <span className="status-value">{info.nodeVersion}</span>
            </div>
            <div className="status-item">
              <span className="status-label">平台</span>
              <span className="status-value">{info.platform}</span>
            </div>
            <div className="status-item">
              <span className="status-label">运行时间</span>
              <span className="status-value">{Math.round(info.uptime)}s</span>
            </div>
          </div>
        </div>

        <div className="status-card">
          <h3>工作目录</h3>
          <div className="status-items">
            <div className="status-item">
              <span className="status-label">CWD</span>
              <span className="status-value status-path">{info.cwd}</span>
            </div>
          </div>
        </div>

        <div className="status-card status-card-full">
          <h3>运行配置</h3>
          <div className="status-items">
            {Object.entries(info.config).map(([key, value]) => (
              <div key={key} className="status-item">
                <span className="status-label">{key}</span>
                <span className="status-value">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}