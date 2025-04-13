import AuthRoutes from './auth.js';
import UserRoutes from './user.js';
import ProjectRoutes from './projects.js';
import FileRoutes from './files.js';
import CommentRoutes from './comments.js';
import FolderRoutes from './folders.js';
import SearchRoutes from './search.js';

/**
 * Factory for creating route handlers
 */
export class RouteFactory {
  /**
   * Create route handlers with dependencies injected
   * @param {Object} db - Database adapter
   * @param {Object} session - Session manager
   * @returns {Object} Route handlers
   */
  static createRoutes(db, session) {
    return {
      auth: AuthRoutes({ db, session }),
      users: UserRoutes({ db, session }),
      projects: ProjectRoutes({ db, session }),
      folders: FolderRoutes({ db, session }),
      files: FileRoutes({ db, session }),
      comments: CommentRoutes({ db, session }),
      search: SearchRoutes({ db, session })
    };
  }
}

export default RouteFactory;
