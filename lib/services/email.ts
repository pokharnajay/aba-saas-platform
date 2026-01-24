import nodemailer from 'nodemailer'

/**
 * Email Service for ABA SaaS Platform
 * Handles password reset emails, staff welcome emails, and other transactional emails
 */

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVER || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
})

// Verify connection on startup (only in development)
if (process.env.NODE_ENV === 'development') {
  transporter.verify((error) => {
    if (error) {
      console.error('Email server connection failed:', error)
    } else {
      console.log('Email server is ready to send messages')
    }
  })
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send an email
 */
async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const mailOptions = {
      from: `"ABA Practice Manager" <${process.env.MAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    }

    await transporter.sendMail(mailOptions)
    console.log(`Email sent successfully to ${options.to}`)
    return { success: true }
  } catch (error: any) {
    console.error('Failed to send email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  const subject = 'Reset Your Password - ABA Practice Manager'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0; font-size: 24px;">ABA Practice Manager</h1>
    </div>

    <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset Request</h2>

    <p style="margin-bottom: 15px;">Hello${userName ? ` ${userName}` : ''},</p>

    <p style="margin-bottom: 15px;">We received a request to reset your password. Click the button below to create a new password:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
    </div>

    <p style="margin-bottom: 15px; color: #6b7280; font-size: 14px;">This link will expire in <strong>1 hour</strong> for security reasons.</p>

    <p style="margin-bottom: 15px; color: #6b7280; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 10px;">If the button doesn't work, copy and paste this URL into your browser:</p>
    <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${resetUrl}</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      This is an automated message from ABA Practice Manager.<br>
      Please do not reply to this email.
    </p>
  </div>
</body>
</html>
`

  const text = `
Password Reset Request

Hello${userName ? ` ${userName}` : ''},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.

---
This is an automated message from ABA Practice Manager.
Please do not reply to this email.
`

  return sendEmail({ to: email, subject, html, text })
}

/**
 * Send welcome email with login credentials to new staff member
 */
export async function sendStaffWelcomeEmail(
  email: string,
  firstName: string,
  lastName: string,
  temporaryPassword: string,
  organizationName: string,
  loginUrl: string,
  roleName: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Welcome to ${organizationName} - Your Account Has Been Created`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${organizationName}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0; font-size: 24px;">${organizationName}</h1>
    </div>

    <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome to the Team!</h2>

    <p style="margin-bottom: 15px;">Hello ${firstName} ${lastName},</p>

    <p style="margin-bottom: 15px;">Your account has been created for <strong>${organizationName}</strong>. You have been assigned the role of <strong>${roleName}</strong>.</p>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">Your Login Credentials</h3>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Temporary Password:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #1f2937; font-family: monospace; background-color: #fef3c7; padding: 4px 8px; border-radius: 4px;">${temporaryPassword}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; color: #991b1b; font-size: 14px;">
        <strong>Important Security Notice:</strong><br>
        Please keep your password secure and do not share it with anyone. If you need your password reset, please contact your administrator.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Login to Your Account</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px;">Getting Started</h3>

    <ol style="color: #4b5563; padding-left: 20px;">
      <li style="margin-bottom: 10px;">Click the login button above or visit <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a></li>
      <li style="margin-bottom: 10px;">Enter your email and temporary password</li>
      <li style="margin-bottom: 10px;">Start using the platform to manage your work</li>
    </ol>

    <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">If you have any questions or need assistance, please contact your administrator.</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      This is an automated message from ${organizationName}.<br>
      Please do not reply to this email.
    </p>
  </div>
</body>
</html>
`

  const text = `
Welcome to ${organizationName}!

Hello ${firstName} ${lastName},

Your account has been created for ${organizationName}. You have been assigned the role of ${roleName}.

YOUR LOGIN CREDENTIALS
---------------------
Email: ${email}
Temporary Password: ${temporaryPassword}

IMPORTANT SECURITY NOTICE:
Please keep your password secure and do not share it with anyone. If you need your password reset, please contact your administrator.

GETTING STARTED
---------------
1. Visit ${loginUrl}
2. Enter your email and temporary password
3. Start using the platform to manage your work

If you have any questions or need assistance, please contact your administrator.

---
This is an automated message from ${organizationName}.
Please do not reply to this email.
`

  return sendEmail({ to: email, subject, html, text })
}

/**
 * Send password regenerated notification email
 */
export async function sendPasswordRegeneratedEmail(
  email: string,
  firstName: string,
  newPassword: string,
  organizationName: string,
  loginUrl: string,
  regeneratedByName: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Your Password Has Been Reset - ${organizationName}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0; font-size: 24px;">${organizationName}</h1>
    </div>

    <h2 style="color: #1f2937; margin-bottom: 20px;">Your Password Has Been Reset</h2>

    <p style="margin-bottom: 15px;">Hello ${firstName},</p>

    <p style="margin-bottom: 15px;">Your password has been reset by <strong>${regeneratedByName}</strong>. Below is your new temporary password:</p>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">New Temporary Password:</p>
      <p style="font-size: 24px; font-weight: 700; color: #1f2937; font-family: monospace; background-color: #fef3c7; padding: 10px 20px; border-radius: 6px; display: inline-block; margin: 0;">${newPassword}</p>
    </div>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; color: #991b1b; font-size: 14px;">
        <strong>Security Notice:</strong><br>
        Please keep your password secure and do not share it with anyone.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Login Now</a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">If you did not expect this password reset, please contact your administrator immediately.</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      This is an automated message from ${organizationName}.<br>
      Please do not reply to this email.
    </p>
  </div>
</body>
</html>
`

  const text = `
Your Password Has Been Reset

Hello ${firstName},

Your password has been reset by ${regeneratedByName}. Below is your new temporary password:

New Temporary Password: ${newPassword}

SECURITY NOTICE:
Please keep your password secure and do not share it with anyone.

Login at: ${loginUrl}

If you did not expect this password reset, please contact your administrator immediately.

---
This is an automated message from ${organizationName}.
Please do not reply to this email.
`

  return sendEmail({ to: email, subject, html, text })
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<{ success: boolean; error?: string }> {
  try {
    await transporter.verify()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
