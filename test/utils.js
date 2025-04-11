const BACKEND_URL = "http://localhost:3001";

export async function backendRequest(context, method, url, options) {
  const response = await context.request[method](
    `${BACKEND_URL}${url}`,
    options,
  );
  if (!response.ok()) {
    throw new Error(
      "Failed backend request:\n" +
        method +
        " " +
        url +
        " -> " +
        response.status() +
        "\n" +
        (await response.text()),
    );
  }
  if (Number(response.headers()["content-length"]) > 0) {
    return await response.json();
  }
}

export async function createTestAccounts(browser) {
  return Object.fromEntries(
    await Promise.all(
      ["owner", "reviewer"].map(async (role) => {
        const context = await browser.newContext();
        const email =
          role + "-" + Math.random().toString(36).substring(7) + "@example.com";
        await backendRequest(context, "post", `/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          data: {
            email,
            password: "12341234",
          },
        });
        const page = await context.newPage();
        return [role, { context, email, page }];
      }),
    ),
  );
}

export async function removeTestAccounts(accounts) {
  return Promise.all(
    Object.values(accounts).map(async ({ context, page }) => {
      await context.request.post(`${BACKEND_URL}/auth/remove-account`);
      await page.close();
    }),
  );
}
