import { useState, useRef, useEffect } from 'react'
import { createTaskStream } from '../api/client'
import './TaskRunner.css'

interface StreamEvent {
  type: string
  data: unknown
}

interface LogEntry {
  id: string
  type: 'thought' | 'guardrail' | 'action' | 'observation' | 'complete' | 'error' | 'result'
  content: string
  timestamp: number
  meta?: Record<string, unknown>
}

export default function TaskRunner() {
  const [task, setTask] = useState('')
  const [mock, setMock] = useState(true)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('harness_api_key') || '')
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleRun = () => {
    if (!task.trim() || running) return
    if (!mock && !apiKey.trim()) {
      setLogs(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'error',
        content: '请先输入 DeepSeek API Key',
        timestamp: Date.now(),
      }])
      return
    }

    // Save API key to localStorage for persistence
    if (apiKey) {
      localStorage.setItem('harness_api_key', apiKey)
    }

    setRunning(true)
    setLogs([])
    setResult(null)

    controllerRef.current = createTaskStream(
      task,
      mock,
      (event: StreamEvent) => {
        const { type, data } = event
        const entry: LogEntry = {
          id: `${type}-${Date.now()}-${Math.random()}`,
          type: type as LogEntry['type'],
          content: '',
          timestamp: Date.now(),
          meta: data as Record<string, unknown>,
        }

        switch (type) {
          case 'thought':
            entry.content = String((data as Record<string, unknown>).content || '')
            break
          case 'guardrail': {
            const d = data as Record<string, unknown>
            entry.content = `护栏: ${d.action === 'allow' ? '✅ 允许' : '❌ 拦截'} · ${d.reason || ''}`
            break
          }
          case 'action': {
            const d = data as Record<string, unknown>
            entry.content = `执行操作: ${d.action} ${JSON.stringify(d.params || {})}`
            break
          }
          case 'observation': {
            const d = data as Record<string, unknown>
            entry.content = String(d.output || '')
            break
          }
          case 'result': {
            const d = data as Record<string, unknown>
            entry.content = d.status === 'completed' ? '✅ 任务完成' : d.status === 'failed' ? '❌ 任务失败' : d.status === 'blocked' ? '❌ 被护栏拦截' : `⚠️ ${d.status || '未知'}`
            setResult(d as Record<string, unknown>)
            setRunning(false)
            break
          }
          default:
            entry.content = JSON.stringify(data)
        }

        setLogs(prev => [...prev, entry])
      },
      () => {
        setRunning(false)
      },
      (err) => {
        setLogs(prev => [...prev, {
          id: `error-${Date.now()}`,
          type: 'error',
          content: `Error: ${err.message}`,
          timestamp: Date.now(),
        }])
        setRunning(false)
      },
      apiKey,
    )
  }

  const handleStop = () => {
    controllerRef.current?.abort()
    setRunning(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleRun()
    }
  }

  return (
    <div className="task-runner">
      <h1 className="page-title">🏠 任务运行器</h1>
      <p className="page-desc">输入任务描述，实时查看 Agent 的思考-行动-观察循环。</p>

      <div className="task-input-area">
        <textarea
          className="task-input"
          placeholder="输入任务描述，例如：为 utils.ts 添加单元测试..."
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={running}
        />
        <div className="task-actions">
          <div className="task-mode-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={!mock}
                onChange={e => setMock(!e.target.checked)}
                disabled={running}
              />
              <span className="toggle-text">{mock ? '🔁 模拟模式' : '🤖 真实 LLM'}</span>
            </label>
            {!mock && (
              <span className="mode-hint">需先配置 DeepSeek API Key</span>
            )}
          </div>
          {!mock && (
            <div className="task-api-key-row">
              <input
                type="password"
                className="task-api-key-input"
                placeholder="输入 DeepSeek API Key (sk-...)"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                disabled={running}
              />
            </div>
          )}
          <div className="task-action-buttons">
            <span className="task-hint">Ctrl+Enter 运行</span>
            {running ? (
              <button className="btn btn-danger" onClick={handleStop}>
                ⏹ 停止
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleRun} disabled={!task.trim()}>
                ▶ 运行
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="agent-log">
        {logs.length === 0 && !running && (
          <div className="log-empty">
            <span className="log-empty-icon">🔧</span>
            <p>输入任务描述并点击运行，Agent 的执行过程将实时显示在这里。</p>
          </div>
        )}

        {logs.map((entry, i) => (
          <div key={entry.id} className={`log-entry log-${entry.type}`}>
            <div className="log-header">
              <span className="log-turn">#{i + 1}</span>
              <span className="log-type-badge">{entry.type}</span>
              <span className="log-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="log-body">
              {entry.type === 'thought' && (
                <div className="log-thought">💭 {entry.content}</div>
              )}
              {entry.type === 'guardrail' && (
                <div className="log-guardrail">{entry.content}</div>
              )}
              {entry.type === 'action' && (
                <div className="log-action">🔧 {entry.content}</div>
              )}
              {entry.type === 'observation' && (
                <pre className="log-observation">{entry.content}</pre>
              )}
              {(entry.type === 'complete' || entry.type === 'result') && (
                <div className="log-complete">{entry.content}</div>
              )}
              {entry.type === 'error' && (
                <div className="log-error">{entry.content}</div>
              )}
            </div>
          </div>
        ))}

        {running && (
          <div className="log-entry log-pending">
            <div className="log-body">
              <span className="pending-dot">●</span> Agent 正在思考...
            </div>
          </div>
        )}

        <div ref={logEndRef} />
      </div>

      {result && (
        <div className="result-summary">
          <h3>📋 任务完成汇总</h3>
          <div className="result-grid">
            <div className="result-item">
              <span className="result-label">状态</span>
              <span className={`result-value ${result.status === 'completed' ? 'text-success' : 'text-danger'}`}>
                {String(result.status)}
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">迭代次数</span>
              <span className="result-value">{String(result.totalIterations || '—')}</span>
            </div>
            <div className="result-item result-full">
              <span className="result-label">摘要</span>
              <span className="result-value">{String(result.summary || '')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}