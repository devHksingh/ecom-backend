import express from 'express'
import authenticate from '../middlewares/authMiddleware'
import { addToWishlist, getWishlist } from './wishListController'


const wishListRouter = express.Router()

wishListRouter.get('/getWishlist', authenticate, getWishlist)
wishListRouter.post('/addToWishlist', authenticate, addToWishlist)

export default wishListRouter