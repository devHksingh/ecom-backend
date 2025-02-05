import express from "express"
import authenticate from "../middlewares/authMiddleware"
import { addToCart } from "./cartController"

const cartRouter = express.Router()


cartRouter.post('/addCartProduct',authenticate,addToCart)

export default cartRouter