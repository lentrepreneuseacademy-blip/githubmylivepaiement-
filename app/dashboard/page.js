'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createBrowserSupabase } from '../../lib/supabase'

const sf = "'Outfit', sans-serif"
const ss = "'Cormorant Garamond', Georgia, serif"

// ═══ DEFAULT KEYWORDS ═══
const DEFAULT_KEYWORDS = [
  // Intentions d'achat
  'je prends', 'j\'achète', 'je veux', 'pour moi', 'j\'en veux',
  'je le prends', 'je la prends', 'j\'en prends', 'je le veux', 'je la veux',
  'je commande', 'commande', 'ajoutez', 'ajoute', 'moi',
  // Abréviations courantes
  'jp', 'jpp', 'j achete', 'je prend',
  // Tailles
  'taille s', 'taille m', 'taille l', 'taille xl', 'taille xs',
  'en s', 'en m', 'en l', 'en xl',
  // Couleurs
  'en noir', 'en blanc', 'en rouge', 'en bleu', 'en rose', 'en vert',
  'en beige', 'en gris', 'en marron', 'en violet', 'en orange',
  'le noir', 'le blanc', 'le rouge', 'le bleu', 'le rose',
  'la noire', 'la blanche', 'la rouge', 'la bleue', 'la rose',
  // Numéros d'article
  'le 1', 'le 2', 'le 3', 'le 4', 'le 5', 'le 6', 'le 7', 'le 8', 'le 9', 'le 10',
  'le n°1', 'le n°2', 'le n°3', 'le n°4', 'le n°5',
  'numéro 1', 'numéro 2', 'numéro 3', 'numéro 4', 'numéro 5',
  'article 1', 'article 2', 'article 3', 'article 4', 'article 5',
  // Quantités
  'j\'en prends 2', 'j\'en prends 3', 'j\'en veux 2',
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

  // New order form
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [newOrder, setNewOrder] = useState({ reference: '', amount: '', description: '' })

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
  // LIVE MONITOR — KEYWORD DETECTION (dynamic)
  // ═══════════════════════════════════════════════
  function isPurchaseIntent(text) {
    const lower = text.toLowerCase()
    return keywords.some(k => lower.includes(k.toLowerCase()))
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
    const w = window.open('', 'tickets', 'width=420,height=700,scrollbars=yes')
    receiptWindowRef.current = w
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tickets Live - ${shop?.name || 'Ma boutique'}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:Arial,sans-serif; background:#f5f4f2; padding:16px; }
          .header { text-align:center; padding:12px 0 16px; border-bottom:2px solid #1a1a1a; margin-bottom:16px; }
          .header h1 { font-size:14px; letter-spacing:2px; }
          .header p { font-size:11px; color:#999; margin-top:2px; }
          #tickets { display:flex; flex-direction:column; gap:12px; }
          .ticket { background:#fff; border:2px solid #1a1a1a; border-radius:12px; padding:16px; page-break-inside:avoid; }
          .ticket-num { font-size:22px; font-weight:900; margin-bottom:6px; }
          .ticket-user { font-size:14px; font-weight:700; color:#555; }
          .ticket-text { font-size:13px; color:#777; margin-top:6px; padding-top:8px; border-top:1px dashed #ddd; }
          .ticket-time { font-size:10px; color:#bbb; margin-top:6px; text-align:right; }
          .empty { text-align:center; color:#ccc; padding:40px 0; font-size:14px; }
          @media print {
            body { background:#fff; padding:0; }
            .ticket { border:1px solid #000; border-radius:0; margin-bottom:8px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${(shop?.name || 'MA BOUTIQUE').toUpperCase()}</h1>
          <p>Live ${livePlatform === 'tiktok' ? 'TikTok' : 'Instagram'} · @${liveUsername || 'live'}</p>
        </div>
        <div id="tickets">
          <div class="empty">En attente de commandes...</div>
        </div>
      </body>
      </html>
    `)
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
    ticket.innerHTML = \`
      <div class="ticket-num">#\${order.orderNum}</div>
      <div class="ticket-user">@\${order.user}</div>
      <div class="ticket-text">\${order.text}</div>
      <div class="ticket-time">\${order.time}</div>
    \`
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
    const printWindow = window.open('', '_blank')
    const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const shopName = shop?.name || 'Ma boutique'

    const rows = liveOrders.map(o => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;font-weight:800;font-size:15px;">
          #${o.orderNum}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;font-weight:600;font-size:14px;">
          @${o.user}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#555;font-size:14px;">
          ${o.text}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#999;font-size:12px;">
          ${o.time}
        </td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Commandes Live - ${shopName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div>
            <div style="font-size:10px;letter-spacing:3px;color:#999;">MY LIVE PAIEMENT</div>
            <div style="font-size:22px;font-weight:800;margin-top:2px;">${shopName}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;color:#999;">${now}</div>
            <div style="font-size:12px;color:#999;">@${liveUsername || 'live'} · ${livePlatform === 'tiktok' ? 'TikTok' : 'Instagram'}</div>
          </div>
        </div>

        <div style="border-top:3px solid #1a1a1a;margin:16px 0 24px;"></div>

        <div style="display:flex;gap:30px;margin-bottom:24px;">
          <div>
            <div style="font-size:28px;font-weight:900;">${liveOrders.length}</div>
            <div style="font-size:11px;color:#999;">commandes</div>
          </div>
          <div>
            <div style="font-size:28px;font-weight:900;">${allComments.length}</div>
            <div style="font-size:11px;color:#999;">commentaires</div>
          </div>
          <div>
            <div style="font-size:28px;font-weight:900;">${allComments.length > 0 ? Math.round((liveOrders.length / allComments.length) * 100) : 0}%</div>
            <div style="font-size:11px;color:#999;">taux d'achat</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f5f4f2;">
              <th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:1px;color:#999;font-weight:600;">RÉF</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:1px;color:#999;font-weight:600;">PSEUDO</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:1px;color:#999;font-weight:600;">COMMENTAIRE</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:1px;color:#999;font-weight:600;">HEURE</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="margin-top:30px;padding-top:16px;border-top:1px solid #eee;text-align:center;color:#ccc;font-size:11px;">
          Généré par MY LIVE PAIEMENT · ${now}
        </div>

        <div class="no-print" style="text-align:center;margin-top:30px;">
          <button onclick="window.print()" style="padding:14px 40px;background:#1a1a1a;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;">
            Imprimer
          </button>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
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
    { id: 'clients', icon: '👥', label: 'Clients' },
    { id: 'shipping', icon: '🚚', label: 'Livraison' },
    { id: 'settings', icon: '⚙️', label: 'Paramètres' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: sf }}>
      {/* ═══ SIDEBAR ═══ */}
      <aside style={{ width: 220, background: '#1A1A1A', padding: '24px 16px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 32, padding: '0 8px' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#FFF', opacity: .5, marginBottom: 3 }}>MY LIVE</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#FFF', letterSpacing: 1 }}>PAIEMENT</div>
        </div>

        <nav style={{ flex: 1 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 3,
                background: activeTab === tab.id ? 'rgba(255,255,255,.1)' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: sf, textAlign: 'left',
              }}>
              <span style={{ fontSize: 15 }}>{tab.icon}</span>
              <span style={{ fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400, color: '#FFF' }}>{tab.label}</span>
              {tab.live && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', marginLeft: 'auto', animation: 'pulse 1.5s infinite' }} />}
            </button>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 16, marginTop: 16 }}>
          <div style={{ fontSize: 13, color: '#FFF', fontWeight: 600 }}>{shop?.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{user?.email}</div>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
            style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: sf }}>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{ flex: 1, padding: '28px 32px', background: '#FAFAF8', overflowY: 'auto' }}>

        {/* ─── OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <div>
            <h1 style={{ fontFamily: ss, fontSize: 26, fontWeight: 400, marginBottom: 4 }}>Bonjour !</h1>
            <p style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>Voici le résumé de ton activité</p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { l: "Chiffre d'affaires", v: `${stats.revenue.toFixed(0)}€` },
                { l: 'Commandes', v: stats.orderCount },
                { l: 'À expédier', v: stats.pendingShip, color: stats.pendingShip > 0 ? '#F59E0B' : undefined },
                { l: 'Clients', v: stats.clientCount },
              ].map((s, i) => (
                <div key={i} style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.04)', borderRadius: 14, padding: '16px 14px' }}>
                  <div style={{ fontSize: 10, color: '#BBB', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{s.l}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color || '#1A1A1A' }}>{s.v}</div>
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
                <h2 style={{ fontFamily: ss, fontSize: 26, fontWeight: 400, marginBottom: 6 }}>
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
                <h2 style={{ fontFamily: ss, fontSize: 26, fontWeight: 400, marginBottom: 8 }}>Live terminé</h2>
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
                    style={{ padding: '12px 24px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: sf }}>
                    Nouveau live
                  </button>
                  {liveOrders.length > 0 && (
                    <button onClick={printLiveOrders}
                      style={{ padding: '12px 24px', background: '#F59E0B', color: '#FFF', border: 'none', borderRadius: 14, fontSize: 15, boxShadow: '0 4px 12px rgba(245,158,11,.25)', fontWeight: 700, cursor: 'pointer', fontFamily: sf }}>
                      🖨️ Imprimer les commandes
                    </button>
                  )}
                  <button onClick={() => { setActiveTab('orders'); loadData(shop.id); }}
                    style={{ padding: '12px 24px', background: '#F5F4F2', color: '#555', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>
                    Voir les commandes
                  </button>
                </div>
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
                  </div>
                  <button onClick={() => setAutoScroll(!autoScroll)}
                    style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, cursor: 'pointer', fontFamily: sf, background: autoScroll ? '#ECFDF5' : '#F5F4F2', color: autoScroll ? '#10B981' : '#999' }}>
                    {autoScroll ? '⬇ Auto-scroll ON' : '⬇ Auto-scroll OFF'}
                  </button>
                </div>

                {/* Comments feed */}
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

        {/* ─── ORDERS ─── */}
        {activeTab === 'orders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h1 style={{ fontFamily: ss, fontSize: 26, fontWeight: 400 }}>Commandes</h1>
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
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 12, marginBottom: 6, background: '#FFF', border: '1px solid rgba(0,0,0,.04)' }}>
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
            <h1 style={{ fontFamily: ss, fontSize: 26, fontWeight: 400, marginBottom: 24 }}>Clients ({clients.length})</h1>
            {clients.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 12, marginBottom: 6, background: '#FFF', border: '1px solid rgba(0,0,0,.04)' }}>
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

        {/* ─── SHIPPING ─── */}
        {activeTab === 'shipping' && (
          <div>
            <h1 style={{ fontFamily: ss, fontSize: 26, fontWeight: 400, marginBottom: 24 }}>Livraison</h1>
            <p style={{ fontSize: 13, color: '#999', marginBottom: 20 }}>Commandes payées en attente d'expédition</p>
            {orders.filter(o => o.status === 'paid').map(o => (
              <div key={o.id} style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.04)', borderRadius: 14, padding: 18, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{o.reference || o.ref}</span>
                    <span style={{ fontSize: 13, color: '#999', marginLeft: 10 }}>{o.client_first_name} {o.client_last_name}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{(o.total_amount || o.total || o.amount || 0).toFixed(2)}€</span>
                </div>
                <div style={{ fontSize: 13, color: '#777', marginBottom: 10 }}>
                  📍 {o.shipping_address || '—'} · {o.shipping_method === 'mondial_relay' ? 'Mondial Relay' : 'Colissimo'}
                </div>
                <button
                  onClick={async () => {
                    await supabase.from('orders').update({ status: 'shipped', shipped_at: new Date().toISOString() }).eq('id', o.id)
                    loadData(shop.id)
                  }}
                  style={{ padding: '10px 20px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sf }}>
                  🏷️ Générer l'étiquette & marquer expédiée
                </button>
              </div>
            ))}
            {orders.filter(o => o.status === 'paid').length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: '#CCC' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                <p style={{ fontSize: 15, fontWeight: 600 }}>Tout est expédié !</p>
              </div>
            )}
          </div>
        )}

        {/* ─── SETTINGS ─── */}
        {activeTab === 'settings' && (
          <div>
            <h1 style={{ fontFamily: ss, fontSize: 26, fontWeight: 400, marginBottom: 24 }}>Paramètres</h1>

            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.04)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Boutique</h3>
              <div style={{ fontSize: 14, marginBottom: 6 }}><strong>Nom :</strong> {shop?.name}</div>
              <div style={{ fontSize: 14, marginBottom: 6 }}><strong>Slug :</strong> {shop?.slug}</div>
              <div style={{ fontSize: 14, marginBottom: 6 }}><strong>Email :</strong> {user?.email}</div>
              <div style={{ fontSize: 14 }}><strong>Lien :</strong> {typeof window !== 'undefined' ? window.location.origin : ''}/pay/{shop?.slug}</div>
            </div>

            {/* Live Server Status */}
            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.04)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
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

            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.04)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
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
                  style={{ padding: '12px 24px', background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: sf }}>
                  S'abonner — 27€/mois
                </button>
              )}
            </div>

            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,.04)', borderRadius: 14, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Stripe Connect</h3>
              <p style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>Connecte ton compte Stripe pour recevoir les paiements de tes clientes directement sur ton compte bancaire.</p>
              {shop?.stripe_account_id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#10B981' }}>✓ Stripe connecté</span>
                </div>
              ) : (
                <button style={{ padding: '12px 24px', background: '#635BFF', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: sf }}>
                  Connecter Stripe
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
