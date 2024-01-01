import { Decimal } from 'decimal.js'
import type { Level, ConvertResult } from './types'

export function convert(side: Level[], quantity: Decimal | string | number, fromQuote = false) {
    const result: ConvertResult = {
        remainingQty: new Decimal(quantity),
        remainingType: fromQuote ? 'quote' : 'base',
        filledQty: new Decimal(0),
        filledQuoteQty: new Decimal(0),
        highestPrice: new Decimal(0),
        lowestPrice: new Decimal(Number.POSITIVE_INFINITY),
        fills: [],
    }

    for (const item of side) {
        const [price, qty] = [new Decimal(item[0]), new Decimal(item[1])]
        const quoteQty = price.mul(qty)

        result.highestPrice = Decimal.max(result.highestPrice, price)
        result.lowestPrice = Decimal.min(result.lowestPrice, price)

        if (result.remainingQty.lte(fromQuote ? quoteQty : qty)) {
            const filledQuoteQty = fromQuote ? result.remainingQty : result.remainingQty.mul(price)
            const filledQty = fromQuote ? result.remainingQty.div(price) : result.remainingQty

            result.fills.push({ price, qty: filledQty, quoteQty: filledQuoteQty })
            result.filledQty = result.filledQty.add(filledQty)
            result.filledQuoteQty = result.filledQuoteQty.add(filledQuoteQty)
            result.remainingQty = new Decimal(0)
            break
        }

        result.fills.push({ price, qty, quoteQty })
        result.remainingQty = result.remainingQty.sub(fromQuote ? quoteQty : qty)
        result.filledQty = result.filledQty.add(qty)
        result.filledQuoteQty = result.filledQuoteQty.add(quoteQty)
    }

    return result
}
