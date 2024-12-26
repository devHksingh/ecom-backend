import express from 'express'
import multer from 'multer'
import path from 'node:path'
import authenticate from '../middlewares/authMiddleware'
import { createProduct, getAllProducts, getProductByCategory } from './productController'


const productRouter = express.Router()

// file store local ->
const upload = multer({
    dest: path.resolve(__dirname, "../../public/data/uploads"),
    // limit 4mb max
    limits: { fieldSize: 4 * 1024 * 1024 } // max file size to 4mb

})

productRouter.post('/register', authenticate, upload.fields([{ name: "prductImage", maxCount: 1 }]), createProduct)
productRouter.get('/allProduct',  getAllProducts)
productRouter.get('/getProductByCategory',  getProductByCategory)


export default productRouter