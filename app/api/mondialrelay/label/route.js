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

  console.log('[MR Label] Getting label for expedition:', expedition)

  var params = {
    Enseigne: enseigne.toUpperCase(),
    Expeditions: expedition,
    Langue: 'FR',
  }
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
    console.log('[MR Label] WSI3 response:', xml.length, 'chars')
    console.log('[MR Label] XML:', xml.substring(0, 800))

    var pdfUrl = null
    var patterns = ['URL_PDF_A4', 'URL_PDF_A5', 'URL_PDF_10x15', 'URL_Etiquette']
    for (var i = 0; i < patterns.length; i++) {
      var match = xml.match(new RegExp('<' + patterns[i] + '>([^<]*)</' + patterns[i] + '>', 'i'))
      if (match && match[1].trim()) {
        pdfUrl = match[1].trim().replace(/&amp;/g, '&')
        if (!pdfUrl.startsWith('http')) pdfUrl = 'https://api.mondialrelay.com' + pdfUrl
        console.log('[MR Label] Found', patterns[i], ':', pdfUrl)
        break
      }
    }

    if (pdfUrl) {
      console.log('[MR Label] Downloading PDF from:', pdfUrl)
      var pdfRes = await fetch(pdfUrl)
      if (pdfRes.ok) {
        var pdfBuffer = await pdfRes.arrayBuffer()
        console.log('[MR Label] PDF downloaded:', pdfBuffer.byteLength, 'bytes')
        return new Response(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="etiquette-' + expedition + '.pdf"',
          }
        })
      }
      console.error('[MR Label] PDF download failed:', pdfRes.status)
    }

    // Fallback: instructions page
    console.error('[MR Label] Could not get PDF for:', expedition)
    return new Response(fallbackHtml(expedition, enseigne), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })

  } catch (error) {
    console.error('[MR Label] Error:', error)
    return new Response(fallbackHtml(expedition, enseigne), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }
}

function fallbackHtml(expedition, enseigne) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiquette ' + expedition + '</title></head>'
    + '<body style="font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto">'
    + '<div style="text-align:center;margin-bottom:30px"><div style="width:60px;height:60px;background:#10B981;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px"><span style="color:#FFF;font-size:28px">✓</span></div>'
    + '<h2 style="margin:0">Expedition creee !</h2></div>'
    + '<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">'
    + '<div style="font-size:12px;color:#999">Numero de suivi</div>'
    + '<div style="font-size:28px;font-weight:900;letter-spacing:3px;color:#1A1A2E;margin-top:4px">' + expedition + '</div></div>'
    + '<p style="color:#555;line-height:1.7">L\'etiquette sera disponible dans quelques minutes sur ton espace Mondial Relay :</p>'
    + '<ol style="color:#555;line-height:2">'
    + '<li>Va sur <a href="https://www.mondialrelay.fr" target="_blank" style="color:#6366F1;font-weight:600">mondialrelay.fr</a> et connecte-toi</li>'
    + '<li>Clique sur <strong>Envois</strong> en haut</li>'
    + '<li>Tu verras l\'expedition <strong>' + expedition + '</strong></li>'
    + '<li>Clique dessus pour <strong>imprimer l\'etiquette</strong></li></ol>'
    + '<div style="text-align:center;margin-top:24px"><a href="https://www.mondialrelay.fr" target="_blank" style="display:inline-block;padding:16px 36px;background:#1A1A2E;color:#FFF;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">Ouvrir Mondial Relay</a></div>'
    + '</body></html>'
}
