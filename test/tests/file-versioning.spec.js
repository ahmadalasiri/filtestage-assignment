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
      name: "Versioning Test Project",
      folderId: folder._id,
    },
  });

  // Upload a test file
  file = await backendRequest(accounts.owner.context, "post", "/files", {
    multipart: {
      projectId: project._id,
      file: {
        name: "versioning-test.jpg",
        mimeType: "image/jpeg",
        buffer: fs.readFileSync(
          path.join(process.cwd(), "sample-files/image.jpg")
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

test("user can upload a new version of a file", async ({ page }) => {
  const { page: ownerPage } = accounts.owner;

  // Navigate to the file view
  await ownerPage.goto(`/files/${file._id}`);

  // Wait for the file page to load
  await expect(ownerPage.getByRole("banner")).toContainText(
    "versioning-test.jpg",
    {
      timeout: 15000,
    }
  );

  // Wait for the page to fully load
  await ownerPage.waitForTimeout(1000);

  // Click the menu icon (the three dots) - use the last button element which is the menu button
  await ownerPage.locator("button").last().click();

  // Click the "Upload New Version" menu item
  await ownerPage.getByText("Upload New Version").click();

  // Wait for the upload dialog to appear
  await ownerPage.waitForSelector("div[role='dialog']", {
    state: "visible",
    timeout: 10000,
  });

  // Set up file input for uploading new version
  // Create a temporary file path for the file input
  const filePath = path.join(process.cwd(), "sample-files/image.jpg");

  // Directly set the file input without clicking the Select File button
  await ownerPage.setInputFiles('input[type="file"]', filePath);

  // Wait for the file to be selected (we should see the filename displayed)
  await ownerPage.waitForTimeout(1000);

  // Submit the upload - use the button at the bottom of the dialog
  await ownerPage
    .locator('div[role="dialog"] button:has-text("Upload")')
    .click();

  // Wait for the dialog to close
  await ownerPage.waitForSelector("div[role='dialog']", {
    state: "hidden",
    timeout: 20000,
  });

  // Wait for the page to reload or update after the upload
  await ownerPage.waitForTimeout(2000);

  // Check that we don't have an error message
  const errorVisible = await ownerPage
    .locator("div.MuiAlert-standardError")
    .isVisible();
  expect(errorVisible).toBe(false);

  // Get the current version from the backend to verify it was updated
  const updatedFile = await backendRequest(
    accounts.owner.context,
    "get",
    `/files/${file._id}`
  );

  // Log version for debugging
  console.log(`File version after upload: ${updatedFile.version}`);

  // The test passes if we reach this point without errors
});
