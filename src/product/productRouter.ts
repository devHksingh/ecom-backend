import express from 'express'
import multer from 'multer'
import path from 'node:path'
import authenticate from '../middlewares/authMiddleware'
import { createProduct, customizeProduct, deleteProductById, getAllCategoryName, getAllProducts, getAllProductsWithLimits, getProductByCategory, getProductByCategoryWithLimit, getSingleProduct, getStatusmultipleProduct, product, updateProduct } from './productController'


const productRouter = express.Router()


// file store local ->
const upload = multer({
    dest: path.resolve(__dirname, "../../public/data/uploads"),
    // limit 4mb max
    limits: { fieldSize: 4 * 1024 * 1024 } // max file size to 4mb

})

productRouter.post('/register', authenticate, upload.fields([{ name: "productImage", maxCount: 1 }]), createProduct)
productRouter.patch('/update/:productId', authenticate, upload.fields([{ name: "productImage", maxCount: 1 }]), updateProduct)
productRouter.get('/allProduct', getAllProducts)
productRouter.get('/getAllProductsWithLimits', getAllProductsWithLimits)
productRouter.post('/getProductByCategoryWithLimit', getProductByCategoryWithLimit)
productRouter.get('/getAllCategoryName', getAllCategoryName)
productRouter.get('/getProductByCategory', getProductByCategory)
productRouter.get('/product', product)
productRouter.get('/customizeProduct',authenticate ,customizeProduct)
productRouter.post('/getStatusmultipleProduct',authenticate ,getStatusmultipleProduct)
productRouter.get('/:productId', getSingleProduct)
productRouter.delete('/:productId', authenticate, deleteProductById)


export default productRouter