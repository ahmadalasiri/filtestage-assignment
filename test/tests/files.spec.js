import path from "path";
import fs from "fs";
import {
  createTestAccounts,
  removeTestAccounts,
  backendRequest,
} from "../utils";
import { test, expect } from "@playwright/test";

let accounts;
let folder;
let project;
let file;
let privateProject; // Separate project for testing unauthorized access

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
      name: "First Project",
      folderId: folder._id,
    },
  });

  // Create a separate private project that reviewer won't have access to
  privateProject = await backendRequest(
    accounts.owner.context,
    "post",
    `/projects`,
    {
      headers: { "Content-Type": "application/json" },
      data: {
        name: "Private Project",
        folderId: folder._id,
      },
    },
  );

  file = await backendRequest(accounts.owner.context, "post", "/files", {
    multipart: {
      projectId: project._id,
      file: {
        name: "image.jpg",
        mimeType: "image/jpeg",
        buffer: fs.readFileSync(
          path.join(process.cwd(), "sample-files/image.jpg"),
        ),
      },
    },
  });

  // Add reviewer to main project immediately so tests run in sequence
  await backendRequest(
    accounts.owner.context,
    "post",
    `/projects/${project._id}/reviewers`,
    {
      headers: { "Content-Type": "application/json" },
      data: { email: accounts.reviewer.email },
    },
  );
});

test.afterAll(() => removeTestAccounts(accounts));

test("open file as owner", async function () {
  await accounts.owner.page.goto(`/files/${file._id}`);
  await expect(accounts.owner.page.getByRole("banner")).toContainText(
    "image.jpg",
  );
  // Use a role-based selector for the file image
  await expect(
    accounts.owner.page.getByRole("img", { name: "Click to leave a comment" }),
  ).toBeVisible();
});

test("leave comment as owner", async function () {
  const { page } = accounts.owner;

  // Make sure we're on the file page
  await page.goto(`/files/${file._id}`);

  // Wait for the image to be fully loaded - use a role-based selector
  const imageElement = page.getByRole("img", {
    name: "Click to leave a comment",
  });
  await expect(imageElement).toBeVisible({ timeout: 15000 });

  // Click in the center of the image
  await imageElement.click({ position: { x: 100, y: 100 } });

  // Wait for the comment form to appear
  await page.waitForSelector("[placeholder*='Write a comment']", {
    state: "visible",
    timeout: 10000,
  });

  // Fill in the comment using the placeholder attribute
  await page
    .locator("[placeholder*='Write a comment']")
    .fill("Comment from owner");

  // Submit the comment
  await page.getByRole("button", { name: "Submit" }).click();

  // Wait for the comment to appear - use a looser text match
  await page.waitForTimeout(1000); // Brief wait for the comment to be processed
  const commentText = page.getByText("Comment from owner", { exact: false });
  await expect(commentText).toBeVisible({ timeout: 10000 });
});

test("open file as reviewer without invite", async function () {
  // Create a file in the private project that the reviewer doesn't have access to
  const privateFile = await backendRequest(
    accounts.owner.context,
    "post",
    "/files",
    {
      multipart: {
        projectId: privateProject._id, // Use the private project ID
        file: {
          name: "private.jpg",
          mimeType: "image/jpeg",
          buffer: fs.readFileSync(
            path.join(process.cwd(), "sample-files/image.jpg"),
          ),
        },
      },
    },
  );

  const { page } = accounts.reviewer;

  // Login as reviewer first to ensure they have an active session
  await page.goto(`/auth`);
  await page
    .waitForSelector("input[type='email']", { state: "visible", timeout: 5000 })
    .catch(() => {});

  const onLoginPage = await page.isVisible("input[type='email']");
  if (onLoginPage) {
    await page.fill("input[type='email']", accounts.reviewer.email);
    await page.fill("input[type='password']", "12341234");
    await page.click("button:has-text('Login')");
    await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  }

  // Directly check the API for 403 response
  try {
    await backendRequest(
      accounts.reviewer.context,
      "get",
      `/files/${privateFile._id}`,
    );
    // If we get here, the request succeeded which is unexpected
    throw new Error("Reviewer should not have access to private file");
  } catch (error) {
    // Expected error - verify it's a 403 or 401
    expect(error.message).toMatch(/403|401|Forbidden|Unauthorized/);
  }

  // Test passes if the direct API request fails as expected
});

test("open file as reviewer with invite", async function () {
  const { page } = accounts.reviewer;

  // Login as reviewer
  await page.goto(`/auth`);
  await page
    .waitForSelector("input[type='email']", { state: "visible", timeout: 5000 })
    .catch(() => {});

  // Only try to login if we're on the login page
  const onLoginPage = await page.isVisible("input[type='email']");
  if (onLoginPage) {
    await page.fill("input[type='email']", accounts.reviewer.email);
    await page.fill("input[type='password']", "12341234");
    await page.click("button:has-text('Login')");
    await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  }

  // Go to the file page
  await page.goto(`/files/${file._id}`);

  // Wait for file banner to appear, confirming access
  await expect(page.getByRole("banner")).toContainText("image.jpg", {
    timeout: 15000,
  });

  // Check for the file image
  await expect(
    page.getByRole("img", { name: "Click to leave a comment" }),
  ).toBeVisible({ timeout: 15000 });
});

test("leave comment as reviewer", async function () {
  const { page } = accounts.reviewer;

  // Create a brand new separate file for the reviewer comment test
  // This avoids problems with existing comments interfering with click events
  const reviewerFile = await backendRequest(
    accounts.owner.context,
    "post",
    "/files",
    {
      multipart: {
        projectId: project._id,
        file: {
          name: "reviewer-comment.jpg",
          mimeType: "image/jpeg",
          buffer: fs.readFileSync(
            path.join(process.cwd(), "sample-files/image.jpg"),
          ),
        },
      },
    },
  );

  // Go to the new file page
  await page.goto(`/files/${reviewerFile._id}`);

  // Wait for the page to load
  await expect(page.getByRole("banner")).toContainText("reviewer-comment.jpg", {
    timeout: 15000,
  });

  // Wait for the image container to be visible
  const imageContainer = page.locator(".image-container");
  await expect(imageContainer).toBeVisible({ timeout: 15000 });

  // Get the dimensions of the container
  const box = await imageContainer.boundingBox();

  // Use mouse click directly on the center of the image container
  // This bypasses the interception issues with the comment markers
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  // Wait for the comment form to appear
  await page.waitForSelector("[placeholder*='Write a comment']", {
    state: "visible",
    timeout: 10000,
  });

  // Fill in the comment
  await page
    .locator("[placeholder*='Write a comment']")
    .fill("Comment from reviewer");

  // Submit the comment
  await page.getByRole("button", { name: "Submit" }).click();

  // Wait for the comment to appear
  await page.waitForTimeout(1000); // Brief wait for the comment to be processed
  const commentText = page.getByText("Comment from reviewer", { exact: false });
  await expect(commentText).toBeVisible({ timeout: 10000 });
});
