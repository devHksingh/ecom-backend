import mongoose from "mongoose";
import {  Users } from "./userTypes";


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
    role:{
        type:String,
        enum:{
            values:["admin","manager","user"],
            message:"Please select a valid role",
        },
        default:"user"
    },
    phoneNumber:{
        type:String,
        trim:true,
        maxlength:10
    },
    purchasedIteams:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Product"
        }
    ]
}, { timestamps: true })


export const User = mongoose.model('User',userSchema)