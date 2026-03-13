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

    const accessToken = response.data?.data?.tokens?.accessToken;
    if (!accessToken) {
      throw new Error("No accessToken found in login response");
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
