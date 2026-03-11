'use client'
import { useState } from 'react'

export default function ContactPage() {
  const sf = "system-ui, -apple-system, 'SF Pro Display', sans-serif"
  const ss = "'New York', 'Iowan Old Style', Georgia, serif"
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !message) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/admin-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', name, email, subject, message })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setSending(false); return }
      setSent(true)
    } catch (e) {
      setError('Erreur de connexion')
    }
    setSending(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: sf }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(0,0,0,.06)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(250,250,248,.9)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#FFF', fontSize: 8, fontWeight: 900, letterSpacing: 1 }}>ML</span>
          </div>
          <span style={{ fontFamily: sf, fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>MY LIVE PAIEMENT</span>
        </a>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="/blog" style={{ fontSize: 13, color: '#777', textDecoration: 'none', fontWeight: 500 }}>Blog</a>
          <a href="/dashboard" style={{ padding: '8px 18px', background: '#1A1A1A', color: '#FFF', textDecoration: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>Essai gratuit</a>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 20px 80px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontFamily: ss, fontSize: 'clamp(30px, 5vw, 42px)', fontWeight: 400, marginBottom: 12 }}>Contacte-nous</h1>
          <p style={{ fontSize: 15, color: '#999', lineHeight: 1.7 }}>Une question ? Un besoin specifique ? On te repond sous 24h.</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#FFF', borderRadius: 20, border: '1px solid rgba(0,0,0,.06)' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✅</div>
            <h2 style={{ fontFamily: sf, fontSize: 22, fontWeight: 800, color: '#1D1D1F', marginBottom: 8 }}>Message envoye !</h2>
            <p style={{ fontSize: 14, color: '#999', lineHeight: 1.7 }}>On te repond sous 24h sur {email}.</p>
            <a href="/" style={{ display: 'inline-block', marginTop: 24, padding: '12px 28px', background: '#1A1A1A', color: '#FFF', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Retour a l'accueil</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: '#FFF', borderRadius: 20, padding: '32px 28px', border: '1px solid rgba(0,0,0,.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#BBB', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Nom</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ton nom"
                  style={{ width: '100%', padding: '14px 16px', border: '1px solid rgba(0,0,0,.08)', borderRadius: 12, fontSize: 14, fontFamily: sf, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#BBB', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Email *</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" type="email" required
                  style={{ width: '100%', padding: '14px 16px', border: '1px solid rgba(0,0,0,.08)', borderRadius: 12, fontSize: 14, fontFamily: sf, outline: 'none' }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#BBB', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Sujet</label>
              <select value={subject} onChange={e => setSubject(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', border: '1px solid rgba(0,0,0,.08)', borderRadius: 12, fontSize: 14, fontFamily: sf, outline: 'none', background: '#FFF', color: subject ? '#1D1D1F' : '#BBB' }}>
                <option value="">Choisis un sujet</option>
                <option value="question">Question generale</option>
                <option value="demo">Demande de demo</option>
                <option value="bug">Signaler un bug</option>
                <option value="partenariat">Partenariat</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#BBB', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Message *</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Ecris ton message ici..." required rows={6}
                style={{ width: '100%', padding: '14px 16px', border: '1px solid rgba(0,0,0,.08)', borderRadius: 12, fontSize: 14, fontFamily: sf, outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
            </div>

            {error && <div style={{ fontSize: 13, color: '#EF4444', marginBottom: 14, textAlign: 'center' }}>{error}</div>}

            <button type="submit" disabled={sending || !email || !message}
              style={{ width: '100%', padding: 16, background: sending ? '#E5E5E5' : '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: sending ? 'wait' : 'pointer', fontFamily: sf }}>
              {sending ? 'Envoi...' : 'Envoyer le message'}
            </button>

            <p style={{ fontSize: 12, color: '#CCC', textAlign: 'center', marginTop: 14 }}>On repond sous 24h. Pas de spam.</p>
          </form>
        )}

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 32 }}>
          <div style={{ background: '#FFF', borderRadius: 16, padding: '20px 18px', border: '1px solid rgba(0,0,0,.04)', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📧</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1F', marginBottom: 4 }}>Email</div>
            <div style={{ fontSize: 12, color: '#999' }}>contact@mylivepaiement.com</div>
          </div>
          <div style={{ background: '#FFF', borderRadius: 16, padding: '20px 18px', border: '1px solid rgba(0,0,0,.04)', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⚡</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1F', marginBottom: 4 }}>Reponse</div>
            <div style={{ fontSize: 12, color: '#999' }}>Sous 24h garanti</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', padding: '24px', textAlign: 'center' }}>
        <a href="/" style={{ fontSize: 12, color: '#BBB', textDecoration: 'none' }}>← Retour a l'accueil</a>
      </div>
    </div>
  )
}
