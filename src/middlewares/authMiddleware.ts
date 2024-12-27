import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { config } from "../config/config";

export interface AuthRequest extends Request {
    _id: string;
    email: string;
    isLogin: boolean;
    isAccessTokenExp: boolean;
}

// Helper function to extract and verify a token
const verifyToken = (token: string, secret: string) => {
    try {
        return jwt.verify(token, secret);
    } catch (err) {
        throw err;
    }
};

const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        return next(createHttpError(401, "Auth token is required"));
    }

    const accessToken = authHeader.split(" ")[1];
    if (!accessToken) {
        return next(createHttpError(401, "Access token not provided"));
    }

    try {
        // Verify the access token
        const decoded = verifyToken(accessToken, config.JWT_ACCESS_KEY as string) as jwt.JwtPayload;
        const { isLogin, email, _id } = decoded;

        const _req = req as AuthRequest;
        _req.email = email;
        _req._id = _id;
        _req.isLogin = isLogin;
        _req.isAccessTokenExp = false;

        return next();
    } catch (err: any) {
        // Handle expired access token
        if (err.name === "TokenExpiredError") {
            const refreshTokenHeader = req.header("refreshToken");
            if (!refreshTokenHeader) {
                return next(createHttpError(401, "Refresh token not found"));
            }

            const refreshToken = refreshTokenHeader.split(" ")[1];
            if (!refreshToken) {
                return next(createHttpError(401, "Invalid refresh token format"));
            }

            try {
                // Verify the refresh token
                const decoded = verifyToken(refreshToken, config.JWT_REFRESH_KEY as string) as jwt.JwtPayload;
                const { isLogin, email, _id } = decoded;

                const _req = req as AuthRequest;
                _req._id = _id;
                _req.isLogin = isLogin;
                _req.email = email;
                _req.isAccessTokenExp = true;

                return next();
            } catch (error) {
                return next(createHttpError(401, "Invalid or expired refresh token. Please log in again."));
            }
        }

        return next(createHttpError(401, "Invalid access token. Please log in again."));
    }
};

export default authenticate;
