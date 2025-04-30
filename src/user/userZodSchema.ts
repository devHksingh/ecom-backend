import { z } from 'zod'

const createUserSchema = z.object({
    name: z.string().trim(),
    email: z.string().trim().email({ message: 'Invalid email address' }),
    password: z.string().trim().min(6, { message: "Must be 6 or more characters long" }),
    confirmPassword: z.string().trim()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
})
const loginUserSchema = z.object({

    email: z.string().trim().email({ message: 'Invalid email address' }),
    password: z.string().trim().min(6, { message: "Must be 6 or more characters long" }),

})
const changeUserPasswordSchema = z.object({
    oldPassword: z.string().trim().min(6, { message: "Must be 6 or more characters long" }),
    password: z.string().trim().min(6, { message: "Must be 6 or more characters long" }),
    confirmPassword: z.string().trim().min(6, { message: "Must be 6 or more characters long" })
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
})

const userAddressSchema = z.object({
    address: z.string().trim().min(1, { message: "Address is requried" }).max(50),
    pinCode: z.string().min(1, { message: "PinCode is required" }).max(6),
    phoneNumber: z.string().trim().min(1, { message: "Address is requried" }).max(10,{message:"phoneNumber must be 10 digit"})
})
const userPhoneNumberSchema = z.object({
    phoneNumber: z.string().trim().min(1, { message: "Address is requried" }).max(10,{message:"phoneNumber must be 10 digit"}),
    
})

export {
    createUserSchema,
    loginUserSchema,
    changeUserPasswordSchema,
    userAddressSchema,
    userPhoneNumberSchema
}