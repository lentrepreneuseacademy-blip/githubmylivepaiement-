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

  // Call WSI3_GetEtiquettes
  var concatStr = enseigne.toUpperCase() + expedition + 'FR' + privateKey
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

    // Extract all PDF URLs
    var pdfUrls = []
    var patterns = ['URL_PDF_A4', 'URL_PDF_A5', 'URL_PDF_10x15']
    for (var i = 0; i < patterns.length; i++) {
      var match = xml.match(new RegExp('<' + patterns[i] + '>([^<]*)</' + patterns[i] + '>', 'i'))
      if (match && match[1].trim()) {
        var pdfPath = match[1].trim().replace(/&amp;/g, '&')
        // Try multiple base URLs
        pdfUrls.push('https://api.mondialrelay.com' + pdfPath)
        pdfUrls.push('https://www.mondialrelay.com' + pdfPath)
        pdfUrls.push('https://connect.mondialrelay.com' + pdfPath)
        break
      }
    }

    // Try each URL - download and serve as PDF
    for (var j = 0; j < pdfUrls.length; j++) {
      console.log('[MR Label] Trying:', pdfUrls[j])
      try {
        var pdfRes = await fetch(pdfUrls[j], { redirect: 'follow' })
        console.log('[MR Label] Response:', pdfRes.status, pdfRes.headers.get('content-type'))
        if (pdfRes.ok) {
          var ct = pdfRes.headers.get('content-type') || ''
          if (ct.includes('pdf') || ct.includes('octet-stream')) {
            var pdfBuffer = await pdfRes.arrayBuffer()
            console.log('[MR Label] PDF OK:', pdfBuffer.byteLength, 'bytes from', pdfUrls[j])
            return new Response(pdfBuffer, {
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="etiquette-MR-' + expedition + '.pdf"',
              }
            })
          }
        }
      } catch(e) {
        console.log('[MR Label] Failed:', e.message)
      }
    }

    // All URLs failed - return HTML page with the expedition info and link to MR Connect
    console.log('[MR Label] All PDF URLs failed, showing fallback page')
    return new Response(labelPage(expedition, enseigne, pdfUrls[0] || ''), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })

  } catch (error) {
    console.error('[MR Label] Error:', error)
    return new Response(labelPage(expedition, enseigne, ''), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
}

function labelPage(expedition, enseigne, pdfUrl) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiquette Mondial Relay ' + expedition + '</title>'
    + '<style>body{font-family:Arial,sans-serif;margin:0;padding:0;background:#FAFAF8}*{box-sizing:border-box}</style></head><body>'
    + '<div style="max-width:500px;margin:40px auto;padding:20px">'
    + '<div style="text-align:center;margin-bottom:24px"><div style="width:60px;height:60px;background:#10B981;border-radius:50%;display:inline-flex;align-items:center;justify-content:center"><span style="color:#FFF;font-size:28px">✓</span></div></div>'
    + '<h2 style="text-align:center;margin:0 0 20px">Expedition Mondial Relay creee !</h2>'
    + '<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;padding:20px;text-align:center;margin-bottom:20px">'
    + '<div style="font-size:11px;color:#999;margin-bottom:4px">Numero de suivi</div>'
    + '<div style="font-size:32px;font-weight:900;letter-spacing:4px;color:#1A1A2E">' + expedition + '</div></div>'
    + '<p style="text-align:center;color:#777;font-size:14px;line-height:1.7;margin-bottom:24px">Pour imprimer ton etiquette, connecte-toi a ton espace Mondial Relay :</p>'
    + '<div style="text-align:center"><a href="https://connect.mondialrelay.com/shipping/shipments" target="_blank" style="display:inline-block;padding:16px 36px;background:#E30613;color:#FFF;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">Imprimer sur Mondial Relay Connect</a></div>'
    + (pdfUrl ? '<p style="text-align:center;margin-top:16px"><a href="' + pdfUrl + '" target="_blank" style="color:#6366F1;font-size:13px">Essayer le lien direct du PDF</a></p>' : '')
    + '<div style="margin-top:24px;padding:16px;background:#FFF;border:1px solid rgba(0,0,0,.06);border-radius:12px;font-size:13px;color:#777;line-height:1.7">'
    + '<strong style="color:#1A1A1A">Comment faire :</strong><br>'
    + '1. Clique sur le bouton rouge ci-dessus<br>'
    + '2. Connecte-toi avec ton compte Mondial Relay<br>'
    + '3. Tu verras ton expedition <strong>' + expedition + '</strong><br>'
    + '4. Clique sur l\'icone imprimante pour telecharger le PDF</div>'
    + '</div></body></html>'
}
