import { config } from "dotenv";

config();
process.env.NODE_ENV = "test";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("TEST_DATABASE_URL is not set. Copy it from apps/api/.env.example into apps/api/.env.");
process.env.DATABASE_URL = testUrl;
