import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveGameResult } from '../api'

const WORDS = [
  { display: 'c_t',   answer: 'cat',  hint: '🐱 A furry pet that says meow' },
  { display: 'd_g',   answer: 'dog',  hint: '🐶 A pet that loves to fetch' },
  { display: 'h_t',   answer: 'hat',  hint: '🎩 You wear this on your head' },
  { display: 's_n',   answer: 'sun',  hint: '☀️ It shines in the sky' },
  { display: 'f_sh',  answer: 'fish', hint: '🐟 It swims in the sea' },
  { display: 'b_g',   answer: 'bug',  hint: '🐛 A tiny crawling creature' },
  { display: 'f_x',   answer: 'fox',  hint: '🦊 An orange woodland animal' },
  { display: 'c_p',   answer: 'cup',  hint: '☕ You drink from it' },
]

export default function WordCompletion() {
  const navigate = useNavigate()
  const [idx, setIdx]         = useState(0)
  const [input, setInput]     = useState('')
  const [feedback, setFeedback] = useState(null)  // null | 'correct' | 'wrong'
  const [retries, setRetries]  = useState(0)
  const [attempts, setAttempts]= useState([])
  const [phase, setPhase]      = useState('play') // play | done
  const startRef               = useRef(Date.now())
  const roundStart             = useRef(Date.now())
  const sessionId              = localStorage.getItem('sessionId')
  const navigate2              = useNavigate()

  const [scores, setScores] = useState({ correct: 0, total: 0, times: [], retryMap: {} })

  function checkAnswer() {
    const elapsed = (Date.now() - roundStart.current) / 1000
    const isCorrect = input.trim().toLowerCase() === WORDS[idx].answer
    setFeedback(isCorrect ? 'correct' : 'wrong')

    if (isCorrect) {
      setScores(s => ({
        ...s,
        correct: s.correct + 1,
        total: s.total + 1,
        times: [...s.times, elapsed],
        retryMap: { ...s.retryMap, [idx]: retries },
      }))
      setTimeout(() => {
        if (idx + 1 < WORDS.length) {
          setIdx(i => i + 1)
          setInput('')
          setFeedback(null)
          setRetries(0)
          roundStart.current = Date.now()
        } else {
          setPhase('done')
        }
      }, 900)
    } else {
      setRetries(r => r + 1)
      setScores(s => ({ ...s, total: s.total + 1 }))
      setTimeout(() => { setFeedback(null) }, 800)
    }
  }

  async function finish() {
    const accuracy = scores.correct / WORDS.length
    const avgRetry = Object.values(scores.retryMap).reduce((a, b) => a + b, 0) / WORDS.length
    const avgTime  = scores.times.length ? scores.times.reduce((a, b) => a + b, 0) / scores.times.length : 4

    const payload = {
      session_id:        Number(sessionId),
      game_name:         'Word Completion',
      accuracy_score:    accuracy,
      avg_response_time: avgTime,
      error_rate:        1 - accuracy,
      confusion_score:   Math.min(avgRetry / 4, 1),
      retry_count:       Object.values(scores.retryMap).reduce((a, b) => a + b, 0),
      memory_score:      0.65,
      reading_time:      avgTime,
    }

    // ── Global storage ──
    const prev = JSON.parse(localStorage.getItem('gameResults') || '{}')
    prev['word-completion'] = payload
    localStorage.setItem('gameResults', JSON.stringify(prev))
    const comp = JSON.parse(localStorage.getItem('completedGames') || '[]')
    if (!comp.includes('word-completion')) comp.push('word-completion')
    localStorage.setItem('completedGames', JSON.stringify(comp))

    // ── Child-specific storage ──
    const cid = localStorage.getItem('activeChildId')
    if (cid) {
      const cPrev = JSON.parse(localStorage.getItem(`child_${cid}_gameResults`) || '{}')
      cPrev['word-completion'] = payload
      localStorage.setItem(`child_${cid}_gameResults`, JSON.stringify(cPrev))
      const cComp = JSON.parse(localStorage.getItem(`child_${cid}_completedGames`) || '[]')
      if (!cComp.includes('word-completion')) cComp.push('word-completion')
      localStorage.setItem(`child_${cid}_completedGames`, JSON.stringify(cComp))
      localStorage.setItem(`child_${cid}_lastAssessed`, new Date().toISOString())
    }

    try { await saveGameResult(payload) } catch { }
    navigate('/games')
  }

  const word = WORDS[idx]
  const stars = Math.round((scores.correct / WORDS.length) * 3)

  if (phase === 'done') {
    return (
      <div className="kid-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="kid-card" style={{ maxWidth: 440, textAlign: 'center' }}>
          <span className="completion-emoji">🏆</span>
          <h2 className="kid-title">Word Master!</h2>
          <p className="kid-subtitle">You finished the Word Game!</p>
          <div className="stars">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '1.25rem 0', flexWrap: 'wrap' }}>
            <div style={{ background: '#EDE9FE', borderRadius: 14, padding: '0.75rem 1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>CORRECT</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>{scores.correct}/{WORDS.length}</div>
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
        <div className="kid-logo">✏️ Word Game</div>
        <div className="kid-progress-wrap">
          <div className="kid-progress-bar">
            <div className="kid-progress-fill" style={{ width: `${(idx / WORDS.length) * 100}%` }} />
          </div>
          <span className="kid-progress-label">{idx}/{WORDS.length}</span>
        </div>
        <div className="score-chip">⭐ {scores.correct}</div>
      </header>

      <div className="kid-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '3rem' }}>
        <div className="kid-card" style={{ maxWidth: 540, width: '100%', textAlign: 'center' }}>
          <div className="game-mascot">✏️</div>

          {/* Word with blank */}
          <h2 className="kid-title" style={{ fontSize: '3.5rem', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
            {word.display.toUpperCase()}
          </h2>
          <p className="kid-subtitle">{word.hint}</p>

          <p style={{ color: 'var(--primary)', fontWeight: 800, marginBottom: '1rem' }}>
            Type the complete word:
          </p>
          <input
            className="word-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && input && checkAnswer()}
            placeholder="Type here…"
            autoFocus
            style={{
              borderColor: feedback === 'correct' ? 'var(--success)' : feedback === 'wrong' ? 'var(--danger)' : '#DDD6FE',
              background: feedback === 'correct' ? '#F0FDF4' : feedback === 'wrong' ? '#FEF2F2' : '#F9F7FF',
            }}
          />

          {retries > 0 && (
            <p style={{ color: 'var(--accent)', fontWeight: 700, marginTop: '0.6rem', fontSize: '0.95rem' }}>
              💡 Hint: The word has {word.answer.length} letters
            </p>
          )}

          {feedback && (
            <div style={{ marginTop: '0.75rem', fontSize: '1.2rem', fontWeight: 800, fontFamily: 'Nunito',
              color: feedback === 'correct' ? 'var(--success)' : 'var(--danger)', animation: 'bounceIn 0.3s ease' }}>
              {feedback === 'correct' ? '✅ Brilliant!' : '❌ Try again!'}
            </div>
          )}

          <button
            className="kid-btn kid-btn-primary"
            style={{ width: '100%', marginTop: '1.25rem', fontSize: '1.1rem' }}
            onClick={checkAnswer}
            disabled={!input.trim()}
          >
            Check Answer ✓
          </button>
        </div>
      </div>
    </div>
  )
}
