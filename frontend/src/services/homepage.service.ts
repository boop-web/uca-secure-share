import axios from "axios";
import { HomepageDto } from "../types/homepage.type";

const homepageService = {
  get: async () => {
    const response = await axios.get("/api/homepage");
    return response.data;
  },
  update: async (data: HomepageDto) => {
    const response = await axios.put("/api/homepage", data);
    return response.data;
  },
};

export default homepageService;
