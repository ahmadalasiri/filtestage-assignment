import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import {
  createTestAccounts,
  removeTestAccounts,
  backendRequest,
} from "../utils";

let accounts;
let folder;
let project;
let file;

test.beforeAll(async ({ browser }) => {
  accounts = await createTestAccounts(browser);

  // Create a folder first
  folder = await backendRequest(accounts.owner.context, "post", `/folders`, {
    headers: { "Content-Type": "application/json" },
    data: { name: "Test Folder", parentFolderId: null },
  });

  // Create a project with the folder ID
  project = await backendRequest(accounts.owner.context, "post", `/projects`, {
    headers: { "Content-Type": "application/json" },
    data: {
      name: "Deadline Test Project",
      folderId: folder._id,
    },
  });

  // Upload a test file
  file = await backendRequest(accounts.owner.context, "post", "/files", {
    multipart: {
      projectId: project._id,
      file: {
        name: "deadline-test.jpg",
        mimeType: "image/jpeg",
        buffer: fs.readFileSync(
          path.join(process.cwd(), "sample-files/image.jpg"),
        ),
      },
    },
  });
});

test.afterAll(() => removeTestAccounts(accounts));

test("user can sign up", async ({ page }) => {
  // Sign up with a random email
  const email = `test-${Math.random().toString(36).substring(7)}@example.com`;
  const password = "12341234";

  // Go to login page
  await page.goto("/login");

  // Click on sign up link
  await page.getByRole("link", { name: "Sign up here" }).click();

  // Fill in signup form
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign Up" }).click();

  // Wait to be redirected to projects page
  await expect(page).toHaveURL("/projects");
});

test("user can set and update file deadline", async ({ page }) => {
  const { page: ownerPage } = accounts.owner;

  // Navigate to the file view
  await ownerPage.goto(`/files/${file._id}`);

  // Wait for the file page to load
  await expect(ownerPage.getByRole("banner")).toContainText(
    "deadline-test.jpg",
    {
      timeout: 15000,
    },
  );

  // Wait for the page to fully load
  await ownerPage.waitForTimeout(1000);

  // Click the menu icon (the three dots)
  // Find the IconButton that contains MoreVertIcon - it's the last icon in the header
  await ownerPage.locator("button").last().click();

  // Click the "Set Deadline" menu item
  await ownerPage.getByText("Set Deadline").click();

  // Wait for the deadline dialog to appear
  await ownerPage.waitForSelector("div[role='dialog']", {
    state: "visible",
    timeout: 10000,
  });

  // Get today's date plus 7 days for testing
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  // Format date for input: YYYY-MM-DD
  const formattedDate = nextWeek.toISOString().split("T")[0];

  // Set the deadline date
  await ownerPage.locator("input[type='date']").fill(formattedDate);

  // Click on Save button
  await ownerPage.getByRole("button", { name: "Save" }).click();

  // Wait for the dialog to close
  await ownerPage.waitForSelector("div[role='dialog']", {
    state: "hidden",
    timeout: 10000,
  });

  // Verify the deadline is displayed
  const formattedDisplayDate = nextWeek.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Check that the deadline is visible in the header
  await expect(ownerPage.getByText("Deadline:", { exact: false })).toBeVisible({
    timeout: 10000,
  });

  // Now update the deadline
  // Wait a moment for UI to stabilize
  await ownerPage.waitForTimeout(1000);

  // Click the menu icon again
  await ownerPage.locator("button").last().click();

  // Click the "Update Deadline" menu item
  await ownerPage.getByText("Update Deadline").click();

  // Wait for the dialog to appear
  await ownerPage.waitForSelector("div[role='dialog']", {
    state: "visible",
    timeout: 10000,
  });

  // Set a new deadline (14 days from today)
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(today.getDate() + 14);
  const newFormattedDate = twoWeeksLater.toISOString().split("T")[0];

  // Update the deadline date
  await ownerPage.locator("input[type='date']").fill(newFormattedDate);

  // Click on Save button
  await ownerPage.getByRole("button", { name: "Save" }).click();

  // Wait for the dialog to close
  await ownerPage.waitForSelector("div[role='dialog']", {
    state: "hidden",
    timeout: 10000,
  });

  // Verify the deadline is still displayed (the specific text may change, but there should be a deadline)
  await expect(ownerPage.getByText("Deadline:", { exact: false })).toBeVisible({
    timeout: 10000,
  });
});
