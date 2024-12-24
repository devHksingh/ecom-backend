import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken"
import { config } from "../config/config";

export interface AuthRequest extends Request {
    _id: string,
    email: string,
    isLogin: boolean,
    isAccessTokenExp: boolean
}


const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')
    if (!token) {
        return next(createHttpError(401, "Auth token is required"))
    }
    try {
        const paresedToken = token.split(' ')[1]
        const decoded = jwt.verify(paresedToken, config.JWT_ACCESS_KEY as string)
        console.log('---------------------------------------------------------------------------')
        console.log('decoded token', decoded);
        const { isLogin, email, _id }: any = decoded.valueOf()
        const _req = req as AuthRequest
        _req.email = email
        _req._id = _id;
        _req.isLogin = isLogin;
        _req.isAccessTokenExp = false;
        next()
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
            const token = req.header('refreshToken')
            console.log("Refresh token", token);

            if (!token) {
                return next(createHttpError(401, 'Token not found'))
            }
            const paresedToken = token.split(' ')[1]
            try {
                const decodeToken = jwt.verify(paresedToken, config.JWT_REFRESH_KEY as string)
                const { isLogin, email, _id }:any = decodeToken;
                const _req = req as AuthRequest
                _req._id = _id
                _req.isLogin = isLogin
                _req.email = email
                _req.isAccessTokenExp = true
                next()
            } catch (error) {
                return next(createHttpError(401, "Token expiry. login again!"))
            }
        }
        return next(createHttpError(401, "Token not valid . login again!"))
    }
}

export default authenticate