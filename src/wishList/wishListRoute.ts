import express from 'express'
import authenticate from '../middlewares/authMiddleware'
import { addToWishlist, getWishlist, removeWishlist } from './wishListController'


const wishListRouter = express.Router()

wishListRouter.get('/getWishlist', authenticate, getWishlist)
wishListRouter.get('/removeWishlist/:productId', authenticate, removeWishlist)
wishListRouter.post('/addToWishlist/:productId', authenticate, addToWishlist)

export default wishListRouter