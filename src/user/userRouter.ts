import express from 'express'
import { changePassword, createAdmin, createManager, createUser, forcedLogout, getAlluser, getAlluserWithLimt, getSingleuser, loginUser, logoutUser } from './userController'
import authenticate from '../middlewares/authMiddleware'


const userRouter = express.Router()

// routes

userRouter.post("/register", createUser)
userRouter.post('/login', loginUser)
// userRouter.post('/test', authenticate, test)
userRouter.get('/logout', authenticate, logoutUser)
userRouter.get('/changePassword', authenticate, changePassword)
userRouter.post('/admin/register', createAdmin)
userRouter.post('/admin/register/manager', authenticate, createManager)
// userRouter.post('/admin/login', loginUser)
// userRouter.get('/admin/logout', authenticate, logoutUser)
userRouter.get('/admin/getAlluser', authenticate, getAlluser)
userRouter.get('/admin/getAlluserWithLimt', authenticate, getAlluserWithLimt)
userRouter.get('/getuser', authenticate, getSingleuser)
userRouter.post('/forcedLogout', forcedLogout)


export default userRouter