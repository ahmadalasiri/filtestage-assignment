import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
  createTestAccounts,
  removeTestAccounts,
  backendRequest,
} from "../utils.js";

let accounts;
let folder;
let project;
let file;
let commentWithUrl;

test.beforeAll(async ({ browser }) => {
  accounts = await createTestAccounts(browser);

  // Create a folder
  folder = await backendRequest(accounts.owner.context, "post", `/folders`, {
    headers: { "Content-Type": "application/json" },
    data: { name: "Linkify Test Folder", parentFolderId: null },
  });

  // Create a project
  project = await backendRequest(accounts.owner.context, "post", `/projects`, {
    headers: { "Content-Type": "application/json" },
    data: {
      name: "Linkify Test Project",
      folderId: folder._id,
    },
  });

  // Upload a test file
  file = await backendRequest(accounts.owner.context, "post", "/files", {
    multipart: {
      projectId: project._id,
      file: {
        name: "linkify-test.jpg",
        mimeType: "image/jpeg",
        buffer: fs.readFileSync(
          path.join(process.cwd(), "sample-files/image.jpg")
        ),
      },
    },
  });

  // Create a comment with a URL
  commentWithUrl = await backendRequest(
    accounts.owner.context,
    "post",
    "/comments",
    {
      headers: { "Content-Type": "application/json" },
      data: {
        fileId: file._id,
        body: "Check this link https://example.com and also www.github.com",
        x: 50,
        y: 50,
      },
    }
  );
});

test.afterAll(() => removeTestAccounts(accounts));

// This test will create a file directly via the API and then test the linkify functionality
test("URLs in comments should be converted to clickable links", async ({
  page,
  context,
}) => {
  const { page: ownerPage } = accounts.owner;

  // Navigate to the file with the comment
  await ownerPage.goto(`/files/${file._id}`);

  // Wait for the file page to load
  await expect(ownerPage.getByRole("banner")).toContainText(
    "linkify-test.jpg",
    {
      timeout: 15000,
    }
  );

  // Wait for comments to load
  await ownerPage.waitForTimeout(2000);

  // Verify the comment text is visible
  await expect(ownerPage.getByText("Check this link")).toBeVisible();

  // Check for the first URL being converted to a link
  const firstLink = ownerPage.locator('a[href="https://example.com"]');
  await expect(firstLink).toBeVisible();

  // Check for the second URL being converted to a link
  // Note: the linkify function prepends https:// to www. links
  const secondLink = ownerPage.locator('a[href="https://www.github.com"]');
  await expect(secondLink).toBeVisible();

  // Verify the link text matches the original URLs
  await expect(firstLink).toHaveText("https://example.com");
  await expect(secondLink).toHaveText("www.github.com");

  // Optional: Verify that the links open in a new tab/window
  const firstLinkTarget = await firstLink.getAttribute("target");
  expect(firstLinkTarget).toBe("_blank");

  // Optional: Verify that the links have rel="noopener noreferrer" for security
  const firstLinkRel = await firstLink.getAttribute("rel");
  expect(firstLinkRel).toContain("noopener");
});
