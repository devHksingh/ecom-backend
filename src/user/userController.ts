import { NextFunction, Request, Response } from "express";
import { changeUserPasswordSchema, createUserSchema, loginUserSchema, userAddressSchema, userPhoneNumberSchema } from "./userZodSchema";
import { User } from "./userModel";
import createHttpError from "http-errors";
import { userAccessToken, userRefreshToken } from "../utils/genrateJwtToken";
import { z } from 'zod'
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
            return next(err)
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

            res.status(201).json({ success: true, message: "user is register" })
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
                return next(err)
            }

            const isPasswordCorrect = await user.isPasswordCorrect(password)
            console.log(isPasswordCorrect)
            if (!isPasswordCorrect) {
                const err = createHttpError(400, "Invalid  password");
                return next(err)
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
                    refreshToken: refreshToken,
                    userDetails: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        // address:user.address,
                        // pinCode:user.pinCode,
                        // phoneNumber:user.phoneNumber
                    }

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

// const test = async (req: Request, res: Response, next: NextFunction) => {
//     const _req = req as AuthRequest
//     const a = _req.email
//     // console.log(_req.isAccessTokenExp)
//     // console.log(_req.email)
//     // console.log(_req._id)
//     // console.log(_req.isLogin)
//     console.log(_req);

//     const { isAccessTokenExp, isLogin, email, _id } = _req
//     console.log(isAccessTokenExp, isLogin, email, _id);

//     res.status(201).json({ message: "done", a })

// }

const logoutUser = async (req: Request, res: Response, next: NextFunction) => {
    // const _req = req as AuthRequest
    const _req = req as AuthRequest
    const { _id, email, isLogin, isAccessTokenExp } = _req
    try {
        const user = await User.findById({ _id }).select('-password')
        if (user) {
            user.isLogin = false
            user.refreshToken = ""
            await user.save({ validateBeforeSave: false })
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
        if (error instanceof z.ZodError) {
            const err = createHttpError(401, { message: { type: "Validation error", zodError: error.errors } })
            next(err)
        } else {
            const err = createHttpError(500, "Internal server error while creating admin")
            next(err)
        }
    }

}

const getAlluser = async (req: Request, res: Response, next: NextFunction) => {
    const _req = req as AuthRequest
    const { isAccessTokenExp, isLogin, email, _id } = _req
    if (!isLogin) {
        next(createHttpError(401, 'you are unauthorize for this request.Kindly login first'))
    }
    try {
        const user = await User.findOne({ email }).select("-password -cardNumber -isLogin")
        if (user) {
            if (user.role === "user") {
                next(createHttpError(401, 'you are unauthorize for this request.'))
            } else if (!user.isLogin) {
                next(createHttpError(401, 'You are logout!.Kindly login first'))
            }
            let newAccessToken
            if (isAccessTokenExp) {
                newAccessToken = user.generateAccessToken()
            }
            const alluser = await User.find({ role: "user" }).select("-password -cardNumber -isLogin")
            res.status(200).json({
                success: true,
                alluser,
                isAccessTokenExp,
                accessToken: newAccessToken
            })
        }

    } catch (error) {
        next(createHttpError(500, 'unable to get all user info.'))
    }
}

const getSingleuser = async (req: Request, res: Response, next: NextFunction) => {
    const _req = req as AuthRequest
    const { isAccessTokenExp, isLogin, email, _id } = _req

    try {

        // TODO : REMOVE refreshToken  
        const user = await User.findById(_id).select("-password -refreshToken")
        if (!user) {
            return next(createHttpError(404, 'Unauthorize request .No user Found'))
        }
        if (user) {
            if (!user.isLogin) {
                next(createHttpError(401, 'You are logout!.Kindly login first'))
            }
            let newAccessToken
            if (isAccessTokenExp) {
                newAccessToken = user.generateAccessToken()
            }
            res.status(200).json({
                success: true,
                user,
                isAccessTokenExp,
                accessToken: newAccessToken,
            })
        }
    } catch (error) {
        next(createHttpError(500, 'unable to get all user info.'))
    }
}

const createManager = async (req: Request, res: Response, next: NextFunction) => {
    const _req = req as AuthRequest
    const { _id, email, isLogin } = _req
    try {
        const isvalidUser = await User.findById(_id).select("-password -refreshToken")
        if (isvalidUser) {
            if (isvalidUser.role === "admin") {
                if (!isvalidUser.isLogin) {
                    return next(createHttpError(401, "You are logout. Login it again!."))
                }
                const validateUser = createUserSchema.parse(req.body)
                const { email, password, name } = validateUser
                // check if already register in db
                const isUserRegister = await User.findOne({ email })
                if (isUserRegister) {
                    return next(createHttpError(401, "Manager is already register in DB."))
                }
                // creating user in db
                const user = await User.create({
                    email,
                    isLogin: false,
                    name,
                    password,
                    role: "manager"
                })
                if (user) {
                    res.status(201).json({ success: true, message: "manager is register on db", userId: user.id })
                }
            } else {
                next(createHttpError(401, "You are unauthorize for this request."))
            }

        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            const err = createHttpError(401, { message: { type: "Validation error1", zodError: error.errors } })
            next(err)
        } else {
            const err = createHttpError(500, "Internal server error while creating manager")
            next(err)
        }
    }
}

const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    const _req = req as AuthRequest
    const { _id, email, isLogin } = _req
    try {
        console.log("req.body", req.body);

        const validateUser = changeUserPasswordSchema.parse(req.body)
        console.log("validateUser", validateUser);
        const { confirmPassword, password, oldPassword } = validateUser
        console.log("confirmPassword, password, oldPassword", confirmPassword, password, oldPassword);

        const user = await User.findById(_id).select("-refreshToken")
        // console.log("user", user);
        if (!user) {
            return next(createHttpError(404, 'Unauthorize request .No user Found'))
        }
        if (user) {
            if (!user.isLogin) {
                return next(createHttpError(401, "You are logout. Login it again!."))
            }

            const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

            if (!isPasswordCorrect) {
                return next(createHttpError(401, "Old password not correct"));
            }
            user.password = confirmPassword
            await user.save({ validateBeforeSave: false })
            res.status(201).json({ success: true, message: "Password change successfully" })
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return next(createHttpError(401, { message: { type: "Validation error", zodError: error.errors } }))
        }
        return next(createHttpError(500, 'Server error .unable to update  user password.'))
    }
}


