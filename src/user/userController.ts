import { NextFunction, Request, Response } from "express";
import { createUserSchema, loginUserSchema } from "./userZodSchema";
import { User } from "./userModel";
import createHttpError from "http-errors";
import { userAccessToken, userRefreshToken } from "../utils/genrateJwtToken";
import { z } from 'zod'
import { log } from "console";
import { AuthRequest } from "../middlewares/authMiddleware";


const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validateUser = createUserSchema.parse(req.body)
        const { email, name, password } = validateUser
        console.log(email, name, password);

        // check user is already exist in db
        const checkUser = await User.findOne({
            email
        }).select("-password")
        if (checkUser) {
            // res.status(401).json({ message: "User is already exist with this email id" })
            const err = createHttpError(401, "User is already exist with this email id")
            // console.log("ERROR :",err)
            next(err)
        }
        // genrate token
        // const refreshToken = await userRefreshToken({ email: email })
        // console.log(refreshToken);

        // const token = `Bearer ${refreshToken}`
        // const accessToken = userAccessToken({ email })
        // console.log("inside controller access",accessToken);


        // register new user on db
        const newUser = await User.create({
            name,
            email,
            password,
            isLogin: false,
            // refreshToken: token,

        })
        if (newUser) {

            res.status(201).json({ success: true, message: "user is register", userId: newUser.id })



        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            const err = createHttpError(401, { message: { type: "Validation error", zodError: error.errors } })
            next(err)
        } else {
            const err = createHttpError(500, "Internal server error while creating user")
            next(err)
        }
    }
}

const loginUser = async (req: Request, res: Response, next: NextFunction) => {

    try {
        const isValidUser = loginUserSchema.parse(req.body)
        const { email, password } = isValidUser
        const user = await User.findOne({
            email
        })
        if (user) {
            if (user.isLogin) {
                const err = createHttpError(401, "User is already login")
                next(err)
            }
            console.log(user)
            console.log(password)
            const isPasswordCorrect = await user.isPasswordCorrect(password)
            console.log(isPasswordCorrect)
            if (!isPasswordCorrect) {
                const err = createHttpError(400, "Invalid old password");
                next(err)
            }
            const accessToken = user.generateAccessToken()
            const refreshToken = user.generateRefreshToken()
            // Update user details
            user.refreshToken = refreshToken

            user.isLogin = true
            await user.save({ validateBeforeSave: false })
            res.status(201)
                .json({
                    success: true,
                    message: "User is login successfully",
                    accessToken: accessToken,
                    refreshToken: refreshToken
                })
        } else {
            const err = createHttpError(401, "User does not exist")
            next(err)
        }


    } catch (error) {
        if (error instanceof z.ZodError) {
            const err = createHttpError(401, { message: { type: "Validation error", zodError: error.errors } })
            next(err)
        } else {
            const err = createHttpError(500, "Internal server error while login user")
            next(err)
        }
    }

}

const test = async (req: Request, res: Response, next: NextFunction) => {
    const _req = req as AuthRequest
    const a = _req.email
    // console.log(_req.isAccessTokenExp)
    // console.log(_req.email)
    // console.log(_req._id)
    // console.log(_req.isLogin)
    console.log(_req);

    const { isAccessTokenExp, isLogin, email, _id } = _req
    console.log(isAccessTokenExp, isLogin, email, _id);

    res.status(201).json({ message: "done", a })

}

const logoutUser = async (req: Request, res: Response, next: NextFunction) => {
    // const _req = req as AuthRequest
    const _req = req as AuthRequest
    const { _id, email, isLogin, isAccessTokenExp } = _req
    try {
        const user = await User.findById({ _id }).select('-password')
        if (user) {
            user.isLogin = false
            res.status(201).json({ success: true, message: "User is successfully logout" })
        }
    } catch (error) {
        const err = createHttpError(500, "Internal server error while logout user")
        next(err)
    }
}

const createAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validateUser = createUserSchema.parse(req.body)
        const { email, password, name } = validateUser
        // db call to check if user with admin is already there in db
        const isuserWithAdminRole = await User.findOne({ role: "admin" })
        if (isuserWithAdminRole) {
            next(createHttpError(401, "Already user register with admin role."))
        }
        const isvalidUser = await User.findOne({ email })
        if (isvalidUser) {
            next(createHttpError(401, "Already user register with this emailId."))
        }
        const user = await User.create({
            name,
            email,
            password,
            isLogin: false,
            role: "admin"
        })
        if (user) {
            res.status(201).json({ success: true, message: "user is register", userId: user.id })
        }
    } catch (error) {

    }

}

export {
    createUser,
    loginUser,
    test,
    logoutUser,
    createAdmin
}