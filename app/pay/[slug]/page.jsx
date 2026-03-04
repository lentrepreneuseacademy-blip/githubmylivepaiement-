'use client'
import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { createClient } from "@supabase/supabase-js"


// ═══════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════
const T = {
  fr: {
    // Lang
    langName: "Français",
    flag: "🇫🇷",
    // Landing
    heroTitle: "Paiement sécurisé pour le live shopping",
    heroSub: "Finalise ta commande en quelques clics. Paiement par carte, livraison en point relais Mondial Relay.",
    ctaPay: "Payer ma commande",
    ctaAccount: "Mon espace client",
    feat1Title: "Paiement sécurisé",
    feat1Desc: "Tes données bancaires sont protégées par un chiffrement de bout en bout",
    feat2Title: "Mondial Relay",
    feat2Desc: "Retrait en point relais Mondial Relay près de chez toi",
    feat3Title: "Suivi en temps réel",
    feat3Desc: "Suis ta commande étape par étape depuis ton espace client",
    howTitle: "Comment ça marche ?",
    how1: "Tu reçois ta référence pendant le live",
    how2: "Tu entres ta ref et paies en ligne",
    how3: "Tu reçois ta commande chez toi",
    footerText: "Paiement sécurisé par Stripe",
    legalInfo: "Informations légales",
    cgvTitle: "Conditions Générales de Vente",
    mentionsTitle: "Mentions légales",
    privacyTitle: "Politique de confidentialité",
    contactUs: "Nous contacter",
    contactTitle: "Envoyer un message",
    contactSub: "Une question ? Contacte-nous et on te répond rapidement",
    contactNameLabel: "Ton nom",
    contactMsgLabel: "Ton message",
    contactSend: "Envoyer",
    contactSending: "Envoi...",
    contactSuccess: "Message envoyé ! On te répond très vite.",
    closeLegal: "Fermer",
    // Payment
    payTitle: "Finaliser ma commande",
    paySub: "Entre ta référence pour accéder au paiement",
    refLabel: "Référence de commande",
    refPlaceholder: "Ex: BRAND-001",
    refError: "Entre ta référence de commande",
    accessPay: "Accéder au paiement",
    securedBy: "Paiement sécurisé par Stripe",
    amountSection: "Montant à régler",
    amountPlaceholder: "0.00",
    coordSection: "Coordonnées",
    lastName: "Nom",
    firstName: "Prénom",
    email: "Email",
    phone: "Téléphone",
    addressSection: "Adresse de livraison",
    address: "Adresse",
    addressPlaceholder: "12 Rue de la Paix",
    complement: "Complément",
    complementPlaceholder: "Bâtiment, étage, digicode...",
    postalCode: "Code postal",
    city: "Ville",
    shippingSection: "Mode de livraison",
    colissimo: "Colissimo",
    colissimoDesc: "Livraison à domicile · 3-5 jours",
    freeShippingBanner: "🎉 Tu as déjà commandé dans les 24h — livraison offerte !",
    freeShippingTag: "OFFERT",
    freeShippingLine: "Offerte (commande dans les 24h)",
    relay: "Mondial Relay",
    relayDesc: "Retrait en point relais · 4-6 jours",
    relayPoints: "Points relais",
    relayEnterCp: "Entre ton code postal complet pour voir les points relais",
    relayInfo: "Point relais le plus proche",
    relayInfoDesc: "Le point relais le plus proche de ton adresse sera sélectionné lors de l'expédition. Tu recevras un email avec l'adresse exacte.",
    cardSection: "Paiement par carte",
    cardNumber: "Numéro de carte",
    cardExpiry: "Expiration",
    cardCvc: "CVC",
    order: "Commande",
    shipping: "Livraison",
    total: "Total",
    payBtn: "Payer",
    paying: "Paiement en cours...",
    securedData: "Paiement sécurisé · Données chiffrées",
    // Payment success
    payConfirmed: "Paiement confirmé",
    emailSentTo: "Un email de confirmation a été envoyé à",
    ref: "Référence",
    amount: "Montant",
    deliveryMethod: "Livraison",
    deliveryAddress: "Adresse",
    homeDelivery: "à domicile",
    // Client dashboard
    mySpace: "Mon espace client",
    login: "Se connecter",
    firstVisit: "Première visite",
    loginTitle: "Me connecter",
    loginSub: "Retrouve toutes tes commandes",
    password: "Mot de passe",
    activateTitle: "Activer mon espace",
    activateSub: "Ton compte a été créé automatiquement lors de ta commande. Choisis un mot de passe pour y accéder.",
    emailUsed: "Email utilisé lors de la commande",
    choosePassword: "Choisis un mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    passwordMismatch: "Les mots de passe ne correspondent pas",
    passwordMin: "Minimum 6 caractères",
    activateBtn: "Activer mon espace client",
    passwordCreated: "Mot de passe créé !",
    redirecting: "Redirection vers ton espace...",
    hello: "Bonjour",
    dashSub: "Retrouve ici toutes tes commandes et livraisons",
    orders: "Commandes",
    inProgress: "En cours",
    totalLabel: "Total",
    myOrders: "Mes commandes",
    myAccount: "Mon compte",
    currentDelivery: "En cours de livraison",
    history: "Historique",
    seeDetail: "Voir le détail →",
    tracking: "Suivi",
    trackingNumber: "Numéro de suivi",
    trackBtn: "Suivre le colis",
    orderTracking: "Suivi de commande",
    confirmed: "Commande confirmée",
    preparation: "Préparation",
    shipped: "Expédiée",
    delivered: "Livrée",
    cancelled: "Annulée",
    pending: "En attente",
    packageTaken: "Colis pris en charge",
    summary: "Récapitulatif",
    items: "Articles",
    subtotal: "Sous-total",
    totalPaid: "Total payé",
    homeAddress: "Livraison à domicile",
    relayPoint: "Point relais",
    myInfo: "Mes informations",
    fullName: "Nom complet",
    save: "Enregistrer",
    myAddress: "Mon adresse",
    changePassword: "Changer mon mot de passe",
    newPassword: "Nouveau mot de passe",
    confirm: "Confirmer",
    changePasswordBtn: "Changer le mot de passe",
    logout: "Déconnexion",
    poweredBy: "Propulsé par Live Shop Pay",
    backToSite: "Retour au site",
  },
  en: {
    langName: "English",
    flag: "🇬🇧",
    heroTitle: "Secure payment for live shopping",
    heroSub: "Complete your order in a few clicks. Pay by card, delivery to your nearest Mondial Relay point.",
    ctaPay: "Pay my order",
    ctaAccount: "My account",
    feat1Title: "Secure payment",
    feat1Desc: "Your bank details are protected by end-to-end encryption",
    feat2Title: "Mondial Relay",
    feat2Desc: "Pickup at a Mondial Relay point near you",
    feat3Title: "Real-time tracking",
    feat3Desc: "Track your order step by step from your client area",
    howTitle: "How does it work?",
    how1: "You receive your reference during the live",
    how2: "Enter your ref and pay online",
    how3: "Receive your order at home",
    footerText: "Secured payment by Stripe",
    legalInfo: "Legal information",
    cgvTitle: "Terms of Sale",
    mentionsTitle: "Legal notices",
    privacyTitle: "Privacy policy",
    contactUs: "Contact us",
    contactTitle: "Send a message",
    contactSub: "Got a question? Contact us and we'll get back to you quickly",
    contactNameLabel: "Your name",
    contactMsgLabel: "Your message",
    contactSend: "Send",
    contactSending: "Sending...",
    contactSuccess: "Message sent! We'll get back to you soon.",
    closeLegal: "Close",
    payTitle: "Complete my order",
    paySub: "Enter your reference to access payment",
    refLabel: "Order reference",
    refPlaceholder: "Ex: BRAND-001",
    refError: "Please enter your order reference",
    accessPay: "Access payment",
    securedBy: "Secured payment by Stripe",
    amountSection: "Amount to pay",
    amountPlaceholder: "0.00",
    coordSection: "Contact details",
    lastName: "Last name",
    firstName: "First name",
    email: "Email",
    phone: "Phone",
    addressSection: "Delivery address",
    address: "Address",
    addressPlaceholder: "123 Main Street",
    complement: "Additional info",
    complementPlaceholder: "Building, floor, buzzer code...",
    postalCode: "Zip code",
    city: "City",
    shippingSection: "Delivery method",
    colissimo: "Standard delivery",
    colissimoDesc: "Home delivery · 3-5 days",
    freeShippingBanner: "🎉 You ordered in the last 24h — free shipping!",
    freeShippingTag: "FREE",
    freeShippingLine: "Free (order within 24h)",
    relay: "Pickup point",
    relayDesc: "Relay point pickup · 4-6 days",
    relayPoints: "Pickup points",
    relayEnterCp: "Enter your full zip code to see pickup points",
    relayInfo: "Nearest pickup point",
    relayInfoDesc: "The nearest pickup point to your address will be selected during shipping. You'll receive an email with the exact address.",
    cardSection: "Card payment",
    cardNumber: "Card number",
    cardExpiry: "Expiry",
    cardCvc: "CVC",
    order: "Order",
    shipping: "Shipping",
    total: "Total",
    payBtn: "Pay",
    paying: "Processing payment...",
    securedData: "Secured payment · Encrypted data",
    payConfirmed: "Payment confirmed",
    emailSentTo: "A confirmation email has been sent to",
    ref: "Reference",
    amount: "Amount",
    deliveryMethod: "Delivery",
    deliveryAddress: "Address",
    homeDelivery: "home delivery",
    mySpace: "My client area",
    login: "Sign in",
    firstVisit: "First visit",
    loginTitle: "Sign in",
    loginSub: "Find all your orders",
    password: "Password",
    activateTitle: "Activate my account",
    activateSub: "Your account was created automatically with your order. Choose a password to access it.",
    emailUsed: "Email used for your order",
    choosePassword: "Choose a password",
    confirmPassword: "Confirm password",
    passwordMismatch: "Passwords do not match",
    passwordMin: "Minimum 6 characters",
    activateBtn: "Activate my account",
    passwordCreated: "Password created!",
    redirecting: "Redirecting to your account...",
    hello: "Hello",
    dashSub: "Find all your orders and deliveries here",
    orders: "Orders",
    inProgress: "In progress",
    totalLabel: "Total",
    myOrders: "My orders",
    myAccount: "My account",
    currentDelivery: "Being delivered",
    history: "History",
    seeDetail: "See details →",
    tracking: "Tracking",
    trackingNumber: "Tracking number",
    trackBtn: "Track package",
    orderTracking: "Order tracking",
    confirmed: "Order confirmed",
    preparation: "Preparation",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    pending: "Pending",
    packageTaken: "Package shipped",
    summary: "Summary",
    items: "Items",
    subtotal: "Subtotal",
    totalPaid: "Total paid",
    homeAddress: "Home delivery",
    relayPoint: "Pickup point",
    myInfo: "My information",
    fullName: "Full name",
    save: "Save",
    myAddress: "My address",
    changePassword: "Change my password",
    newPassword: "New password",
    confirm: "Confirm",
    changePasswordBtn: "Change password",
    logout: "Sign out",
    poweredBy: "Powered by Live Shop Pay",
    backToSite: "Back to site",
  },
  es: {
    langName: "Español",
    flag: "🇪🇸",
    heroTitle: "Pago seguro para live shopping",
    heroSub: "Completa tu pedido en unos clics. Pago con tarjeta, entrega en punto Mondial Relay.",
    ctaPay: "Pagar mi pedido",
    ctaAccount: "Mi cuenta",
    feat1Title: "Pago seguro",
    feat1Desc: "Tus datos bancarios están protegidos con cifrado de extremo a extremo",
    feat2Title: "Mondial Relay",
    feat2Desc: "Recogida en un punto Mondial Relay cerca de ti",
    feat3Title: "Seguimiento en tiempo real",
    feat3Desc: "Sigue tu pedido paso a paso desde tu espacio cliente",
    howTitle: "¿Cómo funciona?",
    how1: "Recibes tu referencia durante el live",
    how2: "Introduces tu ref y pagas en línea",
    how3: "Recibes tu pedido en casa",
    footerText: "Pago seguro por Stripe",
    legalInfo: "Información legal",
    cgvTitle: "Condiciones de venta",
    mentionsTitle: "Aviso legal",
    privacyTitle: "Política de privacidad",
    contactUs: "Contáctanos",
    contactTitle: "Enviar un mensaje",
    contactSub: "¿Tienes alguna pregunta? Contáctanos y te respondemos rápido",
    contactNameLabel: "Tu nombre",
    contactMsgLabel: "Tu mensaje",
    contactSend: "Enviar",
    contactSending: "Enviando...",
    contactSuccess: "¡Mensaje enviado! Te respondemos pronto.",
    closeLegal: "Cerrar",
    payTitle: "Completar mi pedido",
    paySub: "Introduce tu referencia para acceder al pago",
    refLabel: "Referencia del pedido",
    refPlaceholder: "Ej: BRAND-001",
    refError: "Introduce tu referencia de pedido",
    accessPay: "Acceder al pago",
    securedBy: "Pago seguro por Stripe",
    amountSection: "Importe a pagar",
    amountPlaceholder: "0.00",
    coordSection: "Datos de contacto",
    lastName: "Apellido",
    firstName: "Nombre",
    email: "Email",
    phone: "Teléfono",
    addressSection: "Dirección de envío",
    address: "Dirección",
    addressPlaceholder: "Calle Mayor 12",
    complement: "Información adicional",
    complementPlaceholder: "Edificio, piso, código...",
    postalCode: "Código postal",
    city: "Ciudad",
    shippingSection: "Método de envío",
    colissimo: "Envío estándar",
    colissimoDesc: "Entrega a domicilio · 3-5 días",
    freeShippingBanner: "🎉 Ya has pedido en las últimas 24h — ¡envío gratis!",
    freeShippingTag: "GRATIS",
    freeShippingLine: "Gratis (pedido en 24h)",
    relay: "Punto de recogida",
    relayDesc: "Recogida en punto de relevo · 4-6 días",
    relayPoints: "Puntos de recogida",
    relayEnterCp: "Introduce tu código postal completo para ver los puntos",
    relayInfo: "Punto de recogida más cercano",
    relayInfoDesc: "El punto de recogida más cercano a tu dirección será seleccionado al enviar. Recibirás un email con la dirección exacta.",
    cardSection: "Pago con tarjeta",
    cardNumber: "Número de tarjeta",
    cardExpiry: "Caducidad",
    cardCvc: "CVC",
    order: "Pedido",
    shipping: "Envío",
    total: "Total",
    payBtn: "Pagar",
    paying: "Procesando pago...",
    securedData: "Pago seguro · Datos cifrados",
    payConfirmed: "Pago confirmado",
    emailSentTo: "Se ha enviado un email de confirmación a",
    ref: "Referencia",
    amount: "Importe",
    deliveryMethod: "Envío",
    deliveryAddress: "Dirección",
    homeDelivery: "a domicilio",
    mySpace: "Mi espacio cliente",
    login: "Iniciar sesión",
    firstVisit: "Primera visita",
    loginTitle: "Iniciar sesión",
    loginSub: "Encuentra todos tus pedidos",
    password: "Contraseña",
    activateTitle: "Activar mi cuenta",
    activateSub: "Tu cuenta fue creada automáticamente con tu pedido. Elige una contraseña para acceder.",
    emailUsed: "Email usado en el pedido",
    choosePassword: "Elige una contraseña",
    confirmPassword: "Confirmar contraseña",
    passwordMismatch: "Las contraseñas no coinciden",
    passwordMin: "Mínimo 6 caracteres",
    activateBtn: "Activar mi cuenta",
    passwordCreated: "¡Contraseña creada!",
    redirecting: "Redirigiendo a tu cuenta...",
    hello: "Hola",
    dashSub: "Encuentra aquí todos tus pedidos y envíos",
    orders: "Pedidos",
    inProgress: "En curso",
    totalLabel: "Total",
    myOrders: "Mis pedidos",
    myAccount: "Mi cuenta",
    currentDelivery: "En camino",
    history: "Historial",
    seeDetail: "Ver detalle →",
    tracking: "Seguimiento",
    trackingNumber: "Número de seguimiento",
    trackBtn: "Seguir paquete",
    orderTracking: "Seguimiento del pedido",
    confirmed: "Pedido confirmado",
    preparation: "Preparación",
    shipped: "Enviado",
    delivered: "Entregado",
    cancelled: "Cancelado",
    pending: "Pendiente",
    packageTaken: "Paquete enviado",
    summary: "Resumen",
    items: "Artículos",
    subtotal: "Subtotal",
    totalPaid: "Total pagado",
    homeAddress: "Entrega a domicilio",
    relayPoint: "Punto de recogida",
    myInfo: "Mi información",
    fullName: "Nombre completo",
    save: "Guardar",
    myAddress: "Mi dirección",
    changePassword: "Cambiar contraseña",
    newPassword: "Nueva contraseña",
    confirm: "Confirmar",
    changePasswordBtn: "Cambiar contraseña",
    logout: "Cerrar sesión",
    poweredBy: "Impulsado por Live Shop Pay",
    backToSite: "Volver al sitio",
  },
  de: {
    langName: "Deutsch",
    flag: "🇩🇪",
    heroTitle: "Sichere Zahlung für Live Shopping",
    heroSub: "Schließe deine Bestellung in wenigen Klicks ab. Zahlung per Karte, Lieferung an Mondial Relay Punkt.",
    ctaPay: "Bestellung bezahlen",
    ctaAccount: "Mein Konto",
    feat1Title: "Sichere Zahlung",
    feat1Desc: "Deine Bankdaten sind durch Ende-zu-Ende-Verschlüsselung geschützt",
    feat2Title: "Mondial Relay",
    feat2Desc: "Abholung an einem Mondial Relay Punkt in deiner Nähe",
    feat3Title: "Echtzeit-Verfolgung",
    feat3Desc: "Verfolge deine Bestellung Schritt für Schritt in deinem Kundenbereich",
    howTitle: "Wie funktioniert es?",
    how1: "Du erhältst deine Referenz während des Lives",
    how2: "Gib deine Ref ein und bezahle online",
    how3: "Empfange deine Bestellung zu Hause",
    footerText: "Sichere Zahlung über Stripe",
    legalInfo: "Rechtliche Informationen",
    cgvTitle: "AGB",
    mentionsTitle: "Impressum",
    privacyTitle: "Datenschutzrichtlinie",
    contactUs: "Kontakt",
    contactTitle: "Nachricht senden",
    contactSub: "Hast du eine Frage? Schreib uns und wir antworten schnell",
    contactNameLabel: "Dein Name",
    contactMsgLabel: "Deine Nachricht",
    contactSend: "Senden",
    contactSending: "Wird gesendet...",
    contactSuccess: "Nachricht gesendet! Wir antworten bald.",
    closeLegal: "Schließen",
    payTitle: "Bestellung abschließen",
    paySub: "Gib deine Referenz ein, um zur Zahlung zu gelangen",
    refLabel: "Bestellreferenz",
    refPlaceholder: "Z.B.: BRAND-001",
    refError: "Bitte Bestellreferenz eingeben",
    accessPay: "Zur Zahlung",
    securedBy: "Sichere Zahlung über Stripe",
    amountSection: "Zu zahlender Betrag",
    amountPlaceholder: "0.00",
    coordSection: "Kontaktdaten",
    lastName: "Nachname",
    firstName: "Vorname",
    email: "E-Mail",
    phone: "Telefon",
    addressSection: "Lieferadresse",
    address: "Adresse",
    addressPlaceholder: "Hauptstraße 12",
    complement: "Zusatzinfo",
    complementPlaceholder: "Gebäude, Etage, Türcode...",
    postalCode: "Postleitzahl",
    city: "Stadt",
    shippingSection: "Versandart",
    colissimo: "Standardversand",
    colissimoDesc: "Hauslieferung · 3-5 Tage",
    freeShippingBanner: "🎉 Du hast in den letzten 24h bestellt — kostenloser Versand!",
    freeShippingTag: "GRATIS",
    freeShippingLine: "Kostenlos (Bestellung innerhalb 24h)",
    relay: "Abholstation",
    relayDesc: "Paketstation · 4-6 Tage",
    relayPoints: "Abholstellen",
    relayEnterCp: "Gib deine PLZ ein, um Abholstellen zu sehen",
    relayInfo: "Nächste Abholstelle",
    relayInfoDesc: "Die nächstgelegene Abholstelle wird beim Versand ausgewählt. Du erhältst eine E-Mail mit der genauen Adresse.",
    cardSection: "Kartenzahlung",
    cardNumber: "Kartennummer",
    cardExpiry: "Ablaufdatum",
    cardCvc: "CVC",
    order: "Bestellung",
    shipping: "Versand",
    total: "Gesamt",
    payBtn: "Bezahlen",
    paying: "Zahlung wird verarbeitet...",
    securedData: "Sichere Zahlung · Verschlüsselte Daten",
    payConfirmed: "Zahlung bestätigt",
    emailSentTo: "Eine Bestätigungsmail wurde gesendet an",
    ref: "Referenz",
    amount: "Betrag",
    deliveryMethod: "Versand",
    deliveryAddress: "Adresse",
    homeDelivery: "Hauslieferung",
    mySpace: "Mein Kundenbereich",
    login: "Anmelden",
    firstVisit: "Erster Besuch",
    loginTitle: "Anmelden",
    loginSub: "Finde alle deine Bestellungen",
    password: "Passwort",
    activateTitle: "Konto aktivieren",
    activateSub: "Dein Konto wurde automatisch bei der Bestellung erstellt. Wähle ein Passwort für den Zugang.",
    emailUsed: "Bei der Bestellung verwendete E-Mail",
    choosePassword: "Passwort wählen",
    confirmPassword: "Passwort bestätigen",
    passwordMismatch: "Passwörter stimmen nicht überein",
    passwordMin: "Mindestens 6 Zeichen",
    activateBtn: "Konto aktivieren",
    passwordCreated: "Passwort erstellt!",
    redirecting: "Weiterleitung zu deinem Konto...",
    hello: "Hallo",
    dashSub: "Finde hier alle deine Bestellungen und Lieferungen",
    orders: "Bestellungen",
    inProgress: "In Bearbeitung",
    totalLabel: "Gesamt",
    myOrders: "Meine Bestellungen",
    myAccount: "Mein Konto",
    currentDelivery: "Wird geliefert",
    history: "Verlauf",
    seeDetail: "Details ansehen →",
    tracking: "Verfolgung",
    trackingNumber: "Sendungsnummer",
    trackBtn: "Paket verfolgen",
    orderTracking: "Bestellverfolgung",
    confirmed: "Bestellung bestätigt",
    preparation: "Vorbereitung",
    shipped: "Versendet",
    delivered: "Geliefert",
    cancelled: "Storniert",
    pending: "Ausstehend",
    packageTaken: "Paket versendet",
    summary: "Zusammenfassung",
    items: "Artikel",
    subtotal: "Zwischensumme",
    totalPaid: "Gesamt bezahlt",
    homeAddress: "Hauslieferung",
    relayPoint: "Abholstation",
    myInfo: "Meine Daten",
    fullName: "Vollständiger Name",
    save: "Speichern",
    myAddress: "Meine Adresse",
    changePassword: "Passwort ändern",
    newPassword: "Neues Passwort",
    confirm: "Bestätigen",
    changePasswordBtn: "Passwort ändern",
    logout: "Abmelden",
    poweredBy: "Powered by Live Shop Pay",
    backToSite: "Zurück zur Seite",
  },
};

