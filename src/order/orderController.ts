import { Request, Response, NextFunction } from 'express';
import { graphDataSchema, placeOrderZodSchema, updateOrderStatusSchema } from './orderZodSchema';
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
        let productPrice

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
            productPrice = (product.price) - (product.salePrice)
        }
        // Get user details
        const user = await User.findById(userId).select("-password -refreshToken")
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
                // user: [userId],
                productDetail: {
                    name: product?.title,
                    price: productPrice,
                    imageUrl: product?.image,
                    productId,
                    currency: product?.currency
                },
                userDetails: {
                    userName: user.name,
                    userEmail: user.email
                },
                // product: [productId],
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
                    discountPrice: product?.salePrice,
                    currency: product?.currency
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

const getAllOrder = async (req: Request, res: Response, next: NextFunction) => {
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

        if (user.role !== "admin" && user.role !== "manager") {
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
                accessToken: isAccessTokenExp ? accessToken : undefined,
            });
            return;
        }


        if (orders) {
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

const getSingleOrder = async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.orderId
    if (!orderId) {
        return next(createHttpError(401, "orderId is required"))
    }
    try {
        const order = await Order.findById(orderId)
        if (!order) {
            res.status(404).json({
                success: false,
                message: "No orders found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'orders list fetch successfully',
            order
        })
        return
    } catch (error) {
        return next(createHttpError(500, "Error occured while single order "));
    }
}

const getOrderByUserId = async (req: Request, res: Response, next: NextFunction) => {
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
        const order = await Order.find({ user: userId })
        let accessToken
        if (isAccessTokenExp) {
            accessToken = user.generateAccessToken()
        }
        if (order) {
            res.status(200).json({
                success: true,
                message: 'orders list fetch successfully',
                order,
                accessToken: isAccessTokenExp ? accessToken : undefined,
            })
            return
        }
        if (!order) {
            res.status(404).json({
                success: false,
                message: "No orders found",
                accessToken: isAccessTokenExp ? accessToken : undefined,
            });
            return;
        }
    } catch (error) {
        return next(createHttpError(500, "Error occured while getting order list"));
    }
}
const getOrderByUserEmail = async (req: Request, res: Response, next: NextFunction) => {
    /*
    * Only admin and manager are allowed to get all order details for particular user email
    */
    try {
        const _req = req as AuthRequest
        const userId = _req._id
        const customerEmail = req.params.customerEmail
        const isAccessTokenExp = _req.isAccessTokenExp
        //    verify user
        const user = await User.findById(userId)
        if (!user) {
            return next(createHttpError(401, "Invalid request. User not found"));
        }
        if (!user.isLogin) {
            return next(createHttpError(400, 'You have to login First!'))
        }

        if (user.role !== "admin" && user.role !== "manager") {
            return next(createHttpError(400, 'Unauthorerize request'))
        }
        const customer = await User.findOne({ email: customerEmail }).select('-password')
        if (!customer) {
            return next(createHttpError(400, 'No user Found'))
        }
        const order = await Order.find({ user: customer.id })
        let accessToken
        if (isAccessTokenExp) {
            accessToken = user.generateAccessToken()
        }
        if (!order.length) {
            res.status(404).json({
                success: false,
                message: "No orders found",
                accessToken: isAccessTokenExp ? accessToken : undefined,
            });
            return;
        }
        if (order) {
            res.status(200).json({
                success: true,
                message: 'orders list fetch successfully',
                order,
                accessToken: isAccessTokenExp ? accessToken : undefined,
            })
            return
        }

    } catch (error) {
        return next(createHttpError(500, "Error occured while getting order list"));
    }
}

