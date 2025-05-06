import { Request, Response, NextFunction } from 'express';
import { Wishlist } from './wishlistModel';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import { User } from '../user/userModel';
import createHttpError from 'http-errors';
import { Product } from '../product/productModel';
import { Products } from '../product/productTypes';


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
    const { productId } = req.body
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
            select: "title price salePrice image totalStock currency description totalStock brand category salePrice createdAt updatedAt"
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
            isAccessTokenExp,
            accessToken: isAccessTokenExp ? accessToken : undefined,
        });
    } catch (error) {
        return next(createHttpError(500, "Error adding to wishlist"));
    }

}

const multipleProductAddToWishList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const products = (req.body);
        const isValidRequest = Array.isArray(products)
        if (!isValidRequest) {
            next(createHttpError(400, "Not valid request"))
            return
        }
        const _req = req as AuthRequest;
        const { _id: userId, isAccessTokenExp } = _req;
        let accessToken = "";

        // Validate user
        const user = await User.findById(userId);
        if (!user) {
            next(createHttpError(404, 'User not found'));
            return;
        }
        if (!user.isLogin) {
            next(createHttpError(401, 'Unauthorized. You have to login first.'));
            return;
        }
        if (isAccessTokenExp) {
            accessToken = user.generateAccessToken();
        }
        // Find or create wishlist
        const wishList = await findOrCreateWishlist(user.id)
        const invalidProducts: any[] = [];
        // const productsToUpdate: Products[] = [];
        for (const item of products) {
            const { id } = item;
            const product = await Product.findById(id);

            if (!product) {
                invalidProducts.push({ id, reason: 'Product not found' });
                continue;
            }
            // Add product if ist not in wishlist

            if (!wishList.products.includes(product.id)) {
                wishList.products.push(product.id)
                await wishList.save()

            }
        }
        // If there are invalid products, return error
        if (invalidProducts.length === products.length) {
            res.status(400).json({
                success: false,
                message: 'Products could not be added to wishList',
                invalidProducts,
                isAccessTokenExp,
                accessToken: isAccessTokenExp ? accessToken : undefined
            });
            return;
        }
        //  get final updated wishlist product
        const populatedWishlist = await Wishlist.findById(wishList.id).populate({
            path: "products",
            select: "title price salePrice image totalStock currency description totalStock brand category salePrice createdAt updatedAt"
        })
        res.status(200).json({
            success: true,
            message: "Product added to wishlist",
            wishlist: populatedWishlist,
            isAccessTokenExp,
            accessToken: isAccessTokenExp ? accessToken : undefined,
        });
        return
        // if (productsToUpdate.length === 0) {
        //     populatedWishlist = await Wishlist.findById(wishList.id).populate({
        //         path: "products",
        //         select: "title price salePrice image totalStock currency description totalStock brand category salePrice createdAt updatedAt"
        //     })
        //     res.status(200).json({
        //         success: true,
        //         message: "Product added to wishlist",
        //         wishlist: populatedWishlist,
        //         isAccessTokenExp,
        //         accessToken: isAccessTokenExp ? accessToken : undefined,
        //     });
        //     return
        // }
        // res.status(200).json({
        //     success: true,
        //     message: "Product added to wishlist",
        //     wishlist: { products: productsToUpdate },
        //     isAccessTokenExp,
        //     accessToken: isAccessTokenExp ? accessToken : undefined,
        // });
        // return
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
            select: "title price salePrice image totalStock currency description totalStock brand category salePrice createdAt updatedAt"
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
                isAccessTokenExp,
                accessToken: isAccessTokenExp ? accessToken : undefined,
            });
            return
        }

        res.status(200).json({
            success: true,
            wishlist,
            isAccessTokenExp,
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
        const { productId } = req.body


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
                isAccessTokenExp,
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
            isAccessTokenExp,
            accessToken: isAccessTokenExp ? accessToken : undefined,
        });
    } catch (error) {
        next(createHttpError(500, "Error removing product from wishlist"));
    }
}

export {
    addToWishlist,
    getWishlist,
    removeWishlist,
    multipleProductAddToWishList
}