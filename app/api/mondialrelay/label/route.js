import { createHash } from 'crypto'

const MR_API_URL = 'https://api.mondialrelay.com/Web_Services.asmx'

export async function GET(request) {
  var url = new URL(request.url)
  var expedition = url.searchParams.get('expedition') || ''
  var enseigne = url.searchParams.get('ens') || process.env.MR_ENSEIGNE || ''
  var privateKey = url.searchParams.get('key') || process.env.MR_PRIVATE_KEY || ''

  if (!expedition || !enseigne || !privateKey) {
    return new Response('Parametres manquants', { status: 400 })
  }

  // WSI3_GetEtiquettes params
  var params = {
    Enseigne: enseigne.toUpperCase(),
    Expeditions: expedition,
    Langue: 'FR',
  }

  // MD5: concat all params + private key
  var concatStr = params.Enseigne + params.Expeditions + params.Langue + privateKey
  var security = createHash('md5').update(concatStr, 'utf8').digest('hex').toUpperCase()

  var soapXml = '<?xml version="1.0" encoding="utf-8"?>'
    + '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
    + '<soap:Body>'
    + '<WSI3_GetEtiquettes xmlns="http://www.mondialrelay.fr/webservice/">'
    + '<Enseigne>' + enseigne.toUpperCase() + '</Enseigne>'
    + '<Expeditions>' + expedition + '</Expeditions>'
    + '<Langue>FR</Langue>'
    + '<Security>' + security + '</Security>'
    + '</WSI3_GetEtiquettes>'
    + '</soap:Body>'
    + '</soap:Envelope>'

  console.log('[MR Label] Getting label for expedition:', expedition)

  try {
    var res = await fetch(MR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://www.mondialrelay.fr/webservice/WSI3_GetEtiquettes',
      },
      body: soapXml,
    })

    var xml = await res.text()
    console.log('[MR Label] Response:', res.status, xml.length, 'chars')

    var stat = xml.match(/<STAT>([^<]*)<\/STAT>/i)
    var statVal = stat ? stat[1].trim() : 'unknown'
    console.log('[MR Label] STAT:', statVal)

    if (statVal !== '0') {
      console.error('[MR Label] Error:', statVal)
      // Fallback: try the direct URL
      var directUrl = 'https://www.mondialrelay.com/etiquette/getStickersExpeditionsAnonyme2.aspx?ens=' + enseigne + '&expedition=' + expedition + '&lg=FR&format=A4'
      console.log('[MR Label] Trying direct URL:', directUrl)
      return Response.redirect(directUrl, 302)
    }

    // Extract PDF URL from response
    var urlMatch = xml.match(/<URL_PDF_A4>([^<]*)<\/URL_PDF_A4>/i)
    if (!urlMatch) urlMatch = xml.match(/<URL_PDF_A5>([^<]*)<\/URL_PDF_A5>/i)
    if (!urlMatch) urlMatch = xml.match(/<URL_PDF_10x15>([^<]*)<\/URL_PDF_10x15>/i)

    if (urlMatch) {
      var pdfUrl = urlMatch[1].trim().replace(/&amp;/g, '&')
      if (!pdfUrl.startsWith('http')) pdfUrl = 'https://api.mondialrelay.com' + pdfUrl
      console.log('[MR Label] PDF URL:', pdfUrl)
      return Response.redirect(pdfUrl, 302)
    }

    // No PDF URL found, try direct
    console.log('[MR Label] No PDF URL in response, trying direct')
    console.log('[MR Label] XML:', xml.substring(0, 500))
    var directUrl2 = 'https://www.mondialrelay.com/etiquette/getStickersExpeditionsAnonyme2.aspx?ens=' + enseigne + '&expedition=' + expedition + '&lg=FR&format=A4'
    return Response.redirect(directUrl2, 302)

  } catch (error) {
    console.error('[MR Label] Error:', error)
    return new Response('Erreur: ' + error.message, { status: 500 })
  }
}
