import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveGameResult } from '../api'

const SEQUENCES = [
  ['cat', 'sun', 'big'],
  ['dog', 'hat', 'run'],
  ['fish', 'frog', 'play', 'stop'],
  ['sun', 'fun', 'run', 'bun'],
  ['cat', 'dog', 'fish', 'frog', 'hat'],
]

export default function MemorySequence() {
  const navigate  = useNavigate()
  const sessionId = localStorage.getItem('sessionId')

  const [round, setRound]       = useState(0)
  const [phase, setPhase]       = useState('show')   // show | recall | feedback | done
  const [showIdx, setShowIdx]   = useState(0)
  const [recall, setRecall]     = useState([])
  const [input, setInput]       = useState('')
  const [correct, setCorrect]   = useState(0)
  const [orderErrors, setOrderErrors] = useState(0)
  const [times, setTimes]       = useState([])
  const recallStart             = useRef(null)

  const seq = SEQUENCES[round] || []

  /* Show sequence word-by-word */
  useEffect(() => {
    if (phase !== 'show') return
    if (showIdx >= seq.length) {
      setTimeout(() => { setPhase('recall'); setRecall([]); recallStart.current = Date.now() }, 700)
      return
    }
    const t = setTimeout(() => setShowIdx(i => i + 1), 900)
    return () => clearTimeout(t)
  }, [phase, showIdx, seq.length])

  function resetRound() { setShowIdx(0) }

  useEffect(() => {
    if (phase === 'show') resetRound()
  }, [round])

  function submitRecall() {
    if (!input.trim()) return
    const elapsed  = (Date.now() - recallStart.current) / 1000
    const recalled = input.trim().toLowerCase().split(/\s+/)
    const expected = seq

    let match = 0
    let oErr  = 0
    recalled.forEach((w, i) => {
      if (expected[i] && w === expected[i]) match++
      else if (expected.includes(w)) oErr++
    })

    const score = match / expected.length
    setCorrect(c => c + score)
    setOrderErrors(o => o + oErr)
    setTimes(t => [...t, elapsed])
    setPhase('feedback')
    setInput('')
  }

  function nextRound() {
    if (round + 1 < SEQUENCES.length) {
      setRound(r => r + 1)
      setPhase('show')
    } else {
      setPhase('done')
    }
  }

  async function finish() {
    const accuracy   = correct / SEQUENCES.length
    const avgTime    = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 5
    const memScore   = accuracy

    const payload = {
      session_id:        Number(sessionId),
      game_name:         'Memory Sequence',
      accuracy_score:    accuracy,
      avg_response_time: avgTime,
      error_rate:        1 - accuracy,
      confusion_score:   0.2,
      retry_count:       orderErrors,
      memory_score:      memScore,
      reading_time:      avgTime,
    }

    // ── Global storage ──
    const prev = JSON.parse(localStorage.getItem('gameResults') || '{}')
    prev['memory-sequence'] = payload
    localStorage.setItem('gameResults', JSON.stringify(prev))
    const comp = JSON.parse(localStorage.getItem('completedGames') || '[]')
    if (!comp.includes('memory-sequence')) comp.push('memory-sequence')
    localStorage.setItem('completedGames', JSON.stringify(comp))

    // ── Child-specific storage ──
    const cid = localStorage.getItem('activeChildId')
    if (cid) {
      const cPrev = JSON.parse(localStorage.getItem(`child_${cid}_gameResults`) || '{}')
      cPrev['memory-sequence'] = payload
      localStorage.setItem(`child_${cid}_gameResults`, JSON.stringify(cPrev))
      const cComp = JSON.parse(localStorage.getItem(`child_${cid}_completedGames`) || '[]')
      if (!cComp.includes('memory-sequence')) cComp.push('memory-sequence')
      localStorage.setItem(`child_${cid}_completedGames`, JSON.stringify(cComp))
      localStorage.setItem(`child_${cid}_lastAssessed`, new Date().toISOString())
    }

    try { await saveGameResult(payload) } catch { }
    navigate('/games')
  }

  const stars = Math.round((correct / SEQUENCES.length) * 3)

  /* ── Done ── */
  if (phase === 'done') {
    return (
      <div className="kid-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="kid-card" style={{ maxWidth: 440, textAlign: 'center' }}>
          <span className="completion-emoji">🧩</span>
          <h2 className="kid-title">Memory Champion!</h2>
          <p className="kid-subtitle">You finished the Memory Game!</p>
          <div className="stars">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '1.25rem 0', flexWrap: 'wrap' }}>
            <div style={{ background: '#EDE9FE', borderRadius: 14, padding: '0.75rem 1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>MEMORY SCORE</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>{Math.round((correct / SEQUENCES.length) * 100)}%</div>
            </div>
            <div style={{ background: '#FEE2E2', borderRadius: 14, padding: '0.75rem 1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 700 }}>ORDER ERRORS</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#EF4444' }}>{orderErrors}</div>
            </div>
          </div>
          <button className="kid-btn kid-btn-primary" style={{ width: '100%' }} onClick={finish}>
            Back to Games 🏠
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="kid-shell">
      <header className="kid-header">
        <div className="kid-logo">🧩 Memory Game</div>
        <div className="kid-progress-wrap">
          <div className="kid-progress-bar">
            <div className="kid-progress-fill" style={{ width: `${(round / SEQUENCES.length) * 100}%` }} />
          </div>
          <span className="kid-progress-label">Round {round + 1}/{SEQUENCES.length}</span>
        </div>
        <div className="score-chip">🧠 {Math.round(correct)}/{round}</div>
      </header>

      <div className="kid-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2rem' }}>

        {/* Show Phase */}
        {phase === 'show' && (
          <div className="kid-card" style={{ maxWidth: 540, width: '100%', textAlign: 'center' }}>
            <div className="game-mascot">🧠</div>
            <h2 className="kid-title">Remember these words!</h2>
            <p className="kid-subtitle">Watch carefully… 👀</p>
            <div style={{ minHeight: 100, display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', margin: '1rem 0' }}>
              {seq.slice(0, showIdx).map((w, i) => (
                <div key={i} style={{
                  background: 'var(--primary)', color: 'white',
                  padding: '0.75rem 1.5rem', borderRadius: 14,
                  fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.5rem',
                  animation: 'bounceIn 0.3s ease',
                }}>
                  {w}
                </div>
              ))}
            </div>
            <p style={{ color: 'var(--kid-muted)', fontWeight: 700 }}>
              {showIdx < seq.length ? `Word ${showIdx + 1} of ${seq.length}…` : 'Get ready to type them!'}
            </p>
          </div>
        )}

        {/* Recall Phase */}
        {phase === 'recall' && (
          <div className="kid-card" style={{ maxWidth: 540, width: '100%', textAlign: 'center' }}>
            <div className="game-mascot">✍️</div>
            <h2 className="kid-title">Now type the words!</h2>
            <p className="kid-subtitle">Type all the words you remember, in order. Separate with spaces.</p>
            <input
              className="word-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && input && submitRecall()}
              placeholder="e.g.  cat sun big"
              autoFocus
              style={{ marginBottom: '1.25rem' }}
            />
            <button className="kid-btn kid-btn-primary" style={{ width: '100%', fontSize: '1.1rem' }}
              onClick={submitRecall} disabled={!input.trim()}>
              I Remember! ✓
            </button>
          </div>
        )}

        {/* Feedback Phase */}
        {phase === 'feedback' && (
          <div className="kid-card" style={{ maxWidth: 540, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>👏</div>
            <h2 className="kid-title">The words were:</h2>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', margin: '1rem 0' }}>
              {seq.map((w, i) => (
                <div key={i} style={{
                  background: '#EDE9FE', color: 'var(--primary)',
                  padding: '0.6rem 1.25rem', borderRadius: 12,
                  fontFamily: 'Nunito', fontWeight: 800, fontSize: '1.25rem',
                }}>
                  {i + 1}. {w}
                </div>
              ))}
            </div>
            <button className="kid-btn kid-btn-accent" style={{ width: '100%', marginTop: '1rem', fontSize: '1.1rem' }} onClick={nextRound}>
              {round + 1 < SEQUENCES.length ? 'Next Round! ➡️' : 'See Results! 🏆'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
