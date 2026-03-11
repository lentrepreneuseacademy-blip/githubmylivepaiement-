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
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf, background: '#0A0A0A', color: '#555' }}>Chargement...</div>

  // LOGIN SCREEN
  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf, background: '#0A0A0A' }}>
      <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 360, padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: '#FFF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ color: '#0A0A0A', fontSize: 16, fontWeight: 900 }}>ML</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#FFF', letterSpacing: 1 }}>SUPER ADMIN</div>
        </div>
        <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Email" type="email"
          style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', fontSize: 14, fontFamily: sf, outline: 'none', marginBottom: 10, background: 'rgba(255,255,255,.05)', color: '#FFF' }} />
        <input value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Mot de passe" type="password"
          style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', fontSize: 14, fontFamily: sf, outline: 'none', marginBottom: 16, background: 'rgba(255,255,255,.05)', color: '#FFF' }} />
        {loginError && <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 12, textAlign: 'center' }}>{loginError}</div>}
        <button type="submit" disabled={loginLoading}
          style={{ width: '100%', padding: 16, background: '#FFF', color: '#0A0A0A', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: sf }}>
          {loginLoading ? '...' : 'Connexion'}
        </button>
      </form>
    </div>
  )

  if (!data) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf, background: '#0A0A0A', color: '#555' }}>Chargement...</div>

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
    <div style={{ minHeight: '100vh', background: '#0A0A0A', fontFamily: sf, color: '#FFF' }}>
      {/* HEADER */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,10,10,.95)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: '#FFF', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#0A0A0A', fontSize: 9, fontWeight: 900 }}>ML</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>SUPER ADMIN</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={loadData} style={{ padding: '5px 12px', background: 'rgba(255,255,255,.08)', color: '#AAA', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>↻ Refresh</button>
          <button onClick={() => { supabase.auth.signOut(); setUser(null); setData(null) }} style={{ padding: '5px 12px', background: 'rgba(239,68,68,.15)', color: '#EF4444', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Deconnexion</button>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '20px 16px' }}>
        {/* KPI CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { l: 'MRR', v: stats.mrr + '€', sub: stats.activeSubscriptions + ' x 27€/mois', c: '#00FF87', bg: 'rgba(0,255,135,.06)' },
            { l: 'ARR', v: (stats.mrr * 12) + '€', sub: 'projection annuelle', c: '#00D4FF', bg: 'rgba(0,212,255,.06)' },
            { l: 'Clients PRO', v: stats.activeSubscriptions, sub: 'sur ' + stats.totalShops + ' inscrits (' + (stats.totalShops > 0 ? Math.round(stats.activeSubscriptions / stats.totalShops * 100) : 0) + '% conversion)', c: '#A855F7', bg: 'rgba(168,85,247,.06)' },
            { l: 'Volume plateforme', v: Math.round(stats.totalRevenue).toLocaleString() + '€', sub: stats.paidOrders + ' commandes payees', c: '#F59E0B', bg: 'rgba(245,158,11,.06)' },
            { l: "Aujourd'hui", v: stats.todayRevenue + '€', sub: stats.todayOrders + ' cmd / ' + todaySignups + ' inscrits', c: '#10B981', bg: 'rgba(16,185,129,.06)' },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 14, padding: '18px 16px', border: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ fontSize: 10, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>{s.l}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: s.c, letterSpacing: -1 }}>{s.v}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* CHARTS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'rgba(255,255,255,.02)', borderRadius: 14, padding: '18px 16px', border: '1px solid rgba(255,255,255,.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Revenus 30j</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#00FF87' }}>{Math.round(Object.values(revenueByDay).reduce((a, b) => a + b, 0))}€</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 100 }}>
              {Object.entries(revenueByDay).map(([d, v], i) => (
                <div key={i} style={{ flex: 1 }}><div style={{ width: '100%', background: v > 0 ? '#00FF87' : 'rgba(255,255,255,.03)', borderRadius: '3px 3px 0 0', height: Math.max(2, (v / maxRev) * 90) }} title={d + ': ' + Math.round(v) + '€'} /></div>
              ))}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.02)', borderRadius: 14, padding: '18px 16px', border: '1px solid rgba(255,255,255,.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Inscriptions 30j</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#A855F7' }}>{Object.values(signupsByDay).reduce((a, b) => a + b, 0)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 100 }}>
              {Object.entries(signupsByDay).map(([d, v], i) => (
                <div key={i} style={{ flex: 1 }}><div style={{ width: '100%', background: v > 0 ? '#A855F7' : 'rgba(255,255,255,.03)', borderRadius: '3px 3px 0 0', height: Math.max(2, (v / maxSig) * 90) }} title={d + ': ' + v} /></div>
              ))}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,.06)', paddingBottom: 12 }}>
          {[
            { id: 'kpi', l: '💎 PRO (' + activeShops.length + ')' },
            { id: 'free', l: '👤 Gratuits (' + inactiveShops.length + ')' },
            { id: 'all', l: '📊 Tous (' + shops.length + ')' },
            { id: 'orders', l: '💰 Commandes (' + orders.length + ')' },
            { id: 'feed', l: '🔔 Activite' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: sf, background: tab === t.id ? '#FFF' : 'transparent', color: tab === t.id ? '#0A0A0A' : '#555' }}>
              {t.l}
            </button>
          ))}
        </div>

        {tab !== 'feed' && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            style={{ width: '100%', maxWidth: 350, padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', fontSize: 12, fontFamily: sf, outline: 'none', marginBottom: 14, background: 'rgba(255,255,255,.04)', color: '#FFF' }} />
        )}

        {/* PRO */}
        {tab === 'kpi' && activeShops.filter(s => !search || (s.name+s.email+s.slug).toLowerCase().includes(search.toLowerCase())).map(s => {
          const rs = revenueByShop[s.id] || { revenue: 0, orders: 0 }
          return (
            <div key={s.id} onClick={() => setDetailShop(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.04)', cursor: 'pointer', marginBottom: 4 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #00FF87, #00D4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#000', fontSize: 14, fontWeight: 900 }}>{(s.name || '?')[0].toUpperCase()}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name} <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#00FF87', color: '#000' }}>PRO</span></div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{s.email} · {s.slug}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#00FF87' }}>{Math.round(rs.revenue)}€</div>
                <div style={{ fontSize: 10, color: '#555' }}>{rs.orders} ventes</div>
              </div>
              <span style={{ color: '#333' }}>›</span>
            </div>
          )
        })}
        {tab === 'kpi' && activeShops.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#444' }}>Aucun abonne PRO</div>}

        {/* FREE */}
        {tab === 'free' && inactiveShops.filter(s => !search || (s.name+s.email+s.slug).toLowerCase().includes(search.toLowerCase())).map(s => (
          <div key={s.id} onClick={() => setDetailShop(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)', cursor: 'pointer', marginBottom: 4 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#555', fontSize: 14, fontWeight: 900 }}>{(s.name || '?')[0].toUpperCase()}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name || 'Sans nom'}</div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{s.email} · inscrit le {new Date(s.created_at).toLocaleDateString('fr-FR')}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'rgba(245,158,11,.1)', color: '#F59E0B' }}>A CONVERTIR</span>
            <span style={{ color: '#333' }}>›</span>
          </div>
        ))}

        {/* ALL */}
        {tab === 'all' && filtered.map(s => {
          const rs = revenueByShop[s.id] || { revenue: 0, orders: 0 }
          const isA = s.subscription_status === 'active'
          return (
            <div key={s.id} onClick={() => setDetailShop(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)', cursor: 'pointer', marginBottom: 3 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: isA ? 'linear-gradient(135deg, #00FF87, #00D4FF)' : 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: isA ? '#000' : '#555', fontSize: 12, fontWeight: 900 }}>{(s.name || '?')[0].toUpperCase()}</span>
              </div>
              <div style={{ flex: 1 }}><span style={{ fontSize: 12, fontWeight: 700 }}>{s.name || 'Sans nom'}</span> <span style={{ fontSize: 10, color: '#444' }}>{s.slug}</span></div>
              <span style={{ fontSize: 12, fontWeight: 800, color: rs.revenue > 0 ? '#FFF' : '#333' }}>{Math.round(rs.revenue)}€</span>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: isA ? '#00FF87' : 'rgba(255,255,255,.06)', color: isA ? '#000' : '#555' }}>{isA ? 'PRO' : 'FREE'}</span>
            </div>
          )
        })}

        {/* ORDERS */}
        {tab === 'orders' && orders.filter(o => !search || (o.reference+(o.client_email||'')+(o.description||'')).toLowerCase().includes(search.toLowerCase())).slice(0, 100).map((o, i) => {
          const sh = shops.find(x => x.id === o.shop_id)
          const isPaid = o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered'
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.03)', marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#00D4FF', minWidth: 80 }}>{o.reference}</span>
              <span style={{ flex: 1, fontSize: 11, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sh ? sh.name : '-'} · {o.client_email || (o.description || '').slice(0, 40)}</span>
              <span style={{ fontSize: 13, fontWeight: 800, minWidth: 60, textAlign: 'right' }}>{o.total_amount || 0}€</span>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 4, minWidth: 55, textAlign: 'center', background: isPaid ? 'rgba(0,255,135,.1)' : 'rgba(245,158,11,.1)', color: isPaid ? '#00FF87' : '#F59E0B' }}>
                {o.status === 'paid' ? 'PAYE' : o.status === 'shipped' ? 'EXPEDIE' : o.status === 'delivered' ? 'LIVRE' : 'ATTENTE'}
              </span>
              <span style={{ fontSize: 10, color: '#444', minWidth: 65, textAlign: 'right' }}>{new Date(o.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          )
        })}

        {/* FEED */}
        {tab === 'feed' && activity.map((ev, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.03)', marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: ev.t === 'signup' ? 'rgba(0,212,255,.1)' : ev.t === 'pro' ? 'rgba(0,255,135,.1)' : ev.t === 'paid' ? 'rgba(168,85,247,.1)' : 'rgba(245,158,11,.1)' }}>
              <span style={{ fontSize: 14 }}>{ev.t === 'signup' ? '🆕' : ev.t === 'pro' ? '💎' : ev.t === 'paid' ? '💰' : '📦'}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>
                {ev.t === 'signup' && <><span style={{ color: '#00D4FF' }}>{ev.s?.name || 'Nouveau'}</span> s est inscrit(e)</>}
                {ev.t === 'pro' && <><span style={{ color: '#00FF87' }}>{ev.s?.name}</span> passe PRO — 27€/mois</>}
                {ev.t === 'paid' && <>Commande <span style={{ color: '#A855F7' }}>{ev.o?.reference}</span> payee — {ev.o?.total_amount || 0}€</>}
                {ev.t === 'pending' && <>Commande <span style={{ color: '#F59E0B' }}>{ev.o?.reference}</span> en attente</>}
              </div>
              <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{ev.s?.name || '-'} · {new Date(ev.d).toLocaleDateString('fr-FR')} {new Date(ev.d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        ))}
      </div>

      {/* DETAIL MODAL */}
      {detailShop && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setDetailShop(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#141414', borderRadius: 20, padding: '28px 24px', maxWidth: 560, width: '100%', maxHeight: '85vh', overflow: 'auto', border: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{detailShop.name || 'Sans nom'}</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{detailShop.email} · {detailShop.slug}</div>
              </div>
              <button onClick={() => setDetailShop(null)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.06)', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: detailShop.subscription_status === 'active' ? '#00FF87' : 'rgba(245,158,11,.2)', color: detailShop.subscription_status === 'active' ? '#000' : '#F59E0B' }}>
                {detailShop.subscription_status === 'active' ? 'PRO 27€/mois' : 'NON ABONNE'}
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: detailShop.stripe_account_id ? 'rgba(0,255,135,.1)' : 'rgba(239,68,68,.1)', color: detailShop.stripe_account_id ? '#00FF87' : '#EF4444' }}>
                {detailShop.stripe_account_id ? '✓ Stripe' : '✗ Stripe'}
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: detailShop.mondial_relay_enseigne ? 'rgba(0,255,135,.1)' : 'rgba(255,255,255,.04)', color: detailShop.mondial_relay_enseigne ? '#00FF87' : '#555' }}>
                {detailShop.mondial_relay_enseigne ? '✓ MR' : '✗ MR'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
              {(() => {
                const rs = revenueByShop[detailShop.id] || { revenue: 0, orders: 0 }
                const pending = orders.filter(o => o.shop_id === detailShop.id && o.status === 'pending_payment').length
                return [
                  { l: 'Revenus', v: Math.round(rs.revenue) + '€', c: '#00FF87' },
                  { l: 'Ventes', v: rs.orders, c: '#00D4FF' },
                  { l: 'Attente', v: pending, c: '#F59E0B' },
                ]
              })().map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: '#555' }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#888', lineHeight: 2.2, marginBottom: 16 }}>
              <div>Inscrit le {new Date(detailShop.created_at).toLocaleDateString('fr-FR')}</div>
              <div>Lien : <a href={'https://www.mylivepaiement.com/pay/' + detailShop.slug} target="_blank" rel="noopener" style={{ color: '#00D4FF' }}>mylivepaiement.com/pay/{detailShop.slug}</a></div>
              {detailShop.subscription_current_period_end && <div>Prochain paiement : {new Date(detailShop.subscription_current_period_end).toLocaleDateString('fr-FR')}</div>}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#888' }}>Commandes</div>
            {orders.filter(o => o.shop_id === detailShop.id).slice(0, 10).map((o, i) => {
              const isPaid = o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,.03)', marginBottom: 3, fontSize: 11 }}>
                  <span style={{ fontWeight: 800, color: '#00D4FF' }}>{o.reference}</span>
                  <span style={{ flex: 1, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.client_email || '-'}</span>
                  <span style={{ fontWeight: 800 }}>{o.total_amount || 0}€</span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: isPaid ? 'rgba(0,255,135,.1)' : 'rgba(245,158,11,.1)', color: isPaid ? '#00FF87' : '#F59E0B' }}>{isPaid ? 'PAYE' : 'ATTENTE'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
