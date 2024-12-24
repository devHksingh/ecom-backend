import mongoose from "mongoose";
import { Users } from "./userTypes";
import bcrypt from "bcryptjs";


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
        select: false
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
        maxlength: 10
    },
    purchasedIteams: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        }
    ]
}, { timestamps: true })

// Encrypt password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next()
    }
    this.password = await bcrypt.hash(this.password, 11)
})

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword:string) {
    return await bcrypt.compare(enteredPassword, this.password)
}

export const User = mongoose.model('User', userSchema)