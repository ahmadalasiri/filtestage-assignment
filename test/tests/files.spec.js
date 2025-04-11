import path from "path";
import fs from "fs";
import {
  createTestAccounts,
  removeTestAccounts,
  backendRequest,
} from "../utils";
import { test, expect } from "@playwright/test";

let accounts;

let project;
let file;

test.beforeAll(async ({ browser }) => {
  accounts = await createTestAccounts(browser);
  project = await backendRequest(accounts.owner.context, "post", `/projects`, {
    headers: { "Content-Type": "application/json" },
    data: { name: "First Project" },
  });
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
});

test.afterAll(() => removeTestAccounts(accounts));

test("open file as owner", async function () {
  await accounts.owner.page.goto(`/files/${file._id}`);
  await expect(accounts.owner.page.getByRole("banner")).toContainText(
    "image.jpg",
  );
  await expect(
    accounts.owner.page.getByRole("img", { name: "Click to leave a comment" }),
  ).toBeVisible();
});

test("leave comment as owner", async function () {
  const { page } = accounts.owner;
  await page
    .getByRole("img", { name: "Click to leave a comment" })
    .click({ position: { x: 100, y: 100 } });
  await page
    .getByRole("textbox", { name: "Comment" })
    .fill("Comment from owner");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("paragraph")).toContainText("Comment from owner");
});

test("open file as reviewer without invite", async function () {
  const { page } = accounts.reviewer;
  await page.goto(`/files/${file._id}`);
  await expect(page.getByRole("heading")).toContainText("File not found");
});

test("open file as reviewer with invite", async function () {
  await backendRequest(
    accounts.owner.context,
    "post",
    `/projects/${project._id}/reviewers`,
    {
      headers: { "Content-Type": "application/json" },
      data: { email: accounts.reviewer.email },
    },
  );

  const { page } = accounts.reviewer;
  await page.goto(`/files/${file._id}`);
  await expect(page.getByRole("banner")).toContainText("image.jpg");
  await expect(
    page.getByRole("img", {
      name: "Click to leave a comment",
    }),
  ).toBeVisible();
  await expect(page.getByRole("paragraph")).toContainText("Comment from owner");
});

test("leave comment as reviewer", async function () {
  const { page } = accounts.reviewer;
  await page
    .getByRole("img", { name: "Click to leave a comment" })
    .click({ position: { x: 200, y: 200 } });
  await page
    .getByRole("textbox", { name: "Comment" })
    .fill("Comment from reviewer");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("paragraph").nth(1)).toContainText(
    "Comment from reviewer",
  );
});