const getAllOrderByLimitAndSkip = async (req: Request, res: Response, next: NextFunction) => {
    /*
    * Only admin and manager are allowed to get all order details
    */
    try {
        const _req = req as AuthRequest
        const userId = _req._id
        const isAccessTokenExp = _req.isAccessTokenExp
        // console.log("req.params",req.params);
        // console.log("req.query",req.query);

        const { limit = 5, skip = 0 } = req.query
        const parsedLimit = Number(limit)
        const parsedSkip = Number(skip)
        //    verify user
        const user = await User.findById(userId)
        if (!user) {
            return next(createHttpError(401, "Invalid request. User not found"));
        }
        if (!user.isLogin) {
            return next(createHttpError(400, 'You have to login First!'))
        }

        if (user.role !== "admin" && user.role !== "manager") {
            return next(createHttpError(400, 'Unauthorerize request'))
        }
        const orders = await Order.find()


        const totalSaleAmount = orders.reduce((acc, order) => {
            const productCurrency = order.productDetail.currency
            let currencyConvertMultiplier
            // converting into dolar
            switch (productCurrency) {
                case "INR":
                    currencyConvertMultiplier = 0.011
                    break;
                case "USD":
                    currencyConvertMultiplier = 1
                    break;
                case "EUR":
                    currencyConvertMultiplier = 1.19
                    break;
                case "GBP":
                    currencyConvertMultiplier = 1.29
                    break;
                case "RUB":
                    currencyConvertMultiplier = 0.011
                    break;
                default:
                    currencyConvertMultiplier = 1
                    break
            }
            acc += (order.totalPrice * currencyConvertMultiplier)

            return acc
        }, 0)

        const formattedTotalSaleAmount = Number(totalSaleAmount.toFixed(2))
        // Handle access token expiration
        let accessToken
        const totalOrders = orders.length
        const totalPages = Math.ceil(totalOrders / parsedLimit)
        const currentPage = Math.floor(parsedSkip / parsedLimit) + 1
        const nextPage = currentPage < totalPages ? currentPage + 1 : null
        const prevPage = currentPage > 1 ? currentPage - 1 : null
        const thirtyDaysAgoDate = new Date()
        thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30)
        const recentOrders = await Order.find({ createdAt: { $gte: thirtyDaysAgoDate } })
        // console.log("recentOrders raw",recentOrders);
        const totalOdersWithLimitAndSkip = await Order.find().sort({'orderPlaceOn':-1}).limit(parsedLimit).skip(parsedSkip)
        // totalOdersWithLimitAndSkip.sort((a, b) => (a.productDetail.name - b.productDetail.name))
        // cal top 5 most and least buy product


        const productSaleRecords = orders.reduce((acc, order) => {
            const productName = order.productDetail.name
            const productQuantity = order.quantity
            const productCurrency = order.productDetail.currency
            let currencyConvertMultiplier: number
            // converting into dolar
            switch (productCurrency) {
                case "INR":
                    currencyConvertMultiplier = 0.011
                    break;
                case "USD":
                    currencyConvertMultiplier = 1
                    break;
                case "EUR":
                    currencyConvertMultiplier = 1.19
                    break;
                case "GBP":
                    currencyConvertMultiplier = 1.29
                    break;
                case "RUB":
                    currencyConvertMultiplier = 0.011
                    break;
                default:
                    currencyConvertMultiplier = 1
                    break
            }
            // const orderDate = order.createdAt
            if (!acc[productName]) {
                acc[productName] = {
                    quantity: 0,
                    // date: "",
                    price: 0,
                    // orderStatus: "",
                    url: "",
                    currency:"",
                    totalPrice:0
                }
            }
            acc[productName].quantity += productQuantity
            // acc[productName].date = new Date(orderDate).toLocaleDateString()
            acc[productName].price += Number((order.totalPrice * currencyConvertMultiplier).toFixed(2))
            // acc[productName].orderStatus = order.orderStatus
            acc[productName].url = order.productDetail.imageUrl
            acc[productName].currency = order.productDetail.currency
            acc[productName].totalPrice = (acc[productName].quantity  * acc[productName].price)
            // console.log("acc[productName].price", acc[productName].price,order.totalPrice,order.totalPrice * currencyConvertMultiplier,currencyConvertMultiplier,order.productDetail.currency,order.productDetail);

            return acc
        }, {} as Record<string, { quantity: number, price: number, url: string,currency:string,totalPrice:number }>)

        const productOrderStatusCount = orders.reduce((acc, order) => {
            switch (order.orderStatus) {
                case "PROCESSED":
                    acc.processed += 1
                    break;
                case "DELIVERED":
                    acc.delivered += 1
                    break;
                case "SHIPPED":
                    acc.shipped += 1
                default:
                    break;
            }
            return acc
        }, { processed: 0, delivered: 0, shipped: 0 })

        const productOrderByPrice = orders.sort((a, b) => (b.productDetail.price - a.productDetail.price))
        const top5MostExpensiveOrders = productOrderByPrice.slice(0, 5)
        const top5LeastExpensiveOrders = productOrderByPrice.slice(-5)

        // console.log("productOrderByPrice", productOrderByPrice);
        // console.log("top5MostExpensiveOrders", top5MostExpensiveOrders);
        // console.log("top5LeastExpensiveOrders", top5LeastExpensiveOrders);
        // console.log("orders", orders);
        // console.log("productSaleRecords", productSaleRecords);

        // convert object into array with sorting in descring order

        const saleRecordsArry = Object.entries(productSaleRecords).map(([name, value]) => ({ name, value })).sort(
            (a, b) => b.value.quantity - a.value.quantity
        )
        // console.log("saleRecordsArry", totalOdersWithLimitAndSkip.length);
        // console.log("saleRecordsArry", saleRecordsArry);
        // Get top 5 most and least bought products
        const top5MostBought = saleRecordsArry.slice(0, 5);
        const top5LeastBought = saleRecordsArry.slice(-5);

        // console.log("Top 5 Most Bought Products:", top5MostBought);
        // console.log("Top 5 Least Bought Products:", top5LeastBought);
        if (isAccessTokenExp) {
            accessToken = user.generateAccessToken()
        }
        if (!orders.length) {
            res.status(404).json({
                success: false,
                message: "No orders found",
                accessToken: isAccessTokenExp ? accessToken : undefined,
            });
            return;
        }


        if (orders && totalOdersWithLimitAndSkip) {
            res.status(200).json({
                success: true,
                message: 'orders list fetch successfully',
                totalSaleAmount: formattedTotalSaleAmount,
                productOrderStatusCount,
                top5MostExpensiveOrders,
                top5LeastExpensiveOrders,
                totalPages,
                currentPage,
                nextPage,
                prevPage,
                totalOrdersArr: totalOdersWithLimitAndSkip,
                past30DaysOrders: recentOrders,
                saleRecordsArry,
                top5MostBought,
                top5LeastBought,
                totalOrders,
                accessToken: isAccessTokenExp ? accessToken : undefined,
                isAccessTokenExp
            })
            return
        }
    } catch (error) {
        return next(createHttpError(500, "Error occured while getting order list"));
    }
}

