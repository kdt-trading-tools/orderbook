import { Decimal } from 'decimal.js'

export type Level = [price: string, quantity: string]

export interface OrderBookOptions {
    maxDepth?: number
    checkId?: boolean
    checkTimestamp?: boolean
}

export interface UpdateParams {
    timestamp?: number
    asks: Level[]
    bids: Level[]
}

type CheckIdType<O extends OrderBookOptions> = O['checkId'] extends boolean ? O['checkId'] : true

export type HandleSnapshotParams<O extends OrderBookOptions = OrderBookOptions> = UpdateParams & (
    CheckIdType<O> extends true ? { lastUpdateId: number } : { lastUpdateId?: number }
)

export type HandleDeltaParams<O extends OrderBookOptions = OrderBookOptions> = UpdateParams & (
    CheckIdType<O> extends true ? { fromId: number; toId: number } : { fromId?: number; toId?: number }
)

export interface ConvertFill {
    price: Decimal
    qty: Decimal
    quoteQty: Decimal
}

export interface ConvertResult {
    remainingQty: Decimal
    remainingType: 'base' | 'quote'
    filledQty: Decimal
    filledQuoteQty: Decimal
    highestPrice: Decimal
    lowestPrice: Decimal
    fills: ConvertFill[]
}
