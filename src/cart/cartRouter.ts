import express from "express"
import authenticate from "../middlewares/authMiddleware"
import { addToCart, updateCartQuantity } from "./cartController"

const cartRouter = express.Router()


cartRouter.post('/addCartProduct',authenticate,addToCart)
cartRouter.post('/updateCartProduct',authenticate,updateCartQuantity)

export default cartRouter