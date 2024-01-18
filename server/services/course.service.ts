import { Request,Response,NextFunction } from "express";
import { CatchAsyncErrors } from "../middleware/catchASyncErrors";
import  ErrorHandler  from "../utils/ErrorHandlers";
import CourseModel from "../models/course.model";

// create course

export const createCourse= CatchAsyncErrors(async(data:any,res:Response,next:NextFunction)=>{
    try {
        const course=await CourseModel.create(data);
        res.status(200).json({
            success:true,
            course
        })
    } catch (error: any) {
        next(new ErrorHandler(500,error.message));
    }
})