import type { Actions } from "@web3-react/types"
import {
  DetectTronProvider,
  TronLinkProvider,
  TronLinkWallet,
} from "./detect-provider"
import TronSigner from "./signer"

export class TronLinkError extends Error {
  code: number
  message: string
  constructor(message: string, code: number) {
    super(message)
    this.code = code
    this.message = message
  }
}

export class NoTronLinkError extends Error {
  public constructor() {
    super("TronLink not installed")
    this.name = NoTronLinkError.name
    Object.setPrototypeOf(this, NoTronLinkError.prototype)
  }
}

export interface TronLinkWatchAssetParameters {
  type: "trc10" | "trc20" | "trc721"
  address: string
  symbol?: string
  decimals?: number
  image?: string
}

/**
 * @param options - Options to pass to `@TronLink/detect-provider`
 * @param onError - Handler to report errors thrown from eventListeners.
 */
export interface TronLinkConstructorArgs {
  actions: Actions
  options?: Parameters<DetectTronProvider>[0]
  onError?: (error: Error) => void
}

export class TronLink {
  /** {@inheritdoc Connector.provider} */
  public provider?: TronLinkProvider
  public isTronLink = true
  public customProvider: any

  private readonly options?: Parameters<DetectTronProvider>[0]
  private eagerConnection?: Promise<void>
  private tronlink: TronLinkWallet | null = null
  private cancelActivation: (() => void) | undefined

  protected onError?: (error: Error) => void
  actions: Actions

  constructor({ actions, options, onError }: TronLinkConstructorArgs) {
    this.actions = actions
    this.options = options
    this.onError = onError
  }

  private async connect(): Promise<void> {
    if (!this.tronlink) return this.cancelActivation?.()

    return this.tronlink
      .request({ method: "tron_requestAccounts" })
      .then(async (res): Promise<void> => {
        if (!res) {
          throw new TronLinkError("Wallet is locked!", 100)
        }
        if (res.code !== 200) {
          throw new TronLinkError(res.message, res.code)
        }

        this.provider = this.tronlink?.tronWeb
        this.customProvider = this.tronlink?.tronWeb.trx

        if (this.customProvider) {
          this.customProvider.getSigner = () => {
            return new TronSigner(this.tronlink?.tronWeb.trx)
          }
        }
        if (this.provider?.defaultAddress?.base58) {
          const accounts = [this.provider.defaultAddress.base58]
          this.actions.update({ chainId: 1000000000, accounts })
        } else {
          throw new Error("No accounts returned")
        }
      })
      .catch((error) => {
        console.log("Could not connect eagerly to TronLink", error)
        this.cancelActivation?.()
        let err = error

        if (typeof error === "object") {
          err.message = error.message
          err.code = error.code
        }
        if (typeof error === "string") {
          err.message = error.replace("[commonRequest]: ", "")
          err.code = 3000
        }

        throw err
      })
  }

  private async isomorphicInitialize(): Promise<void> {
    if (this.eagerConnection) return

    return (this.eagerConnection = import("./detect-provider").then(
      async (m) => {
        this.tronlink = await m.default(this.options)
        this.provider = this.tronlink?.tronWeb

        window.addEventListener("message", (e) => {
          if (e.data.message && e.data.message.action === "accountsChanged") {
            const accounts = [e.data.message.data.address]
            if (accounts.length === 0 || !this.tronlink?.tronWeb) {
              this.actions.resetState()
            } else {
              this.actions.update({ accounts, chainId: 1000000000 })
            }
          }

          if (e.data.message && e.data.message.action === "disconnectWeb") {
            this.actions.resetState()
            this.onError?.(e.data.message)
          }

          if (e.data.message && e.data.message.action === "rejectWeb") {
            this.onError?.(e.data.message)
          }

          if (e.data.message && e.data.message.action === "setNode") {
            if (e.data.message.data.node.chain === "_") {
              this.actions.update({ chainId: 1000000000 })
            } else {
              this.actions.update({ chainId: 1000000001 })
            }
          }
        })
      }
    ))
  }

  /** {@inheritdoc Connector.connectEagerly} */
  public async connectEagerly(): Promise<void> {
    this.cancelActivation = this.actions.startActivation()
    await this.isomorphicInitialize()

    if (!this.tronlink) {
      this.cancelActivation?.()
      throw new NoTronLinkError()
    }

    return this.connect()
  }

  public async activate(): Promise<void> {
    if (!this.provider?.isConnected?.())
      this.cancelActivation = this.actions.startActivation()

    await this.isomorphicInitialize()

    return this.connect()
  }

  resetState() {
    this.actions.resetState()
  }

  public async watchAsset({
    type,
    address,
    symbol,
    decimals,
    image,
  }: TronLinkWatchAssetParameters): Promise<true> {
    if (!this.provider) throw new TronLinkError("No provider", -32001)

    return this.provider
      .request({
        method: "wallet_watchAsset",
        params: {
          type, // Initially only supports ERC20, but eventually more!
          options: {
            address, // The address that the token is at.
            symbol, // A ticker symbol or shorthand, up to 5 chars.
            decimals, // The number of decimals in the token
            image, // A string url of the token logo
          },
        },
      })
      .then((success) => {
        if (!success) throw new TronLinkError("Rejected", 4001)
        return true
      })
  }
}
