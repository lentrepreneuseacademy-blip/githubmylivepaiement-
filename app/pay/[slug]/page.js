'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabase } from '../../../lib/supabase'

const sf = "'Outfit', sans-serif"
const ss = "'Cormorant Garamond', Georgia, serif"

// Translations
const t = {
  fr: {
    title: 'Paiement sécurisé',
    refLabel: 'RÉFÉRENCE DE COMMANDE',
    refPlaceholder: 'Ex: GLOW-047',
    refHint: '📋 Entre la référence donnée pendant le live',
    refButton: 'Accéder au paiement',
    refError: 'Référence introuvable. Vérifie et réessaie.',
    amount: 'Montant à régler',
    lastName: 'Nom',
    firstName: 'Prénom',
    email: 'Email',
    phone: 'Téléphone',
    address: 'Adresse',
    city: 'Ville',
    zip: 'Code postal',
    country: 'Pays',
    shipping: 'Livraison',
    card: 'Paiement par carte',
    total: 'Total',
    payButton: 'Payer',
    secure: '🔒 Paiement sécurisé · Données chiffrées',
    changeRef: 'Changer',
    freeShipping: '🎁 Livraison offerte !',
    loading: 'Chargement...',
    success: '✓ Paiement réussi ! Tu vas recevoir un email de confirmation.',
    trackOrder: 'Suivre ma commande',
  },
  en: {
    title: 'Secure payment',
    refLabel: 'ORDER REFERENCE',
    refPlaceholder: 'Ex: GLOW-047',
    refHint: '📋 Enter the reference given during the live',
    refButton: 'Access payment',
    refError: 'Reference not found. Please check and try again.',
    amount: 'Amount due',
    lastName: 'Last name',
    firstName: 'First name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    city: 'City',
    zip: 'Zip code',
    country: 'Country',
    shipping: 'Shipping',
    card: 'Card payment',
    total: 'Total',
    payButton: 'Pay',
    secure: '🔒 Secure payment · Encrypted data',
    changeRef: 'Change',
    freeShipping: '🎁 Free shipping!',
    loading: 'Loading...',
    success: '✓ Payment successful! You will receive a confirmation email.',
    trackOrder: 'Track my order',
  },
  es: {
    title: 'Pago seguro',
    refLabel: 'REFERENCIA DE PEDIDO',
    refPlaceholder: 'Ej: GLOW-047',
    refHint: '📋 Introduce la referencia dada durante el live',
    refButton: 'Acceder al pago',
    refError: 'Referencia no encontrada. Verifica e inténtalo de nuevo.',
    amount: 'Importe a pagar',
    lastName: 'Apellido',
    firstName: 'Nombre',
    email: 'Email',
    phone: 'Teléfono',
    address: 'Dirección',
    city: 'Ciudad',
    zip: 'Código postal',
    country: 'País',
    shipping: 'Envío',
    card: 'Pago con tarjeta',
    total: 'Total',
    payButton: 'Pagar',
    secure: '🔒 Pago seguro · Datos cifrados',
    changeRef: 'Cambiar',
    freeShipping: '🎁 ¡Envío gratuito!',
    loading: 'Cargando...',
    success: '✓ ¡Pago exitoso! Recibirás un email de confirmación.',
    trackOrder: 'Seguir mi pedido',
  },
  de: {
    title: 'Sichere Zahlung',
    refLabel: 'BESTELLREFERENZ',
    refPlaceholder: 'Z.B.: GLOW-047',
    refHint: '📋 Gib die während des Live gegebene Referenz ein',
    refButton: 'Zur Zahlung',
    refError: 'Referenz nicht gefunden. Bitte überprüfen.',
    amount: 'Zu zahlender Betrag',
    lastName: 'Nachname',
    firstName: 'Vorname',
    email: 'E-Mail',
    phone: 'Telefon',
    address: 'Adresse',
    city: 'Stadt',
    zip: 'PLZ',
    country: 'Land',
    shipping: 'Versand',
    card: 'Kartenzahlung',
    total: 'Gesamt',
    payButton: 'Bezahlen',
    secure: '🔒 Sichere Zahlung · Verschlüsselte Daten',
    changeRef: 'Ändern',
    freeShipping: '🎁 Kostenloser Versand!',
    loading: 'Laden...',
    success: '✓ Zahlung erfolgreich! Du erhältst eine Bestätigungs-E-Mail.',
    trackOrder: 'Bestellung verfolgen',
  },
}

const SHIPPING_OPTIONS = [
  { id: 'mondial_relay', name: 'Mondial Relay', price: 3.90, delay: '3-5 jours' },
  { id: 'colissimo', name: 'Colissimo', price: 5.90, delay: '2-3 jours' },
]

