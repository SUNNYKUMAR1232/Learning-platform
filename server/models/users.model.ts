require("dotenv").config();
import mongoose,{Document,Model,Schema} from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

//Email regex
const emailRegex:RegExp = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
//User interface
export interface IUser extends Document{
    name:string;
    email:string;
    password:string;
    avatar:{
        public_id:string;
        url:string;
    };
    role:string;
    isVerified:boolean;
    courses:Array<{courseId:string}>;
    comparePassword(password:string):Promise<boolean>;
    resetPasswordToken:string;
    resetPasswordExpire:Date;
    SignAccessToken:()=>string;
    SignRefreshToken:()=>string;
}
//User schema
const userSchema:Schema<IUser> = new mongoose.Schema({
    name:{
        type:String,
        required:[true,"Please enter your name"],
        maxLength:[30,"Your name cannot exceed 30 characters"]
    },
    email:{
        type:String,
        required:[true,"Please enter your email"],
        unique:true,
        validate:{
            validator:function (value:string) {return emailRegex.test(value)},
            message:"Please enter valid email address"
            
        }
    },
    password:{
        type:String,
        minlength:[6,"Your password must be longer than 6 characters"],
        select:false
    },
    avatar:{
        public_id:{
            type:String,
        },
        url:{
            type:String,
        }
    },
    role:{
        type:String,
        default:"user"
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    courses:[
        {
            courseId:{
                type:String,
                required:false
            }
        }
    ],
    resetPasswordToken:String,
    resetPasswordExpire:Date



},{timestamps:true});


//Hashing password before saving user
userSchema.pre<IUser>("save",async function(next){
    if(!this.isModified("password")){
        next();
    }
    this.password = await bcrypt.hash(this.password,10);
    next();
});


//Compare user password
userSchema.methods.comparePassword = async function(password:string):Promise<boolean>{
    return await bcrypt.compare(password,this.password);
};
// Sign Access token
userSchema.methods.SignAccessToken = function(){
    return jwt.sign({id:this._id},process.env.ACCESS_TOKEN!);
};
//Sign Refresh token
userSchema.methods.SignRefreshToken = function(){
    return jwt.sign({id:this._id},process.env.REFRESH_TOKEN!);
};

//Export user model
export const User:Model<IUser> = mongoose.model("User",userSchema);