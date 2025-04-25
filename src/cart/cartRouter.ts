import express from "express"
import authenticate from "../middlewares/authMiddleware"
import { addToCart, getCart, multipleProductAddToCart, removeFromCart, updateCartQuantity } from "./cartController"

const cartRouter = express.Router()


cartRouter.post('/addCartProduct', authenticate, addToCart)
cartRouter.post('/multilpeProductAddToCart', authenticate, multipleProductAddToCart)
cartRouter.post('/updateCartProduct', authenticate, updateCartQuantity)
cartRouter.delete('/removeFromCart/:productId', authenticate, removeFromCart)
cartRouter.get('/getCart', authenticate, getCart)

export default cartRouter