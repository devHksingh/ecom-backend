import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import createHttpError from 'http-errors';
import { Cart } from './cartModel';
import { Product } from '../product/productModel';
import { cartUpdatequantity, cartZodSchema } from './cartZodSchema';
import { z } from 'zod';
import { User } from '../user/userModel';
import mongoose from 'mongoose';
import { MultilpeProduct } from './cartTypes';

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
            // cart.items[existingItemIndex].quantity += quantity;
            cart.items[existingItemIndex].quantity = quantity;
        } else {
            // Add new item to cart
            cart.items.push({
                product: new mongoose.Types.ObjectId(productId),
                quantity
            });
        }

        // Update cart totals
        cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
        // cart.totalAmount = cart.items.reduce((total, item) => {
        //     const itemPrice = product.price - product.salePrice;
        //     return total + (itemPrice * item.quantity);
        // }, 0);
        cart.totalAmount = cart.items.reduce((total, item) => {
            // const itemPrice = product.price - product.salePrice;
            const productCurrency = product.currency
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
            const itemPrice = Number(((product.price - product.salePrice) * currencyConvertMultiplier).toFixed(2));
            return total + (itemPrice * item.quantity);
            // return total + (itemPrice * item.quantity);
        }, 0);

        await cart.save();
        // update stock quantity
        // product.totalStock -= quantity

        // await product.save()

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

            cart.items[itemIndex].quantity = quantity
            // recalculate totals
            cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0)
            // cart.totalAmount = cart.items.reduce((total, item) => {
            //     const itemPrice = product.price - product.salePrice
            //     return total + (itemPrice * item.quantity)
            // }, 0)
            cart.totalAmount = cart.items.reduce((total, item) => {
                // const itemPrice = product.price - product.salePrice;
                const productCurrency = product.currency
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
                const itemPrice = Number(((product.price - product.salePrice) * currencyConvertMultiplier).toFixed(2));
                return total + (itemPrice * item.quantity);
                // return total + (itemPrice * item.quantity);
            }, 0);
            await cart.save()
            // update stock quantity
            // product.totalStock -= quantity
            // await product.save()
            res.status(200).json({
                success: true,
                message: 'Product quantity increased successfully',
                cart,
                isAccessTokenExp,
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
                // cart.totalAmount = cart.items.reduce((total, item) => {
                //     const itemPrice = product.price - product.salePrice
                //     return total + (itemPrice * item.quantity)
                // }, 0)
                cart.totalAmount = cart.items.reduce((total, item) => {
                    // const itemPrice = product.price - product.salePrice;
                    const productCurrency = product.currency
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
                    const itemPrice = Number(((product.price - product.salePrice) * currencyConvertMultiplier).toFixed(2));
                    return total + (itemPrice * item.quantity);
                    // return total + (itemPrice * item.quantity);
                }, 0);
                await cart.save()
                // product.totalStock += quantity
                // await product.save()
                res.status(200).json({
                    success: true,
                    message: 'Product remove from cart successfully',
                    cart,
                    isAccessTokenExp,
                    accessToken: isAccessTokenExp ? accessToken : undefined,
                });
                return
            }
            await cart.save()
            // recalculate totals
            cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0)
            // cart.totalAmount = cart.items.reduce((total, item) => {
            //     const itemPrice = product.price - product.salePrice
            //     return total + (itemPrice * item.quantity)
            // }, 0)
            cart.totalAmount = cart.items.reduce((total, item) => {
                // const itemPrice = product.price - product.salePrice;
                const productCurrency = product.currency
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
                const itemPrice = Number(((product.price - product.salePrice) * currencyConvertMultiplier).toFixed(2));
                return total + (itemPrice * item.quantity);
                // return total + (itemPrice * item.quantity);
            }, 0);
            await cart.save()
            // product.totalStock += quantity
            // await product.save()
            res.status(200).json({
                success: true,
                message: 'Product quantity decreased successfully',
                cart,
                isAccessTokenExp,
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
    const { productId } = req.body;
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
        // product.totalStock += productQuantity
        // await product.save()

        // Recalculate totals

        cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
        cart.totalAmount = cart.items.reduce((total, item) => {
            // const itemPrice = product.price - product.salePrice;
            const productCurrency = product.currency
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
            const itemPrice = Number(((product.price - product.salePrice) * currencyConvertMultiplier).toFixed(2));
            return total + (itemPrice * item.quantity);
            // return total + (itemPrice * item.quantity);
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

// remove all product from cart on successfull order placed
const clearCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const _req = req as AuthRequest;
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
        if (cart) {
            cart.items = [];
            cart.totalAmount = 0
            cart.totalItems = 0
            await cart.save()
            res.status(200).json({
                success: true,
                cart,
                isAccessTokenExp,
                accessToken: isAccessTokenExp ? accessToken : undefined,
            });

        }
    } catch (error) {
        next(createHttpError(500, 'Error removing product from cart'));
    }
}


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
            isAccessTokenExp,
            accessToken: isAccessTokenExp ? accessToken : undefined,
        });

    } catch (error) {
        next(createHttpError(500, 'Error fetching cart details'));
    }
};


