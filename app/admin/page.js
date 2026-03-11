'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const ADMIN_EMAIL = 'contact@mylivepaiement.com'

export default function SuperAdminPage() {
  const sf = "system-ui, -apple-system, sans-serif"
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('kpi')
  const [search, setSearch] = useState('')
  const [detailShop, setDetailShop] = useState(null)
  const [contactMsgs, setContactMsgs] = useState([])
  const [contactLoading, setContactLoading] = useState(false)

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: d }) => {
      if (d.user && d.user.email === ADMIN_EMAIL) {
        setUser(d.user)
        loadData()
      }
      setLoading(false)
    })
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    if (loginEmail.toLowerCase().trim() !== ADMIN_EMAIL) {
      setLoginError('Acces refuse')
      setLoginLoading(false)
      return
    }
    const { data: d, error } = await supabase.auth.signInWithPassword({ email: loginEmail.toLowerCase().trim(), password: loginPassword })
    if (error) {
      setLoginError(error.message)
      setLoginLoading(false)
      return
    }
    if (d.user && d.user.email === ADMIN_EMAIL) {
      setUser(d.user)
      loadData()
    } else {
      setLoginError('Acces refuse')
    }
    setLoginLoading(false)
  }

  async function loadData() {
    try {
      const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_dashboard' }) })
      const d = await res.json()
      if (d.stats) setData(d)
    } catch (e) { console.error('[Admin]', e) }
    loadContactMessages()
  }

  async function loadContactMessages() {
    setContactLoading(true)
    try {
      const res = await fetch('/api/admin-contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_messages' }) })
      const d = await res.json()
      if (d.messages) setContactMsgs(d.messages)
    } catch (e) { console.error('[Admin Contact]', e) }
    setContactLoading(false)
  }

  async function markContactRead(id) {
    await fetch('/api/admin-contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_read', id }) })
    setContactMsgs(contactMsgs.map(m => m.id === id ? Object.assign({}, m, { status: 'read' }) : m))
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf, background: '#F5F5F7', color: '#86868B' }}>Chargement...</div>

  // LOGIN SCREEN
  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf, background: '#F5F5F7' }}>
      <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 360, padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: '#1D1D1F', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ color: '#FFF', fontSize: 16, fontWeight: 900 }}>ML</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1D1D1F', letterSpacing: 1 }}>SUPER ADMIN</div>
        </div>
        <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Email" type="email"
          style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,.06)', fontSize: 14, fontFamily: sf, outline: 'none', marginBottom: 10, background: '#FFF', color: '#1D1D1F' }} />
        <input value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Mot de passe" type="password"
          style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,.06)', fontSize: 14, fontFamily: sf, outline: 'none', marginBottom: 16, background: '#FFF', color: '#1D1D1F' }} />
        {loginError && <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 12, textAlign: 'center' }}>{loginError}</div>}
        <button type="submit" disabled={loginLoading}
          style={{ width: '100%', padding: 16, background: '#1D1D1F', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: sf }}>
          {loginLoading ? '...' : 'Connexion'}
        </button>
      </form>
    </div>
  )

  if (!data) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf, background: '#F5F5F7', color: '#86868B' }}>Chargement...</div>

  const { shops, orders, stats, revenueByDay, signupsByDay, revenueByShop } = data
  const activeShops = shops.filter(s => s.subscription_status === 'active')
  const inactiveShops = shops.filter(s => s.subscription_status !== 'active')
  const maxRev = Math.max(...Object.values(revenueByDay), 1)
  const maxSig = Math.max(...Object.values(signupsByDay), 1)
  const todaySignups = shops.filter(s => (s.created_at || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length

  const activity = [
    ...shops.map(s => ({ t: 'signup', d: s.created_at, s })),
    ...activeShops.map(s => ({ t: 'pro', d: s.updated_at || s.created_at, s })),
    ...orders.slice(0, 80).map(o => ({ t: o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered' ? 'paid' : 'pending', d: o.created_at, o, s: shops.find(x => x.id === o.shop_id) })),
  ].sort((a, b) => new Date(b.d) - new Date(a.d)).slice(0, 60)

  const filtered = shops.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (s.name || '').toLowerCase().includes(q) || (s.slug || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q)
  })

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7', fontFamily: sf, color: '#1D1D1F' }}>
      {/* HEADER */}
      <div style={{ borderBottom: '1px solid rgba(0,0,0,.04)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(245,245,247,.95)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: '#1D1D1F', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#FFF', fontSize: 9, fontWeight: 900 }}>ML</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>SUPER ADMIN</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={loadData} style={{ padding: '5px 12px', background: 'rgba(0,0,0,.08)', color: '#555', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>↻ Refresh</button>
          <button onClick={() => { supabase.auth.signOut(); setUser(null); setData(null) }} style={{ padding: '5px 12px', background: 'rgba(239,68,68,.08)', color: '#EF4444', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Deconnexion</button>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '20px 16px' }}>
        {/* KPI CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { l: 'MRR', v: stats.mrr + '€', sub: stats.activeSubscriptions + ' x 27€/mois', c: '#059669', bg: 'rgba(5,150,105,.06)' },
            { l: 'ARR', v: (stats.mrr * 12) + '€', sub: 'projection annuelle', c: '#007AFF', bg: 'rgba(0,122,255,.06)' },
            { l: 'Clients PRO', v: stats.activeSubscriptions, sub: 'sur ' + stats.totalShops + ' inscrits (' + (stats.totalShops > 0 ? Math.round(stats.activeSubscriptions / stats.totalShops * 100) : 0) + '% conversion)', c: '#7C3AED', bg: 'rgba(124,58,237,.06)' },
            { l: 'Volume plateforme', v: Math.round(stats.totalRevenue).toLocaleString() + '€', sub: stats.paidOrders + ' commandes payees', c: '#F59E0B', bg: 'rgba(245,158,11,.06)' },
            { l: "Aujourd'hui", v: stats.todayRevenue + '€', sub: stats.todayOrders + ' cmd / ' + todaySignups + ' inscrits', c: '#10B981', bg: 'rgba(16,185,129,.06)' },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 14, padding: '18px 16px', border: '1px solid rgba(0,0,0,.04)' }}>
              <div style={{ fontSize: 10, color: '#86868B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>{s.l}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: s.c, letterSpacing: -1 }}>{s.v}</div>
              <div style={{ fontSize: 11, color: '#86868B', marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* CHARTS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ background: '#FFF', borderRadius: 14, padding: '18px 16px', border: '1px solid rgba(0,0,0,.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Revenus 30j</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#059669' }}>{Math.round(Object.values(revenueByDay).reduce((a, b) => a + b, 0))}€</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 100 }}>
              {Object.entries(revenueByDay).map(([d, v], i) => (
                <div key={i} style={{ flex: 1 }}><div style={{ width: '100%', background: v > 0 ? '#059669' : '#FFF', borderRadius: '3px 3px 0 0', height: Math.max(2, (v / maxRev) * 90) }} title={d + ': ' + Math.round(v) + '€'} /></div>
              ))}
            </div>
          </div>
          <div style={{ background: '#FFF', borderRadius: 14, padding: '18px 16px', border: '1px solid rgba(0,0,0,.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Inscriptions 30j</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#7C3AED' }}>{Object.values(signupsByDay).reduce((a, b) => a + b, 0)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 100 }}>
              {Object.entries(signupsByDay).map(([d, v], i) => (
                <div key={i} style={{ flex: 1 }}><div style={{ width: '100%', background: v > 0 ? '#7C3AED' : '#FFF', borderRadius: '3px 3px 0 0', height: Math.max(2, (v / maxSig) * 90) }} title={d + ': ' + v} /></div>
              ))}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(0,0,0,.04)', paddingBottom: 12 }}>
          {[
            { id: 'kpi', l: '💎 PRO (' + activeShops.length + ')' },
            { id: 'free', l: '👤 Gratuits (' + inactiveShops.length + ')' },
            { id: 'all', l: '📊 Tous (' + shops.length + ')' },
            { id: 'orders', l: '💰 Commandes (' + orders.length + ')' },
            { id: 'feed', l: '🔔 Activite' },
            { id: 'messages', l: '📩 Messages (' + contactMsgs.filter(m => m.status === 'unread').length + ')' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: sf, background: tab === t.id ? '#1D1D1F' : 'transparent', color: tab === t.id ? '#FFF' : '#86868B' }}>
              {t.l}
            </button>
          ))}
        </div>

        {tab !== 'feed' && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            style={{ width: '100%', maxWidth: 350, padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,.08)', fontSize: 12, fontFamily: sf, outline: 'none', marginBottom: 14, background: 'rgba(0,0,0,.04)', color: '#1D1D1F' }} />
        )}

        {/* PRO */}
        {tab === 'kpi' && activeShops.filter(s => !search || (s.name+s.email+s.slug).toLowerCase().includes(search.toLowerCase())).map(s => {
          const rs = revenueByShop[s.id] || { revenue: 0, orders: 0 }
          return (
            <div key={s.id} onClick={() => setDetailShop(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: '#FFF', border: '1px solid rgba(0,0,0,.04)', cursor: 'pointer', marginBottom: 4 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #059669, #007AFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#FFF', fontSize: 14, fontWeight: 900 }}>{(s.name || '?')[0].toUpperCase()}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name} <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#059669', color: '#FFF' }}>PRO</span></div>
                <div style={{ fontSize: 10, color: '#86868B', marginTop: 2 }}>{s.email} · {s.slug}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>{Math.round(rs.revenue)}€</div>
                <div style={{ fontSize: 10, color: '#86868B' }}>{rs.orders} ventes</div>
              </div>
              <span style={{ color: '#CCC' }}>›</span>
            </div>
          )
        })}
        {tab === 'kpi' && activeShops.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#86868B' }}>Aucun abonne PRO</div>}

        {/* FREE */}
        {tab === 'free' && inactiveShops.filter(s => !search || (s.name+s.email+s.slug).toLowerCase().includes(search.toLowerCase())).map(s => (
          <div key={s.id} onClick={() => setDetailShop(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: '#FFF', border: '1px solid rgba(0,0,0,.04)', cursor: 'pointer', marginBottom: 4 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(0,0,0,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#86868B', fontSize: 14, fontWeight: 900 }}>{(s.name || '?')[0].toUpperCase()}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name || 'Sans nom'}</div>
              <div style={{ fontSize: 10, color: '#86868B', marginTop: 2 }}>{s.email} · inscrit le {new Date(s.created_at).toLocaleDateString('fr-FR')}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'rgba(245,158,11,.08)', color: '#F59E0B' }}>A CONVERTIR</span>
            <span style={{ color: '#CCC' }}>›</span>
          </div>
        ))}

        {/* ALL */}
        {tab === 'all' && filtered.map(s => {
          const rs = revenueByShop[s.id] || { revenue: 0, orders: 0 }
          const isA = s.subscription_status === 'active'
          return (
            <div key={s.id} onClick={() => setDetailShop(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: '#FFF', border: '1px solid rgba(0,0,0,.04)', cursor: 'pointer', marginBottom: 3 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: isA ? 'linear-gradient(135deg, #059669, #007AFF)' : 'rgba(0,0,0,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: isA ? '#000' : '#555', fontSize: 12, fontWeight: 900 }}>{(s.name || '?')[0].toUpperCase()}</span>
              </div>
              <div style={{ flex: 1 }}><span style={{ fontSize: 12, fontWeight: 700 }}>{s.name || 'Sans nom'}</span> <span style={{ fontSize: 10, color: '#86868B' }}>{s.slug}</span></div>
              <span style={{ fontSize: 12, fontWeight: 800, color: rs.revenue > 0 ? '#FFF' : '#333' }}>{Math.round(rs.revenue)}€</span>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: isA ? '#059669' : 'rgba(0,0,0,.04)', color: isA ? '#000' : '#555' }}>{isA ? 'PRO' : 'FREE'}</span>
            </div>
          )
        })}

        {/* ORDERS */}
        {tab === 'orders' && orders.filter(o => !search || (o.reference+(o.client_email||'')+(o.description||'')).toLowerCase().includes(search.toLowerCase())).slice(0, 100).map((o, i) => {
          const sh = shops.find(x => x.id === o.shop_id)
          const isPaid = o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered'
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: '#FFF', border: '1px solid #FFF', marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#007AFF', minWidth: 80 }}>{o.reference}</span>
              <span style={{ flex: 1, fontSize: 11, color: '#86868B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sh ? sh.name : '-'} · {o.client_email || (o.description || '').slice(0, 40)}</span>
              <span style={{ fontSize: 13, fontWeight: 800, minWidth: 60, textAlign: 'right' }}>{o.total_amount || 0}€</span>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 4, minWidth: 55, textAlign: 'center', background: isPaid ? 'rgba(5,150,105,.08)' : 'rgba(245,158,11,.08)', color: isPaid ? '#059669' : '#F59E0B' }}>
                {o.status === 'paid' ? 'PAYE' : o.status === 'shipped' ? 'EXPEDIE' : o.status === 'delivered' ? 'LIVRE' : 'ATTENTE'}
              </span>
              <span style={{ fontSize: 10, color: '#86868B', minWidth: 65, textAlign: 'right' }}>{new Date(o.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          )
        })}

        {/* FEED */}
        {tab === 'feed' && activity.map((ev, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: '#FFF', border: '1px solid #FFF', marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: ev.t === 'signup' ? 'rgba(0,122,255,.08)' : ev.t === 'pro' ? 'rgba(5,150,105,.08)' : ev.t === 'paid' ? 'rgba(124,58,237,.08)' : 'rgba(245,158,11,.08)' }}>
              <span style={{ fontSize: 14 }}>{ev.t === 'signup' ? '🆕' : ev.t === 'pro' ? '💎' : ev.t === 'paid' ? '💰' : '📦'}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>
                {ev.t === 'signup' && <><span style={{ color: '#007AFF' }}>{ev.s?.name || 'Nouveau'}</span> s est inscrit(e)</>}
                {ev.t === 'pro' && <><span style={{ color: '#059669' }}>{ev.s?.name}</span> passe PRO — 27€/mois</>}
                {ev.t === 'paid' && <>Commande <span style={{ color: '#7C3AED' }}>{ev.o?.reference}</span> payee — {ev.o?.total_amount || 0}€</>}
                {ev.t === 'pending' && <>Commande <span style={{ color: '#F59E0B' }}>{ev.o?.reference}</span> en attente</>}
              </div>
              <div style={{ fontSize: 10, color: '#86868B', marginTop: 2 }}>{ev.s?.name || '-'} · {new Date(ev.d).toLocaleDateString('fr-FR')} {new Date(ev.d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        ))}

        {/* MESSAGES */}
        {tab === 'messages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {contactLoading && <div style={{ textAlign: 'center', padding: 40, color: '#86868B' }}>Chargement...</div>}
            {!contactLoading && contactMsgs.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#86868B' }}>Aucun message</div>}
            {contactMsgs.map((m, i) => (
              <div key={i} onClick={function() { if (m.status === 'unread') markContactRead(m.id) }}
                style={{ padding: '16px 18px', borderRadius: 12, background: '#FFF', border: m.status === 'unread' ? '2px solid #007AFF' : '1px solid rgba(0,0,0,.04)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.status === 'unread' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#007AFF' }} />}
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1F' }}>{m.name || 'Anonyme'}</span>
                    <span style={{ fontSize: 11, color: '#86868B' }}>{m.email}</span>
                  </div>
                  <span style={{ fontSize: 10, color: '#86868B' }}>{new Date(m.created_at).toLocaleDateString('fr-FR')} {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {m.subject && <div style={{ fontSize: 11, fontWeight: 700, color: '#007AFF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{m.subject}</div>}
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.message}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <a href={'mailto:' + m.email} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 8, background: '#007AFF', color: '#FFF', textDecoration: 'none' }}>Repondre par email</a>
                  {m.status === 'unread' && <span style={{ fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 8, background: 'rgba(0,0,0,.04)', color: '#86868B' }}>Cliquer = marquer lu</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {detailShop && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setDetailShop(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#FFF', borderRadius: 20, padding: '28px 24px', maxWidth: 560, width: '100%', maxHeight: '85vh', overflow: 'auto', border: '1px solid rgba(0,0,0,.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{detailShop.name || 'Sans nom'}</div>
                <div style={{ fontSize: 12, color: '#86868B', marginTop: 4 }}>{detailShop.email} · {detailShop.slug}</div>
              </div>
              <button onClick={() => setDetailShop(null)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,0,0,.04)', border: 'none', color: '#86868B', fontSize: 14, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: detailShop.subscription_status === 'active' ? '#059669' : 'rgba(245,158,11,.2)', color: detailShop.subscription_status === 'active' ? '#000' : '#F59E0B' }}>
                {detailShop.subscription_status === 'active' ? 'PRO 27€/mois' : 'NON ABONNE'}
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: detailShop.stripe_account_id ? 'rgba(5,150,105,.08)' : 'rgba(239,68,68,.08)', color: detailShop.stripe_account_id ? '#059669' : '#EF4444' }}>
                {detailShop.stripe_account_id ? '✓ Stripe' : '✗ Stripe'}
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: detailShop.mondial_relay_enseigne ? 'rgba(5,150,105,.08)' : 'rgba(0,0,0,.04)', color: detailShop.mondial_relay_enseigne ? '#059669' : '#555' }}>
                {detailShop.mondial_relay_enseigne ? '✓ MR' : '✗ MR'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
              {(() => {
                const rs = revenueByShop[detailShop.id] || { revenue: 0, orders: 0 }
                const pending = orders.filter(o => o.shop_id === detailShop.id && o.status === 'pending_payment').length
                return [
                  { l: 'Revenus', v: Math.round(rs.revenue) + '€', c: '#059669' },
                  { l: 'Ventes', v: rs.orders, c: '#007AFF' },
                  { l: 'Attente', v: pending, c: '#F59E0B' },
                ]
              })().map((s, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,.04)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: '#86868B' }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#86868B', lineHeight: 2.2, marginBottom: 16 }}>
              <div>Inscrit le {new Date(detailShop.created_at).toLocaleDateString('fr-FR')}</div>
              <div>Lien : <a href={'https://www.mylivepaiement.com/pay/' + detailShop.slug} target="_blank" rel="noopener" style={{ color: '#007AFF' }}>mylivepaiement.com/pay/{detailShop.slug}</a></div>
              {detailShop.subscription_current_period_end && <div>Prochain paiement : {new Date(detailShop.subscription_current_period_end).toLocaleDateString('fr-FR')}</div>}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#86868B' }}>Commandes</div>
            {orders.filter(o => o.shop_id === detailShop.id).slice(0, 10).map((o, i) => {
              const isPaid = o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, background: '#FFF', marginBottom: 3, fontSize: 11 }}>
                  <span style={{ fontWeight: 800, color: '#007AFF' }}>{o.reference}</span>
                  <span style={{ flex: 1, color: '#86868B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.client_email || '-'}</span>
                  <span style={{ fontWeight: 800 }}>{o.total_amount || 0}€</span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: isPaid ? 'rgba(5,150,105,.08)' : 'rgba(245,158,11,.08)', color: isPaid ? '#059669' : '#F59E0B' }}>{isPaid ? 'PAYE' : 'ATTENTE'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
