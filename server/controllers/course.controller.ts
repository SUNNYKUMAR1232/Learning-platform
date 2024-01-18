import { Request, Response, NextFunction } from "express";
import { CatchAsyncErrors } from "../middleware/catchASyncErrors";
import ErrorHandler from "../utils/ErrorHandlers";
import Cloudinary from "cloudinary";
import { createCourse } from "../services/course.service";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/SendMail";

// upload course
export const uploadCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const myCloud = await Cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
      createCourse(data, res, next);
    } catch (error: any) {
      next(new ErrorHandler(500, error.message));
    }
  }
);

// edit course

export const editCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        await Cloudinary.v2.uploader.destroy(data.thumbnail.public_id);
        const myCloud = await Cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
      const courseId = req.params.id;
      const course = await CourseModel.findByIdAndUpdate(
        courseId,
        { $set: data },
        {
          new: true,
          runValidators: true,
          useFindAndModify: false,
        }
      );
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      next(new ErrorHandler(500, error.message));
    }
  }
);

// for not purchesed courses
// get single course

export const getSingleCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const isCacheExist = await redis.get(courseId);

      if (isCacheExist) {
        const course = JSON.parse(isCacheExist);
        return res.status(200).json({
          success: true,
          course,
        });
      } else {
        // select specific fields
        const course = await CourseModel.findById(courseId).select(
          "-courseData.videoUrl -courseData.suggetons -courseData.questions -courseData.links"
        );
        // set cache
        await redis.set(courseId, JSON.stringify(course) as any);
        res.status(200).json({
          success: true,
          course,
        });
      }
    } catch (error: any) {
      next(new ErrorHandler(500, error.message));
    }
  }
);

// get all courses
export const getAllCourses = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCacheExist = await redis.get("AllCourses");
      if (isCacheExist) {
        const courses = JSON.parse(isCacheExist);
        return res.status(200).json({
          success: true,
          courses,
        });
      } else {
        const courses = await CourseModel.find().select(
          "-courseData.videoUrl -courseData.suggetons -courseData.questions -courseData.links"
        );
        await redis.set("AllCourses", JSON.stringify(courses) as any);
        res.status(200).json({
          success: true,
          courses,
        });
      }
    } catch (error: any) {
      next(new ErrorHandler(500, error.message));
    }
  }
);

export const getCourseByUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // if user has not purchased any course
      const userCourseList = req.user?.courses;
      //
      const courseId = req.params.id;
      const isExist = userCourseList?.find(
        (course: any) => course._id.toString() === courseId
      );
      if (!isExist) {
        return next(
          new ErrorHandler(404, "user not eligible to access this course")
        );
      }
      const course = await CourseModel.findById(courseId);
      const content = course?.courseData;
      res.status(200).json({
        success: true,
        content,
      });
    } catch (error: any) {
      next(new ErrorHandler(500, error.message));
    }
  }
);

// add quetions in course
interface IQuestion {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, courseId, contentId } = req.body as IQuestion;
      const course = await CourseModel.findById(courseId);

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler(400, "invalid content id"));
      }
      const content = course?.courseData.find((content: any) =>
        content._id.equals(contentId)
      );
      if (!content) {
        return next(new ErrorHandler(404, "content not found"));
      }
      // create new question object
      const newQuestion: any = {
        user: req.user,
        question,
        questionReply: [],
      };
      // add question in content
      content.questions.push(newQuestion);
      // save course
      await course?.save();
      res.status(200).json({
        success: true,
        message: "question added successfully",
        course,
      });
    } catch (error: any) {
      next(new ErrorHandler(500, error.message));
    }
  }
);

//add answer in question
interface IAnswer {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

 export const addAnswer = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, courseId, contentId, questionId } = req.body as IAnswer;
      const course = await CourseModel.findById(courseId);
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler(400, "invalid content id"));
      }
      const content = course?.courseData.find((content: any) =>
        content._id.equals(contentId)
      );
      if (!content) {
        return next(new ErrorHandler(404, "content not found"));
      }
      const question = content.questions.find((question: any) =>
        question._id.equals(questionId)
      );
      if (!question) {
        return next(new ErrorHandler(404, "question not found"));
      }
      // create new answer object
      const newAnswer: any = {
        user: req.user,
        answer,
      };
      // add answer in question
      question.questionReplies.push(newAnswer);
      // save course
      await course?.save();
      if (req.user._id === question.user._id) {
        // create notification
      } else {
        // send email
        const data = {
          name: question.user.name,
          title: content.title,
        };
        const html = await ejs.renderFile(
          path.join(__dirname, "../views/emailTemplate.ejs"),
          data
        );
        // send email
        try {
          await sendMail({
            email: question.user.email,
            subject: "Question Answered",
            template: "emailTemplate",
            data,
          });
        } catch (error: any) {
          next(new ErrorHandler(500, error.message));
        }
      }
      res.status(200).json({
        success: true,
        message: "answer added successfully",
        course,
      });
    } catch (error: any) {
      next(new ErrorHandler(500, error.message));
    }
  }
);
