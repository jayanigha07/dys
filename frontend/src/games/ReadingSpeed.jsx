import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveGameResult } from '../api'

const WORDS_EASY   = ['cat', 'dog', 'sun', 'hat', 'big', 'run', 'cup', 'red']
const WORDS_MEDIUM = ['fish', 'frog', 'flag', 'play', 'stop', 'jump', 'sing', 'rain']
const WORDS_HARD   = ['cloud', 'fruit', 'dream', 'brave', 'shine', 'green', 'smile', 'plant']

const ALL_WORDS = [...WORDS_EASY, ...WORDS_MEDIUM, ...WORDS_HARD].slice(0, 12)

const DISPLAY_MS   = 1200   // time each word is shown
const INTERVAL_MS  = 1800   // gap between words

export default function ReadingSpeed() {
  const navigate   = useNavigate()
  const sessionId  = localStorage.getItem('sessionId')

  const [phase, setPhase]         = useState('intro')   // intro | countdown | active | done
  const [countdown, setCountdown] = useState(3)
  const [wordIdx, setWordIdx]     = useState(0)
  const [showWord, setShowWord]   = useState(false)
  const [hesitations, setHesitations] = useState([])
  const [readTimes, setReadTimes]     = useState([])
  const [tapped, setTapped]           = useState(false)

  const wordAppear  = useRef(null)
  const tapTime     = useRef(null)
  const intervalRef = useRef(null)
  const stars       = Math.round(Math.max(0, 1 - hesitations.filter(h => h > 1.5).length / ALL_WORDS.length) * 3)

  /* Countdown timer */
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown === 0) { setPhase('active'); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown])

  /* Word cycling */
  useEffect(() => {
    if (phase !== 'active') return
    if (wordIdx >= ALL_WORDS.length) { setPhase('done'); return }

    wordAppear.current = Date.now()
    setShowWord(true)
    setTapped(false)

    const hideTimer = setTimeout(() => setShowWord(false), DISPLAY_MS)
    const nextTimer = setTimeout(() => setWordIdx(i => i + 1), INTERVAL_MS)

    return () => { clearTimeout(hideTimer); clearTimeout(nextTimer) }
  }, [phase, wordIdx])

  function handleTap() {
    if (!showWord || tapped) return
    setTapped(true)
    const hesitation = (Date.now() - wordAppear.current) / 1000
    setHesitations(h => [...h, hesitation])
    setReadTimes(r => [...r, hesitation])
  }

  async function finish() {
    const avgHes    = hesitations.length ? hesitations.reduce((a, b) => a + b, 0) / hesitations.length : 2.5
    const slowCount = hesitations.filter(h => h > 1.2).length
    const accuracy  = Math.max(0, 1 - slowCount / ALL_WORDS.length)

    const payload = {
      session_id:        Number(sessionId),
      game_name:         'Reading Speed',
      accuracy_score:    accuracy,
      avg_response_time: avgHes,
      error_rate:        slowCount / ALL_WORDS.length,
      confusion_score:   0.2,
      retry_count:       0,
      memory_score:      0.7,
      reading_time:      avgHes,
    }

    // ── Global storage ──
    const prev = JSON.parse(localStorage.getItem('gameResults') || '{}')
    prev['reading-speed'] = payload
    localStorage.setItem('gameResults', JSON.stringify(prev))
    const comp = JSON.parse(localStorage.getItem('completedGames') || '[]')
    if (!comp.includes('reading-speed')) comp.push('reading-speed')
    localStorage.setItem('completedGames', JSON.stringify(comp))

    // ── Child-specific storage ──
    const cid = localStorage.getItem('activeChildId')
    if (cid) {
      const cPrev = JSON.parse(localStorage.getItem(`child_${cid}_gameResults`) || '{}')
      cPrev['reading-speed'] = payload
      localStorage.setItem(`child_${cid}_gameResults`, JSON.stringify(cPrev))
      const cComp = JSON.parse(localStorage.getItem(`child_${cid}_completedGames`) || '[]')
      if (!cComp.includes('reading-speed')) cComp.push('reading-speed')
      localStorage.setItem(`child_${cid}_completedGames`, JSON.stringify(cComp))
      localStorage.setItem(`child_${cid}_lastAssessed`, new Date().toISOString())
    }

    try { await saveGameResult(payload) } catch { }
    navigate('/games')
  }

  /* ── Done ── */
  if (phase === 'done') {
    const avgHes    = hesitations.length ? (hesitations.reduce((a, b) => a + b, 0) / hesitations.length).toFixed(2) : '—'
    const slowCount = hesitations.filter(h => h > 1.2).length
    return (
      <div className="kid-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="kid-card" style={{ maxWidth: 440, textAlign: 'center' }}>
          <span className="completion-emoji">📖</span>
          <h2 className="kid-title">Super Reader!</h2>
          <p className="kid-subtitle">You read all the words!</p>
          <div className="stars">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '1.25rem 0', flexWrap: 'wrap' }}>
            <div style={{ background: '#EDE9FE', borderRadius: 14, padding: '0.75rem 1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>AVG TIME</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>{avgHes}s</div>
            </div>
            <div style={{ background: '#FEF3C7', borderRadius: 14, padding: '0.75rem 1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 700 }}>SLOW READS</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#F59E0B' }}>{slowCount}</div>
            </div>
          </div>
          <button className="kid-btn kid-btn-primary" style={{ width: '100%' }} onClick={finish}>
            Back to Games 🏠
          </button>
        </div>
      </div>
    )
  }

  /* ── Countdown ── */
  if (phase === 'countdown') {
    return (
      <div className="kid-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '8rem', fontWeight: 900, fontFamily: 'Nunito', color: 'var(--primary)', animation: 'bounceIn 0.4s ease' }}>
            {countdown === 0 ? 'GO! 🚀' : countdown}
          </div>
        </div>
      </div>
    )
  }

  /* ── Intro ── */
  if (phase === 'intro') {
    return (
      <div className="kid-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="kid-card" style={{ maxWidth: 480, textAlign: 'center' }}>
          <div className="game-mascot">📖</div>
          <h2 className="kid-title">Reading Speed!</h2>
          <p className="kid-subtitle">
            Words will flash on screen. Tap <strong>as fast as you can</strong> when you see each word!
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', margin: '1rem 0', flexWrap: 'wrap' }}>
            {['cat', 'sun', 'dog'].map(w => (
              <div key={w} style={{ background: '#EDE9FE', color: 'var(--primary)', borderRadius: 12, padding: '0.5rem 1.25rem', fontFamily: 'Nunito', fontWeight: 800, fontSize: '1.3rem' }}>
                {w}
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--kid-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            {ALL_WORDS.length} words — tap quickly! ⚡
          </p>
          <button className="kid-btn kid-btn-primary" style={{ width: '100%', fontSize: '1.2rem' }} onClick={() => setPhase('countdown')}>
            I'm Ready! 🚀
          </button>
        </div>
      </div>
    )
  }

  /* ── Active ── */
  return (
    <div className="kid-shell">
      <header className="kid-header">
        <div className="kid-logo">📖 Reading Game</div>
        <div className="kid-progress-wrap">
          <div className="kid-progress-bar">
            <div className="kid-progress-fill" style={{ width: `${(wordIdx / ALL_WORDS.length) * 100}%` }} />
          </div>
          <span className="kid-progress-label">{wordIdx}/{ALL_WORDS.length}</span>
        </div>
        <div className="score-chip">⚡ {hesitations.length}</div>
      </header>

      <div
        className="kid-page"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 70px)', cursor: 'pointer', userSelect: 'none' }}
        onClick={handleTap}
      >
        <div style={{ textAlign: 'center' }}>
          {showWord ? (
            <div style={{
              fontSize: 'clamp(4rem, 12vw, 7rem)', fontWeight: 900,
              fontFamily: 'Nunito', color: 'var(--primary)',
              animation: 'bounceIn 0.25s ease',
              letterSpacing: '0.05em',
              textShadow: '0 4px 24px rgba(124,58,237,0.2)',
            }}>
              {ALL_WORDS[wordIdx]}
            </div>
          ) : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'Nunito', fontWeight: 800, color: 'var(--kid-muted)', fontSize: '1.2rem' }}>
                Get ready… 👀
              </div>
            </div>
          )}
          <p style={{ marginTop: '2rem', color: 'var(--kid-muted)', fontFamily: 'Nunito', fontWeight: 700, fontSize: '1rem' }}>
            {showWord ? '👆 Tap when you see the word!' : '⏳ Next word coming...'}
          </p>
        </div>
      </div>
    </div>
  )
}
