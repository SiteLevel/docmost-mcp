import { describe, test, expect } from "bun:test";
import "dotenv/config";

const baseUrl = process.env.DOCMOST_API_URL;
const email = process.env.DOCMOST_EMAIL;
const password = process.env.DOCMOST_PASSWORD;

describe("auth integration", () => {
  test("login endpoint returns authToken in Set-Cookie", async () => {
    if (!baseUrl || !email || !password) {
      throw new Error(
        "Missing DOCMOST_API_URL, DOCMOST_EMAIL, or DOCMOST_PASSWORD in .env",
      );
    }

    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      redirect: "manual",
    });

    expect(response.status).toBe(200);

    const cookies = response.headers.getSetCookie();
    const authCookie = cookies.find((c) => c.startsWith("authToken="));
    expect(authCookie).toBeTruthy();

    const token = authCookie!.match(/^authToken=([^;]+)/)![1];
    expect(token.split(".").length).toBe(3);
  });
});
