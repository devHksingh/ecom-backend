import mongoose from "mongoose";

export interface WishlistType {
    user: mongoose.Schema.Types.ObjectId,
    products: mongoose.Schema.Types.ObjectId[]
}