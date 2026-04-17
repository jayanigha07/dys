import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSession } from '../api'

const GAMES = [
  { id: 'letter-confusion', emoji: '🔤', title: 'Letter Confusion', desc: 'Can you find the correct letter?',    color: '#7C3AED' },
  { id: 'word-completion',  emoji: '✏️', title: 'Word Completion',  desc: 'Fill in the missing letters!',         color: '#F59E0B' },
  { id: 'reading-speed',    emoji: '📖', title: 'Reading Speed',    desc: 'Read the words as fast as you can!',   color: '#10B981' },
  { id: 'memory-sequence',  emoji: '🧩', title: 'Memory Game',      desc: 'Remember the word order!',             color: '#EC4899' },
]
const AGE_OPTIONS = [4, 5, 6, 7, 8]

export default function GamesHub() {
  const navigate = useNavigate()
  const [step, setStep]           = useState('intro')   // intro | setup | games
  const [childName, setChildName] = useState('')
  const [childAge, setChildAge]   = useState(6)
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading]     = useState(false)

  // Pre-fill from active child profile
  useEffect(() => {
    const cid  = localStorage.getItem('activeChildId')
    const name = localStorage.getItem('childName')
    const age  = localStorage.getItem('childAge')
    if (cid && name) setChildName(name)
    if (cid && age)  setChildAge(Number(age))
  }, [])

  async function handleStart() {
    setLoading(true)
    try {
      const name    = childName.trim() || 'Friend'
      const session = await createSession(name, childAge)
      setSessionId(session.id)

      // ── Global storage ──
      localStorage.setItem('sessionId',    session.id)
      localStorage.setItem('childName',    name)
      localStorage.setItem('childAge',     childAge)
      localStorage.setItem('completedGames', JSON.stringify([]))
      localStorage.setItem('gameResults',    JSON.stringify({}))

      // ── Child-specific storage ──
      const cid = localStorage.getItem('activeChildId')
      if (cid) {
        localStorage.setItem(`child_${cid}_sessionId`,      session.id)
        localStorage.setItem(`child_${cid}_completedGames`, JSON.stringify([]))
        localStorage.setItem(`child_${cid}_gameResults`,    JSON.stringify({}))
        // Update child's name/age in children list if changed
        try {
          const list = JSON.parse(localStorage.getItem('children') || '[]')
          const idx  = list.findIndex(c => String(c.id) === String(cid))
          if (idx !== -1) { list[idx].name = name; list[idx].age = childAge }
          localStorage.setItem('children', JSON.stringify(list))
        } catch { /* ignore */ }
      }

      setStep('games')
    } catch {
      alert('⚠️ Cannot connect to backend. Make sure the server is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  // Read completed games — child-specific if available, else global
  function getCompleted() {
    const cid = localStorage.getItem('activeChildId')
    if (cid) {
      const c = localStorage.getItem(`child_${cid}_completedGames`)
      if (c) return JSON.parse(c)
    }
    return JSON.parse(localStorage.getItem('completedGames') || '[]')
  }

  const completed = getCompleted()
  const cid       = localStorage.getItem('activeChildId')
  const sid       = sessionId || localStorage.getItem('sessionId')

  // ── Intro Screen ──
  if (step === 'intro') return (
    <div className="kid-shell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 560 }}>
        <div style={{ fontSize: '5rem', animation: 'float 3s ease-in-out infinite', display: 'block', marginBottom: '1rem' }}>🧠</div>
        <h1 style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>
          Learning Adventure!
        </h1>
        <p style={{ color: 'var(--kid-muted)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          Let's play some fun games to see how super your reading brain is! 🌟
        </p>
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '2px solid #F59E0B', borderRadius: 16, padding: '0.8rem 1.2rem', marginBottom: '2rem', fontSize: '0.88rem', color: '#92400E' }}>
          ⚠️ <strong>For parents/teachers:</strong> This is a screening tool, not a medical diagnosis. Results should be reviewed by a qualified specialist.
        </div>
        <button className="kid-btn kid-btn-primary" style={{ fontSize: '1.3rem', padding: '1rem 3rem' }} onClick={() => setStep('setup')}>
          Let's Go! 🚀
        </button>
        <div style={{ marginTop: '1.5rem' }}>
          <button
            style={{ fontSize: '1rem', padding: '0.6rem 1.5rem', border: 'none', background: 'transparent', boxShadow: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito', textDecoration: 'underline' }}
            onClick={() => navigate(cid ? '/children' : '/')}
          >
            ← {cid ? 'Back to Children' : 'Back to Home'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Setup Screen ──
  if (step === 'setup') return (
    <div className="kid-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div className="kid-card" style={{ maxWidth: 520, width: '100%', borderRadius: 28 }}>
        <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '0.5rem' }}>👋</div>
        <h2 className="kid-title">Tell us about you!</h2>
        <p className="kid-subtitle">This helps us personalise your results</p>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1rem' }}>
            What's your name?
          </label>
          <input
            type="text"
            value={childName}
            onChange={e => setChildName(e.target.value)}
            placeholder="Type your name here..."
            className="word-input"
            style={{ fontSize: '1.3rem' }}
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.75rem', fontSize: '1rem' }}>
            How old are you?
          </label>
          <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {AGE_OPTIONS.map(age => (
              <button
                key={age}
                onClick={() => setChildAge(age)}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  border: `3px solid ${childAge === age ? 'var(--primary)' : '#DDD6FE'}`,
                  background: childAge === age ? 'var(--primary)' : 'white',
                  color: childAge === age ? 'white' : 'var(--primary)',
                  fontSize: '1.6rem', fontWeight: 900, fontFamily: 'Nunito',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {age}
              </button>
            ))}
            <button
              onClick={() => setChildAge(9)}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                border: `3px solid ${childAge === 9 ? 'var(--primary)' : '#DDD6FE'}`,
                background: childAge === 9 ? 'var(--primary)' : 'white',
                color: childAge === 9 ? 'white' : 'var(--primary)',
                fontSize: '1rem', fontWeight: 900, fontFamily: 'Nunito',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              8+
            </button>
          </div>
          <p style={{ textAlign: 'center', marginTop: '0.6rem', fontSize: '0.82rem', color: 'var(--kid-muted)' }}>
            Selected: <strong style={{ color: 'var(--primary)' }}>{childAge === 9 ? '8+' : childAge} years old</strong>
          </p>
        </div>

        <button
          className="kid-btn kid-btn-primary"
          style={{ width: '100%', fontSize: '1.2rem' }}
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? '⏳ Starting...' : '🎮 Start Games!'}
        </button>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            style={{ fontSize: '1rem', padding: '0.6rem 1.5rem', border: 'none', background: 'transparent', boxShadow: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito' }}
            onClick={() => setStep('intro')}
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  )

  // ── Games List Screen ──
  return (
    <div className="kid-shell">
      <header className="kid-header">
        <div className="kid-logo" style={{ cursor: 'pointer' }} onClick={() => navigate(cid ? '/children' : '/')}>
          {cid ? '👨‍👩‍👧 Children' : '🏠 Home'}
        </div>
        <div className="kid-progress-wrap">
          <div className="kid-progress-bar">
            <div className="kid-progress-fill" style={{ width: `${(completed.length / 4) * 100}%` }} />
          </div>
          <span className="kid-progress-label">{completed.length}/4 done</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}>
          {childName && <span>{childName} · </span>}Session #{sid}
        </div>
      </header>

      <div className="kid-page">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.8rem', color: 'var(--primary)' }}>
            {childName ? `${childName}'s Games! 🎯` : 'Choose a Game! 🎯'}
          </h2>
          <p style={{ color: 'var(--kid-muted)', marginTop: '0.4rem' }}>
            Complete all 4 games then see your results!
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1.25rem' }}>
          {GAMES.map((g, i) => {
            const done = completed.includes(g.id)
            return (
              <div
                key={g.id}
                onClick={() => navigate(`/games/${g.id}`)}
                style={{
                  background: done ? '#F0FDF4' : 'white',
                  border: `3px solid ${done ? '#10B981' : '#EDE9FE'}`,
                  borderRadius: 24, padding: '2rem 1.5rem',
                  textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.25s',
                  boxShadow: done ? '0 4px 16px rgba(16,185,129,0.2)' : '0 4px 16px rgba(124,58,237,0.08)',
                  animationDelay: `${i * 0.08}s`,
                }}
                className="animate-fadeInUp"
              >
                <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>{done ? '✅' : g.emoji}</div>
                <h3 style={{ fontFamily: 'Nunito', fontWeight: 900, color: 'var(--kid-text)', marginBottom: '0.4rem', fontSize: '1.1rem' }}>
                  {g.title}
                </h3>
                <p style={{ color: 'var(--kid-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>{g.desc}</p>
                <div style={{
                  marginTop: '1rem', padding: '0.3rem 1rem',
                  borderRadius: 99, display: 'inline-block',
                  background: done ? '#D1FAE5' : '#EDE9FE',
                  color: done ? '#065F46' : 'var(--primary)',
                  fontWeight: 700, fontSize: '0.78rem',
                }}>
                  {done ? '✓ Completed' : 'Tap to Play'}
                </div>
              </div>
            )
          })}
        </div>

        {completed.length === 4 && (
          <div style={{ marginTop: '2rem', textAlign: 'center', animation: 'bounceIn 0.5s ease' }}>
            <p style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '1rem' }}>
              🎉 Amazing! You completed all 4 games!
            </p>
            <button
              className="kid-btn kid-btn-success"
              style={{ fontSize: '1.2rem' }}
              onClick={() => navigate(`/results?child=${cid || ''}&session=${sid}`)}
            >
              📊 See My Results!
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
