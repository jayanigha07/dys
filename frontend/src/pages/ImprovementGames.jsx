import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ═══════════════════════════════════════════════════════════
   Improvement Games Hub — 4 adaptive post-assessment games
   ═══════════════════════════════════════════════════════════ */

const GAMES = [
  {
    id: 'phonics',  emoji: '🔊', title: 'Phonics Trainer',
    desc: 'Match letters to their sounds — build strong sound-letter connections!',
    badge: 'Sound · Letter Mapping',
  },
  {
    id: 'visual',   emoji: '👁️', title: 'Visual Discrimination',
    desc: 'Spot the difference between tricky letters like b, d, p, q!',
    badge: 'Letter Shapes',
  },
  {
    id: 'reading',  emoji: '📖', title: 'Reading Practice',
    desc: 'Read words at a comfortable pace — level up as you improve!',
    badge: 'Progressive Difficulty',
  },
  {
    id: 'memory',   emoji: '🧠', title: 'Memory Boost',
    desc: 'Sharpen your working memory with fun matching challenges!',
    badge: 'Working Memory',
  },
]

/* ────── Phonics Trainer ────── */
const PHONICS = [
  { letter: 'A', sound: 'Apple 🍎', options: ['Apple 🍎', 'Box 📦', 'Cat 🐱', 'Dog 🐶'] },
  { letter: 'B', sound: 'Ball ⚽', options: ['Ant 🐜', 'Ball ⚽', 'Cup ☕', 'Duck 🦆'] },
  { letter: 'C', sound: 'Cat 🐱', options: ['Car 🚗', 'Hat 🎩', 'Cat 🐱', 'Mop 🧹'] },
  { letter: 'D', sound: 'Dog 🐶', options: ['Egg 🥚', 'Fan 💨', 'Dog 🐶', 'Ice 🧊'] },
  { letter: 'F', sound: 'Fish 🐟', options: ['Fish 🐟', 'Jug 🏺', 'Key 🔑', 'Lamp 💡'] },
]

function PhonicsGame({ onBack }) {
  const [idx, setIdx]         = useState(0)
  const [score, setScore]     = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [done, setDone]       = useState(false)

  function pick(opt) {
    if (feedback) return
    const correct = opt === PHONICS[idx].sound
    setFeedback(correct ? 'correct' : 'wrong')
    if (correct) setScore(s => s + 1)
    setTimeout(() => {
      setFeedback(null)
      if (idx + 1 < PHONICS.length) setIdx(i => i + 1)
      else setDone(true)
    }, 900)
  }

  function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

  if (done) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
      <h2 style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.6rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Well done!</h2>
      <div className="stars">{'⭐'.repeat(Math.round(score/PHONICS.length*3))}{'☆'.repeat(3-Math.round(score/PHONICS.length*3))}</div>
      <p style={{ color: 'var(--kid-muted)', margin: '0.75rem 0 1.5rem' }}>Score: {score}/{PHONICS.length}</p>
      <button className="kid-btn kid-btn-primary" onClick={onBack}>Back to Games</button>
    </div>
  )

  const q = PHONICS[idx]
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '5rem', fontFamily: 'Nunito', fontWeight: 900, color: 'var(--primary)', animation: 'bounceIn 0.4s ease' }}>{q.letter}</div>
        <p style={{ color: 'var(--kid-muted)', fontWeight: 700 }}>What sound does this letter make?</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {shuffle(q.options).map(opt => (
          <button key={opt} onClick={() => pick(opt)} style={{
            padding: '1rem', borderRadius: 16, fontSize: '1.1rem', fontFamily: 'Nunito', fontWeight: 800,
            border: `3px solid ${feedback && opt === q.sound ? '#10B981' : feedback === 'wrong' ? '#EF4444' : '#DDD6FE'}`,
            background: feedback && opt === q.sound ? '#D1FAE5' : 'white',
            color: feedback && opt === q.sound ? '#065F46' : 'var(--primary)',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {opt}
          </button>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '1rem', color: 'var(--primary)', fontWeight: 700 }}>
        {idx + 1}/{PHONICS.length}  ·  Score: {score}
      </div>
    </div>
  )
}

/* ────── Visual Discrimination ────── */
const VISUAL_SETS = [
  { target: 'b', options: ['b', 'd', 'p', 'q', 'b', 'd', 'p', 'b'], correct: [0, 4, 7] },
  { target: 'd', options: ['b', 'd', 'q', 'd', 'p', 'd', 'b', 'q'], correct: [1, 3, 5] },
  { target: 'p', options: ['q', 'p', 'b', 'p', 'd', 'q', 'p', 'b'], correct: [1, 3, 6] },
]

function VisualGame({ onBack }) {
  const [idx, setIdx]     = useState(0)
  const [selected, setSelected] = useState([])
  const [checked, setChecked]   = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone]   = useState(false)

  function toggle(i) {
    if (checked) return
    setSelected(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])
  }

  function check() {
    if (checked) return
    setChecked(true)
    const q = VISUAL_SETS[idx]
    const isCorrect = JSON.stringify([...selected].sort()) === JSON.stringify([...q.correct].sort())
    if (isCorrect) setScore(s => s + 1)
    setTimeout(() => {
      setChecked(false); setSelected([])
      if (idx + 1 < VISUAL_SETS.length) setIdx(i => i + 1)
      else setDone(true)
    }, 1200)
  }

  if (done) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👁️</div>
      <h2 style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.6rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Sharp Eyes!</h2>
      <div className="stars">{'⭐'.repeat(score)}{'☆'.repeat(3-score)}</div>
      <p style={{ color: 'var(--kid-muted)', margin: '0.75rem 0 1.5rem' }}>Score: {score}/{VISUAL_SETS.length}</p>
      <button className="kid-btn kid-btn-primary" onClick={onBack}>Back to Games</button>
    </div>
  )

  const q = VISUAL_SETS[idx]
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)' }}>
          Tap all the <span style={{ fontSize: '2rem', color: 'var(--accent)' }}>{q.target}</span>'s!
        </h3>
        <p style={{ color: 'var(--kid-muted)', fontSize: '0.9rem' }}>Find every "{q.target}" in the grid below</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.6rem', marginBottom: '1.25rem' }}>
        {q.options.map((letter, i) => {
          const isSel = selected.includes(i)
          const isCorrect = checked && q.correct.includes(i)
          const isWrong   = checked && isSel && !q.correct.includes(i)
          return (
            <button key={i} onClick={() => toggle(i)} style={{
              padding: '1.25rem 0', borderRadius: 14,
              fontSize: '2.5rem', fontFamily: 'Nunito', fontWeight: 900,
              border: `3px solid ${isCorrect ? '#10B981' : isWrong ? '#EF4444' : isSel ? 'var(--primary)' : '#DDD6FE'}`,
              background: isCorrect ? '#D1FAE5' : isWrong ? '#FEE2E2' : isSel ? '#EDE9FE' : 'white',
              color: isCorrect ? '#065F46' : isWrong ? '#991B1B' : 'var(--primary)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {letter}
            </button>
          )
        })}
      </div>
      <button className="kid-btn kid-btn-primary" style={{ width: '100%' }} onClick={check} disabled={!selected.length}>
        Check! ✓
      </button>
    </div>
  )
}

