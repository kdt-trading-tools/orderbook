import type { OrderBookOptions, HandleSnapshotParams, HandleDeltaParams } from './types'
import { OrderBook } from './order-book'

export class OrderBookStore<O extends OrderBookOptions = OrderBookOptions> {
    protected readonly books: Record<string, OrderBook> = {}

    public constructor(protected readonly options?: O) {}

    public getBook(symbol: string) {
        return this.books[symbol] ??= new OrderBook(this.options)
    }

    public handleSnapshot(symbol: string, params: HandleSnapshotParams) {
        try {
            return this.getBook(symbol).handleSnapshot(params as any)
        } catch (error) {
            throw new Error(`Failed to handle snapshot for symbol ${symbol}`, { cause: error })
        }
    }

    public handleDelta(symbol: string, params: HandleDeltaParams<O>) {
        try {
            return this.getBook(symbol).handleDelta(params as any)
        } catch (error) {
            throw new Error(`Failed to handle delta for symbol ${symbol}`, { cause: error })
        }
    }

    public reset(symbol: string) {
        return this.getBook(symbol).reset()
    }

    public remove(symbol: string) {
        delete this.books[symbol]
    }
}