const getAlluserWithLimt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const _req = req as AuthRequest
        const { _id, email, isLogin, isAccessTokenExp } = _req
        const { limit = 10, skip = 0 } = req.query
        const parsedLimit = parseInt(limit as string, 10) || 10
        const parsedSkip = parseInt(skip as string, 10) || 0
        const user = await User.findById(_id).select('-password -refreshToken')
        //  totalPages
        //  currentPage 
        //  nextPage
        //  prevPage

        if (!user) {
            next(createHttpError(401, "User is already exist with this email id"))
        }
        if (user) {
            if (!user.isLogin) {
                next(createHttpError(401, 'you are unauthorize for this request.Kindly login first'))
            }
            if (user.role === "user") {
                next(createHttpError(401, 'you are unauthorize for this request.'))
            }
            // const alluser = await User.find({ role: "user" }).select("-password -cardNumber -isLogin -refreshToken")
            const alluser = await User.find().select("-password -cardNumber -isLogin -refreshToken")
            const totalUsers = alluser.length
            const totalPages = Math.ceil(totalUsers / parsedLimit)

            const currentPage = Math.floor(parsedSkip / parsedLimit) + 1
            const nextPage = currentPage < totalPages ? currentPage + 1 : null
            const prevPage = currentPage > 1 ? currentPage - 1 : null
            /*
            number of users
            number of manager
            number of admin
            */
            let numberOfUser
            let last30Days
            if (alluser) {

                numberOfUser = alluser.reduce((acc, user) => {
                    if (user.role === "user") {
                        acc.totalUser += 1
                    } else if (user.role === "admin") {
                        acc.totalAdmin += 1
                    } else if (user.role === "manager") {
                        acc.totalManager += 1
                    }
                    return acc
                }, { totalUser: 0, totalAdmin: 0, totalManager: 0 })

                last30Days = alluser.reduce((acc, user) => {
                    if (user.role === "user") {
                        const today = new Date()
                        const thirtyDaysAgoDate = new Date()
                        thirtyDaysAgoDate.setDate(today.getDate() - 30)
                        // console.log(new Date(user.createdAt))
                        // console.log("new Date(user.createdAt)", new Date(user.createdAt).toLocaleString());
                        const date = new Date(user.createdAt)
                        if (date >= thirtyDaysAgoDate && date <= today) {
                            acc.usersAdded += 1
                        }
                    }
                    if (user.role === "manager") {
                        console.log("user.role === manager", user.role);

                        const today = new Date()
                        const thirtyDaysAgoDate = new Date()
                        thirtyDaysAgoDate.setDate(today.getDate() - 30)
                        const date = new Date(user.createdAt)
                        console.log("new Date(user.createdAt) manager", new Date(user.createdAt).toLocaleString());

                        if (date >= thirtyDaysAgoDate && date <= today) {
                            acc.managerAdded += 1
                        }
                    }
                    return acc
                }, { usersAdded: 0, managerAdded: 0 })
                console.log("last30Days :", last30Days);


            }
            const allUsers = await User.find().select('-password -cardNumber -isLogin -refreshToken').limit(parsedLimit).skip(parsedSkip)
            let newAccessToken
            if (isAccessTokenExp) {
                newAccessToken = user.generateAccessToken()
            }
            res.status(200).json({
                success: true,
                numberOfUser,
                lastThirtyDaysUserCount: last30Days,
                totalUser: numberOfUser?.totalUser,
                totalAdmin: numberOfUser?.totalAdmin,
                totalManager: numberOfUser?.totalManager,
                allUsers,
                totalUsers,
                totalPages,
                currentPage,
                nextPage,
                prevPage,
                limit: parsedLimit,
                skip: parsedSkip,
                isAccessTokenExp,
                accessToken: newAccessToken
            })
        }
    } catch (error) {
        next(createHttpError(500, 'unable to get all user info.'))
    }
}

