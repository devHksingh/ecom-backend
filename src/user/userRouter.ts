import express from 'express'
import { createUser, loginUser, logoutUser, test } from './userController'
import authenticate from '../middlewares/authMiddleware'


const userRouter = express.Router()

// routes

userRouter.post("/register", createUser)
userRouter.post('/login', loginUser)
userRouter.post('/test',authenticate,test)
userRouter.get('/logout',authenticate,logoutUser)


export default userRouter