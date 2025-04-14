import { test, expect } from "@playwright/test";
import { backendRequest } from "../utils.js";

// Create a basic test that just creates a folder and verifies it appears
test("basic folder operations", async ({ browser }) => {
  // Create a new browser context and page
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Create a test user
    const email = `folder-test-${Math.random().toString(36).substring(7)}@example.com`;
    const password = "12341234";

    // Sign up using backend request
    await backendRequest(context, "post", "/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: {
        email,
        password,
      },
    });

    // Login
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Login" }).click();

    // Verify we're on the projects page
    await expect(page).toHaveURL("/projects");

    // Generate a unique folder name
    const folderName = `Test Folder ${Math.random().toString(36).substring(7)}`;

    // Click the create folder button
    await page.getByRole("button", { name: "New Folder" }).click();

    // Fill the folder name
    await page.getByLabel("Folder Name").fill(folderName);

    // Click create
    await page.getByRole("button", { name: "Create" }).click();

    // Wait for folder to be visible
    await expect(page.getByText(folderName)).toBeVisible();

    // Cleanup: Delete account
    await page.getByRole("button", { name: "Account Menu" }).click();
    await page.getByRole("menuitem", { name: "Remove Account" }).click();
    await expect(page).toHaveURL("/login");
  } finally {
    // Close the context
    await context.close();
  }
});
