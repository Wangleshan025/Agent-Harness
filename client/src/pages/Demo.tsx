import { useState } from 'react'
import { apiGet } from '../api/client'
import './Demo.css'

interface GovernanceResult {
  desc: string
  action: string
  params: Record<string, unknown>
  result: { action: string; level: string; reason: string; riskScore?: number }
}

interface FeedbackResult {
  total: number
  failed: number
  failedTests: string[]
  category: { category: string; confidence: number }
  strategy: { action: string; prompt: string }
}

interface FullResult {
  governance: GovernanceResult[]
  feedback: { total: number; failed: number; category: { category: string; confidence: number }; strategy: { action: string; prompt: string } }
}

export default function Demo() {
  const [demo1Result, setDemo1Result] = useState<{ results: GovernanceResult[] } | null>(null)
  const [demo2Result, setDemo2Result] = useState<FeedbackResult | null>(null)
  const [demo3Result, setDemo3Result] = useState<FullResult | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const runDemo = async <T,>(demo: string, setter: (r: T) => void) => {
    setLoading(demo)
    try {
      const res = await apiGet<T>(`/demo/${demo}`)
      setter(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  const statusIcon = (action: string) => {
    switch (action) {
      case 'allow': return '✅'
      case 'block': return '❌'
      case 'request_approval': return '⏳'
      default: return '❓'
    }
  }

  return (
    <div className="demo-page">
      <h1 className="page-title">🎯 机制演示</h1>
      <p className="page-desc">一键运行三个核心演示，验证 HarnessX 的核心机制。</p>

      <div className="demo-cards">
        <div className="demo-card">
          <div className="demo-card-header">
            <span className="demo-card-num">演示 1</span>
            <h3>治理护栏拦截危险动作</h3>
          </div>
          <p className="demo-card-desc">测试危险命令拦截、安全命令放行、路径越界阻止。</p>
          <button
            className="btn btn-primary"
            onClick={() => runDemo('governance', setDemo1Result)}
            disabled={loading === 'governance'}
          >
            {loading === 'governance' ? '⏳ 运行中...' : '▶ 运行'}
          </button>
          {demo1Result && (
            <div className="demo-results">
              {demo1Result.results.map((item, i) => (
                <div key={i} className={`demo-result-item ${item.result.action === 'block' ? 'demo-block' : 'demo-allow'}`}>
                  <span className="demo-result-icon">{statusIcon(item.result.action)}</span>
                  <span className="demo-result-label">{item.desc}</span>
                  <span className="demo-result-reason">{item.result.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="demo-card">
          <div className="demo-card-header">
            <span className="demo-card-num">演示 2</span>
            <h3>反馈闭环 — 测试失败 → 分类 → 修正策略</h3>
          </div>
          <p className="demo-card-desc">注入一次测试失败，验证分类器与修正策略选择器。</p>
          <button
            className="btn btn-primary"
            onClick={() => runDemo('feedback', setDemo2Result)}
            disabled={loading === 'feedback'}
          >
            {loading === 'feedback' ? '⏳ 运行中...' : '▶ 运行'}
          </button>
          {demo2Result && (
            <div className="demo-results">
              <div className="demo-result-stat">
                <span>测试总数: <strong>{demo2Result.total}</strong></span>
                <span>失败: <strong className="text-danger">{demo2Result.failed}</strong></span>
              </div>
              <div className="demo-result-item demo-block">
                <span className="demo-result-label">失败测试: {demo2Result.failedTests[0]}</span>
              </div>
              <div className="demo-result-item">
                <span className="demo-result-label">
                  分类: {demo2Result.category.category} ({(demo2Result.category.confidence * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="demo-result-item">
                <span className="demo-result-label">
                  修正: {demo2Result.strategy.action} — {demo2Result.strategy.prompt}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="demo-card">
          <div className="demo-card-header">
            <span className="demo-card-num">演示 3</span>
            <h3>三层治理护栏完整流程</h3>
          </div>
          <p className="demo-card-desc">同时展示四种场景：危险命令、高风险、安全写入、安全命令。</p>
          <button
            className="btn btn-primary"
            onClick={() => runDemo('full', setDemo3Result)}
            disabled={loading === 'full'}
          >
            {loading === 'full' ? '⏳ 运行中...' : '▶ 运行'}
          </button>
          {demo3Result && (
            <div className="demo-results">
              {demo3Result.governance.map((item, i) => (
                <div key={i} className={`demo-result-item ${item.result.action === 'block' ? 'demo-block' : 'demo-allow'}`}>
                  <span className="demo-result-icon">{statusIcon(item.result.action)}</span>
                  <span className="demo-result-label">{item.desc}</span>
                  <span className="demo-result-detail">
                    层级: {item.result.level} | {item.result.reason}
                  </span>
                </div>
              ))}
              {demo3Result.feedback && (
                <div className="demo-result-item">
                  <span className="demo-result-label">
                    反馈闭环: {demo3Result.feedback.failed} 个失败
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}