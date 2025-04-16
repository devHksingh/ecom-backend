import { Request, Response, NextFunction } from 'express'
import path from 'node:path'
import cloudinary from '../config/cloudinary'
import { AuthRequest } from '../middlewares/authMiddleware'
import { User } from '../user/userModel'
import createHttpError from 'http-errors'
import { Product } from './productModel'
import { z } from 'zod'
import { createProductSchema } from './productZodSchema'
import fs from 'node:fs'
import { Order } from '../order/orderModel'




const createProduct = async (req: Request, res: Response, next: NextFunction) => {
    // check req formate from zod
    const isvalidReq = createProductSchema.parse(req.body)

    const {
        title,
        brand,
        category,
        currency,
        description,
        price,
        salePrice,
        totalStock } = isvalidReq

    // check isvalid user0
    const _req = req as AuthRequest
    const { _id, email, isLogin, isAccessTokenExp } = _req
    try {
        const isValidUser = await User.findById({ _id })
        if (isValidUser) {
            const userRole = isValidUser.role
            if (!isValidUser.isLogin) {
                next(createHttpError(401, "you hav to login first"))
            }
            // Only admins and managers are allowed.
            if (userRole !== "admin" && userRole !== "manager") {
                next(createHttpError(400, "you are not authorize for this request"))
            }
            // console.log("userRole-------------------");
            let optimizeUrl
            let accessToken = ''
            if (isAccessTokenExp) {
                accessToken = isValidUser.generateAccessToken()
            }
            console.log(req.files)
            const files = req.files as { [fieldname: string]: Express.Multer.File[] }
            const fileName = files.productImage[0].filename
            const filePath = path.resolve(
                __dirname,
                "../../public/data/uploads",
                fileName
            )
            const uploadResult = await cloudinary.uploader.upload(filePath, {
                filename_override: fileName,
                folder: "products-image"
            })
            if (uploadResult) {
                console.log(uploadResult["public_id"]);

                const public_id = uploadResult["public_id"]
                // Optimize delivery by resizing and applying auto-format and auto-quality
                optimizeUrl = cloudinary.url(public_id, {
                    transformation: [
                        {
                            width: "auto",
                            crop: "fill",
                            gravity: "auto"
                        }, {
                            dpr: "auto",
                            fetch_format: 'auto',
                            quality: 'auto',
                        }
                    ]
                })
                console.log(typeof (optimizeUrl));


            }
            // delete temp file 
            try {
                await fs.promises.unlink(filePath)
            } catch (error) {
                console.log("Unable to delete local file");

            }
            // split category
            const ctegoryArr = category.split(',')

            const newProduct = await Product.create({
                title,
                description,
                brand,
                category: ctegoryArr,
                image: optimizeUrl,
                price,
                currency,
                salePrice,
                totalStock
            })
            if (newProduct) {
                if (accessToken) {
                    res.status(200).json({ success: true, message: "Product is register successfully ", isAccessTokenExp: true, accessToken: accessToken })
                }
                res.status(200).json({ success: true, message: "Product is register successfully ", isAccessTokenExp: false })
            }
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            const err = createHttpError(401, { message: { type: "Validation error", zodError: error.errors } })
            next(err)
        } else {
            const err = createHttpError(500, "Internal server error while creating product")
            next(err)
        }
    }




}

const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const allProducts = await Product.find()
        if (allProducts) {
            res.status(201).json({ success: true, allProducts })
        }
    } catch (error) {
        const err = createHttpError(500, "Internal server error while getting list of  product")
        next(err)
    }
}

// const getProductByCategory = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const { category } = req.body;

//         // Validate category
//         if (!category || typeof category !== "string") {
//             return next(createHttpError(400, "Category is required and must be a string"));
//         }

//         // Query for products
//         const products = await Product.find({ category: { $in: [category] } });

//         // Check if products exist
//         if (products.length > 0) {
//             res.status(200).json({ success: true, products });
//         } else {
//             next(createHttpError(404, "No products found for the specified category"));
//         }
//     } catch (error) {
//         next(createHttpError(500, "Unable to retrieve products"));
//     }
// };