const LANGS = ["fr", "en", "es", "de"];

// (relay points loaded dynamically)

// ═══════════════════════════════════════
// LANG PICKER
// ═══════════════════════════════════════
function LangPicker({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 8, background: "#FFF", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12 }}>
        <span>{T[lang].flag}</span><span>{T[lang].langName}</span><span style={{ fontSize: 10, color: "#999" }}>▼</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#FFF", border: "1px solid rgba(0,0,0,.08)", borderRadius: 10, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.08)", zIndex: 100 }}>
          {LANGS.map(l => (
            <button key={l} onClick={() => { setLang(l); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 16px", border: "none", background: l === lang ? "#F5F4F2" : "#FFF", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: l === lang ? 600 : 400 }}>
              <span>{T[l].flag}</span><span>{T[l].langName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// LEGAL FOOTER + CONTACT
// ═══════════════════════════════════════
function LegalFooter({ t, sf, legalOpen, setLegalOpen, legalTab, setLegalTab, legalTexts, showContact, setShowContact, contactName, setContactName, contactEmail, setContactEmail, contactMsg, setContactMsg, contactSent, contactSending, sendContact, shopData }) {
  return (
    <div style={{ borderTop: "1px solid rgba(0,0,0,.06)", marginTop: 40 }}>
      {/* Legal toggle */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px" }}>
        <button onClick={() => setLegalOpen(!legalOpen)}
          style={{ width: "100%", padding: "16px 0", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: sf }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#999" }}>{t.legalInfo}</span>
          <span style={{ fontSize: 12, color: "#CCC", transform: legalOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
        </button>

        {legalOpen && (
          <div style={{ paddingBottom: 24 }}>
            {/* Legal links */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {[
                { id: "cgv", label: t.cgvTitle },
                { id: "mentions", label: t.mentionsTitle },
                { id: "privacy", label: t.privacyTitle },
              ].map(item => (
                <button key={item.id} onClick={() => setLegalTab(legalTab === item.id ? null : item.id)}
                  style={{ padding: "8px 16px", borderRadius: 10, border: legalTab === item.id ? "2px solid #1A1A1A" : "1px solid rgba(0,0,0,.1)", background: legalTab === item.id ? "#1A1A1A" : "#FFF", color: legalTab === item.id ? "#FFF" : "#666", fontFamily: sf, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {item.label}
                </button>
              ))}
              <button onClick={() => { setShowContact(!showContact); setLegalTab(null); }}
                style={{ padding: "8px 16px", borderRadius: 10, border: showContact ? "2px solid #1A1A1A" : "1px solid rgba(0,0,0,.1)", background: showContact ? "#1A1A1A" : "#FFF", color: showContact ? "#FFF" : "#666", fontFamily: sf, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                ✉ {t.contactUs}
              </button>
            </div>

            {/* Legal text display */}
            {legalTab && legalTexts[legalTab] && (
              <div style={{ background: "#FFF", border: "1px solid rgba(0,0,0,.06)", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
                <h3 style={{ fontFamily: sf, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                  {legalTab === "cgv" ? t.cgvTitle : legalTab === "mentions" ? t.mentionsTitle : t.privacyTitle}
                </h3>
                <div style={{ fontFamily: sf, fontSize: 13, color: "#555", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{legalTexts[legalTab]}</div>
              </div>
            )}

            {legalTab && !legalTexts[legalTab] && (
              <div style={{ textAlign: "center", padding: 24, color: "#CCC", fontSize: 13 }}>Pas encore renseigne par le vendeur.</div>
            )}

            {/* Contact form */}
            {showContact && (
              <div style={{ background: "#FFF", border: "1px solid rgba(0,0,0,.06)", borderRadius: 14, padding: "20px 24px" }}>
                <h3 style={{ fontFamily: sf, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{t.contactTitle}</h3>
                <p style={{ fontFamily: sf, fontSize: 12, color: "#999", marginBottom: 16 }}>{t.contactSub}</p>
                {contactSent ? (
                  <div style={{ textAlign: "center", padding: 20 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                    <div style={{ fontFamily: sf, fontSize: 14, fontWeight: 600, color: "#10B981" }}>{t.contactSuccess}</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.contactNameLabel}</label>
                        <input value={contactName} onChange={(e) => setContactName(e.target.value)}
                          style={{ width: "100%", padding: "10px 12px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 13, outline: "none", background: "#FFF" }} />
                      </div>
                      <div>
                        <label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.email}</label>
                        <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                          style={{ width: "100%", padding: "10px 12px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 13, outline: "none", background: "#FFF" }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.contactMsgLabel}</label>
                      <textarea value={contactMsg} onChange={(e) => setContactMsg(e.target.value)} rows={4}
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 13, outline: "none", background: "#FFF", resize: "vertical" }} />
                    </div>
                    <button onClick={sendContact} disabled={contactSending || !contactMsg.trim()}
                      style={{ padding: "12px 24px", background: contactMsg.trim() ? "#1A1A1A" : "#E0E0E0", color: contactMsg.trim() ? "#FFF" : "#999", border: "none", borderRadius: 10, fontFamily: sf, fontSize: 13, fontWeight: 600, cursor: contactMsg.trim() ? "pointer" : "not-allowed" }}>
                      {contactSending ? t.contactSending : t.contactSend}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ padding: "16px 24px", textAlign: "center" }}>
        <span style={{ fontFamily: sf, fontSize: 11, color: "#DDD" }}>🔒 {t.footerText}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
export default function PayPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const shopSlug = params.slug
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const [shopData, setShopData] = useState(null)
  const [shopLoading, setShopLoading] = useState(true)

  // Load shop data
  useEffect(() => {
    async function loadShop() {
      if (!shopSlug) return
      const { data } = await supabase.from('shops').select('*').eq('slug', shopSlug).single()
      if (data) {
        setShopData(data)
        if (data.legal_texts) {
          try { setLegalTexts(JSON.parse(data.legal_texts)) } catch(e) {}
        }
      }
      setShopLoading(false)
    }
    loadShop()
  }, [shopSlug])

  // Handle Stripe return
  useEffect(() => {
    const isSuccess = searchParams.get('success')
    const returnRef = searchParams.get('ref')
    if (isSuccess === 'true') {
      setPage('payment')
      setPaid(true)
      if (returnRef) {
        setRef(returnRef)
        setOrderData({ reference: returnRef, ref: returnRef })
      }
      // Mark order as paid in Supabase
      if (returnRef && shopData?.id) {
        supabase.from('orders').update({ status: 'paid' }).eq('reference', returnRef).eq('shop_id', shopData.id).then(() => {})
      }
    }
  }, [searchParams, shopData])

  const [lang, setLang] = useState("fr");
  const [page, setPage] = useState("landing");
  const t = T[lang];
  const sf = "'Outfit',sans-serif";
  const ss = "'Cormorant Garamond',Georgia,serif";

  // Payment state
  const [payStep, setPayStep] = useState("ref");
  const [ref, setRef] = useState("");
  const [refError, setRefError] = useState("");
  const [orderData, setOrderData] = useState(null);
  const [amount, setAmount] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [complement, setComplement] = useState("");
  const [cp, setCp] = useState("");
  const [ville, setVille] = useState("");
  const [shippingMethod, setShippingMethod] = useState("relay");
  const [selectedRelay, setSelectedRelay] = useState(null);
  const [realRelayPoints, setRealRelayPoints] = useState([]);
  const [relayLoading, setRelayLoading] = useState(false);
  const [relayError, setRelayError] = useState('');
  const [cardNum, setCardNum] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [hasPreviousOrderToday, setHasPreviousOrderToday] = useState(false);

  // Client state
  const [clientView, setClientView] = useState("login");
  const [loginMode, setLoginMode] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [activateEmail, setActivateEmail] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [activateError, setActivateError] = useState("");
  const [activateSuccess, setActivateSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Legal & Contact
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState(null); // 'cgv' | 'mentions' | 'privacy'
  const [legalTexts, setLegalTexts] = useState({ cgv: '', mentions: '', privacy: '' });
  const [showContact, setShowContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [clientOrders, setClientOrders] = useState([]);

  // Load client orders when logging in
  async function loadClientOrders(clientEmail) {
    if (!shopData?.id || !clientEmail) return
    const { data } = await supabase.from('orders').select('*').eq('shop_id', shopData.id).eq('client_email', clientEmail).order('created_at', { ascending: false })
    if (data) {
      setClientOrders(data.map(o => ({
        id: o.id, ref: o.reference, date: new Date(o.created_at).toLocaleDateString('fr-FR'),
        amount: o.total_amount || o.amount || 0, shipping: o.shipping_cost || 0,
        method: o.shipping_method || 'colissimo', relay: null,
        status: o.status === 'paid' ? 'confirmed' : o.status === 'shipped' ? 'shipped' : o.status === 'delivered' ? 'delivered' : 'pending',
        tracking: o.tracking_number || '', items: o.description || o.reference,
        deliveredDate: o.delivered_at ? new Date(o.delivered_at).toLocaleDateString('fr-FR') : null,
      })))
    }
  }

  async function sendContact() {
    if (!contactMsg.trim()) return;
    setContactSending(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shopData?.id,
          name: contactName || nom || prenom || '',
          email: contactEmail || email || '',
          phone: phone || '',
          content: contactMsg,
        })
      });
      setContactSent(true);
      setContactMsg('');
    } catch(e) {}
    setContactSending(false);
  }

  async function loadRelayPoints(zipcode, cityName, addressLine) {
    if (!zipcode || zipcode.length < 5) return;
    // Si pas de ville, essayer de la récupérer automatiquement via l'API Geo
    var finalCity = cityName || ville;
    if (!finalCity && zipcode.length === 5) {
      try {
        var geoRes = await fetch('https://geo.api.gouv.fr/communes?codePostal=' + zipcode + '&fields=nom&limit=1');
        var geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          finalCity = geoData[0].nom;
          setVille(finalCity);
        }
      } catch(e) {}
    }
    if (!finalCity) return;
    setRelayLoading(true);
    setRelayError('');
    setSelectedRelay(null);
    try {
      var res = await fetch('/api/boxtal/relays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shopData?.id || null,
          zipcode: zipcode,
          city: finalCity,
          address: addressLine || adresse || '',
          country: 'FR'
        })
      });
      var data = await res.json();
      if (data.error && (!data.points || data.points.length === 0)) {
        setRelayError(data.error);
        setRealRelayPoints([]);
      } else {
        setRealRelayPoints(data.points || []);
        // Auto-sélectionner le premier point relais
        if (data.points && data.points.length > 0) {
          setSelectedRelay(data.points[0].code);
        }
      }
    } catch(e) {
      setRelayError('Impossible de charger les points relais');
    }
    setRelayLoading(false);
  }

  const freeShipping = hasPreviousOrderToday;
  const customShippingPrice = (function() { try { if (shopData?.boxtal_config) { var c = JSON.parse(shopData.boxtal_config); if (c.shippingPrice !== undefined && c.shippingPrice !== '') return parseFloat(c.shippingPrice.replace(',', '.')) || 0; } } catch(e) {} return 4.90; })();
  const shippingCost = freeShipping ? 0 : customShippingPrice;
  const parsedAmount = parseFloat(amount) || 0;
  const totalAmount = (parsedAmount + shippingCost).toFixed(2);
  const canPay = nom && prenom && email && phone && adresse && cp && ville && cardNum.length >= 16 && cardExp && cardCvc && parsedAmount > 0;

  // Auto-detect language on mount
  useEffect(() => {
    try {
      const browserLang = navigator.language?.substring(0, 2);
      if (LANGS.includes(browserLang)) setLang(browserLang);
    } catch (e) {}
  }, []);

  // Check if email has a previous PAID order in last 24 hours
  useEffect(() => {
    async function checkPreviousOrder() {
      if (!email || !email.includes("@") || !shopData?.id) {
        setHasPreviousOrderToday(false);
        return;
      }
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from('orders')
          .select('id')
          .eq('shop_id', shopData.id)
          .eq('client_email', email.toLowerCase().trim())
          .in('status', ['paid', 'shipped', 'delivered'])
          .gte('created_at', since)
          .limit(1);
        setHasPreviousOrderToday(data && data.length > 0);
      } catch(e) {
        setHasPreviousOrderToday(false);
      }
    }
    const timer = setTimeout(checkPreviousOrder, 600);
    return () => clearTimeout(timer);
  }, [email, shopData?.id]);

  // Header component
  const Header = ({ showBack }) => (
    <header style={{ background: "#FFF", borderBottom: "1px solid rgba(0,0,0,.06)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {showBack && <button onClick={() => setPage("landing")} style={{ fontFamily: sf, fontSize: 12, color: "#999", background: "none", border: "1px solid rgba(0,0,0,.1)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>{t.backToSite}</button>}
        <div style={{ width: 32, height: 32, background: "#1A1A1A", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {shopData?.logo_url ? <img src={shopData.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ color: "#FFF", fontFamily: sf, fontSize: 11, fontWeight: 700 }}>{shopData ? shopData.name.substring(0,2).toUpperCase() : 'LS'}</span>}
        </div>
        {shopData?.name && <span style={{ fontFamily: sf, fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{shopData.name}</span>}
      </div>
      <LangPicker lang={lang} setLang={setLang} />
    </header>
  );

  // Loading
  if (shopLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "3px solid #E5E5E5", borderTopColor: "#1A1A1A", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <style>{"@keyframes spin { to { transform: rotate(360deg) } }"}</style>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // LANDING PAGE
  // ═══════════════════════════════════════
  if (page === "landing") {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>
        <Header />
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "60px 20px 40px", textAlign: "center" }}>
          {shopData?.logo_url ? (
            <img src={shopData.logo_url} alt={shopData?.name || ''} style={{ maxHeight: 280, maxWidth: 360, objectFit: "contain", margin: "0 auto 8px", display: "block" }} />
          ) : (
            <div style={{ width: 80, height: 80, background: "#1A1A1A", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
              <span style={{ color: "#FFF", fontFamily: sf, fontSize: 28, fontWeight: 700 }}>{shopData ? shopData.name.substring(0,2).toUpperCase() : 'LS'}</span>
            </div>
          )}
          <h1 style={{ fontFamily: ss, fontSize: 40, fontWeight: 300, lineHeight: 1.2, marginTop: 0, marginBottom: 16, color: "#1A1A1A" }}>{shopData?.name || t.heroTitle}</h1>
          <p style={{ fontFamily: sf, fontSize: 15, color: "#999", lineHeight: 1.7, marginBottom: 36 }}>{t.heroSub}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 60 }}>
            <button onClick={() => { setPage("payment"); setPayStep("ref"); setPaid(false); }} style={{ padding: "16px 36px", background: "#1A1A1A", color: "#FFF", border: "none", borderRadius: 12, fontFamily: sf, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{t.ctaPay}</button>
            <button onClick={() => { setPage("client"); setClientView("login"); }} style={{ padding: "16px 36px", border: "1px solid rgba(0,0,0,.15)", borderRadius: 12, fontFamily: sf, fontSize: 14, color: "#666", background: "none", cursor: "pointer" }}>{t.ctaAccount}</button>
          </div>

          {/* Features */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 60 }}>
            {[
              { icon: "🔒", title: t.feat1Title, desc: t.feat1Desc },
              { icon: "📦", title: t.feat2Title, desc: t.feat2Desc },
              { icon: "📍", title: t.feat3Title, desc: t.feat3Desc },
            ].map((f, i) => (
              <div key={i} style={{ background: "#FFF", border: "1px solid rgba(0,0,0,.06)", borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontFamily: sf, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontFamily: sf, fontSize: 12, color: "#999", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div style={{ marginBottom: 60 }}>
            <h2 style={{ fontFamily: ss, fontSize: 28, fontWeight: 400, marginBottom: 28 }}>{t.howTitle}</h2>
            <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
              {[t.how1, t.how2, t.how3].map((step, i) => (
                <div key={i} style={{ flex: 1, maxWidth: 180 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1A1A1A", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontFamily: sf, fontSize: 16, fontWeight: 700 }}>{i + 1}</div>
                  <div style={{ fontFamily: sf, fontSize: 13, color: "#666", lineHeight: 1.6 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <LegalFooter t={t} sf={sf} legalOpen={legalOpen} setLegalOpen={setLegalOpen} legalTab={legalTab} setLegalTab={setLegalTab} legalTexts={legalTexts} showContact={showContact} setShowContact={setShowContact} contactName={contactName} setContactName={setContactName} contactEmail={contactEmail} setContactEmail={setContactEmail} contactMsg={contactMsg} setContactMsg={setContactMsg} contactSent={contactSent} contactSending={contactSending} sendContact={sendContact} shopData={shopData} />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // PAYMENT PAGE
  // ═══════════════════════════════════════
  if (page === "payment") {
    if (paid) {
      return (
        <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>
          <Header showBack />
          <div style={{ maxWidth: 440, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}><span style={{ color: "#FFF", fontSize: 32 }}>✓</span></div>
            <h1 style={{ fontFamily: ss, fontSize: 32, fontWeight: 400, marginBottom: 8 }}>{t.payConfirmed}</h1>
            <p style={{ fontFamily: sf, fontSize: 14, color: "#999", marginBottom: 32 }}>{t.emailSentTo} {email}</p>
            <div style={{ background: "#FFF", border: "1px solid rgba(0,0,0,.08)", borderRadius: 16, padding: 24, textAlign: "left" }}>
              {[{ l: t.ref, v: (orderData?.reference || orderData?.ref || ref.toUpperCase()) }, { l: t.amount, v: totalAmount + "€" }, { l: t.deliveryMethod, v: t.relay }].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(0,0,0,.04)" : "none" }}>
                  <span style={{ fontFamily: sf, fontSize: 13, color: "#999" }}>{row.l}</span><span style={{ fontFamily: sf, fontSize: 13, fontWeight: 600 }}>{row.v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setPage("client"); setClientView("login"); setLoginMode("activate"); }} style={{ marginTop: 24, padding: "14px 28px", background: "#1A1A1A", color: "#FFF", border: "none", borderRadius: 12, fontFamily: sf, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t.activateTitle}</button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>
        <Header showBack />
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 16px 60px" }}>
          {payStep === "ref" && (
            <div style={{ marginTop: 40 }}>
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <h1 style={{ fontFamily: ss, fontSize: 36, fontWeight: 400, marginBottom: 8 }}>{t.payTitle}</h1>
                <p style={{ fontFamily: sf, fontSize: 14, color: "#999" }}>{t.paySub}</p>
              </div>
              <form onSubmit={async (e) => { e.preventDefault(); if (!ref.trim()) { setRefError(t.refError); return; }
                    // Lookup real order in Supabase
                    const { data: foundOrder } = await supabase.from('orders').select('*').eq('reference', ref.toUpperCase()).eq('shop_id', shopData?.id).single()
                    if (foundOrder) {
                      setOrderData(foundOrder)
                      setAmount(String(foundOrder.total_amount || foundOrder.amount || ''))
                      setRefError("")
                      setPayStep("form")
                    } else {
                      // Allow payment even without existing order (manual ref)
                      setOrderData({ id: null, reference: ref.toUpperCase(), ref: ref.toUpperCase() })
                      setRefError("")
                      setPayStep("form")
                    } }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: sf, fontSize: 12, color: "#999", display: "block", marginBottom: 6 }}>{t.refLabel}</label>
                  <input type="text" value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t.refPlaceholder}
                    style={{ width: "100%", padding: "16px 18px", border: refError ? "2px solid #DC2626" : "1px solid rgba(0,0,0,.12)", borderRadius: 12, fontFamily: sf, fontSize: 16, fontWeight: 600, textAlign: "center", letterSpacing: 2, textTransform: "uppercase", outline: "none", background: "#FFF" }} />
                  {refError && <div style={{ fontFamily: sf, fontSize: 12, color: "#DC2626", marginTop: 6 }}>{refError}</div>}
                </div>
                <button type="submit" style={{ width: "100%", padding: 16, background: "#1A1A1A", color: "#FFF", border: "none", borderRadius: 12, fontFamily: sf, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{t.accessPay}</button>
              </form>
              <div style={{ textAlign: "center", marginTop: 24, fontFamily: sf, fontSize: 11, color: "#CCC" }}>🔒 {t.securedBy}</div>
            </div>
          )}

          {payStep === "form" && orderData && (
            <form onSubmit={async (e) => { e.preventDefault(); setPaying(true);
                try {
                  // Save/update order in Supabase
                  const orderPayload = {
                    shop_id: shopData?.id,
                    reference: (orderData?.reference || orderData?.ref || ref.toUpperCase()),
                    total_amount: parsedAmount,
                    shipping_cost: shippingCost,
                    client_first_name: prenom,
                    client_last_name: nom,
                    client_email: email,
                    client_phone: phone,
                    shipping_address: adresse + (complement ? ', ' + complement : ''),
                    shipping_zipcode: cp,
                    shipping_city: ville,
                    shipping_method: shippingMethod,
                    relay_point: shippingMethod === 'relay' && selectedRelay ? JSON.stringify(realRelayPoints.find(r => r.code === selectedRelay) || { code: selectedRelay }) : null,
                    description: orderData?.description || '',
                    status: 'pending_payment',
                  }
                  let orderId = orderData?.id
                  if (orderId) {
                    await supabase.from('orders').update(orderPayload).eq('id', orderId)
                  } else {
                    const { data: newOrder } = await supabase.from('orders').insert(orderPayload).select().single()
                    if (newOrder) orderId = newOrder.id
                  }
                  // Create Stripe Checkout session
                  const res = await fetch('/api/create-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      orderId: orderId,
                      amount: parseFloat(totalAmount),
                      shopId: shopData?.id,
                      customerEmail: email,
                      reference: orderPayload.reference,
                      shopSlug: shopSlug,
                    })
                  })
                  const checkout = await res.json()
                  if (checkout.url) {
                    window.location.href = checkout.url
                  } else {
                    // Fallback: mark as paid directly (for testing)
                    if (orderId) await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId)
                    setPaid(true)
                  }
                } catch (err) {
                  console.error(err)
                  setPaid(true) // Fallback
                }
                setPaying(false)
              }}>
              {/* Amount */}
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontFamily: sf, fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 14 }}>{t.amountSection}</h2>
                <div style={{ background: "#FFF", border: "1px solid rgba(0,0,0,.08)", borderRadius: 14, padding: 18, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: sf, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#CCC" }}>Ref. {(orderData?.reference || orderData?.ref || ref.toUpperCase())}</div>
                  <div style={{ flex: 1 }} />
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t.amountPlaceholder} min="0" step="0.01"
                    style={{ width: 120, padding: "12px 14px", border: "2px solid #1A1A1A", borderRadius: 10, fontFamily: sf, fontSize: 22, fontWeight: 700, textAlign: "right", outline: "none", background: "#FFF" }} />
                  <span style={{ fontFamily: sf, fontSize: 22, fontWeight: 700 }}>€</span>
                </div>
              </div>

              {/* Contact */}
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontFamily: sf, fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 14 }}>{t.coordSection}</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.lastName} *</label><input value={nom} onChange={(e) => setNom(e.target.value)} required style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 13, outline: "none", background: "#FFF" }} /></div>
                  <div><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.firstName} *</label><input value={prenom} onChange={(e) => setPrenom(e.target.value)} required style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 13, outline: "none", background: "#FFF" }} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.email} *</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 13, outline: "none", background: "#FFF" }} /></div>
                  <div><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.phone} *</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 13, outline: "none", background: "#FFF" }} /></div>
                </div>
              </div>

              {/* Address */}
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontFamily: sf, fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 14 }}>{t.addressSection}</h2>
                <div style={{ marginBottom: 10 }}><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.address} *</label><input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder={t.addressPlaceholder} required style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 13, outline: "none", background: "#FFF" }} /></div>
                <div style={{ marginBottom: 10 }}><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.complement}</label><input value={complement} onChange={(e) => setComplement(e.target.value)} placeholder={t.complementPlaceholder} style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 13, outline: "none", background: "#FFF" }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
                  <div><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.postalCode} *</label><input value={cp} onChange={(e) => { var v = e.target.value.replace(/\D/g, "").substring(0, 5); setCp(v); if (v.length === 5) loadRelayPoints(v, ville, adresse); }} required maxLength={5} style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 13, outline: "none", background: "#FFF" }} /></div>
                  <div><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.city} *</label><input value={ville} onChange={(e) => { setVille(e.target.value); }} onBlur={() => { if (cp.length === 5 && ville && realRelayPoints.length === 0 && !relayLoading) loadRelayPoints(cp, ville, adresse); }} required style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 13, outline: "none", background: "#FFF" }} /></div>
                </div>
              </div>

              {/* Shipping */}
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontFamily: sf, fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 14 }}>{t.shippingSection}</h2>
                {freeShipping && (
                  <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: sf, fontSize: 13, color: "#065F46", fontWeight: 500 }}>{t.freeShippingBanner}</span>
                  </div>
                )}
                <div style={{ width: "100%", padding: "16px 18px", border: "2px solid #1A1A1A", borderRadius: 14, background: "#FFF", marginBottom: 8, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: "6px solid #1A1A1A" }} />
                    <div><div style={{ fontFamily: sf, fontSize: 14, fontWeight: 600 }}>📍 {t.relay}</div><div style={{ fontFamily: sf, fontSize: 12, color: "#999", marginTop: 2 }}>{t.relayDesc}</div></div>
                  </div>
                  {freeShipping ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {customShippingPrice > 0 && <span style={{ fontFamily: sf, fontSize: 13, color: "#999", textDecoration: "line-through" }}>{customShippingPrice.toFixed(2)}€</span>}
                      <span style={{ fontFamily: sf, fontSize: 11, fontWeight: 700, color: "#065F46", background: "#ECFDF5", padding: "3px 8px", borderRadius: 6 }}>{t.freeShippingTag}</span>
                    </div>
                  ) : (
                    <div style={{ fontFamily: sf, fontSize: 14, fontWeight: 700 }}>{customShippingPrice > 0 ? customShippingPrice.toFixed(2) + "€" : "Gratuit"}</div>
                  )}
                </div>
                {shippingMethod === "relay" && (
                  <div style={{ marginTop: 12, background: "#F8F7F5", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontFamily: sf, fontSize: 11, color: "#999", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>{t.relayPoints}</div>
                    {cp.length < 5 ? (
                      <div style={{ fontFamily: sf, fontSize: 12, color: "#CCC", textAlign: "center", padding: 8 }}>{t.relayEnterCp}</div>
                    ) : relayLoading ? (
                      <div style={{ textAlign: "center", padding: 16 }}>
                        <div style={{ width: 24, height: 24, border: "3px solid #E5E5E5", borderTopColor: "#1A1A1A", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
                        <div style={{ fontFamily: sf, fontSize: 12, color: "#999" }}>Chargement des points relais...</div>
                      </div>
                    ) : relayError ? (
                      <div style={{ textAlign: "center", padding: 12 }}>
                        <div style={{ fontFamily: sf, fontSize: 12, color: "#E11D48", marginBottom: 6 }}>⚠ {relayError}</div>
                        <button type="button" onClick={() => loadRelayPoints(cp, ville, adresse)} style={{ fontFamily: sf, fontSize: 11, color: "#1A1A1A", background: "#FFF", border: "1px solid rgba(0,0,0,.1)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}>Réessayer</button>
                        <div style={{ fontFamily: sf, fontSize: 11, color: "#BBB", marginTop: 8 }}>Si le problème persiste, le point relais le plus proche te sera communiqué par email.</div>
                      </div>
                    ) : realRelayPoints.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 12 }}>
                        <div style={{ fontFamily: sf, fontSize: 12, color: "#999", marginBottom: 4 }}>📍 Aucun point relais trouvé</div>
                        <div style={{ fontFamily: sf, fontSize: 11, color: "#BBB" }}>Vérifie ton code postal et ta ville, puis </div>
                        <button type="button" onClick={() => loadRelayPoints(cp, ville, adresse)} style={{ fontFamily: sf, fontSize: 11, color: "#1A1A1A", background: "none", border: "none", textDecoration: "underline", cursor: "pointer", padding: 0, marginTop: 4 }}>relance la recherche</button>
                      </div>
                    ) : (
                      <div>
                        {realRelayPoints.slice(0, 5).map((r, i) => (
                          <button key={r.code || i} type="button" onClick={() => setSelectedRelay(r.code)}
                            style={{ width: "100%", padding: "14px 16px", border: selectedRelay === r.code ? "2px solid #1A1A1A" : "1px solid rgba(0,0,0,.08)", borderRadius: 12, background: selectedRelay === r.code ? "#1A1A1A" : "#FFF", marginBottom: 8, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all .15s" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 14 }}>📍</span>
                                <span style={{ fontFamily: sf, fontSize: 13, fontWeight: 600, color: selectedRelay === r.code ? "#FFF" : "#1A1A1A" }}>{r.name}</span>
                              </div>
                              <div style={{ fontFamily: sf, fontSize: 11, color: selectedRelay === r.code ? "rgba(255,255,255,.6)" : "#999", marginTop: 3, paddingLeft: 20 }}>{r.address}, {r.zipcode} {r.city}</div>
                              {selectedRelay === r.code && r.schedule && r.schedule.length > 0 && (
                                <div style={{ marginTop: 8, paddingLeft: 20, borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 8 }}>
                                  <div style={{ fontFamily: sf, fontSize: 10, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Horaires</div>
                                  {r.schedule.map((s, si) => (
                                    <div key={si} style={{ fontFamily: sf, fontSize: 10, color: "rgba(255,255,255,.7)", display: "flex", justifyContent: "space-between", maxWidth: 220, marginBottom: 1 }}>
                                      <span>{s.day}</span>
                                      <span>{s.hours || 'Fermé'}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {selectedRelay === r.code && <span style={{ color: "#FFF", fontSize: 18, marginLeft: 8 }}>✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card */}
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontFamily: sf, fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 14 }}>{t.cardSection}</h2>
                <div style={{ background: "#FFF", border: "1px solid rgba(0,0,0,.08)", borderRadius: 14, padding: 18 }}>
                  <div style={{ marginBottom: 10 }}><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.cardNumber}</label><input value={cardNum} onChange={(e) => setCardNum(e.target.value.replace(/\D/g, "").substring(0, 16))} placeholder="4242 4242 4242 4242" style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 14, letterSpacing: 2, outline: "none", background: "#FFF" }} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.cardExpiry}</label><input value={cardExp} onChange={(e) => setCardExp(e.target.value)} placeholder="MM/AA" style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 14, outline: "none", background: "#FFF" }} /></div>
                    <div><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.cardCvc}</label><input value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").substring(0, 3))} placeholder="123" style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 14, outline: "none", background: "#FFF" }} /></div>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div style={{ background: "#FFF", border: "1px solid rgba(0,0,0,.08)", borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontFamily: sf, fontSize: 13, color: "#999" }}>{t.order}</span><span style={{ fontFamily: sf, fontSize: 13 }}>{parsedAmount.toFixed(2)}€</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontFamily: sf, fontSize: 13, color: "#999" }}>{t.shipping}</span>
                  {!shippingMethod && <span style={{ fontFamily: sf, fontSize: 13 }}>—</span>}
                  {shippingMethod && freeShipping && <span style={{ fontFamily: sf, fontSize: 13, color: "#065F46", fontWeight: 600 }}>{t.freeShippingLine}</span>}
                  {shippingMethod && !freeShipping && <span style={{ fontFamily: sf, fontSize: 13 }}>{shippingCost.toFixed(2)}€</span>}
                </div>
                <div style={{ height: 1, background: "rgba(0,0,0,.06)", margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontFamily: sf, fontSize: 15, fontWeight: 700 }}>{t.total}</span><span style={{ fontFamily: sf, fontSize: 20, fontWeight: 700 }}>{totalAmount}€</span></div>
              </div>
              <button type="submit" disabled={!canPay || paying} style={{ width: "100%", padding: 18, background: canPay ? "#1A1A1A" : "#E0E0E0", color: canPay ? "#FFF" : "#999", border: "none", borderRadius: 14, fontFamily: sf, fontSize: 15, fontWeight: 600, cursor: canPay ? "pointer" : "not-allowed" }}>{paying ? t.paying : `${t.payBtn} ${totalAmount}€`}</button>
              <div style={{ textAlign: "center", marginTop: 16, fontFamily: sf, fontSize: 11, color: "#CCC" }}>🔒 {t.securedData}</div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // CLIENT DASHBOARD
  // ═══════════════════════════════════════
  if (page === "client") {
    const STATUS_MAP = { pending: { l: t.pending, c: "#F59E0B", bg: "#FFFBEB" }, confirmed: { l: t.confirmed, c: "#3B82F6", bg: "#EFF6FF" }, shipped: { l: t.shipped, c: "#8B5CF6", bg: "#F5F3FF" }, delivered: { l: t.delivered, c: "#10B981", bg: "#ECFDF5" }, cancelled: { l: t.cancelled, c: "#EF4444", bg: "#FEF2F2" } };

    // Order detail
    if (selectedOrder) {
      const o = selectedOrder; const s = STATUS_MAP[o.status];
      const steps = [{ label: t.confirmed, date: o.date, done: true }, { label: t.preparation, done: o.status !== "pending" && o.status !== "confirmed" }, { label: t.shipped, date: o.status === "shipped" || o.status === "delivered" ? t.packageTaken : null, done: o.status === "shipped" || o.status === "delivered" }, { label: t.delivered, date: o.deliveredDate, done: o.status === "delivered" }];
      return (
        <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>
          <header style={{ background: "#FFF", borderBottom: "1px solid rgba(0,0,0,.06)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setSelectedOrder(null)} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(0,0,0,.1)", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFF", cursor: "pointer", fontSize: 16 }}>←</button>
            <div><div style={{ fontFamily: sf, fontSize: 15, fontWeight: 600 }}>{t.order} {o.ref}</div><div style={{ fontFamily: sf, fontSize: 11, color: "#999" }}>{o.date}</div></div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontFamily: sf, fontSize: 12, fontWeight: 600, color: s.c, background: s.bg, padding: "4px 12px", borderRadius: 20 }}>{s.l}</span><LangPicker lang={lang} setLang={setLang} /></div>
          </header>
          <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px" }}>
            <div style={{ background: "#FFF", border: "1px solid rgba(0,0,0,.06)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <h3 style={{ fontFamily: sf, fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 20 }}>{t.orderTracking}</h3>
              {steps.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 16, marginBottom: i < steps.length - 1 ? 28 : 0, position: "relative" }}>
                  {i < steps.length - 1 && <div style={{ position: "absolute", left: 11, top: 26, width: 2, height: "100%", background: step.done && steps[i + 1].done ? "#1A1A1A" : "rgba(0,0,0,.08)" }} />}
                  <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: step.done ? "#1A1A1A" : "#FFF", border: step.done ? "none" : "2px solid rgba(0,0,0,.12)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>{step.done && <span style={{ color: "#FFF", fontSize: 12 }}>✓</span>}</div>
                  <div><div style={{ fontFamily: sf, fontSize: 14, fontWeight: step.done ? 600 : 400, color: step.done ? "#1A1A1A" : "#CCC" }}>{step.label}</div>{step.date && step.done && <div style={{ fontFamily: sf, fontSize: 12, color: "#999", marginTop: 2 }}>{step.date}</div>}</div>
                </div>
              ))}
            </div>
            {o.tracking && (o.status === "shipped" || o.status === "delivered") && (
              <div style={{ background: "#FFF", border: "1px solid rgba(0,0,0,.06)", borderRadius: 16, padding: 20, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontFamily: sf, fontSize: 11, color: "#999", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{t.trackingNumber}</div><div style={{ fontFamily: sf, fontSize: 14, fontWeight: 600, letterSpacing: 1 }}>{o.tracking}</div></div>
                <button style={{ padding: "8px 16px", background: "#1A1A1A", color: "#FFF", border: "none", borderRadius: 8, fontFamily: sf, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t.trackBtn}</button>
              </div>
            )}
            <div style={{ background: "#FFF", border: "1px solid rgba(0,0,0,.06)", borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontFamily: sf, fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 16 }}>{t.summary}</h3>
              {[{ l: t.items, v: o.items }, { l: t.subtotal, v: o.amount.toFixed(2) + "€" }, { l: t.shipping, v: o.shipping.toFixed(2) + "€" }, { l: t.totalPaid, v: (o.amount + o.shipping).toFixed(2) + "€", bold: true }].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 3 ? "1px solid rgba(0,0,0,.04)" : "none" }}><span style={{ fontFamily: sf, fontSize: 13, color: "#999" }}>{r.l}</span><span style={{ fontFamily: sf, fontSize: r.bold ? 15 : 13, fontWeight: r.bold ? 700 : 500 }}>{r.v}</span></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Login
    if (clientView === "login") {
      return (
        <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", flexDirection: "column" }}>
          <Header showBack />
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ width: "100%", maxWidth: 400 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 32, background: "#F0EEEC", borderRadius: 12, padding: 4 }}>
                {[{ id: "login", label: t.login }, { id: "activate", label: t.firstVisit }].map(tab => (
                  <button key={tab.id} onClick={() => { setLoginMode(tab.id); setActivateError(""); setActivateSuccess(false); }}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: loginMode === tab.id ? "#FFF" : "transparent", fontFamily: sf, fontSize: 13, fontWeight: loginMode === tab.id ? 600 : 400, color: loginMode === tab.id ? "#1A1A1A" : "#999", cursor: "pointer", boxShadow: loginMode === tab.id ? "0 1px 3px rgba(0,0,0,.06)" : "none" }}>{tab.label}</button>
                ))}
              </div>
              {loginMode === "login" ? (
                <div>
                  <h1 style={{ fontFamily: ss, fontSize: 32, fontWeight: 400, textAlign: "center", marginBottom: 6 }}>{t.loginTitle}</h1>
                  <p style={{ fontFamily: sf, fontSize: 13, color: "#999", textAlign: "center", marginBottom: 32 }}>{t.loginSub}</p>
                  <form onSubmit={async (e) => { e.preventDefault(); await loadClientOrders(loginEmail); setClientView("dashboard"); }}>
                    <div style={{ marginBottom: 12 }}><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.email}</label><input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required style={{ width: "100%", padding: "14px 16px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 12, fontFamily: sf, fontSize: 14, outline: "none", background: "#FFF" }} /></div>
                    <div style={{ marginBottom: 20 }}><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.password}</label><input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required style={{ width: "100%", padding: "14px 16px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 12, fontFamily: sf, fontSize: 14, outline: "none", background: "#FFF" }} /></div>
                    <button type="submit" style={{ width: "100%", padding: 16, background: "#1A1A1A", color: "#FFF", border: "none", borderRadius: 12, fontFamily: sf, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{t.login}</button>
                  </form>
                </div>
              ) : (
                <div>
                  <h1 style={{ fontFamily: ss, fontSize: 32, fontWeight: 400, textAlign: "center", marginBottom: 6 }}>{t.activateTitle}</h1>
                  <p style={{ fontFamily: sf, fontSize: 13, color: "#999", textAlign: "center", marginBottom: 32, lineHeight: 1.6 }}>{t.activateSub}</p>
                  {activateSuccess ? (
                    <div style={{ textAlign: "center", padding: 32 }}>
                      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><span style={{ color: "#FFF", fontSize: 28 }}>✓</span></div>
                      <div style={{ fontFamily: sf, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{t.passwordCreated}</div>
                      <div style={{ fontFamily: sf, fontSize: 13, color: "#999" }}>{t.redirecting}</div>
                    </div>
                  ) : (
                    <form onSubmit={async (e) => { e.preventDefault(); if (newPw !== confirmPw) { setActivateError(t.passwordMismatch); return; } if (newPw.length < 6) { setActivateError(t.passwordMin); return; } setActivateError(""); setActivateSuccess(true); await loadClientOrders(activateEmail); setTimeout(() => setClientView("dashboard"), 1500); }}>
                      <div style={{ marginBottom: 12 }}><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.emailUsed}</label><input type="email" value={activateEmail} onChange={(e) => setActivateEmail(e.target.value)} required style={{ width: "100%", padding: "14px 16px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 12, fontFamily: sf, fontSize: 14, outline: "none", background: "#FFF" }} /></div>
                      <div style={{ marginBottom: 12 }}><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.choosePassword}</label><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder={t.passwordMin} required minLength={6} style={{ width: "100%", padding: "14px 16px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 12, fontFamily: sf, fontSize: 14, outline: "none", background: "#FFF" }} /></div>
                      <div style={{ marginBottom: 20 }}><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.confirmPassword}</label><input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required style={{ width: "100%", padding: "14px 16px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 12, fontFamily: sf, fontSize: 14, outline: "none", background: "#FFF" }} /></div>
                      {activateError && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}><span style={{ fontFamily: sf, fontSize: 12, color: "#DC2626" }}>{activateError}</span></div>}
                      <button type="submit" style={{ width: "100%", padding: 16, background: "#1A1A1A", color: "#FFF", border: "none", borderRadius: 12, fontFamily: sf, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{t.activateBtn}</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Dashboard
    const totalSpent = clientOrders.reduce((a, o) => a + o.amount + o.shipping, 0);
    const shippedOrders = clientOrders.filter(o => o.status === "shipped");

    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>
        <header style={{ background: "#FFF", borderBottom: "1px solid rgba(0,0,0,.06)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: "#1A1A1A", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#FFF", fontFamily: sf, fontSize: 13, fontWeight: 700 }}>{ (loginEmail || "").substring(0,2).toUpperCase() || "CL" }</span></div>
            <div><div style={{ fontFamily: sf, fontSize: 14, fontWeight: 600 }}>{nom || prenom ? prenom + ' ' + nom : loginEmail}</div><div style={{ fontFamily: sf, fontSize: 11, color: "#999" }}>{loginEmail || email}</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LangPicker lang={lang} setLang={setLang} />
            <button onClick={() => { setClientView("login"); setLoginMode("login"); }} style={{ fontFamily: sf, fontSize: 12, color: "#999", background: "none", border: "1px solid rgba(0,0,0,.1)", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>{t.logout}</button>
          </div>
        </header>
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "24px 16px" }}>
          <div style={{ marginBottom: 24 }}><h1 style={{ fontFamily: ss, fontSize: 28, fontWeight: 400, marginBottom: 4 }}>{t.hello} {prenom || loginEmail?.split('@')[0] || ''}</h1><p style={{ fontFamily: sf, fontSize: 13, color: "#999" }}>{t.dashSub}</p></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
            {[{ label: t.orders, value: clientOrders.length }, { label: t.inProgress, value: shippedOrders.length }, { label: t.totalLabel, value: totalSpent.toFixed(0) + "€" }].map((s, i) => (
              <div key={i} style={{ background: "#FFF", border: "1px solid rgba(0,0,0,.06)", borderRadius: 14, padding: "16px 14px", textAlign: "center" }}><div style={{ fontFamily: sf, fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{s.value}</div><div style={{ fontFamily: sf, fontSize: 11, color: "#999" }}>{s.label}</div></div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F0EEEC", borderRadius: 12, padding: 4 }}>
            {[{ id: "orders", label: t.myOrders }, { id: "account", label: t.myAccount }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: activeTab === tab.id ? "#FFF" : "transparent", fontFamily: sf, fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400, color: activeTab === tab.id ? "#1A1A1A" : "#999", cursor: "pointer", boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,.06)" : "none" }}>{tab.label}</button>
            ))}
          </div>

          {activeTab === "orders" && (
            <div>
              {shippedOrders.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: sf, fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 10 }}>{t.currentDelivery}</div>
                  {shippedOrders.map(o => { const s = STATUS_MAP[o.status]; return (
                    <button key={o.id} onClick={() => setSelectedOrder(o)} style={{ width: "100%", background: "#1A1A1A", border: "none", borderRadius: 16, padding: 20, textAlign: "left", cursor: "pointer", marginBottom: 8, display: "block" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div><div style={{ fontFamily: sf, fontSize: 14, fontWeight: 600, color: "#FFF" }}>{o.items}</div><div style={{ fontFamily: sf, fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>Ref. {o.ref} · {o.date}</div></div>
                        <span style={{ fontFamily: sf, fontSize: 11, fontWeight: 600, color: "#FFF", background: "rgba(255,255,255,.15)", padding: "4px 10px", borderRadius: 20 }}>{s.l}</span>
                      </div>
                      <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontFamily: sf, fontSize: 12, color: "rgba(255,255,255,.5)" }}>{t.trackingNumber}: {o.tracking}</div><div style={{ fontFamily: sf, fontSize: 12, color: "#FFF", fontWeight: 600 }}>{t.seeDetail}</div>
                      </div>
                    </button>
                  ); })}
                </div>
              )}
              <div>
                <div style={{ fontFamily: sf, fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 10 }}>{t.history}</div>
                {clientOrders.filter(o => o.status !== "shipped").map(o => { const s = STATUS_MAP[o.status]; return (
                  <button key={o.id} onClick={() => setSelectedOrder(o)} style={{ width: "100%", background: "#FFF", border: "1px solid rgba(0,0,0,.06)", borderRadius: 14, padding: "16px 18px", textAlign: "left", cursor: "pointer", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div><div style={{ fontFamily: sf, fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{o.items}</div><div style={{ fontFamily: sf, fontSize: 12, color: "#999" }}>Ref. {o.ref} · {o.date}</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontFamily: sf, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{(o.amount + o.shipping).toFixed(2)}€</div><span style={{ fontFamily: sf, fontSize: 11, fontWeight: 600, color: s.c, background: s.bg, padding: "3px 10px", borderRadius: 20 }}>{s.l}</span></div>
                  </button>
                ); })}
              </div>
            </div>
          )}

          {activeTab === "account" && (
            <div>
              <div style={{ background: "#FFF", border: "1px solid rgba(0,0,0,.06)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
                <h3 style={{ fontFamily: sf, fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 20 }}>{t.myInfo}</h3>
                <div style={{ marginBottom: 12 }}><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.fullName}</label><input defaultValue={prenom ? prenom + ' ' + nom : ''} style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 14, outline: "none", background: "#FFF" }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  <div><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.email}</label><input defaultValue={loginEmail || email || ''} style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 14, outline: "none", background: "#FFF" }} /></div>
                  <div><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.phone}</label><input defaultValue={phone || ''} style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 14, outline: "none", background: "#FFF" }} /></div>
                </div>
                <button style={{ padding: "12px 24px", background: "#1A1A1A", color: "#FFF", border: "none", borderRadius: 10, fontFamily: sf, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t.save}</button>
              </div>
              <div style={{ background: "#FFF", border: "1px solid rgba(0,0,0,.06)", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontFamily: sf, fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 20 }}>{t.changePassword}</h3>
                <div style={{ marginBottom: 12 }}><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.newPassword}</label><input type="password" placeholder="••••••••" style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 14, outline: "none", background: "#FFF" }} /></div>
                <div style={{ marginBottom: 16 }}><label style={{ fontFamily: sf, fontSize: 11, color: "#BBB", display: "block", marginBottom: 4 }}>{t.confirm}</label><input type="password" placeholder="••••••••" style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, fontFamily: sf, fontSize: 14, outline: "none", background: "#FFF" }} /></div>
                <button style={{ padding: "12px 24px", background: "#1A1A1A", color: "#FFF", border: "none", borderRadius: 10, fontFamily: sf, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t.changePasswordBtn}</button>
              </div>
            </div>
          )}
        </div>
        <LegalFooter t={t} sf={sf} legalOpen={legalOpen} setLegalOpen={setLegalOpen} legalTab={legalTab} setLegalTab={setLegalTab} legalTexts={legalTexts} showContact={showContact} setShowContact={setShowContact} contactName={contactName} setContactName={setContactName} contactEmail={contactEmail} setContactEmail={setContactEmail} contactMsg={contactMsg} setContactMsg={setContactMsg} contactSent={contactSent} contactSending={contactSending} sendContact={sendContact} shopData={shopData} />
      </div>
    );
  }

  return null;
}
