import nodemailer from "nodemailer";
import { env } from "./env.js";

export const sendMail = async (from, to, subject, html) => {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
