import express from 'express'
import authenticate from '../middlewares/authMiddleware'
import { placeOrder } from './orderController'

const orderRouter = express.Router()

orderRouter.post('/placeOrder', authenticate, placeOrder)

export default orderRouter