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
      name: "Comment Reply Test Project",
      folderId: folder._id,
    },
  });

  // Upload a test file
  file = await backendRequest(accounts.owner.context, "post", "/files", {
    multipart: {
      projectId: project._id,
      file: {
        name: "comment-reply-test.jpg",
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

test("user can reply to comments", async ({ page }) => {
  const { page: ownerPage } = accounts.owner;

  // Navigate to the file view
  await ownerPage.goto(`/files/${file._id}`);

  // Wait for the file page to load
  await expect(ownerPage.getByRole("banner")).toContainText(
    "comment-reply-test.jpg",
    {
      timeout: 15000,
    },
  );

  // Wait for the image to load
  const imageElement = ownerPage.getByRole("img", {
    name: "Click to leave a comment",
  });
  await expect(imageElement).toBeVisible({ timeout: 15000 });

  // Step 1: Add a parent comment
  // Click on the image to add a comment
  await imageElement.click({ position: { x: 100, y: 100 } });

  // Wait for the comment form to appear
  await ownerPage.waitForSelector("[placeholder*='Write a comment']", {
    state: "visible",
    timeout: 10000,
  });

  // Fill in the comment
  await ownerPage
    .locator("[placeholder*='Write a comment']")
    .fill("This is a parent comment");

  // Submit the comment
  await ownerPage.getByRole("button", { name: "Submit" }).click();

  // Wait for the comment to appear
  await ownerPage.waitForTimeout(1000);
  const commentText = ownerPage.getByText("This is a parent comment", {
    exact: false,
  });
  await expect(commentText).toBeVisible({ timeout: 10000 });

  // Step 2: Add a reply to the comment
  // Find and click the reply button on the parent comment
  await ownerPage.getByRole("button", { name: "Reply" }).first().click();

  // Wait for the reply form to appear
  await ownerPage.waitForTimeout(500);

  // Fill in the reply
  await ownerPage
    .locator("textarea[placeholder*='Write a reply']")
    .fill("This is a reply to the parent comment");

  // Submit the reply
  await ownerPage
    .getByRole("button", { name: "Reply", exact: true })
    .last()
    .click();

  // Wait for the reply to appear
  await ownerPage.waitForTimeout(1000);
  const replyText = ownerPage.getByText(
    "This is a reply to the parent comment",
    { exact: false },
  );
  await expect(replyText).toBeVisible({ timeout: 10000 });
});