// Handling Array of Categories
const getProductByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { category } = req.body;

        // Validate category
        if (!category || !Array.isArray(category) || category.length === 0) {
            return next(createHttpError(400, "Category is required and must be a non-empty array"));
        }

        // Query for products
        const products = await Product.find({ category: { $in: category } });

        // Check if products exist
        if (products.length > 0) {
            res.status(200).json({ success: true, products });
        } else {
            next(createHttpError(404, "No products found for the specified categories"));
        }
    } catch (error) {
        next(createHttpError(500, "Unable to retrieve products"));
    }
};

const getSingleProduct = async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.productId
    if (!productId) {
        next(createHttpError(401, "ProductId is required"))
    }
    try {
        const productDetail = await Product.findById({ _id: productId })
        if (productId) {
            res.status(201).json({
                success: true, message: "Product fecth successfully",
                productDetail: productDetail
            }
            )
        } else {
            next(createHttpError(404, "Product not found"))
        }
    } catch (error) {
        next(createHttpError(500, "Error while getting product"))
    }
}

const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    /*
    Steps:
    1. Get user ID from auth token and verify it.
    2. Check if user role is admin or manager.
    3. Get all updated text fields from req.body.
    4. Get productId from params.
    5. Verify product by its ID.
    6. Check if there are any files in req.files. If present, upload them to Cloudinary.
    7. Update all fields.
    */
    let optimizeUrl = '';
    let accessToken = '';
    const {
        title,
        brand,
        category,
        currency,
        description,
        price,
        salePrice,
        totalStock,
    } = req.body;

    const productId = req.params.productId;
    console.log('Product ID:', productId);

    // Extract user details from the request
    const _req = req as AuthRequest;
    const { _id, email, isLogin, isAccessTokenExp } = _req;

    try {
        // Step 1: Verify user
        const isValidUser = await User.findById(_id);
        if (!isValidUser) {
            return next(createHttpError(401, 'Invalid user'));
        }

        // Step 2: Check if user is logged in
        if (!isValidUser.isLogin) {
            return next(createHttpError(401, 'You must log in first'));
        }

        // Step 3: Check user role
        const userRole = isValidUser.role;
        if (userRole !== 'admin' && userRole !== 'manager') {
            return next(createHttpError(403, 'You are not authorized to update this product'));
        }

        // Step 4: Verify product
        const productDetail = await Product.findById(productId);
        if (!productDetail) {
            return next(createHttpError(404, 'Product not found'));
        }

        // Step 5: Handle old image publicId
        let oldPublicId = '';
        if (productDetail.image) {
            const img_url = productDetail.image.split('?')[0]; // Remove query parameters
            const arr = img_url.split('/');
            oldPublicId = `${arr.at(-2)}/${arr.at(-1)}`;
            // console.log('Old Image Public ID:', oldPublicId);
        }

        // Step 6: Handle new files (Cloudinary upload)
        const newFiles = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (newFiles.productImage) {
            // console.log(newFiles.productImage);

            // const file = newFiles.productImage[0];
            const fileName = newFiles.productImage[0].filename
            const filePath = path.resolve(
                __dirname,
                "../../public/data/uploads",
                fileName
            )
            // Upload the new image to Cloudinary

            const cloudinaryResponse = await cloudinary.uploader.upload(filePath, {
                filename_override: fileName,
                folder: "products-image"
            })
            if (cloudinaryResponse) {
                // console.log(cloudinaryResponse["public_id"]);

                const public_id = cloudinaryResponse["public_id"]
                // Optimize delivery by resizing and applying auto-format and auto-quality
                optimizeUrl = cloudinary.url(public_id, {
                    transformation: [
                        {
                            width: "auto",
                            crop: "fill",
                            gravity: "auto"
                        }, {
                            dpr: "auto",
                            fetch_format: 'auto',
                            quality: 'auto',
                        }
                    ]
                })
                // console.log(typeof (optimizeUrl));


            }
            // delete old img on cloudnary
            await cloudinary.uploader.destroy(oldPublicId)
            // delete temp file 
            try {
                await fs.promises.unlink(filePath)
            } catch (error) {
                console.log("Unable to delete local file");

            }

            // console.log(optimizeUrl)
        }

        // split category
        const ctegoryArr = category.split(',')

        // Step 7: Update product fields
        productDetail.title = title || productDetail.title;
        productDetail.brand = brand || productDetail.brand;
        productDetail.category = ctegoryArr || productDetail.category;
        productDetail.currency = currency || productDetail.currency;
        productDetail.description = description || productDetail.description;
        productDetail.price = price || productDetail.price;
        productDetail.salePrice = salePrice || productDetail.salePrice;
        productDetail.totalStock = totalStock || productDetail.totalStock;
        productDetail.image = optimizeUrl || productDetail.image;

        // Save the updated product
        await productDetail.save({ validateBeforeSave: false });

        // Step 8: Handle access token expiration
        if (isAccessTokenExp) {
            accessToken = isValidUser.generateAccessToken();
        }

        // Respond with the updated product
        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            product: productDetail,
            accessToken: isAccessTokenExp ? accessToken : undefined,
        });
    } catch (error) {
        // console.error('Error updating product:', error);
        return next(createHttpError(500, 'Internal server error while updating product'));
    }
};

