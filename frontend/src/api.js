// Shared API helper – points at local FastAPI backend
const BASE = 'http://localhost:8000'

export async function createSession(childName, childAge) {
  const res = await fetch(`${BASE}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ child_name: childName, child_age: childAge }),
  })
  return res.json()
}

export async function saveGameResult(payload) {
  const res = await fetch(`${BASE}/api/game-result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function predict(payload) {
  const res = await fetch(`${BASE}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function getPrediction(sessionId) {
  const res = await fetch(`${BASE}/api/prediction/${sessionId}`)
  return res.json()
}

export async function getModelStats() {
  const res = await fetch(`${BASE}/api/model-stats`)
  return res.json()
}

export const PDF_URL = (sessionId) => `${BASE}/api/report/pdf/${sessionId}`
