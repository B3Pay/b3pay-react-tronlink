import { TransactionRequest } from "@ethersproject/abstract-provider"
import { Bytes } from "ethers"
import { Deferrable } from "ethers/lib/utils"

export default class TronSigner {
  public provider: any
  getAddress(): Promise<string> {
    if (!this.provider.tronWeb) return Promise.reject("No provider")
    return this.provider.tronWeb?.defaultAddress.base58
  }

  async signMessage(message: string | Bytes): Promise<string> {
    if (!this.provider.tronWeb) return Promise.reject("No provider")
    var hexStr = this.provider.tronWeb.toHex(message)
    var signedStr = await this.provider.tronWeb.trx.sign(hexStr)

    return signedStr
  }

  signTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    if (!this.provider.tronWeb) return Promise.reject("No provider")
    return this.provider.sign(transaction)
  }

  async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    if (!this.provider.tronWeb) return Promise.reject("No provider")
    if (!transaction.to && !transaction.value) return Promise.reject("No data")

    return await this.provider.tronWeb.trx.sendTransaction(
      transaction.to,
      transaction.value
    )
  }

  async sendTransactionWithSign(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    if (!this.provider.tronWeb) return Promise.reject("No provider")

    const fromAddress = this.getAddress()
    const toAddress = transaction.to
    const amount = transaction.value
    const tx = await this.provider.tronWeb.transactionBuilder.sendTrx(
      toAddress,
      amount,
      fromAddress
    )

    const signedTx = await this.provider.tronWeb.trx.sign(tx)
    return await this.provider.tronWeb.trx.sendRawTransaction(signedTx)
  }

  constructor(provider: any) {
    this.provider = provider
  }
}
