import express, { Request, Response, NextFunction } from 'express'
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from 'express-mongo-sanitize'
import hpp from "hpp";

const app = express()

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


export default app