const getgraphData = async (req: Request, res: Response, next: NextFunction) => {

    try {
        const _req = req as AuthRequest
        const userId = _req._id
        const isAccessTokenExp = _req.isAccessTokenExp
        const { year: userYear } = req.body
        const isValidYear = graphDataSchema.parse({ year: Number(userYear) })
        const { year } = isValidYear
        // const year = Number(userYear)
        //    verify user
        const user = await User.findById(userId)
        if (!user) {
            return next(createHttpError(401, "Invalid request. User not found"));
        }
        if (!user.isLogin) {
            return next(createHttpError(400, 'You have to login First!'))
        }

        if (user.role !== "admin" && user.role !== "manager") {
            return next(createHttpError(400, 'Unauthorerize request'))
        }
        console.log("year ", year);

        const startYear = new Date(`${year}-01-01T00:00:00.000Z`)
        const endYear = new Date(`${year + 1}-01-01T00:00:00.000Z`)

        // const orederAtThisYear = await Order.find({ createdAt: { $gte: startYear, $lt: endYear } })
        const orederAtThisYear = await Order.find({
            createdAt: { $gte: startYear, $lt: endYear }
        });

        // console.log("orederAtThisYear", orederAtThisYear);
        const graphData = orederAtThisYear.reduce((acc, order) => {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let currencyConvertMultiplier: number
            const productCurrency = order.productDetail.currency
            // converting into dolar
            switch (productCurrency) {
                case "INR":
                    currencyConvertMultiplier = 0.011
                    break;
                case "USD":
                    currencyConvertMultiplier = 1
                    break;
                case "EUR":
                    currencyConvertMultiplier = 1.19
                    break;
                case "GBP":
                    currencyConvertMultiplier = 1.29
                    break;
                case "RUB":
                    currencyConvertMultiplier = 0.011
                    break;
                default:
                    currencyConvertMultiplier = 1
                    break
            }
            const orderDate = new Date(order.orderPlaceOn)
            const orderPlacedMonth = orderDate.getMonth()
            if (!acc[months[orderPlacedMonth]]) {
                acc[months[orderPlacedMonth]] = {
                    totalOrders: 0,
                    totalSale: 0
                }
            }
            acc[months[orderPlacedMonth]].totalOrders += order.quantity
            // acc[months[orderPlacedMonth]].totalSale += Number((order.totalPrice * currencyConvertMultiplier).toFixed(2))
            acc[months[orderPlacedMonth]].totalSale += Number((order.totalPrice * currencyConvertMultiplier).toFixed(2))
            
            
            return acc

        }, {} as Record<string, { totalOrders: number, totalSale: number }>)
        // convert into array
        // const graphDataArr = Object.entries(graphData).map(([name, value]) => ({ name, value }))
        const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const graphDataArr = Object.entries(graphData).map(([key, data]) => {
            return { month: key, ...data }
        }).sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month))

        let accessToken
        if (isAccessTokenExp) {
            accessToken = user.generateAccessToken()
        }
        if (orederAtThisYear) {
            res.status(200).json({
                success: true,
                // graphData,
                graphDataArr,
                orederAtThisYear,
                accessToken: isAccessTokenExp ? accessToken : undefined,
                isAccessTokenExp
            })
            return
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return next(createHttpError(401, { message: { type: "Validation error", zodError: error.errors } }))
        }
        return next(createHttpError(500, "Error occured while getting graphdata list"));
    }
}

// const  orderHistory get all order details filter by  userId => 
//  get all order
// const get single OrderDetails getOrderByUserEmail

export {
    placeOrder,
    updateOrderStatus,
    getAllOrder,
    getSingleOrder,
    getOrderByUserId,
    getOrderByUserEmail,
    getgraphData,
    getAllOrderByLimitAndSkip
}