import express, { Request, Response, NextFunction } from 'express';
export const app = express();  
import cors from 'cors';
import cookieParser from 'cookie-parser';
require('dotenv').config();
import {ErrorMiddleware} from './middleware/error';
//routes
import userRouter from './routes/user.route';
import courseRouter from './routes/course.route';
// body-parser
app.use(express.json({limit: '50mb'}));
// cookie-parser
app.use(cookieParser());
// cors cross-origin-resource-sharing
app.use(cors({
    origin: process.env.ORIGIN || 'http://localhost:5000',
    credentials: true
}));
//test api
app.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        message: 'Hello from server',
        success: true
    });
});
// routes
app.use('/api/v1', userRouter);

app.use('/api/v1', courseRouter);

app.all('*', (req: Request, res: Response, next: NextFunction) => {
    const err= new Error(`Can't find ${req.originalUrl} on this server`);
    next(err);
        });

// Error Middleware
app.use(ErrorMiddleware);
