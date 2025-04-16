import nodemailer from "nodemailer";
import { env } from "../config/validateEnv.js";

/**
 * Send an email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} template - HTML email template
 * @returns {Promise<boolean>} - True if email was sent successfully
 * @throws {Error} - If email sending fails
 */
export const sendEmail = async (to, subject, template) => {
  try {
    // Check if SMTP configuration is available
    if (
      !env.SMTP_HOST ||
      !env.SMTP_PORT ||
      !env.SMTP_USERNAME ||
      !env.SMTP_PASSWORD
    ) {
      // Return true for development environments to simulate success
      if (env.NODE_ENV === "development") {
        return true;
      }

      throw new Error("SMTP configuration missing");
    }

    // Create a transporter using SMTP configuration
    const mailer = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: {
        user: env.SMTP_USERNAME,
        pass: env.SMTP_PASSWORD,
      },
    });

    // Verify SMTP connection configuration
    await new Promise((resolve, reject) => {
      mailer.verify((err) => {
        if (err) {
          reject(new Error(`SMTP verification error: ${err.message}`));
        } else {
          resolve();
        }
      });
    });

    // Set up error handler
    mailer.on("error", (err) => {
      throw new Error(`SMTP transport error: ${err.message}`);
    });

    await mailer.sendMail({
      from: `${env.SMTP_NAME || "Filestage"} <${env.SMTP_USERNAME || "notifications@filestage.com"}>`,
      to,
      subject,
      html: template,
      priority: "high",
    });

    return true;
  } catch (error) {
    console.error("Email sending failed:", error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Generate an HTML template for user mention notifications
 * @param {Object} data - Data for the email template
 * @param {string} data.mentionerName - Name of the user who mentioned
 * @param {string} data.projectName - Name of the project
 * @param {string} data.fileName - Name of the file
 * @param {string} data.commentText - Text of the comment
 * @param {string} data.commentUrl - URL to the comment
 * @returns {string} - HTML email template
 */
export const generateMentionTemplate = (data) => {
  const { mentionerName, projectName, fileName, commentText, commentUrl } =
    data;

  return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>You were mentioned in a comment</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5; color: #333333;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
        <!-- Header -->
        <tr>
          <td bgcolor="#4662D7" style="padding: 20px; text-align: center; color: #ffffff;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">You were mentioned in a comment</h2>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td bgcolor="#ffffff" style="padding: 30px 25px;">
            <p style="font-size: 18px; margin-top: 0; margin-bottom: 20px;">Hello,</p>
            
            <p style="margin-bottom: 25px; font-size: 16px; color: #444444;">
              <strong style="color: #222222; font-weight: 600;">${mentionerName}</strong> mentioned you in a comment.
            </p>
            
            <!-- File Info -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px;">
              <tr>
                <td bgcolor="#f0f4ff" style="padding: 10px 15px; border-radius: 6px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="30" style="vertical-align: middle;">📄</td>
                      <td style="vertical-align: middle;">
                        <span style="font-weight: 600; color: #333333;">${fileName}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            
            <p style="margin-bottom: 25px; font-size: 16px; color: #444444;">
              Project: <strong style="color: #222222; font-weight: 600;">${projectName}</strong>
            </p>
            
            <!-- Comment -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px; margin-top: 25px;">
              <tr>
                <td style="padding: 18px; background-color: #f7f9fc; border-radius: 6px; border-left: 4px solid #4662D7;">
                  <p style="margin: 0; color: #444444; font-size: 16px; line-height: 1.6;">${commentText}</p>
                </td>
              </tr>
            </table>
            
            <!-- Button -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 0;">
              <tr>
                <td>
                  <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td bgcolor="#4662D7" style="border-radius: 6px; padding: 0;">
                        <a href="${commentUrl}" target="_blank" style="color: #ffffff; text-decoration: none; font-weight: 600; display: inline-block; padding: 12px 24px;">
                          View Comment
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            
            <p style="margin-top: 30px; margin-bottom: 0; font-size: 16px; color: #444444;">
              Thank you,<br />
              The Filestage Team
            </p>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td bgcolor="#ffffff" style="padding: 20px 25px; border-top: 1px solid #eeeeee; text-align: center; color: #777777; font-size: 14px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="text-align: center;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} Filestage. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
