import express from "express";
import { dirname } from "path"; //to find the file path. need to do this properly
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url)); 

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.sendFile("/home/haritha/Programming/vs code/durakathana/public/index.html");
});

app.listen(port, () => {
  console.log(`Server runnig on port${port}`);
});
