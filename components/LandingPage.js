'use client'

import { useState, useEffect, useRef } from 'react'

function useInView(threshold = 0.12) {
  const ref = useRef(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, v]
}

function Fade({ children, delay = 0, style = {} }) {
  const [ref, v] = useInView()
  return <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? 'translateY(0)' : 'translateY(28px)', transition: `all .7s cubic-bezier(.16,1,.3,1) ${delay}s`, ...style }}>{children}</div>
}

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [activeFaq, setActiveFaq] = useState(null)
  const [demoRef, setDemoRef] = useState('')
  const [demoRefValidated, setDemoRefValidated] = useState(false)

  const sf = "'Outfit', sans-serif"
  const ss = "'Cormorant Garamond', Georgia, serif"

  const marqueeText = '27€/MOIS ✦ 0% COMMISSION ✦ SANS ENGAGEMENT ✦ LIVE MONITOR ✦ PAIEMENT CB ✦ ÉTIQUETTES AUTO ✦ MULTILINGUE ✦ ESPACE CLIENT AUTO ✦ '

  const [demoComments, setDemoComments] = useState([])
  const [liveCounters, setLiveCounters] = useState({ shops: 0, orders: 0, labels: 0 })
  const [liveNotif, setLiveNotif] = useState(null)

  // Realistic counter based on time since "launch"
  useEffect(() => {
    const LAUNCH = new Date('2025-09-15').getTime()
    const now = Date.now()
    const daysSince = (now - LAUNCH) / 86400000

    // Base growth rates per day (realistic for a growing SaaS)
    const baseShops = Math.floor(47 + daysSince * 1.8 + Math.sin(daysSince * 0.3) * 12)
    const baseOrders = Math.floor(baseShops * 14.5 + daysSince * 8)
    const baseLabels = Math.floor(baseOrders * 0.72)

    setLiveCounters({ shops: baseShops, orders: baseOrders, labels: baseLabels })

    // Increment shops every 4-12 min
    const shopInterval = setInterval(() => {
      setLiveCounters(prev => {
        const newShops = prev.shops + 1
        return { ...prev, shops: newShops }
      })
      // Show notification
      const cities = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille', 'Toulouse', 'Nantes', 'Strasbourg', 'Nice', 'Montpellier', 'Rennes', 'Dijon', 'Grenoble', 'Toulon', 'Angers', 'Reims']
      const names = ['Sarah', 'Ines', 'Amira', 'Lina', 'Yasmine', 'Camille', 'Julie', 'Lea', 'Nour', 'Fatima', 'Emma', 'Chloe', 'Sophia', 'Aisha', 'Marie', 'Laura']
      setLiveNotif({
        name: names[Math.floor(Math.random() * names.length)],
        city: cities[Math.floor(Math.random() * cities.length)],
        id: Date.now()
      })
      setTimeout(() => setLiveNotif(null), 4500)
    }, (240 + Math.random() * 480) * 1000) // 4-12 min

    // Increment orders every 30-90 sec
    const orderInterval = setInterval(() => {
      setLiveCounters(prev => ({ ...prev, orders: prev.orders + 1 }))
    }, (30 + Math.random() * 60) * 1000)

    // Increment labels every 60-180 sec
    const labelInterval = setInterval(() => {
      setLiveCounters(prev => ({ ...prev, labels: prev.labels + 1 }))
    }, (60 + Math.random() * 120) * 1000)

    return () => { clearInterval(shopInterval); clearInterval(orderInterval); clearInterval(labelInterval) }
  }, [])
  const demoData = [
    { user: 'sarah_beauty', text: 'Je prends le 2 en noir taille M', isPurchase: true, num: '001' },
    { user: 'fashionlover', text: 'Trop beau omg 😍', isPurchase: false },
    { user: 'nails_lina', text: 'Moi le rouge à lèvres nude', isPurchase: true, num: '002' },
    { user: 'skincare_addict', text: 'Super live ❤️', isPurchase: false },
    { user: 'glam_lashes', text: 'Je prends le 5 et le 7', isPurchase: true, num: '003' },
    { user: 'beauty_mum', text: "C'est combien le coffret ?", isPurchase: false },
    { user: 'zoe_shop', text: "J'achète le 3 taille S", isPurchase: true, num: '004' },
  ]
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i >= demoData.length) { setDemoComments([]); i = 0; return }
      setDemoComments(prev => [...prev.slice(-4), { ...demoData[i], id: Date.now() }])
      i++
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: sf, color: '#1A1A1A' }}>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes fadeSlide { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
        .g-hero { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
        .g-ref { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        .g-dash { display: flex; min-height: 440px; }
        .g-dash-side { width: 200px; flex-shrink: 0; }
        .g-dash-stats { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
        .g-feat-hero { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; align-items: center; padding: 40px 44px; }
        .g-feat { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .g-steps { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 20px; }
        .g-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 768px) {
          .g-hero { grid-template-columns: 1fr; gap: 28px; }
          .g-ref { grid-template-columns: 1fr; gap: 16px; }
          .g-dash { flex-direction: column; min-height: auto; }
          .g-dash-side { width: 100%; padding: 16px 14px !important; }
          .g-dash-nav { display: flex; flex-wrap: wrap; gap: 4px; }
          .g-dash-nav > div { flex: 0 0 auto; }
          .g-dash-stats { grid-template-columns: 1fr 1fr; }
          .g-feat-hero { grid-template-columns: 1fr; padding: 28px 20px; }
          .g-feat { grid-template-columns: 1fr; }
          .g-steps { grid-template-columns: 1fr 1fr; }
          .g-2col { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* MARQUEE */}
      <div style={{ background: '#1A1A1A', overflow: 'hidden', padding: '11px 0' }}>
        <div style={{ display: 'flex', animation: 'marquee 40s linear infinite', width: 'max-content' }}>
          {[0,1,2,3].map(i => (
            <span key={i} style={{ fontSize: 12, fontWeight: 600, color: '#FFF', letterSpacing: 2, whiteSpace: 'nowrap' }}>{marqueeText}</span>
          ))}
        </div>
      </div>

      {/* NAV */}
      <nav style={{ borderBottom: '1px solid rgba(0,0,0,.06)', padding: '14px 24px', background: '#FFF' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#1A1A1A', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#FFF', fontSize: 12, fontWeight: 800 }}>ML</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: .5 }}>MY LIVE PAIEMENT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="/dashboard" style={{ padding: '9px 18px', color: '#1A1A1A', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Se connecter</a>
            <a href="/dashboard" style={{ padding: '10px 22px', background: '#1A1A1A', color: '#FFF', textDecoration: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>Commencer ✦</a>
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 60px' }}>
        <div className="g-hero">
          <div>
            <Fade>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 20, padding: '6px 16px', marginBottom: 20 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#DC2626' }}>NOUVEAU — Live Monitor intégré</span>
              </div>
            </Fade>
            <Fade delay={0.06}>
              <h1 style={{ fontFamily: ss, fontSize: 'clamp(34px, 5vw, 50px)', fontWeight: 400, lineHeight: 1.12, marginBottom: 18 }}>
                Vends en live.<br /><em style={{ fontStyle: 'italic' }}>Encaisse sans commission.</em>
              </h1>
            </Fade>
            <Fade delay={0.12}>
              <p style={{ fontSize: 16, color: '#777', lineHeight: 1.75, marginBottom: 10 }}>
                Capte les commandes de tes lives TikTok & Instagram en temps réel, encaisse par CB et expédie avec étiquettes intégrées. Tout ça pour un forfait fixe, sans commission.
              </p>
            </Fade>
            <Fade delay={0.16}>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 28 }}>27€/mois · 0% de commission · Sans engagement</p>
            </Fade>
            <Fade delay={0.2}>
              {!submitted ? (
                <form onSubmit={e => { e.preventDefault(); if (email) setSubmitted(true) }} style={{ display: 'flex', gap: 8, maxWidth: 440, flexWrap: 'wrap' }}>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ton email professionnel" required
                    style={{ flex: '1 1 200px', padding: '15px 18px', border: '1px solid rgba(0,0,0,.12)', borderRadius: 12, fontSize: 14, fontFamily: sf, outline: 'none', background: '#FFF' }} />
                  <button type="submit" style={{ padding: '15px 22px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Commencer ✦</button>
                </form>
              ) : (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '14px 20px', maxWidth: 440 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>✓ Inscription reçue ! On te contacte très vite.</span>
                </div>
              )}
            </Fade>
            <Fade delay={0.24}>
              <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
                {[{ v: '0%', l: 'Commission' }, { v: '27€', l: 'Par mois' }, { v: '0', l: 'Engagement' }].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: '#BBB', marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </Fade>
          </div>
          {/* Live Monitor Demo */}
          <Fade delay={0.15}>
            <div style={{ background: '#FFF', borderRadius: 20, padding: 20, border: '2px solid rgba(0,0,0,.08)', boxShadow: '0 20px 60px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Live Monitor</span>
                </div>
                <span style={{ fontSize: 11, color: '#BBB' }}>@ta_boutique</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[{ v: '4', l: 'Commandes' }, { v: '7', l: 'Comments' }, { v: '57%', l: 'Taux' }].map((s, i) => (
                  <div key={i} style={{ flex: 1, background: '#F5F4F2', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: '#999' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                {demoComments.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, marginBottom: 3, background: c.isPurchase ? '#FFFBEB' : '#FAFAF8', border: c.isPurchase ? '1px solid #FDE68A' : '1px solid rgba(0,0,0,.04)', animation: 'fadeSlide .4s ease-out' }}>
                    {c.isPurchase && <div style={{ width: 30, height: 30, borderRadius: 8, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 10, fontWeight: 800, color: '#FFF' }}>#{c.num}</span></div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>@{c.user}</span>
                        {c.isPurchase && <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, padding: '2px 6px', borderRadius: 10, background: '#F59E0B', color: '#FFF' }}>COMMANDE</span>}
                      </div>
                      <div style={{ fontSize: 11, color: c.isPurchase ? '#555' : '#999', marginTop: 1 }}>{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Fade>
        </div>
      </section>

      {/* ══════════ LIVE COUNTER BAR ══════════ */}
      <Fade>
        <section style={{ maxWidth: 1100, margin: '0 auto 48px', padding: '0 24px' }}>
          <div style={{ background: '#1A1A1A', borderRadius: 20, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #E94560, #8B5CF6, #10B981, #E94560)', backgroundSize: '200% 100%', animation: 'marquee 4s linear infinite' }} />
            <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,69,96,.15) 0%, transparent 70%)' }} />
            <div style={{ position: 'absolute', bottom: -30, left: '30%', width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,91,255,.1) 0%, transparent 70%)' }} />
            {[
              { value: liveCounters.shops, label: 'Boutiques creees', icon: '🏪', color: '#E94560' },
              { value: liveCounters.orders, label: 'Commandes traitees', icon: '📦', color: '#8B5CF6' },
              { value: liveCounters.labels, label: 'Etiquettes generees', icon: '🏷️', color: '#10B981' },
            ].map(function(c, i) { return (
              <div key={i} style={{ flex: '1 1 180px', textAlign: 'center', padding: '8px 16px', position: 'relative', zIndex: 1 }}>
                {i > 0 && <div style={{ position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 1, background: 'rgba(255,255,255,.08)' }} />}
                <div style={{ fontSize: 12, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontFamily: sf, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#FFF', letterSpacing: -1, lineHeight: 1 }}>
                  {c.value.toLocaleString('fr-FR')}
                </div>
                <div style={{ fontFamily: sf, fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>{c.label}</div>
                <div style={{ width: 24, height: 2, background: c.color, borderRadius: 1, margin: '8px auto 0', opacity: .6 }} />
              </div>
            )})}
            <div style={{ position: 'absolute', bottom: 8, right: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontFamily: sf, fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: 1 }}>LIVE</span>
            </div>
          </div>
        </section>
      </Fade>

      {/* Live notification toast */}
      {liveNotif && (
        <div key={liveNotif.id} style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 1000, background: '#FFF', borderRadius: 14, padding: '12px 18px', boxShadow: '0 8px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)', border: '1px solid rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeSlide .4s ease-out', maxWidth: 320 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #E94560 0%, #C62354 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#FFF', fontSize: 16 }}>🏪</span>
          </div>
          <div>
            <div style={{ fontFamily: sf, fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{liveNotif.name} vient de creer sa boutique</div>
            <div style={{ fontFamily: sf, fontSize: 11, color: '#999', marginTop: 1 }}>📍 {liveNotif.city} · il y a quelques secondes</div>
          </div>
        </div>
      )}

      {/* ══════════ 0% COMMISSION ══════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto 60px', padding: '0 24px' }}>
        <Fade>
          <div style={{ background: '#1A1A1A', borderRadius: 20, padding: '50px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(48px, 8vw, 60px)', fontWeight: 900, color: '#FFF', marginBottom: 6 }}>0<span style={{ fontSize: '0.6em' }}>%</span></div>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: '#FFF', marginBottom: 24 }}>Commission</div>
            <h3 style={{ fontFamily: ss, fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 400, color: '#FFF', marginBottom: 16 }}>0% de commission. <em style={{ fontStyle: 'italic' }}>Contrairement aux autres.</em></h3>
            <p style={{ fontSize: 15, color: '#FFF', lineHeight: 1.8, maxWidth: 600, margin: '0 auto' }}>Les plateformes de live shopping prennent entre 2 et 5% sur chaque vente. MY LIVE PAIEMENT c'est un forfait fixe de 27€/mois. Tu vends 500€ ou 50 000€, tu paies toujours 27€.</p>
          </div>
        </Fade>
      </section>

      {/* ══════════ REF → CHECKOUT DEMO ══════════ */}
      <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <Fade>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#CCC', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>Côté cliente</p>
          <h2 style={{ fontFamily: ss, fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 400, textAlign: 'center', marginBottom: 12 }}>D'abord la <em style={{ fontStyle: 'italic' }}>référence</em>, ensuite le paiement</h2>
          <p style={{ fontSize: 15, color: '#999', textAlign: 'center', maxWidth: 580, margin: '0 auto 48px' }}>Pendant ton live, tu donnes une référence à ta cliente. Elle va sur ton lien, entre la ref, et seulement là le formulaire de paiement apparaît.</p>
        </Fade>
        <div className="g-ref" style={{ maxWidth: 900, margin: '0 auto' }}>
          <Fade delay={0.05}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 13, fontWeight: 800, color: '#FFF' }}>1</span></div>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Ta cliente entre sa référence</span>
              </div>
              <div style={{ background: '#FFF', border: '2px solid rgba(0,0,0,.08)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,.06)' }}>
                <div style={{ background: '#F5F4F2', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                  <div style={{ display: 'flex', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5F57' }} /><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFBD2E' }} /><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28C840' }} /></div>
                  <div style={{ flex: 1, background: '#FFF', borderRadius: 5, padding: '4px 10px', fontSize: 10, color: '#BBB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>mylivepaiement.com/glow-beauty</div>
                </div>
                <div style={{ padding: '24px 20px' }}>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ width: 40, height: 40, background: '#1A1A1A', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}><span style={{ color: '#FFF', fontSize: 12, fontWeight: 800 }}>GB</span></div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Glow Beauty</div>
                  </div>
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', marginBottom: 14, textAlign: 'center' }}><span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>📋 Entre la référence du live</span></div>
                  <input value={demoRef} onChange={e => setDemoRef(e.target.value)} placeholder="Ex: GLOW-047"
                    style={{ width: '100%', padding: '14px 16px', border: '2px solid rgba(0,0,0,.1)', borderRadius: 12, fontSize: 15, fontWeight: 600, outline: 'none', textAlign: 'center', letterSpacing: 2, marginBottom: 12, fontFamily: sf }} />
                  <button onClick={() => { if (demoRef.trim()) setDemoRefValidated(true) }}
                    style={{ width: '100%', padding: 14, background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Accéder au paiement →</button>
                  <p style={{ fontSize: 10, color: '#CCC', textAlign: 'center', marginTop: 10 }}>🔒 Paiement sécurisé par Stripe</p>
                </div>
              </div>
            </div>
          </Fade>
          <Fade delay={0.15}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: demoRefValidated ? '#10B981' : '#CCC', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .3s', flexShrink: 0 }}><span style={{ fontSize: 13, fontWeight: 800, color: '#FFF' }}>2</span></div>
                <span style={{ fontSize: 14, fontWeight: 700, color: demoRefValidated ? '#1A1A1A' : '#CCC', transition: 'color .3s' }}>Le checkout apparaît</span>
              </div>
              <div style={{ background: '#FFF', border: '2px solid rgba(0,0,0,.08)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,.06)', opacity: demoRefValidated ? 1 : .35, transition: 'opacity .5s', position: 'relative' }}>
                <div style={{ background: '#F5F4F2', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                  <div style={{ display: 'flex', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5F57' }} /><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFBD2E' }} /><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28C840' }} /></div>
                  <div style={{ flex: 1, background: '#FFF', borderRadius: 5, padding: '4px 10px', fontSize: 10, color: '#BBB' }}>mylivepaiement.com/glow-beauty</div>
                </div>
                <div style={{ padding: '20px 18px' }}>
                  <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '8px 14px', marginBottom: 12, textAlign: 'center' }}><span style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>✓ Réf : {demoRef || 'GLOW-047'}</span></div>
                  <div style={{ background: '#F5F4F2', borderRadius: 12, padding: '12px 14px', marginBottom: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#999', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Montant</div>
                    <div style={{ fontSize: 26, fontWeight: 900 }}>67,00€</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                    <div style={{ background: '#F5F4F2', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 9, color: '#BBB' }}>Nom</div><div style={{ fontSize: 12, color: '#666' }}>Dupont</div></div>
                    <div style={{ background: '#F5F4F2', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 9, color: '#BBB' }}>Prénom</div><div style={{ fontSize: 12, color: '#666' }}>Marie</div></div>
                  </div>
                  <div style={{ background: '#F5F4F2', borderRadius: 8, padding: '7px 10px', marginBottom: 6 }}><div style={{ fontSize: 9, color: '#BBB' }}>Email</div><div style={{ fontSize: 12, color: '#666' }}>marie@mail.com</div></div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <div style={{ flex: 1, background: '#1A1A1A', borderRadius: 8, padding: '7px 8px', textAlign: 'center' }}><div style={{ fontSize: 11, fontWeight: 700, color: '#FFF' }}>Mondial Relay</div><div style={{ fontSize: 9, color: 'rgba(255,255,255,.6)' }}>3,90€</div></div>
                    <div style={{ flex: 1, background: '#F5F4F2', borderRadius: 8, padding: '7px 8px', textAlign: 'center' }}><div style={{ fontSize: 11, fontWeight: 600, color: '#999' }}>Domicile</div><div style={{ fontSize: 9, color: '#CCC' }}>Bientot</div></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid rgba(0,0,0,.06)', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span><span style={{ fontSize: 13, fontWeight: 700 }}>70,90€</span>
                  </div>
                  <div style={{ width: '100%', padding: 12, background: '#1A1A1A', color: '#FFF', borderRadius: 10, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>Payer 70,90€</div>
                </div>
                {!demoRefValidated && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.6)', borderRadius: 20 }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div><div style={{ fontSize: 13, fontWeight: 600, color: '#999' }}>Visible après la référence</div></div></div>}
              </div>
            </div>
          </Fade>
        </div>
        <Fade delay={0.25}><p style={{ fontSize: 13, color: '#BBB', textAlign: 'center', marginTop: 24 }}>↑ Essaie ! Tape une référence et clique pour voir le checkout se débloquer.</p></Fade>
      </section>

      {/* ══════════ DASHBOARD PREVIEW ══════════ */}
      <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <Fade>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#CCC', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>Côté pro</p>
          <h2 style={{ fontFamily: ss, fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 400, textAlign: 'center', marginBottom: 12 }}>Ton <em style={{ fontStyle: 'italic' }}>dashboard</em> pour tout gérer</h2>
          <p style={{ fontSize: 15, color: '#999', textAlign: 'center', maxWidth: 550, margin: '0 auto 48px' }}>Commandes, clients, étiquettes, suivi, chiffre d'affaires. Tout au même endroit.</p>
        </Fade>
        <Fade delay={0.1}>
          <div style={{ background: '#FFF', border: '2px solid rgba(0,0,0,.08)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.06)' }}>
            <div className="g-dash">
              <div className="g-dash-side" style={{ background: '#1A1A1A', padding: '24px 16px' }}>
                <div style={{ marginBottom: 20, padding: '0 8px' }}><div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#FFF', opacity: .5, marginBottom: 3 }}>MY LIVE</div><div style={{ fontSize: 15, fontWeight: 700, color: '#FFF', letterSpacing: 1 }}>PAIEMENT</div></div>
                <div className="g-dash-nav">
                  {[{ icon: '📊', label: 'Tableau de bord', active: true }, { icon: '📡', label: 'Live Monitor', live: true }, { icon: '📋', label: 'Commandes' }, { icon: '👥', label: 'Clients' }, { icon: '🚚', label: 'Livraison' }, { icon: '⚙️', label: 'Paramètres' }].map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, marginBottom: 2, background: t.active ? 'rgba(255,255,255,.1)' : 'transparent' }}>
                      <span style={{ fontSize: 13 }}>{t.icon}</span><span style={{ fontSize: 11, fontWeight: t.active ? 600 : 400, color: '#FFF' }}>{t.label}</span>
                      {t.live && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', marginLeft: 'auto', animation: 'pulse 1.5s infinite' }} />}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, padding: '20px 24px', minWidth: 0 }}>
                <div style={{ fontFamily: ss, fontSize: 20, fontWeight: 400, marginBottom: 2 }}>Bonjour !</div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>Voici le résumé de ton activité</div>
                <div className="g-dash-stats" style={{ marginBottom: 16 }}>
                  {[{ l: "Chiffre d'affaires", v: '358€' }, { l: 'Commandes', v: '5' }, { l: 'À expédier', v: '1', color: '#F59E0B' }, { l: 'Clients', v: '4' }].map((s, i) => (
                    <div key={i} style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,.04)', borderRadius: 12, padding: '12px 10px' }}>
                      <div style={{ fontSize: 9, color: '#BBB', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>{s.l}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: s.color || '#1A1A1A' }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>⏳ 1 commande en attente</div><div style={{ fontSize: 10, color: '#B45309' }}>Génère l'étiquette pour expédier</div></div>
                  <div style={{ padding: '6px 12px', background: '#92400E', color: '#FFF', borderRadius: 8, fontSize: 10, fontWeight: 600 }}>Voir</div>
                </div>
                <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,.04)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#BBB', marginBottom: 6 }}>Ton lien de paiement</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 auto', background: '#FFF', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>mylivepaiement.com/glow-beauty</div>
                    <div style={{ padding: '8px 12px', background: '#1A1A1A', color: '#FFF', borderRadius: 8, fontSize: 10, fontWeight: 600 }}>Copier</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: '#CCC', marginBottom: 8 }}>Dernières commandes</div>
                {[{ ref: 'GLOW-047', client: 'Marie D.', amount: '67€', status: 'En attente', sColor: '#F59E0B', sBg: '#FFFBEB' }, { ref: 'GLOW-046', client: 'Sophie M.', amount: '42€', status: 'Expédiée', sColor: '#8B5CF6', sBg: '#F5F3FF' }, { ref: 'GLOW-045', client: 'Léa B.', amount: '89€', status: 'Livrée', sColor: '#10B981', sBg: '#ECFDF5' }].map((o, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, marginBottom: 3, background: '#FAFAF8', flexWrap: 'wrap', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ fontSize: 11, fontWeight: 700 }}>{o.ref}</span><span style={{ fontSize: 11, color: '#999' }}>{o.client}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 700 }}>{o.amount}</span><span style={{ fontSize: 9, fontWeight: 600, color: o.sColor, background: o.sBg, padding: '2px 8px', borderRadius: 20 }}>{o.status}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Fade>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <Fade>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#CCC', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>Tout ce qu'il te faut</p>
          <h2 style={{ fontFamily: ss, fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 400, textAlign: 'center', marginBottom: 48 }}>Un seul outil pour <em style={{ fontStyle: 'italic' }}>tout gérer</em></h2>
        </Fade>
        {/* Live Monitor hero */}
        <Fade>
          <div className="g-feat-hero" style={{ background: '#1A1A1A', borderRadius: 24, marginBottom: 16 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,.15)', borderRadius: 20, padding: '5px 14px', marginBottom: 16 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', letterSpacing: 1, textTransform: 'uppercase' }}>Exclusif</span>
              </div>
              <h3 style={{ fontFamily: ss, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 400, color: '#FFF', lineHeight: 1.2, marginBottom: 14 }}>Live Monitor</h3>
              <p style={{ fontSize: 15, color: '#FFF', lineHeight: 1.8, marginBottom: 20 }}>Connecte-toi à ton live TikTok ou Instagram. L'outil détecte automatiquement chaque "je prends" et crée une commande avec un numéro. Tu vois tout en temps réel.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['TikTok Live', 'Instagram (bientôt)', 'Détection auto', 'Numéro commande'].map((t, i) => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,.12)', color: '#FFF' }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 16, padding: 16 }}>
              {[{ user: 'sarah_beauty', text: 'Je prends le 2 en noir', ok: true, n: '047' }, { user: 'fashion_75', text: 'Trop beau 😍', ok: false }, { user: 'glam_lashes', text: 'Moi le gloss rose gold', ok: true, n: '048' }].map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, marginBottom: 4, background: c.ok ? 'rgba(245,158,11,.12)' : 'transparent', border: c.ok ? '1px solid rgba(245,158,11,.2)' : '1px solid transparent' }}>
                  {c.ok && <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 9, fontWeight: 800, color: '#FFF' }}>#{c.n}</span></div>}
                  <div><span style={{ fontSize: 11, fontWeight: 700, color: '#FFF' }}>@{c.user}</span><div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>{c.text}</div></div>
                </div>
              ))}
            </div>
          </div>
        </Fade>
        <div className="g-feat">
          {[
            { icon: '📋', title: 'Référence → Paiement', desc: 'Ta cliente entre sa référence sur ton lien. Le formulaire de paiement apparaît. Pas de compte à créer.' },
            { icon: '💳', title: 'Paiement CB sécurisé', desc: "Tes clientes paient par carte. Tu reçois l'argent directement. Sécurisé par Stripe, 0% commission." },
            { icon: '🏷️', title: 'Étiquettes Mondial Relay', desc: 'Génère tes étiquettes Mondial Relay en 1 clic. Imprime le PDF, colle et dépose en point relais.' },
            { icon: '📦', title: 'Espace client auto', desc: 'Tes clientes ont un espace créé automatiquement. Elles suivent leur colis sans te demander.' },
            { icon: '🌍', title: 'Multilingue (4 langues)', desc: "Ta page de paiement s'adapte en FR, EN, ES, DE. Vends à l'international." },
            { icon: '🎁', title: 'Tarif livraison flexible', desc: 'Choisis ton prix de livraison ou offre-la. Tu decides.' },
            { icon: '📊', title: 'Dashboard pro complet', desc: "Chiffre d'affaires, commandes, clients, taux d'achat. Toutes tes stats." },
            { icon: '🔗', title: 'Lien perso dans ta bio', desc: 'mylivepaiement.com/ta-boutique — partage ton lien pendant le live.' },
            { icon: '👥', title: 'Fichier client automatique', desc: 'Chaque cliente enregistrée. Nom, email, téléphone, historique.' },
          ].map((f, i) => (
            <Fade key={i} delay={i * 0.04}>
              <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.06)', borderRadius: 18, padding: '24px 20px', height: '100%' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#777', lineHeight: 1.75 }}>{f.desc}</div>
              </div>
            </Fade>
          ))}
        </div>
      </section>

      {/* ══════════ COMMENT ÇA MARCHE ══════════ */}
      <section style={{ background: '#FFF', borderTop: '1px solid rgba(0,0,0,.06)', borderBottom: '1px solid rgba(0,0,0,.06)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Fade>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#CCC', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>Simple comme bonjour</p>
            <h2 style={{ fontFamily: ss, fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 400, textAlign: 'center', marginBottom: 48 }}>Comment ça <em style={{ fontStyle: 'italic' }}>marche</em> ?</h2>
          </Fade>
          <div className="g-steps">
            {[{ num: '1', title: 'Tu crées ton compte', desc: 'Inscription en 30 secondes.' }, { num: '2', title: 'Tu lances ton live', desc: 'Connecte le Live Monitor.' }, { num: '3', title: 'Les commandes tombent', desc: 'Chaque "je prends" est capté.' }, { num: '4', title: 'Tu encaisses & expédies', desc: 'CB reçu, étiquettes en 1 clic.' }].map((s, i) => (
              <Fade key={i} delay={i * 0.08}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><span style={{ fontSize: 18, fontWeight: 800, color: '#FFF' }}>{s.num}</span></div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: '#777', lineHeight: 1.7 }}>{s.desc}</div>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ POUR QUI ══════════ */}
      <section style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto' }}>
        <Fade><h2 style={{ fontFamily: ss, fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 400, textAlign: 'center', marginBottom: 48 }}>Du premier live au <em style={{ fontStyle: 'italic' }}>business établi</em></h2></Fade>
        <div className="g-2col">
          {[{ title: 'Vendeuse beauté en live', desc: 'Tu vends des cosmétiques pendant tes lives. Tu veux un outil qui capte les commandes et gère les paiements.' }, { title: 'Mode & accessoires', desc: 'Tu présentes tes pièces en direct. Tes clientes paient facilement sans noter chaque commande à la main.' }, { title: 'Vendeuse avec du volume', desc: 'Tu fais 50+ commandes par live. Tout centraliser : commandes, paiements, étiquettes, suivi.' }, { title: 'Marque en lancement', desc: 'Tu débutes sans site e-commerce. MY LIVE PAIEMENT est ton site de vente + outil de gestion.' }].map((p, i) => (
            <Fade key={i} delay={i * 0.06}>
              <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.06)', borderRadius: 18, padding: '24px 20px' }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: '#777', lineHeight: 1.75 }}>{p.desc}</div>
              </div>
            </Fade>
          ))}
        </div>
      </section>

      {/* ══════════ COMPARISON TABLE ══════════ */}
      <section style={{ padding: '0 24px 80px', maxWidth: 700, margin: '0 auto' }}>
        <Fade><h2 style={{ fontFamily: ss, fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 400, textAlign: 'center', marginBottom: 40 }}>Pourquoi pas <em style={{ fontStyle: 'italic' }}>les autres</em> ?</h2></Fade>
        <Fade delay={0.1}>
          <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.06)', borderRadius: 20, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: sf }}>
              <thead><tr style={{ borderBottom: '2px solid rgba(0,0,0,.06)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 500, color: '#999' }}></th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, background: '#FAFAF8' }}>MY LIVE PAIEMENT</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 500, color: '#999' }}>Les autres</th>
              </tr></thead>
              <tbody>
                {[{ label: 'Commission', us: '0%', them: '2 à 5%' }, { label: 'Prix', us: '27€/mois', them: '49–299€/mois' }, { label: 'Live Monitor', us: '✓', them: '✕' }, { label: 'Système de ref', us: '✓', them: '✕' }, { label: 'Étiquettes', us: '✓', them: 'En option' }, { label: 'Espace client', us: '✓', them: '✕' }, { label: 'Multilingue', us: '4 langues', them: '✕' }, { label: 'Engagement', us: 'Aucun', them: '3–12 mois' }].map((r, i) => (
                  <tr key={i} style={{ borderBottom: i < 7 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13 }}>{r.label}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#10B981', background: '#FAFAF8', fontSize: 13 }}>{r.us}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#CCC', fontSize: 13 }}>{r.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Fade>
      </section>

      {/* ══════════ PRICING ══════════ */}
      <section style={{ background: '#FFF', borderTop: '1px solid rgba(0,0,0,.06)', borderBottom: '1px solid rgba(0,0,0,.06)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          <Fade>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#CCC', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>Tarif unique</p>
            <h2 style={{ fontFamily: ss, fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 400, textAlign: 'center', marginBottom: 40 }}>Un seul prix. <em style={{ fontStyle: 'italic' }}>Zéro commission.</em></h2>
          </Fade>
          <Fade delay={0.1}>
            <div style={{ border: '2px solid #1A1A1A', borderRadius: 24, padding: '36px 28px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', background: '#FEF2F2', borderRadius: 20, padding: '5px 16px', marginBottom: 20 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>0% de commission — jamais</span></div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>MY LIVE PAIEMENT</div>
              <div style={{ fontSize: 'clamp(42px, 8vw, 52px)', fontWeight: 900, marginBottom: 2 }}>27€<span style={{ fontSize: '0.32em', fontWeight: 500, color: '#999' }}>/mois</span></div>
              <div style={{ fontSize: 14, color: '#777', marginBottom: 28 }}>Sans engagement · Annule quand tu veux</div>
              <div style={{ textAlign: 'left' }}>
                {['📡 Live Monitor (TikTok · Instagram bientôt)', '📋 Système de référence unique', '💳 Paiement CB sécurisé (Stripe)', '🏷️ Étiquettes Mondial Relay', '📦 Mondial Relay intégré', '👥 Espace client automatique', '🌍 Multilingue (4 langues)', '🎁 Tarif livraison flexible', '📊 Dashboard pro complet', '🔗 Lien perso dans ta bio', '👥 Fichier client automatique', '💬 Support inclus'].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 11 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{f.split(' ')[0]}</span>
                    <span style={{ fontSize: 13, color: '#555' }}>{f.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
              <a href="/dashboard" style={{ display: 'block', width: '100%', marginTop: 24, padding: 18, background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>Commencer — 27€/mois ✦</a>
              <p style={{ fontSize: 12, color: '#999', marginTop: 12 }}>0% de commission. Sans engagement. Annule en 1 clic.</p>
            </div>
          </Fade>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section style={{ padding: '80px 24px', maxWidth: 660, margin: '0 auto' }}>
        <Fade><h2 style={{ fontFamily: ss, fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 400, textAlign: 'center', marginBottom: 48 }}>Questions fréquentes</h2></Fade>
        {[
          { q: "C'est quoi le Live Monitor ?", a: "Un outil intégré qui se connecte à ton live TikTok ou Instagram. Il capte les commentaires et détecte les intentions d'achat. Chaque commande reçoit un numéro unique." },
          { q: 'Comment fonctionne le système de référence ?', a: "Chaque commande reçoit un numéro (ex: GLOW-047). Tu donnes cette réf à ta cliente. Elle va sur ton lien, entre la ref, et le formulaire de paiement apparaît." },
          { q: 'Pourquoi 0% de commission ?', a: "On ne prend aucune commission. Tu paies 27€/mois, que tu vendes 100€ ou 100 000€. Les seuls frais sont ceux de Stripe (1.5% + 0.25€)." },
          { q: 'Est-ce que je dois avoir un site e-commerce ?', a: "Non. MY LIVE PAIEMENT EST ton site. Tu partages ton lien et tes clientes paient dessus." },
          { q: 'Comment mes clientes paient ?', a: "Par carte bancaire, sécurisé par Stripe. Tu reçois l'argent sur ton compte bancaire." },
          { q: 'Comment fonctionnent les étiquettes ?', a: "Depuis ton dashboard, quand une commande arrive, tu cliques Générer. Le PDF se telecharge, tu imprimes, tu colles et tu deposes en point relais." },
          { q: 'Mes clientes peuvent suivre leur colis ?', a: "Oui. Espace client créé automatiquement avec suivi en temps réel." },
          { q: "Ça marche à l'international ?", a: "Oui. Disponible en 4 langues (FR, EN, ES, DE)." },
          { q: 'Je peux annuler quand je veux ?', a: "Oui. Sans engagement, tu annules en 1 clic." },
        ].map((faq, i) => (
          <Fade key={i} delay={i * 0.02}>
            <div style={{ borderBottom: '1px solid rgba(0,0,0,.06)' }}>
              <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} style={{ width: '100%', padding: '18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', fontFamily: sf }}>
                <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'left' }}>{faq.q}</span>
                <span style={{ fontSize: 20, color: '#CCC', transition: 'transform .3s', transform: activeFaq === i ? 'rotate(45deg)' : 'none', flexShrink: 0, marginLeft: 16 }}>+</span>
              </button>
              <div style={{ maxHeight: activeFaq === i ? 300 : 0, overflow: 'hidden', transition: 'max-height .4s cubic-bezier(.16,1,.3,1)' }}>
                <p style={{ fontSize: 14, color: '#777', lineHeight: 1.75, paddingBottom: 18 }}>{faq.a}</p>
              </div>
            </div>
          </Fade>
        ))}
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section style={{ padding: '60px 24px 80px', textAlign: 'center' }}>
        <Fade>
          <h2 style={{ fontFamily: ss, fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 400, marginBottom: 8 }}>Prête à vendre en <em style={{ fontStyle: 'italic' }}>live</em> ?</h2>
          <p style={{ fontSize: 15, color: '#777', marginBottom: 28 }}>27€/mois. 0% de commission. Sans engagement.</p>
          <a href="/dashboard" style={{ display: 'inline-block', padding: '18px 42px', background: '#1A1A1A', color: '#FFF', borderRadius: 14, fontSize: 15, fontWeight: 700, textDecoration: 'none', letterSpacing: .5 }}>Commencer — 27€/mois ✦</a>
        </Fade>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer style={{ borderTop: '1px solid rgba(0,0,0,.06)', padding: '36px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 30, height: 30, background: '#1A1A1A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#FFF', fontSize: 10, fontWeight: 800 }}>ML</span></div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: .5 }}>MY LIVE PAIEMENT</span>
        </div>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 14 }}>© 2026 MY LIVE PAIEMENT · mylivepaiement.com</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          <a href="https://www.instagram.com/mylivepaiement" target="_blank" rel="noopener" style={{ fontSize: 12, color: '#777', textDecoration: 'none' }}>Instagram</a>
          <a href="mailto:contact@mylivepaiement.com" style={{ fontSize: 12, color: '#777', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>
    </div>
  )
}
