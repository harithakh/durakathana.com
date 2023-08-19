import express from "express";

import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

//setting view engine to ejs
app.set("view engine", "ejs");

// Define the path to the views directory
app.set("views", path.join(__dirname, "views"));
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

const phoneObjects = [
  { model: "Aquos Sense7", img: "../img/aquos-sense7.jpg" },
  { model: "Iphone 13", img: "../img/iphone-13.jpg" },
];

app.get("/", (req, res) => {
  res.render("index", { phones: phoneObjects });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/reviews", (req, res) => {
  res.render("reviews");
});

app.get("/search", (req, res) => {
  res.render("search");
});

app.get("/account", (req, res) => {
  res.render("account");
});

app.listen(port, () => {
  console.log(`Server runnig on port${port}`);
});
