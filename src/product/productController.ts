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
            const ctegoryArr = category.split(' ')

            const newProduct = await Product.create({
                title,
                description,
                brand,
                category:ctegoryArr,
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
            console.log('Old Image Public ID:', oldPublicId);
        }

        // Step 6: Handle new files (Cloudinary upload)
        const newFiles = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (newFiles.productImage) {
            console.log(newFiles.productImage);

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
                console.log(cloudinaryResponse["public_id"]);

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
                console.log(typeof (optimizeUrl));


            }
            // delete old img on cloudnary
            await cloudinary.uploader.destroy(oldPublicId)
            // delete temp file 
            try {
                await fs.promises.unlink(filePath)
            } catch (error) {
                console.log("Unable to delete local file");

            }

            console.log(optimizeUrl)
        }


        // Step 7: Update product fields
        productDetail.title = title || productDetail.title;
        productDetail.brand = brand || productDetail.brand;
        productDetail.category = category || productDetail.category;
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
        if(products.length<40){
            return next(createHttpError(400,'Not enough product to dispaly'))
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
            console.log('Old Image Public ID:', oldPublicId);
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



export {
    createProduct,
    getAllProducts,
    getProductByCategory,
    getSingleProduct,
    updateProduct,
    deleteProductById
}