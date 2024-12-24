import jwt from 'jsonwebtoken'

import { v4 as uuidv4 } from 'uuid'
import { config } from '../config/config'




const userAccessToken =async (payload: object) => {
    console.log("userAccessToken")
    const token = await jwt.sign(
        payload,
        config.JWT_ACCESS_KEY as string,
        {
            algorithm: 'RS256',
            expiresIn: config.JWT_ACCESS_EXP,
            issuer: config.JWT_ISSUER as string,
            audience: config.JWT_AUDIENCE as string,
            jwtid: uuidv4()
        }
    )
}
const userRefreshToken = async(payload:object)=>{
    console.log("userRefreshToken")
    return await jwt.sign(
        payload,
        config.JWT_REFRESH_EXP as string,
        {
            algorithm: 'RS256',
            expiresIn: config.JWT_ACCESS_EXP,
            issuer: config.JWT_ISSUER as string,
            audience: config.JWT_AUDIENCE as string,
            jwtid: uuidv4()
        }
    )
}

export{
    userAccessToken,
    userRefreshToken
}