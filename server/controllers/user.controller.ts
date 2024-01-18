require("dotenv").config();

import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandlers";
import { User, IUser } from "../models/users.model";
import { CatchAsyncErrors } from "../middleware/catchASyncErrors";
import Jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/SendMail";
import {
  RefreshTokenOptions,
  accessTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import { getUserById } from "../services/user.service";
import cloudinary from "cloudinary";
//Register user
interface IRegisterUser {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registerationUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password }: IRegisterUser = req.body;
      const isEmailExit = await User.findOne({ email });
      if (isEmailExit) {
        return next(new ErrorHandler(400, "Email already exist"));
      }
      const user: IRegisterUser = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;
      const data = {
        user: {
          name: user.name,
          code: activationCode,
        },
      };
      const html = ejs.renderFile(
        path.join(__dirname, "../views/templates/activation_mail.ejs"),
        { data: data }
      );
      try {
        await sendMail({
          email: user.email,
          subject: "Account Activation",
          template: "activation_mail",
          data: data, // Add the required 'key' property
        });
        res.status(200).json({
          success: true,
          message: `Email sent to ${user.email} successfully`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(400, error.message));
      }
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

//Activation Token
export const createActivationToken = (user: any) => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const token = Jwt.sign(
    { user, activationCode },
    process.env.JWT_SECRET_KEY as Secret,
    {
      expiresIn: "5m",
    }
  );
  return { activationCode, token };
};

// activate user
interface IActivateRequest {
  activation_token: string;
  activation_code: string;
}

export const ActivateUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      //body input
      const { activation_token, activation_code } =
        req.body as IActivateRequest;
      //varification and decode
      const newUser: { user: IUser; activationCode: string } = Jwt.verify(
        activation_token,
        process.env.JWT_SECRET_KEY as Secret
      ) as { user: IUser; activationCode: string };
      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler(400, "Invalid activation code"));
      }
      //decoded user
      const { name, email, password } = newUser.user;
      // verify existence
      const existUser = await User.findOne({ email });
      if (existUser) {
        return next(new ErrorHandler(400, "Email already exist"));
      }
      // all okay than create new user
      const user = await User.create({
        name,
        email,
        password,
      });
      // account created
      res.status(200).json({
        success: true,
        message: "Account activated successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

//Login user
interface ILoginUser {
  email: string;
  password: string;
}
export const loginUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password }: ILoginUser = req.body;
      //check email and password
      if (!email || !password) {
        return next(new ErrorHandler(400, "Please enter email & password"));
      }
      //Find user in database
      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        return next(new ErrorHandler(400, "Invalid email or password"));
      }
      //Check password is correct or not
      const isPasswordMatched = await user.comparePassword(password);
      if (!isPasswordMatched) {
        return next(new ErrorHandler(400, "Invalid email or password"));
      }
      //send token
      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

//logout

export const logoutUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("accessToken", " ", { maxAge: 1 });
      res.cookie("refreshToken", " ", { maxAge: 1 });
      const userId = req.user?._id || " ";
      redis.del(userId);
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

// update access token
export const updateAccessToken = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // get refresh token from cookies
      const refreshToken = req.cookies.refreshToken as string;
      // check if refresh token is valid
      if (!refreshToken) {
        return next(
          new ErrorHandler(401, "Login first to access this resource")
        );
      }

      // verify refresh token
      const decoded = Jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;
      const message = "Could not verify refresh token";
      // check if decoded is valid
      if (!decoded) {
        return next(new ErrorHandler(401, message));
      }
      // get user from redis
      const session = await redis.get(decoded.id);
      // check if session is valid
      if (!session) {
        return next(new ErrorHandler(401, message));
      }
      // get user from session
      const user = JSON.parse(session);
      // create new access token
      const accessToken = Jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        { expiresIn: "1m" }
      );
      const refreshTokens = Jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        { expiresIn: "3d" }
      );

      req.user = user;
      // set cookies
      res.cookie("accessToken", accessToken, accessTokenOptions);
      res.cookie("refreshToken", refreshTokens, RefreshTokenOptions);

      // send response
      res.status(200).json({
        success: true,
        accessToken,
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);
// get user info
export const getUserInfo = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      getUserById(userId as string, res);
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

interface IAuthSocial {
  name: string;
  email: string;
  avatar: string;
}

// social auth
export const socialAuth = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, avatar } = req.body as IAuthSocial;
      const user = await User.findOne({ email });
      // check if user exist
      if (!user) {
        // create new user
        const newUser = await User.create({
          name,
          email,
          avatar,
        });
        // send token
        sendToken(newUser, 200, res);
      } else {
        // send token
        sendToken(user, 200, res);
      }
    } catch (error: any) {}
  }
);

// update user info
interface IUpdateUserInfo {
  name: string;
  email: string;
  avatar: {
    public_id: string;
    url: string;
  };
}

export const updateUserInfo = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      const { name, email, avatar } = req.body as IUpdateUserInfo;
      const user = await User.findOne({ _id: userId });
      if (email && user) {
        const isEmailExit = await User.findOne({ email });
        if (isEmailExit) {
          return next(new ErrorHandler(400, "Email already exist"));
        }
        user.email = email;
      }
      if (name && user) {
        user.name = name;
      }
      if (avatar && user) {
        user.avatar = avatar;
      }
      await user?.save();
      // update redis
      await redis.set(userId, JSON.stringify(user));

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

// upate password

interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;
      const userId = req.user._id;
      const user = await User.findOne({ _id: userId }).select("+password");
      console.log(userId, "/n", user, "/n", oldPassword, "/n", newPassword);
      if (!oldPassword && !newPassword) {
        return next(
          new ErrorHandler(400, "Please enter oldPassowrd and newPassword")
        );
      }
      if (user?.password === undefined) {
        return next(new ErrorHandler(400, "Invalid user"));
      }

      const isPasswordMatched = await user?.comparePassword(oldPassword);
      if (!isPasswordMatched) {
        return next(new ErrorHandler(400, "Invalid old password"));
      }
      user.password = newPassword;
      await user.save();

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

// update profile avatar
interface IUpdateAvatar {
  avatar: String;
}

export const updateAvatar = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body as IUpdateAvatar;
      const userId = req.user?._id;
      const user = await User.findOne({ _id: userId });
      if (!avatar) {
        return next(new ErrorHandler(400, "Please enter  avatar "));
      }
      if (avatar && user) {
        if (user?.avatar?.public_id) {
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
          const myCloud = await cloudinary.v2.uploader.upload(
            avatar as string,
            {
              folder: "avatar",
              width: 150,
            }
          );
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        } else {
          const myCloud = await cloudinary.v2.uploader.upload(
            avatar as string,
            {
              folder: "avatar",
              width: 150,
            }
          );
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        }
      }
      await user?.save();

      await redis.set(userId, JSON.stringify(user));

      res.status(200).json({
        success: true,
        message: "upadate user avatar or upload avator",
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);
