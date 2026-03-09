import { articles } from '../../../lib/blog-data'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  return articles.map(a => ({ slug: a.slug }))
}

export async function generateMetadata({ params }) {
  const article = articles.find(a => a.slug === params.slug)
  if (!article) return {}
  return {
    title: article.title + ' — MY LIVE PAIEMENT Blog',
    description: article.description,
    alternates: { canonical: 'https://www.mylivepaiement.com/blog/' + article.slug },
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.date,
      url: 'https://www.mylivepaiement.com/blog/' + article.slug,
    },
  }
}

export default function ArticlePage({ params }) {
  const article = articles.find(a => a.slug === params.slug)
  if (!article) notFound()

  const sf = "system-ui, -apple-system, 'SF Pro Display', sans-serif"

  // Simple markdown-like rendering
  const renderContent = (text) => {
    return text.trim().split('\n\n').map((block, i) => {
      const trimmed = block.trim()
      if (trimmed.startsWith('## ')) {
        return <h2 key={i} style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', marginTop: 40, marginBottom: 12, letterSpacing: -0.3 }}>{trimmed.replace('## ', '')}</h2>
      }
      return <p key={i} style={{ fontSize: 15, color: '#424245', lineHeight: 1.8, marginBottom: 16 }}>{trimmed}</p>
    })
  }

  const otherArticles = articles.filter(a => a.slug !== article.slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    author: { '@type': 'Organization', name: 'MY LIVE PAIEMENT' },
    publisher: {
      '@type': 'Organization',
      name: 'MY LIVE PAIEMENT',
      url: 'https://www.mylivepaiement.com',
    },
  }

  return (
    <div style={{ background: '#F5F5F7', minHeight: '100vh', fontFamily: sf }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Nav */}
      <nav style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#1D1D1F' }}>
          <div style={{ width: 32, height: 32, background: '#1D1D1F', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#FFF', fontSize: 11, fontWeight: 900 }}>ML</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>MY LIVE PAIEMENT</span>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/blog" style={{ padding: '8px 16px', color: '#86868B', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Blog</Link>
          <Link href="/dashboard" style={{ padding: '8px 18px', background: '#007AFF', color: '#FFF', textDecoration: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Commencer</Link>
        </div>
      </nav>

      {/* Article */}
      <article style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 60px' }}>
        <Link href="/blog" style={{ fontSize: 13, color: '#007AFF', textDecoration: 'none', fontWeight: 600 }}>← Retour au blog</Link>

        <div style={{ marginTop: 24, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: '#E8E8ED', color: '#86868B' }}>{article.category}</span>
          <span style={{ fontSize: 13, color: '#86868B' }}>{new Date(article.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span style={{ fontSize: 13, color: '#86868B' }}>· {article.readTime}</span>
        </div>

        <h1 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, color: '#1D1D1F', lineHeight: 1.2, marginBottom: 32, letterSpacing: -0.5 }}>
          {article.title}
        </h1>

        <div style={{ background: '#FFF', borderRadius: 16, padding: '32px 36px', border: '1px solid rgba(0,0,0,.04)' }}>
          {renderContent(article.content)}
        </div>
      </article>

      {/* CTA mid-article */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 48px' }}>
        <div style={{ background: '#1D1D1F', borderRadius: 16, padding: '32px', color: '#FFF', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Teste MY LIVE PAIEMENT</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', marginBottom: 16 }}>27€/mois · 0% commission · Sans engagement</div>
          <Link href="/dashboard" style={{ display: 'inline-block', padding: '12px 28px', background: '#007AFF', color: '#FFF', textDecoration: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700 }}>Commencer maintenant →</Link>
        </div>
      </section>

      {/* Other articles */}
      {otherArticles.length > 0 && (
        <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 80px' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1D1D1F', marginBottom: 16 }}>A lire aussi</h3>
          {otherArticles.map(a => (
            <Link key={a.slug} href={'/blog/' + a.slug} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ background: '#FFF', borderRadius: 12, padding: '18px 24px', marginBottom: 10, border: '1px solid rgba(0,0,0,.04)', cursor: 'pointer' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1D1D1F', marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: 13, color: '#86868B' }}>{a.readTime} · {a.category}</div>
              </div>
            </Link>
          ))}
        </section>
      )}

      <footer style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#86868B' }}>© 2026 MY LIVE PAIEMENT</p>
      </footer>
    </div>
  )
}
