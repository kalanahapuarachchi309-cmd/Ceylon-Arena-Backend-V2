import app from "../src/app";
import connectDB from "../src/config/db";

export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}
