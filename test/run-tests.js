#!/usr/bin/env node

import { spawn } from "child_process";
import setupTestEnvironment from "./setup-tests.js";

/**
 * Run the Playwright tests with proper setup and cleanup
 */
async function runTests() {
  console.log("Setting up test environment...");
  let cleanup;

  try {
    // Set up the environment (start servers if needed)
    cleanup = await setupTestEnvironment();

    console.log("Running tests...");

    // Run Playwright tests
    const testProcess = spawn("npx", ["playwright", "test"], {
      stdio: "inherit",
      shell: true,
    });

    // Wait for tests to complete
    const exitCode = await new Promise((resolve) => {
      testProcess.on("close", resolve);
    });

    console.log(`Tests completed with exit code: ${exitCode}`);
    return exitCode;
  } catch (error) {
    console.error("Error running tests:", error);
    return 1;
  } finally {
    // Clean up any started processes
    if (cleanup) {
      console.log("Cleaning up test environment...");
      await cleanup();
    }
  }
}

// Run and exit with the appropriate code
runTests().then((exitCode) => {
  process.exit(exitCode);
});
