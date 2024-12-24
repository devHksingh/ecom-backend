import jwt from 'jsonwebtoken'

import { v4 as uuidv4 } from 'uuid'
import { config } from '../config/config'




const userAccessToken =  (payload: object) => {
    console.log("userAccessToken")
    const token =  jwt.sign(
        payload,
        config.JWT_ACCESS_KEY as string,
        {
            algorithm: 'HS256',
            expiresIn: config.JWT_ACCESS_EXP,
            issuer: config.JWT_ISSUER as string,
            audience: config.JWT_AUDIENCE as string,
            jwtid: uuidv4()
        }
    )
    // console.log(token);
    return token
    
}
const userRefreshToken =  (payload: any) => {
    console.log("userRefreshToken")
    const token = jwt.sign(
        {payload},
        config.JWT_REFRESH_KEY as string,
        {
            algorithm: 'HS256',
            expiresIn: config.JWT_REFRESH_EXP,
            issuer: config.JWT_ISSUER as string,
            audience: config.JWT_AUDIENCE as string,
            jwtid: uuidv4()
        }

    )
    // console.log(token);
    
    return token
}

export {
    userAccessToken,
    userRefreshToken
}