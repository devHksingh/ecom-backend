import { z } from 'zod'

const placeOrderZodSchema = z.object({
    productId: z.string().trim().min(1, { message: "productId is required" }),
    quantity: z.number().gt(-1)
})

export {
    placeOrderZodSchema
}