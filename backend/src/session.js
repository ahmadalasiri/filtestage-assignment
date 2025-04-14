import { ObjectId } from "mongodb";
import { ApiError } from "./exceptions/ApiError.js";
import { env } from "./config/validateEnv.js";
import cookie from "cookie";
import cookieParser from "cookie-parser";

const SESSION_COOKIE_NAME = "session_id";
const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export default async function Session({ db }) {
  await db
    .collection("sessions")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  async function create(res, { userId }) {
    const session = {
      userId,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    };

    const { insertedId: sessionId } = await db
      .collection("sessions")
      .insertOne(session);
    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      expires: session.expiresAt,
      domain: env.DOMAIN,
      httpOnly: true,
      sameSite: "strict",
      signed: true,
    });
  }

  async function remove(req, res) {
    const session = await get(req);
    await db.collection("sessions").deleteOne({ _id: session._id });
    res.clearCookie(SESSION_COOKIE_NAME, {
      domain: env.DOMAIN,
      path: "/",
      httpOnly: true,
      signed: true,
    });
  }

  async function get(req) {
    const sessionId = req.signedCookies[SESSION_COOKIE_NAME];
    if (!sessionId) {
      throw new ApiError(401, "No session found");
    }
    return await db
      .collection("sessions")
      .findOne({ _id: new ObjectId(sessionId) });
  }

  /**
   * Get session from socket handshake cookies
   * @param {object} socket - Socket.IO socket object
   * @returns {object} Session data
   */
  async function getFromSocket(socket) {
    try {
      // Parse cookies from handshake headers
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        console.log("No cookies in socket handshake");
        return null;
      }

      console.log(`Full cookie header: "${cookieHeader}"`);

      // Custom parsing for handling complex session cookies
      // Look for our specific cookie pattern with regex
      const regex = new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`);
      const match = cookieHeader.match(regex);

      if (!match || !match[1]) {
        console.log("Session cookie not found in header");
        return null;
      }

      // URL decode the cookie value
      const cookieValue = decodeURIComponent(match[1]);
      console.log(`URL decoded cookie value: "${cookieValue}"`);

      // Extract the MongoID directly using a regex pattern
      // Looking for a 24-character hex string that fits MongoDB's ObjectId
      const objectIdRegex = /([0-9a-f]{24})/i;
      const objectIdMatch = cookieValue.match(objectIdRegex);

      if (!objectIdMatch || !objectIdMatch[1]) {
        console.log("Could not find a valid ObjectId pattern in cookie");
        return null;
      }

      const sessionId = objectIdMatch[1];
      console.log(`Extracted session ID: "${sessionId}"`);

      // Validate the extracted ID
      if (!ObjectId.isValid(sessionId)) {
        console.log(`Extracted ID is not a valid ObjectId: "${sessionId}"`);
        return null;
      }

      // Retrieve session from database
      const session = await db
        .collection("sessions")
        .findOne({ _id: new ObjectId(sessionId) });

      if (!session) {
        console.log(`Session not found for ID: ${sessionId}`);
        return null;
      }

      console.log(`Successfully found session for user: ${session.userId}`);
      return session;
    } catch (error) {
      console.error("Error getting session from socket:", error);
      return null;
    }
  }

  return {
    create,
    remove,
    get,
    getFromSocket,
  };
}
