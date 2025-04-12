import nodemailer from 'nodemailer';

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
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USERNAME || !process.env.SMTP_PASSWORD) {
      // Return true for development environments to simulate success
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      
      throw new Error('SMTP configuration missing');
    }
    
    // Create a transporter using SMTP configuration
    const mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Verify SMTP connection configuration
    try {
      await new Promise((resolve, reject) => {
        mailer.verify((err) => {
          if (err) {
            reject(new Error(`SMTP verification error: ${err.message}`));
          } else {
            resolve();
          }
        });
      });
    } catch (verifyError) {
      throw verifyError;
    }

    // Set up error handler
    mailer.on('error', err => {
      throw new Error(`SMTP transport error: ${err.message}`);
    });

    await mailer.sendMail({
      from: `${process.env.SMTP_NAME || 'Filestage'} <${process.env.SMTP_USERNAME || 'notifications@filestage.com'}>`,
      to,
      subject,
      html: template,
      priority: 'high',
    });

    return true;
  } catch (error) {
    console.error('Email sending failed:', error.message);
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
  const { mentionerName, projectName, fileName, commentText, commentUrl } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>You were mentioned in a comment</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header { 
          background-color: #4285f4;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 5px 5px;
        }
        .comment {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
        }
        .button {
          display: inline-block;
          background-color: #4285f4;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>You were mentioned in a comment</h2>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p><strong>${mentionerName}</strong> mentioned you in a comment on <strong>${fileName}</strong> in the project <strong>${projectName}</strong>.</p>
        
        <div class="comment">
          <p>${commentText}</p>
        </div>
        
        <a href="${commentUrl}" class="button">View Comment</a>
        
        <p>Thank you,<br>The Filestage Team</p>
      </div>
    </body>
    </html>
  `;
};
