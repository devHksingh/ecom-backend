import express, { Request, Response, NextFunction } from 'express'
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from 'express-mongo-sanitize'
import hpp from "hpp";
import cors from "cors";
import { config } from './config/config';
import globalErrorHandler from './middlewares/globalErrorHandler';
import userRouter from './user/userRouter';
import productRouter from './product/productRouter';
import orderRouter from './order/orderRouter';
import wishListRouter from './wishList/wishListRoute';
import cartRouter from './cart/cartRouter';


const app = express()
// const allowedOrigins: string[] = 
//   typeof config.frontendDomain === 'string' 
//     ? [config.frontendDomain] 
//     : Array.isArray(config.frontendDomain) 
//       ? config.frontendDomain 
//       : []; 
const allowedOrigins = [config.clientDomain, config.dashboardDomain];


const corsOptions = {
    origin: function (origin:any,callback:any) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
};

app.use(cors(corsOptions));

// app.use(
//     cors({
//         origin: config.frontendDomain,
//         credentials: true
//     })
// )

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true }))

// handeling global rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    // TODO: CHANGE TO 120 request in production
    limit: 400, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    message: "Too many request from this IP ,please try later",
});

// security middleware
app.use(helmet());
app.use("/api", limiter);
app.use(mongoSanitize());
app.use(hpp())

// Routes url
app.get('/', (req, res, next) => {
    res.status(200).json({
        success: true,
        message: "Welcome to ecom app"
    })
})

app.use('/api/v1/users', userRouter)
app.use('/api/v1/products', productRouter)
app.use('/api/v1/orders', orderRouter)
app.use('/api/v1/wishList', wishListRouter)
app.use('/api/v1/cart', cartRouter)

// Global error handler
app.use(globalErrorHandler);

export default app