import { test, expect } from "@playwright/test";

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
