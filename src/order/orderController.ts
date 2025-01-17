import { Request, Response, NextFunction } from 'express';
import { placeOrderZodSchema, updateOrderStatusSchema } from './orderZodSchema';
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
        const user = await User.findById(userId).select("-password")
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



const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {

    /*
    const trackingId = `ORD-${id}`
    * Check is Order id is valid
    * Only Admin and manager are allow to update
    * Update order status
    * Resend access token if expiry 
    */

    try {
        const isValidRequest = updateOrderStatusSchema.parse(req.body)
        const { trackingId, orderStatus } = isValidRequest
        const _req = req as AuthRequest
        const userId = _req._id
        const isAccessTokenExp = _req.isAccessTokenExp

        // verify trackingId formate


        const idArr = trackingId.split('-')
        // 4 is fixed at the 13th character (indicates version 4) and starting with "ORD"
        const isValidFormat = idArr.at(0) === "ORD" && idArr.at(3)?.at(0) === "4"

        console.log(isValidFormat);

        if (!isValidFormat) {
            return next(createHttpError(400, "Invalid orderId"))
        }

        //    verify user
        const user = await User.findById(userId)
        if (!user) {
            return next(createHttpError(401, "Invalid request. User not found"));
        }
        if (!user.isLogin) {
            return next(createHttpError(400, 'You have to login First!'))
        }
        console.log(user.role);
        
        if (user.role !== "admin" && user.role !== "manager") {
            console.log(user.role);
            return next(createHttpError(400, 'Unauthorerize request'))
        }
        // Update order status
        const order = await Order.findOneAndUpdate({
            trackingId
        },
            {
                orderStatus
            }, {
            new: true
        })
        // Handle access token expiration
        let accessToken
        if (isAccessTokenExp) {
            accessToken = user.generateAccessToken()
        }
        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            orderDetails: order,
            accessToken: isAccessTokenExp ? accessToken : undefined,
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return next(createHttpError(401, { message: { type: "Validation error", zodError: error.errors } }))
        }
        return next(createHttpError(500, "Error occured while updating order status"));
    }
}

const getAllOrder = async (req: Request, res: Response, next: NextFunction)=>{
    /*
    * Only admin and manager are allowed to get all order details
    */
    try {
        const _req = req as AuthRequest
        const userId = _req._id
        const isAccessTokenExp = _req.isAccessTokenExp
        //    verify user
        const user = await User.findById(userId)
        if (!user) {
            return next(createHttpError(401, "Invalid request. User not found"));
        }
        if (!user.isLogin) {
            return next(createHttpError(400, 'You have to login First!'))
        }

        if(user.role !== "admin" && user.role !== "manager"){
            return next(createHttpError(400, 'Unauthorerize request'))
        }
        const orders = await Order.find()
        // Handle access token expiration
        let accessToken
        if (isAccessTokenExp) {
            accessToken = user.generateAccessToken()
        }
        if (!orders.length) {
            res.status(404).json({
                success: false,
                message: "No orders found",
            });
            return; 
        }

        
        if(orders){
             res.status(200).json({
                success: true,
                message: 'orders list fetch successfully',
                orders,
                accessToken: isAccessTokenExp ? accessToken : undefined,
            })
            return
        }
    } catch (error) {
        return next(createHttpError(500, "Error occured while getting order list"));
    }
}

// const  orderHistory get all order details filter by  userId => 
//  get all order
// const get single OrderDetails 

export { placeOrder, updateOrderStatus,getAllOrder }