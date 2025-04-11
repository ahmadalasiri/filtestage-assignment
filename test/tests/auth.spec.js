import { test, expect } from "@playwright/test";

const email = Math.random().toString(36).substring(7) + "@example.com";
const password = "12341234";

let page;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  page = await context.newPage();
  await page.goto("/");
});

test.afterAll(async () => {
  await page.close();
});

test("signup", async () => {
  await page.getByRole("link", { name: "Sign up here" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page).toHaveURL("/projects");
});

test("logout", async () => {
  await page.getByRole("button", { name: "Account Menu" }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page).toHaveURL("/login");
});

test("login", async () => {
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL("/projects");
});

test("delete account", async () => {
  await page.getByRole("button", { name: "Account Menu" }).click();
  await page.getByRole("menuitem", { name: "Remove Account" }).click();
  await expect(page).toHaveURL("/login");
});
