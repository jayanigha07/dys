import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const AVATARS     = ['👦', '👧', '🧒', '👦🏽', '👧🏽', '👦🏻', '👧🏻', '🧒🏾']
const BG_COLORS   = ['#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4']

const RISK_META = {
  Low:    { bg: '#DCFCE7', border: '#86EFAC', text: '#166534', icon: '✅', label: 'Low Risk'    },
  Medium: { bg: '#FEF9C3', border: '#FDE047', text: '#854D0E', icon: '⚠️', label: 'Medium Risk' },
  High:   { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B', icon: '🚨', label: 'High Risk'   },
}

function getAvatar(name = '') { return AVATARS[name.charCodeAt(0) % AVATARS.length] }
function getBg(name = '')     { return BG_COLORS[name.charCodeAt(0) % BG_COLORS.length] }

function getChildPrediction(id) {
  const d = localStorage.getItem(`child_${id}_prediction`)
  return d ? JSON.parse(d) : null
}
function getCompletedCount(id) {
  const d = localStorage.getItem(`child_${id}_completedGames`)
  return d ? JSON.parse(d).length : 0
}
function getLastDate(id) {
  const d = localStorage.getItem(`child_${id}_lastAssessed`)
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ChildrenPage() {
  const navigate = useNavigate()
  const [children, setChildren] = useState(() =>
    JSON.parse(localStorage.getItem('children') || '[]')
  )
  const [showForm, setShowForm]       = useState(false)
  const [newName, setNewName]         = useState('')
  const [newAge, setNewAge]           = useState(6)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [hovered, setHovered]         = useState(null)

  function persistChildren(list) {
    setChildren(list)
    localStorage.setItem('children', JSON.stringify(list))
  }

  function addChild() {
    if (!newName.trim()) return
    const child = { id: Date.now(), name: newName.trim(), age: newAge, createdAt: new Date().toISOString() }
    persistChildren([...children, child])
    setNewName('')
    setNewAge(6)
    setShowForm(false)
  }

  function deleteChild(id) {
    persistChildren(children.filter(c => c.id !== id))
    ;['sessionId', 'gameResults', 'completedGames', 'prediction', 'lastAssessed']
      .forEach(k => localStorage.removeItem(`child_${id}_${k}`))
    setDeleteConfirm(null)
  }

  function activateChild(child) {
    localStorage.setItem('activeChildId',  child.id)
    localStorage.setItem('childName',      child.name)
    localStorage.setItem('childAge',       child.age)
  }

  function startAssessment(child) {
    activateChild(child)
    // Fresh assessment — wipe previous data for this child
    localStorage.setItem('completedGames', JSON.stringify([]))
    localStorage.setItem('gameResults',    JSON.stringify({}))
    localStorage.setItem(`child_${child.id}_completedGames`, JSON.stringify([]))
    localStorage.setItem(`child_${child.id}_gameResults`,    JSON.stringify({}))
    localStorage.removeItem(`child_${child.id}_prediction`)
    navigate('/games')
  }

  function viewResults(child) {
    activateChild(child)
    const gr = localStorage.getItem(`child_${child.id}_gameResults`)
    if (gr) localStorage.setItem('gameResults', gr)
    const sid = localStorage.getItem(`child_${child.id}_sessionId`)
    navigate(`/results?child=${child.id}${sid ? `&session=${sid}` : ''}`)
  }

  function viewDashboard(child) {
    activateChild(child)
    const gr = localStorage.getItem(`child_${child.id}_gameResults`)
    if (gr) localStorage.setItem('gameResults', gr)
    const sid = localStorage.getItem(`child_${child.id}_sessionId`)
    navigate(`/dashboard?child=${child.id}${sid ? `&session=${sid}` : ''}`)
  }

  function viewPractice(child) {
    activateChild(child)
    navigate('/improvement')
  }

  return (
    <div className="page" style={{ paddingBottom: '5rem' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="section-title">👨‍👩‍👧 My Children</h1>
          <p className="section-subtitle">Add children, run assessments, and track each child's results separately</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>🏠 Home</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(true); setDeleteConfirm(null) }}>
            + Add Child
          </button>
        </div>
      </div>

      {/* ── Add Child Form ── */}
      {showForm && (
        <div className="card card-glow" style={{ marginBottom: '2rem', animation: 'fadeInUp 0.3s ease' }}>
          <h3 style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--primary-light)' }}>
            👶 Add New Child Profile
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                Child's Name *
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChild()}
                placeholder="e.g. Ram, Jaya, Arjun…"
                autoFocus
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  background: 'var(--bg-card2)', border: '1px solid var(--border)',
                  borderRadius: '12px', color: 'var(--text)', fontSize: '1rem',
                  fontFamily: 'Poppins', outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                Age
              </label>
              <select
                value={newAge}
                onChange={e => setNewAge(Number(e.target.value))}
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  background: 'var(--bg-card2)', border: '1px solid var(--border)',
                  borderRadius: '12px', color: 'var(--text)', fontSize: '1rem',
                  fontFamily: 'Poppins', cursor: 'pointer', outline: 'none',
                }}
              >
                {[4,5,6,7,8].map(a => <option key={a} value={a}>{a} years</option>)}
                <option value={9}>8+ years</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={addChild} disabled={!newName.trim()}>
              ✓ Save Child
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setNewName('') }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Empty State ── */}
      {children.length === 0 && !showForm && (
        <div style={{
          textAlign: 'center', padding: '6rem 2rem',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
          border: '2px dashed var(--border)',
        }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem', animation: 'float 3s ease-in-out infinite' }}>👨‍👩‍👧</div>
          <h2 style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.6rem', marginBottom: '0.5rem', color: 'var(--primary-light)' }}>
            No children added yet
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: 400, margin: '0 auto 2rem' }}>
            Add each child's profile to track their individual screening results and practice progress separately.
          </p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Add Your First Child
          </button>
        </div>
      )}

      {/* ── Children Grid ── */}
      {children.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {children.map((child, idx) => {
            const pred     = getChildPrediction(child.id)
            const doneAmt  = getCompletedCount(child.id)
            const risk     = pred ? RISK_META[pred.risk_level] : null
            const lastDate = getLastDate(child.id)
            const isHov    = hovered === child.id

            return (
              <div
                key={child.id}
                onMouseEnter={() => setHovered(child.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${pred ? risk.border + '80' : isHov ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.75rem',
                  transition: 'var(--transition)',
                  transform: isHov ? 'translateY(-4px)' : 'none',
                  boxShadow: isHov ? 'var(--glow), var(--shadow-md)' : 'var(--shadow-sm)',
                  animation: `fadeInUp 0.4s ${idx * 0.08}s ease both`,
                  position: 'relative',
                }}
              >
                {/* ── Top: avatar + info + delete ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: 58, height: 58, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${getBg(child.name)}, ${getBg(child.name)}99)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.9rem', boxShadow: `0 4px 16px ${getBg(child.name)}55`,
                  }}>
                    {getAvatar(child.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.25rem', color: 'var(--text)', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {child.name}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {child.age === 9 ? '8+' : child.age} years old
                      {lastDate && <span> · {lastDate}</span>}
                    </div>
                  </div>
                  {/* Delete */}
                  {deleteConfirm === child.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <button onClick={() => deleteChild(child.id)} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: '#EF4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>Delete</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: 'var(--bg-card2)', color: 'var(--text-muted)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(child.id)} title="Remove" style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer', padding: '0.3rem', borderRadius: '50%', lineHeight: 1 }}>✕</button>
                  )}
                </div>

                {/* ── Risk Badge or Status ── */}
                {pred ? (
                  <div style={{
                    background: risk.bg + 'CC', border: `1px solid ${risk.border}`,
                    borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1.25rem',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                  }}>
                    <span style={{ fontSize: '1.4rem' }}>{risk.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: risk.text }}>Dyslexia Risk Level</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: risk.text, fontFamily: 'Nunito' }}>
                        {risk.label} · {Math.round(pred.probability_risk * 100)}% probability
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: 'var(--bg-card2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1.25rem',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                  }}>
                    <span style={{ fontSize: '1.4rem' }}>📋</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {doneAmt > 0 ? `${doneAmt}/4 games completed — results pending` : 'No assessment done yet'}
                    </div>
                  </div>
                )}

                {/* ── Action Buttons ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => startAssessment(child)}
                  >
                    🎮 {pred ? 'Reassess' : doneAmt > 0 ? 'Continue Assessment' : 'Start Assessment'}
                  </button>

                  {(pred || doneAmt > 0) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                      <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }} onClick={() => viewResults(child)}>
                        📊 Results
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }} onClick={() => viewDashboard(child)}>
                        📈 Dashboard
                      </button>
                    </div>
                  )}

                  {pred && (
                    <button className="btn btn-accent btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => viewPractice(child)}>
                      🚀 Practice Games
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add new child card */}
          <div
            onClick={() => setShowForm(true)}
            style={{
              background: 'var(--bg-card)', border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '2rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'var(--transition)', minHeight: 240, color: 'var(--text-muted)',
              animation: `fadeInUp 0.4s ${children.length * 0.08}s ease both`,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.color='var(--primary-light)'; e.currentTarget.style.background='rgba(124,58,237,0.05)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='var(--bg-card)' }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>➕</div>
            <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.4rem' }}>Add Child</div>
            <div style={{ fontSize: '0.85rem', textAlign: 'center' }}>Create a new profile</div>
          </div>
        </div>
      )}

      {/* ── Info note ── */}
      <div className="info-box" style={{ marginTop: '2.5rem' }}>
        <strong>ℹ️ How it works:</strong> Each child has their own separate profile, assessment games, results, and graphs. Click a child's card to start their assessment — results are stored independently so switching between children won't mix their data.
      </div>
    </div>
  )
}
