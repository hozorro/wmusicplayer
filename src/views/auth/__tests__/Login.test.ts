// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, nextTick } from 'vue'
import Login from '../Login.vue'

const h = vi.hoisted(() => ({
  login: vi.fn(),
  push: vi.fn(),
  query: {} as Record<string, unknown>,
  state: {
    isLogining: false,
    loginErrors: null as Record<string, unknown> | null,
  },
  locale: 'zh-CN' as 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR',
}))

const messages: Record<typeof h.locale, Record<string, string>> = {
  'zh-CN': { 'auth.login': '登录', 'auth.headline': '再次感受律动' },
  'en-US': { 'auth.login': 'Login', 'auth.headline': 'Feel the Beat again' },
  'ja-JP': { 'auth.login': 'ログイン', 'auth.headline': 'もう一度、ビートを感じよう' },
  'ko-KR': { 'auth.login': '로그인', 'auth.headline': '다시 한번, 비트를 느껴보세요' },
}

vi.mock('@/store/auth', () => ({
  useAuthStore: () => ({ ...h.state, login: h.login }),
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: h.query }),
  useRouter: () => ({ push: h.push }),
}))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => messages[h.locale][key] ?? key }),
}))

let apps: { unmount: () => void }[] = []

function mountLogin() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(Login)
  app.mount(host)
  apps.push(app)
  return host
}

function setInput(host: HTMLElement, selector: string, value: string) {
  const input = host.querySelector<HTMLInputElement>(selector)!
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function submit(host: HTMLElement) {
  host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

async function flush() {
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await nextTick()
}

describe('Login', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    apps = []
    h.login.mockReset().mockResolvedValue(true)
    h.push.mockReset()
    h.query = {}
    h.state.isLogining = false
    h.state.loginErrors = null
    h.locale = 'zh-CN'
  })

  afterEach(() => {
    apps.forEach(app => app.unmount())
    apps = []
    document.body.innerHTML = ''
  })

  it('keeps both brand lines in English for every locale while i18n text changes', async () => {
    for (const locale of ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'] as const) {
      h.locale = locale
      const host = mountLogin()
      await nextTick()

      expect(host.textContent).toContain('pulse engine  v2.0')
      expect(host.textContent).toContain('A distinctive music player')
      expect(host.textContent).toContain(messages[locale]['auth.headline'])

      apps.forEach(app => app.unmount())
      apps = []
      host.remove()
    }
  })

  it('uses the project PNG logo instead of the Stitch placeholder', async () => {
    const host = mountLogin()
    await nextTick()

    const logo = host.querySelector('img')
    expect(logo?.getAttribute('src')).toBe('/icons/icon-192.png')
    expect(logo?.getAttribute('alt')).toBe('WMusicPlayer')
  })

  it('submits credentials and honours the redirect query', async () => {
    h.query = { redirect: '/setting' }
    const host = mountLogin()
    await nextTick()

    setInput(host, '#username', 'alice')
    setInput(host, '#password', 'secret')
    await nextTick()
    submit(host)
    await flush()

    expect(h.login).toHaveBeenCalledWith('alice', 'secret')
    expect(h.push).toHaveBeenCalledWith('/setting')
  })

  it('navigates home when there is no redirect and does not navigate on failure', async () => {
    const host = mountLogin()
    await nextTick()

    submit(host)
    await flush()
    expect(h.push).toHaveBeenCalledWith('/')

    h.login.mockResolvedValueOnce(false)
    const failingHost = mountLogin()
    await nextTick()
    submit(failingHost)
    await flush()
    expect(h.push).toHaveBeenCalledTimes(1)
  })

  it('toggles password visibility', async () => {
    const host = mountLogin()
    await nextTick()

    const input = host.querySelector<HTMLInputElement>('#password')!
    const toggle = host.querySelector<HTMLButtonElement>('[aria-pressed]')!
    expect(input.type).toBe('password')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')

    toggle.click()
    await nextTick()
    expect(input.type).toBe('text')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')

    toggle.click()
    await nextTick()
    expect(input.type).toBe('password')
  })

  it('clears the username when the clear button is clicked', async () => {
    const host = mountLogin()
    await nextTick()

    setInput(host, '#username', 'alice')
    await nextTick()
    const clearButton = host.querySelector<HTMLButtonElement>('button[aria-label="common.clear"]')!
    clearButton.click()
    await nextTick()

    expect(host.querySelector<HTMLInputElement>('#username')!.value).toBe('')
  })

  it('disables the submit button while a login is in flight', async () => {
    h.state.isLogining = true
    const host = mountLogin()
    await nextTick()

    const button = host.querySelector<HTMLButtonElement>('button[type="submit"]')!
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')

    submit(host)
    await flush()
    expect(h.login).not.toHaveBeenCalled()
  })

  it.each([
    ['form', { form: '用户名或密码不正确' }],
    ['field', { fields: { username: ['该字段必填'] } }],
  ])('shows %s errors in an alert', async (_kind, errors) => {
    h.state.loginErrors = errors
    const host = mountLogin()
    await nextTick()

    const alert = host.querySelector('[role="alert"]')!
    expect(alert.textContent).toContain(_kind === 'form' ? '用户名或密码不正确' : '该字段必填')
  })
})
