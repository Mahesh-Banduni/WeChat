import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config(); // Load .env file

const transporter = nodemailer.createTransport({
  host:process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user:process.env.SMTP_USER,
    pass:process.env.SMTP_PASS,
  },
})

//console.log(process.env.SMTP_HOST, process.env.SMTP_PORT, process.env.SMTP_USER, process.env.SMTP_PASS, process.env.SMTP_FROM);

export const sendOnboardingEmailforUser = async (email) => {
  const mailOptions = {
    from: `"WeChat" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: 'Welcome to WeChat - User Onboarding',
    text: `
Welcome to WeChat!

We’re thrilled to welcome you aboard as one of our valued user.

For support or questions, feel free to contact us.

Best regards,
WeChat Team
    `.trim(),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to WeChat!</h2>
        <p>We’re thrilled to welcome you aboard as one of our valued user.</p>

        <p>For support or questions, feel free to contact us.<br/>

        <p>Best regards,<br/>
        WeChat Team</p>
      </div>
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Onboarding email sent to user.' };
  } catch (error) {
    console.warn('Error sending onboarding email to user:', error);
    return { success: false, message: 'Failed to send onboarding email to user.' };
  }
};

