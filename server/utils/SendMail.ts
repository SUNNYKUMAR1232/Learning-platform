require('dotenv').config();
import nodemailer,{Transporter} from 'nodemailer';
import ejs from 'ejs';
import path from 'path';

interface IMailOptions{
    email:string;
    subject:string;
    template:string;
    data:any;
}
const sendMail = async(options:IMailOptions):Promise<void>=>{
    const transporter:Transporter = nodemailer.createTransport({
        host:process.env.SMTP_HOST,
        port:parseInt(process.env.SMTP_PORT||"587"),
        service:process.env.SMTP_SERVICE,
        auth:{
            user:process.env.SMTP_EMAIL,
            pass:process.env.SMTP_PASSWORD
        }
    });
    const {email,subject,template,data} = options;
    // GET HTML TEMPLATE
    const templatePath = path.join(__dirname,`../views/templates/${template}.ejs`);
    // RENDER HTML TEMPLATE
    const html:string = await ejs.renderFile(templatePath,{data:data});
    // SEND EMAIL
    const mailOptions = {
        from:process.env.SMTP_FROM_EMAIL,
        to:email,
        subject,
        html
    }
    await transporter.sendMail(mailOptions);

}
export default sendMail;