import mongoose from "mongoose";
import { CartType, CartItem } from "./cartTypes";


const cartItemSchema = new mongoose.Schema<CartItem>({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, "'Quantity must be at least 1'"]
    }
}, { timestamps: true })

const cartSchema = new mongoose.Schema<CartType>({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [cartItemSchema],
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    totalItems: {
        type: Number,
        required: true,
        default: 0
    }
}, { timestamps: true })

export const Cart = mongoose.model('Cart', cartSchema)