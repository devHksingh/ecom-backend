import { Request, Response, NextFunction } from 'express'
import path from 'node:path'
import cloudinary from '../config/cloudinary'
import { AuthRequest } from '../middlewares/authMiddleware'
import { User } from '../user/userModel'
import createHttpError from 'http-errors'
import { Product } from './productModel'
import { z } from 'zod'
import { createProductSchema } from './productZodSchema'


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

    // check isvalid user
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
            const fileName = files.prductImage[0].filename
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

            const newProduct = await Product.create({
                title,
                description,
                brand,
                category,
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




export {
    createProduct,
    getAllProducts,
    getProductByCategory
}