const deleteProductById = async (req: Request, res: Response, next: NextFunction) => {

    const productId = req.params.productId

    const _req = req as AuthRequest;
    const { _id, email, isLogin, isAccessTokenExp } = _req;

    try {
        //  Verify user
        const isValidUser = await User.findById(_id);
        if (!isValidUser) {
            return next(createHttpError(401, 'Invalid user'));
        }

        //  Check if user is logged in
        if (!isValidUser.isLogin) {
            return next(createHttpError(401, 'You must log in first'));
        }

        //  Check user role
        const userRole = isValidUser.role;
        if (userRole !== 'admin' && userRole !== 'manager') {
            return next(createHttpError(403, 'You are not authorized to update this product'));
        }
        // check total length of products if length is less than 40 then not allowed
        const products = await Product.find()
        // console.log("All products :",products)
        // console.log("All products :",products.length)
        // TODO: Uncomment below line in production
        if (products.length < 40) {
            return next(createHttpError(400, 'Not enough product to dispaly'))
        }


        //  Verify product
        const productDetail = await Product.findById(productId);
        if (!productDetail) {
            return next(createHttpError(404, 'Product not found'));
        }
        // Step 5: Handle old image publicId
        let oldPublicId = '';
        if (productDetail.image) {
            const img_url = productDetail.image.split('?')[0]; // Remove query parameters
            const arr = img_url.split('/');
            oldPublicId = `${arr.at(-2)}/${arr.at(-1)}`;
            // console.log('Old Image Public ID:', oldPublicId);
        }
        //  delete img scr from cloudnary
        await cloudinary.uploader.destroy(oldPublicId)
        // delete from db
        await Product.findOneAndDelete({ _id: productId })
        let accessToken
        //  Handle access token expiration
        if (isAccessTokenExp) {
            accessToken = isValidUser.generateAccessToken();
        }
        // Respond with the  product
        res.status(200).json({
            success: true,
            message: 'Product deleted successfully',
            accessToken: isAccessTokenExp ? accessToken : undefined,
        });

    } catch (error) {
        next(createHttpError(500, 'Internal server error while deleting the product'));
    }
}

const getProductByCategoryWithLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { category, limit = 10, skip = 0 } = req.body;
        // const { limit = 10, skip = 0 } = req.query
        // validate category

        if (!category || !Array.isArray(category) || category.length === 0) {
            return next(createHttpError(400, "Category is required and must be a non-empty array"));
        }

        // convert limit and skip to number
        const parsedLimit = parseInt(limit as string, 10) || 10
        const parsedSkip = parseInt(skip as string, 10) || 0;

        const totalProducts = await Product.find({ category: { $in: category } }).sort({ title: 1 })
        const totalProductAtCategory = totalProducts.length
        const totalPages = Math.ceil(totalProductAtCategory / parsedLimit)

        /*
            1. Get number of product added last month
            2. Get stock Status InStock/OutOfStock/Low Stock
        */
        const numberOfProductAddLastMonth = totalProducts.reduce((acc, product) => {
            const thirtyDaysAgoDate = new Date()
            const todayDate = new Date()
            thirtyDaysAgoDate.setDate(todayDate.getDate() - 30)
            const productDate = new Date(product.createdAt)
            if (productDate >= thirtyDaysAgoDate && productDate <= todayDate) {
                acc += 1
            }
            return acc
        }, 0)

        const productStockStatus = totalProducts.reduce((acc, product) => {
            if (product.totalStock > 0) {
                acc.stockQuantaty += product.totalStock
            }
            if (product.totalStock >= 20) {
                acc.inStock += 1
            }
            if (product.totalStock < 20) {
                acc.lowStock += 1
            }
            if (product.totalStock === 0) {
                acc.outOfStock += 1
            }
            return acc

        }, { inStock: 0, outOfStock: 0, lowStock: 0, stockQuantaty: 0 })

        const currentPage = Math.floor(parsedSkip / parsedLimit) + 1
        const nextPage = currentPage < totalPages ? currentPage + 1 : null
        const prevPage = currentPage > 1 ? currentPage - 1 : null
        //Query for products with pagination
        const products = await Product.find({ category: { $in: category } }).limit(parsedLimit).skip(parsedSkip)
        if (products.length > 0) {
            res.status(200).json({
                success: true,
                message: "Products found",
                products,
                total: totalProductAtCategory,
                lastThirtyDaysProductCount: numberOfProductAddLastMonth,
                productStockStatus,
                totalPages,
                currentPage,
                nextPage,
                prevPage,
                limit: parsedLimit,
                skip: parsedSkip
            })
        } else {
            res.status(404).json({ success: false, message: "No products found for the specified category" })
        }

    } catch (error) {
        next(createHttpError(500, "Unable to retrieve products"));
    }
}
const getAllProductsWithLimits = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { limit = 10, skip = 0 } = req.query
        const parsedLimit = parseInt(limit as string, 10) || 10
        const parsedSkip = parseInt(skip as string, 10) || 0
        const totalProducts = await Product.find()

        const totalProductsLength = totalProducts.length
        const totalPages = Math.ceil(totalProductsLength / parsedLimit)
        const currentPage = Math.floor(parsedSkip / parsedLimit) + 1
        const nextPage = currentPage < totalPages ? currentPage + 1 : null
        const prevPage = currentPage > 1 ? currentPage - 1 : null
        // sorts the results by the title field in ascending
        const products = await Product.find().limit(parsedLimit).skip(parsedSkip).sort({ title: 1 })


        /*
            1. Get number of product added last month
            2. Get stock Status InStock/OutOfStock/Low Stock
        */
        const numberOfProductAddLastMonth = totalProducts.reduce((acc, product) => {
            const todayDate = new Date()
            const thirtyDaysAgoDate = new Date()
            thirtyDaysAgoDate.setDate(todayDate.getDate() - 30)
            const date = new Date(product.createdAt)
            if (date >= thirtyDaysAgoDate && date <= todayDate) {
                acc += 1
            }
            return acc
        }, 0)

        const productStockStatus = totalProducts.reduce((acc, product) => {
            if (product.totalStock > 0) {
                acc.stockQuantaty += product.totalStock
            }
            if (product.totalStock >= 20) {
                acc.inStock += 1
            }
            if (product.totalStock < 20) {
                acc.lowStock += 1
            }
            if (product.totalStock === 0) {
                acc.outOfStock += 1
            }
            return acc

        }, { inStock: 0, outOfStock: 0, lowStock: 0, stockQuantaty: 0 })

        // console.log("productStockStatus :", productStockStatus);


        if (products.length > 0) {
            res.status(200).json({
                success: true,
                message: "Product list fetch successfully",
                products,
                lastThirtyDaysProductCount: numberOfProductAddLastMonth,
                productStockStatus,
                totalPages,
                currentPage,
                nextPage,
                prevPage,
                total: totalProductsLength,
                limit: parsedLimit,
                skip: parsedSkip
            })
        } else {
            next(createHttpError(404, "No products found "));
        }
    } catch (error) {
        next(createHttpError(500, "Unable to retrieve products"));
    }
}

