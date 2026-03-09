export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard'],
      },
    ],
    sitemap: 'https://www.mylivepaiement.com/sitemap.xml',
  }
}
