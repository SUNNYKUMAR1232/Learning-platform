import { User } from "../models/users.model";
import { Response } from "express";
import { redis } from "../utils/redis";


// get user by id
export const getUserById=async (id:string,res:Response) => {
    const user=await redis.get(id);
    if(user){
    const userObj=JSON.parse(user as string);
    res.status(200).json({
        success:true,
        user:userObj,
    });
  }
   
}