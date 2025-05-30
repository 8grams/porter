import nodemailer from "nodemailer";
import { env } from "./env.js";
import hbs from "nodemailer-express-handlebars";
import path from "path";

export const sendMail = async (from, to, subject, templateName, context = {}) => {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  transporter.use(
    'compile',
    hbs({
      viewEngine: {
        extname: '.handlebars',
        partialsDir: path.resolve('./src/emails/templates/partials'),
        layoutsDir: path.resolve('./src/emails/templates'),
        defaultLayout: 'layout',
      },
      viewPath: path.resolve('./src/emails/templates'),
      extName: '.handlebars',
    })
  );

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      template: templateName,
      context,
    });
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
