import express from 'express'
import authenticate from '../middlewares/authMiddleware'
import { placeOrder, updateOrderStatus } from './orderController'

const orderRouter = express.Router()

orderRouter.post('/placeOrder', authenticate, placeOrder)
orderRouter.post('/updateOrderStatus', authenticate, updateOrderStatus)

export default orderRouter