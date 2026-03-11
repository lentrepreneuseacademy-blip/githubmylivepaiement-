import './globals.css'

export const metadata = {
  title: 'MY LIVE PAIEMENT — Paiement live shopping TikTok & Instagram | 0% commission',
  description: 'Outil de paiement pour vendeuses en live shopping TikTok et Instagram. Detecte les "je prends" automatiquement, encaisse par CB, genere les etiquettes Mondial Relay. 27€/mois, 0% commission, sans engagement.',
  keywords: [
    'live shopping', 'paiement live', 'live TikTok', 'vente en live',
    'live shopping TikTok', 'live shopping Instagram', 'paiement live TikTok',
    'encaisser live TikTok', 'outil live shopping', 'plateforme live shopping',
    'vendre en live', 'commande live TikTok', 'je prends live',
    'live monitor TikTok', 'paiement CB live', 'live commerce France',
    'etiquette Mondial Relay', 'vendeuse en live', 'live vente en ligne',
    'outil vendeuse live', 'solution paiement live', 'live selling France',
    'boutique live TikTok', 'encaisser sans commission', 'live shopping 0 commission',
  ],
  metadataBase: new URL('https://www.mylivepaiement.com'),
  alternates: {
    canonical: 'https://www.mylivepaiement.com',
  },
  openGraph: {
    title: 'MY LIVE PAIEMENT — Vends en live, encaisse sans commission',
    description: 'Capte les commandes de tes lives TikTok en temps reel, encaisse par CB et expedie en 1 clic. 27€/mois, 0% commission.',
    url: 'https://www.mylivepaiement.com',
    siteName: 'MY LIVE PAIEMENT',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MY LIVE PAIEMENT — Vends en live, 0% commission',
    description: 'Outil de paiement pour vendeuses en live TikTok. Detection auto des commandes, CB, etiquettes. 27€/mois.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MY LIVE PAIEMENT',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://www.mylivepaiement.com',
  description: 'Plateforme de paiement pour vendeuses en live shopping TikTok et Instagram. Detection automatique des commandes, paiement CB, etiquettes Mondial Relay.',
  offers: {
    '@type': 'Offer',
    price: '27',
    priceCurrency: 'EUR',
  },
  featureList: [
    'Live Monitor TikTok',
    'Detection automatique des commandes',
    'Paiement CB securise Stripe',
    'Etiquettes Mondial Relay',
    'Dashboard professionnel',
    '0% commission',
    'Multilingue FR EN ES DE',
  ],
}

const jsonLdOrg = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MY LIVE PAIEMENT',
  url: 'https://www.mylivepaiement.com',
  logo: 'https://www.mylivepaiement.com/icon.png',
  sameAs: [
    'https://www.instagram.com/mylivepaiement',
  ],
}

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Comment fonctionne le Live Monitor pour TikTok ?',
      acceptedAnswer: { '@type': 'Answer', text: 'Le Live Monitor se connecte a ton live TikTok en temps reel. Il detecte automatiquement les commentaires contenant "je prends" et cree une commande avec un numero unique.' },
    },
    {
      '@type': 'Question',
      name: 'Combien coute MY LIVE PAIEMENT ?',
      acceptedAnswer: { '@type': 'Answer', text: '27 euros par mois, sans engagement. 0% de commission sur les ventes. Les seuls frais sont ceux de Stripe (1.5% + 0.25 euros par transaction).' },
    },
    {
      '@type': 'Question',
      name: 'Comment mes clientes paient pendant un live shopping ?',
      acceptedAnswer: { '@type': 'Answer', text: 'Tu donnes une reference a ta cliente pendant le live. Elle va sur ton lien, entre la reference, et le formulaire de paiement par carte bancaire apparait. Securise par Stripe.' },
    },
    {
      '@type': 'Question',
      name: 'MY LIVE PAIEMENT gere les etiquettes de livraison ?',
      acceptedAnswer: { '@type': 'Answer', text: 'Oui. Genere les etiquettes Mondial Relay en 1 clic depuis le dashboard. Imprime le PDF et depose au point relais.' },
    },
    {
      '@type': 'Question',
      name: 'Quelle difference avec les autres plateformes de live shopping ?',
      acceptedAnswer: { '@type': 'Answer', text: 'MY LIVE PAIEMENT est la seule solution avec 0% de commission, un Live Monitor integre pour detecter les commandes automatiquement, et un prix fixe de 27 euros par mois sans engagement.' },
    },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#007AFF" />
        <meta name="google-site-verification" content="nqZBecDLIHHBh0yAJw2-3jGOOZllemfOiZnPxn5MLlA" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-55R2KX9SPF" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-55R2KX9SPF');` }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
