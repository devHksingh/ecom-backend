import mongoose from "mongoose";
import { Users } from "./userTypes";
import bcrypt from "bcryptjs";
import { userAccessToken, userRefreshToken } from "../utils/genrateJwtToken";


const userSchema = new mongoose.Schema<Users>({
    name: {
        type: String,
        required: [true, "Name is required"],
        maxlength: [24, "Name cannot exceed 24 characters"],
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters"],
        // select: false
    },
    role: {
        type: String,
        enum: {
            values: ["admin", "manager", "user"],
            message: "Please select a valid role",
        },
        default: "user"
    },
    phoneNumber: {
        type: String,
        trim: true,
        default: "8888888888",
        maxlength: 10
    },
    // purchasedIteams: [
    //     {
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: "Product"
    //     }
    // ],
    refreshToken: {
        type: String
    },
    isLogin: {
        type: Boolean,
        default: false
    },
    address: {
        type: String,
        default: "DUMMY ADDRESS",
        maxlength: 400,
        trim: true
    },
    pinCode: {
        type: String,
        default: "361365",
        maxlength: 6
    },
    cardNumber: {
        type: String,
        default: 4242424242424242,
        maxlength: 16
    }
}, { timestamps: true })

// Encrypt password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next()
    }
    this.password = await bcrypt.hash(this.password, 10)
})

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password)
}

userSchema.methods.generateAccessToken = function () {
    const token = userAccessToken({
        _id: this._id,
        email: this.email,
        isLogin: true
    })
    return `Bearer ${token}`
}

userSchema.methods.generateRefreshToken = function () {
    const token = userRefreshToken({
        _id: this._id,
        email: this.email,
        isLogin: true
    })
    return `Bearer ${token}`
}

userSchema.methods.isPasswordCorrect = async function (password: string) {
    const result = await bcrypt.compare(password, this.password)
    return result
}

export const User = mongoose.model('User', userSchema)