import axios from "axios";

export async function performLogin(
  baseUrl: string,
  email: string,
  password: string,
): Promise<string> {
  try {
    const response = await axios.post(`${baseUrl}/auth/login`, {
      email,
      password,
    });

    // Token is now in Set-Cookie header as authToken=...
    const cookies: string[] = response.headers["set-cookie"] ?? [];
    let accessToken: string | undefined;
    for (const cookie of cookies) {
      const match = cookie.match(/^authToken=([^;]+)/);
      if (match) {
        accessToken = match[1];
        break;
      }
    }
    if (!accessToken) {
      throw new Error("No authToken found in login response cookies");
    }
    return accessToken;
  } catch (error: any) {
    console.error(
      "Login failed:",
      axios.isAxiosError(error) ? error.response?.data : error.message,
    );
    throw error;
  }
}
