import { useNavigate } from 'react-router-dom'

const features = [
  { icon: '🎮', title: 'Game-Based Tests', desc: 'Fun mini-games that measure cognitive markers linked to early dyslexia indicators.' },
  { icon: '🤖', title: 'ML Risk Analysis', desc: 'Random Forest model trained on 1,500 samples provides evidence-based screening.' },
  { icon: '📊', title: 'Pro Dashboard', desc: 'Visual charts, confusion matrix, feature importance and personalised insights.' },
  { icon: '📄', title: 'PDF Reports', desc: 'Download a complete professional report to share with educators or specialists.' },
  { icon: '🎯', title: 'Adaptive Practice', desc: 'Post-assessment improvement games targeting identified weak areas.' },
  { icon: '🔒', title: 'Private & Safe', desc: 'All data stays local. No personal health data is shared externally.' },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-light-shell">
      {/* Decorative blobs */}
      <div className="home-blob home-blob-1" />
      <div className="home-blob home-blob-2" />
      <div className="home-blob home-blob-3" />

      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-badge">⭐ Early Intervention · Ages 4–8+</div>
        <h1 className="home-hero-title">
          Early Dyslexia<br />
          <span className="home-gradient-text">Risk Screening</span>
        </h1>
        <p className="home-hero-desc">
          A playful, game-based assessment that helps identify early signs of dyslexia risk
          in children aged 4–8 — powered by machine learning.
        </p>
        <div className="home-disclaimer">
          ⚠️ This is a <strong>screening tool only</strong> — not a medical diagnosis.
          Always consult a qualified educational psychologist for a formal assessment.
        </div>
        <div className="home-hero-actions">
          <button className="home-btn-primary" onClick={() => navigate('/children')}>
            🚀 Start Assessment
          </button>
          <button className="home-btn-secondary" onClick={() => navigate('/dashboard')}>
            📊 View Dashboard
          </button>
        </div>
      </section>

      {/* Stats row */}
      <div className="home-stats-row">
        {[
          { icon: '🧪', label: 'Training Samples', value: '1,500' },
          { icon: '🤖', label: 'ML Model', value: 'Random Forest' },
          { icon: '🎮', label: 'Mini-Games', value: '4' },
          { icon: '👦', label: 'Age Range', value: '4–8+' },
        ].map(s => (
          <div className="home-stat-card" key={s.label}>
            <span className="home-stat-icon">{s.icon}</span>
            <div className="home-stat-value">{s.value}</div>
            <div className="home-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Feature Grid */}
      <div className="home-section-label">✨ What's Included</div>
      <div className="home-feature-grid">
        {features.map((f, i) => (
          <div className="home-feature-card" key={f.title} style={{ animationDelay: `${i * 0.08}s` }}>
            <span className="home-feature-icon">{f.icon}</span>
            <h3 className="home-feature-title">{f.title}</h3>
            <p className="home-feature-desc">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA Banner */}
      <div className="home-cta-banner">
        <div>
          <h2 className="home-cta-title">Ready to begin the assessment?</h2>
          <p className="home-cta-sub">Takes about 5–10 minutes. No sign-up required.</p>
        </div>
        <button className="home-btn-primary home-btn-lg" onClick={() => navigate('/children')}>
          🎮 Start Now →
        </button>
      </div>

      <footer className="home-footer">
        <p>⚠️ <strong>Disclaimer:</strong> This tool is for educational screening purposes only and does not constitute a medical or psychological diagnosis. Always consult a qualified professional.</p>
      </footer>
    </div>
  )
}
