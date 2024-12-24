import { NextFunction, Request, Response } from "express";
import { createUserSchema, loginUserSchema } from "./userZodSchema";
import { User } from "./userModel";
import createHttpError from "http-errors";
import { userAccessToken, userRefreshToken } from "../utils/genrateJwtToken";
import { z } from 'zod'
import { log } from "console";


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
            //    cookie
            const options = {
                httpOnly: true,
                secure: true,
                maxAge: 4 * 24 * 60 * 60 * 1000 // 4days
            };
            res.status(201)
                // .cookie("accessToken", `Bearer ${accessToken}`, options)
                // .cookie("refreshToken", token, options)
                .cookie("userId", newUser.id, options)
                .cookie("isLogin", newUser.isLogin, options)
                .json({ success: true, message: "user is register", userId: newUser.id })
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
        log(email, password)
        const user = await User.findOne({
            email
        })
        if (user) {
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
            const options = {
                httpOnly: true,
                secure: true,
                maxAge: 4 * 24 * 60 * 60 * 1000 // 4days
            };
            res.status(201)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", refreshToken, options)
                .cookie("isLogin", user.isLogin, options)
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

export {
    createUser,
    loginUser,
}