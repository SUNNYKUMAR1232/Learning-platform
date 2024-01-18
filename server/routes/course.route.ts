import { Router } from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { addAnswer, addQuestion, editCourse, getAllCourses, getCourseByUser, getSingleCourse, uploadCourse } from "../controllers/course.controller";
const courseRouter = Router();

courseRouter.post(
  "/create_course",
  isAuthenticated,
  authorizeRoles("admin"),
  uploadCourse
);
courseRouter.post(
  "/edit_course/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  editCourse
);
courseRouter.get(
  "/get_course/:id",
  getSingleCourse
);
courseRouter.get(
  "/get_all_courses",
  getAllCourses
);
courseRouter.post(
  "/set_user_course/:id", // here id is course id
  isAuthenticated,
  getCourseByUser
);
courseRouter.put(
  "/add_question",
  isAuthenticated,
  addQuestion
);
courseRouter.post(
  "/add_answer",
  isAuthenticated,
  addAnswer
);

export default courseRouter;
