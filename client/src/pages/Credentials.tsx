import { useState } from 'react'
import { apiPost } from '../api/client'
import './Credentials.css'

type CredAction = 'init' | 'update' | 'clear' | 'status' | null

export default function Credentials() {
  const [masterPassword, setMasterPassword] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [action, setAction] = useState<CredAction>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleAction = async (credAction: CredAction) => {
    if (!masterPassword) {
      setError('请输入主密码')
      return
    }
    if ((credAction === 'init' || credAction === 'update') && !apiKey) {
      setError('请输入 API Key')
      return
    }

    setAction(credAction)
    setError('')
    setResult(null)

    try {
      const body: Record<string, string> = { masterPassword }
      if (credAction === 'init' || credAction === 'update') body.apiKey = apiKey

      const res = await apiPost<{ success?: boolean; initialized?: boolean; keyExists?: boolean; error?: string }>(`/cred/${credAction}`, body)
      if (res.error) {
        setError(res.error)
      } else if (credAction === 'status') {
        setResult(`已初始化: ${res.initialized ? '✅' : '❌'}, Key 存在: ${res.keyExists ? '✅' : '❌'}`)
      } else {
        setResult('操作成功完成 ✅')
        setApiKey('')
        setMasterPassword('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setAction(null)
    }
  }

  return (
    <div className="credentials-page">
      <h1 className="page-title">🔑 凭据管理</h1>
      <p className="page-desc">安全配置 DeepSeek API Key。凭据使用 AES-256-GCM 加密存储。</p>

      <div className="cred-warning">
        ⚠️ 主密码和 API Key 不会回显。请确保在安全的环境下操作。
      </div>

      <div className="cred-form">
        <div className="form-row">
          <label className="form-label">主密码</label>
          <input
            type="password"
            className="form-input"
            value={masterPassword}
            onChange={e => setMasterPassword(e.target.value)}
            placeholder="设置或输入主密码"
          />
        </div>
        <div className="form-row">
          <label className="form-label">API Key (DeepSeek)</label>
          <input
            type="password"
            className="form-input"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </div>

        <div className="cred-actions">
          <button className="btn btn-primary" onClick={() => handleAction('init')} disabled={action !== null}>
            {action === 'init' ? '⏳ 处理中...' : '初始化'}
          </button>
          <button className="btn btn-primary" onClick={() => handleAction('update')} disabled={action !== null}>
            {action === 'update' ? '⏳ 处理中...' : '更新'}
          </button>
          <button className="btn btn-danger" onClick={() => handleAction('clear')} disabled={action !== null}>
            {action === 'clear' ? '⏳ 处理中...' : '清除'}
          </button>
          <button className="btn btn-secondary" onClick={() => handleAction('status')} disabled={action !== null}>
            {action === 'status' ? '⏳ 查询中...' : '查看状态'}
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {result && <div className="result-box">{result}</div>}
    </div>
  )
}