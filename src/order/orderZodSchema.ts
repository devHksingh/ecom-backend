import { z } from 'zod'

const placeOrderZodSchema = z.object({
    productId: z.string().trim().min(1, { message: "productId is required" }),
    quantity: z.number().gt(0)
})

const updateOrderStatusSchema = z.object({
    trackingId: z.string().trim().min(1, { message: "trackingId is required" }),
    orderStatus: z.string().trim().min(1, { message: "trackingId is required" })
})

const graphDataSchema = z.object({
    year:z.number().min(2024)
})

export {
    placeOrderZodSchema,
    updateOrderStatusSchema,
    graphDataSchema
}