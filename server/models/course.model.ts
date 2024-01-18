import mongoose ,{Document,Model,Schema} from "mongoose";
import { IUser } from "./users.model";

interface IComment extends Document{
    user:IUser,
    question:string;
    questionReplies:IComment[];
}

interface IReview extends Document{
    user:object,
    rating:number;
    comment:string,
    commentReplies:IComment[];
}

interface ILink extends Document{
    title:string,
    url:string
}

interface ICourseData extends Document{
    title:string,
    description:string,
    videoUrl:string,
    videoThumbnail:object,
    videoSection:string,
    videoLength:number,
    videoPlayer:string,
    links:ILink[],
    suggetion:string,
    questions:IComment[],
}

interface ICourse extends Document{
    name:string,
    description:string,
    price:number,
    estimatedPrice?:number,
    thumbnail:object,
    tags:string,
    level:string,
    demoUrl:string,
    benefits: {title:string}[],
    prerequisite: {title:string}[],
    reviews:IReview[],
    courseData:ICourseData[],
    ratings?:number,
    purchased?:number
}

const reviewSchema= new Schema<IReview>({
    user:Object,
    rating:{
        type:Number,
        default:0
    },
    comment:String,
})

const commentSchema= new Schema<IComment>({
    user:Object,
    question:String,
    questionReplies:[Object]
})


const linkSchema= new Schema<ILink>({
    title:String,
    url:String
})

const courseDataSchema= new Schema<ICourseData>({
    title:String,
    description:String,
    videoUrl:String,
    videoSection:String,
    videoLength:Number,
    videoPlayer:String,
    links:[linkSchema],
    suggetion:String,
    questions:[commentSchema],
})

const courseSchema= new Schema<ICourse>({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    estimatedPrice:Number,
    thumbnail:{
        public_id:{
            type:String,
        },
        url:{
            type:String,
        }
    },
    tags:{
        type:String,
        required:true
    },
    level:{
        type:String,
        required:true
    },
    demoUrl:{
        type:String,
        required:true
    },
    benefits:[{title:String}],
    prerequisite:[{title:String}],
    reviews:[reviewSchema],
    courseData:[courseDataSchema],
    ratings:{
        type:Number,
        default:0
    },
    purchased:{
        type:Number,
        default:0
    },
})

const CourseModel:Model<ICourse>= mongoose.model("Course",courseSchema);
export default CourseModel;