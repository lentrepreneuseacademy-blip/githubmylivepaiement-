import { articles } from '../../lib/blog-data'
import Link from 'next/link'

export const metadata = {
  title: 'Blog — MY LIVE PAIEMENT | Conseils live shopping TikTok',
  description: 'Guides, tutoriels et conseils pour vendre en live sur TikTok et Instagram. Paiement, expedition, outils, strategies.',
  alternates: { canonical: 'https://www.mylivepaiement.com/blog' },
}

export default function BlogPage() {
  const sf = "system-ui, -apple-system, 'SF Pro Display', sans-serif"
  const ss = "'SF Pro Display', system-ui, -apple-system, sans-serif"

  return (
    <div style={{ background: '#F5F5F7', minHeight: '100vh', fontFamily: sf }}>
      {/* Nav */}
      <nav style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#1D1D1F' }}>
          <div style={{ width: 32, height: 32, background: '#1D1D1F', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#FFF', fontSize: 11, fontWeight: 900 }}>ML</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>MY LIVE PAIEMENT</span>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/dashboard" style={{ padding: '8px 16px', color: '#1D1D1F', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Se connecter</Link>
          <Link href="/dashboard" style={{ padding: '8px 18px', background: '#007AFF', color: '#FFF', textDecoration: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Commencer</Link>
        </div>
      </nav>

      {/* Header */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: '#007AFF', marginBottom: 12 }}>Blog</div>
        <h1 style={{ fontFamily: ss, fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 700, color: '#1D1D1F', marginBottom: 12, letterSpacing: -0.5 }}>
          Guides & conseils pour le live shopping
        </h1>
        <p style={{ fontSize: 16, color: '#86868B', lineHeight: 1.6 }}>
          Tout ce que tu dois savoir pour vendre en live sur TikTok et Instagram.
        </p>
      </section>

      {/* Articles */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 80px' }}>
        {articles.map((a, i) => (
          <Link key={a.slug} href={'/blog/' + a.slug} style={{ textDecoration: 'none', color: 'inherit' }}>
            <article style={{
              background: '#FFF', borderRadius: 16, padding: '28px 32px', marginBottom: 16,
              border: '1px solid rgba(0,0,0,.04)', cursor: 'pointer',
              transition: 'all .2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: '#F5F5F7', color: '#86868B' }}>{a.category}</span>
                <span style={{ fontSize: 12, color: '#86868B' }}>{new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span style={{ fontSize: 12, color: '#86868B' }}>· {a.readTime}</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1D1D1F', marginBottom: 8, lineHeight: 1.3 }}>{a.title}</h2>
              <p style={{ fontSize: 14, color: '#86868B', lineHeight: 1.6 }}>{a.description}</p>
              <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: '#007AFF' }}>Lire l'article →</div>
            </article>
          </Link>
        ))}
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 80px', textAlign: 'center' }}>
        <div style={{ background: '#1D1D1F', borderRadius: 20, padding: '40px 32px', color: '#FFF' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Prete a te lancer ?</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', marginBottom: 20 }}>27€/mois · 0% commission · Sans engagement</p>
          <Link href="/dashboard" style={{ display: 'inline-block', padding: '14px 28px', background: '#007AFF', color: '#FFF', textDecoration: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700 }}>Commencer maintenant</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#86868B' }}>© 2026 MY LIVE PAIEMENT</p>
      </footer>
    </div>
  )
}
