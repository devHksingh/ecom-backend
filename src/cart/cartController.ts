import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import createHttpError from 'http-errors';
import { Cart } from './cartModel';
import { Product } from '../product/productModel';
import { cartZodSchema } from './cartZodSchema';
import { z } from 'zod';
import { User } from '../user/userModel';
import mongoose from 'mongoose';

// Add product to cart
const addToCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const isValidRequest = cartZodSchema.parse(req.body)
        const { productId, quantity } = isValidRequest
        const _req = req as AuthRequest
        const { _id: userId,isAccessTokenExp } = _req
        let accessToken=""
        // validate user
        const user = await User.findById(userId)
        if (!user) {
            return next(createHttpError(404, 'User not found'));
        }
        if (!user.isLogin) {
            return next(createHttpError(401, 'Unauthorized.You have to login first.'));
        }
        if (isAccessTokenExp) {
            accessToken = user.generateAccessToken();
        }
        // Validate product exists and has enough stock
        const product = await Product.findById(productId)
        if (!product) {
            return next(createHttpError(404, 'Product not found'));
        }
        if (product.totalStock < quantity) {
            return next(createHttpError(400, 'Not enough stock available'));
        }
        // Find or create cart for user
        let cart = await Cart.findOne({ user: userId })
        if (!cart) {
            cart = await Cart.create({
                user: userId,
                items: [],
                totalAmount: 0,
                totalItems: 0
            })
        }
        // Check if product already exists in cart
        const existingItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (existingItemIndex > -1) {
            // Update existing item quantity
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Add new item to cart
            cart.items.push({
                product: new mongoose.Types.ObjectId(productId),
                quantity
            });
        }

        // Update cart totals
        cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
        cart.totalAmount = cart.items.reduce((total, item) => {
            const itemPrice = product.price - product.salePrice;
            return total + (itemPrice * item.quantity);
        }, 0);

        await cart.save();
        // update stock quantity
        product.totalStock -=quantity

        await product.save()

        res.status(200).json({
            success: true,
            message: 'Product added to cart successfully',
            cart,
            accessToken: isAccessTokenExp ? accessToken : undefined,
        });



    } catch (error) {
        if (error instanceof z.ZodError) {
            next(createHttpError(401, { message: { type: "Validation error", zodError: error.errors } }))
        }
        next(createHttpError(500, "Error placing order"));
    }

}





export {
    addToCart,
    // updateCartQuantity,
    // removeFromCart,
    // getCart
};