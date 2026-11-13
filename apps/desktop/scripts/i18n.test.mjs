import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function load(name) {
  const source = await readFile(new URL(`../src/i18n/${name}.ts`, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } })
  const exports = {}
  new Function('exports', outputText)(exports)
  return Object.values(exports)[0]
}
const localeModule = await readFile(new URL('../src/i18n/locales.ts', import.meta.url), 'utf8')
const exports = {}
new Function('exports', ts.transpileModule(localeModule, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText)(exports)
const { detectLocale, normalizeLocale, SUPPORTED_LOCALES } = exports
const saved = value => ({ getItem: () => value })
const system = (...languages) => ({ languages, language: languages[0] })

test('five native language names match the website language set', () => {
  assert.deepEqual(SUPPORTED_LOCALES.map(x => x.name), ['简体中文', '繁體中文', 'English', '한국어', '日本語'])
})

test('match script, region, case and underscore variants', () => {
  for (const [tag, expected] of Object.entries({
    zh: 'zh-CN', 'zh-CN': 'zh-CN', 'zh-SG': 'zh-CN', 'zh-Hans': 'zh-CN', 'zh-Hans-HK': 'zh-CN', 'zh-Hant-CN': 'zh-TW',
    'zh-TW': 'zh-TW', 'zh-HK': 'zh-TW', 'zh-MO': 'zh-TW', 'zh-Hant': 'zh-TW',
    zh_Hant_HK: 'zh-TW', 'EN-gb': 'en-US', 'en-AU': 'en-US', ja: 'ja-JP', 'ja-JP': 'ja-JP', ko: 'ko-KR', 'ko-KR': 'ko-KR',
  })) {
    assert.equal(normalizeLocale(tag), expected, tag)
    assert.equal(detectLocale(null, system(tag)), expected, tag)
  }
  assert.equal(normalizeLocale('english'), undefined)
  assert.equal(normalizeLocale(null), undefined)
})

test('manual preferences win and invalid preferences do not prevent system matching', () => {
  assert.equal(detectLocale(saved('en-US'), system('ko-KR')), 'en-US')
  assert.equal(detectLocale(saved('zh-TW'), system('en-US')), 'zh-TW')
  assert.equal(detectLocale(saved('invalid'), system('ja-JP')), 'ja-JP')
  assert.equal(detectLocale(saved('ja-JP'), system('zh-CN')), 'ja-JP')
  assert.equal(detectLocale({ getItem() { throw Error('Storage unavailable') } }, system('ko-KR')), 'ko-KR')
})

test('system preference order and English fallback', () => {
  assert.equal(detectLocale(null, system('fr-FR', 'ko-KR', 'en-US')), 'ko-KR')
  assert.equal(detectLocale(null, system('fr-FR', 'de-DE')), 'en-US')
  assert.equal(detectLocale(null, {}), 'en-US')
  assert.equal(detectLocale(null, { language: 'ja-JP' }), 'ja-JP')
})

test('all five dictionaries cover the same keys and preserve interpolation variables', async () => {
  const reference = await load('en-US')
  const keys = Object.keys(reference).sort()
  const variables = text => [...text.matchAll(/\{([A-Za-z]+)\}/g)].map(m => m[1]).sort()
  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR']) {
    const dictionary = await load(locale)
    assert.deepEqual(Object.keys(dictionary).sort(), keys, locale)
    for (const key of keys) {
      assert.ok(dictionary[key].trim(), `${locale}: empty ${key}`)
      assert.deepEqual(variables(dictionary[key]), variables(reference[key]), `${locale}: ${key}`)
    }
  }
})
