import express from "express"
import authenticate from "../middlewares/authMiddleware"
import { addToCart, getCart, removeFromCart, updateCartQuantity } from "./cartController"

const cartRouter = express.Router()


cartRouter.post('/addCartProduct',authenticate,addToCart)
cartRouter.post('/updateCartProduct',authenticate,updateCartQuantity)
cartRouter.delete('/removeFromCart/:productId',authenticate,removeFromCart)
cartRouter.get('/getCart',authenticate,getCart)

export default cartRouter