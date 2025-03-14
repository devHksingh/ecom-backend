import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import createHttpError from 'http-errors';
import { Cart } from './cartModel';
import { Product } from '../product/productModel';
import { cartUpdatequantity, cartZodSchema } from './cartZodSchema';
import { z } from 'zod';
import { User } from '../user/userModel';
import mongoose from 'mongoose';

// Add product to cart
const addToCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const isValidRequest = cartZodSchema.parse(req.body)
        const { productId, quantity } = isValidRequest
        const _req = req as AuthRequest
        const { _id: userId, isAccessTokenExp } = _req
        let accessToken = ""
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
        product.totalStock -= quantity

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
        next(createHttpError(500, "Error while creating cart"));
    }

}
// Update quantity
// add quantity

const updateCartQuantity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const isvalidReq = cartUpdatequantity.parse(req.body)
        const { productId, quantity, type } = isvalidReq
        const _req = req as AuthRequest
        const { _id: userId, isAccessTokenExp } = _req
        let accessToken
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
        const cart = await Cart.findOne({ user: userId })
        if (!cart) {
            return next(createHttpError(404, 'Cart not found'));
        }
        // Validate quantity
        if (quantity < 1) {
            return next(createHttpError(400, 'Quantity must be at least 1'));
        }
        const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId)
        if (itemIndex === -1) {
            return next(createHttpError(404, 'Product not found in cart'));
        }
        if (type === "add") {

            if (product.totalStock < quantity) {
                return next(createHttpError(400, 'Not enough stock available'));
            }

            // Update quantity

            cart.items[itemIndex].quantity += quantity
            // recalculate totals
            cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0)
            cart.totalAmount = cart.items.reduce((total, item) => {
                const itemPrice = product.price - product.salePrice
                return total + (itemPrice * item.quantity)
            }, 0)
            await cart.save()
            // update stock quantity
            product.totalStock -= quantity
            await product.save()
            res.status(200).json({
                success: true,
                message: 'Product quantity increased successfully',
                cart,
                accessToken: isAccessTokenExp ? accessToken : undefined,
            });

        }
        if (type === "remove") {
            // Update quantity
            cart.items[itemIndex].quantity -= quantity
            // If quantity becomes 0, remove the item from cart
            if (cart.items[itemIndex].quantity === 0) {
                cart.items.splice(itemIndex, 1);
                await cart.save()
                cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0)
                cart.totalAmount = cart.items.reduce((total, item) => {
                    const itemPrice = product.price - product.salePrice
                    return total + (itemPrice * item.quantity)
                }, 0)
                await cart.save()
                product.totalStock += quantity
                await product.save()
                res.status(200).json({
                    success: true,
                    message: 'Product remove from cart successfully',
                    cart,
                    accessToken: isAccessTokenExp ? accessToken : undefined,
                });
            }
            await cart.save()
            // recalculate totals
            cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0)
            cart.totalAmount = cart.items.reduce((total, item) => {
                const itemPrice = product.price - product.salePrice
                return total + (itemPrice * item.quantity)
            }, 0)
            await cart.save()
            product.totalStock += quantity
            await product.save()
            res.status(200).json({
                success: true,
                message: 'Product quantity decreased successfully',
                cart,
                accessToken: isAccessTokenExp ? accessToken : undefined,
            });

        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            next(createHttpError(401, { message: { type: "Validation error", zodError: error.errors } }))
        }
        next(createHttpError(500, "Error while updating cart"));
    }
}
// Remove product from cart
const removeFromCart = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const _req = req as AuthRequest;
    try {
        const { _id: userId, isAccessTokenExp } = _req
        let accessToken
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
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return next(createHttpError(404, 'Cart not found'));
        }
        const product = await Product.findById(productId)
        if (!product) {
            return next(createHttpError(404, 'Product not found'));
        }

        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (itemIndex === -1) {
            return next(createHttpError(404, 'Product not found in cart'));
        }
        const productQuantity = cart.items[itemIndex].quantity

        // Remove item from cart
        cart.items.splice(itemIndex, 1);
        await cart.save()

        // update product quantity
        product.totalStock += productQuantity
        await product.save()

        // Recalculate totals

        cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
        cart.totalAmount = cart.items.reduce((total, item) => {
            const itemPrice = product.price - product.salePrice;
            return total + (itemPrice * item.quantity);
        }, 0);

        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Product removed from cart successfully',
            cart,
            accessToken: isAccessTokenExp ? accessToken : undefined,
        });

    } catch (error) {
        next(createHttpError(500, 'Error removing product from cart'));
    }
};

// Get cart details
const getCart = async (req: Request, res: Response, next: NextFunction) => {
    const _req = req as AuthRequest;
    

    try {
        const { _id: userId, isAccessTokenExp } = _req
        let accessToken
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
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart) {
            return next(createHttpError(404, 'Cart not found'));
        }

        res.status(200).json({
            success: true,
            cart,
            accessToken: isAccessTokenExp ? accessToken : undefined,
        });

    } catch (error) {
        next(createHttpError(500, 'Error fetching cart details'));
    }
};




export {
    addToCart,
    updateCartQuantity,
    removeFromCart,
    getCart
};
