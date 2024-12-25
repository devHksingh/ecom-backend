import { Request, Response, NextFunction } from 'express'
import path from 'node:path'
import cloudinary from '../config/cloudinary'


const createProduct = async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.files)
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    const fileName = files.prductImage[0].filename
    const filePath = path.resolve(
        __dirname,
        "../../public/data/uploads",
        fileName
    )
    try {
        const uploadResult = await cloudinary.uploader.upload(filePath, {
            filename_override: fileName,
            folder: "products-image"
        })
        if (uploadResult) {
            console.log(uploadResult["public_id"]);

            const public_id = uploadResult["public_id"]
            // Optimize delivery by resizing and applying auto-format and auto-quality
            const optimizeUrl =  cloudinary.url(public_id, {transformation:[
                {
                    width:"auto",
                    crop:"fill",
                    gravity:"auto"
                },{
                    dpr:"auto",
                    fetch_format: 'auto',
                    quality: 'auto',
                }
            ]})
            // console.log( optimizeUrl);


        }
        res.status(200).json({ success: true })
    } catch (error) {

    }

}


export { createProduct }