const getAllCategoryName = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Mongoose’s built-in .distinct() to get an array of unique categories
        const categories = await Product.distinct("category")
        if (!categories.length) {
            return next(createHttpError(404, "No categories found"));
        }
        const sortedCategories = categories.sort()
        res.status(200).json({ success: true, categories: sortedCategories });

    } catch (error) {
        next(createHttpError(500, "Unable to retrieve categories name"));
    }
}

const product = async (req: Request, res: Response, next: NextFunction) => {

    try {
        const order = await Order.find()
        const productSaleRecord = order.reduce((acc, order) => {
            const productName = order.productDetail.name
            const productQuantity = order.quantity
            const productCurrency = order.productDetail.currency
            const id = order.productDetail.productId
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
            if (!acc[productName]) {
                acc[productName] = {
                    quantity: 0,
                    productId: "",
                    currency: "",
                    totalPrice: 0
                }
            }
            acc[productName].quantity += productQuantity
            acc[productName].productId = id
            acc[productName].totalPrice += Number(((order.totalPrice) * currencyConvertMultiplier).toFixed(2))
            acc[productName].currency = productCurrency
            return acc

        }, {} as Record<string, { productId: string, quantity: number, totalPrice: number, currency: string }>)

        // convert object into array with sorting in descring order
        const productArrByQuantity = Object.entries(productSaleRecord).map(([name, value]) => ({ name, value })).sort((a, b) => b.value.quantity - a.value.quantity)
        const productOrderByPrice = productArrByQuantity.sort((a, b) => b.value.totalPrice - a.value.totalPrice)
        const top8MostBought = productArrByQuantity.slice(0, 8)
        const top8MostExpensive = productOrderByPrice.slice(0, 8)
        const top8LeastExpensive = productOrderByPrice.slice(-8)
        // get  productId[] from above 
        const top8MostBoughtProductId: string[] = []
        const top8MostExpensiveProductId: string[] = []
        const top8LeastExpensiveProductId: string[] = []
        top8MostBought.map((product) => {
            const id = product.value.productId
            top8MostBoughtProductId.push(id)
        })
        top8MostExpensive.map((product) => {
            const id = product.value.productId
            top8MostExpensiveProductId.push(id)
        })
        top8LeastExpensive.map((product) => {
            const id = product.value.productId
            top8LeastExpensiveProductId.push(id)
        })
        const top8MostBoughtProduct = await Product.find({ _id: { $in: top8MostBoughtProductId } })
        const top8MostExpensiveProduct = await Product.find({ _id: { $in: top8MostExpensiveProductId } })
        const top8LeastExpensiveProduct = await Product.find({ _id: { $in: top8LeastExpensiveProductId } })
        if (order && top8MostBoughtProduct) {
            res.status(200).json({
                success: true,
                message: "Product details fetched",
                top8MostBoughtProduct,
                top8MostExpensiveProduct,
                top8LeastExpensiveProduct
            })
        } else {
            res.status(400).json({
                success: false,
                message: "No product to show"
            })
        }
    } catch (error) {
        next(createHttpError(500, "Unable to retrieve Product details"));
    }
}

export {
    createProduct,
    getAllProducts,
    getProductByCategory,
    getSingleProduct,
    updateProduct,
    deleteProductById,
    getProductByCategoryWithLimit,
    getAllProductsWithLimits,
    getAllCategoryName,
    product
}