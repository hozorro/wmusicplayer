// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, nextTick } from 'vue'
import ConfirmDialog from '../ConfirmDialog.vue'

let mounted: { unmount: () => void }[] = []

function mountDialog(props: Record<string, unknown> = {}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  const app = createApp(ConfirmDialog, {
    open: true,
    title: 'Sign out?',
    message: 'Are you sure?',
    confirmText: 'Sign out',
    cancelText: 'Cancel',
    danger: true,
    onConfirm,
    onCancel,
    ...props,
  })
  app.mount(host)
  mounted.push(app)
  return { onConfirm, onCancel }
}

function click(testId: string) {
  const el = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
  expect(el, `${testId} should exist`).toBeTruthy()
  el!.click()
}

describe('ConfirmDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    mounted = []
  })

  afterEach(() => {
    mounted.forEach(app => app.unmount())
    mounted = []
    document.body.innerHTML = ''
  })

  it('renders title, message and both action labels', async () => {
    mountDialog()
    await nextTick()

    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.textContent).toContain('Sign out?')
    expect(dialog?.textContent).toContain('Are you sure?')
    expect(document.querySelector('[data-testid="confirm-dialog-confirm"]')?.textContent).toContain('Sign out')
    expect(document.querySelector('[data-testid="confirm-dialog-cancel"]')?.textContent).toContain('Cancel')
  })

  it('does not render anything when closed', async () => {
    mountDialog({ open: false })
    await nextTick()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('emits confirm when the confirm button is clicked', async () => {
    const { onConfirm, onCancel } = mountDialog()
    await nextTick()

    click('confirm-dialog-confirm')
    await nextTick()

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('emits cancel and closes on the cancel button', async () => {
    const { onConfirm, onCancel } = mountDialog()
    await nextTick()

    click('confirm-dialog-cancel')
    await nextTick()

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('emits cancel when the overlay is clicked, but not when the panel is clicked', async () => {
    const { onCancel } = mountDialog()
    await nextTick()

    document.querySelector<HTMLElement>('[role="dialog"]')!.click()
    await nextTick()
    expect(onCancel).not.toHaveBeenCalled()

    click('confirm-dialog-overlay')
    await nextTick()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('emits cancel on Escape', async () => {
    const { onCancel } = mountDialog()
    await nextTick()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('blocks confirm while busy', async () => {
    const { onConfirm } = mountDialog({ busy: true })
    await nextTick()

    click('confirm-dialog-confirm')
    await nextTick()

    expect(onConfirm).not.toHaveBeenCalled()
    expect(document.querySelector<HTMLButtonElement>('[data-testid="confirm-dialog-confirm"]')?.disabled).toBe(true)
  })
})
