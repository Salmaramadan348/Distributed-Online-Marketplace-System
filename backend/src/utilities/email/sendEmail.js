import nodemailer from "nodemailer"
import { emailTemplate } from "./emailTemplete.js";
   

// Create a test account or replace with real credentials.
const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: "salmaramadan348@gmail.com",
    pass: "ybhb qiec fqjg fiwr", 
  },
  tls:{
     rejectUnauthorized:false
  }
});

// Wrap in an async IIFE so we can use await.
export const sendMail = async (email) => {

  const info = await transporter.sendMail({
    from: '"myProject" <salmaramadan348@gmail.com>',

    to: email,

    subject: "Hello ",
    text: "Hello myproject", 
    html: emailTemplate(email), 
  });

  console.log("Message sent:", info.messageId);
}
