import { useState } from 'react'
import { apiPost } from '../api/client'
import './Feedback.css'

const PRESET_OUTPUT = `✓ should pass (12ms)
✗ should return correct value (8ms)
  AssertionError: expected 3 to equal 5
  at /project/tests/unit/example.test.ts:10:5`

interface AnalyzeResult {
  total: number
  passed: number
  failed: number
  results: Array<{ testName: string; passed: boolean; output: string }>
  category: { category: string; confidence: number }
  strategy: { maxRetries: number; action: string; prompt: string }
}

export default function Feedback() {
  const [testOutput, setTestOutput] = useState('')
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    if (!testOutput.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await apiPost<AnalyzeResult>('/feedback/analyze', { testOutput })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      compilation_error: '编译错误',
      test_failure: '测试失败',
      runtime_error: '运行时异常',
      lint_error: '代码风格错误',
      timeout: '超时',
      unknown: '无法分类',
    }
    return map[cat] || cat
  }

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = {
      compilation_error: 'var(--color-danger)',
      test_failure: 'var(--color-warning)',
      runtime_error: 'var(--color-danger)',
      lint_error: 'var(--color-orange)',
      timeout: 'var(--color-warning)',
      unknown: 'var(--text-muted)',
    }
    return map[cat] || 'var(--text-muted)'
  }

  return (
    <div className="feedback-page">
      <h1 className="page-title">🔄 反馈闭环</h1>
      <p className="page-desc">模拟测试失败场景，展示 Validator → Classifier → Corrector 的完整反馈闭环。</p>

      <div className="feedback-form">
        <div className="form-row">
          <label className="form-label">测试输出</label>
          <textarea
            className="form-textarea feedback-textarea"
            value={testOutput}
            onChange={e => setTestOutput(e.target.value)}
            rows={6}
            placeholder="粘贴测试输出..."
          />
        </div>
        <div className="feedback-actions">
          <button
            className="preset-btn"
            onClick={() => setTestOutput(PRESET_OUTPUT.trim())}
          >
            预设场景
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAnalyze}
            disabled={loading || !testOutput.trim()}
          >
            {loading ? '🔍 分析中...' : '🔍 分析'}
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {result && (
        <div className="pipeline">
          <div className="pipeline-step">
            <div className="step-header">
              <span className="step-number">1</span>
              <span className="step-title">校验器 (Validator)</span>
              <span className="step-status">✅ 完成</span>
            </div>
            <div className="step-body">
              <div className="stat-row">
                <span>测试总数: <strong>{result.results.length}</strong></span>
                <span>通过: <strong className="text-success">{result.results.filter(r => r.passed).length}</strong></span>
                <span>失败: <strong className="text-danger">{result.results.filter(r => !r.passed).length}</strong></span>
              </div>
              {result.results.filter(r => !r.passed).length > 0 && (
                <div className="failed-list">
                  <strong>失败测试:</strong>
                  {result.results.filter(r => !r.passed).map((r, i) => (
                    <div key={i} className="failed-item">
                      <span>✗ {r.testName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pipeline-step">
            <div className="step-header">
              <span className="step-number">2</span>
              <span className="step-title">分类器 (Classifier)</span>
              <span className="step-status">✅ 完成</span>
            </div>
            <div className="step-body">
              <div className="category-display">
                <span className="category-badge" style={{ background: `${categoryColor(result.category.category)}20`, color: categoryColor(result.category.category) }}>
                  📂 {categoryLabel(result.category.category)}
                </span>
                <span className="confidence">
                  置信度: <strong>{(result.category.confidence * 100).toFixed(0)}%</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="pipeline-step">
            <div className="step-header">
              <span className="step-number">3</span>
              <span className="step-title">修正策略 (Corrector)</span>
              <span className="step-status">✅ 完成</span>
            </div>
            <div className="step-body">
              <div className="strategy-grid">
                <div className="strategy-item">
                  <span className="strategy-label">修正动作</span>
                  <span className="strategy-value">{result.strategy.action}</span>
                </div>
                <div className="strategy-item">
                  <span className="strategy-label">最大重试</span>
                  <span className="strategy-value">{result.strategy.maxRetries} 次</span>
                </div>
                <div className="strategy-item strategy-full">
                  <span className="strategy-label">修正提示</span>
                  <span className="strategy-value">{result.strategy.prompt}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}