export default function PayPage({ params }) {
  const { slug } = params
  const supabase = createBrowserSupabase()

  const [lang, setLang] = useState('fr')
  const L = t[lang]

  // Shop data
  const [shop, setShop] = useState(null)
  const [shopLoading, setShopLoading] = useState(true)
  const [shopNotFound, setShopNotFound] = useState(false)

  // Ref step
  const [ref, setRef] = useState('')
  const [refValidated, setRefValidated] = useState(false)
  const [refError, setRefError] = useState(false)
  const [order, setOrder] = useState(null)

  // Checkout step
  const [form, setForm] = useState({
    lastName: '', firstName: '', email: '', phone: '',
    address: '', city: '', zip: '', country: 'FR',
  })
  const [selectedShipping, setSelectedShipping] = useState('mondial_relay')
  const [freeShipping, setFreeShipping] = useState(false)
  const [paying, setPaying] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Detect browser language
  useEffect(() => {
    const browserLang = navigator.language?.slice(0, 2)
    if (t[browserLang]) setLang(browserLang)
  }, [])

  // Load shop
  useEffect(() => {
    async function loadShop() {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error || !data) {
        setShopNotFound(true)
      } else {
        setShop(data)
      }
      setShopLoading(false)
    }
    loadShop()
  }, [slug])

  // Validate ref
  async function handleRefSubmit() {
    if (!ref.trim()) return
    setRefError(false)

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('ref', ref.trim().toUpperCase())
      .eq('status', 'pending_payment')
      .single()

    if (error || !data) {
      setRefError(true)
      return
    }

    setOrder(data)
    setRefValidated(true)

    // Check if client already ordered today (free shipping)
    if (data.client_email) {
      const today = new Date().toISOString().split('T')[0]
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('shop_id', shop.id)
        .eq('client_email', data.client_email)
        .eq('status', 'paid')
        .gte('created_at', today)

      if (todayOrders && todayOrders.length > 0) {
        setFreeShipping(true)
      }
    }
  }

  // Process payment
  async function handlePay(e) {
    e.preventDefault()
    setPaying(true)

    try {
      const shippingCost = freeShipping ? 0 : SHIPPING_OPTIONS.find(s => s.id === selectedShipping)?.price || 0
      const total = order.amount + shippingCost

      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          shop_id: shop.id,
          amount: total,
          shipping_method: selectedShipping,
          shipping_cost: shippingCost,
          client: form,
          return_url: `${window.location.origin}/pay/${slug}?success=true&order=${order.id}`,
        }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Erreur de paiement')
        setPaying(false)
      }
    } catch (err) {
      alert('Erreur de connexion')
      setPaying(false)
    }
  }

  // Check success return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      setPaymentSuccess(true)
    }
  }, [])

  const shippingPrice = freeShipping ? 0 : SHIPPING_OPTIONS.find(s => s.id === selectedShipping)?.price || 0
  const total = order ? order.amount + shippingPrice : 0

  const inputStyle = {
    width: '100%', padding: '14px 16px', border: '2px solid rgba(0,0,0,.08)',
    borderRadius: 12, fontFamily: sf, fontSize: 14, outline: 'none',
    background: '#FFF', transition: 'border-color .2s',
  }

  // ═══ LOADING ═══
  if (shopLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(0,0,0,.1)', borderTopColor: '#1A1A1A', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#999', fontSize: 14 }}>{L.loading}</p>
        </div>
      </div>
    )
  }

  // ═══ SHOP NOT FOUND ═══
  if (shopNotFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Boutique introuvable</h1>
          <p style={{ color: '#999', fontSize: 14 }}>Le lien que tu as suivi n'existe pas ou a été désactivé.</p>
        </div>
      </div>
    )
  }

  // ═══ PAYMENT SUCCESS ═══
  if (paymentSuccess) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf, padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ fontSize: 28 }}>✓</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{L.success}</h1>
          <a href={`/client`} style={{ display: 'inline-block', marginTop: 20, padding: '14px 28px', background: '#1A1A1A', color: '#FFF', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            {L.trackOrder}
          </a>
        </div>
      </div>
    )
  }

  // ═══ MAIN PAGE ═══
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: sf }}>
      {/* Language selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 0', background: '#FFF', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
        {['fr', 'en', 'es', 'de'].map(l => (
          <button key={l} onClick={() => setLang(l)}
            style={{ padding: '4px 12px', borderRadius: 20, border: 'none', fontFamily: sf, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: lang === l ? '#1A1A1A' : 'transparent', color: lang === l ? '#FFF' : '#999' }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 20px' }}>
        {/* Shop header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {shop.logo_url ? (
            <img src={shop.logo_url} alt={shop.name} style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', margin: '0 auto 10px', display: 'block' }} />
          ) : (
            <div style={{ width: 56, height: 56, background: '#1A1A1A', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <span style={{ color: '#FFF', fontSize: 18, fontWeight: 800 }}>{shop.name?.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>{shop.name}</h1>
          <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{L.title}</p>
        </div>

        {/* ═══ STEP 1: REFERENCE ═══ */}
        {!refValidated && (
          <div style={{ animation: 'fadeSlide .4s ease-out' }}>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '14px 18px', marginBottom: 20, textAlign: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#92400E' }}>{L.refHint}</span>
            </div>

            <label style={{ fontSize: 11, fontWeight: 600, color: '#999', letterSpacing: 1, display: 'block', marginBottom: 6 }}>{L.refLabel}</label>
            <input value={ref} onChange={e => { setRef(e.target.value); setRefError(false); }}
              placeholder={L.refPlaceholder}
              onKeyDown={e => { if (e.key === 'Enter') handleRefSubmit(); }}
              style={{ ...inputStyle, textAlign: 'center', letterSpacing: 2, fontSize: 18, fontWeight: 700, marginBottom: 14,
                borderColor: refError ? '#EF4444' : 'rgba(0,0,0,.08)' }} />

            {refError && (
              <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 14, textAlign: 'center' }}>{L.refError}</p>
            )}

            <button onClick={handleRefSubmit}
              style={{ width: '100%', padding: 16, background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {L.refButton}
            </button>

            <p style={{ fontSize: 12, color: '#CCC', textAlign: 'center', marginTop: 14 }}>{L.secure}</p>
          </div>
        )}

        {/* ═══ STEP 2: CHECKOUT ═══ */}
        {refValidated && order && (
          <form onSubmit={handlePay} style={{ animation: 'fadeSlide .5s ease-out' }}>
            {/* Ref badge */}
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '10px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>✓ Réf : {order.ref}</span>
              <button type="button" onClick={() => { setRefValidated(false); setOrder(null); setRef(''); }}
                style={{ fontSize: 12, color: '#10B981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: sf }}>
                {L.changeRef}
              </button>
            </div>

            {/* Amount */}
            <div style={{ background: '#FFF', border: '2px solid rgba(0,0,0,.06)', borderRadius: 16, padding: '18px 20px', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#999', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{L.amount}</div>
              <div style={{ fontSize: 36, fontWeight: 900 }}>{order.amount.toFixed(2)}€</div>
              {order.notes && <div style={{ fontSize: 13, color: '#777', marginTop: 4 }}>{order.notes}</div>}
            </div>

            {/* Client info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#999', display: 'block', marginBottom: 4 }}>{L.lastName}</label>
                <input required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#999', display: 'block', marginBottom: 4 }}>{L.firstName}</label>
                <input required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#999', display: 'block', marginBottom: 4 }}>{L.email}</label>
              <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#999', display: 'block', marginBottom: 4 }}>{L.phone}</label>
              <input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#999', display: 'block', marginBottom: 4 }}>{L.address}</label>
              <input required value={form.address} onChange={e => setForm({...form, address: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#999', display: 'block', marginBottom: 4 }}>{L.city}</label>
                <input required value={form.city} onChange={e => setForm({...form, city: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#999', display: 'block', marginBottom: 4 }}>{L.zip}</label>
                <input required value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} style={inputStyle} />
              </div>
            </div>

            {/* Shipping */}
            <div style={{ marginBottom: 16, marginTop: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#999', letterSpacing: 1, display: 'block', marginBottom: 8 }}>{L.shipping}</label>
              {freeShipping && (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '10px 14px', marginBottom: 10, textAlign: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>{L.freeShipping}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                {SHIPPING_OPTIONS.map(opt => (
                  <button type="button" key={opt.id} onClick={() => setSelectedShipping(opt.id)}
                    style={{
                      flex: 1, padding: '14px 12px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'center', transition: 'all .2s',
                      background: selectedShipping === opt.id ? '#1A1A1A' : '#F5F4F2',
                    }}>
                    <div style={{ fontFamily: sf, fontSize: 14, fontWeight: 700, color: selectedShipping === opt.id ? '#FFF' : '#1A1A1A' }}>{opt.name}</div>
                    <div style={{ fontFamily: sf, fontSize: 12, color: selectedShipping === opt.id ? 'rgba(255,255,255,.6)' : '#999', marginTop: 2 }}>
                      {freeShipping ? '0,00€' : `${opt.price.toFixed(2)}€`} · {opt.delay}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: '2px solid rgba(0,0,0,.06)', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{L.total}</span>
              <span style={{ fontSize: 16, fontWeight: 900 }}>{total.toFixed(2)}€</span>
            </div>

            {/* Pay button */}
            <button type="submit" disabled={paying}
              style={{ width: '100%', padding: 18, background: paying ? '#999' : '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: paying ? 'default' : 'pointer', transition: 'background .2s' }}>
              {paying ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                  {L.loading}
                </span>
              ) : (
                `${L.payButton} ${total.toFixed(2)}€`
              )}
            </button>

            <p style={{ fontSize: 12, color: '#CCC', textAlign: 'center', marginTop: 14 }}>{L.secure}</p>
          </form>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,.06)' }}>
          <p style={{ fontSize: 11, color: '#CCC' }}>Propulsé par MY LIVE PAIEMENT</p>
        </div>
      </div>
    </div>
  )
}
