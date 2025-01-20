import { Request, Response, NextFunction } from 'express';
import { Wishlist } from './wishlistModel';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import { User } from '../user/userModel';
import createHttpError from 'http-errors';
import { Product } from '../product/productModel';


const findOrCreateWishlist = async (userId: mongoose.Schema.Types.ObjectId) => {
    let wishList = await Wishlist.findOne({ user: userId })
    if (!wishList) {
        wishList = await Wishlist.create({ user: userId, products: [] })
    }
    return wishList
}

const addToWishlist = async (req: Request, res: Response, next: NextFunction) => {
    /*
    * Check user validity(isLogin,isValidUserId)
    * Get productId from req.params
    * Is valid product id 
    * Add product if not already in wishlist
    * Populate and return the wishlist
    */
    const _req = req as AuthRequest
    const userId = _req._id
    const productId = req.params.productId
    const isAccessTokenExp = _req.isAccessTokenExp

    try {
        if (!productId) {
            return next(createHttpError(400, "Product id is required"))
        }
        //    find user
        const user = await User.findById(userId)
        if (!user) {
            return next(createHttpError(400, "User Not found"))
        }
        if (!user.isLogin) {
            return next(createHttpError(400, "Unauthorized request you have to login first"))
        }
        // Check product exists
        const product = await Product.findById(productId)
        if (!product) {
            return next(createHttpError(404, "Product not found"));
        }
        // Find or create wishlist
        const wishList = await findOrCreateWishlist(user.id)

        // Add product if ist not in wishlist

        if (!wishList.products.includes(product.id)) {
            wishList.products.push(product.id)
            await wishList.save()
        }
        // Populate and return the wishlist

        const populatedWishlist = await Wishlist.findById(wishList.id).populate({
            path: "products",
            select: "title price salePrice image totalStock"
        })
        // genrate accessToken if expired
        let accessToken
        if (isAccessTokenExp) {
            accessToken = user.generateAccessToken()
        }

        res.status(200).json({
            success: true,
            message: "Product added to wishlist",
            wishlist: populatedWishlist,
            accessToken: isAccessTokenExp ? accessToken : undefined,
        });
    } catch (error) {
        return next(createHttpError(500, "Error adding to wishlist"));
    }

}

const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
    /*
    * Authenticate user 
    * Fetch and populate the wishlist
    */
    try {
        const _req = req as AuthRequest
        const userId = _req._id
        const isAccessTokenExp = _req.isAccessTokenExp
        //    find user
        const user = await User.findById(userId)
        if (!user) {
            return next(createHttpError(400, "User Not found"))
        }
        if (!user.isLogin) {
            return next(createHttpError(400, "Unauthorized request you have to login first"))
        }
        const wishlist = await Wishlist.findOne({ user: userId }).populate({
            path: "products",
            select: "title price salePrice image totalStock"
        })
        // genrate accessToken if expired
        let accessToken
        if (isAccessTokenExp) {
            accessToken = user.generateAccessToken()
        }
        if (!wishlist) {
            res.status(200).json({
                success: true,
                message: "Wishlist is empty",
                wishlist: null,
                accessToken: isAccessTokenExp ? accessToken : undefined,
            });
            return
        }

        res.status(200).json({
            success: true,
            wishlist,
            accessToken: isAccessTokenExp ? accessToken : undefined,
        });

    } catch (error) {
        return next(createHttpError(500, "Error fetching wishlist"));
    }

}

const removeWishlist = async (req: Request, res: Response, next: NextFunction) => {
    /*
    * Validate user
    * Check valid product id
    * get wishlist
    * remove product from wishlist by finding productid
    */

    try {
        const _req = req as AuthRequest
        const userId = _req._id
        const isAccessTokenExp = _req.isAccessTokenExp
        const productId = req.params.productId


        if (!productId) {
            return next(createHttpError(400, "Product id is required"))
        }
        //    find user
        const user = await User.findById(userId)
        if (!user) {
            return next(createHttpError(400, "User Not found"))
        }
        if (!user.isLogin) {
            return next(createHttpError(400, "Unauthorized request. Please log in first."))
        }

        const product = await Product.findById(productId)
        if (!product) {
            return next(createHttpError(404, "Product not found."))
        }

        // get wishlist
        const wishList = await findOrCreateWishlist(user.id)
        // genrate accessToken if expired
        let accessToken
        if (isAccessTokenExp) {
            accessToken = user.generateAccessToken()
        }
        // console.log(wishList)
        // console.log(wishList.user)
        // console.log(wishList.products)
        if (!wishList.products) {
            res.status(200).json({
                success: false,
                message: "Wishlist is empty",
                wishlist: null,
                accessToken: isAccessTokenExp ? accessToken : undefined,
            });
            return
        }
        // remove product from wishlist by finding productid
        if (wishList.products.includes(product.id)) {
            wishList.products = wishList.products.filter((item) => item.toString() !== productId)
            await wishList.save()
        }



        res.status(200).json({
            success: true,
            message: "Product removed from wishlist",
            wishList,
            accessToken: isAccessTokenExp ? accessToken : undefined,
        });
    } catch (error) {
        next(createHttpError(500, "Error removing product from wishlist"));
    }
}

export {
    addToWishlist,
    getWishlist,
    removeWishlist
}