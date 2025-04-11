import { ZodError } from "zod";

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "Validation Error";
    this.status = 400;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "Unauthorized Error";
    this.status = 401;
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "Forbidden Error";
    this.status = 403;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "Not Found Error";
    this.status = 404;
  }
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.status) {
    res.status(err.status).json({
      name: err.name,
      message: err.message,
    });
  } else if (err instanceof ZodError) {
    res.status(400).json({
      name: "Validation Error",
      message: `${err.issues[0].message} '${err.issues[0].path.join(".")}'`,
    });
  } else {
    res.status(500).json({
      name: "Internal Server Error",
    });
  }
}
