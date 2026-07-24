/**
 * Audio Engine — Action Queue
 *
 * Serial Promise queue for managing audio actions.
 * Supports aborting the current interruptible action when a new one is enqueued.
 * Non-interruptible actions (e.g., seek) execute immediately after the current task finishes.
 */

export interface QueueAction {
  /** The async action to execute. Receives an AbortSignal for cancellation. */
  action: (signal: AbortSignal) => Promise<void>
  /** Whether this action can be interrupted by a new incoming action. Default: true */
  interruptible?: boolean
}

export interface ActionQueue {
  /**
   * Enqueue an action. Returns a Promise that resolves when the action completes.
   * If the current running action is interruptible, it will be aborted.
   */
  enqueue(action: QueueAction['action'], options?: { interruptible?: boolean }): Promise<void>

  /** Abort the current running action if it is interruptible */
  abortCurrent(): void

  /** Check if the queue is currently executing an action */
  isRunning(): boolean

  /** Clear pending queue and abort current (for disposal) */
  dispose(): void
}

/**
 * Create a serial action queue.
 * Only one action runs at a time. New interruptible actions abort the current one.
 */
export function createActionQueue(): ActionQueue {
  let currentAbort: AbortController | null = null
  let currentInterruptible = true
  let running = false
  // Chain of promises to ensure serial execution
  let chain: Promise<void> = Promise.resolve()

  function enqueue(
    action: QueueAction['action'],
    options?: { interruptible?: boolean },
  ): Promise<void> {
    const interruptible = options?.interruptible ?? true

    // If current action is interruptible, abort it
    if (running && currentInterruptible && currentAbort) {
      currentAbort.abort()
    }

    const promise = chain.then(() => {
      // Create a new abort controller for this action
      const abort = new AbortController()
      currentAbort = abort
      currentInterruptible = interruptible
      running = true

      return action(abort.signal)
        .catch((err) => {
          // AbortError is expected when interrupted — swallow it
          if (err instanceof DOMException && err.name === 'AbortError') return
          // Re-throw other errors
          throw err
        })
        .finally(() => {
          if (currentAbort === abort) {
            currentAbort = null
            running = false
          }
        })
    })

    // Update chain — catch errors to prevent chain breakage
    chain = promise.catch(() => {})

    return promise
  }

  return {
    enqueue,

    abortCurrent() {
      if (running && currentInterruptible && currentAbort) {
        currentAbort.abort()
      }
    },

    isRunning() {
      return running
    },

    dispose() {
      if (currentAbort) {
        currentAbort.abort()
        currentAbort = null
      }
      running = false
      chain = Promise.resolve()
    },
  }
}
