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
  const [boxtalConfig, setBoxtalConfig] = useState({ user: '', pass: '', senderAddress: '', senderZip: '', senderCity: '', senderPhone: '' })
  const [boxtalSaving, setBoxtalSaving] = useState(false)

  // Statistics
  const [statsData, setStatsData] = useState({ daily: [], monthly: [], topProducts: [], conversionRate: 0, avgOrderValue: 0, totalRevenue7d: 0, totalOrders7d: 0 })
  const [statsPeriod, setStatsPeriod] = useState('7d')

  // AI Assistant
  const [aiMessages, setAiMessages] = useState([{ role: 'assistant', content: 'Bonjour ! Je suis ton assistante MY LIVE PAIEMENT. Pose-moi une question sur le dashboard, le Live Monitor, les paiements, la livraison, ou demande-moi des conseils pour booster tes ventes !' }])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const aiScrollRef = useRef(null)
  const [aiLastTopic, setAiLastTopic] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  // ═══ LOAD DATA ═══
  async function loadData(shopId) {
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (orderData) setOrders(orderData)

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })

    if (clientData) setClients(clientData)

    const paid = orderData?.filter(o => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') || []
    const pending = orderData?.filter(o => o.status === 'paid') || []
    setStats({
      revenue: paid.reduce((sum, o) => sum + (o.total || o.amount || 0), 0),
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
      var dayRev = dayOrders.reduce(function(s, o) { return s + (o.total || o.amount || 0) }, 0)
      daily.push({ name: dayNames[date.getDay()], revenue: dayRev, orders: dayOrders.length })
    }

    // Monthly stats (last 6 months)
    var monthly = []
    for (var m = 5; m >= 0; m--) {
      var mDate = new Date(now.getFullYear(), now.getMonth() - m, 1)
      var mKey = mDate.getFullYear() + '-' + String(mDate.getMonth() + 1).padStart(2, '0')
      var mOrders = paid.filter(function(o) { return o.created_at && o.created_at.slice(0, 7) === mKey })
      var mRev = mOrders.reduce(function(s, o) { return s + (o.total || o.amount || 0) }, 0)
      monthly.push({ name: monthNames[mDate.getMonth()], revenue: mRev, orders: mOrders.length })
    }

    // KPIs
    var rev7d = daily.reduce(function(s, d) { return s + d.revenue }, 0)
    var ord7d = daily.reduce(function(s, d) { return s + d.orders }, 0)
    var avgOrder = paid.length > 0 ? paid.reduce(function(s, o) { return s + (o.total || o.amount || 0) }, 0) / paid.length : 0
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
    const { data, error } = await supabase.from('orders').insert({
      shop_id: shop.id,
      reference: ref,
      amount: parseFloat(newOrder.amount),
      description: newOrder.description,
      status: 'pending_payment',
    }).select().single()

    if (!error && data) {
      setOrders([data, ...orders])
      setShowNewOrder(false)
      setNewOrder({ reference: '', amount: '', description: '' })
    }
  }

  // ═══════════════════════════════════════════════
  // BOXTAL SHIPPING
  // ═══════════════════════════════════════════════
  async function saveBoxtalConfig() {
    setBoxtalSaving(true)
    await supabase.from('shops').update({ boxtal_config: JSON.stringify(boxtalConfig) }).eq('id', shop.id)
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
      await supabase.from('shops').update({ logo_url: url }).eq('id', shop.id)
      setShopLogo(url)
    }
    setLogoUploading(false)
  }

  async function saveLegalTexts() {
    setLegalSaving(true)
    await supabase.from('shops').update({ legal_texts: JSON.stringify(legalTexts) }).eq('id', shop.id)
    setLegalSaving(false)
  }

  async function loadMessages(shopId) {
    var { data } = await supabase.from('messages').select('*').eq('shop_id', shopId).order('created_at', { ascending: false })
    if (data) setMessages(data)
  }

  async function sendMessageReply(msgId) {
    if (!messageReply.trim()) return
    setMessageSending(true)
    await supabase.from('messages').update({ reply: messageReply, replied_at: new Date().toISOString(), status: 'replied' }).eq('id', msgId)
    setMessageReply('')
    setMessageReplyId(null)
    loadMessages(shop.id)
    setMessageSending(false)
  }

  async function getShippingQuotes(order) {
    if (!boxtalConfig.user || !boxtalConfig.pass) {
      setShipError('Configure d\'abord tes identifiants Boxtal dans Parametres.')
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
      if (data.error) {
        setShipError(data.error)
      } else {
        setShipQuotes(data.quotes || [])
      }
    } catch (err) {
      setShipError('Erreur de connexion au service Boxtal')
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
          reference: order.reference || order.id,
        })
      })
      var data = await res.json()
      if (data.error) {
        setShipError(data.error)
      } else {
        setShipLabel(data.label_url || null)
        setShipTrackingNumber(data.tracking || data.reference || null)
        await supabase.from('orders').update({
          status: 'shipped',
          shipped_at: new Date().toISOString(),
          tracking_number: data.tracking || data.reference || '',
          shipping_carrier: quote.operator_label + ' - ' + quote.service_label,
          shipping_label_url: data.label_url || '',
        }).eq('id', order.id)
        loadData(shop.id)
        setShipStep('label')
      }
    } catch (err) {
      setShipError('Erreur lors de la creation de l\'envoi')
    }
    setShipOrderLoading(false)
  }

  function startShipping(order) {
    setShipSelectedOrder(order)
    setShipStep('form')
    setShipQuotes([])
    setShipSelectedQuote(null)
    setShipLabel(null)
    setShipError(null)
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
          supabase.from('orders').insert({
            shop_id: shop.id,
            reference: ref,
            amount: 0,
            description: `Live: @${commentData.username} — "${commentData.text}"`,
            status: 'pending_payment',
            source: 'live_monitor',
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
      var result = getAiReply(userMsg, aiLastTopic)
      if (result.topic) setAiLastTopic(result.topic)
      setAiMessages(function(prev) { return prev.concat([{ role: 'assistant', content: result.text }]) })
      setAiLoading(false)
    }, 500)
  }

  function getAiReply(msg, lastTopic) {
    var q = msg.toLowerCase()
    var sn = shop ? shop.name : 'ta boutique'
    var rev = stats.revenue || 0
    var oc = stats.orderCount || 0
    var cc = stats.clientCount || 0
    var pe = stats.pendingShip || 0
    var avg = oc > 0 ? (rev / oc) : 0
    var r7 = statsData.totalRevenue7d || 0
    var o7 = statsData.totalOrders7d || 0

    // ═══ FOLLOW-UP : quand la pro dit qu'elle n'y arrive pas ═══
    var isStuck = q.match(/j.?y arrive pas|je comprends pas|ca marche pas|pas compris|aide.moi|comment faire|c.?est quoi|explique|plus d.?info|detail|etape par etape|pas clair|bloque|perdu|help/)
    var isYes = q.match(/^(oui|ok|d.?accord|vas.?y|go|continue|dis.moi|je veux|montre)/)
    var isNo = q.match(/^(non|pas|merci|c.?est bon|ok merci|compris)/)

    if (isNo) return { text: 'Parfait ! N\'hesite pas si tu as d\'autres questions. Je suis la !', topic: null }

    if ((isStuck || isYes) && lastTopic) {
      if (lastTopic === 'live') {
        return { topic: 'live', text:
          'Pas de panique, voici etape par etape :\n\n' +
          '\u{1F534} ETAPE 1 : Clique sur "Live Monitor" dans le menu a gauche\n\n' +
          '\u{1F534} ETAPE 2 : Tu vois 2 icones : TikTok et Instagram. Clique sur celui que tu utilises.\n\n' +
          '\u{1F534} ETAPE 3 : En bas tu as 2 boutons :\n' +
          '   - "Mode Demo" (violet) = pour tester sans etre en live\n' +
          '   - "Mode Reel" = pour ton vrai live\n\n' +
          '\u{1F534} ETAPE 4 : Si mode reel, entre ton pseudo TikTok SANS le @\n' +
          '   Exemple : si tu es @maboutique, ecris juste "maboutique"\n\n' +
          '\u{1F534} ETAPE 5 : Clique le gros bouton rouge "Connecter au live"\n\n' +
          'Ca y est ! Les commandes vont apparaitre automatiquement. Essaie d\'abord en mode Demo pour te familiariser !\n\n' +
          'Tu veux que je t\'explique autre chose sur le live ?' }
      }

      if (lastTopic === 'stripe') {
        return { topic: 'stripe', text:
          'Ok je te guide pas a pas :\n\n' +
          '\u{1F534} ETAPE 1 : Va dans l\'onglet "Parametres" (icone roue dentee dans le menu)\n\n' +
          '\u{1F534} ETAPE 2 : Descends jusqu\'a la section "Stripe Connect"\n\n' +
          '\u{1F534} ETAPE 3 : Clique sur le bouton violet "Connecter Stripe"\n\n' +
          '\u{1F534} ETAPE 4 : Tu es redirigee vers Stripe. La il faut :\n' +
          '   - Creer un compte Stripe (gratuit) ou te connecter\n' +
          '   - Renseigner ton IBAN pour recevoir les virements\n' +
          '   - Valider ton identite (carte d\'identite)\n\n' +
          '\u{1F534} ETAPE 5 : Une fois fait, tu reviens sur le dashboard et c\'est connecte !\n\n' +
          'Apres ca, quand tu envoies ton lien de paiement, l\'argent arrive directement sur ton compte bancaire sous 2-7 jours.\n\n' +
          'Tu as une question sur une etape en particulier ?' }
      }

      if (lastTopic === 'impression') {
        return { topic: 'impression', text:
          'Je t\'explique en detail :\n\n' +
          '\u{1F534} D\'abord, il faut etre connecte au live (ou en mode demo)\n\n' +
          '\u{1F534} En haut de l\'ecran du Live Monitor, tu vois les boutons :\n' +
          '   - "Tickets" (bleu) : ouvre la fenetre des tickets\n' +
          '   - "Impression auto" : quand c\'est rouge = actif\n\n' +
          '\u{1F534} Pour configurer ton imprimante MUNBYN :\n' +
          '   1. Branche l\'imprimante en USB\n' +
          '   2. Installe le driver MUNBYN si pas deja fait\n' +
          '   3. Dans les reglages imprimante de ton PC :\n' +
          '      - Taille papier : 50.8mm x 50.8mm (ou 2x2 pouces)\n' +
          '      - Orientation : portrait\n\n' +
          '\u{1F534} Pour tester : lance le mode Demo, attends qu\'un ticket arrive, clique "Imprimer"\n\n' +
          'Si ca imprime trop grand ou trop petit, verifie la taille du papier dans les parametres de l\'imprimante.' }
      }

      if (lastTopic === 'expedition') {
        return { topic: 'expedition', text:
          'Voici comment expedier concretement :\n\n' +
          '\u{1F534} ETAPE 1 : Va dans l\'onglet "Livraison"\n\n' +
          '\u{1F534} ETAPE 2 : Tu vois la liste des commandes payees a expedier\n\n' +
          '\u{1F534} ETAPE 3 : Pour chaque commande :\n' +
          '   - Choisis le transporteur (Mondial Relay, Colissimo...)\n' +
          '   - L\'etiquette se genere automatiquement\n' +
          '   - Imprime-la et colle-la sur le colis\n\n' +
          '\u{1F534} ETAPE 4 : Depose le colis au point relais ou en bureau de poste\n\n' +
          'Conseils pro :\n' +
          '\u{2022} Emballe le soir meme du live\n' +
          '\u{2022} Ajoute un petit mot manuscrit (les clientes adorent)\n' +
          '\u{2022} Prends une photo du colis et envoie-la a ta cliente\n' +
          '\u{2022} Envoie le numero de suivi par message' }
      }

      if (lastTopic === 'commandes') {
        return { topic: 'commandes', text:
          'Je te montre comment gerer tes commandes :\n\n' +
          '\u{1F534} VOIR LES COMMANDES :\n' +
          'Va dans l\'onglet "Commandes". Tu vois la liste avec reference, montant et statut.\n\n' +
          '\u{1F534} COMPRENDRE LES STATUTS :\n' +
          '\u{2022} Gris "En attente" = le lien de paiement a ete envoye mais la cliente n\'a pas encore paye\n' +
          '\u{2022} Orange "Payee" = paiement recu ! Il faut expedier\n' +
          '\u{2022} Violet "Expediee" = colis envoye, en cours de livraison\n' +
          '\u{2022} Vert "Livree" = la cliente a recu son colis\n\n' +
          '\u{1F534} ASTUCE :\n' +
          'Apres chaque live, va dans le suivi des paiements pour voir qui n\'a pas encore paye et relance-les !' }
      }

      if (lastTopic === 'stats') {
        return { topic: 'stats', text:
          'Voici comment lire tes statistiques :\n\n' +
          '\u{1F534} VA DANS l\'onglet "Statistiques"\n\n' +
          '\u{1F534} EN HAUT : 4 chiffres cles\n' +
          '\u{2022} CA 7 jours = ton chiffre d\'affaires de la semaine\n' +
          '\u{2022} Commandes 7j = combien de ventes cette semaine\n' +
          '\u{2022} Panier moyen = combien depense chaque cliente en moyenne\n' +
          '\u{2022} Taux conversion = % de commandes payees\n\n' +
          '\u{1F534} LES GRAPHIQUES :\n' +
          '\u{2022} Barres violettes = chiffre d\'affaires par jour\n' +
          '\u{2022} Barres roses = nombre de commandes par jour\n' +
          '\u{2022} Tu peux changer la periode : 7 jours, 30 jours, 6 mois\n\n' +
          'Tu as actuellement ' + oc + ' commandes pour ' + rev.toFixed(0) + '\u20ac de CA.' }
      }

      if (lastTopic === 'motscles') {
        return { topic: 'motscles', text:
          'Pas a pas pour les mots-cles :\n\n' +
          '\u{1F534} ETAPE 1 : Va dans le Live Monitor\n\n' +
          '\u{1F534} ETAPE 2 : Avant de lancer le live, clique sur le bouton "Mots-cles"\n\n' +
          '\u{1F534} ETAPE 3 : Tu vois la liste des mots-cles actuels. Pour chaque mot-cle :\n' +
          '   - Clique sur la croix X pour le supprimer\n' +
          '   - Tape un nouveau mot et clique "Ajouter" pour en creer un\n\n' +
          '\u{1F534} BONS MOTS-CLES : "jp", "je prends", "pour moi", "je le veux"\n' +
          '\u{1F534} MAUVAIS MOTS-CLES : "oui", "moi", "ok" (trop de faux positifs)\n\n' +
          'Le systeme detecte les mots entiers. "jp" ne sera pas detecte dans "aujourd\'hui" par exemple.' }
      }

      if (lastTopic === 'booster') {
        return { topic: 'booster', text:
          'Voici un plan d\'action concret pour cette semaine :\n\n' +
          '\u{1F4C5} LUNDI : Prepare tes produits, fais de belles photos pour les stories\n\n' +
          '\u{1F4C5} MARDI 20h : Live ! Commence par les nouveautes\n' +
          '   - Titre : "ARRIVAGE + PROMOS \u{1F525}"\n' +
          '   - Objectif : au moins 30 min de live\n\n' +
          '\u{1F4C5} MERCREDI : Emballe et expedie les commandes du live\n\n' +
          '\u{1F4C5} JEUDI 20h : 2eme live de la semaine\n' +
          '   - Repropose les invendus + nouvelles pieces\n\n' +
          '\u{1F4C5} VENDREDI : Expeditions + stories "colis du jour"\n\n' +
          '\u{1F4C5} SAMEDI : Story recap de la semaine + teasing prochain live\n\n' +
          'La regularite c\'est la CLE. 2 lives/semaine minimum. Tes viewers doivent savoir quand tu es en live !' }
      }

      return { text: 'Dis-moi exactement sur quoi tu bloques et je te guide etape par etape ! Tu peux me demander :\n' +
        '\u{2022} "aide live" — pour le Live Monitor\n' +
        '\u{2022} "aide stripe" — pour les paiements\n' +
        '\u{2022} "aide impression" — pour les tickets\n' +
        '\u{2022} "aide expedition" — pour la livraison\n' +
        '\u{2022} "aide stats" — pour les statistiques', topic: lastTopic }
    }

    if (q.match(/tableau|dashboard|vue d.ensemble|accueil/)) {
      return { topic: 'dashboard', text:
        '\u{1F4CA} Le Tableau de bord — ta page d\'accueil !\n\n' +
        '\u{2022} Chiffre d\'affaires : ' + rev.toFixed(0) + '\u20ac\n' +
        '\u{2022} Commandes : ' + oc + '\n' +
        '\u{2022} Clients : ' + cc + '\n' +
        '\u{2022} A expedier : ' + pe + '\n\n' +
        'Regarde cette page tous les matins pour suivre ton activite !\n\n' +
        'Tu veux que je t\'explique un element en detail ?' }
    }

    if (q.match(/live|monitor|tiktok|instagram|connexion|lancer/)) {
      return { topic: 'live', text:
        '\u{1F4E1} Le Live Monitor capte les commandes automatiquement !\n\n' +
        '1. Va dans l\'onglet Live Monitor\n' +
        '2. Choisis TikTok ou Instagram\n' +
        '3. Entre ton pseudo\n' +
        '4. Lance la connexion\n\n' +
        'Mode Demo disponible pour tester sans etre en live.\n\n' +
        'Tu veux que je t\'explique etape par etape ? Dis "oui" !' }
    }

    if (q.match(/mot.cl[eE]|detection|keyword|detect/)) {
      return { topic: 'motscles', text:
        '\u{1F3AF} Les mots-cles detectent les commandes dans le chat.\n\n' +
        'Quand un viewer ecrit "je prends" ou "jp", ca cree un ticket.\n\n' +
        'Tu peux ajouter/supprimer des mots-cles dans les reglages du Live Monitor.\n\n' +
        'Tu veux que je t\'explique comment les configurer ?' }
    }

    if (q.match(/imprim|ticket|etiquette|thermique|print/)) {
      return { topic: 'impression', text:
        '\u{1F5A8} Impression tickets 50.8mm x 50.8mm\n\n' +
        '\u{2022} Impression auto : chaque ticket s\'imprime en temps reel\n' +
        '\u{2022} Imprimer tout : tous les tickets d\'un coup\n\n' +
        'Clique "Tickets" dans le Live Monitor pour ouvrir la fenetre.\n\n' +
        'Besoin d\'aide pour configurer l\'imprimante ? Dis "oui" !' }
    }

    if (q.match(/stat|graphique|chiffre|performance|analyse|resultat/)) {
      var r = '\u{1F4C8} Tes stats ' + sn + ' :\n\n'
      r += 'CA 7 jours : ' + r7.toFixed(0) + '\u20ac | Commandes 7j : ' + o7 + '\n'
      r += 'CA total : ' + rev.toFixed(0) + '\u20ac | Panier moyen : ' + avg.toFixed(0) + '\u20ac\n\n'
      if (oc === 0) r += 'Lance ton premier live pour remplir tes stats !'
      else if (avg < 25) r += 'Conseil : panier moyen de ' + avg.toFixed(0) + '\u20ac — propose des lots pour l\'augmenter !'
      else if (avg < 50) r += 'Bon panier moyen ! Ventes flash avec compte a rebours pour aller plus haut.'
      else r += 'Excellent ! ' + avg.toFixed(0) + '\u20ac de panier moyen. Fidelise tes meilleures clientes.'
      r += '\n\nTu veux que je t\'explique comment lire les graphiques ?'
      return { topic: 'stats', text: r }
    }

    if (q.match(/commande|order|gestion|suivi|pay[eé]|qui.*pas.*pay|impay|relance/)) {
      var r = '\u{1F4CB} Commandes : ' + oc + ' au total'
      if (pe > 0) r += ' dont ' + pe + ' a expedier\n\n'
      else r += '\n\n'
      r += 'Statuts : En attente (pas paye) > Payee > Expediee > Livree\n\n'
      r += '\u{1F4A1} Pour voir qui n\'a pas paye :\n'
      r += 'Va dans l\'onglet Commandes — les commandes "En attente" sont celles pas encore payees.\n'
      r += 'Apres un live, va dans le Live Monitor > "Suivi paiements" pour croiser les tickets live avec les paiements recus.\n\n'
      r += 'Astuce : relance les non-payees dans les 24h !'
      return { topic: 'commandes', text: r }
    }

    if (q.match(/stripe|paiement|argent|carte|bancaire|connect|virement/)) {
      return { topic: 'stripe', text:
        '\u{1F4B3} Stripe — systeme de paiement\n\n' +
        '1. Parametres > Stripe Connect\n' +
        '2. Connecte ton compte Stripe\n' +
        '3. Tes clientes paient par carte\n' +
        '4. Argent sur ton compte en 2-7 jours\n\n' +
        'Envoie le lien de paiement dans les 30min apres le live !\n\n' +
        'Tu veux un guide pas a pas ? Dis "oui" !' }
    }

    if (q.match(/livr|expedi|colis|boxtal|mondial|colissimo|envoi|relais/)) {
      var r = '\u{1F4E6} Expedition\n\n'
      r += '\u{2022} Mondial Relay — le moins cher (point relais)\n'
      r += '\u{2022} Colissimo — rapide (domicile)\n'
      r += '\u{2022} Boxtal — compare les prix\n\n'
      if (pe > 0) r += '\u{26A0} Tu as ' + pe + ' commande(s) a expedier !\n\n'
      r += 'Besoin d\'aide pour expedier ? Dis "oui" !'
      return { topic: 'expedition', text: r }
    }

    if (q.match(/abonnement|prix|tarif|forfait|27|mensuel/)) {
      return { topic: null, text:
        '\u{1F48E} 27\u20ac/mois — 0% commission — sans engagement\n\n' +
        'Inclus : Dashboard, Live Monitor, Impression, Stats, Assistant, Commandes, Stripe\n\n' +
        'Quelques ventes suffisent pour rentabiliser !' }
    }

    if (q.match(/boost|vente|strateg|augment|conseil|astuce|evoluer|developper|croissance|grandir|ameliorer/)) {
      if (oc < 10) {
        return { topic: 'booster', text:
          '\u{1F680} Tu debutes — les bases :\n\n' +
          '1. 2-3 lives/semaine a heures fixes\n' +
          '2. Titres accrocheurs : "ARRIVAGE -50%"\n' +
          '3. Reponds a CHAQUE commentaire\n' +
          '4. Urgence : "Il en reste 3 !"\n' +
          '5. Montre l\'emballage en live\n\n' +
          'Tu veux un planning semaine concret ? Dis "oui" !' }
      } else if (oc < 50) {
        return { topic: 'booster', text:
          '\u{1F680} ' + oc + ' commandes, bravo ! Pour accelerer :\n\n' +
          '1. Lots : "2 articles = -20%" (panier moyen : ' + avg.toFixed(0) + '\u20ac)\n' +
          '2. Stories 2h avant le live\n' +
          '3. Groupe WhatsApp VIP\n' +
          '4. Cross-selling\n' +
          '5. Teste 20h-22h\n\n' +
          'Tu veux un plan d\'action semaine ? Dis "oui" !' }
      } else {
        return { topic: 'booster', text:
          '\u{1F680} ' + oc + ' commandes, tu es une pro ! Pour scaler :\n\n' +
          '1. Recrute pour emballer\n' +
          '2. Multi-plateforme TikTok + Instagram\n' +
          '3. Exclusivites live\n' +
          '4. Programme VIP (' + cc + ' clients)\n' +
          '5. Collabs vendeuses\n\n' +
          'Tu veux un plan semaine ? Dis "oui" !' }
      }
    }

    if (q.match(/client|fideli|acheteu|audience/)) {
      return { topic: null, text:
        '\u{1F465} ' + cc + ' clients\n\n' +
        '\u{2022} Message perso apres chaque achat\n' +
        '\u{2022} Reduction 2e achat\n' +
        '\u{2022} Groupe prive meilleures clientes\n' +
        '\u{2022} Note preferences (taille, style)\n' +
        '\u{2022} Avant-premieres nouveaux arrivages' }
    }

    if (q.match(/^(bonjour|salut|hello|coucou|hey|bjr)/)) {
      return { topic: null, text:
        'Coucou ! Je suis ton assistante MY LIVE PAIEMENT !\n\n' +
        'Je peux t\'aider avec :\n' +
        '\u{1F4CA} Dashboard et stats\n' +
        '\u{1F4E1} Live Monitor\n' +
        '\u{1F4B3} Paiements Stripe\n' +
        '\u{1F4E6} Expeditions\n' +
        '\u{1F680} Conseils business\n\n' +
        'Qu\'est-ce que je peux faire pour toi ?' }
    }

    if (q.match(/merci|parfait|super|genial|top/)) {
      return { topic: null, text: 'Avec plaisir ! N\'hesite pas, je suis la pour ' + sn + ' !' }
    }

    if (q.match(/param|config|reglage|modifier/)) {
      return { topic: null, text:
        'Dans Parametres :\n' +
        '\u{2022} Infos boutique\n' +
        '\u{2022} Serveur Live Monitor\n' +
        '\u{2022} Abonnement\n' +
        '\u{2022} Stripe Connect' }
    }

    return { topic: null, text:
      'Je peux t\'aider sur :\n\n' +
      '\u{1F4CA} Dashboard — dis "dashboard"\n' +
      '\u{1F4E1} Live Monitor — dis "live"\n' +
      '\u{1F4C8} Statistiques — dis "stats"\n' +
      '\u{1F4CB} Commandes — dis "commandes"\n' +
      '\u{1F4B3} Paiements — dis "stripe"\n' +
      '\u{1F4E6} Livraison — dis "expedition"\n' +
      '\u{1F680} Booster ventes — dis "conseils"\n' +
      '\u{1F3AF} Mots-cles — dis "mots-cles"\n' +
      '\u{1F5A8} Impression — dis "tickets"' }
  }

  // Auto-scroll AI chat
  useEffect(function() {
    if (aiScrollRef.current) aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight
  }, [aiMessages])

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '2px solid rgba(0,0,0,.08)',
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
              <button type="submit" style={{ width: '100%', padding: '18px 24px', background: 'linear-gradient(135deg, #1A1A1A 0%, #333 100%)', color: '#FFF', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.5px', boxShadow: '0 4px 14px rgba(0,0,0,.15)', transition: 'transform .15s, box-shadow .15s' }}>Se connecter</button>
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
              <button type="submit" style={{ width: '100%', padding: '18px 24px', background: 'linear-gradient(135deg, #1A1A1A 0%, #333 100%)', color: '#FFF', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.5px', boxShadow: '0 4px 14px rgba(0,0,0,.15)', transition: 'transform .15s, box-shadow .15s' }}>Créer ma boutique</button>
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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: sf }}>
      <style dangerouslySetInnerHTML={{ __html: 'button{transition:all .2s ease!important}button:hover{transform:translateY(-1px)!important;filter:brightness(1.08)!important}button:active{transform:translateY(0) scale(.98)!important}input:focus{border-color:#E94560!important;box-shadow:0 0 0 3px rgba(233,69,96,.1)!important}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}@keyframes fadeSlide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}.card-hover:hover{box-shadow:0 8px 30px rgba(0,0,0,.08)!important;transform:translateY(-2px)!important}' }} />
      {/* ═══ SIDEBAR PRO ═══ */}
      <aside style={{ width: sidebarCollapsed ? 70 : 240, background: 'linear-gradient(180deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)', padding: sidebarCollapsed ? '20px 10px' : '24px 16px', flexShrink: 0, display: 'flex', flexDirection: 'column', transition: 'width .3s ease', position: 'relative', boxShadow: '4px 0 24px rgba(0,0,0,.15)' }}>
        
        {/* Collapse button */}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ position: 'absolute', right: -12, top: 32, width: 24, height: 24, borderRadius: '50%', background: '#FFF', border: '2px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10, zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
          {sidebarCollapsed ? '→' : '←'}
        </button>
        
        {/* Logo */}
        <div style={{ marginBottom: 32, padding: '0 4px', textAlign: sidebarCollapsed ? 'center' : 'left' }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #E94560 0%, #533483 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: sidebarCollapsed ? '0 auto' : '0', boxShadow: '0 4px 12px rgba(233,69,96,.3)' }}>
            <span style={{ color: '#FFF', fontSize: 14, fontWeight: 900, letterSpacing: 1 }}>ML</span>
          </div>
          {!sidebarCollapsed && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 2 }}>MY LIVE</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#FFF', letterSpacing: 1 }}>PAIEMENT</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1 }}>
          {!sidebarCollapsed && <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,.25)', marginBottom: 8, paddingLeft: 12 }}>MENU</div>}
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? 0 : 12, padding: sidebarCollapsed ? '12px 0' : '11px 14px', borderRadius: 10, marginBottom: 2,
                background: activeTab === tab.id ? 'rgba(233,69,96,.15)' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: sf, textAlign: 'left',
                borderLeft: activeTab === tab.id ? '3px solid #E94560' : '3px solid transparent',
                transition: 'all .2s ease', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              }}>
              <span style={{ fontSize: 18, minWidth: 24, textAlign: 'center' }}>{tab.icon}</span>
              {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400, color: activeTab === tab.id ? '#FFF' : 'rgba(255,255,255,.6)', transition: 'color .2s' }}>{tab.label}</span>}
              {tab.live && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', marginLeft: 'auto', animation: 'pulse 1.5s infinite', boxShadow: '0 0 8px rgba(239,68,68,.5)' }} />}
              {!sidebarCollapsed && tab.badge > 0 && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: '#FFF', background: '#E94560', borderRadius: 10, padding: '2px 7px', minWidth: 18, textAlign: 'center' }}>{tab.badge}</span>}
            </button>
          ))}
        </nav>

        {/* User section */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#FFF', fontSize: 13, fontWeight: 700 }}>{(shop?.name || 'M').charAt(0).toUpperCase()}</span>
            </div>
            {!sidebarCollapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, color: '#FFF', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shop?.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
              style={{ marginTop: 12, width: '100%', fontSize: 12, color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontFamily: sf, transition: 'all .2s' }}>
              Déconnexion
            </button>
          )}
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{ flex: 1, padding: '28px 36px', background: '#F8F9FC', overflowY: 'auto' }}>

        {/* ─── OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <div>
            {/* Welcome banner */}
            <div style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)', borderRadius: 20, padding: '28px 32px', marginBottom: 28, color: '#FFF', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(233,69,96,.15)' }} />
              <div style={{ position: 'absolute', right: 40, bottom: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(102,126,234,.1)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h1 style={{ fontFamily: sf, fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Bonjour, {shop?.name} !</h1>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.6)' }}>Voici le résumé de ton activité</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { l: "Chiffre d'affaires", v: stats.revenue.toFixed(0) + '\u20ac', icon: '💰', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: 'rgba(102,126,234,.2)' },
                { l: 'Commandes', v: stats.orderCount, icon: '📦', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', shadow: 'rgba(245,87,108,.2)' },
                { l: 'A expedier', v: stats.pendingShip, icon: '🚚', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', shadow: 'rgba(79,172,254,.2)', alert: stats.pendingShip > 0 },
                { l: 'Clients', v: stats.clientCount, icon: '👥', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: 'rgba(67,233,123,.2)' },
              ].map((s, i) => (
                <div key={i} className="card-hover" style={{ background: '#FFF', borderRadius: 16, padding: '20px 18px', boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.03)', cursor: 'default', transition: 'all .3s ease', position: 'relative', overflow: 'hidden' }}>
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
              <button onClick={() => setShowNewOrder(true)} style={{ padding: '10px 20px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf, boxShadow: '0 2px 8px rgba(0,0,0,.06)', transition: 'transform .15s' }}>
                + Nouvelle commande
              </button>
            </div>

            {/* New order form */}
            {showNewOrder && (
              <form onSubmit={handleCreateOrder} style={{ background: '#FFF', border: '2px solid #1A1A1A', borderRadius: 14, padding: 18, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 10, marginBottom: 12 }}>
                  <input placeholder="Réf (auto)" value={newOrder.reference} onChange={e => setNewOrder({...newOrder, reference: e.target.value})} style={inputStyle} />
                  <input placeholder="Montant €" type="number" step="0.01" required value={newOrder.amount} onChange={e => setNewOrder({...newOrder, amount: e.target.value})} style={inputStyle} />
                  <input placeholder="Description (optionnel)" value={newOrder.description} onChange={e => setNewOrder({...newOrder, description: e.target.value})} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" style={{ padding: '10px 20px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>Créer</button>
                  <button type="button" onClick={() => setShowNewOrder(false)} style={{ padding: '10px 20px', background: '#F5F4F2', color: '#777', border: '2px solid rgba(0,0,0,.06)', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>Annuler</button>
                </div>
              </form>
            )}

            {/* Orders list */}
            {orders.slice(0, 10).map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 10, marginBottom: 4, background: '#FFF' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{o.reference || o.ref}</span>
                  <span style={{ fontSize: 13, color: '#999' }}>{o.client_last_name ? `${o.client_first_name} ${o.client_last_name}` : '—'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{(o.total_amount || o.total || o.amount || 0).toFixed(2)}€</span>
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', marginBottom: 4 }}>Erreur de connexion</div>
                    <div style={{ fontSize: 13, color: '#991B1B' }}>{liveError}</div>
                    <button onClick={() => setLiveError(null)} style={{ marginTop: 8, fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: sf, fontWeight: 600 }}>✕ Fermer</button>
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
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{p.label}</div>
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
                    <button onClick={() => setLiveError(null)} style={{ marginTop: 6, fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: sf, fontWeight: 600 }}>✕ Fermer</button>
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
                    style={{ fontSize: 13, fontWeight: 600, color: '#555', background: '#F5F4F2', border: '2px solid rgba(0,0,0,.04)', borderRadius: 12, padding: '10px 16px', cursor: 'pointer', fontFamily: sf }}>
                    {showKeywordConfig ? '▾' : '▸'} ⚙️ Mots-clés de détection ({keywords.length})
                  </button>

                  {showKeywordConfig && (
                    <div style={{ marginTop: 12, background: '#FFF', border: '2px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 16, textAlign: 'left' }}>
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
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 4 }}>💡 Mode réel</div>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: 14, textAlign: 'center', border: '1px solid rgba(0,0,0,.04)' }}>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{liveOrders.length}</div>
                    <div style={{ fontSize: 10, color: '#999' }}>Commandes</div>
                  </div>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: 14, textAlign: 'center', border: '1px solid rgba(0,0,0,.04)' }}>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{allComments.length}</div>
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
                  <div style={{ marginTop: 24, background: '#FFF', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E' }}>Suivi des paiements</div>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Croise les tickets live avec les commandes payees</div>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ textAlign: 'center', padding: '8px 16px', borderRadius: 10, background: '#ECFDF5' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981' }}>{liveOrders.filter(function(lo) { return orders.some(function(o) { return (o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') && o.description && o.description.toLowerCase().indexOf(lo.user.toLowerCase()) !== -1 }) }).length}</div>
                          <div style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>Payees</div>
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
                              {!isPaid && <div style={{ fontSize: 10, color: '#F59E0B', marginTop: 4 }}>Relancer</div>}
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
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '2px 8px', borderRadius: 8, background: '#FFF7ED', color: '#F59E0B', border: '1px solid #FED7AA' }}>DÉMO</span>
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
                      style={{ padding: '8px 16px', background: '#FFF', color: '#DC2626', border: '2px solid #FECACA', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: sf, boxShadow: '0 2px 8px rgba(0,0,0,.06)', transition: 'transform .15s' }}>
                      Déconnecter
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#EF4444' }}>{liveOrders.length}</div>
                    <div style={{ fontSize: 10, color: '#999' }}>Commandes</div>
                  </div>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{allComments.length}</div>
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
                    <button onClick={() => setLiveFilter('all')} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf, background: liveFilter === 'all' ? '#1A1A1A' : '#F5F4F2', color: liveFilter === 'all' ? '#FFF' : '#999' }}>Tous ({allComments.length})</button>
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
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#10B981' }}>{liveOrders.filter(function(lo) { return orders.some(function(o) { return (o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') && o.description && o.description.toLowerCase().indexOf(lo.user.toLowerCase()) !== -1 }) }).length}</div>
                            <div style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>Payees</div>
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
                          <span style={{ fontSize: 12, fontWeight: 700 }}>@{c.user}</span>
                          {c.isPurchase && <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, padding: '2px 6px', borderRadius: 10, background: '#F59E0B', color: '#FFF' }}>COMMANDE</span>}
                          {c.isGift && <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, padding: '2px 6px', borderRadius: 10, background: '#EC4899', color: '#FFF' }}>CADEAU</span>}
                          <span style={{ fontSize: 10, color: '#CCC', marginLeft: 'auto' }}>{c.time}</span>
                        </div>
                        <div style={{ fontSize: 13, color: c.isPurchase ? '#555' : c.isGift ? '#BE185D' : '#999', marginTop: 2 }}>{c.text}</div>
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
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A' }}>#{o.orderNum}</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { l: 'CA 7 jours', v: statsData.totalRevenue7d.toFixed(0) + '\u20ac', icon: '💰', color: '#667eea' },
                { l: 'Commandes 7j', v: statsData.totalOrders7d, icon: '📦', color: '#f5576c' },
                { l: 'Panier moyen', v: statsData.avgOrderValue.toFixed(0) + '\u20ac', icon: '🛒', color: '#4facfe' },
                { l: 'Taux conversion', v: statsData.conversionRate + '%', icon: '📊', color: '#43e97b' },
              ].map(function(s, i) {
                return (
                  <div key={i} style={{ background: '#FFF', borderRadius: 16, padding: '20px 18px', boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.03)' }}>
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
            <div style={{ background: '#FFF', borderRadius: 16, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.03)', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>Chiffre d'affaires</div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>{statsPeriod === '6m' ? '6 derniers mois' : statsPeriod === '30d' ? '30 derniers jours' : '7 derniers jours'}</div>
              <div style={{ display: 'flex', alignItems: 'end', gap: 8, height: 180, padding: '0 4px' }}>
                {(statsPeriod === '6m' ? statsData.monthly : statsData.daily).map(function(d, i) {
                  var maxRev = Math.max.apply(null, (statsPeriod === '6m' ? statsData.monthly : statsData.daily).map(function(x) { return x.revenue }))
                  var h = maxRev > 0 ? Math.max((d.revenue / maxRev) * 150, 4) : 4
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#1A1A2E' }}>{d.revenue > 0 ? d.revenue.toFixed(0) + '\u20ac' : ''}</div>
                      <div style={{ width: '100%', maxWidth: 40, height: h, borderRadius: 6, background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)', transition: 'height .5s ease' }} />
                      <div style={{ fontSize: 9, color: '#BBB', fontWeight: 500 }}>{d.name}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Orders Chart */}
            <div style={{ background: '#FFF', borderRadius: 16, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.03)', marginBottom: 20 }}>
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
            <div style={{ background: '#FFF', borderRadius: 16, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.03)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 16 }}>Repartition des commandes</div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'En attente', count: orders.filter(function(o) { return o.status === 'pending_payment' }).length, color: '#94A3B8', bg: '#F1F5F9' },
                  { label: 'Payees', count: orders.filter(function(o) { return o.status === 'paid' }).length, color: '#F59E0B', bg: '#FFFBEB' },
                  { label: 'Expediees', count: orders.filter(function(o) { return o.status === 'shipped' }).length, color: '#8B5CF6', bg: '#F5F3FF' },
                  { label: 'Livrees', count: orders.filter(function(o) { return o.status === 'delivered' }).length, color: '#10B981', bg: '#ECFDF5' },
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h1 style={{ fontFamily: sf, fontSize: 22, fontWeight: 800, color: '#1A1A2E' }}>Commandes</h1>
              <button onClick={() => setShowNewOrder(!showNewOrder)} style={{ padding: '10px 18px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>+ Nouvelle</button>
            </div>

            {showNewOrder && (
              <form onSubmit={handleCreateOrder} style={{ background: '#FFF', border: '2px solid #1A1A1A', borderRadius: 14, padding: 18, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 10, marginBottom: 12 }}>
                  <input placeholder="Réf (auto)" value={newOrder.reference} onChange={e => setNewOrder({...newOrder, reference: e.target.value})} style={inputStyle} />
                  <input placeholder="Montant €" type="number" step="0.01" required value={newOrder.amount} onChange={e => setNewOrder({...newOrder, amount: e.target.value})} style={inputStyle} />
                  <input placeholder="Description" value={newOrder.description} onChange={e => setNewOrder({...newOrder, description: e.target.value})} style={inputStyle} />
                </div>
                <button type="submit" style={{ padding: '10px 20px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>Créer la commande</button>
              </form>
            )}

            {orders.map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 14, marginBottom: 8, background: '#FFF', border: '1px solid rgba(0,0,0,.03)', boxShadow: '0 1px 4px rgba(0,0,0,.03)', transition: 'all .2s' }}>
                <div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{o.reference || o.ref}</span>
                    <span style={{ fontSize: 13, color: '#999' }}>{o.client_last_name ? `${o.client_first_name} ${o.client_last_name}` : 'En attente'}</span>
                    {o.source === 'live_monitor' && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: '2px 6px', borderRadius: 8, background: '#EFF6FF', color: '#3B82F6' }}>LIVE</span>}
                  </div>
                  {o.description && <div style={{ fontSize: 12, color: '#BBB', marginTop: 2 }}>{o.description}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{(o.total_amount || o.total || o.amount || 0).toFixed(2)}€</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                    color: o.status === 'paid' ? '#F59E0B' : o.status === 'shipped' ? '#8B5CF6' : o.status === 'delivered' ? '#10B981' : '#999',
                    background: o.status === 'paid' ? '#FFFBEB' : o.status === 'shipped' ? '#F5F3FF' : o.status === 'delivered' ? '#ECFDF5' : '#F5F4F2',
                  }}>
                    {o.status === 'pending_payment' ? 'En attente paiement' : o.status === 'paid' ? 'Payée — à expédier' : o.status === 'shipped' ? 'Expédiée' : o.status === 'delivered' ? 'Livrée' : o.status}
                  </span>
                </div>
              </div>
            ))}

            {orders.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: '#CCC' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <p style={{ fontSize: 15, fontWeight: 600 }}>Aucune commande pour l'instant</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Lance un live ou crée une commande manuellement</p>
              </div>
            )}
          </div>
        )}

        {/* ─── CLIENTS ─── */}
        {activeTab === 'clients' && (
          <div>
            <h1 style={{ fontFamily: sf, fontSize: 22, fontWeight: 800, color: '#1A1A2E', marginBottom: 24 }}>Clients ({clients.length})</h1>
            {clients.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 14, marginBottom: 8, background: '#FFF', border: '1px solid rgba(0,0,0,.03)', boxShadow: '0 1px 4px rgba(0,0,0,.03)', transition: 'all .2s' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{c.first_name} {c.last_name}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{c.email} · {c.phone || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{c.order_count || 0} commande{(c.order_count || 0) > 1 ? 's' : ''}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{c.city || '—'}</div>
                </div>
              </div>
            ))}
            {clients.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: '#CCC' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                <p style={{ fontSize: 15, fontWeight: 600 }}>Aucun client pour l'instant</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Les clients apparaîtront après leur premier paiement</p>
              </div>
            )}
          </div>
        )}

        {/* ─── SHIPPING / BOXTAL ─── */}
        {activeTab === 'shipping' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontFamily: sf, fontSize: 24, fontWeight: 800, color: '#1A1A2E', marginBottom: 4 }}>Livraison</h1>
                <p style={{ fontSize: 13, color: '#999' }}>Expedie tes commandes via Boxtal (Mondial Relay, Colissimo, Chronopost...)</p>
              </div>
              {shipStep !== 'list' && (
                <button onClick={function() { setShipStep('list'); setShipSelectedOrder(null); setShipError(null) }}
                  style={{ padding: '10px 20px', background: '#F5F4F2', color: '#555', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>
                  \u2190 Retour
                </button>
              )}
            </div>

            {shipStep === 'list' && (
              <div>
                {(!boxtalConfig.user || !boxtalConfig.pass) && (
                  <div style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%)', border: '1px solid #FED7AA', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>Connecte Boxtal pour expedier tes colis</div>
                      <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>Va dans Parametres, entre tes 2 cles API Boxtal et c'est tout !</div>
                    </div>
                    <button onClick={function() { setActiveTab('settings') }}
                      style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)', color: '#FFF', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: sf, whiteSpace: 'nowrap' }}>
                      Configurer
                    </button>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(0,0,0,.03)' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#F59E0B' }}>{orders.filter(function(o) { return o.status === 'paid' }).length}</div>
                    <div style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>A expedier</div>
                  </div>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(0,0,0,.03)' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#8B5CF6' }}>{orders.filter(function(o) { return o.status === 'shipped' }).length}</div>
                    <div style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>En transit</div>
                  </div>
                  <div style={{ background: '#FFF', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(0,0,0,.03)' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>{orders.filter(function(o) { return o.status === 'delivered' }).length}</div>
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
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#FFFBEB', color: '#F59E0B' }}>A expedier</span>
                            <span style={{ fontSize: 14, fontWeight: 700 }}>{(o.total_amount || o.total || o.amount || 0).toFixed(2)}\u20ac</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#777' }}>{o.client_first_name || ''} {o.client_last_name || ''} {o.description ? ' - ' + o.description : ''}</div>
                          {o.shipping_address && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{o.shipping_address} {o.shipping_city || ''}</div>}
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
                            <span style={{ fontSize: 14, fontWeight: 700 }}>{o.reference || '#'}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#F5F3FF', color: '#8B5CF6' }}>Expedie</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#999' }}>{o.shipping_carrier || ''} {o.tracking_number ? '- Suivi: ' + o.tracking_number : ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {o.shipping_label_url && <button onClick={function() { window.open(o.shipping_label_url, '_blank') }} style={{ padding: '8px 14px', background: '#F5F4F2', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>Etiquette</button>}
                          <button onClick={async function() { await supabase.from('orders').update({ status: 'delivered' }).eq('id', o.id); loadData(shop.id) }} style={{ padding: '8px 14px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>Livre</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {orders.filter(function(o) { return o.status === 'paid' || o.status === 'shipped' }).length === 0 && (
                  <div style={{ textAlign: 'center', padding: 60, color: '#CCC' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>\u2713</div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#999' }}>Tout est a jour !</p>
                  </div>
                )}
              </div>
            )}

            {shipStep === 'form' && shipSelectedOrder && (
              <div>
                <div style={{ background: '#FFF', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.03)', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: '#999', marginBottom: 12 }}>COMMANDE</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{shipSelectedOrder.reference || '#'} — {(shipSelectedOrder.total_amount || shipSelectedOrder.total || shipSelectedOrder.amount || 0).toFixed(2)}\u20ac</div>
                  <div style={{ fontSize: 13, color: '#777', marginTop: 4 }}>{shipSelectedOrder.client_first_name || ''} {shipSelectedOrder.client_last_name || ''}</div>
                </div>

                <div style={{ background: '#FFF', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.03)', marginBottom: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Informations du colis</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#777', display: 'block', marginBottom: 4 }}>Poids (kg)</label>
                      <input value={shipForm.weight} onChange={function(e) { setShipForm(Object.assign({}, shipForm, { weight: e.target.value })) }}
                        style={{ width: '100%', padding: '10px 12px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 10, fontFamily: sf, fontSize: 14, outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#777', display: 'block', marginBottom: 4 }}>Longueur (cm)</label>
                      <input value={shipForm.length} onChange={function(e) { setShipForm(Object.assign({}, shipForm, { length: e.target.value })) }}
                        style={{ width: '100%', padding: '10px 12px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 10, fontFamily: sf, fontSize: 14, outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#777', display: 'block', marginBottom: 4 }}>Largeur (cm)</label>
                      <input value={shipForm.width} onChange={function(e) { setShipForm(Object.assign({}, shipForm, { width: e.target.value })) }}
                        style={{ width: '100%', padding: '10px 12px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 10, fontFamily: sf, fontSize: 14, outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#777', display: 'block', marginBottom: 4 }}>Hauteur (cm)</label>
                      <input value={shipForm.height} onChange={function(e) { setShipForm(Object.assign({}, shipForm, { height: e.target.value })) }}
                        style={{ width: '100%', padding: '10px 12px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 10, fontFamily: sf, fontSize: 14, outline: 'none' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#777', display: 'block', marginBottom: 4 }}>Contenu</label>
                    <input value={shipForm.description} onChange={function(e) { setShipForm(Object.assign({}, shipForm, { description: e.target.value })) }}
                      style={{ width: '100%', padding: '10px 12px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 10, fontFamily: sf, fontSize: 14, outline: 'none' }} placeholder="Vetements, Accessoires..." />
                  </div>

                  {shipError && <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#DC2626' }}>{shipError}</div>}

                  <button onClick={function() { getShippingQuotes(shipSelectedOrder) }} disabled={shipQuoteLoading}
                    style={{ width: '100%', padding: 16, background: shipQuoteLoading ? '#DDD' : 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: shipQuoteLoading ? 'wait' : 'pointer', fontFamily: sf, boxShadow: '0 4px 14px rgba(26,26,46,.15)' }}>
                    {shipQuoteLoading ? 'Recherche des tarifs...' : 'Comparer les transporteurs'}
                  </button>
                  <button onClick={async function() { await supabase.from('orders').update({ status: 'shipped', shipped_at: new Date().toISOString() }).eq('id', shipSelectedOrder.id); loadData(shop.id); setShipStep('label') }}
                    style={{ width: '100%', marginTop: 8, padding: 12, background: 'transparent', color: '#999', border: '1px dashed rgba(0,0,0,.1)', borderRadius: 14, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: sf }}>
                    Marquer expediee manuellement (sans Boxtal)
                  </button>
                </div>

                {shipQuotes.length > 0 && (
                  <div style={{ background: '#FFF', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.03)' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{shipQuotes.length} offres disponibles</div>
                    {shipQuotes.map(function(q, i) {
                      var sel = shipSelectedQuote && shipSelectedQuote.operator_code === q.operator_code && shipSelectedQuote.service_code === q.service_code
                      return (
                        <div key={i} onClick={function() { setShipSelectedQuote(q) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14, marginBottom: 8, cursor: 'pointer', border: sel ? '2px solid #667eea' : '2px solid rgba(0,0,0,.04)', background: sel ? '#F0F0FF' : '#FAFAF8', transition: 'all .2s' }}>
                          {q.logo && <img src={q.logo} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8 }} />}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{q.operator_label}</div>
                            <div style={{ fontSize: 12, color: '#777' }}>{q.service_label}</div>
                            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{q.delivery_type || ''} {q.delivery_delay ? '- ' + q.delivery_delay : ''}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 18, fontWeight: 800 }}>{q.price_ttc}\u20ac</div>
                            <div style={{ fontSize: 10, color: '#999' }}>TTC</div>
                          </div>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', border: sel ? '2px solid #667eea' : '2px solid #DDD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {sel && <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#667eea' }} />}
                          </div>
                        </div>
                      )
                    })}
                    {shipSelectedQuote && (
                      <button onClick={function() { createShipment(shipSelectedOrder, shipSelectedQuote) }} disabled={shipOrderLoading}
                        style={{ width: '100%', marginTop: 16, padding: 16, background: shipOrderLoading ? '#DDD' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: shipOrderLoading ? 'wait' : 'pointer', fontFamily: sf, boxShadow: '0 4px 14px rgba(16,185,129,.25)' }}>
                        {shipOrderLoading ? 'Creation...' : 'Commander - ' + shipSelectedQuote.price_ttc + '\u20ac'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {shipStep === 'label' && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(16,185,129,.25)' }}>
                  <span style={{ fontSize: 36, color: '#FFF' }}>\u2713</span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A2E', marginBottom: 8 }}>Envoi cree !</h2>
                <p style={{ fontSize: 14, color: '#777', marginBottom: 24 }}>
                  {shipSelectedQuote ? shipSelectedQuote.operator_label + ' - ' + shipSelectedQuote.service_label : ''}
                  {shipTrackingNumber ? ' | Ref: ' + shipTrackingNumber : ''}
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  {shipLabel && <button onClick={function() { window.open(shipLabel, '_blank') }} style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: sf }}>Telecharger l'etiquette</button>}
                  <button onClick={function() { setShipStep('list'); setShipSelectedOrder(null) }} style={{ padding: '14px 28px', background: '#F5F4F2', color: '#555', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>Retour</button>
                </div>
                {!shipLabel && <div style={{ marginTop: 20, padding: '16px 20px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, maxWidth: 500, margin: '20px auto 0', fontSize: 13, color: '#92400E' }}>Commande marquee expediee. Configure tes cles API Boxtal dans les Parametres pour generer les etiquettes automatiquement.</div>}
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

                  {msg.reply && (
                    <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '12px 16px', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#10B981', marginBottom: 4 }}>Ta reponse :</div>
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
                            style={{ width: '100%', padding: '12px 14px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 12, fontFamily: sf, fontSize: 13, outline: 'none', resize: 'vertical', marginBottom: 8 }} />
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
                { icon: '📊', label: 'Comment lire mes stats ?', q: 'Comment lire et comprendre mes statistiques de vente dans le dashboard ?' },
                { icon: '📡', label: 'Aide Live Monitor', q: 'Comment configurer et utiliser le Live Monitor pour capter les commandes pendant mon live TikTok ?' },
                { icon: '💳', label: 'Configurer Stripe', q: 'Comment configurer Stripe Connect pour recevoir les paiements de mes clientes ?' },
                { icon: '📦', label: 'Expedier commandes', q: 'Comment expedier mes commandes avec Boxtal, Mondial Relay ou Colissimo ?' },
                { icon: '🚀', label: 'Booster mes ventes', q: 'Donne-moi 5 strategies concretes pour augmenter mes ventes en live TikTok' },
                { icon: '🎯', label: 'Mots-cles detection', q: 'Comment configurer les mots-cles de detection pour que le Live Monitor detecte mieux les commandes ?' },
              ].map(function(a, i) {
                return (
                  <button key={i} onClick={function() { setAiInput(a.q); }}
                    style={{ padding: '8px 14px', background: '#FFF', border: '1px solid rgba(0,0,0,.06)', borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: sf, color: '#555', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s' }}>
                    <span>{a.icon}</span> {a.label}
                  </button>
                )
              })}
            </div>

            {/* Chat messages */}
            <div ref={aiScrollRef} style={{ flex: 1, overflowY: 'auto', background: '#FFF', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.03)', marginBottom: 16 }}>
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
                style={{ flex: 1, padding: '14px 18px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 14, fontFamily: sf, fontSize: 14, outline: 'none', background: '#FFF', transition: 'border-color .2s' }}
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
          <div>
            <h1 style={{ fontFamily: sf, fontSize: 22, fontWeight: 800, color: '#1A1A2E', marginBottom: 24 }}>Paramètres</h1>

            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.03)', borderRadius: 16, padding: 24, marginBottom: 18, boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Boutique</h3>
              <div style={{ fontSize: 14, marginBottom: 6 }}><strong>Nom :</strong> {shop?.name}</div>
              <div style={{ fontSize: 14, marginBottom: 6 }}><strong>Slug :</strong> {shop?.slug}</div>
              <div style={{ fontSize: 14, marginBottom: 6 }}><strong>Email :</strong> {user?.email}</div>
              <div style={{ fontSize: 14 }}><strong>Lien :</strong> {typeof window !== 'undefined' ? window.location.origin : ''}/pay/{shop?.slug}</div>
            </div>

            {/* Logo */}
            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.03)', borderRadius: 16, padding: 24, marginBottom: 18, boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Logo de ta boutique</h3>
              <p style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>Ce logo sera affiche sur ta page de paiement, visible par tes clientes</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 80, height: 80, borderRadius: 16, border: '2px dashed rgba(0,0,0,.1)', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {shopLogo ? (
                    <img src={shopLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: 28, color: '#CCC' }}>🖼️</span>
                  )}
                </div>
                <div>
                  <label style={{ display: 'inline-block', padding: '10px 20px', background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)', color: '#FFF', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: sf, boxShadow: '0 4px 14px rgba(26,26,46,.15)' }}>
                    {logoUploading ? 'Upload...' : shopLogo ? 'Changer le logo' : 'Ajouter un logo'}
                    <input type="file" accept="image/*" onChange={uploadLogo} style={{ display: 'none' }} />
                  </label>
                  <div style={{ fontSize: 11, color: '#BBB', marginTop: 6 }}>PNG, JPG ou SVG - Max 2MB</div>
                </div>
              </div>
            </div>

            {/* Legal texts */}
            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.03)', borderRadius: 16, padding: 24, marginBottom: 18, boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Informations legales</h3>
              <p style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>Ces textes seront affiches en bas de ta page de paiement</p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#777', display: 'block', marginBottom: 6 }}>Conditions Generales de Vente (CGV)</label>
                <textarea value={legalTexts.cgv || ''} onChange={function(e) { setLegalTexts(Object.assign({}, legalTexts, { cgv: e.target.value })) }}
                  rows={5} placeholder="Colle ici tes conditions generales de vente..."
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 12, fontFamily: sf, fontSize: 13, outline: 'none', resize: 'vertical' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#777', display: 'block', marginBottom: 6 }}>Mentions legales</label>
                <textarea value={legalTexts.mentions || ''} onChange={function(e) { setLegalTexts(Object.assign({}, legalTexts, { mentions: e.target.value })) }}
                  rows={5} placeholder="Raison sociale, SIRET, adresse du siege..."
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 12, fontFamily: sf, fontSize: 13, outline: 'none', resize: 'vertical' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#777', display: 'block', marginBottom: 6 }}>Politique de confidentialite</label>
                <textarea value={legalTexts.privacy || ''} onChange={function(e) { setLegalTexts(Object.assign({}, legalTexts, { privacy: e.target.value })) }}
                  rows={5} placeholder="Comment tu collectes et utilises les donnees personnelles..."
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 12, fontFamily: sf, fontSize: 13, outline: 'none', resize: 'vertical' }} />
              </div>

              <button onClick={saveLegalTexts} disabled={legalSaving}
                style={{ padding: '14px 32px', background: legalSaving ? '#DDD' : 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: legalSaving ? 'wait' : 'pointer', fontFamily: sf, boxShadow: '0 4px 14px rgba(26,26,46,.15)' }}>
                {legalSaving ? 'Sauvegarde...' : 'Sauvegarder les textes legaux'}
              </button>
            </div>

            {/* Live Server Status */}
            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.03)', borderRadius: 16, padding: 24, marginBottom: 18, boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📡 Live Monitor</h3>
              <div style={{ fontSize: 14, marginBottom: 6 }}>
                <strong>Serveur Live :</strong>{' '}
                {LIVE_SERVER_URL ? (
                  <span style={{ color: '#10B981', fontWeight: 600 }}>✓ Configuré ({LIVE_SERVER_URL})</span>
                ) : (
                  <span style={{ color: '#F59E0B', fontWeight: 600 }}>⚠ Non configuré (mode démo uniquement)</span>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                Pour connecter le vrai live TikTok, déploie le serveur live et ajoute NEXT_PUBLIC_LIVE_SERVER_URL dans tes variables d'environnement.
              </p>
            </div>

            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.03)', borderRadius: 16, padding: 24, marginBottom: 18, boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Abonnement</h3>
              <div style={{ fontSize: 14, marginBottom: 10 }}>
                <strong>Statut :</strong>{' '}
                <span style={{ color: shop?.subscription_status === 'active' ? '#10B981' : '#F59E0B', fontWeight: 600 }}>
                  {shop?.subscription_status === 'active' ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div style={{ fontSize: 14, marginBottom: 14 }}>27€/mois · 0% commission · Sans engagement</div>
              {shop?.subscription_status !== 'active' && (
                <button
                  onClick={async () => {
                    const res = await fetch('/api/create-subscription', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ shop_id: shop.id, email: user.email }),
                    })
                    const data = await res.json()
                    if (data.url) window.location.href = data.url
                  }}
                  style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)', color: '#FFF', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: sf, boxShadow: '0 4px 14px rgba(26,26,46,.15)' }}>
                  S'abonner — 27€/mois
                </button>
              )}
            </div>

            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.03)', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Stripe Connect</h3>
              <p style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>Connecte ton compte Stripe pour recevoir les paiements de tes clientes directement sur ton compte bancaire.</p>
              {shop?.stripe_account_id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#10B981' }}>✓ Stripe connecté</span>
                </div>
              ) : (
                <button style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #635BFF 0%, #8B5CF6 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: sf, boxShadow: '0 4px 14px rgba(99,91,255,.25)' }}>
                  Connecter Stripe
                </button>
              )}
            </div>

            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.03)', borderRadius: 16, padding: 24, marginTop: 18, boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#FFF', fontSize: 18 }}>📦</span>
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Boxtal — Expedition</h3>
                  <p style={{ fontSize: 12, color: '#999', margin: 0 }}>Mondial Relay, Colissimo, Chronopost... tarifs negocies</p>
                </div>
                {boxtalConfig.user && boxtalConfig.pass && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#ECFDF5', color: '#10B981' }}>Connecte</span>
                )}
              </div>

              <div style={{ background: '#F8F9FC', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 13, color: '#666', lineHeight: 1.6 }}>
                <strong>Comment obtenir tes cles API ?</strong><br/>
                1. Va sur <span style={{ color: '#FF6B35', fontWeight: 700, cursor: 'pointer' }} onClick={function() { window.open('https://www.boxtal.com', '_blank') }}>boxtal.com</span> et cree un compte gratuit<br/>
                2. Dans ton espace Boxtal : Mon compte &gt; API &gt; Copie ton <strong>Identifiant</strong> et ton <strong>Mot de passe API</strong><br/>
                3. Colle-les ci-dessous et clique Sauvegarder
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#777', display: 'block', marginBottom: 4 }}>Identifiant API (login)</label>
                  <input value={boxtalConfig.user || ''} onChange={function(e) { setBoxtalConfig(Object.assign({}, boxtalConfig, { user: e.target.value })) }}
                    placeholder="Ton identifiant Boxtal"
                    style={{ width: '100%', padding: '12px 14px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 12, fontFamily: sf, fontSize: 14, outline: 'none', transition: 'border .2s' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#777', display: 'block', marginBottom: 4 }}>Mot de passe API</label>
                  <input type="password" value={boxtalConfig.pass || ''} onChange={function(e) { setBoxtalConfig(Object.assign({}, boxtalConfig, { pass: e.target.value })) }}
                    placeholder="Ton mot de passe API"
                    style={{ width: '100%', padding: '12px 14px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 12, fontFamily: sf, fontSize: 14, outline: 'none', transition: 'border .2s' }} />
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: '#777', marginBottom: 8 }}>Adresse d'expedition (ton adresse)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <input value={boxtalConfig.senderAddress || ''} onChange={function(e) { setBoxtalConfig(Object.assign({}, boxtalConfig, { senderAddress: e.target.value })) }}
                    placeholder="Adresse (ex: 15 rue de la Paix)"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 10, fontFamily: sf, fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <input value={boxtalConfig.senderZip || ''} onChange={function(e) { setBoxtalConfig(Object.assign({}, boxtalConfig, { senderZip: e.target.value })) }}
                    placeholder="Code postal"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 10, fontFamily: sf, fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <input value={boxtalConfig.senderCity || ''} onChange={function(e) { setBoxtalConfig(Object.assign({}, boxtalConfig, { senderCity: e.target.value })) }}
                    placeholder="Ville"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 10, fontFamily: sf, fontSize: 13, outline: 'none' }} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <input value={boxtalConfig.senderPhone || ''} onChange={function(e) { setBoxtalConfig(Object.assign({}, boxtalConfig, { senderPhone: e.target.value })) }}
                  placeholder="Telephone (ex: 0612345678)"
                  style={{ width: 200, padding: '10px 12px', border: '2px solid rgba(0,0,0,.06)', borderRadius: 10, fontFamily: sf, fontSize: 13, outline: 'none' }} />
              </div>

              <button onClick={saveBoxtalConfig} disabled={boxtalSaving}
                style={{ padding: '14px 32px', background: boxtalSaving ? '#DDD' : 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: boxtalSaving ? 'wait' : 'pointer', fontFamily: sf, boxShadow: '0 4px 14px rgba(255,107,53,.25)' }}>
                {boxtalSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
