import swaggerUi from "swagger-ui-express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to set up Swagger documentation in Express app
export function setupSwagger(app) {
  try {
    // Load the Swagger document
    const swaggerDocument = yaml.load(
      fs.readFileSync(path.join(__dirname, "swagger.yaml"), "utf8")
    );

    // Serve the Swagger JSON/YAML
    app.get("/api-docs/swagger.yaml", (req, res) => {
      res.sendFile(path.join(__dirname, "swagger.yaml"));
    });

    // Serve the Swagger UI
    app.use("/api-docs", swaggerUi.serve);
    app.get(
      "/api-docs",
      swaggerUi.setup(swaggerDocument, {
        explorer: true,
        customCss: ".swagger-ui .topbar { display: none }",
      })
    );

    console.log("Swagger documentation set up successfully");
  } catch (error) {
    console.error("Error setting up Swagger documentation:", error);
  }
}

export default { setupSwagger };
