import { describe, test, expect } from "bun:test";
import "dotenv/config";
import { filterSearchResult } from "./filters.js";

const baseUrl = process.env.DOCMOST_API_URL;
const email = process.env.DOCMOST_EMAIL;
const password = process.env.DOCMOST_PASSWORD;

async function getAuthToken(): Promise<string> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });
  const cookies = response.headers.getSetCookie();
  const authCookie = cookies.find((c) => c.startsWith("authToken="));
  if (!authCookie) throw new Error("No auth token found in cookies");
  return authCookie.match(/^authToken=([^;]+)/)![1];
}

async function searchApi(token: string, query: string, spaceId?: string) {
  const response = await fetch(`${baseUrl}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, ...(spaceId && { spaceId }) }),
  });
  return response.json();
}

describe("search", () => {
  test("returns items array with expected fields", async () => {
    const token = await getAuthToken();
    const data = await searchApi(token, "test");

    expect(data.success).toBe(true);
    expect(data.data.items).toBeArray();
    expect(data.data.items.length).toBeGreaterThan(0);

    const item = data.data.items[0];
    expect(item.id).toBeString();
    expect(item.title).toBeString();
    expect(item.highlight).toBeString();
    expect(typeof item.rank).toBe("number");
    expect(item.space).toBeDefined();
    expect(item.space.id).toBeString();
    expect(item.space.name).toBeString();
  });

  test("filterSearchResult extracts correct fields from API item", async () => {
    const token = await getAuthToken();
    const data = await searchApi(token, "test");
    const raw = data.data.items[0];

    const filtered = filterSearchResult(raw);

    expect(filtered.id).toBe(raw.id);
    expect(filtered.title).toBe(raw.title);
    expect(filtered.rank).toBe(raw.rank);
    expect(filtered.highlight).toBe(raw.highlight);
    expect(filtered.spaceId).toBe(raw.space.id);
    expect(filtered.spaceName).toBe(raw.space.name);
    // Should NOT leak extra fields
    expect(filtered).not.toHaveProperty("slugId");
    expect(filtered).not.toHaveProperty("icon");
    expect(filtered).not.toHaveProperty("creatorId");
  });
});
