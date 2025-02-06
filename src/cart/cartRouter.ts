import express from "express"
import authenticate from "../middlewares/authMiddleware"
import { addToCart, removeFromCart, updateCartQuantity } from "./cartController"

const cartRouter = express.Router()


cartRouter.post('/addCartProduct',authenticate,addToCart)
cartRouter.post('/updateCartProduct',authenticate,updateCartQuantity)
cartRouter.delete('/removeFromCart/:productId',authenticate,removeFromCart)

export default cartRouter