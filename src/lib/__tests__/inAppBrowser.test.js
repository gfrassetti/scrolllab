import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { detectInAppBrowser } from '../inAppBrowser.js'

// User agents reales (recortados solo en versiones de app): Google no deja
// iniciar sesión en los navegadores de las primeras seis filas.
const IN_APP = {
  'Instagram · Android':
    'Mozilla/5.0 (Linux; Android 13; SM-S908B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.163 Mobile Safari/537.36 Instagram 310.0.0.37.109 Android (33/13; 480dpi; 1080x2340; samsung; SM-S908B; b0q; qcom; es_AR; 550386761)',
  'Instagram · iOS':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21B74 Instagram 310.0.0.27.108 (iPhone14,5; iOS 17_1; es_AR; es; scale=3.00; 1170x2532; 550386761)',
  'TikTok · Android':
    'Mozilla/5.0 (Linux; Android 12; SM-A125F Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 trill_310003 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/31.0.3 ByteLocale/es-AR BytedanceWebview/d8a21c6',
  'TikTok · iOS':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_31.0.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/es Region/AR',
  'Facebook · Android':
    'Mozilla/5.0 (Linux; Android 11; moto g(10) Build/RRCS31.Q1-46-36-3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.193 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0.0.39.113;]',
  'Facebook · iOS':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/440.0.0.39.113;FBBV/560000000;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.1;FBSS/3;FBID/phone;FBLC/es_LA;FBOP/5]',
  'LinkedIn · iOS':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LinkedInApp/9.30.1889',
}

const REGULAR = {
  'Safari · iPhone':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  'Chrome · iPhone':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.6045.169 Mobile/15E148 Safari/604.1',
  'Firefox · iPhone':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15',
  'Chrome · Android':
    'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
  'Samsung Internet':
    'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
  'Chrome · Windows':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Firefox · Windows':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Edge · Windows':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
  'Safari · Mac':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Safari · iPad':
    'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
}

describe('detectInAppBrowser — navegadores integrados', () => {
  for (const [name, ua] of Object.entries(IN_APP)) {
    it(`detecta ${name}`, () => {
      assert.equal(detectInAppBrowser(ua).inApp, true)
    })
  }

  it('dice de qué app es cuando la conoce', () => {
    assert.equal(detectInAppBrowser(IN_APP['Instagram · Android']).app, 'Instagram')
    assert.equal(detectInAppBrowser(IN_APP['Instagram · iOS']).app, 'Instagram')
    assert.equal(detectInAppBrowser(IN_APP['TikTok · Android']).app, 'TikTok')
    assert.equal(detectInAppBrowser(IN_APP['TikTok · iOS']).app, 'TikTok')
    assert.equal(detectInAppBrowser(IN_APP['Facebook · Android']).app, 'Facebook')
    assert.equal(detectInAppBrowser(IN_APP['Facebook · iOS']).app, 'Facebook')
    assert.equal(detectInAppBrowser(IN_APP['LinkedIn · iOS']).app, 'LinkedIn')
  })

  it('un WebView de Android sin app conocida se detecta igual, sin nombre', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 12; Pixel 6 Build/SD1A.210817.036; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36'
    assert.deepEqual(detectInAppBrowser(ua), { inApp: true, app: '' })
  })

  it('un WKWebView de iOS sin app conocida (sin "Safari/") se detecta igual, sin nombre', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
    assert.deepEqual(detectInAppBrowser(ua), { inApp: true, app: '' })
  })
})

describe('detectInAppBrowser — navegadores de verdad', () => {
  for (const [name, ua] of Object.entries(REGULAR)) {
    it(`no marca ${name}`, () => {
      assert.deepEqual(detectInAppBrowser(ua), { inApp: false, app: '' })
    })
  }
})

describe('detectInAppBrowser — entradas raras', () => {
  it('sin user agent (SSR, tests) devuelve false', () => {
    assert.deepEqual(detectInAppBrowser(), { inApp: false, app: '' })
    assert.deepEqual(detectInAppBrowser(''), { inApp: false, app: '' })
    assert.deepEqual(detectInAppBrowser(null), { inApp: false, app: '' })
    assert.deepEqual(detectInAppBrowser(42), { inApp: false, app: '' })
  })
})
