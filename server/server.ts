import {app} from './app';
require('dotenv').config();
import {connectDB} from './utils/db';
import {v2 as cloudinary} from 'cloudinary';

// cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});
//create a server object:
app.listen(process.env.PORT||4000, () => {
  console.log(`Server is running on port ${process.env.PORT||5000}`);
  connectDB();
});