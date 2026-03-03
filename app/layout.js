import './globals.css'

export const metadata = {
  title: 'MY LIVE PAIEMENT — Vends en live, encaisse sans commission',
  description: 'Plateforme de live shopping. 0% commission. 27€/mois.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
