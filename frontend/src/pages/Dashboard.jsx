import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell, Legend,
} from 'recharts'
import { predict, getModelStats, getPrediction, PDF_URL } from '../api'

/* ── Helpers ─────────────────────────────────────────────── */
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 }

function aggregateGameResults(cid) {
  const rawKey = cid ? `child_${cid}_gameResults` : 'gameResults'
  const raw = JSON.parse(localStorage.getItem(rawKey) || '{}')
  const games = Object.values(raw)
  if (!games.length) return null
  return {
    accuracy_score:    avg(games.map(g => g.accuracy_score)),
    avg_response_time: avg(games.map(g => g.avg_response_time)),
    error_rate:        avg(games.map(g => g.error_rate)),
    confusion_score:   avg(games.map(g => g.confusion_score)),
    retry_count:       avg(games.map(g => g.retry_count)),
    memory_score:      avg(games.map(g => g.memory_score)),
    reading_time:      avg(games.map(g => g.reading_time)),
  }
}

const RISK_COLOR = { Low: '#10B981', Medium: '#F59E0B', High: '#EF4444' }
const FEATURE_LABELS = {
  accuracy_score:    'Accuracy',
  avg_response_time: 'Response Time',
  error_rate:        'Error Rate',
  confusion_score:   'Confusion',
  retry_count:       'Retries',
  memory_score:      'Memory',
  reading_time:      'Reading Time',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1A1830', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.6rem 1rem', fontSize: '0.85rem', color: '#F0EEFF' }}>
      <strong>{label}</strong><br />
      {payload.map(p => <div key={p.name} style={{ color: p.color || '#A78BFA' }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</div>)}
    </div>
  )
}

