import mongoose from "mongoose";
import { Products } from "./productTypes";


const productSchema = new mongoose.Schema<Products>({
    title: {
        type: String,
        trim: true,
        required: [true, "Product title is required"]
    },
    description: {
        type: String,
        trim: true,
        required: [true, "Product description is required"],

    },
    price: {
        type: Number,
        required: [true, "Product price is required"],
        min: [0, 'Amount must be non-negative']
    },
    totalStock: {
        type: Number,
        required: true
    },
    brand: {
        type: String,

    },
    currency: {
        type: String,
        required: [true, 'Currency is required'],
        uppercase: true,
        default: 'USD'
    },
    category: [
        { type: String }
    ],
    image: {
        type: String,
        required: true
    },
    salePrice: {
        type: Number,
        min: [0, "Sale price is not negative"]
    }
}, { timestamps: true })


export const Product = mongoose.model('Product',productSchema)