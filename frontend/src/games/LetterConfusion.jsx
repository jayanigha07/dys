import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveGameResult } from '../api'

/* ───── Data ───── */
const ROUNDS = [
  { target: 'b', options: ['b', 'd', 'p', 'q'], hint: 'Find the letter  b' },
  { target: 'd', options: ['p', 'd', 'b', 'q'], hint: 'Find the letter  d' },
  { target: 'p', options: ['q', 'b', 'p', 'd'], hint: 'Find the letter  p' },
  { target: 'q', options: ['d', 'q', 'b', 'p'], hint: 'Find the letter  q' },
  { target: 'b', options: ['d', 'b', 'p', 'q'], hint: 'Find the letter  b  again!' },
  { target: 'd', options: ['b', 'p', 'd', 'q'], hint: 'One more  d !' },
]

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

export default function LetterConfusion() {
  const navigate = useNavigate()
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState('ready')    // ready | playing | done
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong'
  const [options, setOptions] = useState([])

  // Metrics
  const [correct, setCorrect] = useState(0)
  const [confusions, setConfusions] = useState(0)
  const [times, setTimes] = useState([])
  const startRef = useRef(null)
  const sessionId = localStorage.getItem('sessionId')

  useEffect(() => {
    setOptions(shuffle(ROUNDS[round].options))
  }, [round])

  function startRound() {
    setPhase('playing')
    setSelected(null)
    setFeedback(null)
    startRef.current = Date.now()
  }

  const handleSelect = useCallback((letter) => {
    if (feedback) return
    const elapsed = (Date.now() - startRef.current) / 1000
    setTimes(t => [...t, elapsed])
    setSelected(letter)
    const isCorrect = letter === ROUNDS[round].target
    setFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) setCorrect(c => c + 1)
    else setConfusions(c => c + 1)

    setTimeout(() => {
      if (round + 1 < ROUNDS.length) {
        setRound(r => r + 1)
        setPhase('ready')
      } else {
        setPhase('done')
      }
    }, 800)
  }, [feedback, round])

  async function finish() {
    const accuracy  = correct / ROUNDS.length
    const avgTime   = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 3
    const errRate   = confusions / ROUNDS.length
    const confScore = confusions / ROUNDS.length

    const payload = {
      session_id:        Number(sessionId),
      game_name:         'Letter Confusion',
      accuracy_score:    accuracy,
      avg_response_time: avgTime,
      error_rate:        errRate,
      confusion_score:   confScore,
      retry_count:       confusions,
      memory_score:      0.7,
      reading_time:      avgTime,
    }

    // ── Global storage (backward compat) ──
    const prev = JSON.parse(localStorage.getItem('gameResults') || '{}')
    prev['letter-confusion'] = payload
    localStorage.setItem('gameResults', JSON.stringify(prev))
    const comp = JSON.parse(localStorage.getItem('completedGames') || '[]')
    if (!comp.includes('letter-confusion')) comp.push('letter-confusion')
    localStorage.setItem('completedGames', JSON.stringify(comp))

    // ── Child-specific storage ──
    const cid = localStorage.getItem('activeChildId')
    if (cid) {
      const cPrev = JSON.parse(localStorage.getItem(`child_${cid}_gameResults`) || '{}')
      cPrev['letter-confusion'] = payload
      localStorage.setItem(`child_${cid}_gameResults`, JSON.stringify(cPrev))
      const cComp = JSON.parse(localStorage.getItem(`child_${cid}_completedGames`) || '[]')
      if (!cComp.includes('letter-confusion')) cComp.push('letter-confusion')
      localStorage.setItem(`child_${cid}_completedGames`, JSON.stringify(cComp))
      localStorage.setItem(`child_${cid}_lastAssessed`, new Date().toISOString())
    }

    try { await saveGameResult(payload) } catch { /* offline */ }
    navigate('/games')
  }

  const cur = ROUNDS[round]
  const stars = Math.round((correct / ROUNDS.length) * 3)

  /* ── Done screen ── */
  if (phase === 'done') {
    return (
      <div className="kid-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="kid-card" style={{ maxWidth: 440, textAlign: 'center' }}>
          <span className="completion-emoji">🎉</span>
          <h2 className="kid-title">Great job!</h2>
          <p className="kid-subtitle">You finished the Letter Game!</p>
          <div className="stars">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '1.25rem 0', flexWrap: 'wrap' }}>
            <div style={{ background: '#EDE9FE', borderRadius: 14, padding: '0.75rem 1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>CORRECT</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>{correct}/{ROUNDS.length}</div>
            </div>
            <div style={{ background: '#FEE2E2', borderRadius: 14, padding: '0.75rem 1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 700 }}>CONFUSIONS</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#EF4444' }}>{confusions}</div>
            </div>
          </div>
          <button className="kid-btn kid-btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={finish}>
            Back to Games 🏠
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="kid-shell">
      <header className="kid-header">
        <div className="kid-logo">🔤 Letter Game</div>
        <div className="kid-progress-wrap">
          <div className="kid-progress-bar">
            <div className="kid-progress-fill" style={{ width: `${(round / ROUNDS.length) * 100}%` }} />
          </div>
          <span className="kid-progress-label">{round}/{ROUNDS.length}</span>
        </div>
        <div className="score-chip">⭐ {correct}</div>
      </header>

      <div className="kid-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '3rem' }}>
        {phase === 'ready' ? (
          <div className="kid-card" style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
            <div className="game-mascot">🔤</div>
            <h2 className="kid-title">{cur.hint}</h2>
            <p className="kid-subtitle">Find the right letter below!</p>
            <button className="kid-btn kid-btn-primary" style={{ fontSize: '1.2rem', width: '100%', marginTop: '1rem' }} onClick={startRound}>
              Ready? GO! 🚀
            </button>
          </div>
        ) : (
          <div className="kid-card" style={{ maxWidth: 520, width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 className="kid-title" style={{ fontSize: '1.6rem' }}>
                Tap the letter: <span style={{ color: 'var(--accent)', fontSize: '2.5rem' }}>{cur.target}</span>
              </h2>
            </div>
            <div className="letter-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: '1.25rem' }}>
              {options.map(letter => (
                <button
                  key={letter}
                  className={`letter-btn ${feedback && letter === cur.target ? 'correct' : ''} ${feedback === 'wrong' && letter === selected && letter !== cur.target ? 'wrong' : ''}`}
                  onClick={() => handleSelect(letter)}
                  style={{ fontSize: '4rem', padding: '2rem', minHeight: 120 }}
                >
                  {letter}
                </button>
              ))}
            </div>
            {feedback && (
              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '1.3rem', fontWeight: 800, fontFamily: 'Nunito',
                color: feedback === 'correct' ? 'var(--success)' : 'var(--danger)', animation: 'bounceIn 0.3s ease' }}>
                {feedback === 'correct' ? '✅ Correct!' : '❌ Oops! It was "' + cur.target + '"'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