/* ────── Reading Practice ────── */
const READ_LEVELS = [
  { words: ['cat', 'dog', 'sun', 'hat', 'big'],         label: '⭐ Beginner' },
  { words: ['fish', 'play', 'jump', 'rain', 'flag'],     label: '⭐⭐ Easy' },
  { words: ['cloud', 'brave', 'shine', 'dream', 'fruit'], label: '⭐⭐⭐ Medium' },
]

function ReadingGame({ onBack }) {
  const [level, setLevel]     = useState(0)
  const [idx, setIdx]         = useState(0)
  const [input, setInput]     = useState('')
  const [feedback, setFeedback] = useState(null)
  const [score, setScore]     = useState(0)
  const [done, setDone]       = useState(false)

  const words = READ_LEVELS[level].words

  function check() {
    const correct = input.trim().toLowerCase() === words[idx]
    setFeedback(correct ? 'correct' : 'wrong')
    if (correct) setScore(s => s + 1)
    setTimeout(() => {
      setFeedback(null); setInput('')
      if (idx + 1 < words.length) {
        setIdx(i => i + 1)
      } else if (level + 1 < READ_LEVELS.length) {
        setLevel(l => l + 1); setIdx(0)
      } else setDone(true)
    }, 800)
  }

  if (done) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📖</div>
      <h2 style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.6rem', color: 'var(--primary)' }}>Reading Star!</h2>
      <div className="stars">{'⭐'.repeat(Math.min(3, Math.round(score / 5)))}{'☆'.repeat(3 - Math.min(3, Math.round(score / 5)))}</div>
      <p style={{ color: 'var(--kid-muted)', margin: '0.75rem 0 1.5rem' }}>Score: {score}/{READ_LEVELS.reduce((a, l) => a + l.words.length, 0)}</p>
      <button className="kid-btn kid-btn-primary" onClick={onBack}>Back to Games</button>
    </div>
  )

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{ background: '#EDE9FE', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: 99, fontSize: '0.8rem', fontWeight: 700 }}>
          {READ_LEVELS[level].label}
        </span>
      </div>
      <div style={{ fontSize: '4rem', fontWeight: 900, fontFamily: 'Nunito', color: 'var(--primary)', margin: '1.5rem 0', animation: 'bounceIn 0.4s ease' }}>
        {words[idx]}
      </div>
      <p style={{ color: 'var(--kid-muted)', marginBottom: '1rem' }}>Read the word and type it below:</p>
      <input
        className="word-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && input && check()}
        placeholder="Type here…"
        autoFocus
        style={{
          borderColor: feedback === 'correct' ? '#10B981' : feedback === 'wrong' ? '#EF4444' : '#DDD6FE',
          marginBottom: '1rem',
        }}
      />
      {feedback && (
        <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '1.2rem', animation: 'bounceIn 0.3s ease',
          color: feedback === 'correct' ? '#10B981' : '#EF4444', marginBottom: '0.75rem' }}>
          {feedback === 'correct' ? '✅ Great!' : '❌ Try again!'}
        </div>
      )}
      <button className="kid-btn kid-btn-primary" style={{ width: '100%' }} onClick={check} disabled={!input.trim()}>
        Check ✓
      </button>
      <p style={{ color: 'var(--kid-muted)', marginTop: '1rem', fontSize: '0.85rem' }}>
        Word {idx + 1}/{words.length}  ·  Total score: {score}
      </p>
    </div>
  )
}

