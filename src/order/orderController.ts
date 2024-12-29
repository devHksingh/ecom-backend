import { Request, Response, NextFunction } from 'express';
import { placeOrderZodSchema } from './orderZodSchema';
import { z } from 'zod';
import createHttpError from 'http-errors';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Product } from '../product/productModel';
import { User } from '../user/userModel';
import { v4 as uuidv4 } from 'uuid';
import { Order } from './orderModel';



const placeOrder = async (req: Request, res: Response, next: NextFunction) => {
    /*
        Key features of this implementation:

        * Creates order with all required details
        * Updates product stock automatically
        * Includes user and product information in the response
        * Excludes sensitive user information
        * Generates unique tracking ID
        * Includes error handling
        * Validates stock availability
        * Authenticates user access to order details
        * Formats response data cleanly
    */
    try {
        const isValidRequest = placeOrderZodSchema.parse(req.body)
        const { productId, quantity } = isValidRequest
        const _req = req as AuthRequest
        const userId = _req._id
        const isAccessTokenExp = _req.isAccessTokenExp

        // Validate product existence and stock
        const product = await Product.findById(productId)
        if (!product) {
            next(createHttpError(404, "Product not found"))
        }
        let totalPrice
        // check  stock is available
        if (product) {
            if (product.totalStock < quantity) {
                next(createHttpError(400, "Not enough stock available"))
            }
            // Calculate total price
            totalPrice = (product.price * quantity) - product.salePrice;
        }
        // Get user details
        const user = await User.findById(userId)
        if (!user) {
            next(createHttpError(404, "User not found"))
        }
        if (user) {
            if (!user.isLogin) {
                next(createHttpError(400, 'You have to login First!'))
            }
            // Generate tracking ID 
            const id = uuidv4()

            const trackingId = `ORD-${id}`;

            // Create order
            const order = await Order.create({
                user: [userId],
                product: [productId],
                quantity,
                totalPrice,
                trackingId,
                orderStatus: "PROCESSED",
                orderPlaceOn: Date.now()
            });
            // Update product stock
            await Product.findByIdAndUpdate(productId, {
                $inc: { totalStock: -quantity }
            });
            await product?.save({ validateBeforeSave: false })
            // Handle access token expiration
            let accessToken
            if (isAccessTokenExp) {
                accessToken = user.generateAccessToken()
            }
            const orderResponse = {
                orderId: order._id,
                trackingId: order.trackingId,
                orderStatus: order.orderStatus,
                orderPlaceOn: order.orderPlaceOn,
                userName: user.name,
                productDetails: {
                    id: product?._id,
                    title: product?.title,
                    price: product?.price,
                    image: product?.image,
                    category: product?.category,
                    discountPrice: product?.salePrice
                },
                quantity: order.quantity,
                totalPrice: order.totalPrice
            }
            // Respond with the updated orderResponse
            res.status(200).json({
                success: true,
                message: 'Order placed successfully',
                order: orderResponse,
                accessToken: isAccessTokenExp ? accessToken : undefined,
            });

        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(createHttpError(401, { message: { type: "Validation error", zodError: error.errors } }))
        }
        next(createHttpError(500, "Error placing order"));
    }
}

export { placeOrder }