import { Request,Response,NextFunction } from "express";
import { CatchAsyncErrors } from "./catchASyncErrors";
import  Jwt, { JwtPayload }  from "jsonwebtoken";
import  ErrorHandler from "../utils/ErrorHandlers";
import { redis } from "../utils/redis";
import { RefreshTokenOptions, accessTokenOptions } from "../utils/jwt";

export const isAuthenticated= CatchAsyncErrors(async(req:Request,res:Response,next:NextFunction)=>{
    // get access token from cookies
    const accessToken=req.cookies.accessToken as string;
    // check if access token is valid
    if(!accessToken){
        return next(new ErrorHandler(401,'Login first to access this resource'));
    }
    // verify access token
    const decoded= Jwt.verify(accessToken,process.env.ACCESS_TOKEN as string) as JwtPayload;
    // check if decoded is valid
    if(!decoded){
        return next(new ErrorHandler(401,'Access token not valid'));
    }
    const user=await redis.get(decoded.id);
    if(!user){
        return next(new ErrorHandler(401,'User not found'));
    }
    // set user to req.user
    req.user=JSON.parse(user);
    next();
});

// validate user role
export const authorizeRoles=(...roles:string[])=>{
    return (req:Request,res:Response,next:NextFunction)=>{
        if(!roles.includes(req.user?.role||" ")){
            return next(new ErrorHandler(403,`Role (${req.user?.role}) is not allowed to access this resource`));
        }
        next();
    }
}


//get user info
