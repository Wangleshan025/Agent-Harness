import { useState, useRef, useEffect } from 'react'
import { createTaskStream } from '../api/client'
import './TaskRunner.css'

interface StreamEvent {
  type: string
  data: Record<string, unknown>
}

interface LogEntry {
  id: string
  type: 'thought' | 'guardrail' | 'observation' | 'complete' | 'error'
  content: string
  timestamp: number
  meta?: Record<string, unknown>
}

export default function TaskRunner() {
  const [task, setTask] = useState('')
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

    setRunning(true)
    setLogs([])
    setResult(null)

    controllerRef.current = createTaskStream(
      task,
      true,
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
            entry.content = String(data.content || '')
            break
          case 'guardrail':
            entry.content = `护栏: ${data.action === 'allow' ? '✅ 允许' : '❌ 拦截'} · ${data.reason || ''}`
            break
          case 'observation':
            entry.content = String(data.output || '')
            break
          case 'complete':
            entry.content = data.success ? '✅ 任务完成' : '❌ 任务失败'
            setResult(data as Record<string, unknown>)
            setRunning(false)
            break
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
              {entry.type === 'observation' && (
                <pre className="log-observation">{entry.content}</pre>
              )}
              {entry.type === 'complete' && (
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
              <span className={`result-value ${result.success ? 'text-success' : 'text-danger'}`}>
                {result.success ? '成功' : '失败'}
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">迭代次数</span>
              <span className="result-value">{String(result.totalIterations)}</span>
            </div>
            <div className="result-item result-full">
              <span className="result-label">摘要</span>
              <span className="result-value">{String(result.summary)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}