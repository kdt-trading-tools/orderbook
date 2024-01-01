import { WebsocketClient, MainClient } from 'binance'
import { isObject, isKeyOf } from '@khangdt22/utils/object'
import PQueue from 'p-queue'
import type { Level } from '../src'
import { OrderBook } from '../src'

const symbol = 'BTCUSDT'
const maxDepth = 100

const book = new OrderBook({ maxDepth })
const ws = new WebsocketClient({})
const api = new MainClient()

function print() {
    const message = [
        `Local Updated Id: ${book.getLastUpdateId()}`,
        `Best Updated Id:  ${bestId}`,
        `Top Updated Id:   ${updatedId}`,
        `Updated At:       ${new Date(book.getLatestUpdateTimestamp())}`,
        'Local Asks: ' + book.getAsks().slice(0, 5).map(([p, q]) => `[${p}, ${q}]`).join(', '),
        'Top Asks:   ' + topAsk.slice(0, 5).map(([p, q]) => `[${p}, ${q}]`).join(', '),
        'Local Bids: ' + book.getBids().slice(0, 5).map(([p, q]) => `[${p}, ${q}]`).join(', '),
        'Top Bids:   ' + topBid.slice(0, 5).map(([p, q]) => `[${p}, ${q}]`).join(', '),
        `Local Best Ask:  ${book.getBestAsk()}`,
        `Server Best Ask: ${bestAsk}`,
        `Local Best Bid:  ${book.getBestBid()}`,
        `Server Best Bid: ${bestBid}`,
    ]

    console.clear()
    console.log(message.join('\n'))
}

setInterval(print, 1000)

let updatedId: number
let topAsk: Level[]
let topBid: Level[]

let bestId: number
let bestAsk: Level
let bestBid: Level

let isInitializing = false
let snapshotId: number
let isFirstEventChecked = false

function init() {
    api.getOrderBook({ symbol, limit: maxDepth }).then(({ lastUpdateId, asks, bids }) => {
        snapshotId = lastUpdateId

        book.handleSnapshot({
            lastUpdateId,
            asks: asks.map(([p, q]) => [p.toString(), q.toString()]),
            bids: bids.map(([p, q]) => [p.toString(), q.toString()]),
        })

        queue.start()

        console.log('Snapshot updated at id:', lastUpdateId)
    })
}

const queue = new PQueue({ concurrency: 1, autoStart: false })

ws.on('message', (data: any) => {
    if (isObject(data) && isKeyOf(data, 'e')) {
        if (data.e === 'depthUpdate') {
            if (!isInitializing) {
                isInitializing = true
                init()
            }

            queue.add(() => {
                if (data.u <= snapshotId) {
                    return
                }

                if (!isFirstEventChecked) {
                    isFirstEventChecked = true

                    if (data.U > snapshotId + 1 || data.u < snapshotId + 1) {
                        throw new Error(`Invalid first event: ${JSON.stringify(data)}, last update id: ${snapshotId}`)
                    }
                }

                book.handleDelta({
                    timestamp: data.E,
                    fromId: data.U,
                    toId: data.u,
                    asks: data.a,
                    bids: data.b,
                })
            })
        }

        if (data.e === 'partialBookDepth') {
            updatedId = data.lastUpdateId
            topAsk = data.asks
            topBid = data.bids
        }

        if (data.e === 'bookTicker') {
            bestId = data.u
            bestAsk = [data.a, data.A]
            bestBid = [data.b, data.B]
        }
    }
})

ws.subscribeDiffBookDepth(symbol, 100, 'spot')
ws.subscribePartialBookDepths(symbol, 5, 100, 'spot')
ws.subscribeSpotSymbolBookTicker(symbol)
