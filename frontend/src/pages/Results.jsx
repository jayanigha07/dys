import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { predict, getPrediction, PDF_URL } from '../api'

/* ── Helpers ─────────────────────────────── */
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

const RISK_COLOR = {
  Low:    { bg: '#F0FDF4', border: '#86EFAC', text: '#166534', badge: '#22C55E' },
  Medium: { bg: '#FFFBEB', border: '#FCD34D', text: '#92400E', badge: '#F59E0B' },
  High:   { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B', badge: '#EF4444' },
}

const RISK_EMOJI = { Low: '✅', Medium: '⚠️', High: '🚨' }
const RISK_MSG = {
  Low:    'No significant dyslexia risk indicators detected. Great job! Continue with regular reading practice.',
  Medium: 'Some risk indicators are present. We recommend monitoring progress and consulting a reading specialist.',
  High:   'Multiple risk indicators were detected. A professional evaluation by a qualified educational psychologist is recommended.',
}

export default function Results() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  const cid = searchParams.get('child') || localStorage.getItem('activeChildId')
  const sidParam = searchParams.get('session')
  const sessionId = sidParam || (cid ? localStorage.getItem(`child_${cid}_sessionId`) : localStorage.getItem('sessionId'))
  const [childName, setChildName] = useState('Friend')

  useEffect(() => {
    if (cid) {
      const list = JSON.parse(localStorage.getItem('children') || '[]')
      const c = list.find(x => String(x.id) === String(cid))
      if (c) setChildName(c.name)
    } else {
      setChildName(localStorage.getItem('childName') || 'Friend')
    }
    loadResult()
  }, [cid])

  async function loadResult() {
    setLoading(true)
    setError(null)
    try {
      let predData = null
      
      // 1. Try local child cache
      if (cid) {
        const stored = localStorage.getItem(`child_${cid}_prediction`)
        if (stored) predData = JSON.parse(stored)
      }

      // 2. Try fetching from backend if we have a session but no prediction yet
      if (!predData && sessionId) {
        try {
          predData = await getPrediction(sessionId)
          if (predData.detail) predData = null
        } catch { predData = null }
      }

      // 3. Compute from game results if not found
      if (!predData) {
        const agg = aggregateGameResults(cid)
        if (!agg) { setError('no_data'); setLoading(false); return }
        predData = await predict({ session_id: Number(sessionId) || 1, ...agg })
      }

      // Save to child cache
      if (cid && predData && !predData.detail) {
        localStorage.setItem(`child_${cid}_prediction`, JSON.stringify(predData))
      }

      setResult(predData)
    } catch {
      setError('backend_down')
    } finally {
      setLoading(false)
    }
  }

  /* ── Loading ── */
  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #F8EDFF 0%, #FFF3E0 50%, #E8F5FF 100%)',
      fontFamily: 'Nunito, sans-serif',
    }}>
      <div style={{ fontSize: '4rem', animation: 'float 1.5s ease-in-out infinite' }}>🔍</div>
      <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#7C3AED', marginTop: '1rem' }}>Analysing results…</p>
      <p style={{ color: '#7C6FA0', fontSize: '0.9rem', marginTop: '0.4rem' }}>Our AI is checking {childName}'s performance</p>
    </div>
  )

  /* ── Backend Down ── */
  if (error === 'backend_down') return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #FFF3E0, #FEE2E2)',
      fontFamily: 'Nunito, sans-serif', textAlign: 'center', padding: '2rem',
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
      <h2 style={{ color: '#991B1B', marginBottom: '0.5rem' }}>Backend Offline</h2>
      <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
        Make sure FastAPI is running on <code>http://localhost:8000</code>
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button className="kid-btn kid-btn-primary" onClick={loadResult}>Retry</button>
        <button className="kid-btn kid-btn-outline" onClick={() => navigate('/')}>← Home</button>
      </div>
    </div>
  )

  /* ── No Data ── */
  if (error === 'no_data') return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #F8EDFF 0%, #FFF3E0 50%, #E8F5FF 100%)',
      fontFamily: 'Nunito, sans-serif', textAlign: 'center', padding: '2rem',
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎮</div>
      <h2 style={{ color: '#7C3AED', marginBottom: '0.5rem' }}>No Assessment Data Yet</h2>
      <p style={{ color: '#7C6FA0', marginBottom: '1.5rem' }}>Complete all 4 games first, then come back to see results!</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button className="kid-btn kid-btn-primary" onClick={() => navigate('/games')}>🎮 Start Assessment</button>
        <button className="kid-btn kid-btn-outline" onClick={() => navigate(cid ? '/children' : '/')}>← Back</button>
      </div>
    </div>
  )

  if (!result) return null

  const riskLevel = result.risk_level || 'Low'
  const riskTheme = RISK_COLOR[riskLevel] || RISK_COLOR.Low
  const riskPct = Math.round((result.probability_risk || 0) * 100)
  const noRiskPct = Math.round((result.probability_no_risk || 0) * 100)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #F0F4FF 0%, #FFF7ED 40%, #F0FDF4 100%)',
      fontFamily: 'Nunito, sans-serif',
      padding: '2rem 1rem',
    }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            🧠 <span style={{ fontWeight: 900, color: '#7C3AED' }}>DysLexia·Screen</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#2D1B69', marginBottom: '0.3rem' }}>
            Assessment Complete! 🎉
          </h1>
          <p style={{ color: '#7C6FA0', fontSize: '1rem' }}>
            Session #{sessionId} · {childName}'s Results
          </p>
        </div>

        {/* ── Main Risk Card ── */}
        <div style={{
          background: riskTheme.bg,
          border: `3px solid ${riskTheme.border}`,
          borderRadius: 28,
          padding: '2.5rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
          boxShadow: `0 8px 40px ${riskTheme.border}55`,
          animation: 'bounceIn 0.6s ease',
        }}>
          <div style={{ fontSize: '5rem', marginBottom: '0.75rem', animation: 'float 3s ease-in-out infinite' }}>
            {RISK_EMOJI[riskLevel]}
          </div>

          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: riskTheme.text, marginBottom: '0.5rem' }}>
            {riskLevel} Risk Level
          </h2>

          {/* Probability gauge */}
          <div style={{ margin: '1.5rem auto', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: '#6B7280', marginBottom: '0.5rem' }}>
              <span>No Risk</span>
              <span>Dyslexia Risk</span>
            </div>
            <div style={{ background: '#E5E7EB', borderRadius: 99, height: 20, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${riskPct}%`,
                background: riskLevel === 'High' ? 'linear-gradient(90deg, #F59E0B, #EF4444)' :
                             riskLevel === 'Medium' ? 'linear-gradient(90deg, #10B981, #F59E0B)' :
                             'linear-gradient(90deg, #10B981, #34D399)',
                borderRadius: 99,
                transition: 'width 1s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 900, marginTop: '0.6rem' }}>
              <span style={{ color: '#10B981' }}>{noRiskPct}%</span>
              <span style={{ color: riskTheme.badge }}>{riskPct}%</span>
            </div>
          </div>

          <p style={{ color: riskTheme.text, fontSize: '1rem', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 1.5rem' }}>
            {RISK_MSG[riskLevel]}
          </p>

          {/* Dyslexia Prediction Label */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
            background: riskLevel === 'Low' ? '#DCFCE7' : '#FEF3C7',
            border: `2px solid ${riskTheme.border}`,
            borderRadius: 99, padding: '0.6rem 1.8rem',
            fontSize: '1rem', fontWeight: 800, color: riskTheme.text,
          }}>
            <span style={{ fontSize: '1.4rem' }}>{riskLevel === 'Low' ? '✅' : '⚠️'}</span>
            {riskLevel === 'Low'
              ? 'No Dyslexia Indicators Detected'
              : riskLevel === 'Medium'
              ? 'Possible Dyslexia Indicators Present'
              : 'Significant Dyslexia Indicators Detected'}
          </div>

          <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: '1rem', fontStyle: 'italic' }}>
            ⚠️ This is a screening tool only — not a medical diagnosis. Always consult a qualified specialist.
          </p>
        </div>

        {/* ── Performance Summary ── */}
        <div style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: 20,
          padding: '1.75rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#2D1B69', marginBottom: '1.25rem' }}>
            📊 {childName}'s Performance Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.9rem' }}>
            {[
              { label: 'Accuracy Score', val: `${((result.features?.accuracy_score || 0) * 100).toFixed(1)}%`, icon: '🎯', color: '#10B981' },
              { label: 'Memory Score', val: `${((result.features?.memory_score || 0) * 100).toFixed(1)}%`, icon: '🧠', color: '#7C3AED' },
              { label: 'Error Rate', val: `${((result.features?.error_rate || 0) * 100).toFixed(1)}%`, icon: '❌', color: '#EF4444' },
              { label: 'Avg Response', val: `${(result.features?.avg_response_time || 0).toFixed(2)}s`, icon: '⚡', color: '#F59E0B' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#F9FAFB', border: '1px solid #F3F4F6',
                borderRadius: 14, padding: '1rem 1.25rem',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{s.icon}</div>
                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Weak Areas ── */}
        {result.weak_areas?.length > 0 && (
          <div style={{
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: 20, padding: '1.5rem',
            marginBottom: '1.5rem',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#92400E', marginBottom: '0.9rem' }}>
              ⚡ Areas Needing Attention
            </h3>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {result.weak_areas.map(a => (
                <span key={a} style={{
                  background: 'white', border: '1px solid #FCD34D',
                  borderRadius: 99, padding: '0.35rem 0.9rem',
                  fontSize: '0.85rem', fontWeight: 700, color: '#92400E',
                }}>
                  ⚡ {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Recommendations ── */}
        <div style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: 20, padding: '1.75rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#2D1B69', marginBottom: '1.1rem' }}>
            💡 Personalised Recommendations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {(result.recommendations || ['Continue regular reading practice.']).map((r, i) => (
              <div key={i} style={{
                display: 'flex', gap: '0.8rem', alignItems: 'flex-start',
                background: '#F0F9FF', border: '1px solid #BAE6FD',
                borderRadius: 14, padding: '0.85rem 1rem',
              }}>
                <span style={{
                  background: '#7C3AED', color: 'white',
                  width: 26, height: 26, borderRadius: '50%',
                  fontSize: '0.78rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: '0.92rem', color: '#1E3A5F', lineHeight: 1.5 }}>{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '2rem' }}>
          <button
            className="kid-btn kid-btn-primary"
            style={{ width: '100%', fontSize: '1.1rem' }}
            onClick={() => navigate(`/dashboard?session=${sessionId}`)}
          >
            📊 View Full Analytics Dashboard →
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <a
              href={PDF_URL(sessionId)}
              target="_blank"
              rel="noreferrer"
              className="kid-btn kid-btn-accent"
              style={{ fontSize: '1rem', textDecoration: 'none', justifyContent: 'center' }}
            >
              📥 Download PDF Report
            </a>
            <button
              className="kid-btn kid-btn-outline"
              style={{ fontSize: '1rem' }}
              onClick={() => navigate('/improvement')}
            >
              🚀 Practice Games
            </button>
          </div>
          <button
            style={{
              background: 'transparent', border: 'none', color: '#7C3AED',
              fontFamily: 'Nunito', fontWeight: 700, fontSize: '1rem',
              cursor: 'pointer', textDecoration: 'underline', padding: '0.5rem',
            }}
            onClick={() => navigate(cid ? '/children' : '/')}
          >
            ← {cid ? 'Back to Children' : 'Back to Home'}
          </button>
        </div>

        {/* ── Disclaimer ── */}
        <div style={{
          background: '#F9FAFB', border: '1px solid #E5E7EB',
          borderRadius: 14, padding: '1rem 1.25rem',
          fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.6, textAlign: 'center',
        }}>
          <strong>⚠️ Important:</strong> This screening tool uses a machine learning model trained on synthetic data.
          Results are <strong>indicative only</strong> and should not replace professional assessment by a qualified educational psychologist.
        </div>

      </div>
    </div>
  )
}