/* ────── Memory Boost ────── */
const MEMORY_CARDS = ['🐱', '🐶', '🐟', '🐸', '🦊', '🐻', '🐼', '🦁']

function MemoryBoost({ onBack }) {
  const [cards] = useState(() => {
    const pairs = [...MEMORY_CARDS, ...MEMORY_CARDS].sort(() => Math.random() - 0.5)
    return pairs.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }))
  })
  const [board, setBoard]     = useState(cards)
  const [flipped, setFlipped] = useState([])
  const [moves, setMoves]     = useState(0)
  const [done, setDone]       = useState(false)

  function flip(id) {
    if (flipped.length === 2) return
    const card = board.find(c => c.id === id)
    if (!card || card.flipped || card.matched) return

    const next = board.map(c => c.id === id ? { ...c, flipped: true } : c)
    const newFlipped = [...flipped, id]
    setBoard(next)
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves(m => m + 1)
      const [a, b] = newFlipped.map(fid => next.find(c => c.id === fid))
      if (a.emoji === b.emoji) {
        const matched = next.map(c => c.id === a.id || c.id === b.id ? { ...c, matched: true } : c)
        setBoard(matched)
        setFlipped([])
        if (matched.every(c => c.matched)) setDone(true)
      } else {
        setTimeout(() => {
          setBoard(prev => prev.map(c => newFlipped.includes(c.id) ? { ...c, flipped: false } : c))
          setFlipped([])
        }, 900)
      }
    }
  }

  if (done) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🧠</div>
      <h2 style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.6rem', color: 'var(--primary)' }}>Memory Master!</h2>
      <p style={{ color: 'var(--kid-muted)', margin: '0.75rem 0 1.5rem' }}>Completed in {moves} moves!</p>
      <button className="kid-btn kid-btn-primary" onClick={onBack}>Back to Games</button>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Nunito', fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>Memory Flip!</span>
        <span className="score-chip">🎯 Moves: {moves}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.6rem' }}>
        {board.map(card => (
          <div key={card.id} onClick={() => flip(card.id)} style={{
            height: 72, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', cursor: card.matched ? 'default' : 'pointer',
            background: card.flipped || card.matched ? 'white' : 'var(--primary)',
            border: `3px solid ${card.matched ? '#10B981' : card.flipped ? '#DDD6FE' : 'var(--primary-dark)'}`,
            transition: 'all 0.3s', boxShadow: card.matched ? '0 0 0 2px #10B981' : 'none',
          }}>
            {card.flipped || card.matched ? card.emoji : '❓'}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════
   Main ImprovementGames page
   ═══════════════════════════════════ */
export default function ImprovementGames() {
  const [active, setActive] = useState(null)
  const navigate = useNavigate()
  const cid = localStorage.getItem('activeChildId')

  function renderGame() {
    if (active === 'phonics')  return <PhonicsGame  onBack={() => setActive(null)} />
    if (active === 'visual')   return <VisualGame   onBack={() => setActive(null)} />
    if (active === 'reading')  return <ReadingGame  onBack={() => setActive(null)} />
    if (active === 'memory')   return <MemoryBoost  onBack={() => setActive(null)} />
  }

  return (
    <div className="page" style={{ paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="section-title">🚀 Improvement Games</h1>
          <p className="section-subtitle">Adaptive practice games targeting the areas identified in your assessment</p>
        </div>
        {!active && (
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(cid ? '/children' : '/')}>
            {cid ? '← Back to Children' : '🏠 Back to Home'}
          </button>
        )}
      </div>

      {!active ? (
        <div className="games-hub">
          {GAMES.map((g, i) => (
            <div
              key={g.id}
              className="game-hub-card animate-fadeInUp"
              style={{ animationDelay: `${i * 0.08}s` }}
              onClick={() => setActive(g.id)}
            >
              <span className="game-hub-icon">{g.emoji}</span>
              <div className="game-hub-title">{g.title}</div>
              <div className="game-hub-desc">{g.desc}</div>
              <div className="game-hub-badge">{g.badge}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: '1.5rem' }}
            onClick={() => setActive(null)}
          >
            ← Back to Games
          </button>
          <div className="kid-card" style={{ background: 'white', padding: '2rem' }}>
            {renderGame()}
          </div>
        </div>
      )}
    </div>
  )
}