// const multipleProductAddToCart = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         // Validate request body
//         const { products } = multipleProductsSchema.parse(req.body)
//         console.log("products", products)
//         const _req = req as AuthRequest;
//         const { _id: userId, isAccessTokenExp } = _req;
//         let accessToken = "";
//         // Validate user
//         const user = await User.findById(userId);
//         if (!user) {
//             return next(createHttpError(404, 'User not found'));
//         }
//         if (!user.isLogin) {
//             return next(createHttpError(401, 'Unauthorized. You have to login first.'));
//         }
//         if (isAccessTokenExp) {
//             accessToken = user.generateAccessToken();
//         }

//         // Find or create cart for user
//         // TODO: check
//         let cart = await Cart.findOne({ user: userId });
//         if (!cart) {
//             cart = await Cart.create({
//                 user: userId,
//                 items: [],
//                 totalAmount: 0,
//                 totalItems: 0
//             });
//         }
//         // Process each product
//         const productsToUpdate = [];
//         const invalidProducts = [];
//         // Validate all products 
//         for (const item of products) {
//             const { id, quantity } = item

//             const product = await Product.findById(id)
//             // TODO :ONLY FOR TESTING
//             if (product) {
//                 console.log("single product ", product);
//             }
//             if (!product) {
//                 invalidProducts.push({ id, reason: 'Product not found' });
//                 continue;
//             }
//             if (product.totalStock < quantity) {
//                 invalidProducts.push({
//                     id,
//                     name: product.title,
//                     reason: 'Not enough stock available',
//                     requestedQuantity: quantity,
//                     availableStock: product.totalStock
//                 })
//                 continue
//             }
//             productsToUpdate.push({ product, quantity });
//             // If there are invalid products, return error
//             if (invalidProducts.length === products.length) {
//                 return res.status(400).json({
//                     success: false,
//                     message: ' products could not be added to cart',
//                     invalidProducts,
//                     accessToken: isAccessTokenExp ? accessToken : undefined
//                 });
//             }
//             // TODO
//             // Process valid products
//             for (const { product, quantity } of productsToUpdate) {
//                 const productId = product._id.toString();

//                 // Check if product already exists in cart
//                 const existingItemIndex = cart.items.findIndex(
//                     item => item.product.toString() === productId
//                 );

//                 if (existingItemIndex > -1) {
//                     // Update existing item quantity (replace with new quantity as per your implementation)
//                     cart.items[existingItemIndex].quantity = quantity;
//                 } else {
//                     // Add new item to cart
//                     cart.items.push({
//                         product: new mongoose.Types.ObjectId(productId),
//                         quantity
//                     });
//                 }

//                 // Update product stock
//                 product.totalStock -= quantity;
//                 await product.save();
//             }

//             // Recalculate cart totals - matches your existing patterns
//             cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);

//             // Get all products for accurate price calculation
//             const productIds = cart.items.map(item => item.product);
//             const productDetails = await Product.find({ _id: { $in: productIds } });

