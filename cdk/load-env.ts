import { config } from "dotenv";
import path = require("path");

const configOutput = config({
  path: path.join(__dirname, "..", ".env"),
});

if (!configOutput.parsed)
  throw "No .env file found, please create one using the .env.example file";
