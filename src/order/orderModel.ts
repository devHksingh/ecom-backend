import mongoose from "mongoose";
import { Orders } from "./orderTypes";


const orderSchema = new mongoose.Schema<Orders>({

    orderStatus: {
        type: String,
        enum: {
            values: ["PROCESSED", "DELIVERED", "SHIPPED"],
            message: "Please select a valid status"
        },
        default: "PROCESSED",
        required: true
    },
    orderPlaceOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    trackingId: {
        type: String,
        required: [true, "trackingId is required"]
    },
    totalPrice: {
        type: Number,
        min: [0, "Price is non negative"],
        required: true
    },
    quantity: {
        type: Number,
        min: 1,
        default: 1,
        required: true,
    },
    user: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",

    }],
    product: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
    }],
    
}, { timestamps: true })

export const Order = mongoose.model('Order', orderSchema)