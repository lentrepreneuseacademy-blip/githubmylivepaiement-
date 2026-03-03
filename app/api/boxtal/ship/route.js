import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    var body = await request.json()
    var bx = body.boxtal || {}
    var recipient = body.recipient || {}
    var parcel = body.parcel || {}
    var carrier = body.carrier || {}
    var reference = body.reference || ''
    var shopName = body.shopName || 'Ma Boutique'
    var shopEmail = body.shopEmail || ''

    var user = bx.user
    var pass = bx.pass

    if (!user || !pass) {
      return NextResponse.json({ error: 'Configure tes identifiants Boxtal dans Parametres.' })
    }

    // URL correcte Boxtal / EnvoiMoinsCher
    var baseUrl = bx.testMode
      ? 'https://test.envoimoinscher.com'
      : 'https://www.envoimoinscher.com'

    var params = new URLSearchParams()
    // Sender from config
    params.append('expediteur.pays', 'FR')
    params.append('expediteur.code_postal', bx.senderZip || '75002')
    params.append('expediteur.ville', bx.senderCity || 'Paris')
    params.append('expediteur.adresse', bx.senderAddress || '')
    params.append('expediteur.type', 'entreprise')
    params.append('expediteur.societe', shopName)
    params.append('expediteur.civilite', 'M')
    params.append('expediteur.prenom', shopName.split(' ')[0] || 'Service')
    params.append('expediteur.nom', shopName)
    params.append('expediteur.email', shopEmail || user)
    params.append('expediteur.tel', bx.senderPhone || '0600000000')
    // Recipient
    params.append('destinataire.pays', recipient.country || 'FR')
    params.append('destinataire.code_postal', recipient.zipcode || '')
    params.append('destinataire.ville', recipient.city || '')
    params.append('destinataire.adresse', recipient.address || '')
    params.append('destinataire.type', 'particulier')
    params.append('destinataire.civilite', 'Mme')
    params.append('destinataire.prenom', recipient.firstname || 'Client')
    params.append('destinataire.nom', recipient.lastname || '')
    params.append('destinataire.email', recipient.email || '')
    params.append('destinataire.tel', recipient.phone || '')
    // Parcel
    params.append('colis_1.poids', String(parcel.weight || 0.5))
    params.append('colis_1.longueur', String(parcel.length || 30))
    params.append('colis_1.largeur', String(parcel.width || 20))
    params.append('colis_1.hauteur', String(parcel.height || 10))
    params.append('colis.description', parcel.description || 'Vetements')
    params.append('colis.valeur', String(parcel.value || 0))
    params.append('code_contenu', '40120')
    // Carrier
    params.append('operateur', carrier.operator || '')
    params.append('service', carrier.service || '')

    var url = baseUrl + '/api/v1/order'
    var auth = Buffer.from(user + ':' + pass).toString('base64')

    var res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/xml',
      },
      body: params.toString()
    })
    var xml = await res.text()

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ error: 'Identifiants Boxtal invalides.' })
    }

    var refMatch = xml.match(/<reference>(.*?)<\/reference>/)
    var labelMatch = xml.match(/<label>(.*?)<\/label>/)

    if (!refMatch && (xml.includes('<e>') || xml.includes('<errors>'))) {
      var errMsg = xml.match(/<message>(.*?)<\/message>/s)
      return NextResponse.json({ error: errMsg ? errMsg[1] : 'Erreur Boxtal lors de la commande.' })
    }

    return NextResponse.json({
      reference: refMatch ? refMatch[1] : reference,
      tracking: refMatch ? refMatch[1] : '',
      label_url: labelMatch ? labelMatch[1] : null,
    })

  } catch (err) {
    return NextResponse.json({ error: 'Erreur connexion Boxtal: ' + (err.message || 'Erreur inconnue') })
  }
}
