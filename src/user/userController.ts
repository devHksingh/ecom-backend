import { NextFunction, Request, Response } from "express";
import { createUserSchema } from "./userZodSchema";
import { User } from "./userModel";
import createHttpError from "http-errors";
import { userAccessToken, userRefreshToken } from "../utils/genrateJwtToken";
import { z } from 'zod'


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
        const refreshToken = await userRefreshToken({ email: email })
        console.log(refreshToken);
        
        const token = `Bearer ${refreshToken}`
        const accessToken = userAccessToken({ email })
        // console.log("inside controller access",accessToken);
        

        // register new user on db
        const newUser = await User.create({
            name,
            email,
            password,
            isLogin: true,
            refreshToken: token,

        })
        if (newUser) {
            //    cookie
            const options = {
                httpOnly: true,
                secure: true,
            };
            res.status(201)
            .cookie("accessToken",`Bearer ${accessToken}`,options)
            .cookie("refreshToken",token,options)
            .json({ success: true, message: "user is register", userId: newUser.id, refreshToken: token, accessToken: `Bearer ${accessToken}` })
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




export {
    createUser,
}