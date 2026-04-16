import { describe, test, expect, mock, beforeEach } from "bun:test";
import axios from "axios";
import { performLogin } from "./auth-utils.js";
import * as authUtils from "./auth-utils.js";

mock.module("axios", () => ({
  default: {
    post: mock(),
    isAxiosError: (e: any) => e?.isAxiosError === true,
  },
}));

const mockedPost = axios.post as ReturnType<typeof mock>;

beforeEach(() => {
  mockedPost.mockReset();
});

describe("performLogin", () => {
  test("returns authToken from Set-Cookie header", async () => {
    mockedPost.mockResolvedValueOnce({
      data: { success: true, status: 200 },
      headers: {
        "set-cookie": [
          "mfaToken=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax",
          "authToken=test-token-123; Path=/; HttpOnly; Secure; SameSite=Lax",
        ],
      },
    });

    const token = await performLogin("http://localhost:3000", "a@b.com", "pw");
    expect(token).toBe("test-token-123");
    expect(mockedPost).toHaveBeenCalledWith(
      "http://localhost:3000/auth/login",
      {
        email: "a@b.com",
        password: "pw",
      },
    );
  });

  test("does not export getCollabToken", () => {
    expect("getCollabToken" in authUtils).toBe(false);
  });

  test("throws when response has no authToken cookie", async () => {
    mockedPost.mockResolvedValueOnce({
      data: { success: true, status: 200 },
      headers: {
        "set-cookie": ["mfaToken=; Max-Age=0; Path=/; SameSite=Lax"],
      },
    });

    expect(
      performLogin("http://localhost:3000", "a@b.com", "pw"),
    ).rejects.toThrow("No authToken found in login response cookies");
  });
});
