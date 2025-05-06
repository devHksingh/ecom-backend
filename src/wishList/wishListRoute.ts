import express from 'express'
import authenticate from '../middlewares/authMiddleware'
import { addToWishlist, getWishlist, multipleProductAddToWishList, removeWishlist } from './wishListController'


const wishListRouter = express.Router()

wishListRouter.get('/getWishlist', authenticate, getWishlist)
wishListRouter.post('/removeWishlist', authenticate, removeWishlist)
wishListRouter.post('/multipleProductAddToWishList', authenticate, multipleProductAddToWishList)
wishListRouter.post('/addToWishlist', authenticate, addToWishlist)

export default wishListRouter