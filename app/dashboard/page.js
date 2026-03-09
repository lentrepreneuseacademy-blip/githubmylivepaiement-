'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createBrowserSupabase } from '../../lib/supabase'

const sf = "'Outfit', sans-serif"
const ss = "'Cormorant Garamond', Georgia, serif"

// ═══ DEFAULT KEYWORDS ═══
const DEFAULT_KEYWORDS = [
  'je prends', 'jp', 'je prend', 'j achete',
  'je le prends', 'je la prends', 'je les prends',
  'je le veux', 'je la veux', 'je les veux',
  'pour moi', 'ajoutez', 'ajoute',
  'je commande', 'je reserve',
  'j en veux', 'j en prends',
]

// ═══ SOUND NOTIFICATION ═══
function playOrderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch (e) { /* silence */ }
}

// ═══ LIVE SERVER URL ═══
const LIVE_SERVER_URL = process.env.NEXT_PUBLIC_LIVE_SERVER_URL || ''

export default function Dashboard() {
  const supabase = createBrowserSupabase()

  // Auth
  const [user, setUser] = useState(null)
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [signupData, setSignupData] = useState({ email: '', password: '', shopName: '', slug: '' })

  // Navigation
  const [activeTab, setActiveTab] = useState('overview')

  // Data
  const [orders, setOrders] = useState([])
  const [clients, setClients] = useState([])
  const [stats, setStats] = useState({ revenue: 0, orderCount: 0, clientCount: 0, pendingShip: 0 })

  // Live Monitor
  const [livePlatform, setLivePlatform] = useState(null)
  const [liveUsername, setLiveUsername] = useState('')
  const [liveConnected, setLiveConnected] = useState(false)
  const [liveConnecting, setLiveConnecting] = useState(false)
  const [allComments, setAllComments] = useState([])
  const [liveOrders, setLiveOrders] = useState([])
  const [liveOrderCount, setLiveOrderCount] = useState(0)
  const [liveFilter, setLiveFilter] = useState('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const liveScrollRef = useRef(null)

  // Live Monitor — NEW states
  const [liveMode, setLiveMode] = useState(null) // 'real' | 'demo'
  const [liveError, setLiveError] = useState(null)
  const [liveViewers, setLiveViewers] = useState(0)
  const [liveSessionId, setLiveSessionId] = useState(null)
  const [liveEnded, setLiveEnded] = useState(null) // { reason, totalComments, duration }
  const [liveSoundEnabled, setLiveSoundEnabled] = useState(true)
  const socketRef = useRef(null)
  const demoIntervalRef = useRef(null)

  // Live Monitor — Keywords & Printing
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS)
  const [newKeyword, setNewKeyword] = useState('')
  const [showKeywordConfig, setShowKeywordConfig] = useState(false)
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false)
  const receiptWindowRef = useRef(null)
  const [showPaymentTracking, setShowPaymentTracking] = useState(false)

  // New order form
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [orderFilter, setOrderFilter] = useState('all')
  const [selectedClient, setSelectedClient] = useState(null)

  async function saveOrderEdit() {
    if (!editingOrder) return
    try {
      await fetch('/api/orders/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', orderId: editingOrder.id, fields: {
          reference: editingOrder.reference || '',
          client_first_name: editingOrder.client_first_name || '',
          client_last_name: editingOrder.client_last_name || '',
          client_email: editingOrder.client_email || '',
          client_phone: editingOrder.client_phone || '',
          shipping_address: editingOrder.shipping_address || '',
          shipping_zipcode: editingOrder.shipping_zipcode || '',
          shipping_city: editingOrder.shipping_city || '',
          total_amount: parseFloat(editingOrder.total_amount) || 0,
          description: editingOrder.description || '',
          status: editingOrder.status || 'pending',
          tracking_number: editingOrder.tracking_number || '',
        }})
      })
      setSelectedOrderDetail(editingOrder)
      setEditingOrder(null)
      loadData(shop.id)
    } catch(e) { console.error('Save error:', e) }
  }
  const [newOrder, setNewOrder] = useState({ reference: '', amount: '', description: '' })

  // Shipping / Boxtal
  const [shipSelectedOrder, setShipSelectedOrder] = useState(null)
  const [shipStep, setShipStep] = useState('list') // list | form | quotes | label
  const [shipForm, setShipForm] = useState({ weight: '0.5', length: '30', width: '20', height: '10', description: 'Vetements' })
  const [shipQuotes, setShipQuotes] = useState([])
  const [shipQuoteLoading, setShipQuoteLoading] = useState(false)
  const [shipSelectedQuote, setShipSelectedQuote] = useState(null)
  const [shipOrderLoading, setShipOrderLoading] = useState(false)
  const [shipLabel, setShipLabel] = useState(null)
  const [shipError, setShipError] = useState(null)
  const [shipTrackingNumber, setShipTrackingNumber] = useState(null)
  const [boxtalConfig, setBoxtalConfig] = useState({ user: '', pass: '', senderAddress: '', senderZip: '', senderCity: '', senderPhone: '', shippingPrice: '4.90', mrEnseigne: '', mrPrivateKey: '' })
  const [boxtalSaving, setBoxtalSaving] = useState(false)
  const [stripeStatus, setStripeStatus] = useState(null)
  const [stripeLoading, setStripeLoading] = useState(false)

  // Statistics
  const [statsData, setStatsData] = useState({ daily: [], monthly: [], topProducts: [], conversionRate: 0, avgOrderValue: 0, totalRevenue7d: 0, totalOrders7d: 0 })
  const [statsPeriod, setStatsPeriod] = useState('7d')

  // AI Assistant
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')

  // Generate predictive welcome message when assistant tab opens
  useEffect(function() {
    if (activeTab !== 'assistant' || aiMessages.length > 0) return
    var welcome = 'Hey ' + (shop ? shop.name : '') + ' ! 👋\n\n'
    var avg = stats.orderCount > 0 ? stats.revenue / stats.orderCount : 0
    var daysSince = orders.length > 0 ? Math.floor((Date.now() - new Date(orders[0].created_at).getTime()) / 86400000) : 999
    var newMsgs = messages.filter(function(m){return m.status==='new'}).length

    // ALERTS (urgent)
    if (stats.pendingShip > 0) welcome += '🔴 **' + stats.pendingShip + ' commande' + (stats.pendingShip > 1 ? 's' : '') + ' a expedier !**\n→ Va dans **Livraison** pour generer les etiquettes Mondial Relay\n\n'
    if (newMsgs > 0) welcome += '💬 **' + newMsgs + ' nouveau' + (newMsgs > 1 ? 'x' : '') + ' message' + (newMsgs > 1 ? 's' : '') + '** de client(e)s\n→ Va dans **Messages** pour repondre\n\n'
    if (!boxtalConfig.mrEnseigne) welcome += '⚠️ **Mondial Relay non configure** — tu ne peux pas generer d\'etiquettes\n→ Va dans **Parametres** et entre tes identifiants Mondial Relay\n\n'
    if (!boxtalConfig.senderAddress) welcome += '⚠️ **Adresse d\'expedition manquante** — remplis-la dans **Parametres**\n\n'

    // STATS
    if (stats.revenue > 0) {
      welcome += '📊 **Tes chiffres :**\n'
      welcome += '• CA total : ' + stats.revenue.toFixed(0) + '€ | Cette semaine : ' + (statsData.totalRevenue7d || 0).toFixed(0) + '€\n'
      welcome += '• ' + stats.orderCount + ' commandes | ' + clients.length + ' clientes | Panier moyen : ' + avg.toFixed(0) + '€\n\n'
    }

    // PREDICTIONS
    welcome += '💡 **Mes recommandations :**\n'
    if (daysSince > 3 && stats.orderCount > 0) welcome += '• Ca fait ' + daysSince + ' jour' + (daysSince > 1 ? 's' : '') + ' sans commande — planifie un live cette semaine !\n'
    if (avg > 0 && avg < 25) welcome += '• Panier moyen de ' + avg.toFixed(0) + '€ — propose des lots "2 articles = -15%" pour l\'augmenter\n'
    if (avg >= 25 && avg < 50) welcome += '• Panier moyen de ' + avg.toFixed(0) + '€ — offre la livraison a partir de ' + Math.ceil(avg * 1.5) + '€ pour booster\n'
    if (avg >= 50) welcome += '• Panier moyen de ' + avg.toFixed(0) + '€ — c\'est excellent ! Fidelise tes meilleures clientes avec des offres VIP\n'
    if (clients.length > 0 && clients.length < 10) welcome += '• ' + clients.length + ' clientes — partage ton lien de paiement dans ta bio TikTok/Insta pour en attirer plus\n'
    if (clients.length >= 10) welcome += '• ' + clients.length + ' clientes — envoie une promo par email a tes meilleures clientes !\n'
    if (stats.orderCount === 0) welcome += '• Pas encore de commandes ? Lance un live test avec le **Live Monitor** en mode demo !\n'
    welcome += '\n'

    welcome += 'Demande-moi ce que tu veux : comment utiliser une fonction, des idees pour tes lives, des conseils business, ou de l\'aide technique 🚀'
    setAiMessages([{ role: 'assistant', content: welcome }])
  }, [activeTab])
  const [aiLoading, setAiLoading] = useState(false)
  const aiScrollRef = useRef(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(function() {
    function checkMobile() {
      var mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setSidebarCollapsed(true)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return function() { window.removeEventListener('resize', checkMobile) }
  }, [])

  // Shop branding & legal
  const [shopLogo, setShopLogo] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [legalTexts, setLegalTexts] = useState({ cgv: '', mentions: '', privacy: '' })
  const [legalSaving, setLegalSaving] = useState(false)

  // Messages
  const [messages, setMessages] = useState([])
  const [messageReply, setMessageReply] = useState('')
  const [messageReplyId, setMessageReplyId] = useState(null)
  const [messageSending, setMessageSending] = useState(false)

  // ═══ AUTH CHECK ═══
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: shopData } = await supabase
          .from('shops')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (shopData) {
          setShop(shopData)
          loadData(shopData.id)
          // Load Boxtal config
          if (shopData.boxtal_config) {
            try { setBoxtalConfig(JSON.parse(shopData.boxtal_config)) } catch(e) {}
          }
          if (shopData.logo_url) setShopLogo(shopData.logo_url)
          if (shopData.legal_texts) {
            try { setLegalTexts(JSON.parse(shopData.legal_texts)) } catch(e) {}
          }
          loadMessages(shopData.id)
          // Check Stripe status
          try {
            var stripeRes = await fetch('/api/stripe-connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status', shopId: shopData.id }) })
            var stripeData = await stripeRes.json()
            setStripeStatus(stripeData)
          } catch(e) {}
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  // ═══ LOAD DATA ═══
  async function loadData(shopId) {
    // Load orders via API route (bypasse le RLS)
    let orderData = []
    try {
      const orderRes = await fetch('/api/orders/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_shop_orders', shop_id: shopId, limit: 200 })
      })
      const orderResult = await orderRes.json()
      orderData = orderResult.orders || []
    } catch (e) { console.error('[Dashboard] Erreur chargement commandes:', e) }

    if (orderData.length > 0) setOrders(orderData)

    // Load clients via API route (bypasse le RLS)
    // Generate clients from orders (more reliable than separate clients table)
    let clientData = []
    try {
      var clientMap = {}
      orderData.forEach(function(o) {
        if (!o.client_email) return
        var key = o.client_email.toLowerCase().trim()
        if (!clientMap[key]) {
          clientMap[key] = {
            id: key,
            first_name: o.client_first_name || '',
            last_name: o.client_last_name || '',
            email: o.client_email || '',
            phone: o.client_phone || '',
            city: o.shipping_city || '',
            order_count: 0,
            total_spent: 0,
            last_order: o.created_at,
          }
        }
        clientMap[key].order_count += 1
        clientMap[key].total_spent += (o.total_amount || o.amount || 0)
        if (o.created_at > clientMap[key].last_order) {
          clientMap[key].last_order = o.created_at
          clientMap[key].first_name = o.client_first_name || clientMap[key].first_name
          clientMap[key].last_name = o.client_last_name || clientMap[key].last_name
          clientMap[key].phone = o.client_phone || clientMap[key].phone
          clientMap[key].city = o.shipping_city || clientMap[key].city
        }
      })
      clientData = Object.values(clientMap).sort(function(a, b) { return b.order_count - a.order_count })
    } catch (e) { console.error('[Dashboard] Erreur generation clients:', e) }

    setClients(clientData)

    const paid = orderData?.filter(o => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') || []
    const pending = orderData?.filter(o => o.status === 'paid') || []
    setStats({
      revenue: paid.reduce((sum, o) => sum + (o.total_amount || o.total || o.amount || 0), 0),
      orderCount: paid.length,
      clientCount: clientData?.length || 0,
      pendingShip: pending.length,
    })

    // Compute stats data for charts
    loadStatsData(orderData || [])
  }

  function loadStatsData(orderList) {
    var now = new Date()
    var paid = orderList.filter(function(o) { return o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered' })
    var dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    var monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']

    // Daily stats (last 7 days)
    var daily = []
    for (var d = 6; d >= 0; d--) {
      var date = new Date(now)
      date.setDate(date.getDate() - d)
      var dayStr = date.toISOString().slice(0, 10)
      var dayOrders = paid.filter(function(o) { return o.created_at && o.created_at.slice(0, 10) === dayStr })
      var dayRev = dayOrders.reduce(function(s, o) { return s + (o.total_amount || o.total || o.amount || 0) }, 0)
      daily.push({ name: dayNames[date.getDay()], revenue: dayRev, orders: dayOrders.length })
    }

    // Monthly stats (last 6 months)
    var monthly = []
    for (var m = 5; m >= 0; m--) {
      var mDate = new Date(now.getFullYear(), now.getMonth() - m, 1)
      var mKey = mDate.getFullYear() + '-' + String(mDate.getMonth() + 1).padStart(2, '0')
      var mOrders = paid.filter(function(o) { return o.created_at && o.created_at.slice(0, 7) === mKey })
      var mRev = mOrders.reduce(function(s, o) { return s + (o.total_amount || o.total || o.amount || 0) }, 0)
      monthly.push({ name: monthNames[mDate.getMonth()], revenue: mRev, orders: mOrders.length })
    }

    // KPIs
    var rev7d = daily.reduce(function(s, d) { return s + d.revenue }, 0)
    var ord7d = daily.reduce(function(s, d) { return s + d.orders }, 0)
    var avgOrder = paid.length > 0 ? paid.reduce(function(s, o) { return s + (o.total_amount || o.total || o.amount || 0) }, 0) / paid.length : 0
    var totalComments = orderList.length
    var convRate = totalComments > 0 ? Math.round((paid.length / totalComments) * 100) : 0

    setStatsData({
      daily: daily,
      monthly: monthly,
      topProducts: [],
      conversionRate: convRate,
      avgOrderValue: avgOrder,
      totalRevenue7d: rev7d,
      totalOrders7d: ord7d,
    })
  }

  // ═══ AUTH HANDLERS ═══
  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail, password: loginPassword,
    })
    if (error) { setLoginError(error.message); return }
    setUser(data.user)
    const { data: shopData } = await supabase.from('shops').select('*').eq('user_id', data.user.id).single()
    if (shopData) { setShop(shopData); loadData(shopData.id) }
  }

  async function handleSignup(e) {
    e.preventDefault()
    setLoginError('')
    const { data, error } = await supabase.auth.signUp({
      email: signupData.email, password: signupData.password,
    })
    if (error) { setLoginError(error.message); return }

    const slug = signupData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    const { data: newShop, error: shopErr } = await supabase.from('shops').insert({
      user_id: data.user.id,
      name: signupData.shopName,
      slug,
      email: signupData.email,
    }).select().single()

    if (shopErr) { setLoginError(shopErr.message); return }
    setUser(data.user)
    setShop(newShop)
  }

  // ═══ CREATE ORDER ═══
  async function handleCreateOrder(e) {
    e.preventDefault()
    const ref = newOrder.reference.toUpperCase() || `${shop.slug.toUpperCase().slice(0, 4)}-${String(orders.length + 1).padStart(3, '0')}`
    try {
      const res = await fetch('/api/orders/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          order: {
            shop_id: shop.id,
            reference: ref,
            total_amount: parseFloat(newOrder.amount),
            amount: parseFloat(newOrder.amount),
            description: newOrder.description,
            status: 'pending_payment',
          }
        })
      })
      const result = await res.json()
      if (result.order) {
        setOrders([result.order, ...orders])
        setShowNewOrder(false)
        setNewOrder({ reference: '', amount: '', description: '' })
      }
    } catch (err) { console.error('[Dashboard] Erreur création commande:', err) }
  }

  // ═══════════════════════════════════════════════
  // BOXTAL SHIPPING
  // ═══════════════════════════════════════════════
  async function saveBoxtalConfig() {
    setBoxtalSaving(true)
    try {
      await fetch('/api/orders/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_shop', shopId: shop.id, fields: { boxtal_config: JSON.stringify(boxtalConfig) } })
      })
    } catch (e) { console.error('[Dashboard] Erreur sauvegarde Boxtal:', e) }
    setBoxtalSaving(false)
  }

  async function uploadLogo(e) {
    var file = e.target.files[0]
    if (!file || !shop) return
    setLogoUploading(true)
    var ext = file.name.split('.').pop()
    var path = shop.id + '/logo.' + ext
    var { error } = await supabase.storage.from('shop-assets').upload(path, file, { upsert: true })
    if (!error) {
      var { data: urlData } = supabase.storage.from('shop-assets').getPublicUrl(path)
      var url = urlData.publicUrl + '?t=' + Date.now()
      await fetch('/api/orders/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_shop', shopId: shop.id, fields: { logo_url: url } })
      })
      setShopLogo(url)
    }
    setLogoUploading(false)
  }

  async function saveLegalTexts() {
    setLegalSaving(true)
    await fetch('/api/orders/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_shop', shopId: shop.id, fields: { legal_texts: JSON.stringify(legalTexts) } })
    })
    setLegalSaving(false)
  }

  async function loadMessages(shopId) {
    try {
      var res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list', shopId: shopId }) })
      var data = await res.json()
      if (data.messages) setMessages(data.messages)
    } catch(e) { console.error('[Messages] Load error:', e) }
  }

  async function sendMessageReply(msgId) {
    if (!messageReply.trim()) return
    setMessageSending(true)
    try {
      await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reply', messageId: msgId, reply: messageReply, shopName: shop ? shop.name : 'La boutique' }) })
      setMessageReply('')
      setMessageReplyId(null)
      loadMessages(shop.id)
    } catch(e) { console.error('[Messages] Reply error:', e) }
    setMessageSending(false)
  }

  async function getShippingQuotes(order) {
    if (!boxtalConfig.user || !boxtalConfig.pass) {
      setShipError('Configure d\'abord tes identifiants Mondial Relay dans Parametres.')
      return
    }
    setShipQuoteLoading(true)
    setShipError(null)
    setShipQuotes([])
    try {
      var res = await fetch('/api/boxtal/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxtal: boxtalConfig,
          recipient: {
            firstname: order.client_first_name || order.description || 'Client',
            lastname: order.client_last_name || '',
            address: order.shipping_address || '',
            zipcode: order.shipping_zipcode || order.shipping_zip || '',
            city: order.shipping_city || '',
            country: 'FR',
            phone: order.client_phone || '',
            email: order.client_email || '',
          },
          parcel: {
            weight: parseFloat(shipForm.weight) || 0.5,
            length: parseInt(shipForm.length) || 30,
            width: parseInt(shipForm.width) || 20,
            height: parseInt(shipForm.height) || 10,
            description: shipForm.description || 'Vetements',
            value: order.total_amount || order.total || order.amount || 0,
          }
        })
      })
      var data = await res.json()
      if (data.quotes && data.quotes.length > 0) {
        setShipQuotes(data.quotes)
        setShipError(null)
      } else if (data.error) {
        setShipError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
      } else {
        setShipError('Aucune offre Mondial Relay disponible pour cette destination.')
      }
    } catch (err) {
      setShipError('Erreur de connexion a Mondial Relay')
    }
    setShipQuoteLoading(false)
  }

  async function createShipment(order, quote) {
    setShipOrderLoading(true)
    setShipError(null)
    try {
      var res = await fetch('/api/boxtal/ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxtal: boxtalConfig,
          shopName: shop ? shop.name : 'Ma Boutique',
          shopEmail: user ? user.email : '',
          recipient: {
            firstname: order.client_first_name || order.description || 'Client',
            lastname: order.client_last_name || '',
            address: order.shipping_address || '',
            zipcode: order.shipping_zipcode || order.shipping_zip || '',
            city: order.shipping_city || '',
            country: 'FR',
            phone: order.client_phone || '',
            email: order.client_email || '',
          },
          parcel: {
            weight: parseFloat(shipForm.weight) || 0.5,
            length: parseInt(shipForm.length) || 30,
            width: parseInt(shipForm.width) || 20,
            height: parseInt(shipForm.height) || 10,
            description: shipForm.description || 'Vetements',
            value: order.total_amount || order.total || order.amount || 0,
          },
          carrier: {
            operator: quote.operator_code,
            service: quote.service_code,
          },
          relayPoint: (function() { try { return shipSelectedOrder.relay_point ? JSON.parse(shipSelectedOrder.relay_point) : null } catch(e) { return null } })(),
          reference: order.reference || order.id,
        })
      })
      var data = await res.json()
      if (data.error) {
        setShipError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
      } else {
        setShipLabel(data.label_url || null)
        setShipTrackingNumber(data.tracking || data.reference || null)
        await fetch('/api/orders/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_status',
            orderId: order.id,
            fields: {
              status: 'shipped',
              shipped_at: new Date().toISOString(),
              tracking_number: data.tracking || data.reference || '',
              shipping_carrier: quote.operator_label + ' - ' + quote.service_label,
              shipping_label_url: data.label_url || '',
            }
          })
        })
        loadData(shop.id)
        setShipStep('label')
      }
    } catch (err) {
      setShipError('Erreur lors de la creation de l\'envoi')
    }
    setShipOrderLoading(false)
  }

  async function generateLabel(order) {
    setShipError(null)
    setShipOrderLoading(true)
    var relay = null
    try { if (order.relay_point) relay = JSON.parse(order.relay_point) } catch(e) {}
    var shopName = shop ? shop.name : 'Ma Boutique'
    var ref = order.reference || order.ref || order.id || ''
    var relayCode = relay ? (relay.code || '').replace(/^MONR-/, '') : ''

    // Try Mondial Relay API first
    if (boxtalConfig.mrEnseigne && boxtalConfig.mrPrivateKey) {
      try {
        var res = await fetch('/api/mondialrelay/ship', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enseigne: boxtalConfig.mrEnseigne,
            privateKey: boxtalConfig.mrPrivateKey,
            sender: {
              name: shopName,
              address: boxtalConfig.senderAddress || '',
              zipcode: boxtalConfig.senderZip || '',
              city: boxtalConfig.senderCity || '',
              phone: boxtalConfig.senderPhone || '',
              email: user ? user.email : '',
            },
            recipient: {
              firstname: order.client_first_name || 'Client',
              lastname: order.client_last_name || '',
              address: order.shipping_address || '',
              zipcode: order.shipping_zipcode || '',
              city: order.shipping_city || '',
              phone: order.client_phone || '',
              email: order.client_email || '',
            },
            parcel: {
              weight: parseFloat(shipForm.weight) || 0.5,
            },
            relayCode: relayCode,
            reference: ref,
          })
        })
        var data = await res.json()
        if (data.success && data.label_url) {
          // Open the real Mondial Relay PDF label
          window.open(data.label_url, '_blank')
          setShipTrackingNumber(data.expeditionNum || data.tracking || null)
          // Mark as shipped
          await fetch('/api/orders/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_status', orderId: order.id, fields: { status: 'shipped', shipped_at: new Date().toISOString(), tracking_number: data.expeditionNum || '', shipping_carrier: 'Mondial Relay' } })
          })
          loadData(shop.id)
          setShipStep('label')
          setShipOrderLoading(false)
          return
        } else {
          console.error('[MR] API error:', data.error)
          setShipError(data.error || 'Erreur Mondial Relay')
          setShipOrderLoading(false)
          return
        }
      } catch(err) {
        console.error('[MR] Connection error:', err)
        setShipError('Erreur de connexion a Mondial Relay')
        setShipOrderLoading(false)
        return
      }
    }

    // Fallback: generate local printable label
    setShipOrderLoading(false)
    var senderAddr = boxtalConfig.senderAddress || ''
    var senderZip = boxtalConfig.senderZip || ''
    var senderCity = boxtalConfig.senderCity || ''
    var senderPhone = boxtalConfig.senderPhone || ''
    var dateStr = new Date().toLocaleDateString('fr-FR')

    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiquette ' + ref + '</title><style>'
    html += 'body{margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    html += '.label{width:100mm;border:2px solid #000;padding:0;margin:0 auto}'
    html += '.header{background:#1A1A2E;color:#FFF;padding:10px 14px;display:flex;justify-content:space-between;align-items:center}'
    html += '.mondial{background:#E30613;color:#FFF;padding:8px 14px;font-size:12px;font-weight:700;text-align:center}'
    html += '.section{padding:10px 14px;border-bottom:1px dashed #CCC}'
    html += '.section-title{font-size:8px;color:#999;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;font-weight:700}'
    html += '.section-name{font-size:14px;font-weight:700;margin-bottom:2px}'
    html += '.section-detail{font-size:11px;color:#444;line-height:1.5}'
    html += '.relay{background:#F0F0FF;padding:10px 14px;border-bottom:1px dashed #CCC}'
    html += '.ref-bar{padding:12px 14px;text-align:center;border-bottom:1px dashed #CCC}'
    html += '.ref-code{font-size:24px;font-weight:900;letter-spacing:4px;color:#1A1A2E}'
    html += '.footer{padding:8px 14px;display:flex;justify-content:space-between;font-size:9px;color:#999}'
    html += '@media print{body{padding:0}.no-print{display:none !important}}'
    html += '</style></head><body>'
    html += '<div class="no-print" style="text-align:center;margin-bottom:20px;background:#FFF7ED;padding:16px;border-radius:10px;border:1px solid #FED7AA">'
    html += '<p style="color:#92400E;font-size:13px;margin:0 0 10px">⚠️ Etiquette interne — configure tes identifiants Mondial Relay dans Parametres pour generer les vraies etiquettes avec code-barres et suivi.</p>'
    html += '<button onclick="window.print()" style="padding:14px 40px;background:#1A1A2E;color:#FFF;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer">🖨️ Imprimer</button>'
    html += '</div>'
    html += '<div class="label">'
    html += '<div class="header"><div style="font-size:14px;font-weight:800">📦 COLIS</div><div style="font-size:10px;text-align:right">' + dateStr + '<br>Mondial Relay</div></div>'
    html += '<div class="mondial">MONDIAL RELAY — POINT RELAIS</div>'
    html += '<div class="section"><div class="section-title">Expediteur</div><div class="section-name">' + shopName + '</div><div class="section-detail">' + senderAddr + '<br>' + senderZip + ' ' + senderCity + '<br>Tel: ' + senderPhone + '</div></div>'
    html += '<div class="section"><div class="section-title">Destinataire</div><div class="section-name">' + (order.client_first_name || '') + ' ' + (order.client_last_name || '') + '</div><div class="section-detail">' + (order.shipping_address || '') + '<br>' + (order.shipping_zipcode || '') + ' ' + (order.shipping_city || '') + '<br>Tel: ' + (order.client_phone || '') + '</div></div>'
    if (relay) { html += '<div class="relay"><div style="font-size:9px;color:#6366F1;font-weight:700;margin-bottom:4px">📍 POINT RELAIS</div><div style="font-size:13px;font-weight:700">' + (relay.name || '') + '</div><div style="font-size:11px;color:#555">' + (relay.address || '') + ', ' + (relay.zipcode || '') + ' ' + (relay.city || '') + '</div></div>' }
    html += '<div class="ref-bar"><div style="font-size:9px;color:#999;margin-bottom:4px">REFERENCE</div><div class="ref-code">' + ref + '</div></div>'
    html += '<div class="footer"><span>MY LIVE PAIEMENT</span><span>' + ref + '</span></div>'
    html += '</div></body></html>'
    var w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    fetch('/api/orders/upsert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_status', orderId: order.id, fields: { status: 'shipped', shipped_at: new Date().toISOString() } }) }).then(function() { loadData(shop.id) })
    setShipStep('label')
  }

  function startShipping(order) {
    setShipSelectedOrder(order)
    setShipStep('form')
    setShipError(null)
    setShipQuotes([])
    setShipSelectedQuote(null)
    setShipLabel(null)
    setShipTrackingNumber(null)
  }

  // ═══════════════════════════════════════════════
  // LIVE MONITOR — KEYWORD DETECTION (dynamic)
  // ═══════════════════════════════════════════════
  function isPurchaseIntent(text) {
    var clean = text.toLowerCase().replace(/[,;!?.()]/g, " ").replace(/  +/g, " ")
    clean = " " + clean + " "
    return keywords.some(function(k) {
      return clean.indexOf(" " + k.toLowerCase() + " ") !== -1
    })
  }

  function addKeyword(kw) {
    const clean = kw.trim().toLowerCase()
    if (clean && !keywords.includes(clean)) {
      setKeywords(prev => [...prev, clean])
    }
    setNewKeyword('')
  }

  function removeKeyword(kw) {
    setKeywords(prev => prev.filter(k => k !== kw))
  }

  // ═══════════════════════════════════════════════
  // LIVE MONITOR — RECEIPT WINDOW (auto-print)
  // ═══════════════════════════════════════════════
  function openReceiptWindow() {
    if (receiptWindowRef.current && !receiptWindowRef.current.closed) {
      receiptWindowRef.current.focus()
      return
    }
    var w = window.open('', 'tickets', 'width=420,height=700,scrollbars=yes')
    receiptWindowRef.current = w
    var sn = ((shop && shop.name) || 'MA BOUTIQUE').toUpperCase()
    var pl = livePlatform === 'tiktok' ? 'TikTok' : 'Instagram'
    var un = liveUsername || 'live'
    var h = '<!DOCTYPE html><html><head>'
    h += '<title>Tickets - ' + sn + '</title>'
    h += '<style>'
    h += '* {margin:0;padding:0;box-sizing:border-box}'
    h += 'body {font-family:Arial,sans-serif;background:#f5f4f2;padding:16px}'
    h += '.header {text-align:center;padding:12px 0 16px;border-bottom:2px solid #1a1a1a;margin-bottom:16px}'
    h += '.header h1 {font-size:14px;letter-spacing:2px}'
    h += '.header p {font-size:11px;color:#999;margin-top:2px}'
    h += '#tickets {display:flex;flex-direction:column;gap:12px}'
    h += '.ticket {background:#fff;border:2px solid #1a1a1a;border-radius:12px;padding:12px;text-align:center}'
    h += '.ticket-shop {font-size:8px;letter-spacing:1px;color:#999;margin-bottom:4px}'
    h += '.ticket-num {font-size:28px;font-weight:900;margin-bottom:4px}'
    h += '.ticket-user {font-size:14px;font-weight:700;color:#333;margin-bottom:6px}'
    h += '.ticket-text {font-size:12px;color:#666;padding-top:6px;border-top:1px dashed #ddd;line-height:1.3;word-wrap:break-word}'
    h += '.ticket-time {font-size:9px;color:#bbb;margin-top:4px}'
    h += '.ticket-platform {font-size:8px;color:#ccc;margin-top:2px}'
    h += '.empty {text-align:center;color:#ccc;padding:40px 0;font-size:14px}'
    h += '@media print {'
    h += '  @page {size:50.8mm 50.8mm;margin:0}'
    h += '  body {background:#fff;padding:0;margin:0}'
    h += '  .header {display:none}'
    h += '  #tickets {gap:0}'
    h += '  .ticket {width:50.8mm;height:50.8mm;border:none;border-radius:0;padding:2mm;display:flex;flex-direction:column;justify-content:center;align-items:center;page-break-after:always;margin:0;text-align:center;overflow:hidden}'
    h += '  .ticket-shop {font-size:5pt;margin-bottom:1mm}'
    h += '  .ticket-num {font-size:24pt;margin-bottom:1mm}'
    h += '  .ticket-user {font-size:9pt;margin-bottom:1.5mm}'
    h += '  .ticket-text {font-size:6pt;border-top:0.5pt dashed #999;padding-top:1.5mm;line-height:1.2;max-height:10mm;overflow:hidden}'
    h += '  .ticket-time {font-size:5pt;margin-top:1mm}'
    h += '  .ticket-platform {font-size:4pt;margin-top:0.5mm}'
    h += '}'
    h += '</style></head><body>'
    h += '<div class="header"><h1>' + sn + '</h1>'
    h += '<p>Live ' + pl + ' - @' + un + '</p></div>'
    h += '<div id="tickets"><div class="empty">En attente de commandes...</div></div>'
    h += '</body></html>'
    w.document.write(h)
    w.document.close()
  }

  function addTicketToReceiptWindow(order) {
    const w = receiptWindowRef.current
    if (!w || w.closed) return

    const container = w.document.getElementById('tickets')
    if (!container) return

    // Supprimer le message "en attente" s'il existe
    const empty = container.querySelector('.empty')
    if (empty) empty.remove()

    const ticket = w.document.createElement('div')
    ticket.className = 'ticket'
    var h = ''
    h += '<div class="ticket-shop">' + ((shop && shop.name) || 'MA BOUTIQUE').toUpperCase() + '</div>'
    h += '<div class="ticket-num">#' + order.orderNum + '</div>'
    h += '<div class="ticket-user">@' + order.user + '</div>'
    h += '<div class="ticket-text">' + order.text + '</div>'
    h += '<div class="ticket-time">' + order.time + '</div>'
    h += '<div class="ticket-platform">Live ' + (livePlatform === 'tiktok' ? 'TikTok' : 'Instagram') + '</div>'
    ticket.innerHTML = h
    container.appendChild(ticket)

    // Scroll en bas
    w.scrollTo(0, w.document.body.scrollHeight)

    // Auto-print si activé
    if (autoPrintEnabled) {
      setTimeout(() => { try { w.print() } catch(e) {} }, 300)
    }
  }

  // ═══════════════════════════════════════════════
  // LIVE MONITOR — PROCESS COMMENT (shared logic)
  // ═══════════════════════════════════════════════
  const processComment = useCallback((commentData) => {
    const purchase = isPurchaseIntent(commentData.text)
    const comment = {
      id: commentData.id || Date.now() + Math.random(),
      user: commentData.username,
      text: commentData.text,
      isPurchase: purchase,
      profilePic: commentData.profilePic || null,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }

    if (purchase) {
      if (liveSoundEnabled) playOrderSound()

      setLiveOrderCount(prev => {
        const num = prev + 1
        comment.orderNum = String(num).padStart(3, '0')
        setLiveOrders(prev => [...prev, comment])

        // Envoyer le ticket à la fenêtre d'impression
        addTicketToReceiptWindow(comment)

        // Auto-create order in DB
        if (shop) {
          const ref = `${shop.slug.toUpperCase().slice(0, 4)}-${String(num).padStart(3, '0')}`
          fetch('/api/orders/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create',
              order: {
                shop_id: shop.id,
                reference: ref,
                total_amount: 0,
                amount: 0,
                description: `Live: @${commentData.username} — "${commentData.text}"`,
                status: 'pending_payment',
                source: 'live_monitor',
              }
            })
          })
        }
        return num
      })
    }

    setAllComments(prev => [...prev, comment])

    // Update live session comment count in DB
    if (liveSessionId) {
      supabase.from('live_sessions')
        .update({ comment_count: allComments.length + 1 })
        .eq('id', liveSessionId)
        .then(() => {})
    }
  }, [shop, liveSoundEnabled, liveSessionId, keywords, autoPrintEnabled])

  // ═══════════════════════════════════════════════
  // LIVE MONITOR — PRINT ORDERS
  // ═══════════════════════════════════════════════
  function printLiveOrders() {
    var pw = window.open('', '_blank')
    var sn = (shop && shop.name) || 'Ma boutique'
    var pl = livePlatform === 'tiktok' ? 'TikTok' : 'Instagram'
    var un = liveUsername || 'live'
    var h = '<!DOCTYPE html><html><head>'
    h += '<title>Tickets - ' + sn + '</title>'
    h += '<style>'
    h += '* {margin:0;padding:0;box-sizing:border-box}'
    h += 'body {font-family:Arial,sans-serif;background:#fff;padding:0;margin:0}'
    h += '.ticket {width:50.8mm;height:50.8mm;padding:2mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;overflow:hidden;page-break-after:always}'
    h += '.ticket-shop {font-size:5pt;letter-spacing:1px;color:#999;margin-bottom:1mm}'
    h += '.ticket-num {font-size:24pt;font-weight:900;margin-bottom:1mm}'
    h += '.ticket-user {font-size:9pt;font-weight:700;color:#333;margin-bottom:1.5mm}'
    h += '.ticket-text {font-size:6pt;color:#555;border-top:0.5pt dashed #999;padding-top:1.5mm;line-height:1.2;max-height:10mm;overflow:hidden;word-wrap:break-word}'
    h += '.ticket-time {font-size:5pt;color:#999;margin-top:1mm}'
    h += '.ticket-platform {font-size:4pt;color:#bbb;margin-top:0.5mm}'
    h += '.no-print {text-align:center;padding:20px}'
    h += '@media print { @page {size:50.8mm 50.8mm;margin:0} .no-print {display:none !important} }'
    h += '</style></head><body>'
    for (var j = 0; j < liveOrders.length; j++) {
      var o = liveOrders[j]
      h += '<div class="ticket">'
      h += '<div class="ticket-shop">' + sn.toUpperCase() + '</div>'
      h += '<div class="ticket-num">#' + o.orderNum + '</div>'
      h += '<div class="ticket-user">@' + o.user + '</div>'
      h += '<div class="ticket-text">' + o.text + '</div>'
      h += '<div class="ticket-time">' + o.time + '</div>'
      h += '<div class="ticket-platform">Live ' + pl + ' - @' + un + '</div>'
      h += '</div>'
    }
    h += '<div class="no-print"><p style="margin-bottom:10px;font-size:14px;color:#666">' + liveOrders.length + ' tickets</p>'
    h += '<button onclick="window.print()" style="padding:14px 40px;background:#1a1a1a;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.12)">Imprimer tous les tickets</button></div>'
    h += '</body></html>'
    pw.document.write(h)
    pw.document.close()
  }

  // ═══════════════════════════════════════════════
  // LIVE MONITOR — REAL CONNECTION (WebSocket)
  // ═══════════════════════════════════════════════
  async function startLiveReal() {
    if (!LIVE_SERVER_URL) {
      setLiveError('Le serveur Live n\'est pas configuré. Ajoute NEXT_PUBLIC_LIVE_SERVER_URL dans tes variables d\'environnement, ou utilise le mode démo.')
      return
    }

    setLiveConnecting(true)
    setLiveError(null)
    setLiveEnded(null)

    try {
      // Dynamic import socket.io-client (évite le chargement si pas utilisé)
      const { io } = await import('socket.io-client')

      const socket = io(LIVE_SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 15000,
      })

      socketRef.current = socket

      // ─── Connection events ───
      socket.on('connect', () => {
        console.log('[Live] Connecté au serveur live')
        socket.emit('start-live', {
          platform: livePlatform,
          username: liveUsername,
          shopId: shop?.id,
        })
      })

      socket.on('connect_error', (err) => {
        console.error('[Live] Erreur de connexion au serveur:', err.message)
        setLiveConnecting(false)
        setLiveError(`Impossible de joindre le serveur Live. Vérifie que le serveur est démarré sur ${LIVE_SERVER_URL}`)
        cleanupSocket()
      })

      // ─── Live status ───
      socket.on('live-status', async ({ connected, platform, username, viewers, title, reason }) => {
        setLiveConnecting(false)
        setLiveConnected(connected)

        if (connected) {
          setLiveMode('real')
          setLiveViewers(viewers || 0)

          // Créer une session live en DB
          if (shop) {
            const { data: session } = await supabase.from('live_sessions').insert({
              shop_id: shop.id,
              platform: livePlatform,
              username: liveUsername,
              status: 'active',
            }).select().single()
            if (session) setLiveSessionId(session.id)
          }
        } else if (reason) {
          setLiveError(reason)
        }
      })

      // ─── Live error ───
      socket.on('live-error', ({ code, message }) => {
        console.error('[Live] Erreur:', code, message)
        setLiveConnecting(false)
        setLiveError(message)
        cleanupSocket()
      })

      // ─── New comment ───
      socket.on('new-comment', (data) => {
        processComment({
          id: data.id,
          username: data.username,
          text: data.text,
          profilePic: data.profilePic,
        })
      })

      // ─── Viewer count ───
      socket.on('viewer-count', ({ viewers }) => {
        setLiveViewers(viewers)
      })

      // ─── Gifts ───
      socket.on('new-gift', (data) => {
        // Afficher les cadeaux comme des commentaires spéciaux
        setAllComments(prev => [...prev, {
          id: Date.now() + Math.random(),
          user: data.username,
          text: `🎁 ${data.giftName} x${data.repeatCount}`,
          isPurchase: false,
          isGift: true,
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }])
      })

      // ─── Live ended ───
      socket.on('live-ended', async ({ reason, totalComments, duration }) => {
        setLiveEnded({ reason, totalComments, duration })
        setLiveConnected(false)

        // Update session en DB
        if (liveSessionId) {
          await supabase.from('live_sessions').update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            order_count: liveOrderCount,
            comment_count: allComments.length,
          }).eq('id', liveSessionId)
        }

        cleanupSocket()
      })

    } catch (err) {
      console.error('[Live] Import error:', err)
      setLiveConnecting(false)
      setLiveError('Erreur lors du chargement du module de connexion. Vérifie que socket.io-client est installé.')
    }
  }

  function cleanupSocket() {
    if (socketRef.current) {
      socketRef.current.emit('stop-live')
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }

  // ═══════════════════════════════════════════════
  // LIVE MONITOR — DEMO MODE (fake comments)
  // ═══════════════════════════════════════════════
  const DEMO_COMMENTS = [
    { user: "sarah_beauty", text: "Waouh c'est magnifique !" },
    { user: "glam_lashes", text: "Je prends le 2 en noir taille M" },
    { user: "fashion_75", text: "Trop beau le packaging 😍" },
    { user: "nails_lina", text: "Moi le rouge à lèvres nude" },
    { user: "skincare_addict", text: "C'est quoi la compo ?" },
    { user: "beauty_mum", text: "J'achète le coffret pour ma fille" },
    { user: "zoe_shop", text: "Superbe qualité ❤️" },
    { user: "glam_queen", text: "Je prends le 5 et le 7 svp" },
    { user: "makeup_daily", text: "Combien de temps ça tient ?" },
    { user: "lashes_paris", text: "Moi la palette dorée" },
    { user: "beauty_box_33", text: "C'est du vrai cuir ?" },
    { user: "nora_fit", text: "Je le veux en rose gold !" },
    { user: "lina_cosmetics", text: "Pour moi le coffret découverte svp" },
    { user: "style_queen_92", text: "Magnifique je recommande 💯" },
    { user: "sarah_beauty", text: "J'en prends un deuxième pour ma sœur" },
  ]

  function startLiveDemo() {
    setLiveConnecting(true)
    setLiveError(null)
    setLiveEnded(null)

    setTimeout(async () => {
      setLiveConnecting(false)
      setLiveConnected(true)
      setLiveMode('demo')
      setLiveViewers(Math.floor(Math.random() * 50) + 20)

      // Créer une session live en DB
      if (shop) {
        const { data: session } = await supabase.from('live_sessions').insert({
          shop_id: shop.id,
          platform: livePlatform || 'tiktok',
          username: liveUsername || 'demo',
          status: 'active',
        }).select().single()
        if (session) setLiveSessionId(session.id)
      }

      let i = 0
      demoIntervalRef.current = setInterval(() => {
        if (i >= DEMO_COMMENTS.length) { i = 0 }
        const c = DEMO_COMMENTS[i]
        processComment({
          id: Date.now() + i,
          username: c.user,
          text: c.text,
        })

        // Simuler des viewers qui changent
        setLiveViewers(prev => prev + Math.floor(Math.random() * 5) - 2)

        i++
      }, Math.random() * 2000 + 1500)
    }, 2000)
  }

  // ═══ STOP LIVE (both modes) ═══
  async function stopLive() {
    // Cleanup connections
    cleanupSocket()
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current)
      demoIntervalRef.current = null
    }

    // Update session en DB
    if (liveSessionId) {
      await supabase.from('live_sessions').update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        order_count: liveOrderCount,
        comment_count: allComments.length,
      }).eq('id', liveSessionId)
    }

    // Reset state
    setLiveConnected(false)
    setLiveMode(null)
    setLiveSessionId(null)
  }

  // ═══ FULL RESET ═══
  function resetLive() {
    stopLive()
    setLivePlatform(null)
    setLiveUsername('')
    setAllComments([])
    setLiveOrders([])
    setLiveOrderCount(0)
    setLiveViewers(0)
    setLiveError(null)
    setLiveEnded(null)
    setLiveFilter('all')
    setAutoPrintEnabled(false)
    // Ne pas fermer la fenêtre de tickets (l'utilisateur peut encore vouloir imprimer)
  }

  // ═══ START LIVE (dispatch) ═══
  function handleStartLive() {
    if (liveMode === 'demo' || !LIVE_SERVER_URL) {
      startLiveDemo()
    } else {
      startLiveReal()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSocket()
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current)
    }
  }, [])

  // Auto-scroll live feed
  useEffect(() => {
    if (autoScroll && liveScrollRef.current) {
      liveScrollRef.current.scrollTop = liveScrollRef.current.scrollHeight
    }
  }, [allComments, autoScroll])

  // ═══ COMPUTE STATISTICS ═══
  useEffect(() => {
    if (orders.length === 0) return
    var now = new Date()
    var d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    var d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Daily revenue for last 7 days
    var daily = []
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      var dayStr = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
      var dayOrders = orders.filter(function(o) {
        var od = new Date(o.created_at)
        return od.toDateString() === d.toDateString()
      })
      var rev = dayOrders.reduce(function(sum, o) { return sum + (o.total_amount || o.total || o.amount || 0) }, 0)
      daily.push({ name: dayStr, revenue: Math.round(rev * 100) / 100, orders: dayOrders.length })
    }
    
    // Monthly data
    var monthly = []
    for (var m = 5; m >= 0; m--) {
      var md = new Date(now.getFullYear(), now.getMonth() - m, 1)
      var monthStr = md.toLocaleDateString('fr-FR', { month: 'short' })
      var mOrders = orders.filter(function(o) {
        var od = new Date(o.created_at)
        return od.getMonth() === md.getMonth() && od.getFullYear() === md.getFullYear()
      })
      var mRev = mOrders.reduce(function(sum, o) { return sum + (o.total_amount || o.total || o.amount || 0) }, 0)
      monthly.push({ name: monthStr, revenue: Math.round(mRev * 100) / 100, orders: mOrders.length })
    }
    
    var recent = orders.filter(function(o) { return new Date(o.created_at) >= d7 })
    var rev7 = recent.reduce(function(sum, o) { return sum + (o.total_amount || o.total || o.amount || 0) }, 0)
    var avg = recent.length > 0 ? rev7 / recent.length : 0
    var paid = orders.filter(function(o) { return o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered' }).length
    var conv = orders.length > 0 ? Math.round((paid / orders.length) * 100) : 0
    
    setStatsData({ daily: daily, monthly: monthly, topProducts: [], conversionRate: conv, avgOrderValue: Math.round(avg * 100) / 100, totalRevenue7d: Math.round(rev7 * 100) / 100, totalOrders7d: recent.length })
  }, [orders])

  // ═══ AI ASSISTANT (LOCAL + CONTEXT) ═══
  function sendAiMessage() {
    if (!aiInput.trim() || aiLoading) return
    var userMsg = aiInput.trim()
    setAiInput('')
    setAiMessages(function(prev) { return prev.concat([{ role: 'user', content: userMsg }]) })
    setAiLoading(true)
    setTimeout(function() {
      var reply = localAiReply(userMsg)
      setAiMessages(function(prev) { return prev.concat([{ role: 'assistant', content: reply }]) })
      setAiLoading(false)
    }, 300 + Math.random() * 400)
  }

  function localAiReply(msg) {
    var q = msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    var sn = shop ? shop.name : 'ta boutique'
    var rev = stats.revenue || 0
    var oc = stats.orderCount || 0
    var cc = clients.length || 0
    var pe = stats.pendingShip || 0
    var avg = oc > 0 ? (rev / oc) : 0
    var r7 = statsData.totalRevenue7d || 0
    var o7 = statsData.totalOrders7d || 0
    var paid = orders.filter(function(o){return o.status==='paid'}).length
    var shipped = orders.filter(function(o){return o.status==='shipped'}).length
    var delivered = orders.filter(function(o){return o.status==='delivered'}).length
    var pending = orders.filter(function(o){return o.status==='pending_payment'}).length
    var newMsg = messages.filter(function(m){return m.status==='new'}).length
    var lastOrderDate = orders.length > 0 ? new Date(orders[0].created_at).toLocaleDateString('fr-FR') : null
    var daysSince = orders.length > 0 ? Math.floor((Date.now() - new Date(orders[0].created_at).getTime()) / 86400000) : 999
    var mrOk = !!(boxtalConfig.mrEnseigne && boxtalConfig.mrPrivateKey)
    var addrOk = !!(boxtalConfig.senderAddress && boxtalConfig.senderZip)
    var topC = clients.slice(0,3).map(function(c){return (c.first_name||'')+' '+(c.last_name||'')+' ('+c.order_count+' cmd, '+(c.total_spent||0).toFixed(0)+'€)'}).join(', ')
    var slug = shop && shop.slug ? shop.slug : 'ta-boutique'

    if (q.match(/quoi de neuf|resume|bilan|situation|comment ca va|etat|overview/)) {
      var r = '📊 Bilan ' + sn + ' :\n\n💰 CA total : ' + rev.toFixed(2) + '€ | semaine : ' + r7.toFixed(0) + '€\n📦 ' + oc + ' commandes | 👥 ' + cc + ' clients | 🛒 panier moyen : ' + avg.toFixed(0) + '€\n\n'
      if (pe > 0) r += '🚨 ' + pe + ' commande'+(pe>1?'s':'')+' a expedier ! Va dans Livraison.\n'
      if (newMsg > 0) r += '💬 ' + newMsg + ' message'+(newMsg>1?'s':'')+' non lu'+(newMsg>1?'s':'')+'.\n'
      if (pending > 0) r += '⏳ ' + pending + ' en attente de paiement — relance !\n'
      if (!mrOk) r += '⚠️ Mondial Relay pas configure ! Va dans Parametres.\n'
      if (daysSince > 7 && oc > 0) r += '\n💡 Derniere commande il y a ' + daysSince + ' jours. Planifie un live !'
      if (oc === 0) r += '\n🚀 Pas de commande. Lance ton premier live !'
      if (avg > 0 && avg < 25) r += '\n💡 Panier moyen ' + avg.toFixed(0) + '€ — propose des lots !'
      if (topC) r += '\n\n👑 Meilleures clientes : ' + topC
      return r
    }
    if (q.match(/analyse|conseil|ameliorer|booster|vente|strategie|plan|augment/)) {
      var r = '🚀 Plan d\'action ' + sn + ' :\n\n'
      if (oc === 0) { r += '🔴 PRIORITE 1 : Premier live !\n → 10-15 pieces, 3 stories teasing, titre "ARRIVAGE 🔥"\n → Objectif : 30 min\n\n🔴 PRIORITE 2 : Partage ton lien\n → githubmylivepaiement.vercel.app/pay/' + slug + '\n → Bio TikTok + message prive apres "je prends"' }
      else {
        if (pe > 0) r += '🔴 URGENT : Expedie ' + pe + ' commandes !\n\n'
        if (avg < 25) r += '💡 PANIER MOYEN (' + avg.toFixed(0) + '€) :\n → Lots "2 pieces = -10%"\n → Livraison offerte des 40€\n → Looks complets\n\n'
        if (daysSince > 5) r += '📅 REGULARITE (dernier: ' + daysSince + 'j) :\n → 2 lives/semaine (mardi+jeudi 20h)\n → Story "LIVE CE SOIR 20H"\n\n'
        r += '📈 FIDELISATION (' + cc + ' clients) :\n → Mot manuscrit dans chaque colis\n → Photo du colis avant envoi\n → Groupe WhatsApp VIP\n'
        if (topC) r += ' → Meilleures clientes : ' + topC
      }
      return r
    }
    if (q.match(/tableau|dashboard|accueil|vue d.ensemble|tour|fonctionnalit/)) {
      return '🏠 Tour du dashboard :\n\n📊 TABLEAU DE BORD — 4 chiffres cles + graphiques\n📡 LIVE MONITOR — capte les commandes en live\n📋 COMMANDES — gere, modifie, filtre par statut\n👥 CLIENTS — liste auto + total depense\n📦 LIVRAISON — etiquettes Mondial Relay 1 clic\n📈 STATISTIQUES — CA, graphiques, periodes\n💬 MESSAGES — reponds a tes clientes\n⚙️ PARAMETRES — MR, adresse, logo, tarifs\n🤖 IA ASSISTANT — c\'est moi !\n\nDemande le detail de n\'importe quelle section !'
    }
    if (q.match(/live|monitor|tiktok|instagram|direct|stream|capter|detect/)) {
      return '📡 Guide Live Monitor :\n\n🔴 ETAPE 1 : Menu gauche > "Live Monitor"\n🔴 ETAPE 2 : Choisis TikTok ou Instagram\n🔴 ETAPE 3 : Mode Demo (tester) ou Mode Reel\n🔴 ETAPE 4 : Entre ton pseudo SANS le @\n → Ex: @maboutique → tape "maboutique"\n🔴 ETAPE 5 : Bouton rouge "Connecter au live"\n🔴 ETAPE 6 : Le systeme detecte les mots-cles !\n\n⚙️ MOTS-CLES :\n → Bons : "jp", "je prends", "pour moi"\n → Evite : "oui", "moi" (faux positifs)\n\n🖨️ TICKETS :\n → Bouton "Tickets" > "Auto-print"\n → Format 50.8mm pour imprimante thermique\n\n💡 Teste en Mode Demo d\'abord !'
    }
    if (q.match(/commande|statut|status|en attente|payee|expediee|livree|gerer|modifier|editer/)) {
      return '📋 Commandes :\n\n📊 ⏳' + pending + ' en attente | 💰' + paid + ' payees | 🚚' + shipped + ' expediees | ✅' + delivered + ' livrees\n\n🔴 VOIR : Menu > Commandes > filtres par statut\n🔴 MODIFIER : Clic commande > "✏️ Modifier" > changer nom/adresse/montant/statut > "💾 Sauvegarder"\n🔴 EXPEDIER : Clic > "🚚 Expedier"\n🔴 SUIVI : Clic > "📦 Suivre le colis"\n\n📌 STATUTS :\n ⏳ Gris = pas paye\n 💰 Orange = paye, a expedier\n 🚚 Violet = en route\n ✅ Vert = livre\n ❌ Rouge = annule' + (pe > 0 ? '\n\n🚨 ' + pe + ' a expedier !' : '')
    }
    if (q.match(/livr|expedi|colis|mondial|relay|etiquette|envo|point relais|suivi|tracking/)) {
      if (!mrOk) return '📦 Livraison Mondial Relay :\n\n⚠️ PAS ENCORE CONFIGURE !\n\n🔴 1. Menu > Parametres\n🔴 2. Section "Mondial Relay"\n🔴 3. Trouve tes cles :\n → mondialrelay.fr > profil > "Mes parametres de connexion"\n → Section "Webservices (API, Module)"\n → Copie Code Enseigne + Cle Privee\n🔴 4. Colle et Sauvegarder\n\nPas de compte ? mondialrelay.fr/inscription (gratuit)'
      return '📦 Livraison (✅ MR connecte : ' + boxtalConfig.mrEnseigne + ') :\n\n🔴 1. Menu > Livraison\n🔴 2. Clique une commande payee\n🔴 3. Verifie poids + dimensions\n🔴 4. Bouton vert "🏷️ Generer l\'etiquette"\n🔴 5. L\'expedition se cree chez MR\n🔴 6. Telecharge le PDF sur connect.mondialrelay.com\n🔴 7. Imprime, colle sur le colis, depose au relais !\n\n💡 Ajoute un petit mot dans le colis' + (pe > 0 ? '\n\n🚨 ' + pe + ' a expedier !' : '')
    }
    if (q.match(/client|fidel|meilleur|acheteur|qui.*achete/)) {
      if (cc === 0) return '👥 Pas de client pour l\'instant. Ils apparaissent apres le premier paiement !\n\n💡 Lance un live + partage ton lien :\ngithubmylivepaiement.vercel.app/pay/' + slug
      return '👥 Tes ' + cc + ' clients :\n\n' + (topC ? '👑 Top : ' + topC + '\n\n' : '') + '🔴 Menu > Clients\n → Liste triee par commandes\n → Clic = voir ses commandes\n\n💡 FIDELISATION :\n → Mot manuscrit dans colis\n → Photo colis avant envoi\n → Groupe WhatsApp VIP\n → Offre speciale 3+ commandes'
    }
    if (q.match(/stat|chiffre|ca |revenue|graphi|performance|resultat|combien/)) {
      return '📊 Stats ' + sn + ' :\n\n💰 CA : ' + rev.toFixed(2) + '€ | semaine : ' + r7.toFixed(0) + '€\n📦 ' + oc + ' commandes | 🛒 ' + avg.toFixed(0) + '€ moy.\n👥 ' + cc + ' clients' + (lastOrderDate ? ' | 🕐 dernier : ' + lastOrderDate : '') + '\n\n🔴 Menu > Statistiques\n → 4 chiffres cles en haut\n → Graphiques CA (violet) + commandes (rose)\n → Periodes : 7j, 30j, 6 mois\n' + (avg < 25 && avg > 0 ? '\n💡 Panier ' + avg.toFixed(0) + '€ — lots "2 pour X€" !' : '') + (daysSince > 7 && oc > 0 ? '\n⚠️ ' + daysSince + 'j sans commande — live cette semaine !' : '')
    }
    if (q.match(/message|contact|repon|ecri|communiqu/)) {
      return '💬 Messages :' + (newMsg > 0 ? '\n\n🚨 ' + newMsg + ' non lu'+(newMsg>1?'s':'')+'!' : '') + '\n\n🔴 Menu > Messages\n → Orange "Nouveau" = non lu\n → Clic "Repondre" > ecrire > "Envoyer"\n → La cliente recoit un email + voit dans son espace\n → Les clients peuvent joindre des fichiers\n\n📩 Les clients ecrivent via :\n → Bouton "💬 Nous contacter" sur ta page\n → Espace client > Messages\n\n💡 Reponds vite = 2x plus de commandes !'
    }
    if (q.match(/param|config|regl|logo|tarif|prix livr|stripe|paiement/)) {
      return '⚙️ Parametres :\n\n🔴 Menu > Parametres\n\n📌 LOGO : upload image boutique\n📌 MONDIAL RELAY : ' + (mrOk ? '✅ connecte' : '❌ a configurer !') + '\n📌 ADRESSE : ' + (addrOk ? '✅ ok' : '❌ a remplir !') + '\n📌 TARIF LIVRAISON : ' + (boxtalConfig.shippingPrice || '0') + '€\n → 0 = livraison offerte\n📌 STRIPE : pour recevoir les paiements CB'
    }
    if (q.match(/lien|url|page.*paie|partag|qr|bio/)) {
      return '🔗 Ton lien :\n\n👉 githubmylivepaiement.vercel.app/pay/' + slug + '\n\n🔴 OU PARTAGER :\n → Bio TikTok/Instagram\n → Commentaire pendant le live\n → Message prive apres "je prends"\n → Story avec sticker lien\n → WhatsApp\n\n💡 Dis pendant le live : "Le lien est dans ma bio, entrez votre ref et payez par CB !"\n\n📱 La cliente : lien > ref > infos > relais > CB > fait !'
    }
    if (q.match(/imprim|ticket|munbyn|thermal|papier|format/)) {
      return '🖨️ Impression tickets :\n\n🔴 1. Branche ton imprimante thermique en USB\n🔴 2. Installe le driver\n🔴 3. Reglages imprimante PC :\n → Taille : 50.8mm x 50.8mm\n → Orientation : portrait\n → Marges : 0\n🔴 4. Live Monitor > "Tickets" > "Auto-print"\n🔴 5. Teste en Mode Demo\n\n💡 Si trop grand/petit, ajuste la taille papier'
    }
    if (q.match(/^(merci|thanks|salut|bonjour|hello|coucou|hey|bonsoir)/)) {
      var g = ['Avec plaisir ! 😊','De rien !','Hello ! 👋','Coucou ' + sn + ' ! 😊'][Math.floor(Math.random()*4)]
      if (pe > 0) g += '\n\n🚨 Rappel : ' + pe + ' commande'+(pe>1?'s':'')+' a expedier !'
      return g
    }
    if (q.match(/aide|help|comment|comprend|bloque|perdu|quoi faire|expliqu/)) {
      return '🤝 Dis-moi :\n\n📡 "aide live" — Live Monitor\n📋 "aide commandes" — gerer commandes\n📦 "aide livraison" — Mondial Relay\n📊 "aide stats" — statistiques\n💬 "aide messages" — messagerie\n⚙️ "aide parametres" — config\n🔗 "aide lien" — lien paiement\n🖨️ "aide impression" — tickets\n🚀 "conseils" — booster ventes\n📊 "bilan" — resume complet\n\nOu pose ta question directement !'
    }
    var r = 'Hmm, je n\'ai pas bien compris. Essaie :\n\n📊 "bilan" — ta situation\n🚀 "conseils" — plan d\'action\n📡 "live" — Live Monitor\n📋 "commandes" — gestion\n📦 "livraison" — Mondial Relay\n⚙️ "parametres" — config\n🔗 "lien" — ton lien de paiement'
    if (pe > 0) r += '\n\n🚨 ' + pe + ' commande'+(pe>1?'s':'')+' a expedier !'
    return r
  }

  // Auto-scroll AI chat
  useEffect(function() {
    if (aiScrollRef.current) aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight
  }, [aiMessages])

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '1px solid rgba(0,0,0,.08)',
    borderRadius: 10, fontFamily: sf, fontSize: 14, outline: 'none', background: '#FFF',
  }

  // ═══ LOADING ═══
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(0,0,0,.1)', borderTopColor: '#1A1A1A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  // ═══ LOGIN / SIGNUP ═══
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sf, padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, background: '#1A1A1A', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <span style={{ color: '#FFF', fontSize: 16, fontWeight: 800 }}>ML</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>MY LIVE PAIEMENT</h1>
            <p style={{ fontSize: 14, color: '#999', marginTop: 4 }}>{isSignup ? 'Crée ta boutique' : 'Connecte-toi'}</p>
          </div>

          {!isSignup ? (
            <form onSubmit={handleLogin}>
              <input type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required style={{ ...inputStyle, marginBottom: 10 }} />
              <input type="password" placeholder="Mot de passe" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required style={{ ...inputStyle, marginBottom: 16 }} />
              {loginError && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{loginError}</p>}
              <button type="submit" style={{ width: '100%', padding: '18px 24px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.5px', boxShadow: '0 4px 14px rgba(0,0,0,.15)', transition: 'transform .15s, box-shadow .15s' }}>Se connecter</button>
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#999' }}>
                Pas encore de compte ? <button type="button" onClick={() => setIsSignup(true)} style={{ color: '#1A1A1A', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: sf }}>S'inscrire</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignup}>
              <input placeholder="Nom de ta boutique" value={signupData.shopName} onChange={e => setSignupData({...signupData, shopName: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')})} required style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#999' }}>mylivepaiement.com/</span>
                <input value={signupData.slug} onChange={e => setSignupData({...signupData, slug: e.target.value})} required
                  style={{ ...inputStyle, paddingLeft: 170 }} />
              </div>
              <input type="email" placeholder="Email" value={signupData.email} onChange={e => setSignupData({...signupData, email: e.target.value})} required style={{ ...inputStyle, marginBottom: 10 }} />
              <input type="password" placeholder="Mot de passe (min 6 car.)" value={signupData.password} onChange={e => setSignupData({...signupData, password: e.target.value})} required minLength={6} style={{ ...inputStyle, marginBottom: 16 }} />
              {loginError && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{loginError}</p>}
              <button type="submit" style={{ width: '100%', padding: '18px 24px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.5px', boxShadow: '0 4px 14px rgba(0,0,0,.15)', transition: 'transform .15s, box-shadow .15s' }}>Créer ma boutique</button>
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#999' }}>
                Déjà un compte ? <button type="button" onClick={() => setIsSignup(false)} style={{ color: '#1A1A1A', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: sf }}>Se connecter</button>
              </p>
            </form>
          )}
        </div>
      </div>
    )
  }

  // ═══ MAIN DASHBOARD ═══
  const tabs = [
    { id: 'overview', icon: '📊', label: 'Tableau de bord' },
    { id: 'live', icon: '📡', label: 'Live Monitor', live: liveConnected },
    { id: 'orders', icon: '📋', label: 'Commandes' },
    { id: 'stats', icon: '📈', label: 'Statistiques' },
    { id: 'clients', icon: '👥', label: 'Clients' },
    { id: 'shipping', icon: '🚚', label: 'Livraison' },
    { id: 'messages', icon: '💬', label: 'Messages', badge: messages.filter(function(m) { return m.status !== 'replied' }).length },
    { id: 'assistant', icon: '🤖', label: 'IA Assistant' },
    { id: 'settings', icon: '⚙️', label: 'Paramètres' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: sf, background: '#F4F5FA' }}>
      <style dangerouslySetInnerHTML={{ __html: `
*{box-sizing:border-box}
::selection{background:rgba(233,69,96,.12);color:#1A1A2E}
button{transition:all .25s cubic-bezier(.22,1,.36,1)!important}
button:hover{transform:translateY(-1px)!important;box-shadow:0 4px 12px rgba(0,0,0,.08)!important}
button:active{transform:translateY(0) scale(.98)!important}
input,textarea,select{transition:border-color .2s,box-shadow .2s}
input:focus,textarea:focus,select:focus{border-color:#E94560!important;box-shadow:0 0 0 3px rgba(233,69,96,.08)!important;outline:none!important}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(0,0,0,.1);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.2)}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes gradientMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes glowPulse{0%,100%{box-shadow:0 4px 30px rgba(233,69,96,.08)}50%{box-shadow:0 4px 40px rgba(233,69,96,.16)}}
@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}
@media(max-width:767px){.grid-4{grid-template-columns:repeat(2,1fr)!important}.grid-3{grid-template-columns:1fr!important}.grid-2{grid-template-columns:1fr!important}.grid-21{grid-template-columns:1fr!important}.grid-form{grid-template-columns:1fr!important}}
@media(max-width:480px){.grid-4{grid-template-columns:1fr!important}}
` }} />

      {/* Mobile hamburger */}
      {isMobile && !mobileMenuOpen && (
        <button onClick={function() { setMobileMenuOpen(true) }} style={{ position: 'fixed', top: 12, left: 12, zIndex: 100, width: 44, height: 44, borderRadius: 12, background: '#1A1A2E', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.25)' }}>
          <span style={{ color: '#FFF', fontSize: 20 }}>☰</span>
        </button>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div onClick={function() { setMobileMenuOpen(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 98 }} />
      )}

      {/* ═══ SIDEBAR PRO ═══ */}
      <aside style={{ width: isMobile ? 260 : (sidebarCollapsed ? 70 : 240), background: 'linear-gradient(180deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)', padding: isMobile ? '20px 16px' : (sidebarCollapsed ? '20px 10px' : '24px 16px'), flexShrink: 0, display: isMobile && !mobileMenuOpen ? 'none' : 'flex', flexDirection: 'column', transition: 'width .3s ease', position: isMobile ? 'fixed' : 'relative', top: 0, left: 0, bottom: 0, zIndex: 99, boxShadow: '4px 0 24px rgba(0,0,0,.15)', overflowY: 'auto' }}>
        
        {/* Collapse/Close button */}
        {isMobile ? (
          <button onClick={function() { setMobileMenuOpen(false) }} style={{ position: 'absolute', right: 12, top: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: '#FFF', zIndex: 10 }}>✕</button>
        ) : (
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ position: 'absolute', right: -12, top: 32, width: 24, height: 24, borderRadius: '50%', background: '#FFF', border: '2px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10, zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
          {sidebarCollapsed ? '→' : '←'}
        </button>
        )}
        
        {/* Logo */}
        <div style={{ marginBottom: 32, padding: '0 4px', textAlign: (sidebarCollapsed && !isMobile) ? 'center' : 'left' }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #E94560 0%, #533483 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: (sidebarCollapsed && !isMobile) ? '0 auto' : '0', boxShadow: '0 4px 12px rgba(233,69,96,.3)' }}>
            <span style={{ color: '#FFF', fontSize: 14, fontWeight: 900, letterSpacing: 1 }}>ML</span>
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#AAA', marginBottom: 2 }}>MY LIVE</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#FFF', letterSpacing: 1 }}>PAIEMENT</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1 }}>
          {(!sidebarCollapsed || isMobile) && <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#CCC', marginBottom: 8, paddingLeft: 12 }}>MENU</div>}
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (isMobile) setMobileMenuOpen(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: (sidebarCollapsed && !isMobile) ? 0 : 12, padding: (sidebarCollapsed && !isMobile) ? '12px 0' : '11px 14px', borderRadius: 10, marginBottom: 2,
                background: activeTab === tab.id ? 'rgba(233,69,96,.15)' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: sf, textAlign: 'left',
                borderLeft: activeTab === tab.id ? '3px solid #E94560' : '3px solid transparent',
                transition: 'all .2s ease', justifyContent: (sidebarCollapsed && !isMobile) ? 'center' : 'flex-start',
              }}>
              <span style={{ fontSize: 18, minWidth: 24, textAlign: 'center' }}>{tab.icon}</span>
              {(!sidebarCollapsed || isMobile) && <span style={{ fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400, color: activeTab === tab.id ? '#FFF' : 'rgba(255,255,255,.6)', transition: 'color .2s' }}>{tab.label}</span>}
              {tab.live && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', marginLeft: 'auto', animation: 'pulse 1.5s infinite', boxShadow: '0 0 8px rgba(239,68,68,.5)' }} />}
              {(!sidebarCollapsed || isMobile) && tab.badge > 0 && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: '#FFF', background: '#E94560', borderRadius: 10, padding: '2px 7px', minWidth: 18, textAlign: 'center' }}>{tab.badge}</span>}
            </button>
          ))}
        </nav>

        {/* User section */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#FFF', fontSize: 13, fontWeight: 700 }}>{(shop?.name || 'M').charAt(0).toUpperCase()}</span>
            </div>
            {(!sidebarCollapsed || isMobile) && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, color: '#FFF', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shop?.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
              </div>
            )}
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
              style={{ marginTop: 12, width: '100%', fontSize: 12, color: '#777', background: '#FFF', border: '1px solid rgba(0,0,0,.08)', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontFamily: sf, transition: 'all .2s' }}>
              Déconnexion
            </button>
          )}
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{ flex: 1, padding: isMobile ? '16px 14px' : '32px 40px', paddingTop: isMobile ? 64 : 32, background: '#F4F5FA', overflowY: 'auto', minWidth: 0 }}>

        {/* ─── OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <div>
            {/* Welcome banner */}
            <div style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)', borderRadius: isMobile ? 14 : 20, padding: isMobile ? '20px 18px' : '28px 32px', marginBottom: isMobile ? 16 : 28, color: '#FFF', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(233,69,96,.15)' }} />
              <div style={{ position: 'absolute', right: 40, bottom: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(102,126,234,.1)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h1 style={{ fontFamily: sf, fontSize: isMobile ? 20 : 26, fontWeight: 800, marginBottom: 4 }}>Bonjour, {shop?.name} !</h1>
                <p style={{ fontSize: 14, color: '#555' }}>Voici le résumé de ton activité</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { l: "Chiffre d'affaires", v: stats.revenue.toFixed(0) + '€', icon: '💰', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: 'rgba(102,126,234,.2)' },
                { l: 'Commandes', v: stats.orderCount, icon: '📦', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', shadow: 'rgba(245,87,108,.2)' },
                { l: 'A expedier', v: stats.pendingShip, icon: '🚚', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', shadow: 'rgba(79,172,254,.2)', alert: stats.pendingShip > 0 },
                { l: 'Clients', v: stats.clientCount, icon: '👥', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: 'rgba(67,233,123,.2)' },
              ].map((s, i) => (
                <div key={i} className="card-hover" style={{ background: '#FFF', borderRadius: 16, padding: '20px 18px', boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.04)', cursor: 'default', transition: 'all .3s ease', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', right: -8, top: -8, width: 56, height: 56, borderRadius: '50%', background: s.gradient, opacity: 0.1 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: s.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px ' + s.shadow }}>
                      <span style={{ fontSize: 18 }}>{s.icon}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#1A1A2E', marginBottom: 2 }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: '#999', letterSpacing: 0.5, fontWeight: 500 }}>{s.l}</div>
                  {s.alert && <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 8px rgba(245,158,11,.5)' }} />}
                </div>
              ))}
            </div>

            {/* Pending alert */}
            {stats.pendingShip > 0 && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#92400E' }}>⏳ {stats.pendingShip} commande{stats.pendingShip > 1 ? 's' : ''} en attente d'expédition</div>
                  <div style={{ fontSize: 12, color: '#B45309' }}>Génère les étiquettes pour expédier</div>
                </div>
                <button onClick={() => setActiveTab('shipping')} style={{ padding: '8px 16px', background: '#92400E', color: '#FFF', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf, boxShadow: '0 2px 8px rgba(0,0,0,.06)', transition: 'transform .15s' }}>Voir</button>
              </div>
            )}

            {/* Payment link */}
            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.04)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#BBB', marginBottom: 8 }}>Ton lien de paiement</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, background: '#FAFAF8', borderRadius: 8, padding: '12px 14px', fontSize: 14, fontWeight: 600 }}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/pay/{shop?.slug}
                </div>
                <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/pay/${shop?.slug}`)}
                  style={{ padding: '14px 24px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf, boxShadow: '0 2px 8px rgba(0,0,0,.06)', transition: 'transform .15s' }}>
                  Copier
                </button>
              </div>
            </div>

            {/* Quick create order */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: '#CCC' }}>Dernières commandes</div>
              <button onClick={() => { setActiveTab('orders'); setShowNewOrder(true) }} style={{ padding: '10px 20px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf, boxShadow: '0 2px 8px rgba(0,0,0,.06)', transition: 'transform .15s' }}>
                + Nouvelle commande
              </button>
            </div>

            {/* Orders list */}
            {orders.slice(0, 10).map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 10, marginBottom: 4, background: '#FFF' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>{o.reference || o.ref}</span>
                  <span style={{ fontSize: 13, color: '#999' }}>{o.client_last_name ? `${o.client_first_name} ${o.client_last_name}` : '—'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{(o.total_amount || o.total || o.amount || 0).toFixed(2)}€</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    color: o.status === 'paid' ? '#F59E0B' : o.status === 'shipped' ? '#8B5CF6' : o.status === 'delivered' ? '#10B981' : '#999',
                    background: o.status === 'paid' ? '#FFFBEB' : o.status === 'shipped' ? '#F5F3FF' : o.status === 'delivered' ? '#ECFDF5' : '#F5F4F2',
                  }}>
                    {o.status === 'pending_payment' ? 'En attente' : o.status === 'paid' ? 'Payée' : o.status === 'shipped' ? 'Expédiée' : o.status === 'delivered' ? 'Livrée' : o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* ─── LIVE MONITOR (REBUILT) ─── */}
        {/* ══════════════════════════════════════════ */}
        {activeTab === 'live' && (
          <div>

            {/* ── STEP 1: Choose platform ── */}
            {!liveConnected && !liveConnecting && !livePlatform && !liveEnded && (
              <div style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
                <h2 style={{ fontFamily: ss, fontSize: 30, fontWeight: 400, marginBottom: 8 }}>Live Monitor</h2>
                <p style={{ fontSize: 14, color: '#999', marginBottom: 32 }}>Connecte-toi à ton live pour détecter les commandes automatiquement</p>

                {/* Error display */}
                {liveError && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '14px 18px', marginBottom: 20, textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', marginBottom: 4 }}>Erreur de connexion</div>
                    <div style={{ fontSize: 13, color: '#991B1B' }}>{liveError}</div>
                    <button onClick={() => setLiveError(null)} style={{ marginTop: 8, fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: sf, fontWeight: 600 }}>✕ Fermer</button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
                  {[
                    { id: 'tiktok', label: 'TikTok Live', icon: '🎵', available: true },
                    { id: 'instagram', label: 'Instagram Live', icon: '📸', available: false },
                  ].map(p => (
                    <button key={p.id} onClick={() => { if (p.available) { setLivePlatform(p.id); setLiveMode(LIVE_SERVER_URL ? 'real' : 'demo'); setLiveError(null); } }}
                      style={{
                        flex: 1, padding: '32px 24px', background: '#FFF', borderRadius: 20, cursor: p.available ? 'pointer' : 'not-allowed', fontFamily: sf,
                        border: p.available ? '2px solid rgba(0,0,0,.06)' : '2px dashed rgba(0,0,0,.08)',
                        opacity: p.available ? 1 : 0.5,
                        transition: 'border-color .2s, transform .2s',
                      }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>{p.icon}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>{p.label}</div>
                      {!p.available && <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Bientôt disponible</div>}
                    </button>
                  ))}
                </div>

                {/* Demo button */}
                <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: 20 }}>
                  <button onClick={() => { setLivePlatform('tiktok'); setLiveMode('demo'); setLiveError(null); }}
                    style={{ padding: '10px 24px', background: '#F5F4F2', color: '#777', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>
                    🎮 Mode démo (sans connexion)
                  </button>
                  <p style={{ fontSize: 11, color: '#CCC', marginTop: 8 }}>Teste le Live Monitor avec des commentaires simulés</p>
                </div>
              </div>
            )}

            {/* ── STEP 2: Enter username ── */}
            {livePlatform && !liveConnected && !liveConnecting && !liveEnded && (
              <div style={{ maxWidth: 440, margin: '40px auto', textAlign: 'center' }}>
                <h2 style={{ fontFamily: sf, fontSize: 22, fontWeight: 800, color: '#1A1A2E', marginBottom: 6 }}>
                  {liveMode === 'demo' ? 'Mode Démo' : `Connecte-toi à ${livePlatform === 'tiktok' ? 'TikTok' : 'Instagram'}`}
                </h2>

                {/* Mode badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 20, marginBottom: 20,
                  background: liveMode === 'demo' ? '#FFF7ED' : '#ECFDF5',
                  border: liveMode === 'demo' ? '1px solid #FED7AA' : '1px solid #A7F3D0',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: liveMode === 'demo' ? '#F59E0B' : '#10B981' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: liveMode === 'demo' ? '#92400E' : '#065F46' }}>
                    {liveMode === 'demo' ? 'SIMULATION' : 'CONNEXION RÉELLE'}
                  </span>
                </div>

                {/* Error display */}
                {liveError && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '14px 18px', marginBottom: 16, textAlign: 'left' }}>
                    <div style={{ fontSize: 13, color: '#991B1B' }}>{liveError}</div>
                    <button onClick={() => setLiveError(null)} style={{ marginTop: 6, fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: sf, fontWeight: 600 }}>✕ Fermer</button>
                  </div>
                )}

                {/* Username input */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#999' }}>@</span>
                  <input value={liveUsername} onChange={e => setLiveUsername(e.target.value)} placeholder={liveMode === 'demo' ? 'ton_username (optionnel)' : 'ton_username'}
                    style={{ ...inputStyle, paddingLeft: 36, fontSize: 16, fontWeight: 600, textAlign: 'center' }}
                    onKeyDown={e => { if (e.key === 'Enter' && (liveMode === 'demo' || liveUsername.trim())) handleStartLive() }}
                  />
                </div>

                {/* Connect button */}
                <button
                  onClick={handleStartLive}
                  disabled={liveMode !== 'demo' && !liveUsername.trim()}
                  style={{
                    width: '100%', padding: 16, color: '#FFF', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    background: (liveMode !== 'demo' && !liveUsername.trim()) ? '#CCC' : '#EF4444',
                    transition: 'background .2s',
                  }}>
                  {liveMode === 'demo' ? '🎮 Lancer la démo' : '🔴 Se connecter au live'}
                </button>

                {/* ── KEYWORD CONFIG ── */}
                <div style={{ marginTop: 20 }}>
                  <button onClick={() => setShowKeywordConfig(!showKeywordConfig)}
                    style={{ fontSize: 13, fontWeight: 600, color: '#555', background: '#F5F4F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12, padding: '10px 16px', cursor: 'pointer', fontFamily: sf }}>
                    {showKeywordConfig ? '▾' : '▸'} ⚙️ Mots-clés de détection ({keywords.length})
                  </button>

                  {showKeywordConfig && (
                    <div style={{ marginTop: 12, background: '#FFF', border: '1px solid rgba(0,0,0,.08)', borderRadius: 14, padding: 16, textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Mots-clés qui déclenchent une commande :</div>
                      <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>Quand un commentaire contient un de ces mots, une commande est créée automatiquement.</div>

                      {/* Add new keyword */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                        <input
                          value={newKeyword}
                          onChange={e => setNewKeyword(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(newKeyword) } }}
                          placeholder="Ajouter un mot-clé..."
                          style={{ ...inputStyle, fontSize: 13, padding: '8px 12px' }}
                        />
                        <button onClick={() => addKeyword(newKeyword)}
                          style={{ padding: '8px 14px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf, whiteSpace: 'nowrap' }}>
                          + Ajouter
                        </button>
                      </div>

                      {/* Keyword categories */}
                      {[
                        { label: '🛒 Intentions d\'achat', filter: k => ['je prends','j\'achète','je veux','pour moi','j\'en veux','je le prends','je la prends','j\'en prends','je le veux','je la veux','je commande','commande','ajoutez','ajoute','moi','jp','jpp','j achete','je prend'].includes(k) },
                        { label: '👕 Tailles', filter: k => k.includes('taille') || ['en s','en m','en l','en xl','en xs'].includes(k) },
                        { label: '🎨 Couleurs', filter: k => ['en noir','en blanc','en rouge','en bleu','en rose','en vert','en beige','en gris','en marron','en violet','en orange','le noir','le blanc','le rouge','le bleu','le rose','la noire','la blanche','la rouge','la bleue','la rose'].includes(k) },
                        { label: '🔢 Numéros', filter: k => k.startsWith('le ') && /\d/.test(k) || k.startsWith('numéro') || k.startsWith('article') || k.startsWith('le n°') },
                      ].map((cat, ci) => {
                        const catKeywords = keywords.filter(cat.filter)
                        if (catKeywords.length === 0) return null
                        return (
                          <div key={ci} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: '#BBB', letterSpacing: 1, marginBottom: 4 }}>{cat.label}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {catKeywords.map(k => (
                                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#F5F4F2', fontSize: 11, color: '#555' }}>
                                  {k}
                                  <button onClick={() => removeKeyword(k)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}

                      {/* Custom keywords (not in any category) */}
                      {(() => {
                        const allCatKws = ['je prends','j\'achète','je veux','pour moi','j\'en veux','je le prends','je la prends','j\'en prends','je le veux','je la veux','je commande','commande','ajoutez','ajoute','moi','jp','jpp','j achete','je prend',
                          'taille s','taille m','taille l','taille xl','taille xs','en s','en m','en l','en xl','en xs',
                          'en noir','en blanc','en rouge','en bleu','en rose','en vert','en beige','en gris','en marron','en violet','en orange','le noir','le blanc','le rouge','le bleu','le rose','la noire','la blanche','la rouge','la bleue','la rose',
                          'le 1','le 2','le 3','le 4','le 5','le 6','le 7','le 8','le 9','le 10','le n°1','le n°2','le n°3','le n°4','le n°5','numéro 1','numéro 2','numéro 3','numéro 4','numéro 5','article 1','article 2','article 3','article 4','article 5',
                          'j\'en prends 2','j\'en prends 3','j\'en veux 2']
                        const custom = keywords.filter(k => !allCatKws.includes(k))
                        if (custom.length === 0) return null
                        return (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: '#BBB', letterSpacing: 1, marginBottom: 4 }}>✏️ TES MOTS-CLÉS PERSO</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {custom.map(k => (
                                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#EFF6FF', fontSize: 11, color: '#3B82F6', fontWeight: 600 }}>
                                  {k}
                                  <button onClick={() => removeKeyword(k)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93C5FD', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Reset */}
                      <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: 10, marginTop: 6 }}>
                        <button onClick={() => setKeywords(DEFAULT_KEYWORDS)}
                          style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer', fontFamily: sf }}>
                          ↺ Rétablir les mots-clés par défaut
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mode switcher */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                  <button onClick={() => setLivePlatform(null)}
                    style={{ fontSize: 13, color: '#999', background: 'none', border: 'none', cursor: 'pointer', fontFamily: sf }}>
                    ← Retour
                  </button>
                  {LIVE_SERVER_URL && (
                    <button onClick={() => setLiveMode(liveMode === 'demo' ? 'real' : 'demo')}
                      style={{ fontSize: 13, color: '#FFF', background: '#635BFF', border: 'none', borderRadius: 12, padding: '10px 20px', cursor: 'pointer', fontFamily: sf, fontWeight: 600 }}>
                      {liveMode === 'demo' ? '⚡ Passer en mode réel' : '🎮 Passer en mode démo'}
                    </button>
                  )}
                </div>

                {liveMode === 'real' && (
                  <div style={{ marginTop: 20, padding: 16, background: '#F0FDF4', borderRadius: 12, border: '1px solid #BBF7D0' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#059669', marginBottom: 4 }}>💡 Mode réel</div>
                    <div style={{ fontSize: 12, color: '#15803D', lineHeight: 1.5 }}>
                      Le Live Monitor va se connecter directement au live TikTok de @{liveUsername || '...'} et capter tous les commentaires en temps réel. Assure-toi que le live est déjà lancé.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CONNECTING ── */}
            {liveConnecting && (
              <div style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, border: '3px solid rgba(239,68,68,.2)', borderTopColor: '#EF4444', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                <p style={{ fontSize: 15, fontWeight: 600 }}>
                  {liveMode === 'demo' ? 'Lancement de la démo...' : `Connexion à @${liveUsername}...`}
                </p>
                <p style={{ fontSize: 13, color: '#999', marginTop: 6 }}>
                  {liveMode === 'demo' ? 'Préparation des commentaires simulés' : 'Recherche du live en cours sur TikTok'}
                </p>
              </div>
            )}

            {/* ── LIVE ENDED SCREEN ── */}
            {liveEnded && !liveConnected && !liveConnecting && (
              <div style={{ maxWidth: 440, margin: '60px auto', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F5F4F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <span style={{ fontSize: 28 }}>📡</span>
                </div>
                <h2 style={{ fontFamily: sf, fontSize: 22, fontWeight: 800, color: '#1A1A2E', marginBottom: 8 }}>Live terminé</h2>
                <p style={{ fontSize: 14, color: '#999', marginBottom: 24 }}>{liveEnded.reason}</p>

                {/* Session stats */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: 14, textAlign: 'center', border: '1px solid rgba(0,0,0,.04)' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1A1A2E' }}>{liveOrders.length}</div>
                    <div style={{ fontSize: 10, color: '#999' }}>Commandes</div>
                  </div>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: 14, textAlign: 'center', border: '1px solid rgba(0,0,0,.04)' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1A1A2E' }}>{allComments.length}</div>
                    <div style={{ fontSize: 10, color: '#999' }}>Commentaires</div>
                  </div>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: 14, textAlign: 'center', border: '1px solid rgba(0,0,0,.04)' }}>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>
                      {liveEnded.duration ? `${Math.floor(liveEnded.duration / 60)}m` : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: '#999' }}>Durée</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button onClick={resetLive}
                    style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)', color: '#FFF', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: sf, boxShadow: '0 4px 14px rgba(26,26,46,.15)' }}>
                    Nouveau live
                  </button>
                  {liveOrders.length > 0 && (
                    <button onClick={printLiveOrders}
                      style={{ padding: '12px 24px', background: '#F59E0B', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 15, boxShadow: '0 4px 12px rgba(245,158,11,.25)', fontWeight: 700, cursor: 'pointer', fontFamily: sf }}>
                      🖨️ Imprimer les commandes
                    </button>
                  )}
                  {liveOrders.length > 0 && (
                    <button onClick={function() { setShowPaymentTracking(!showPaymentTracking) }}
                      style={{ padding: '12px 24px', background: showPaymentTracking ? '#10B981' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 15, boxShadow: '0 4px 12px rgba(102,126,234,.25)', fontWeight: 700, cursor: 'pointer', fontFamily: sf }}>
                      💰 Suivi paiements
                    </button>
                  )}
                  <button onClick={() => { setActiveTab('orders'); loadData(shop.id); }}
                    style={{ padding: '12px 24px', background: '#F5F4F2', color: '#555', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>
                    Voir les commandes
                  </button>
                </div>

                {/* ═══ PAYMENT TRACKING VIEW ═══ */}
                {showPaymentTracking && liveOrders.length > 0 && (
                  <div style={{ marginTop: 24, background: '#FFF', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E' }}>Suivi des paiements</div>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Croise les tickets live avec les commandes payees</div>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ textAlign: 'center', padding: '8px 16px', borderRadius: 10, background: '#ECFDF5' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{liveOrders.filter(function(lo) { return orders.some(function(o) { return (o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') && o.description && o.description.toLowerCase().indexOf(lo.user.toLowerCase()) !== -1 }) }).length}</div>
                          <div style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>Payees</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '8px 16px', borderRadius: 10, background: '#FEF2F2' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#EF4444' }}>{liveOrders.filter(function(lo) { return !orders.some(function(o) { return (o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') && o.description && o.description.toLowerCase().indexOf(lo.user.toLowerCase()) !== -1 }) }).length}</div>
                          <div style={{ fontSize: 10, color: '#EF4444', fontWeight: 600 }}>Non payees</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {liveOrders.map(function(lo, idx) {
                        var isPaid = orders.some(function(o) {
                          return (o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') && o.description && o.description.toLowerCase().indexOf(lo.user.toLowerCase()) !== -1
                        })
                        var matchedOrder = orders.find(function(o) {
                          return o.description && o.description.toLowerCase().indexOf(lo.user.toLowerCase()) !== -1
                        })
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: isPaid ? '#F0FDF4' : '#FFF7ED', border: isPaid ? '1px solid #BBF7D0' : '1px solid #FED7AA' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: isPaid ? '#10B981' : '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ color: '#FFF', fontSize: 16 }}>{isPaid ? '✓' : '⏳'}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14, fontWeight: 800 }}>#{lo.orderNum}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>@{lo.user}</span>
                              </div>
                              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{lo.text}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: isPaid ? '#10B981' : '#F59E0B', color: '#FFF' }}>
                                {isPaid ? 'PAYE' : 'NON PAYE'}
                              </div>
                              {matchedOrder && <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>{matchedOrder.reference} — {matchedOrder.status === 'paid' ? 'A expedier' : matchedOrder.status === 'shipped' ? 'Expedie' : matchedOrder.status === 'delivered' ? 'Livre' : 'En attente'}</div>}
                              {!isPaid && <div style={{ fontSize: 10, color: '#92400E', marginTop: 4 }}>Relancer</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ LIVE ACTIVE ══ */}
            {liveConnected && (
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.5s infinite' }} />
                    <span style={{ fontSize: 16, fontWeight: 700 }}>Live Monitor</span>
                    <span style={{ fontSize: 13, color: '#999' }}>@{liveUsername || 'demo'} · {livePlatform === 'tiktok' ? 'TikTok' : 'Instagram'}</span>
                    {liveMode === 'demo' && (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '2px 8px', borderRadius: 8, background: '#FFF7ED', color: '#92400E', border: '1px solid #FED7AA' }}>DÉMO</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Sound toggle */}
                    <button onClick={() => setLiveSoundEnabled(!liveSoundEnabled)}
                      style={{ padding: '6px 12px', background: liveSoundEnabled ? '#ECFDF5' : '#F5F4F2', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: sf }}
                      title={liveSoundEnabled ? 'Son activé' : 'Son désactivé'}>
                      {liveSoundEnabled ? '🔔' : '🔕'}
                    </button>
                    {/* Ticket window */}
                    <button onClick={openReceiptWindow}
                      style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', border: 'none', borderRadius: 12, fontSize: 13, cursor: 'pointer', fontFamily: sf, fontWeight: 700, color: '#FFF', boxShadow: '0 2px 8px rgba(59,130,246,.25)' }}
                      title="Ouvrir la fenêtre des tickets">
                      🖨️ Tickets
                    </button>
                    {/* Auto-print toggle */}
                    <button onClick={() => { if (!autoPrintEnabled) openReceiptWindow(); setAutoPrintEnabled(!autoPrintEnabled) }}
                      style={{ padding: '10px 18px', background: autoPrintEnabled ? '#EF4444' : '#F5F4F2', border: 'none', borderRadius: 12, fontSize: 13, cursor: 'pointer', fontFamily: sf, fontWeight: 600, color: autoPrintEnabled ? '#FFF' : '#888' }}
                      title={autoPrintEnabled ? 'Impression auto activée' : 'Impression auto désactivée'}>
                      {autoPrintEnabled ? '🔴 Auto-print ON' : 'Auto-print'}
                    </button>
                    <button onClick={() => { stopLive(); resetLive(); }}
                      style={{ padding: '8px 16px', background: '#FFF', color: '#EF4444', border: '2px solid #FECACA', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: sf, boxShadow: '0 2px 8px rgba(0,0,0,.06)', transition: 'transform .15s' }}>
                      Déconnecter
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#EF4444' }}>{liveOrders.length}</div>
                    <div style={{ fontSize: 10, color: '#999' }}>Commandes</div>
                  </div>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1A1A2E' }}>{allComments.length}</div>
                    <div style={{ fontSize: 10, color: '#999' }}>Commentaires</div>
                  </div>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{allComments.length > 0 ? Math.round((liveOrders.length / allComments.length) * 100) : 0}%</div>
                    <div style={{ fontSize: 10, color: '#999' }}>Taux d'achat</div>
                  </div>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>👁 {liveViewers}</div>
                    <div style={{ fontSize: 10, color: '#999' }}>Viewers</div>
                  </div>
                </div>

                {/* Filter + Auto-scroll */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setLiveFilter('all')} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf, background: liveFilter === 'all' ? '#E94560' : '#FFF', color: liveFilter === 'all' ? '#FFF' : '#777' }}>Tous ({allComments.length})</button>
                    <button onClick={() => setLiveFilter('orders')} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf, background: liveFilter === 'orders' ? '#F59E0B' : '#F5F4F2', color: liveFilter === 'orders' ? '#FFF' : '#999' }}>🛒 Commandes ({liveOrders.length})</button>
                    <button onClick={() => setLiveFilter('payments')} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf, background: liveFilter === 'payments' ? '#10B981' : '#F5F4F2', color: liveFilter === 'payments' ? '#FFF' : '#999' }}>💰 Suivi paiements</button>
                  </div>
                  <button onClick={() => setAutoScroll(!autoScroll)}
                    style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, cursor: 'pointer', fontFamily: sf, background: autoScroll ? '#ECFDF5' : '#F5F4F2', color: autoScroll ? '#10B981' : '#999' }}>
                    {autoScroll ? '⬇ Auto-scroll ON' : '⬇ Auto-scroll OFF'}
                  </button>
                </div>

                {/* Payment tracking view */}
                {liveFilter === 'payments' && (
                  <div style={{ background: '#FFF', borderRadius: 16, padding: 20, maxHeight: 500, overflowY: 'auto' }}>
                    {liveOrders.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 40, color: '#CCC' }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>💰</div>
                        <p style={{ fontSize: 13 }}>Aucune commande live pour le moment</p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                          <div style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 12, background: '#ECFDF5' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#047857' }}>{liveOrders.filter(function(lo) { return orders.some(function(o) { return (o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') && o.description && o.description.toLowerCase().indexOf(lo.user.toLowerCase()) !== -1 }) }).length}</div>
                            <div style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>Payees</div>
                          </div>
                          <div style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 12, background: '#FEF2F2' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#EF4444' }}>{liveOrders.filter(function(lo) { return !orders.some(function(o) { return (o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') && o.description && o.description.toLowerCase().indexOf(lo.user.toLowerCase()) !== -1 }) }).length}</div>
                            <div style={{ fontSize: 10, color: '#EF4444', fontWeight: 600 }}>Non payees</div>
                          </div>
                          <div style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 12, background: '#F5F3FF' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#7C3AED' }}>{liveOrders.length}</div>
                            <div style={{ fontSize: 10, color: '#7C3AED', fontWeight: 600 }}>Total tickets</div>
                          </div>
                        </div>
                        {liveOrders.map(function(lo, idx) {
                          var isPaid = orders.some(function(o) {
                            return (o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') && o.description && o.description.toLowerCase().indexOf(lo.user.toLowerCase()) !== -1
                          })
                          var matchedOrder = orders.find(function(o) {
                            return o.description && o.description.toLowerCase().indexOf(lo.user.toLowerCase()) !== -1
                          })
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, marginBottom: 4, background: isPaid ? '#F0FDF4' : '#FFFBEB', border: isPaid ? '1px solid #BBF7D0' : '1px solid #FDE68A' }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: isPaid ? '#10B981' : '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ color: '#FFF', fontSize: 13, fontWeight: 800 }}>{isPaid ? '✓' : '!'}</span>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 13, fontWeight: 800 }}>#{lo.orderNum}</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>@{lo.user}</span>
                                </div>
                                <div style={{ fontSize: 11, color: '#999' }}>{lo.text} — {lo.time}</div>
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: isPaid ? '#10B981' : '#F59E0B', color: '#FFF' }}>
                                {isPaid ? 'PAYE' : 'NON PAYE'}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Comments feed */}
                {liveFilter !== 'payments' && (
                <div ref={liveScrollRef} style={{ background: '#FFF', borderRadius: 16, padding: 16, maxHeight: 500, overflowY: 'auto' }}>
                  {(liveFilter === 'orders' ? allComments.filter(c => c.isPurchase) : allComments).map(c => (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 4,
                      background: c.isPurchase ? '#FFFBEB' : c.isGift ? '#FFF0F6' : '#FAFAF8',
                      border: c.isPurchase ? '1px solid #FDE68A' : c.isGift ? '1px solid #FBCFE8' : '1px solid transparent',
                      animation: 'fadeSlide .3s ease-out',
                    }}>
                      {c.isPurchase && (
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#FFF' }}>#{c.orderNum}</span>
                        </div>
                      )}
                      {c.profilePic && !c.isPurchase && (
                        <img src={c.profilePic} alt="" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E' }}>@{c.user}</span>
                          {c.isPurchase && <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, padding: '2px 6px', borderRadius: 10, background: '#F59E0B', color: '#FFF' }}>COMMANDE</span>}
                          {c.isGift && <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, padding: '2px 6px', borderRadius: 10, background: '#EC4899', color: '#FFF' }}>CADEAU</span>}
                          <span style={{ fontSize: 10, color: '#CCC', marginLeft: 'auto' }}>{c.time}</span>
                        </div>
                        <div style={{ fontSize: 13, color: c.isPurchase ? '#333' : c.isGift ? '#BE185D' : '#555', marginTop: 2 }}>{c.text}</div>
                      </div>
                    </div>
                  ))}
                  {allComments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#CCC' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
                      <p style={{ fontSize: 14 }}>En attente de commentaires...</p>
                      <p style={{ fontSize: 12, marginTop: 4 }}>
                        {liveMode === 'demo' ? 'Les commentaires simulés vont arriver...' : 'Les commentaires du live vont apparaître ici en temps réel'}
                      </p>
                    </div>
                  )}
                </div>
                )}

                {/* Orders summary (collapsible) */}
                {liveOrders.length > 0 && (
                  <div style={{ marginTop: 16, background: '#FFF', borderRadius: 16, padding: 16, border: '2px solid #FDE68A' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#92400E' }}>🛒 RÉCAP COMMANDES DU LIVE ({liveOrders.length})</div>
                      <button onClick={printLiveOrders}
                        style={{ padding: '10px 20px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf, display: 'flex', alignItems: 'center', gap: 4 }}>
                        🖨️ Imprimer
                      </button>
                    </div>
                    {liveOrders.slice(-5).map(o => (
                      <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#E94560' }}>#{o.orderNum}</span>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>@{o.user}</span>
                        </div>
                        <span style={{ fontSize: 12, color: '#777' }}>{o.text}</span>
                      </div>
                    ))}
                    {liveOrders.length > 5 && (
                      <div style={{ fontSize: 11, color: '#999', marginTop: 6, textAlign: 'center' }}>+ {liveOrders.length - 5} autres commandes</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}


        {/* ─── STATISTICS ─── */}
        {activeTab === 'stats' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <div>
                <h1 style={{ fontFamily: sf, fontSize: 24, fontWeight: 800, color: '#1A1A2E', marginBottom: 4 }}>Statistiques</h1>
                <p style={{ fontSize: 13, color: '#999' }}>Analyse de tes performances</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['7d', '30d', '6m'].map(function(p) {
                  return (
                    <button key={p} onClick={function() { setStatsPeriod(p) }}
                      style={{ padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf, background: statsPeriod === p ? '#1A1A2E' : '#F5F4F2', color: statsPeriod === p ? '#FFF' : '#999', transition: 'all .2s' }}>
                      {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '6 mois'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { l: 'CA 7 jours', v: statsData.totalRevenue7d.toFixed(0) + '€', icon: '💰', color: '#667eea' },
                { l: 'Commandes 7j', v: statsData.totalOrders7d, icon: '📦', color: '#f5576c' },
                { l: 'Panier moyen', v: statsData.avgOrderValue.toFixed(0) + '€', icon: '🛒', color: '#4facfe' },
                { l: 'Taux conversion', v: statsData.conversionRate + '%', icon: '📊', color: '#43e97b' },
              ].map(function(s, i) {
                return (
                  <div key={i} style={{ background: '#FFF', borderRadius: 16, padding: '20px 18px', boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <span style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>{s.l}</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#1A1A2E' }}>{s.v}</div>
                  </div>
                )
              })}
            </div>

            {/* Revenue Chart */}
            <div style={{ background: '#FFF', borderRadius: 16, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.04)', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>Chiffre d'affaires</div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>{statsPeriod === '6m' ? '6 derniers mois' : statsPeriod === '30d' ? '30 derniers jours' : '7 derniers jours'}</div>
              <div style={{ display: 'flex', alignItems: 'end', gap: 8, height: 180, padding: '0 4px' }}>
                {(statsPeriod === '6m' ? statsData.monthly : statsData.daily).map(function(d, i) {
                  var maxRev = Math.max.apply(null, (statsPeriod === '6m' ? statsData.monthly : statsData.daily).map(function(x) { return x.revenue }))
                  var h = maxRev > 0 ? Math.max((d.revenue / maxRev) * 150, 4) : 4
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#1A1A2E' }}>{d.revenue > 0 ? d.revenue.toFixed(0) + '€' : ''}</div>
                      <div style={{ width: '100%', maxWidth: 40, height: h, borderRadius: 6, background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)', transition: 'height .5s ease' }} />
                      <div style={{ fontSize: 9, color: '#BBB', fontWeight: 500 }}>{d.name}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Orders Chart */}
            <div style={{ background: '#FFF', borderRadius: 16, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.04)', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>Commandes</div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>Nombre de commandes par periode</div>
              <div style={{ display: 'flex', alignItems: 'end', gap: 8, height: 140, padding: '0 4px' }}>
                {(statsPeriod === '6m' ? statsData.monthly : statsData.daily).map(function(d, i) {
                  var maxOrd = Math.max.apply(null, (statsPeriod === '6m' ? statsData.monthly : statsData.daily).map(function(x) { return x.orders }))
                  var h = maxOrd > 0 ? Math.max((d.orders / maxOrd) * 110, 4) : 4
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#1A1A2E' }}>{d.orders > 0 ? d.orders : ''}</div>
                      <div style={{ width: '100%', maxWidth: 40, height: h, borderRadius: 6, background: 'linear-gradient(180deg, #f093fb 0%, #f5576c 100%)', transition: 'height .5s ease' }} />
                      <div style={{ fontSize: 9, color: '#BBB', fontWeight: 500 }}>{d.name}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Status distribution */}
            <div style={{ background: '#FFF', borderRadius: 16, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.04)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 16 }}>Repartition des commandes</div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'En attente', count: orders.filter(function(o) { return o.status === 'pending_payment' }).length, color: '#94A3B8', bg: '#F1F5F9' },
                  { label: 'Payees', count: orders.filter(function(o) { return o.status === 'paid' }).length, color: '#92400E', bg: '#FFFBEB' },
                  { label: 'Expediees', count: orders.filter(function(o) { return o.status === 'shipped' }).length, color: '#8B5CF6', bg: '#F5F3FF' },
                  { label: 'Livrees', count: orders.filter(function(o) { return o.status === 'delivered' }).length, color: '#059669', bg: '#ECFDF5' },
                ].map(function(s, i) {
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center', padding: 16, borderRadius: 12, background: s.bg }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.count}</div>
                      <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {orders.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: '#CCC' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📈</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#999' }}>Pas encore de donnees</p>
                <p style={{ fontSize: 13, marginTop: 4, color: '#BBB' }}>Les statistiques apparaitront des ta premiere commande</p>
              </div>
            )}
          </div>
        )}

        {/* ─── ORDERS ─── */}
        {activeTab === 'orders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h1 style={{ fontFamily: sf, fontSize: isMobile ? 18 : 22, fontWeight: 800, color: '#1A1A2E' }}>Commandes ({orders.length})</h1>
              <button onClick={() => setShowNewOrder(!showNewOrder)} style={{ padding: '10px 18px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>+ Nouvelle</button>
            </div>

            {/* Status filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', overflowX: isMobile ? 'auto' : 'visible' }}>
              {[
                { key: 'all', label: 'Toutes', count: orders.length },
                { key: 'pending_payment', label: 'En attente', count: orders.filter(function(o){return o.status==='pending_payment'}).length, color: '#94A3B8' },
                { key: 'paid', label: 'Payees', count: orders.filter(function(o){return o.status==='paid'}).length, color: '#92400E' },
                { key: 'shipped', label: 'Expediees', count: orders.filter(function(o){return o.status==='shipped'}).length, color: '#8B5CF6' },
                { key: 'delivered', label: 'Livrees', count: orders.filter(function(o){return o.status==='delivered'}).length, color: '#059669' },
              ].map(function(f) { return (
                <button key={f.key} onClick={function(){setOrderFilter(f.key)}} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf, background: orderFilter === f.key ? '#E94560' : '#FFF', color: orderFilter === f.key ? '#FFF' : '#777' }}>
                  {f.label} ({f.count})
                </button>
              )})}
            </div>

            {showNewOrder && (
              <form onSubmit={handleCreateOrder} style={{ background: '#FFF', border: '2px solid #E94560', borderRadius: 14, padding: 18, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: 10, marginBottom: 12 }}>
                  <input placeholder="Ref (auto)" value={newOrder.reference} onChange={e => setNewOrder({...newOrder, reference: e.target.value})} style={inputStyle} />
                  <input placeholder="Montant €" type="number" step="0.01" required value={newOrder.amount} onChange={e => setNewOrder({...newOrder, amount: e.target.value})} style={inputStyle} />
                  <input placeholder="Description" value={newOrder.description} onChange={e => setNewOrder({...newOrder, description: e.target.value})} style={inputStyle} />
                </div>
                <button type="submit" style={{ padding: '10px 20px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>Creer la commande</button>
              </form>
            )}

            {/* Order detail panel */}
            {selectedOrderDetail && !editingOrder && (
              <div style={{ background: '#FFF', border: '2px solid #E94560', borderRadius: 16, padding: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: '#1A1A2E' }}>Commande {selectedOrderDetail.reference || selectedOrderDetail.ref}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Creee le {new Date(selectedOrderDetail.created_at).toLocaleDateString('fr-FR')} a {new Date(selectedOrderDetail.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={function() { setEditingOrder(Object.assign({}, selectedOrderDetail)) }} style={{ padding: '8px 16px', background: '#F5F4F2', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>✏️ Modifier</button>
                    <button onClick={function() { setSelectedOrderDetail(null) }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}>✕</button>
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ marginBottom: 20 }}>
                  {(function() {
                    var s = selectedOrderDetail.status
                    var statuses = {
                      'pending_payment': { l: 'En attente de paiement', c: '#94A3B8', bg: '#F1F5F9', icon: '⏳' },
                      'paid': { l: 'Payee — a expedier', c: '#F59E0B', bg: '#FFFBEB', icon: '💰' },
                      'shipped': { l: 'Expediee', c: '#8B5CF6', bg: '#F5F3FF', icon: '🚚' },
                      'delivered': { l: 'Livree', c: '#10B981', bg: '#ECFDF5', icon: '✓' },
                      'cancelled': { l: 'Annulee', c: '#EF4444', bg: '#FEF2F2', icon: '✕' },
                    }
                    var st = statuses[s] || { l: s, c: '#999', bg: '#F5F4F2', icon: '?' }
                    return <span style={{ fontSize: 13, fontWeight: 700, padding: '6px 16px', borderRadius: 20, color: st.c, background: st.bg }}>{st.icon} {st.l}</span>
                  })()}
                  {selectedOrderDetail.tracking_number && <span style={{ marginLeft: 12, fontSize: 12, color: '#6366F1', fontWeight: 600 }}>Suivi: {selectedOrderDetail.tracking_number}</span>}
                </div>

                {/* Order info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div style={{ background: '#FAFAF8', borderRadius: 12, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 4, letterSpacing: 1 }}>CLIENT</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>{selectedOrderDetail.client_first_name || ''} {selectedOrderDetail.client_last_name || ''}</div>
                    <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>{selectedOrderDetail.client_email || ''}</div>
                    <div style={{ fontSize: 12, color: '#777' }}>{selectedOrderDetail.client_phone || ''}</div>
                  </div>
                  <div style={{ background: '#FAFAF8', borderRadius: 12, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 4, letterSpacing: 1 }}>MONTANT</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#1A1A2E' }}>{(selectedOrderDetail.total_amount || 0).toFixed(2)}€</div>
                    {selectedOrderDetail.shipping_cost > 0 && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>dont {selectedOrderDetail.shipping_cost}€ livraison</div>}
                  </div>
                  <div style={{ background: '#FAFAF8', borderRadius: 12, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 4, letterSpacing: 1 }}>ADRESSE</div>
                    <div style={{ fontSize: 13 }}>{selectedOrderDetail.shipping_address || ''}</div>
                    <div style={{ fontSize: 13 }}>{selectedOrderDetail.shipping_zipcode || ''} {selectedOrderDetail.shipping_city || ''}</div>
                  </div>
                  <div style={{ background: '#FAFAF8', borderRadius: 12, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 4, letterSpacing: 1 }}>LIVRAISON</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedOrderDetail.shipping_method === 'relay' ? '📍 Mondial Relay' : selectedOrderDetail.shipping_method || '—'}</div>
                    {selectedOrderDetail.relay_point && (function() { try { var rp = JSON.parse(selectedOrderDetail.relay_point); return <div style={{ fontSize: 12, color: '#6366F1', marginTop: 4 }}>{rp.name}<br/>{rp.address}, {rp.zipcode} {rp.city}</div> } catch(e) { return null } })()}
                    {selectedOrderDetail.shipping_carrier && <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{selectedOrderDetail.shipping_carrier}</div>}
                  </div>
                </div>
                {selectedOrderDetail.description && <div style={{ fontSize: 12, color: '#777', marginBottom: 16 }}>Description: {selectedOrderDetail.description}</div>}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, flexDirection: isMobile ? 'column' : 'row', borderTop: '1px solid rgba(0,0,0,.06)' }}>
                  {selectedOrderDetail.status === 'paid' && <button onClick={function() { setActiveTab('shipping'); startShipping(selectedOrderDetail); setSelectedOrderDetail(null) }} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: sf }}>🚚 Expedier</button>}
                  {selectedOrderDetail.status === 'shipped' && <button onClick={async function() { await fetch('/api/orders/upsert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_status', orderId: selectedOrderDetail.id, fields: { status: 'delivered', delivered_at: new Date().toISOString() } }) }); loadData(shop.id); setSelectedOrderDetail(null) }} style={{ padding: '10px 20px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: sf }}>✓ Marquer livree</button>}
                  {selectedOrderDetail.tracking_number && <button onClick={function() { window.open('https://www.mondialrelay.fr/suivi-de-colis/?NumExp=' + selectedOrderDetail.tracking_number + '&cp=' + (selectedOrderDetail.shipping_zipcode || ''), '_blank') }} style={{ padding: '10px 20px', background: '#F5F4F2', color: '#555', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>📦 Suivre le colis</button>}
                </div>
              </div>
            )}

            {/* Editing panel */}
            {editingOrder && (
              <div style={{ background: '#FFF', border: '2px solid #6366F1', borderRadius: 16, padding: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#6366F1' }}>✏️ Modifier la commande</div>
                  <button onClick={function() { setEditingOrder(null) }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div><div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>Reference</div><input value={editingOrder.reference || ''} onChange={function(e) { setEditingOrder(Object.assign({}, editingOrder, { reference: e.target.value })) }} style={inputStyle} /></div>
                  <div><div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>Montant (€)</div><input type="number" step="0.01" value={editingOrder.total_amount || ''} onChange={function(e) { setEditingOrder(Object.assign({}, editingOrder, { total_amount: e.target.value })) }} style={inputStyle} /></div>
                  <div><div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>Prenom</div><input value={editingOrder.client_first_name || ''} onChange={function(e) { setEditingOrder(Object.assign({}, editingOrder, { client_first_name: e.target.value })) }} style={inputStyle} /></div>
                  <div><div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>Nom</div><input value={editingOrder.client_last_name || ''} onChange={function(e) { setEditingOrder(Object.assign({}, editingOrder, { client_last_name: e.target.value })) }} style={inputStyle} /></div>
                  <div><div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>Email</div><input value={editingOrder.client_email || ''} onChange={function(e) { setEditingOrder(Object.assign({}, editingOrder, { client_email: e.target.value })) }} style={inputStyle} /></div>
                  <div><div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>Telephone</div><input value={editingOrder.client_phone || ''} onChange={function(e) { setEditingOrder(Object.assign({}, editingOrder, { client_phone: e.target.value })) }} style={inputStyle} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>Adresse</div><input value={editingOrder.shipping_address || ''} onChange={function(e) { setEditingOrder(Object.assign({}, editingOrder, { shipping_address: e.target.value })) }} style={inputStyle} /></div>
                  <div><div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>Code postal</div><input value={editingOrder.shipping_zipcode || ''} onChange={function(e) { setEditingOrder(Object.assign({}, editingOrder, { shipping_zipcode: e.target.value })) }} style={inputStyle} /></div>
                  <div><div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>Ville</div><input value={editingOrder.shipping_city || ''} onChange={function(e) { setEditingOrder(Object.assign({}, editingOrder, { shipping_city: e.target.value })) }} style={inputStyle} /></div>
                  <div><div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>Statut</div><select value={editingOrder.status || 'pending'} onChange={function(e) { setEditingOrder(Object.assign({}, editingOrder, { status: e.target.value })) }} style={Object.assign({}, inputStyle, { background: '#FFF' })}><option value="pending_payment">En attente paiement</option><option value="paid">Payee</option><option value="shipped">Expediee</option><option value="delivered">Livree</option><option value="cancelled">Annulee</option></select></div>
                  <div><div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>N° suivi</div><input value={editingOrder.tracking_number || ''} onChange={function(e) { setEditingOrder(Object.assign({}, editingOrder, { tracking_number: e.target.value })) }} style={inputStyle} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>Description</div><input value={editingOrder.description || ''} onChange={function(e) { setEditingOrder(Object.assign({}, editingOrder, { description: e.target.value })) }} style={inputStyle} /></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveOrderEdit} style={{ padding: '12px 24px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: sf }}>💾 Sauvegarder</button>
                  <button onClick={function() { setEditingOrder(null) }} style={{ padding: '12px 24px', background: '#F5F4F2', color: '#777', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>Annuler</button>
                </div>
              </div>
            )}

            {/* Orders list */}
            {orders.filter(function(o) { return orderFilter === 'all' || o.status === orderFilter }).map(o => (
              <div key={o.id} onClick={() => { if (!editingOrder) setSelectedOrderDetail(selectedOrderDetail?.id === o.id ? null : o) }} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', padding: isMobile ? '12px 14px' : '14px 16px', borderRadius: 14, marginBottom: 6, gap: isMobile ? 8 : 0, background: selectedOrderDetail?.id === o.id ? 'rgba(233,69,96,.04)' : 'rgba(255,255,255,.03)', border: selectedOrderDetail?.id === o.id ? '1px solid rgba(233,69,96,.3)' : '1px solid rgba(255,255,255,.06)', boxShadow: '0 2px 8px rgba(0,0,0,.04)', cursor: 'pointer', transition: 'all .15s' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{o.reference || o.ref}</span>
                    <span style={{ fontSize: 13, color: '#999' }}>{o.client_last_name ? (o.client_first_name + ' ' + o.client_last_name) : 'En attente'}</span>
                    {o.source === 'live_monitor' && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: '2px 6px', borderRadius: 8, background: '#EFF6FF', color: '#3B82F6' }}>LIVE</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#BBB', marginTop: 3 }}>{new Date(o.created_at).toLocaleDateString('fr-FR')} {o.shipping_city ? '· ' + o.shipping_city : ''} {o.description ? '· ' + o.description.substring(0, 40) : ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>{(o.total_amount || o.total || o.amount || 0).toFixed(2)}€</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                    color: o.status === 'paid' ? '#F59E0B' : o.status === 'shipped' ? '#8B5CF6' : o.status === 'delivered' ? '#10B981' : o.status === 'cancelled' ? '#EF4444' : '#94A3B8',
                    background: o.status === 'paid' ? '#FFFBEB' : o.status === 'shipped' ? '#F5F3FF' : o.status === 'delivered' ? '#ECFDF5' : o.status === 'cancelled' ? '#FEF2F2' : '#F1F5F9',
                  }}>
                    {o.status === 'pending_payment' ? 'En attente' : o.status === 'paid' ? 'Payee' : o.status === 'shipped' ? 'Expediee' : o.status === 'delivered' ? 'Livree' : o.status === 'cancelled' ? 'Annulee' : o.status}
                  </span>
                </div>
              </div>
            ))}

            {orders.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: '#CCC' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <p style={{ fontSize: 15, fontWeight: 600 }}>Aucune commande pour l'instant</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Lance un live ou cree une commande manuellement</p>
              </div>
            )}
          </div>
        )}

        {/* ─── CLIENTS ─── */}
        {activeTab === 'clients' && (
          <div>
            <h1 style={{ fontFamily: sf, fontSize: 22, fontWeight: 800, color: '#1A1A2E', marginBottom: 24 }}>Clients ({clients.length})</h1>

            {selectedClient && (
              <div style={{ background: '#FFF', border: '2px solid #E94560', borderRadius: 16, padding: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{selectedClient.first_name} {selectedClient.last_name}</div>
                  <button onClick={function() { setSelectedClient(null) }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div><div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 2 }}>Email</div><div style={{ fontSize: 13 }}>{selectedClient.email}</div></div>
                  <div><div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 2 }}>Telephone</div><div style={{ fontSize: 13 }}>{selectedClient.phone || '—'}</div></div>
                  <div><div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 2 }}>Ville</div><div style={{ fontSize: 13 }}>{selectedClient.city || '—'}</div></div>
                  <div><div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 2 }}>Commandes</div><div style={{ fontSize: 13, fontWeight: 700 }}>{selectedClient.order_count || 0}</div></div>
                  <div><div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 2 }}>Total depense</div><div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{(selectedClient.total_spent || 0).toFixed(2)}€</div></div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Commandes de ce client :</div>
                {orders.filter(function(o) { return o.client_email && selectedClient.email && o.client_email.toLowerCase() === selectedClient.email.toLowerCase() }).map(function(o) { return (
                  <div key={o.id} onClick={function() { setActiveTab('orders'); setSelectedOrderDetail(o); setSelectedClient(null) }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, marginBottom: 4, background: '#FAFAF8', cursor: 'pointer', border: '1px solid rgba(0,0,0,.04)' }}>
                    <div><span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>{o.reference || o.ref}</span> <span style={{ fontSize: 11, color: '#999' }}>{new Date(o.created_at).toLocaleDateString('fr-FR')}</span></div>
                    <div><span style={{ fontSize: 13, fontWeight: 700 }}>{(o.total_amount || 0).toFixed(2)}€</span></div>
                  </div>
                )})}
              </div>
            )}

            {clients.map(c => (
              <div key={c.id} onClick={function() { setSelectedClient(selectedClient?.id === c.id ? null : c) }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 14, marginBottom: 8, background: selectedClient?.id === c.id ? 'rgba(233,69,96,.04)' : 'rgba(255,255,255,.03)', border: selectedClient?.id === c.id ? '1px solid rgba(233,69,96,.3)' : '1px solid rgba(255,255,255,.06)', boxShadow: '0 2px 8px rgba(0,0,0,.04)', cursor: 'pointer', transition: 'all .15s' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{c.first_name} {c.last_name}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{c.email} · {c.phone || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{c.order_count || 0} commande{(c.order_count || 0) > 1 ? 's' : ''}</div>
                  <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>{(c.total_spent || 0).toFixed(0)}€</div>
                </div>
              </div>
            ))}
            {clients.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: '#CCC' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                <p style={{ fontSize: 15, fontWeight: 600 }}>Aucun client pour l'instant</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Les clients apparaitront apres leur premier paiement</p>
              </div>
            )}
          </div>
        )}

        {/* ─── SHIPPING / BOXTAL ─── */}
        {activeTab === 'shipping' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontFamily: sf, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#1A1A2E', marginBottom: 4 }}>Livraison</h1>
                <p style={{ fontSize: 13, color: '#999' }}>Genere tes etiquettes Mondial Relay en 1 clic</p>
              </div>
              {shipStep !== 'list' && (
                <button onClick={function() { setShipStep('list'); setShipSelectedOrder(null); setShipError(null) }}
                  style={{ padding: '10px 20px', background: '#F5F4F2', color: '#555', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>
                  ← Retour
                </button>
              )}
            </div>

            {shipStep === 'list' && (
              <div>
                {(!boxtalConfig.user || !boxtalConfig.pass) && (
                  <div style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%)', border: '1px solid #FED7AA', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>Configure Mondial Relay dans Parametres</div>
                      <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>Va dans Parametres, entre ton Code Enseigne et Cle Privee Mondial Relay</div>
                    </div>
                    <button onClick={function() { setActiveTab('settings') }}
                      style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)', color: '#FFF', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: sf, whiteSpace: 'nowrap' }}>
                      Configurer
                    </button>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(0,0,0,.04)' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#92400E' }}>{orders.filter(function(o) { return o.status === 'paid' }).length}</div>
                    <div style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>A expedier</div>
                  </div>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(0,0,0,.04)' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#8B5CF6' }}>{orders.filter(function(o) { return o.status === 'shipped' }).length}</div>
                    <div style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>En transit</div>
                  </div>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(0,0,0,.04)' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#059669' }}>{orders.filter(function(o) { return o.status === 'delivered' }).length}</div>
                    <div style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>Livrees</div>
                  </div>
                </div>
                {orders.filter(function(o) { return o.status === 'paid' }).map(function(o) {
                  return (
                    <div key={o.id} style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.04)', borderRadius: 16, padding: '18px 20px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 800 }}>{o.reference || '#'}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#FFFBEB', color: '#92400E' }}>A expedier</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{(o.total_amount || o.total || o.amount || 0).toFixed(2)}€</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#777' }}>{o.client_first_name || ''} {o.client_last_name || ''} {o.description ? ' - ' + o.description : ''}</div>
                          {o.shipping_address && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{o.shipping_address} {o.shipping_city || ''}</div>}
                          {o.relay_point && (function() { try { var rp = JSON.parse(o.relay_point); return <div style={{ fontSize: 11, color: '#6366F1', marginTop: 3, fontWeight: 600 }}>📍 Point relais : {rp.name} — {rp.address}, {rp.zipcode} {rp.city}</div> } catch(e) { return null } })()}
                        </div>
                        <button onClick={function() { startShipping(o) }}
                          style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: sf, boxShadow: '0 4px 14px rgba(26,26,46,.15)', whiteSpace: 'nowrap' }}>
                          Expedier
                        </button>
                      </div>
                    </div>
                  )
                })}
                {orders.filter(function(o) { return o.status === 'shipped' }).map(function(o) {
                  return (
                    <div key={o.id} style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.04)', borderRadius: 14, padding: '14px 18px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{o.reference || '#'}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#F5F3FF', color: '#8B5CF6' }}>Expedie</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#999' }}>{o.shipping_carrier || ''} {o.tracking_number ? '- Suivi: ' + o.tracking_number : ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {o.shipping_label_url && <button onClick={function() { window.open(o.shipping_label_url, '_blank') }} style={{ padding: '8px 14px', background: '#F5F4F2', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>Etiquette</button>}
                          <button onClick={async function() { await fetch('/api/orders/upsert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_status', orderId: o.id, fields: { status: 'delivered' } }) }); loadData(shop.id) }} style={{ padding: '8px 14px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>Livre</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {orders.filter(function(o) { return o.status === 'paid' || o.status === 'shipped' }).length === 0 && (
                  <div style={{ textAlign: 'center', padding: 60, color: '#CCC' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#999' }}>Tout est a jour !</p>
                  </div>
                )}
              </div>
            )}

            {shipStep === 'form' && shipSelectedOrder && (
              <div>
                <div style={{ background: '#FFF', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.04)', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: '#999', marginBottom: 12 }}>COMMANDE</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{shipSelectedOrder.reference || '#'} — {(shipSelectedOrder.total_amount || shipSelectedOrder.total || shipSelectedOrder.amount || 0).toFixed(2)}€</div>
                  <div style={{ fontSize: 13, color: '#777', marginTop: 4 }}>{shipSelectedOrder.client_first_name || ''} {shipSelectedOrder.client_last_name || ''}</div>
                  {shipSelectedOrder.shipping_address && <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{shipSelectedOrder.shipping_address}, {shipSelectedOrder.shipping_zipcode} {shipSelectedOrder.shipping_city}</div>}
                  {shipSelectedOrder.relay_point && (function() { try { var rp = JSON.parse(shipSelectedOrder.relay_point); return <div style={{ marginTop: 8, padding: '10px 14px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 10 }}><div style={{ fontSize: 12, fontWeight: 700, color: '#818CF8' }}>📍 Point relais choisi par le client :</div><div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginTop: 2 }}>{rp.name}</div><div style={{ fontSize: 12, color: '#777', marginTop: 1 }}>{rp.address}, {rp.zipcode} {rp.city}</div></div> } catch(e) { return null } })()}
                </div>

                <div style={{ background: '#FFF', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.04)', marginBottom: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Informations du colis</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#777', display: 'block', marginBottom: 4 }}>Poids (kg)</label>
                      <input value={shipForm.weight} onChange={function(e) { setShipForm(Object.assign({}, shipForm, { weight: e.target.value })) }}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(0,0,0,.08)', borderRadius: 10, fontFamily: sf, fontSize: 14, outline: 'none', background: '#FFF', color: '#1A1A2E' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#777', display: 'block', marginBottom: 4 }}>Longueur (cm)</label>
                      <input value={shipForm.length} onChange={function(e) { setShipForm(Object.assign({}, shipForm, { length: e.target.value })) }}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(0,0,0,.08)', borderRadius: 10, fontFamily: sf, fontSize: 14, outline: 'none', background: '#FFF', color: '#1A1A2E' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#777', display: 'block', marginBottom: 4 }}>Largeur (cm)</label>
                      <input value={shipForm.width} onChange={function(e) { setShipForm(Object.assign({}, shipForm, { width: e.target.value })) }}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(0,0,0,.08)', borderRadius: 10, fontFamily: sf, fontSize: 14, outline: 'none', background: '#FFF', color: '#1A1A2E' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#777', display: 'block', marginBottom: 4 }}>Hauteur (cm)</label>
                      <input value={shipForm.height} onChange={function(e) { setShipForm(Object.assign({}, shipForm, { height: e.target.value })) }}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(0,0,0,.08)', borderRadius: 10, fontFamily: sf, fontSize: 14, outline: 'none', background: '#FFF', color: '#1A1A2E' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#777', display: 'block', marginBottom: 4 }}>Contenu</label>
                    <input value={shipForm.description} onChange={function(e) { setShipForm(Object.assign({}, shipForm, { description: e.target.value })) }}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(0,0,0,.08)', borderRadius: 10, fontFamily: sf, fontSize: 14, outline: 'none', background: '#FFF', color: '#1A1A2E' }} placeholder="Vetements, Accessoires..." />
                  </div>

                  {shipError && <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#EF4444' }}>{shipError}</div>}

                  <button onClick={function() { generateLabel(shipSelectedOrder) }} disabled={shipOrderLoading}
                    style={{ width: '100%', padding: 16, background: shipOrderLoading ? '#DDD' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: shipOrderLoading ? 'wait' : 'pointer', fontFamily: sf, boxShadow: '0 4px 14px rgba(16,185,129,.2)' }}>
                    {shipOrderLoading ? 'Generation en cours...' : '🏷️ Generer l\'etiquette d\'expedition'}
                  </button>
                  <button onClick={async function() { await fetch('/api/orders/upsert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_status', orderId: shipSelectedOrder.id, fields: { status: 'shipped', shipped_at: new Date().toISOString() } }) }); loadData(shop.id); setShipStep('label') }}
                    style={{ width: '100%', marginTop: 8, padding: 12, background: 'transparent', color: '#999', border: '1px dashed rgba(0,0,0,.08)', borderRadius: 14, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: sf }}>
                    Marquer expediee manuellement
                  </button>
                </div>

              </div>
            )}

            {shipStep === 'label' && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(16,185,129,.25)' }}>
                  <span style={{ fontSize: 36, color: '#FFF' }}>✓</span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A2E', marginBottom: 8 }}>Expedition creee !</h2>
                <p style={{ fontSize: 14, color: '#777', marginBottom: 6 }}>
                  {shipTrackingNumber ? <span>Numero de suivi : <strong style={{ fontSize: 18, letterSpacing: 2 }}>{shipTrackingNumber}</strong></span> : 'Mondial Relay — Point Relais'}
                </p>
                <p style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>
                  Telecharge l'etiquette sur Mondial Relay Connect, imprime-la et colle-la sur ton colis.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button onClick={function() { window.open('/api/mondialrelay/label?expedition=' + (shipTrackingNumber || '') + '&ens=' + (boxtalConfig.mrEnseigne || '') + '&key=' + encodeURIComponent(boxtalConfig.mrPrivateKey || ''), '_blank') }} style={{ padding: '14px 28px', background: '#E30613', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: sf }}>🏷️ Imprimer l'etiquette</button>
                  <button onClick={function() { setShipStep('list'); setShipSelectedOrder(null) }} style={{ padding: '14px 28px', background: '#F5F4F2', color: '#555', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>Retour</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── MESSAGES ─── */}
        {activeTab === 'messages' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontFamily: sf, fontSize: 24, fontWeight: 800, color: '#1A1A2E', marginBottom: 4 }}>Messages</h1>
                <p style={{ fontSize: 13, color: '#999' }}>Messages de tes clientes depuis la page de paiement</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#999' }}>{messages.filter(function(m) { return m.status !== 'replied' }).length} non lus</span>
                <button onClick={function() { loadMessages(shop.id) }} style={{ padding: '8px 14px', background: '#F5F4F2', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>Actualiser</button>
              </div>
            </div>

            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: '#CCC' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#999' }}>Aucun message</p>
                <p style={{ fontSize: 13, marginTop: 4, color: '#BBB' }}>Les messages de tes clientes apparaitront ici</p>
              </div>
            )}

            {messages.map(function(msg) {
              var isReplied = msg.status === 'replied'
              var isOpen = messageReplyId === msg.id
              return (
                <div key={msg.id} style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.04)', borderRadius: 16, padding: '18px 22px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,.03)', borderLeft: isReplied ? '4px solid #10B981' : '4px solid #F59E0B' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{msg.sender_name || 'Client'}</div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{msg.sender_email || ''} {msg.sender_phone ? ' · ' + msg.sender_phone : ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 8, background: isReplied ? '#ECFDF5' : '#FFFBEB', color: isReplied ? '#10B981' : '#F59E0B' }}>{isReplied ? 'Repondu' : 'Nouveau'}</span>
                      <span style={{ fontSize: 11, color: '#CCC' }}>{msg.created_at ? new Date(msg.created_at).toLocaleDateString('fr-FR') : ''}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  {msg.attachments && (function() { try { var files = JSON.parse(msg.attachments); return <div style={{ marginBottom: 12 }}>{files.map(function(f, fi) { return <a key={fi} href={f.url} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#F5F4F2', borderRadius: 8, marginRight: 8, marginBottom: 4, fontSize: 12, color: '#6366F1', textDecoration: 'none', border: '1px solid rgba(0,0,0,.06)' }}>📄 {f.name} <span style={{ color: '#CCC', fontSize: 10 }}>{f.size ? (f.size/1024).toFixed(0) + 'KB' : ''}</span></a> })}</div> } catch(e) { return null } })()}

                  {msg.reply && (
                    <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '12px 16px', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 4 }}>Ta reponse :</div>
                      <div style={{ fontSize: 13, color: '#333', whiteSpace: 'pre-wrap' }}>{msg.reply}</div>
                    </div>
                  )}

                  {!isReplied && (
                    <div>
                      {isOpen ? (
                        <div>
                          <textarea value={messageReply} onChange={function(e) { setMessageReply(e.target.value) }}
                            placeholder="Ta reponse..."
                            rows={3}
                            style={{ width: '100%', padding: '12px 14px', border: '1px solid rgba(0,0,0,.08)', borderRadius: 12, fontFamily: sf, fontSize: 13, outline: 'none', resize: 'vertical', marginBottom: 8 }} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={function() { sendMessageReply(msg.id) }} disabled={messageSending}
                              style={{ padding: '10px 20px', background: messageSending ? '#DDD' : 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: messageSending ? 'wait' : 'pointer', fontFamily: sf }}>
                              {messageSending ? 'Envoi...' : 'Envoyer'}
                            </button>
                            <button onClick={function() { setMessageReplyId(null); setMessageReply('') }}
                              style={{ padding: '10px 20px', background: '#F5F4F2', color: '#555', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: sf }}>
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={function() { setMessageReplyId(msg.id); setMessageReply('') }}
                          style={{ padding: '8px 16px', background: '#F5F4F2', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>
                          Repondre
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ─── AI ASSISTANT ─── */}
        {activeTab === 'assistant' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: sf, fontSize: 24, fontWeight: 800, color: '#1A1A2E', marginBottom: 4 }}>IA Assistant</h1>
              <p style={{ fontSize: 13, color: '#999' }}>Ton assistante pour le business, le dashboard, Stripe et la logistique</p>
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                stats.pendingShip > 0 ? { icon: '🚨', label: stats.pendingShip + ' a expedier !', q: 'J\'ai ' + stats.pendingShip + ' commandes a expedier. Guide-moi etape par etape pour generer les etiquettes Mondial Relay.' } : null,
                { icon: '🔮', label: 'Analyse mon business', q: 'Analyse toutes mes donnees en detail et dis-moi exactement ce que je dois faire cette semaine. Sois ultra concrete avec des actions precises.' },
                { icon: '📡', label: 'Aide Live Monitor', q: 'Guide-moi etape par etape pour utiliser le Live Monitor. Connexion, mots-cles, tickets, impression automatique — tout.' },
                { icon: '📦', label: 'Aide expedition', q: 'Comment expedier mes commandes avec Mondial Relay ? De A a Z : etiquette, impression, colis, depot.' },
                { icon: '🚀', label: 'Booster mes ventes', q: 'Plan d\'action detaille pour cette semaine : quand faire des lives, quoi dire, comment fideliser, augmenter le panier moyen.' },
                { icon: '⚙️', label: 'Configurer', q: 'Guide-moi pour configurer ma boutique : logo, Mondial Relay, adresse, prix livraison, textes legaux. Etape par etape.' },
                { icon: '💡', label: 'Tour complet', q: 'Tour COMPLET du dashboard : chaque menu, chaque bouton, chaque fonctionnalite en detail.' },
              ].filter(Boolean).map(function(a, i) {
                return (
                  <button key={i} onClick={function() { setAiInput(a.q); }}
                    style={{ padding: '8px 14px', background: '#FFF', border: '1px solid rgba(0,0,0,.06)', borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: sf, color: '#555', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s' }}>
                    <span>{a.icon}</span> {a.label}
                  </button>
                )
              })}
            </div>

            {/* Chat messages */}
            <div ref={aiScrollRef} style={{ flex: 1, overflowY: 'auto', background: '#FFF', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.04)', marginBottom: 16 }}>
              {aiMessages.map(function(msg, i) {
                var isUser = msg.role === 'user'
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12, animation: 'fadeSlide .3s ease-out' }}>
                    <div style={{ display: 'flex', gap: 10, maxWidth: '80%', flexDirection: isUser ? 'row-reverse' : 'row' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: isUser ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #E94560 0%, #533483 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#FFF', fontSize: 14 }}>{isUser ? '👤' : '🤖'}</span>
                      </div>
                      <div style={{ padding: '12px 16px', borderRadius: 14, background: isUser ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#F8F9FA', color: isUser ? '#FFF' : '#333', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                )
              })}
              {aiLoading && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #E94560 0%, #533483 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 14 }}>🤖</span>
                  </div>
                  <div style={{ padding: '12px 16px', borderRadius: 14, background: '#F8F9FA', fontSize: 13, color: '#999' }}>
                    <span style={{ display: 'inline-block', animation: 'pulse 1s infinite' }}>Reflexion en cours...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={aiInput}
                onChange={function(e) { setAiInput(e.target.value) }}
                onKeyDown={function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage() } }}
                placeholder="Pose ta question..."
                style={{ flex: 1, padding: '14px 18px', border: '1px solid rgba(0,0,0,.08)', borderRadius: 14, fontFamily: sf, fontSize: 14, outline: 'none', background: '#FFF', transition: 'border-color .2s' }}
              />
              <button onClick={sendAiMessage} disabled={aiLoading || !aiInput.trim()}
                style={{ padding: '14px 24px', background: aiLoading || !aiInput.trim() ? '#DDD' : 'linear-gradient(135deg, #E94560 0%, #533483 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: aiLoading ? 'wait' : 'pointer', fontFamily: sf, boxShadow: aiLoading || !aiInput.trim() ? 'none' : '0 4px 14px rgba(233,69,96,.25)', transition: 'all .2s' }}>
                Envoyer
              </button>
            </div>
          </div>
        )}

        {/* ─── SETTINGS ─── */}
        {activeTab === 'settings' && (
          <div style={{ position: 'relative' }}>
            {/* Ambient background orbs */}
            <div style={{ position: 'fixed', top: '20%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,69,96,.06) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'fixed', bottom: '20%', left: '20%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,91,255,.05) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />

            {/* Header */}
            <div style={{ position: 'relative', zIndex: 1, marginBottom: 32 }}>
              <div style={{ fontFamily: sf, fontSize: 11, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: '#E94560', marginBottom: 8 }}>Configuration</div>
              <h1 style={{ fontFamily: sf, fontSize: isMobile ? 28 : 36, fontWeight: 900, color: '#0F0F1A', marginBottom: 6, letterSpacing: -1 }}>Parametres</h1>
              <p style={{ fontFamily: sf, fontSize: 14, color: '#999', lineHeight: 1.6 }}>Tout ce dont tu as besoin pour gerer ta boutique</p>
            </div>

            {/* Status ribbon */}
            <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
              {[
                { icon: '🏪', label: 'Boutique', ok: !!shop?.name, text: shop?.name || '—', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
                { icon: '📡', label: 'Abonnement', ok: shop?.subscription_status === 'active', text: shop?.subscription_status === 'active' ? 'Actif' : 'Inactif', gradient: 'linear-gradient(135deg, #E94560 0%, #FF6B6B 100%)' },
                { icon: '💳', label: 'Stripe', ok: !!stripeStatus?.chargesEnabled, text: stripeStatus?.chargesEnabled ? 'Connecte' : 'A configurer', gradient: 'linear-gradient(135deg, #635BFF 0%, #8B5CF6 100%)' },
                { icon: '📦', label: 'Mondial Relay', ok: !!(boxtalConfig.mrEnseigne && boxtalConfig.mrPrivateKey), text: boxtalConfig.mrEnseigne ? 'Connecte' : 'A configurer', gradient: 'linear-gradient(135deg, #E30613 0%, #FF4757 100%)' },
              ].map(function(c, i) { return (
                <div key={i} style={{ background: '#FFF', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.05)', padding: '18px 20px', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.ok ? '#10B981' : c.gradient, borderRadius: '24px 24px 0 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: c.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,.12)', fontSize: 18 }}>{c.icon}</div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.ok ? '#10B981' : '#F59E0B', boxShadow: c.ok ? '0 0 8px rgba(16,185,129,.4)' : '0 0 8px rgba(245,158,11,.4)', animation: 'pulse 2s infinite', marginLeft: 'auto' }} />
                  </div>
                  <div style={{ fontFamily: sf, fontSize: 10, fontWeight: 700, color: '#BBB', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>{c.label}</div>
                  <div style={{ fontFamily: sf, fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{c.text}</div>
                </div>
              )})}
            </div>

            {/* ══════ MY LIVE PAIEMENT ══════ */}
            <div style={{ position: 'relative', zIndex: 1, borderRadius: 24, padding: isMobile ? 24 : 40, marginBottom: 28, background: 'linear-gradient(135deg, #FFF 0%, #FFF5F5 30%, #F5F3FF 70%, #F0FDF4 100%)', border: '1px solid rgba(233,69,96,.1)', overflow: 'hidden', boxShadow: '0 4px 30px rgba(233,69,96,.06)' }}>
              <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,69,96,.05) 0%, transparent 70%)' }} />
              <div style={{ position: 'absolute', bottom: -80, left: '15%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,91,255,.04) 0%, transparent 70%)' }} />
              <div style={{ position: 'absolute', top: '30%', right: '10%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,.04) 0%, transparent 70%)' }} />

              <div style={{ position: 'relative', zIndex: 2 }}>
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #E94560 0%, #533483 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(233,69,96,.2)', fontSize: 28 }}>🚀</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: sf, fontSize: isMobile ? 20 : 24, fontWeight: 900, color: '#1A1A2E', letterSpacing: -0.5 }}>MY LIVE PAIEMENT</div>
                    <div style={{ fontFamily: sf, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#E94560', fontWeight: 700 }}>La solution complete pour les vendeuses en live</div>
                  </div>
                </div>

                {/* Price banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, marginTop: 20, padding: '16px 24px', background: '#FFF', borderRadius: 16, border: '1px solid rgba(0,0,0,.04)', boxShadow: '0 2px 12px rgba(0,0,0,.03)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: sf, fontSize: 36, fontWeight: 900, color: '#1A1A2E' }}>27€</span>
                    <span style={{ fontFamily: sf, fontSize: 14, color: '#999' }}>/mois</span>
                  </div>
                  <div style={{ height: 36, width: 1, background: 'rgba(0,0,0,.08)' }} />
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: sf, fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20, background: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0' }}>✓ 0% de commission</span>
                    <span style={{ fontFamily: sf, fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20, background: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0' }}>✓ Sans engagement</span>
                    <span style={{ fontFamily: sf, fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20, background: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0' }}>✓ Annule quand tu veux</span>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontFamily: sf, fontSize: 15, color: '#555', lineHeight: 1.8, marginBottom: 8 }}>
                  Un seul prix, tout inclus. Pas de frais caches, pas de commission sur tes ventes, pas de cout par transaction.
                </p>
                <p style={{ fontFamily: sf, fontSize: 14, color: '#888', lineHeight: 1.7, marginBottom: 28 }}>
                  Tu paies 27€/mois et tu as acces a tout : ta boutique en ligne, le paiement CB, le Live Monitor (exclusivite My Live Paiement, aucun autre outil ne le propose), les etiquettes Mondial Relay, le dashboard avec stats et IA.
                </p>

                {/* Features */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 32 }}>
                  {[
                    { icon: '💳', title: 'Paiement CB', desc: 'Tes clientes paient par carte, tu recois sur ton compte', color: '#635BFF', bg: '#F5F3FF', border: 'rgba(99,91,255,.08)' },
                    { icon: '📡', title: 'Live Monitor', desc: 'Detecte les "je prends" en live — introuvable ailleurs', color: '#E94560', bg: '#FFF5F5', border: 'rgba(233,69,96,.08)' },
                    { icon: '📦', title: 'Etiquettes', desc: 'Mondial Relay en 1 clic, PDF pret a imprimer', color: '#E30613', bg: '#FEF2F2', border: 'rgba(227,6,19,.08)' },
                    { icon: '📊', title: 'Dashboard', desc: 'Stats, clients, messages, assistant IA integre', color: '#1A1A2E', bg: '#F4F5FA', border: 'rgba(0,0,0,.04)' },
                  ].map(function(f, i) { return (
                    <div key={i} style={{ background: f.bg, borderRadius: 16, padding: '20px', border: '1px solid ' + f.border }}>
                      <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                      <div style={{ fontFamily: sf, fontSize: 14, fontWeight: 800, color: f.color, marginBottom: 6 }}>{f.title}</div>
                      <div style={{ fontFamily: sf, fontSize: 12, color: '#888', lineHeight: 1.6 }}>{f.desc}</div>
                    </div>
                  )})}
                </div>

                {/* CTA */}
                {shop?.subscription_status === 'active' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ padding: '14px 32px', borderRadius: 14, background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', fontFamily: sf, fontSize: 15, fontWeight: 800, color: '#FFF', boxShadow: '0 4px 14px rgba(16,185,129,.2)' }}>✓ Abonnement actif — tout est inclus</div>
                    <button onClick={function() { setActiveTab('live') }} style={{ padding: '14px 28px', background: '#FFF', color: '#1A1A2E', border: '1px solid rgba(0,0,0,.1)', borderRadius: 14, fontFamily: sf, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Ouvrir le Live Monitor →</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <button onClick={async function() { try { var res = await fetch('/api/create-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shop_id: shop.id, email: user.email }) }); var data = await res.json(); if (data.url) window.location.href = data.url; } catch(e) { alert('Erreur') } }}
                      style={{ padding: '18px 44px', background: 'linear-gradient(135deg, #E94560 0%, #FF6B6B 50%, #E94560 100%)', backgroundSize: '200% 200%', animation: 'gradientMove 3s ease infinite', color: '#FFF', border: 'none', borderRadius: 16, fontFamily: sf, fontSize: 16, fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 32px rgba(233,69,96,.2)', letterSpacing: 0.5 }}>
                      🚀 Activer My Live Paiement — 27€/mois
                    </button>
                    <div style={{ fontFamily: sf, fontSize: 12, color: '#BBB' }}>Mode Demo gratuit disponible</div>
                  </div>
                )}
              </div>
            </div>

            {/* ══════ BOUTIQUE + LOGO ══════ */}
            <div style={{ background: '#FFF', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.05)', padding: isMobile ? 22 : 32, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(15,15,26,.3)', fontSize: 22 }}>🏪</div>
                <div>
                  <h3 style={{ fontFamily: sf, fontSize: 18, fontWeight: 800, margin: 0, color: '#0F0F1A', letterSpacing: -0.5 }}>Ma boutique</h3>
                  <p style={{ fontFamily: sf, fontSize: 12, color: '#AAA', margin: 0 }}>Identite et configuration</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 24 }}>
                <div style={{ background: 'linear-gradient(135deg, #FAFAFE 0%, #F5F3FF 100%)', borderRadius: 16, padding: '16px 20px', border: '1px solid rgba(99,91,255,.08)' }}>
                  <div style={{ fontFamily: sf, fontSize: 9, fontWeight: 700, color: '#999', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Nom de la boutique</div>
                  <div style={{ fontFamily: sf, fontSize: 17, fontWeight: 800, color: '#0F0F1A' }}>{shop?.name}</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #FAFAFE 0%, #F0FDF4 100%)', borderRadius: 16, padding: '16px 20px', border: '1px solid rgba(16,185,129,.08)', cursor: 'pointer' }} onClick={function() { navigator.clipboard.writeText((typeof window !== 'undefined' ? window.location.origin : '') + '/pay/' + shop?.slug); alert('Lien copie !') }}>
                  <div style={{ fontFamily: sf, fontSize: 9, fontWeight: 700, color: '#999', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Lien de paiement — clic pour copier</div>
                  <div style={{ fontFamily: sf, fontSize: 12, fontWeight: 600, color: '#6366F1', wordBreak: 'break-all' }}>{typeof window !== 'undefined' ? window.location.origin : ''}/pay/{shop?.slug}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '20px 24px', background: 'linear-gradient(135deg, rgba(99,91,255,.03) 0%, rgba(233,69,96,.03) 100%)', borderRadius: 18, border: '2px dashed rgba(0,0,0,.08)' }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, background: '#FFF', border: '1px solid rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,.06)' }}>
                  {shopLogo ? <img src={shopLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 32, color: '#DDD' }}>🖼️</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: sf, fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#0F0F1A' }}>Logo</div>
                  <div style={{ fontFamily: sf, fontSize: 12, color: '#999', marginBottom: 12 }}>Visible par tes clientes sur la page de paiement</div>
                  <label style={{ display: 'inline-block', padding: '10px 22px', background: 'linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 100%)', color: '#FFF', borderRadius: 12, fontFamily: sf, fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(15,15,26,.2)', transition: 'all .3s' }}>
                    {logoUploading ? '⏳ Upload...' : shopLogo ? '🔄 Changer' : '➕ Ajouter un logo'}
                    <input type="file" accept="image/*" onChange={uploadLogo} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            </div>

            {/* ══════ STRIPE CONNECT ══════ */}
            <div style={{ background: '#FFF', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.05)', padding: isMobile ? 22 : 32, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #635BFF 0%, #8B5CF6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,91,255,.25)', fontSize: 22 }}>💳</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: sf, fontSize: 18, fontWeight: 800, margin: 0, color: '#0F0F1A', letterSpacing: -0.5 }}>Stripe Connect</h3>
                  <p style={{ fontFamily: sf, fontSize: 12, color: '#AAA', margin: 0 }}>Paiements CB sur ton compte bancaire</p>
                </div>
                {stripeStatus?.chargesEnabled && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 12px rgba(16,185,129,.5)' }} />}
              </div>

              {stripeStatus?.connected && stripeStatus?.chargesEnabled ? (
                <div>
                  <div style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)', borderRadius: 16, padding: '20px 24px', border: '1px solid #BBF7D0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(16,185,129,.3)' }}><span style={{ color: '#FFF', fontSize: 18 }}>✓</span></div>
                    <div>
                      <div style={{ fontFamily: sf, fontSize: 15, fontWeight: 800, color: '#059669' }}>Paiements actifs</div>
                      {stripeStatus.email && <div style={{ fontFamily: sf, fontSize: 12, color: '#10B981' }}>{stripeStatus.email}</div>}
                    </div>
                  </div>
                  <button onClick={async function() { var res = await fetch('/api/stripe-connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dashboard', shopId: shop.id }) }); var data = await res.json(); if (data.url) window.open(data.url, '_blank') }}
                    style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #F8F7F5 0%, #F0EEEC 100%)', color: '#555', border: 'none', borderRadius: 12, fontFamily: sf, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📊 Dashboard Stripe</button>
                </div>
              ) : stripeStatus?.connected ? (
                <div>
                  <div style={{ background: '#FFF7ED', borderRadius: 16, padding: '18px 22px', border: '1px solid #FED7AA', marginBottom: 16 }}>
                    <div style={{ fontFamily: sf, fontSize: 14, fontWeight: 700, color: '#92400E' }}>⏳ Finalise ta verification</div>
                  </div>
                  <button onClick={async function() { setStripeLoading(true); var res = await fetch('/api/stripe-connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', shopId: shop.id }) }); var data = await res.json(); if (data.url) window.location.href = data.url; setStripeLoading(false) }} disabled={stripeLoading}
                    style={{ padding: '14px 28px', background: stripeLoading ? '#DDD' : 'linear-gradient(135deg, #635BFF 0%, #8B5CF6 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontFamily: sf, fontSize: 14, fontWeight: 800, cursor: stripeLoading ? 'wait' : 'pointer', boxShadow: '0 8px 24px rgba(99,91,255,.25)' }}>
                    {stripeLoading ? 'Chargement...' : 'Finaliser'}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                    {[
                      { n: '01', t: 'Connecte Stripe', d: 'Gratuit, 2 minutes' },
                      { n: '02', t: 'Ajoute ton IBAN', d: 'Pour recevoir les virements' },
                      { n: '03', t: 'Recois tes paiements', d: 'Sous 2 a 7 jours' },
                    ].map(function(s, i) { return (
                      <div key={i} style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #FAFAFE 0%, #F5F3FF 100%)', borderRadius: 16, border: '1px solid rgba(99,91,255,.03)' }}>
                        <div style={{ fontFamily: sf, fontSize: 28, fontWeight: 900, color: 'rgba(99,91,255,.15)', marginBottom: 6 }}>{s.n}</div>
                        <div style={{ fontFamily: sf, fontSize: 13, fontWeight: 700, color: '#0F0F1A', marginBottom: 2 }}>{s.t}</div>
                        <div style={{ fontFamily: sf, fontSize: 11, color: '#999' }}>{s.d}</div>
                      </div>
                    )})}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <button onClick={async function() { setStripeLoading(true); try { var res = await fetch('/api/stripe-connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', shopId: shop.id }) }); var data = await res.json(); if (data.url) window.location.href = data.url; else alert(data.error || 'Erreur'); } catch(e) { alert('Erreur') } setStripeLoading(false) }} disabled={stripeLoading}
                      style={{ padding: '16px 32px', background: stripeLoading ? '#DDD' : 'linear-gradient(135deg, #635BFF 0%, #8B5CF6 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontFamily: sf, fontSize: 15, fontWeight: 800, cursor: stripeLoading ? 'wait' : 'pointer', boxShadow: '0 8px 24px rgba(99,91,255,.3)' }}>
                      {stripeLoading ? '...' : '💳 Connecter Stripe'}
                    </button>
                    <span style={{ fontFamily: sf, fontSize: 11, color: '#CCC' }}>1.5% + 0.25€ par transaction</span>
                  </div>
                </div>
              )}
            </div>

            {/* ══════ MONDIAL RELAY ══════ */}
            <div style={{ background: '#FFF', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.05)', padding: isMobile ? 22 : 32, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #E30613 0%, #FF4757 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(227,6,19,.25)', fontSize: 22 }}>📦</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: sf, fontSize: 18, fontWeight: 800, margin: 0, color: '#0F0F1A', letterSpacing: -0.5 }}>Mondial Relay</h3>
                  <p style={{ fontFamily: sf, fontSize: 12, color: '#AAA', margin: 0 }}>Etiquettes et expedition en 1 clic</p>
                </div>
                {boxtalConfig.mrEnseigne && boxtalConfig.mrPrivateKey && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 12px rgba(16,185,129,.5)' }} />}
              </div>

              {boxtalConfig.mrEnseigne && boxtalConfig.mrPrivateKey ? (
                <div style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)', borderRadius: 16, padding: '16px 22px', border: '1px solid #BBF7D0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,.4)' }} />
                  <span style={{ fontFamily: sf, fontSize: 14, fontWeight: 700, color: '#059669' }}>Connecte — {boxtalConfig.mrEnseigne}</span>
                </div>
              ) : (
                <div style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%)', borderRadius: 16, padding: '18px 22px', border: '1px solid #FED7AA', marginBottom: 20 }}>
                  <div style={{ fontFamily: sf, fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>Configure tes identifiants</div>
                  <div style={{ fontFamily: sf, fontSize: 12, color: '#B45309', lineHeight: 1.8 }}>
                    <span style={{ color: '#E30613', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }} onClick={function() { window.open('https://www.mondialrelay.fr/connexion/', '_blank') }}>mondialrelay.fr</span> → Profil → Parametres de connexion → Webservices (API)
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div>
                  <label style={{ fontFamily: sf, fontSize: 10, fontWeight: 700, color: '#BBB', display: 'block', marginBottom: 6, letterSpacing: 2 }}>CODE ENSEIGNE</label>
                  <input value={boxtalConfig.mrEnseigne || ''} onChange={function(e) { setBoxtalConfig(Object.assign({}, boxtalConfig, { mrEnseigne: e.target.value.toUpperCase().trim() })) }}
                    placeholder="CC23H7CX"
                    style={{ width: '100%', padding: '16px 18px', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, fontFamily: sf, fontSize: 18, outline: 'none', letterSpacing: 4, fontWeight: 800, textTransform: 'uppercase', background: '#FFF', transition: 'border .3s' }} />
                </div>
                <div>
                  <label style={{ fontFamily: sf, fontSize: 10, fontWeight: 700, color: '#BBB', display: 'block', marginBottom: 6, letterSpacing: 2 }}>CLE PRIVEE</label>
                  <input value={boxtalConfig.mrPrivateKey || ''} onChange={function(e) { setBoxtalConfig(Object.assign({}, boxtalConfig, { mrPrivateKey: e.target.value.trim() })) }}
                    placeholder="Diar0jh2"
                    style={{ width: '100%', padding: '16px 18px', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, fontFamily: sf, fontSize: 18, outline: 'none', fontWeight: 700, background: '#FFF', transition: 'border .3s' }} />
                </div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #FAFAFE 0%, #F8F7F5 100%)', borderRadius: 18, padding: '20px 24px', marginBottom: 24, border: '1px solid rgba(0,0,0,.04)' }}>
                <div style={{ fontFamily: sf, fontSize: 12, fontWeight: 800, color: '#777', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>📍 Adresse expediteur</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <input value={boxtalConfig.senderAddress || ''} onChange={function(e) { setBoxtalConfig(Object.assign({}, boxtalConfig, { senderAddress: e.target.value })) }}
                    placeholder="Adresse" style={{ width: '100%', padding: '12px 16px', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12, fontFamily: sf, fontSize: 13, outline: 'none', background: '#FFF' }} />
                  <input value={boxtalConfig.senderZip || ''} onChange={function(e) { setBoxtalConfig(Object.assign({}, boxtalConfig, { senderZip: e.target.value })) }}
                    placeholder="Code postal" style={{ width: '100%', padding: '12px 16px', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12, fontFamily: sf, fontSize: 13, outline: 'none', background: '#FFF' }} />
                  <input value={boxtalConfig.senderCity || ''} onChange={function(e) { setBoxtalConfig(Object.assign({}, boxtalConfig, { senderCity: e.target.value })) }}
                    placeholder="Ville" style={{ width: '100%', padding: '12px 16px', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12, fontFamily: sf, fontSize: 13, outline: 'none', background: '#FFF' }} />
                </div>
                <input value={boxtalConfig.senderPhone || ''} onChange={function(e) { setBoxtalConfig(Object.assign({}, boxtalConfig, { senderPhone: e.target.value })) }}
                  placeholder="Telephone" style={{ width: isMobile ? '100%' : 200, padding: '12px 16px', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12, fontFamily: sf, fontSize: 13, outline: 'none', background: '#FFF' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)', borderRadius: 18, border: '1px solid #BBF7D0', marginBottom: 24 }}>
                <div>
                  <div style={{ fontFamily: sf, fontSize: 14, fontWeight: 800, color: '#059669', marginBottom: 3 }}>💰 Tarif livraison</div>
                  <div style={{ fontFamily: sf, fontSize: 11, color: '#10B981' }}>Prix affiche a tes clientes · 0 = offerte</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input value={boxtalConfig.shippingPrice || ''} onChange={function(e) { setBoxtalConfig(Object.assign({}, boxtalConfig, { shippingPrice: e.target.value.replace(/[^0-9.,]/g, '') })) }}
                    placeholder="4.90"
                    style={{ width: 80, padding: '14px', border: '2px solid #BBF7D0', borderRadius: 12, fontFamily: sf, fontSize: 22, fontWeight: 900, outline: 'none', textAlign: 'center', background: '#FFF' }} />
                  <span style={{ fontFamily: sf, fontSize: 22, fontWeight: 900, color: '#059669' }}>€</span>
                </div>
              </div>

              <button onClick={saveBoxtalConfig} disabled={boxtalSaving}
                style={{ padding: '16px 36px', background: boxtalSaving ? '#DDD' : 'linear-gradient(135deg, #E30613 0%, #FF4757 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontFamily: sf, fontSize: 15, fontWeight: 800, cursor: boxtalSaving ? 'wait' : 'pointer', boxShadow: '0 8px 24px rgba(227,6,19,.25)', transition: 'all .3s' }}>
                {boxtalSaving ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
              </button>
            </div>

            {/* ══════ LEGAL ══════ */}
            <div style={{ background: '#FFF', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.05)', padding: isMobile ? 22 : 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #F5F4F2 0%, #E5E4E2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📜</div>
                <div>
                  <h3 style={{ fontFamily: sf, fontSize: 18, fontWeight: 800, margin: 0, color: '#0F0F1A', letterSpacing: -0.5 }}>Informations legales</h3>
                  <p style={{ fontFamily: sf, fontSize: 12, color: '#AAA', margin: 0 }}>Affiches en bas de ta page de paiement</p>
                </div>
              </div>

              {[
                { key: 'cgv', label: 'Conditions Generales de Vente', ph: 'Colle ici tes CGV...' },
                { key: 'mentions', label: 'Mentions legales', ph: 'Raison sociale, SIRET, adresse...' },
                { key: 'privacy', label: 'Politique de confidentialite', ph: 'Collecte et utilisation des donnees...' },
              ].map(function(f) { return (
                <div key={f.key} style={{ marginBottom: 18 }}>
                  <label style={{ fontFamily: sf, fontSize: 12, fontWeight: 700, color: '#777', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <textarea value={legalTexts[f.key] || ''} onChange={function(e) { var obj = {}; obj[f.key] = e.target.value; setLegalTexts(Object.assign({}, legalTexts, obj)) }}
                    rows={4} placeholder={f.ph}
                    style={{ width: '100%', padding: '14px 16px', border: '2px solid rgba(0,0,0,.03)', borderRadius: 14, fontFamily: sf, fontSize: 13, outline: 'none', resize: 'vertical', background: '#FFF', transition: 'border .3s' }} />
                </div>
              )})}

              <button onClick={saveLegalTexts} disabled={legalSaving}
                style={{ padding: '14px 32px', background: legalSaving ? '#DDD' : 'linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontFamily: sf, fontSize: 14, fontWeight: 800, cursor: legalSaving ? 'wait' : 'pointer', boxShadow: '0 8px 24px rgba(15,15,26,.2)' }}>
                {legalSaving ? '⏳ ...' : '💾 Sauvegarder'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
