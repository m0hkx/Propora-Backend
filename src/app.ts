import express, { type Express, type Request, type Response } from 'express';
import usersRouter from "./routes/users.routes.js";
import { MongoClient } from 'mongodb';
import dotenv from "dotenv"

dotenv.config();

const app: Express = express();
const port: number = 3000;

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.use("/users", usersRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

async function runGetStarted() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not defiend");
  }

  const client = new MongoClient(uri);
  
  try {
    const database = client.db('property_management');
    const users = database.collection('users');
    const selectedUser = await users.findOne({username: "test"});
    console.log(selectedUser);
  } finally {
    await client.close();
  }
}

runGetStarted().catch(console.dir);