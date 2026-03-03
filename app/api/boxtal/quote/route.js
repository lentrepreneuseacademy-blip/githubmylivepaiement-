import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    var body = await request.json()
    var bx = body.boxtal || {}
    var recipient = body.recipient || {}
    var parcel = body.parcel || {}

    var user = bx.user
    var pass = bx.pass

    if (!user || !pass) {
      return NextResponse.json({ error: 'Configure tes identifiants Boxtal dans Parametres > Boxtal.' })
    }

    var baseUrl = 'https://api.envoimoinscher.com'
    var senderZip = bx.senderZip || '75002'
    var senderCity = bx.senderCity || 'Paris'

    var params = new URLSearchParams()
    params.append('expediteur.pays', 'FR')
    params.append('expediteur.code_postal', senderZip)
    params.append('expediteur.ville', senderCity)
    params.append('expediteur.type', 'entreprise')
    params.append('destinataire.pays', recipient.country || 'FR')
    params.append('destinataire.code_postal', recipient.zipcode || '')
    params.append('destinataire.ville', recipient.city || '')
    params.append('destinataire.type', 'particulier')
    params.append('colis_1.poids', String(parcel.weight || 0.5))
    params.append('colis_1.longueur', String(parcel.length || 30))
    params.append('colis_1.largeur', String(parcel.width || 20))
    params.append('colis_1.hauteur', String(parcel.height || 10))
    params.append('code_contenu', '40120')
    params.append('collecte', 'aucun')
    params.append('type_emballage', 'colis')

    var url = baseUrl + '/api/v1/cotation?' + params.toString()
    var auth = Buffer.from(user + ':' + pass).toString('base64')

    var res = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + auth,
        'Accept': 'application/xml',
      }
    })
    var xml = await res.text()

    var quotes = []
    var offerRegex = /<offer>(.*?)<\/offer>/gs
    var match
    while ((match = offerRegex.exec(xml)) !== null) {
      var block = match[1]
      var opBlock = block.match(/<operator>(.*?)<\/operator>/s)
      var svcBlock = block.match(/<service>(.*?)<\/service>/s)
      var priceBlock = block.match(/<price>(.*?)<\/price>/s)
      var delivBlock = block.match(/<delivery>(.*?)<\/delivery>/s)

      var getSubTag = function(b, tag) {
        if (!b) return ''
        var m = b[1].match(new RegExp('<' + tag + '>(.*?)</' + tag + '>'))
        return m ? m[1] : ''
      }

      quotes.push({
        operator_code: getSubTag(opBlock, 'code'),
        operator_label: getSubTag(opBlock, 'label'),
        logo: getSubTag(opBlock, 'logo'),
        service_code: getSubTag(svcBlock, 'code'),
        service_label: getSubTag(svcBlock, 'label'),
        price_ht: getSubTag(priceBlock, 'tax-exclusive'),
        price_ttc: getSubTag(priceBlock, 'tax-inclusive'),
        delivery_type: delivBlock ? getSubTag(delivBlock, 'label') : '',
        delivery_delay: delivBlock ? getSubTag(delivBlock, 'delay') : '',
      })
    }

    quotes.sort(function(a, b) { return parseFloat(a.price_ttc || 999) - parseFloat(b.price_ttc || 999) })
    return NextResponse.json({ quotes: quotes })

  } catch (err) {
    return NextResponse.json({ error: 'Erreur Boxtal: ' + (err.message || 'Erreur inconnue') })
  }
}
