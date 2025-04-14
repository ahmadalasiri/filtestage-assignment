/**
 * Setup script for E2E tests
 * This script ensures the backend and frontend are running
 * before executing the tests
 */
import { spawn } from "child_process";
import { resolve } from "path";

// Path to the root directory (one level up from test)
const rootDir = resolve(process.cwd(), "..");
const backendDir = resolve(rootDir, "backend");
const frontendDir = resolve(rootDir, "frontend");

// Check if servers are already running
async function isServerRunning(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.status < 500; // Any response other than server error
  } catch (error) {
    return false;
  }
}

// Start a server process
function startServer(dir, command, envVars = {}) {
  console.log(`Starting ${command} in ${dir}...`);

  const [cmd, ...args] = command.split(" ");
  const env = { ...process.env, ...envVars };

  const serverProcess = spawn(cmd, args, {
    cwd: dir,
    env,
    shell: true,
    stdio: "inherit",
  });

  serverProcess.on("error", (err) => {
    console.error(`Failed to start ${command}:`, err);
  });

  return serverProcess;
}

// Wait for server to be ready
async function waitForServer(url, maxAttempts = 30, interval = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isServerRunning(url)) {
      console.log(`Server at ${url} is ready!`);
      return true;
    }
    console.log(`Waiting for ${url} to be ready... (${i + 1}/${maxAttempts})`);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Server at ${url} did not become ready in time`);
}

// Main function
async function setupTestEnvironment() {
  const backendUrl = "http://localhost:3001";
  const frontendUrl = "http://localhost:3000";

  // Check if servers are already running
  const backendRunning = await isServerRunning(backendUrl);
  const frontendRunning = await isServerRunning(frontendUrl);

  const processes = [];

  if (!backendRunning) {
    processes.push(startServer(backendDir, "npm start"));
    await waitForServer(backendUrl);
  } else {
    console.log("Backend is already running.");
  }

  if (!frontendRunning) {
    processes.push(startServer(frontendDir, "npm run dev"));
    await waitForServer(frontendUrl);
  } else {
    console.log("Frontend is already running.");
  }

  // Return cleanup function
  return async () => {
    for (const proc of processes) {
      proc.kill();
    }
  };
}

// If this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const cleanup = await setupTestEnvironment();
    console.log("Test environment ready! Press Ctrl+C to shut down servers.");

    // Keep process running until manually terminated
    process.on("SIGINT", async () => {
      console.log("Shutting down servers...");
      await cleanup();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to set up test environment:", error);
    process.exit(1);
  }
}

export default setupTestEnvironment;
