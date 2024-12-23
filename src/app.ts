import express, { Request, Response, NextFunction } from 'express'


const app = express()

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true }))

// Routes url
app.get('/', (req, res, next) => {
    res.status(200).json({
        success: true,
        message: "Welcome to ecom app"
    })
})


export default app