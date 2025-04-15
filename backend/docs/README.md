# Filestage API Documentation

This directory contains the API documentation for the Filestage backend.

## Swagger Documentation

The API documentation is available in OpenAPI 3.0 format (Swagger) and can be accessed in two ways:

1. **Through the web interface**: When the server is running, visit:

   - Development: http://localhost:3001/api-docs
   - Production: https://api.filestage.ahmadalasiri.info/api-docs

2. **Directly viewing the YAML file**:
   - The raw Swagger definition is available in `swagger.yaml`

## Available Endpoints

The documentation covers all API endpoints including:

- Authentication (signup, login, logout)
- Projects management
- Files and versioning
- Comments and replies
- Folders organization
- Search functionality

## Authentication

Most endpoints require authentication using cookies. The authentication flow is:

1. Call `/auth/login` or `/auth/signup` to authenticate
2. The server will set a session cookie
3. All subsequent requests will use this cookie for authentication

## Development

If you make changes to the API, please update the `swagger.yaml` file accordingly to keep the documentation in sync with the implementation.

## Documentation Structure

- `index.html`: The Swagger UI for interactive exploration of the API
- `swagger.yaml`: The OpenAPI 3.0 specification describing all API endpoints

## Example Usage

Here's a simple example of using the API with JavaScript:

```javascript
// Login and get a session cookie
const login = async () => {
  const response = await fetch("http://localhost:3001/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "user@example.com",
      password: "password123",
    }),
    credentials: "include", // Important to include cookies
  });

  return response.json();
};

// Get list of projects
const getProjects = async () => {
  const response = await fetch("http://localhost:3001/projects", {
    credentials: "include", // Include session cookie
  });

  return response.json();
};
```
