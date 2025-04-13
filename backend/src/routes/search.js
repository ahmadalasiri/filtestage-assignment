import { z } from "zod";
import express from "express";
import { ApiError } from "../exceptions/ApiError.js";

export default function SearchRoutes({ db, session }) {
  const router = express.Router();

  // Global search endpoint
  router.get("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const { query, filter } = z.object({
      query: z.string().min(1),
      filter: z.enum(["all", "projects", "files", "comments"]).optional().default("all"),
    }).parse(req.query);

    // Create a case-insensitive regex for the search query
    const searchRegex = new RegExp(query, "i");

    const results = {
      projects: [],
      files: [],
      comments: []
    };

    // Search for projects if filter is 'all' or 'projects'
    if (filter === "all" || filter === "projects") {
      const projectsQuery = {
        $or: [
          { name: searchRegex },
          { $and: [{ reviewers: userId }, { name: searchRegex }] }
        ]
      };

      const projects = await db.collection("projects")
        .find(projectsQuery)
        .limit(10)
        .toArray();

      // Get folder paths for each project
      const projectsWithPath = await Promise.all(projects.map(async (project) => {
        const path = await getProjectPath(db, project);
        return {
          ...project,
          path,
          navigationPath: `/projects/${project._id}`
        };
      }));

      results.projects = projectsWithPath;
    }

    // Search for files if filter is 'all' or 'files'
    if (filter === "all" || filter === "files") {
      // Get all projects the user has access to
      const accessibleProjects = await db.collection("projects")
        .find({ $or: [{ authorId: userId }, { reviewers: userId }] })
        .project({ _id: 1 })
        .toArray();

      const projectIds = accessibleProjects.map(p => p._id);

      // Search for files in those projects
      const files = await db.collection("files")
        .find({
          projectId: { $in: projectIds },
          name: searchRegex
        })
        .limit(10)
        .toArray();

      // Get project and folder path for each file
      const filesWithPath = await Promise.all(files.map(async (file) => {
        const project = await db.collection("projects").findOne({ _id: file.projectId });
        const path = await getProjectPath(db, project);
        return {
          ...file,
          project,
          path,
          navigationPath: `/files/${file._id}`
        };
      }));

      results.files = filesWithPath;
    }

    // Search for comments if filter is 'all' or 'comments'
    if (filter === "all" || filter === "comments") {
      // Get all files from projects the user has access to
      const accessibleProjects = await db.collection("projects")
        .find({ $or: [{ authorId: userId }, { reviewers: userId }] })
        .project({ _id: 1 })
        .toArray();

      const projectIds = accessibleProjects.map(p => p._id);

      const files = await db.collection("files")
        .find({ projectId: { $in: projectIds } })
        .project({ _id: 1, projectId: 1, name: 1 })
        .toArray();

      const fileIds = files.map(f => f._id);

      // Search for comments in those files
      const comments = await db.collection("comments")
        .find({
          fileId: { $in: fileIds },
          body: searchRegex
        })
        .limit(10)
        .toArray();

      // Get file and project info for each comment
      const commentsWithContext = await Promise.all(comments.map(async (comment) => {
        const file = files.find(f => f._id.equals(comment.fileId));
        const project = await db.collection("projects").findOne({ _id: file.projectId });
        const path = await getProjectPath(db, project);

        return {
          ...comment,
          file,
          project,
          path,
          navigationPath: `/files/${comment.fileId}`
        };
      }));

      results.comments = commentsWithContext;
    }

    res.status(200).json(results);
  });

  return router;
}

// Helper function to get the full path for a project
async function getProjectPath(db, project) {
  if (!project) return "";
  if (!project.folderId) return "";

  const path = [];
  let currentFolderId = project.folderId;

  // Prevent infinite loops
  const maxDepth = 10;
  let depth = 0;

  while (currentFolderId && depth < maxDepth) {
    const folder = await db.collection("folders").findOne({ _id: currentFolderId });
    if (!folder) break;

    path.unshift(folder.name);
    currentFolderId = folder.parentFolderId;
    depth++;
  }

  return path.join(" > ");
}  