import { sendEmail, generateMentionTemplate } from './emailService.js';
import { env } from "../config/validateEnv.js";

/**
 * Extract user mentions from comment text
 * @param {string} text - Comment text
 * @returns {Array<string>} - Array of usernames mentioned in the comment
 */
export const extractMentions = (text) => {
  // Match @username pattern (allow letters, numbers, underscores, hyphens, and dots)
  const mentionRegex = /@([\w.-]+)/g;
  const matches = text.match(mentionRegex) || [];

  // Remove @ symbol and return unique usernames
  return [...new Set(matches.map(match => match.substring(1)))];
};

/**
 * Process mentions in a comment and send notifications
 * @param {Object} db - Database connection
 * @param {Object} comment - Comment object
 * @param {Object} file - File object
 * @param {Object} project - Project object
 * @param {Object} author - Author object
 * @returns {Promise<Array>} - Array of notification results
 */
export const processMentions = async (db, comment, file, project, author) => {
  try {
    // Extract usernames from comment
    const mentionedUsernames = extractMentions(comment.body);

    if (mentionedUsernames.length === 0) {
      return [];
    }

    // Find mentioned users in database - search for the exact usernames without appending domain
    const mentionedUsers = await db.collection('users')
      .find({
        $or: [
          // Look for exact matches with the username
          { email: { $in: mentionedUsernames } },
          // Also look for matches where the username is the part before @ in the email
          ...mentionedUsernames.map(username => ({
            email: { $regex: new RegExp(`^${username}@`) }
          }))
        ]
      })
      .toArray();



    // Check if we have SMTP configuration
    const hasSmtpConfig = env.SMTP_HOST && env.SMTP_PORT &&
      env.SMTP_USERNAME && env.SMTP_PASSWORD;

    if (!hasSmtpConfig) {
      console.warn('SMTP Configuration missing. Email notifications will not be sent.');

      // Return mock results for logging purposes
      return mentionedUsers.map(user => ({
        user: user._id,
        sent: false,
        reason: 'smtp-not-configured',
        email: user.email
      }));
    }

    // Generate comment URL - direct format without projects path
    const commentUrl = `${env.FRONTEND_ORIGIN || 'http://localhost:5173'}/files/${file._id}?commentId=${comment._id}`;

    // Send email notifications
    const notificationPromises = mentionedUsers.map(user => {
      // Skip notification if the mentioned user is the comment author
      if (user._id.toString() === author._id.toString()) {
        return Promise.resolve({ user: user._id, sent: false, reason: 'self-mention', email: user.email });
      }

      const emailData = {
        mentionerName: author.email.split('@')[0], // Use username part of email
        projectName: project.name,
        fileName: file.name,
        commentText: comment.body,
        commentUrl
      };

      const emailTemplate = generateMentionTemplate(emailData);

      return sendEmail(user.email, `You were mentioned in a comment on ${project.name}`, emailTemplate)
        .then(() => {
          return { user: user._id, sent: true, email: user.email };
        })
        .catch(error => {
          console.error(`Failed to send email to ${user.email}:`, error.message);
          return { user: user._id, sent: false, error: error.message, email: user.email };
        });
    });

    return Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error processing mentions:', error);
    return [];
  }
};

/**
 * Format comment text with user mentions highlighted
 * @param {string} text - Comment text
 * @returns {string} - Formatted comment text with mentions highlighted
 */
export const formatMentions = (text) => {
  // Replace @username with highlighted span
  return text.replace(/@([\w.-]+)/g, '<span class="mention">@$1</span>');
};
