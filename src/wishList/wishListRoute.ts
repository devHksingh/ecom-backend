import express from 'express'
import authenticate from '../middlewares/authMiddleware'
import { getWishlist } from './wishListController'


const wishListRouter = express.Router()

wishListRouter.get('/getWishlist', authenticate, getWishlist)

export default wishListRouter