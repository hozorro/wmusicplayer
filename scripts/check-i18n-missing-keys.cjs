const fs = require('fs')
const path = require('path')

const LANG_DIR = path.resolve(__dirname, '../src/i18n/langs')

function walk(obj, prefix = '') {
  let keys = []

  for (const key in obj) {
    const value = obj[key]
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(walk(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }

  return keys
}

function loadLangFiles() {
  const files = fs.readdirSync(LANG_DIR).filter(f => f.endsWith('.json'))
  const langs = {}

  for (const file of files) {
    const locale = file.replace('.json', '')
    const json = JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), 'utf8'))
    langs[locale] = walk(json)
  }

  return langs
}

function checkMissingKeys() {
  const langs = loadLangFiles()
  const allLocales = Object.keys(langs)

  if (allLocales.length === 0) {
    console.log('No language files found.')
    return
  }

  // 所有 key 的全集
  const allKeys = new Set()
  allLocales.forEach(locale => {
    langs[locale].forEach(key => allKeys.add(key))
  })

  console.log('=== i18n Missing Keys Report ===\n')

  allLocales.forEach(locale => {
    const keys = new Set(langs[locale])
    const missing = [...allKeys].filter(k => !keys.has(k))

    if (missing.length === 0) {
      console.log(`✔ ${locale} 完整，没有缺失 key`)
    } else {
      console.log(`❌ ${locale} 缺失 ${missing.length} 个 key:`)
      missing.forEach(k => console.log(`   - ${k}`))
    }

    console.log('')
  })
}

checkMissingKeys()
