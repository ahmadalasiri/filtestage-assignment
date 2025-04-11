import { ObjectId } from "mongodb";
import { ValidationError } from "./errors.js";

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
      domain: process.env.DOMAIN,
      httpOnly: true,
      sameSite: "strict",
      signed: true,
    });
  }

  async function remove(req, res) {
    const session = await get(req);
    await db.collection("sessions").deleteOne({ _id: session._id });
    res.clearCookie(SESSION_COOKIE_NAME, {
      domain: process.env.DOMAIN,
      path: "/",
      httpOnly: true,
      signed: true,
    });
  }

  async function get(req) {
    const sessionId = req.signedCookies[SESSION_COOKIE_NAME];
    if (!sessionId) {
      throw new ValidationError("No session found");
    }
    return await db
      .collection("sessions")
      .findOne({ _id: new ObjectId(sessionId) });
  }

  return {
    create,
    remove,
    get,
  };
}
