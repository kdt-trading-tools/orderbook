import { Decimal } from 'decimal.js'
import { notNullish } from '@khangdt22/utils/condition'
import { entries } from '@khangdt22/utils/object'
import type { OrderBookOptions, Level, HandleDeltaParams, HandleSnapshotParams, UpdateParams } from './types'

export class OrderBook<O extends OrderBookOptions = OrderBookOptions> {
    protected readonly shouldCheckId: boolean
    protected readonly shouldCheckTimestamp: boolean
    protected readonly maxDepth: number

    protected updatedAt: number
    protected updatedId?: number

    protected asks: Record<string, string>
    protected bids: Record<string, string>

    protected bestAsk?: Level
    protected bestBid?: Level

    public constructor(options?: O) {
        this.shouldCheckId = options?.checkId ?? true
        this.shouldCheckTimestamp = options?.checkTimestamp ?? true
        this.maxDepth = options?.maxDepth ?? 100
        this.asks = {}
        this.bids = {}
        this.updatedAt = Date.now()
    }

    public getAsks(): Level[] {
        return Object.entries(this.asks)
    }

    public getBids(): Level[] {
        return Object.entries(this.bids)
    }

    public getBestAsk() {
        return this.bestAsk ??= this.getAsks().at(0)
    }

    public getBestBid() {
        return this.bestBid ??= this.getBids().at(0)
    }

    public getLastUpdateId() {
        return this.updatedId
    }

    public getLatestUpdateTimestamp() {
        return this.updatedAt
    }

    public handleSnapshot(params: HandleSnapshotParams) {
        this.reset()
        this.update(params, params.lastUpdateId)
    }

    public handleDelta(params: HandleDeltaParams<O>) {
        const { timestamp = Date.now(), fromId, toId } = params

        this.checkTimestamp(timestamp)
        this.checkUpdateId(fromId)
        this.update({ ...params, timestamp }, toId)
    }

    public reset() {
        this.asks = {}
        this.bids = {}
        this.updatedAt = Date.now()
        this.updatedId = this.bestAsk = this.bestBid = undefined
    }

    protected update(params: UpdateParams, updateId?: number) {
        const { timestamp = Date.now(), asks, bids } = params

        this.updatedAt = timestamp
        this.updatedId = updateId

        this.updateLevels('asks', asks)
        this.updateLevels('bids', bids)
    }

    protected updateLevels(side: 'asks' | 'bids', levels: Level[]) {
        const currentLevels = this[side]

        for (const [price, quantity] of levels) {
            if (new Decimal(quantity).isZero()) {
                delete currentLevels[price]
            } else {
                currentLevels[price] = quantity
            }
        }

        const sorted = this.sortLevels(side, currentLevels)

        if (side === 'asks') {
            this.bestAsk = sorted[0]
        } else {
            this.bestBid = sorted[0]
        }

        this[side] = Object.fromEntries(sorted.slice(0, this.maxDepth))
    }

    protected sortLevels(side: 'asks' | 'bids', levels: Record<string, string>) {
        const sortFns = {
            asks: (a: string, b: string) => new Decimal(a).cmp(b),
            bids: (a: string, b: string) => new Decimal(b).cmp(a),
        }

        return entries(levels).sort(([a], [b]) => sortFns[side](a, b))
    }

    protected checkTimestamp(timestamp: number) {
        if (this.shouldCheckTimestamp && timestamp < this.updatedAt) {
            throw new Error(`Received data older than last tick: ${timestamp} < ${this.updatedAt}`)
        }
    }

    protected checkUpdateId(id?: number) {
        if (this.shouldCheckId && this.updatedId && notNullish(id) && id !== this.updatedId + 1) {
            throw new Error(`Received data out of order: last update id (${this.updatedId}) + 1 !== ${id}`)
        }
    }
}
