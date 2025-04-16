import { sendEmail, generateMentionTemplate } from "./emailService.js";
import { env } from "../config/validateEnv.js";
import { ApiError } from "../exceptions/ApiError.js";

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
  return [...new Set(matches.map((match) => match.substring(1)))];
};

/**
 * Handle all mention processing for a new comment
 * @param {Object} db - Database connection
 * @param {Object} comment - The newly created comment
 * @returns {Promise<Array>} - Array of notification results
 */
export const handleCommentMentions = async (db, comment) => {
  try {
    if (!comment.body.includes("@")) {
      return []; // No mentions to process
    }

    // Get file information
    const file = await db.collection("files").findOne({ _id: comment.fileId });
    if (!file) {
      throw new ApiError(404, "File not found");
    }

    // Get project information
    const project = await db
      .collection("projects")
      .findOne({ _id: file.projectId });
    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Get comment author information
    const commentAuthor = await db
      .collection("users")
      .findOne({ _id: comment.authorId });
    if (!commentAuthor) {
      throw new ApiError(404, "Author not found");
    }

    // Process mentions and send notifications
    const mentionResults = await processMentions(
      db,
      comment,
      file,
      project,
      commentAuthor,
    );

    // Store mention results in the comment for reference
    if (mentionResults && mentionResults.length > 0) {
      await db
        .collection("comments")
        .updateOne(
          { _id: comment._id },
          { $set: { mentionNotifications: mentionResults } },
        );
    }

    return mentionResults;
  } catch (error) {
    console.error("Error handling comment mentions:", error);
    return []; // Return empty array in case of error
  }
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
    const mentionedUsers = await db
      .collection("users")
      .find({
        $or: [
          // Look for exact matches with the username
          { email: { $in: mentionedUsernames } },
          // Also look for matches where the username is the part before @ in the email
          ...mentionedUsernames.map((username) => ({
            email: { $regex: new RegExp(`^${username}@`) },
          })),
        ],
      })
      .toArray();

    // Check if we have SMTP configuration
    const hasSmtpConfig =
      env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USERNAME && env.SMTP_PASSWORD;

    if (!hasSmtpConfig) {
      console.warn(
        "SMTP Configuration missing. Email notifications will not be sent.",
      );

      // Return mock results for logging purposes
      return mentionedUsers.map((user) => ({
        user: user._id,
        sent: false,
        reason: "smtp-not-configured",
        email: user.email,
      }));
    }

    // Generate comment URL - direct format without projects path
    const commentUrl = `${env.FRONTEND_ORIGIN || "http://localhost:5173"}/files/${file._id}?commentId=${comment._id}`;

    // Send email notifications
    const notificationPromises = mentionedUsers.map((user) => {
      // Skip notification if the mentioned user is the comment author
      if (user._id.toString() === author._id.toString()) {
        return Promise.resolve({
          user: user._id,
          sent: false,
          reason: "self-mention",
          email: user.email,
        });
      }

      const emailData = {
        mentionerName: author.email.split("@")[0], // Use username part of email
        projectName: project.name,
        fileName: file.name,
        commentText: comment.body,
        commentUrl,
      };

      const emailTemplate = generateMentionTemplate(emailData);

      return sendEmail(
        user.email,
        `You were mentioned in a comment on ${project.name}`,
        emailTemplate,
      )
        .then(() => {
          return { user: user._id, sent: true, email: user.email };
        })
        .catch((error) => {
          console.error(
            `Failed to send email to ${user.email}:`,
            error.message,
          );
          return {
            user: user._id,
            sent: false,
            error: error.message,
            email: user.email,
          };
        });
    });

    return Promise.all(notificationPromises);
  } catch (error) {
    console.error("Error processing mentions:", error);
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
