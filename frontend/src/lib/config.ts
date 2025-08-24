export const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/v1`;


export const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken");
}

export const createAuthHeaders = (method: string = "GET"): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {};

  if (["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

export const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Network error" }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}
