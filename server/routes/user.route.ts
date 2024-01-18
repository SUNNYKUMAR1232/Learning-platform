import { ActivateUser, getUserInfo, loginUser, logoutUser, registerationUser, socialAuth, updateAccessToken, updateAvatar, updatePassword, updateUserInfo } from "../controllers/user.controller";
import { Router } from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";


const userRouter = Router();
userRouter.post("/registration", registerationUser);

userRouter.post('/activate_user',ActivateUser);

userRouter.post('/login_user',loginUser);

userRouter.post('/logout_user',isAuthenticated ,logoutUser);

userRouter.get('/refresh_token',updateAccessToken);  

userRouter.get('/me',isAuthenticated,getUserInfo);

userRouter.post('/social_auth',socialAuth);

userRouter.post('/update_user_info',isAuthenticated,updateUserInfo);

userRouter.post('/update_user_password',isAuthenticated,updatePassword);

userRouter.post('/update_user_avatar',isAuthenticated,updateAvatar);


export default userRouter;

