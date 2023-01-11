interface TronlinkTronProvider {
  isTronLink?: boolean
  request: (request: { method: string; params?: unknown[] }) => Promise<unknown>
  once(eventName: string | symbol, listener: (...args: any[]) => void): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this
  off(eventName: string | symbol, listener: (...args: any[]) => void): this
  addListener(
    eventName: string | symbol,
    listener: (...args: any[]) => void
  ): this
  removeListener(
    eventName: string | symbol,
    listener: (...args: any[]) => void
  ): this
  removeAllListeners(event?: string | symbol): this
}

interface Window {
  tronLink?: TronlinkTronProvider
}

export = detectTronProvider

/**
 * Returns a Promise that resolves to the value of window.tronLink if it is
 * set within the given timeout, or null.
 * The Promise will not reject, but an error will be thrown if invalid options
 * are provided.
 *
 * @param options - Options bag.
 * @param options.mustBeTronLink - Whether to only look for TronLink providers.
 * Default: false
 * @param options.silent - Whether to silence console errors. Does not affect
 * thrown errors. Default: false
 * @param options.timeout - Milliseconds to wait for 'tronLink#initialized' to
 * be dispatched. Default: 3000
 * @returns A Promise that resolves with the Provider if it is detected within
 * given timeout, otherwise null.
 */
function detectTronProvider<T = TronlinkTronProvider>({
  mustBeTronLink = false,
  silent = false,
  timeout = 3000,
} = {}): Promise<T | null> {
  _validateInputs()

  let handled = false

  return new Promise((resolve) => {
    if ((window as Window).tronLink) {
      handleTronLink()
    } else {
      window.addEventListener("tronLink#initialized", handleTronLink, {
        once: true,
      })

      setTimeout(() => {
        handleTronLink()
      }, timeout)
    }

    function handleTronLink() {
      if (handled) {
        return
      }
      handled = true

      window.removeEventListener("tronLink#initialized", handleTronLink)

      const { tronLink } = window as Window

      if (tronLink && (!mustBeTronLink || tronLink.isTronLink)) {
        resolve(tronLink as unknown as T)
      } else {
        const message =
          mustBeTronLink && tronLink
            ? "Non-TronLink window.tronLink detected."
            : "Unable to detect window.tronLink."

        !silent && console.error("@metamask/detect-provider:", message)
        resolve(null)
      }
    }
  })

  function _validateInputs() {
    if (typeof mustBeTronLink !== "boolean") {
      throw new Error(
        `@metamask/detect-provider: Expected option 'mustBeTronLink' to be a boolean.`
      )
    }
    if (typeof silent !== "boolean") {
      throw new Error(
        `@metamask/detect-provider: Expected option 'silent' to be a boolean.`
      )
    }
    if (typeof timeout !== "number") {
      throw new Error(
        `@metamask/detect-provider: Expected option 'timeout' to be a number.`
      )
    }
  }
}
