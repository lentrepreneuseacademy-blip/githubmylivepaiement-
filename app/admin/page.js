'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function AdminPage() {
  const sf = "system-ui, -apple-system, 'SF Pro Display', sans-serif"
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [detailShop, setDetailShop] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: d }) => {
      if (d.user) { setUser(d.user); loadData() }
      setLoading(false)
    })
  }, [])

  async function loadData() {
    try {
      const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_dashboard' }) })
      const d = await res.json()
      if (d.stats) setData(d)
    } catch (e) { console.error('[Admin]', e) }
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf, color: '#999' }}>Chargement...</div>
  if (!user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf }}><a href="/dashboard" style={{ color: '#007AFF' }}>Se connecter</a></div>
  if (!data) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf, color: '#999' }}>Chargement des donnees...</div>

  const { shops, orders, stats, revenueByDay, signupsByDay, revenueByShop } = data
  const activeShops = shops.filter(s => s.subscription_status === 'active')
  const inactiveShops = shops.filter(s => s.subscription_status !== 'active')
  const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered')

  // Chart helper
  const maxRevenue = Math.max(...Object.values(revenueByDay), 1)
  const maxSignups = Math.max(...Object.values(signupsByDay), 1)

  const filteredShops = shops.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (s.name || '').toLowerCase().includes(q) || (s.slug || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q)
  })

  function ShopRow({ shop }) {
    const rs = revenueByShop[shop.id] || { revenue: 0, orders: 0 }
    const isActive = shop.subscription_status === 'active'
    return (
      <div onClick={() => setDetailShop(shop)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 14, background: '#FFF', border: '1px solid rgba(0,0,0,.04)', cursor: 'pointer', transition: 'all .15s' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: isActive ? '#34C759' : '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: isActive ? '#FFF' : '#999', fontSize: 16, fontWeight: 800 }}>{(shop.name || '?')[0].toUpperCase()}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F' }}>{shop.name || 'Sans nom'}</span>
            <span style={{ fontSize: 11, color: '#86868B', background: '#F5F5F7', padding: '2px 8px', borderRadius: 6 }}>{shop.slug}</span>
            {isActive && <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#34C759', color: '#FFF', letterSpacing: 1 }}>PRO</span>}
          </div>
          <div style={{ fontSize: 11, color: '#86868B', marginTop: 3 }}>{shop.email || '-'} · {new Date(shop.created_at).toLocaleDateString('fr-FR')}</div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 80 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: rs.revenue > 0 ? '#1D1D1F' : '#CCC' }}>{Math.round(rs.revenue)}€</div>
          <div style={{ fontSize: 10, color: '#86868B' }}>{rs.orders} vente{rs.orders !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 70 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: shop.stripe_account_id ? '#34C759' : '#FF9500' }}>{shop.stripe_account_id ? '✓ Stripe' : '✗ Stripe'}</div>
          <div style={{ fontSize: 11, color: shop.mondial_relay_enseigne ? '#34C759' : '#CCC' }}>{shop.mondial_relay_enseigne ? '✓ MR' : '✗ MR'}</div>
        </div>
        <div style={{ fontSize: 16, color: '#CCC' }}>›</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7', fontFamily: sf }}>
      {/* Header */}
      <div style={{ background: '#1D1D1F', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: '#007AFF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#FFF', fontSize: 10, fontWeight: 900 }}>ML</span>
          </div>
          <span style={{ color: '#FFF', fontSize: 14, fontWeight: 700 }}>Admin</span>
          <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>MY LIVE PAIEMENT</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>{user.email}</span>
          <a href="/dashboard" style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, textDecoration: 'none' }}>Dashboard →</a>
          <button onClick={loadData} style={{ padding: '5px 12px', background: 'rgba(255,255,255,.1)', color: '#FFF', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>↻</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { l: 'MRR', v: stats.mrr + '€', sub: stats.activeSubscriptions + ' abonnes', c: '#007AFF', bg: '#EBF5FF' },
            { l: "Aujourd'hui", v: stats.todayRevenue + '€', sub: stats.todayOrders + ' commandes', c: '#34C759', bg: '#ECFDF5' },
            { l: 'Volume total', v: Math.round(stats.totalRevenue) + '€', sub: stats.paidOrders + ' payees', c: '#5856D6', bg: '#F3F0FF' },
            { l: 'Boutiques', v: stats.totalShops, sub: stats.activeSubscriptions + ' pro / ' + (stats.totalShops - stats.activeSubscriptions) + ' free', c: '#FF9500', bg: '#FFF8EB' },
            { l: 'En attente', v: stats.pendingOrders, sub: 'non payees', c: '#FF3B30', bg: '#FEF2F2' },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 16, padding: '16px 14px', border: '1px solid rgba(0,0,0,.03)' }}>
              <div style={{ fontSize: 10, color: '#86868B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{s.l}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 11, color: '#86868B', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div style={{ background: '#FFF', borderRadius: 16, padding: '20px 18px', marginBottom: 16, border: '1px solid rgba(0,0,0,.04)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', marginBottom: 14 }}>💰 Revenus des 30 derniers jours</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
            {Object.entries(revenueByDay).map(([day, val], i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', background: val > 0 ? '#007AFF' : 'rgba(0,0,0,.04)', borderRadius: '4px 4px 0 0', height: Math.max(2, (val / maxRevenue) * 100), transition: 'height .3s' }} title={day + ': ' + Math.round(val) + '€'} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 9, color: '#CCC' }}>il y a 30j</span>
            <span style={{ fontSize: 9, color: '#CCC' }}>aujourd'hui</span>
          </div>
        </div>

        {/* Signups chart */}
        <div style={{ background: '#FFF', borderRadius: 16, padding: '20px 18px', marginBottom: 20, border: '1px solid rgba(0,0,0,.04)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', marginBottom: 14 }}>📈 Inscriptions des 30 derniers jours</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
            {Object.entries(signupsByDay).map(([day, val], i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', background: val > 0 ? '#34C759' : 'rgba(0,0,0,.04)', borderRadius: '4px 4px 0 0', height: Math.max(2, (val / maxSignups) * 60), transition: 'height .3s' }} title={day + ': ' + val + ' inscriptions'} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 9, color: '#CCC' }}>il y a 30j</span>
            <span style={{ fontSize: 9, color: '#CCC' }}>aujourd'hui</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { id: 'overview', l: '✅ Abonnes PRO (' + activeShops.length + ')' },
            { id: 'free', l: '⏳ Non abonnes (' + inactiveShops.length + ')' },
            { id: 'all', l: '🏪 Toutes (' + shops.length + ')' },
            { id: 'orders', l: '📦 Commandes (' + orders.length + ')' },
            { id: 'activity', l: '🔔 Activite recente' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '8px 16px', borderRadius: 10, border: tab === t.id ? 'none' : '1px solid rgba(0,0,0,.06)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf, background: tab === t.id ? '#1D1D1F' : '#FFF', color: tab === t.id ? '#FFF' : '#555' }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, slug ou email..."
          style={{ width: '100%', maxWidth: 400, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,.08)', fontSize: 13, fontFamily: sf, outline: 'none', marginBottom: 16, background: '#FFF' }} />

        {/* PRO subscribers */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeShops.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 14 }}>Aucun abonne PRO pour le moment</div>}
            {activeShops.filter(s => !search || (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.email || '').toLowerCase().includes(search.toLowerCase())).map(s => <ShopRow key={s.id} shop={s} />)}
          </div>
        )}

        {/* Free / non-subscribers */}
        {tab === 'free' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {inactiveShops.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 14 }}>Tout le monde est abonne !</div>}
            {inactiveShops.filter(s => !search || (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.email || '').toLowerCase().includes(search.toLowerCase())).map(s => <ShopRow key={s.id} shop={s} />)}
          </div>
        )}

        {/* All shops */}
        {tab === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredShops.map(s => <ShopRow key={s.id} shop={s} />)}
          </div>
        )}

        {/* Orders */}
        {tab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {orders.slice(0, 100).map((o, i) => {
              const shopName = shops.find(s => s.id === o.shop_id)
              const isPaid = o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: '#FFF', border: '1px solid rgba(0,0,0,.04)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: isPaid ? '#ECFDF5' : '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 13 }}>{isPaid ? '✅' : '⏳'}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#007AFF' }}>{o.reference}</div>
                    <div style={{ fontSize: 10, color: '#86868B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shopName ? shopName.name : '-'} · {o.client_email || o.description || '-'}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1D1F', minWidth: 60, textAlign: 'right' }}>{o.total_amount || 0}€</div>
                  <div style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, color: '#FFF', minWidth: 60, textAlign: 'center',
                    background: o.status === 'paid' ? '#34C759' : o.status === 'shipped' ? '#007AFF' : o.status === 'delivered' ? '#5856D6' : '#F59E0B' }}>
                    {o.status === 'paid' ? 'PAYE' : o.status === 'shipped' ? 'EXPEDIE' : o.status === 'delivered' ? 'LIVRE' : 'ATTENTE'}
                  </div>
                  <div style={{ fontSize: 10, color: '#86868B', minWidth: 70, textAlign: 'right' }}>{new Date(o.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Activity feed */}
        {tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...shops.map(s => ({ type: 'signup', date: s.created_at, shop: s })),
              ...shops.filter(s => s.subscription_status === 'active').map(s => ({ type: 'subscribed', date: s.subscription_current_period_end ? new Date(new Date(s.subscription_current_period_end).getTime() - 30*86400000).toISOString() : s.created_at, shop: s })),
              ...orders.slice(0, 50).map(o => ({ type: o.status === 'paid' ? 'paid' : 'order', date: o.created_at, order: o, shop: shops.find(s => s.id === o.shop_id) })),
            ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50).map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: '#FFF', border: '1px solid rgba(0,0,0,.04)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: ev.type === 'signup' ? '#EBF5FF' : ev.type === 'subscribed' ? '#ECFDF5' : ev.type === 'paid' ? '#F3F0FF' : '#FFF7ED' }}>
                  <span style={{ fontSize: 14 }}>{ev.type === 'signup' ? '🆕' : ev.type === 'subscribed' ? '💎' : ev.type === 'paid' ? '💰' : '📦'}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>
                    {ev.type === 'signup' && <>{ev.shop?.name || 'Nouvelle boutique'} <span style={{ color: '#007AFF' }}>s'est inscrit(e)</span></>}
                    {ev.type === 'subscribed' && <>{ev.shop?.name} <span style={{ color: '#34C759' }}>est passe(e) PRO</span> — 27€/mois</>}
                    {ev.type === 'paid' && <>Commande <span style={{ color: '#5856D6' }}>{ev.order?.reference}</span> payee — {ev.order?.total_amount || 0}€</>}
                    {ev.type === 'order' && <>Commande <span style={{ color: '#F59E0B' }}>{ev.order?.reference}</span> en attente</>}
                  </div>
                  <div style={{ fontSize: 10, color: '#86868B', marginTop: 2 }}>{ev.shop?.name || '-'} · {new Date(ev.date).toLocaleDateString('fr-FR')} {new Date(ev.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shop detail modal */}
      {detailShop && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setDetailShop(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#FFF', borderRadius: 24, padding: '28px 24px', maxWidth: 550, width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1D1D1F' }}>{detailShop.name || 'Sans nom'}</div>
                <div style={{ fontSize: 13, color: '#86868B', marginTop: 4 }}>{detailShop.slug} · {detailShop.email}</div>
              </div>
              <button onClick={() => setDetailShop(null)} style={{ width: 32, height: 32, borderRadius: 8, background: '#F5F5F7', border: 'none', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Status badges */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 8, background: detailShop.subscription_status === 'active' ? '#34C759' : '#F59E0B', color: '#FFF' }}>
                {detailShop.subscription_status === 'active' ? 'ABONNE PRO' : 'NON ABONNE'}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 8, background: detailShop.stripe_account_id ? '#ECFDF5' : '#FEF2F2', color: detailShop.stripe_account_id ? '#059669' : '#DC2626' }}>
                {detailShop.stripe_account_id ? '✓ Stripe connecte' : '✗ Stripe non connecte'}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 8, background: detailShop.mondial_relay_enseigne ? '#ECFDF5' : '#FEF2F2', color: detailShop.mondial_relay_enseigne ? '#059669' : '#DC2626' }}>
                {detailShop.mondial_relay_enseigne ? '✓ Mondial Relay' : '✗ Mondial Relay'}
              </span>
            </div>

            {/* Shop stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {(() => {
                const rs = revenueByShop[detailShop.id] || { revenue: 0, orders: 0 }
                const shopOrders = orders.filter(o => o.shop_id === detailShop.id)
                const pending = shopOrders.filter(o => o.status === 'pending_payment').length
                return [
                  { l: 'Revenus', v: Math.round(rs.revenue) + '€', c: '#007AFF' },
                  { l: 'Ventes', v: rs.orders, c: '#34C759' },
                  { l: 'En attente', v: pending, c: '#F59E0B' },
                ]
              })().map((s, i) => (
                <div key={i} style={{ background: '#F5F5F7', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: '#86868B' }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Info */}
            <div style={{ fontSize: 12, color: '#555', lineHeight: 2 }}>
              <div><strong>Cree le :</strong> {new Date(detailShop.created_at).toLocaleDateString('fr-FR')} a {new Date(detailShop.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
              <div><strong>Email :</strong> {detailShop.email || '-'}</div>
              <div><strong>Slug :</strong> {detailShop.slug}</div>
              {detailShop.stripe_account_id && <div><strong>Stripe ID :</strong> {detailShop.stripe_account_id}</div>}
              {detailShop.stripe_subscription_id && <div><strong>Subscription :</strong> {detailShop.stripe_subscription_id}</div>}
              {detailShop.subscription_current_period_end && <div><strong>Prochain paiement :</strong> {new Date(detailShop.subscription_current_period_end).toLocaleDateString('fr-FR')}</div>}
              <div><strong>Lien boutique :</strong> <a href={'https://www.mylivepaiement.com/pay/' + detailShop.slug} target="_blank" rel="noopener" style={{ color: '#007AFF' }}>mylivepaiement.com/pay/{detailShop.slug}</a></div>
            </div>

            {/* Recent orders for this shop */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Dernieres commandes</div>
              {orders.filter(o => o.shop_id === detailShop.id).slice(0, 10).map((o, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#F5F5F7', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: '#007AFF' }}>{o.reference}</span>
                  <span style={{ flex: 1, color: '#86868B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.client_email || o.description || '-'}</span>
                  <span style={{ fontWeight: 700 }}>{o.total_amount || 0}€</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, color: '#FFF',
                    background: o.status === 'paid' ? '#34C759' : o.status === 'shipped' ? '#007AFF' : '#F59E0B' }}>
                    {o.status === 'paid' ? 'PAYE' : o.status === 'shipped' ? 'EXPEDIE' : 'ATTENTE'}
                  </span>
                </div>
              ))}
              {orders.filter(o => o.shop_id === detailShop.id).length === 0 && (
                <div style={{ fontSize: 12, color: '#CCC', textAlign: 'center', padding: 16 }}>Aucune commande</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
