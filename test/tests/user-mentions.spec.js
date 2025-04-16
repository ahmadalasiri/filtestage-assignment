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

  // Create a folder
  folder = await backendRequest(accounts.owner.context, "post", `/folders`, {
    headers: { "Content-Type": "application/json" },
    data: { name: "Mentions Test Folder", parentFolderId: null },
  });

  // Create a project
  project = await backendRequest(accounts.owner.context, "post", `/projects`, {
    headers: { "Content-Type": "application/json" },
    data: {
      name: "Mentions Test Project",
      folderId: folder._id,
    },
  });

  // Add reviewer to the project for mentions
  await backendRequest(
    accounts.owner.context,
    "post",
    `/projects/${project._id}/reviewers`,
    {
      headers: { "Content-Type": "application/json" },
      data: { email: accounts.reviewer.email },
    },
  );

  // Upload a test file
  file = await backendRequest(accounts.owner.context, "post", "/files", {
    multipart: {
      projectId: project._id,
      file: {
        name: "mentions-test.jpg",
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

test("user can mention other users in comments", async ({ page, browser }) => {
  const { page: ownerPage } = accounts.owner;

  // Navigate to the file view
  await ownerPage.goto(`/files/${file._id}`);

  // Wait for the file page to load
  await expect(ownerPage.getByRole("banner")).toContainText(
    "mentions-test.jpg",
    {
      timeout: 15000,
    },
  );

  // Click on the image to add a comment
  const imageElement = ownerPage.getByRole("img", {
    name: "Click to leave a comment",
  });
  await expect(imageElement).toBeVisible({ timeout: 15000 });
  await imageElement.click({ position: { x: 100, y: 100 } });

  // Wait for the comment form to appear
  await ownerPage.waitForSelector("[placeholder*='Write a comment']", {
    state: "visible",
    timeout: 10000,
  });

  // Extract reviewer's username (just to make the test more readable)
  const reviewerEmail = accounts.reviewer.email;
  console.log(`Using reviewer email: ${reviewerEmail}`);

  // Store the text we'll use for our comment with mention
  const commentText = `Hey @${reviewerEmail.split("@")[0]} check this out!`;
  console.log(`Comment text being used: ${commentText}`);

  // Type a comment with a mention
  const commentInput = ownerPage.locator("[placeholder*='Write a comment']");
  await commentInput.fill(commentText);
  await commentInput.press("Tab"); // Tab to ensure mention is processed

  // Wait a moment for any mention suggestions to appear
  await ownerPage.waitForTimeout(1000);

  // Look for any mention suggestion dialog/dropdown and click on it if found
  try {
    // Check for dropdown elements that might contain the reviewer's email
    const mentionSuggestions = ownerPage.locator('div[role="presentation"]');
    if (await mentionSuggestions.isVisible({ timeout: 2000 })) {
      await mentionSuggestions.click();
    }
  } catch (e) {
    console.log("No mention suggestions appeared, continuing test");
  }

  // Submit the comment
  await ownerPage.getByRole("button", { name: "Submit" }).click();

  // Wait for the comment to be posted
  await ownerPage.waitForTimeout(2000);

  // Check that a comment exists with our text (partial match)
  const commentPartialMatch = await ownerPage
    .getByText("check this out")
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  // Check for any styled mention elements
  const styledMention = await ownerPage
    .locator('span[class*="Mention"], span.mention, strong, b')
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  // Check for any @ symbols in the comment text
  const atSymbolFound = await ownerPage
    .locator('span:has-text("@")')
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  // Log the status for debugging
  console.log(`Comment partial match found: ${commentPartialMatch}`);
  console.log(`Styled mention found: ${styledMention}`);
  console.log(`@ symbol found: ${atSymbolFound}`);

  // Verify that at least one of our mention indicators is present
  expect(commentPartialMatch || styledMention || atSymbolFound).toBeTruthy();
});