export default function Dashboard() {
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)
  const [modelStats, setModelStats] = useState(null)
  const [tab, setTab]             = useState('overview')
  const [error, setError]         = useState(null)

  const cid = searchParams.get('child') || localStorage.getItem('activeChildId')
  const sidParam = searchParams.get('session')
  const sessionId = sidParam || (cid ? localStorage.getItem(`child_${cid}_sessionId`) : localStorage.getItem('sessionId'))
  const [childName, setChildName] = useState('Assessment')

  useEffect(() => {
    if (cid) {
      const list = JSON.parse(localStorage.getItem('children') || '[]')
      const c = list.find(x => String(x.id) === String(cid))
      if (c) setChildName(c.name)
    } else {
      setChildName(localStorage.getItem('childName') || 'Assessment')
    }
    loadData()
  }, [cid])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      // 1. Try local child cache
      let predData = null
      if (cid) {
        const stored = localStorage.getItem(`child_${cid}_prediction`)
        if (stored) predData = JSON.parse(stored)
      }

      // 2. Try fetching from backend
      if (!predData && sessionId) {
        try {
          predData = await getPrediction(sessionId)
          if (predData.detail) predData = null
        } catch { predData = null }
      }

      // 3. If no prediction yet, compute from game results
      if (!predData) {
        const agg = aggregateGameResults(cid)
        if (!agg) {
          setError('no_data')
          setLoading(false)
          return
        }
        predData = await predict({ session_id: Number(sessionId) || 1, ...agg })
        if (cid && predData && !predData.detail) {
          localStorage.setItem(`child_${cid}_prediction`, JSON.stringify(predData))
        }
      }

      const stats = await getModelStats()
      setResult(predData)
      setModelStats(stats)
    } catch (e) {
      setError('backend_down')
    } finally {
      setLoading(false)
    }
  }

  /* ── Error / Loading states ── */
  if (loading) return (
    <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>Analysing results…</p>
    </div>
  )

  if (error === 'backend_down') return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
      <h2 style={{ marginBottom: '0.5rem' }}>Backend Offline</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Make sure FastAPI is running on <code>http://localhost:8000</code></p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={loadData}>Retry</button>
        <button className="btn btn-ghost" onClick={() => navigate(cid ? '/children' : '/')}>← Back</button>
      </div>
    </div>
  )

  if (error === 'no_data') return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎮</div>
      <h2 style={{ marginBottom: '0.5rem' }}>No Assessment Data</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Complete the 4 games first, then come back here!</p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => navigate('/games')}>Start Assessment →</button>
        <button className="btn btn-ghost" onClick={() => navigate(cid ? '/children' : '/')}>← Back</button>
      </div>
    </div>
  )

  if (!result) return null

  /* ── Derived data ── */
  const riskLevel   = result.risk_level || 'Low'
  const riskCol     = RISK_COLOR[riskLevel] || '#10B981'
  const cm          = modelStats?.confusion_matrix || [[0,0],[0,0]]
  const tn = cm[0][0], fp = cm[0][1], fn = cm[1][0], tp = cm[1][1]

  const featureData = Object.entries(result.feature_importances || {}).map(([k, v]) => ({
    name: FEATURE_LABELS[k] || k,
    importance: v,
  })).sort((a, b) => b.importance - a.importance)

  const radarData = result.features ? Object.entries(result.features).map(([k, v]) => ({
    subject: FEATURE_LABELS[k] || k,
    value: Math.min(Math.max(v, 0), 1),
  })) : []

  const radialData = [
    { name: 'Risk', value: Math.round((result.probability_risk || 0) * 100), fill: riskCol },
  ]

  return (
    <div className="page" style={{ paddingBottom: '4rem' }}>

      {/* ── TOP BAR ── */}
      <div className="dashboard-header">
        <div>
          <h1 className="section-title">📊 Screening Dashboard</h1>
          <p className="section-subtitle">
            Session #{sessionId} · {childName}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(cid ? '/children' : '/')}>
            {cid ? '← Children' : '🏠 Home'}
          </button>
          <a href={PDF_URL(sessionId)} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
            📥 Download PDF
          </a>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/improvement')}>
            🚀 Practice Games
          </button>
        </div>
      </div>

      {/* ── DISCLAIMER ── */}
      <div className="disclaimer-banner" style={{ marginBottom: '1.5rem' }}>
        ⚠️ Screening result only — <strong>not a medical diagnosis</strong>. Consult a qualified specialist for formal evaluation.
      </div>

      {/* ── TABS ── */}
      <div className="tabs">
        {['overview','graphs','metrics','insights'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{ overview: '🏠 Overview', graphs: '📈 Graphs', metrics: '🔢 Metrics', insights: '💡 Insights' }[t]}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════ OVERVIEW ════════════════════════════════ */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Risk card + gauge */}
          <div className="grid-2">
            <div className="risk-gauge-wrap card-glow" style={{ borderColor: riskCol + '55' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                RISK ASSESSMENT
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <RadialBarChart innerRadius="60%" outerRadius="100%" data={radialData} startAngle={180} endAngle={0}>
                  <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'rgba(255,255,255,0.05)' }}>
                    <Cell fill={riskCol} />
                  </RadialBar>
                </RadialBarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'Nunito', color: riskCol, marginTop: '-1.5rem' }}>
                {Math.round((result.probability_risk || 0) * 100)}%
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Risk Probability</div>
              <span className={`badge badge-${riskLevel.toLowerCase()}`} style={{ fontSize: '1rem', padding: '0.4rem 1.25rem' }}>
                {riskLevel} Risk
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Accuracy Score', val: ((result.features?.accuracy_score || 0) * 100).toFixed(1) + '%', color: 'var(--success)' },
                { label: 'Memory Score',   val: ((result.features?.memory_score || 0) * 100).toFixed(1) + '%', color: 'var(--primary-light)' },
                { label: 'Error Rate',     val: ((result.features?.error_rate || 0) * 100).toFixed(1) + '%', color: 'var(--danger)' },
                { label: 'Avg Response',   val: (result.features?.avg_response_time || 0).toFixed(2) + 's', color: 'var(--accent)' },
              ].map(s => (
                <div className="stat-card" key={s.label} style={{ flex: 1 }}>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ color: s.color, fontSize: '1.6rem' }}>{s.val}</div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{
                      width: s.val.includes('%') ? s.val : '50%',
                      background: `linear-gradient(90deg, ${s.color}, ${s.color}88)`,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weak areas */}
          {result.weak_areas?.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.8rem' }}>⚠️ Identified Weak Areas</h3>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {result.weak_areas.map(a => <span key={a} className="weak-area-chip">⚡ {a}</span>)}
              </div>
            </div>
          )}

          {/* Model confidence */}
          <div className="grid-2">
            <div className="card">
              <div className="chart-title">🎯 Classification Confidence</div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {[
                  { label: 'No Risk', val: result.probability_no_risk, col: '#10B981' },
                  { label: 'At Risk', val: result.probability_risk,    col: riskCol },
                ].map(p => (
                  <div key={p.label} style={{ flex: 1, background: 'var(--bg-card2)', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.4rem' }}>{p.label}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: p.col, fontFamily: 'Nunito' }}>{Math.round(p.val * 100)}%</div>
                    <div className="progress-bar-wrap" style={{ marginTop: '0.5rem' }}>
                      <div className="progress-bar-fill" style={{ width: `${p.val * 100}%`, background: p.col }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {modelStats && (
              <div className="card">
                <div className="chart-title">🤖 Model Performance</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {[
                    { k: 'Accuracy',  v: (modelStats.accuracy * 100).toFixed(1) + '%' },
                    { k: 'F1-Score',  v: modelStats.f1_score.toFixed(3) },
                    { k: 'Precision', v: modelStats.precision.toFixed(3) },
                    { k: 'Recall',    v: modelStats.recall.toFixed(3) },
                  ].map(m => (
                    <div key={m.k} style={{ background: 'var(--bg-card2)', borderRadius: 10, padding: '0.75rem 1rem' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>{m.k}</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-light)', fontFamily: 'Nunito' }}>{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════ GRAPHS ════════════════════════════════ */}
      {tab === 'graphs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Feature Importance */}
          <div className="chart-card">
            <div className="chart-title">📊 Feature Importance (Random Forest)</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={featureData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#9D8EC4', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9D8EC4', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="importance" radius={[6, 6, 0, 0]}>
                  {featureData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${260 + i * 18}, 80%, ${60 + i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart */}
          {radarData.length > 0 && (
            <div className="chart-card">
              <div className="chart-title">🕸️ Child Performance Radar</div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} outerRadius={110}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9D8EC4', fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.35} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Confusion Matrix heatmap */}
          {modelStats && (
            <div className="chart-card">
              <div className="chart-title">🔥 Confusion Matrix (Model Evaluation)</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Based on population-level test set (300 samples · 80/20 split)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 6, maxWidth: 500 }}>
                <div />
                <div style={{ textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', padding: '0.3rem' }}>PREDICTED: NO RISK</div>
                <div style={{ textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', padding: '0.3rem' }}>PREDICTED: RISK</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', writingMode: 'initial' }}>ACTUAL: NO RISK</div>
                <div className="cm-cell cm-tn"><div className="cm-cell-label">True Negative (TN)</div><div className="cm-cell-value">{tn}</div></div>
                <div className="cm-cell cm-fp"><div className="cm-cell-label">False Positive (FP)</div><div className="cm-cell-value">{fp}</div></div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}>ACTUAL: RISK</div>
                <div className="cm-cell cm-fn"><div className="cm-cell-label">False Negative (FN)</div><div className="cm-cell-value">{fn}</div></div>
                <div className="cm-cell cm-tp"><div className="cm-cell-label">True Positive (TP)</div><div className="cm-cell-value">{tp}</div></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════ METRICS ════════════════════════════════ */}
      {tab === 'metrics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Child Metrics */}
          <div className="card">
            <div className="chart-title">👤 Child Assessment Metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', marginTop: '0.5rem' }}>
              {result.features && Object.entries(result.features).map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg-card2)', borderRadius: 12, padding: '1rem 1.25rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
                    {FEATURE_LABELS[k] || k}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-light)', fontFamily: 'Nunito' }}>
                    {typeof v === 'number' ? v.toFixed(3) : v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Stats */}
          {modelStats && (
            <div className="card">
              <div className="chart-title">🤖 Full Model Evaluation Report</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                {[
                  { k: 'Accuracy',          v: (modelStats.accuracy * 100).toFixed(2) + '%' },
                  { k: 'Precision',         v: modelStats.precision.toFixed(4) },
                  { k: 'Recall',            v: modelStats.recall.toFixed(4) },
                  { k: 'F1-Score',          v: modelStats.f1_score.toFixed(4) },
                  { k: 'CV Mean (F1)',      v: modelStats.cross_val_mean.toFixed(4) },
                  { k: 'CV Std',            v: '±' + modelStats.cross_val_std.toFixed(4) },
                  { k: 'True Positive',     v: tp },
                  { k: 'True Negative',     v: tn },
                  { k: 'False Positive',    v: fp },
                  { k: 'False Negative',    v: fn },
                ].map(m => (
                  <div key={m.k} style={{ background: 'var(--bg-card2)', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>{m.k}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-light)', fontFamily: 'Nunito' }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════ INSIGHTS ════════════════════════════════ */}
      {tab === 'insights' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card card-glow" style={{ borderColor: riskCol + '55' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2.5rem' }}>{riskLevel === 'Low' ? '✅' : riskLevel === 'Medium' ? '⚠️' : '🚨'}</span>
              <div>
                <h2 style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.4rem', color: riskCol }}>
                  {riskLevel} Dyslexia Risk
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {riskLevel === 'Low'
                    ? 'No significant indicators detected. Continue regular reading practice.'
                    : riskLevel === 'Medium'
                    ? 'Some risk indicators present. Monitor progress and consider specialist consultation.'
                    : 'Multiple risk indicators detected. Professional evaluation recommended.'}
                </p>
              </div>
            </div>
          </div>

          {result.weak_areas?.length > 0 && (
            <div className="card">
              <div className="chart-title">⚡ Areas Needing Attention</div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {result.weak_areas.map(a => <span key={a} className="weak-area-chip">⚡ {a}</span>)}
              </div>
            </div>
          )}

          <div className="card">
            <div className="chart-title">💡 Personalised Recommendations</div>
            <ul className="rec-list" style={{ marginTop: '0.5rem' }}>
              {(result.recommendations || ['Continue regular reading practice.']).map((r, i) => (
                <li key={i} className="rec-item">
                  <span className="rec-num">{i + 1}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="info-box">
            <strong>⚠️ Important Note:</strong> This screening tool uses a machine learning model trained on synthetic data.
            Results are indicative only and should <strong>not</strong> be used as a substitute for professional assessment
            by a qualified educational psychologist or specialist.
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href={PDF_URL(sessionId)} target="_blank" rel="noreferrer" className="btn btn-primary">
              📥 Download Full PDF Report
            </a>
            <button className="btn btn-ghost" onClick={() => navigate('/improvement')}>
              🚀 Start Improvement Games →
            </button>
            <button className="btn btn-ghost" onClick={() => navigate(cid ? '/children' : '/')}>
              {cid ? '← Back to Children' : '🏠 Back to Home'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
