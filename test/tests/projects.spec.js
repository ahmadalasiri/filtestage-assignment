import { createTestAccounts, removeTestAccounts } from "../utils";
import { test, expect } from "@playwright/test";

let accounts;

test.beforeAll(async ({ browser }) => {
  accounts = await createTestAccounts(browser);
});

test.afterAll(() => removeTestAccounts(accounts));

async function createProject(page, name) {
  await page.goto("/projects");
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.getByRole("textbox", { name: "Project Name" }).fill(name);
  await page.getByRole("button", { name: "Create" }).click();
}

test("create project", async () => {
  const { page } = accounts.owner;
  await createProject(page, "First project");
  await expect(page.locator("h1")).toContainText("First project");
});

test("navigate between projects", async () => {
  const { page } = accounts.owner;
  await createProject(page, "Second project");
  await expect(page.locator("h1")).toContainText("Second project");

  await page.getByRole("button", { name: "First project" }).click();
  await expect(page.locator("h1")).toContainText("First project");
});

test("upload file to project", async () => {
  const { page } = accounts.owner;
  await page.getByRole("button", { name: "Upload File" }).click();
  await page
    .getByRole("button", { name: "Select File" })
    .locator('input[type="file"]')
    .setInputFiles("./sample-files/image.jpg");
  await page.getByRole("button", { name: "Upload" }).click();

  await expect(page.getByRole("button", { name: "image" })).toBeVisible();
});

test("copy file link", async () => {
  const { page } = accounts.owner;
  await page.getByRole("button", { name: "copy" }).click();
  const fileLink = await page.evaluate(() => navigator.clipboard.readText());
  expect(fileLink).toContain("http://localhost:3000/files/");
});

test("invite reviewer to project", async () => {
  const {
    owner: { page },
    reviewer: { email },
  } = accounts;
  await page.getByRole("button", { name: "First project" }).click();
  await page.getByRole("button", { name: "Invite Reviewer" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Invite" }).click();

  await expect(page.getByLabel(email)).toBeVisible();
});

test("open project as reviewer", async () => {
  const { page } = accounts.reviewer;
  await page.goto("/projects");
  await page.getByRole("button", { name: "First project" }).click();
  await expect(page.locator("h1")).toContainText("First project");
});
