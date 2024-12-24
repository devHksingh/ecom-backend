import { z } from 'zod'

const createUserSchema = z.object({
    name: z.string().trim(),
    email: z.string().trim().email({ message: 'Invalid email address' }),
    password: z.string().trim().min(6, { message: "Must be 5 or more characters long" }),
    confirmPassword:z.string().trim()
}).refine((data)=> data.password === data.confirmPassword,{
    message: "Passwords don't match",
    path: ["confirmPassword"]
})

export {
    createUserSchema
}