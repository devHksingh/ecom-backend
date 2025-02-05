import mongoose from 'mongoose'
import z from 'zod'


const cartZodSchema = z.object({
    productId: z.string().trim().min(1, { message: "productId is required" })
        .refine(value => mongoose.Types.ObjectId.isValid(value), {
            message: "Invalid MongoDB ObjectId"
        }),
    quantity: z.number().gt(0)
})

export { cartZodSchema }