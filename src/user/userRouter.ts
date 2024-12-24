import express from 'express'
import { createAdmin, createUser, getAlluser, loginUser, logoutUser, test } from './userController'
import authenticate from '../middlewares/authMiddleware'


const userRouter = express.Router()

// routes

userRouter.post("/register", createUser)
userRouter.post('/login', loginUser)
userRouter.post('/test', authenticate, test)
userRouter.get('/logout', authenticate, logoutUser)
userRouter.post('/admin/register', createAdmin)
userRouter.post('/admin/login', loginUser)
userRouter.get('/admin/logout', authenticate, logoutUser)
userRouter.get('/admin/getAlluser', authenticate, getAlluser)


export default userRouter