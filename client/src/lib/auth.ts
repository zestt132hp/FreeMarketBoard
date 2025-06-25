const TOKEN_KEY = "auth_token";

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),
};

export const createAuthHeaders = (): Record<string, string> => {
  const token = authStorage.getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};
