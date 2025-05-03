import express from "express"
import authenticate from "../middlewares/authMiddleware"
import { addToCart, clearCart, getCart, multipleProductAddToCart, removeFromCart, updateCartQuantity } from "./cartController"

const cartRouter = express.Router()


cartRouter.post('/addCartProduct', authenticate, addToCart)
cartRouter.post('/multilpeProductAddToCart', authenticate, multipleProductAddToCart)
cartRouter.post('/updateCartProduct', authenticate, updateCartQuantity)
cartRouter.post('/removeFromCart', authenticate, removeFromCart)
cartRouter.get('/getCart', authenticate, getCart)
cartRouter.get('/clearCart', authenticate, clearCart)

export default cartRouter