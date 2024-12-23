import express, { Request, Response, NextFunction } from 'express'
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from 'express-mongo-sanitize'
import hpp from "hpp";
import cors from "cors";
import { config } from './config/config';
import globalErrorHandler from './middlewares/globalErrorHandler';


const app = express()

app.use(
    cors({
        origin: config.frontendDomain
    })
)

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true }))

// handeling global rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
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

// Global error handler
app.use(globalErrorHandler);

export default app