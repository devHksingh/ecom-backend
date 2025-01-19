import mongoose from "mongoose";
import { WishlistType } from "./wishListType";


const wishlistSchema = new mongoose.Schema<WishlistType>({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }]
}, { timestamps: true });

export const Wishlist = mongoose.model('Wishlist', wishlistSchema);