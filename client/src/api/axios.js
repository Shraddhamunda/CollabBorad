
import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const isAuthPage =
        window.location.pathname === "/login" ||
        window.location.pathname === "/signup";

      if (!isAuthPage) {
        window.location.replace("/signup");
      }
    }

    return Promise.reject(error);
  }
);

export default API;
