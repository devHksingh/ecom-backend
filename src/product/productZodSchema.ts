import { z } from 'zod'


const createProductSchema = z.object({
    title: z.string().min(1, { message: "Must be 1 or more characters long" }),
    description: z.string().min(4, { message: "Must be 4 or more characters long" }),
    brand: z.string().min(4, { message: "Must be 4 or more characters long" }),
    category: z.string().min(2, { message: "Must be 2 or more characters long" }),
    // image:z.string().min(8,{ message: "Must be 8 or more characters long" }),
    price: z.number().gt(-1),
    currency: z.string().min(2, { message: "Must be 2 or more characters long" }),
    salePrice: z.number().min(0),
    totalStock: z.number().min(0)
})

export { createProductSchema }