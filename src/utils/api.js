// const API_BASE = "http://localhost:5000/api";

// import axios from "axios";
// const api = axios.create({
//   baseURL: API_BASE,
// });

import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:5000/api",
});

export default api;