//             // Calculate total amount based on your pricing logic (price - salePrice)
//             cart.totalAmount = cart.items.reduce((total, item) => {
//                 const productDetail = productDetails.find(p => p._id.toString() === item.product.toString());
//                 if (productDetail) {
//                     const itemPrice = productDetail.price - productDetail.salePrice;
//                     return total + (itemPrice * item.quantity);
//                 }
//                 return total;
//             }, 0);

//             await cart.save();

//             // Fetch populated cart for response
//             const populatedCart = await Cart.findById(cart._id).populate('items.product');

//             return res.status(200).json({
//                 success: true,
//                 message: 'Products added to cart successfully',
//                 cart: populatedCart,
//                 accessToken: isAccessTokenExp ? accessToken : undefined
//             });
//         }
//     } catch (error) {
//         if (error instanceof z.ZodError) {
//             return next(createHttpError(400, {
//                 message: {
//                     type: "Validation error",
//                     zodError: error.errors
//                 }
//             }));
//         }
//         return next(createHttpError(500, "Error while adding multiple products to cart"));
//     }
// };


const multipleProductAddToCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Validate request body
        // const { products } = multipleProductsSchema.parse(req.body);
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

        // Find or create cart for user
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = await Cart.create({
                user: userId,
                items: [],
                totalAmount: 0,
                totalItems: 0
            });
        }

        // Process each product
        const productsToUpdate: { product: any, quantity: number }[] = [];
        const invalidProducts: any[] = [];

        // Validate all products first
        for (const item of products) {
            const { id, quantity } = item;
            const product = await Product.findById(id);

            if (!product) {
                invalidProducts.push({ id, reason: 'Product not found' });
                continue;
            }

            if (product.totalStock < quantity) {
                invalidProducts.push({
                    id,
                    name: product.title,
                    reason: 'Not enough stock available',
                    requestedQuantity: quantity,
                    availableStock: product.totalStock
                });
                continue;
            }

            productsToUpdate.push({ product, quantity });
        }

        // If there are invalid products, return error
        if (invalidProducts.length === products.length) {
            res.status(400).json({
                success: false,
                message: 'Products could not be added to cart',
                invalidProducts,
                isAccessTokenExp,
                accessToken: isAccessTokenExp ? accessToken : undefined
            });
            return;
        }

        // Process valid products
        for (const { product, quantity } of productsToUpdate) {
            const productId = product._id.toString();

            // Check if product already exists in cart
            const existingItemIndex = cart.items.findIndex(
                item => item.product.toString() === productId
            );

            if (existingItemIndex > -1) {
                // Update existing item quantity
                cart.items[existingItemIndex].quantity = quantity;
            } else {
                // Add new item to cart
                cart.items.push({
                    product: new mongoose.Types.ObjectId(productId),
                    quantity
                });
            }


        }

        // Recalculate cart totals
        cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);

        // Get all products for accurate price calculation
        const productIds = cart.items.map(item => item.product);
        const productDetails = await Product.find({ _id: { $in: productIds } });

        // Calculate total amount
        cart.totalAmount = cart.items.reduce((total, item) => {
            const productDetail = productDetails.find(p => p._id.toString() === item.product.toString());
            if (productDetail) {
                const productCurrency = productDetail.currency
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
                const itemPrice = Number(((productDetail.price - productDetail.salePrice) * currencyConvertMultiplier).toFixed(2));
                return total + (itemPrice * item.quantity);
            }
            return total;
        }, 0);

        await cart.save();

        // Fetch populated cart for response
        const populatedCart = await Cart.findById(cart._id).populate('items.product');

        res.status(200).json({
            success: true,
            message: 'Products added to cart successfully',
            cart: populatedCart,
            isAccessTokenExp,
            accessToken: isAccessTokenExp ? accessToken : undefined
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            next(createHttpError(400, {
                message: {
                    type: "Validation error",
                    zodError: error.errors
                }
            }));
            return;
        }
        next(createHttpError(500, "Error while adding multiple products to cart"));
    }
};



export {
    addToCart,
    updateCartQuantity,
    removeFromCart,
    getCart,
    multipleProductAddToCart,
    clearCart

};