const forcedLogout = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.body
    console.log(userId)
    if (!userId) {
        next(createHttpError(400, "User Id required!"))
    }
    try {
        const user = await User.findById(userId).select("-password")
        if (!user) {
            next(createHttpError(404, "User not found"))
        }
        if (user) {
            console.log(user)
            user.isLogin = false
            user.refreshToken = ""
            await user.save({ validateBeforeSave: false })
            res.status(201).json({ success: true, message: "User is successfully logout" })
        }
    } catch (error) {

        next(createHttpError(500, "Internal server error while logout user"))
    }
}

const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const _req = req as AuthRequest
        const { _id, isAccessTokenExp } = _req
        // zod validation
        const isValidUserDetails = userAddressSchema.parse(req.body)
        const { address, pinCode } = isValidUserDetails
        const user = await User.findById(_id).select("-password -refreshToken")
        if (!user) {
            return next(createHttpError(404, 'Unauthorize request .No user Found'))
        }
        if (!user.isLogin) {
            return next(createHttpError(401, "You are logout. Login it again!."))
        }
        user.address = address
        await user.save({ validateModifiedOnly: true })
        user.pinCode = pinCode
        await user.save({ validateModifiedOnly: true })
        let newAccessToken = ""
        if (isAccessTokenExp) {
            newAccessToken = user.generateAccessToken()
        }
        res.status(200).json({
            success: true,
            message: "Add user address successfully",
            user,
            isAccessTokenExp,
            accessToken: newAccessToken
        })

    } catch (error) {
        return next(createHttpError(500, 'Server error .unable to add user address.'))
    }
}

const updatePhoneNumber = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const _req = req as AuthRequest
        const { _id, isAccessTokenExp } = _req
        // zod validation
        const isValidUserDetails = userPhoneNumberSchema.parse(req.body)
        const { phoneNumber } = isValidUserDetails
        const user = await User.findById(_id).select("-password -refreshToken")
        if (!user) {
            return next(createHttpError(404, 'Unauthorize request .No user Found'))
        }
        if (!user.isLogin) {
            return next(createHttpError(401, "You are logout. Login it again!."))
        }
        user.phoneNumber = phoneNumber
        await user.save({ validateModifiedOnly: true })
        
        let newAccessToken = ""
        if (isAccessTokenExp) {
            newAccessToken = user.generateAccessToken()
        }
        res.status(200).json({
            success: true,
            message: "Added user phoneNumber successfully",
            user,
            isAccessTokenExp,
            accessToken: newAccessToken
        })

    } catch (error) {
        return next(createHttpError(500, 'Server error .unable to add user phoneNumber.'))
    }
}
export {
    createUser,
    loginUser,
    logoutUser,
    createAdmin,
    getAlluser,
    createManager,
    changePassword,
    getSingleuser,
    getAlluserWithLimt,
    forcedLogout,
    updateAddress,
    updatePhoneNumber
}