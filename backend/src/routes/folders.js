import { z } from "zod";
import express from "express";
import { ApiError } from "../exceptions/ApiError.js";
import { StringObjectId } from "../schemas.js";
import { ObjectId } from "mongodb";

export default function FolderRoutes({ db, session }) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const { name, parentFolderId } = z
      .object({
        name: z.string(),
        parentFolderId: z.string().nullable(),
      })
      .parse(req.body);

    const folder = {
      authorId: userId,
      name,
      createdAt: new Date(),
      parentFolderId: parentFolderId ? new ObjectId(parentFolderId) : null,
    };

    const { insertedId } = await db.collection("folders").insertOne(folder);

    res
      .status(201)
      .json(await db.collection("folders").findOne({ _id: insertedId }));
  });

  router.put("/:folderId", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const { folderId } = z
      .object({ folderId: StringObjectId })
      .parse(req.params);
    const { name } = z
      .object({
        name: z.string().optional(),
      })
      .parse(req.body);

    const folder = await db.collection("folders").findOne({ _id: folderId });
    if (!folder) {
      throw new ApiError(404, "Folder not found");
    }

    if (!folder.authorId.equals(userId)) {
      throw new ApiError(
        403,
        "Forbidden: You don't have permission to modify this folder",
      );
    }

    const update = {};
    if (name !== undefined) update.name = name;
    await db
      .collection("folders")
      .updateOne({ _id: folderId }, { $set: update });

    res
      .status(200)
      .json(await db.collection("folders").findOne({ _id: folderId }));
  });

  // Get all folders with hierarchy and projects
  router.get("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const folders = await db
      .collection("folders")
      .find({ authorId: userId })
      .toArray();

    const projects = await db
      .collection("projects")
      .find({ $or: [{ authorId: userId }, { reviewers: userId }] })
      .toArray();

    const folderMap = {};
    folders.forEach((folder) => {
      folderMap[folder._id.toString()] = {
        ...folder,
        children: [],
        projects: [],
      };
    });

    const rootFolders = [];

    folders.forEach((folder) => {
      const folderId = folder._id.toString();
      if (folder.parentFolderId) {
        const parentId = folder.parentFolderId.toString();
        if (folderMap[parentId]) {
          folderMap[parentId].children.push(folderMap[folderId]);
        } else {
          rootFolders.push(folderMap[folderId]);
        }
      } else {
        rootFolders.push(folderMap[folderId]);
      }
    });

    projects.forEach((project) => {
      if (project.folderId) {
        const folderId = project.folderId.toString();
        if (folderMap[folderId]) {
          folderMap[folderId].projects.push(project);
        }
      }
    });

    res.status(200).json({
      folders: rootFolders,
      allFolders: folders,
    });
  });

  return router;
}
