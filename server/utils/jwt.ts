require('dotenv').config()
import {Request,Response,NextFunction} from 'express'
import { redis } from './redis'
import { IUser } from '../models/users.model'

interface ITokenOtions{
    expiresIn:string;
    maxAge:number;
    httpOnly:boolean;
    sameSite:'none'|'strict'|'lax'|undefined;
    secure?:boolean;
}
// parse environment variable to integrate with fsallback values
const accessTokenExpiresIn=parseInt(process.env.ACCESS_TOKEN_EXPIRE||'300',10);
const refreshTokenExpiresIn=parseInt(process.env.REFRESH_TOKEN_EXPIRE||'1200',10);
// set token options
 export const accessTokenOptions:ITokenOtions={
    expiresIn:new Date(Date.now()+accessTokenExpiresIn*60*1000).toLocaleString(),
    maxAge:accessTokenExpiresIn*60*1000,
    httpOnly:true,
    sameSite:'lax',
};
export const RefreshTokenOptions:ITokenOtions={
    expiresIn:new Date(Date.now()+refreshTokenExpiresIn*24*60*60*1000).toLocaleString(),
    maxAge:refreshTokenExpiresIn*24*60*60*1000,
    httpOnly:true,
    sameSite:'lax',
};
export const sendToken=(user:IUser,statusCode:number,res:Response)=>{
    const accessToken=user.SignAccessToken();
    const refreshToken=user.SignRefreshToken();
    // upload  session to redis
    redis.set(user._id.toString(),JSON.stringify(user) as any);
    
    //  only set secure ti true if the environment is production
    if(process.env.NODE_ENV==='production'){
        accessTokenOptions.secure=true;
    }
    // set cookies
    res.cookie('accessToken',accessToken,accessTokenOptions);
    res.cookie('refreshToken',refreshToken,RefreshTokenOptions);
    // send response
    res.status(statusCode).json({
        success:true,
        user,
        accessToken,
    });
}