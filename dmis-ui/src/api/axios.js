import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Attach JWT automatically
API.interceptors.request.use((config) => {
  try {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      console.log("User data from localStorage:", user);
      if (user && user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
        console.log("Authorization header set with token:", user.token);
      }
    }
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
  }
  return config;
});

export default API;
