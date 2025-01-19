import mongoose from "mongoose";

export interface CartItem {
    product: mongoose.Schema.Types.ObjectId;
    quantity: number
}

export interface CartType {
    user: mongoose.Schema.Types.ObjectId;
    items:CartItem[];
    totalAmount:number;
    totalItems:number;

}