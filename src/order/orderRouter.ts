import express from 'express'
import authenticate from '../middlewares/authMiddleware'
import { getAllOrder, getAllOrderByLimitAndSkip, getOrderByUserEmail, getOrderByUserId, getSingleOrder, placeOrder, updateOrderStatus } from './orderController'

const orderRouter = express.Router()

orderRouter.post('/placeOrder', authenticate, placeOrder)
orderRouter.post('/updateOrderStatus', authenticate, updateOrderStatus)
orderRouter.get('/getAllOrder', authenticate, getAllOrder)
orderRouter.get('/getAllOrderByLimitAndSkip', authenticate, getAllOrderByLimitAndSkip)
orderRouter.get('/getOrder', authenticate, getOrderByUserId)
orderRouter.post('/getOrderByUserEmail/:customerEmail', authenticate, getOrderByUserEmail)
orderRouter.get('/:orderId', getSingleOrder)


export default orderRouter