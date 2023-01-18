import type { Provider } from "@web3-react/types"

export type TronLinkProvider = Provider & {
  on: (event: string, handler: (arg: any) => void) => void
  defaultAddress: {
    base58: string
    hex: string
    name: string
    type: number
  }
  isConnected?: () => boolean
  providers?: TronLinkProvider[]
}

export type TronLinkWallet = {
  isTronLink: boolean
  ready: boolean //Initialize to false, true after user authorization
  request: (args: any) => Promise<{ message: string; code: number }> // The method of tuning plugins for dapp website
  sunWeb: TronLinkProvider
  tronWeb: TronLinkProvider & {
    trx: TronLinkProvider
  }
}

interface Window {
  tronLink?: TronLinkWallet
}

export type DetectTronProvider = typeof detectTronProvider

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
export default function detectTronProvider<T = TronLinkWallet>({
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

      if (tronLink) {
        tronLink.isTronLink = true
        resolve(tronLink as unknown as T)
      } else {
        const message = tronLink
          ? "TronLink is not ready!"
          : "Unable to detect window.tronLink."

        !silent && console.error("tronlink/detect-provider:", message)
        resolve(null)
      }
    }
  })

  function _validateInputs() {
    if (typeof silent !== "boolean") {
      throw new Error(
        `tronlink/detect-provider: Expected option 'silent' to be a boolean.`
      )
    }
    if (typeof timeout !== "number") {
      throw new Error(
        `tronlink/detect-provider: Expected option 'timeout' to be a number.`
      )
    }
  }
}
