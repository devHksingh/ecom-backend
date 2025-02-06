import mongoose from 'mongoose';
import z from 'zod';

const action = ["add", "remove"] as const;

const cartZodSchema = z.object({
    productId: z.string().trim().min(1, { message: "productId is required" })
        .refine(value => mongoose.Types.ObjectId.isValid(value), {
            message: "Invalid MongoDB ObjectId"
        }),
    quantity: z.number().gt(0)
});

const cartUpdatequantity = z.object({
    productId: z.string().trim().min(1, { message: "productId is required" })
        .refine(value => mongoose.Types.ObjectId.isValid(value), {
            message: "Invalid MongoDB ObjectId"
        }),
    quantity: z.number().gt(0),
    type: z.enum(action)
});

export { cartZodSchema, cartUpdatequantity };
