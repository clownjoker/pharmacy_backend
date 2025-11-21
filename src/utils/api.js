const API_BASE = "http://localhost:5000/api";

import axios from "axios";
const api = axios.create({
  baseURL: API_BASE,
});
