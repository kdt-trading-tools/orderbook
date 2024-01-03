import type { OrderBookOptions, HandleSnapshotParams, HandleDeltaParams } from './types'
import { OrderBook } from './order-book'

export class OrderBookStore<O extends OrderBookOptions = OrderBookOptions> {
    protected readonly books: Record<string, OrderBook> = {}

    public constructor(protected readonly options?: O) {}

    public getBook(symbol: string) {
        return this.books[symbol] ??= new OrderBook(this.options)
    }

    public handleSnapshot(symbol: string, params: HandleSnapshotParams) {
        return this.getBook(symbol).handleSnapshot(params as any)
    }

    public handleDelta(symbol: string, params: HandleDeltaParams<O>) {
        return this.getBook(symbol).handleDelta(params as any)
    }

    public reset(symbol: string) {
        return this.getBook(symbol).reset()
    }

    public remove(symbol: string) {
        delete this.books[symbol]
    }
}
