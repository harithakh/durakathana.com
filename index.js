import express from "express";

import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pool from './public/js/dbconnection.js'; // Import the database connection

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

app.get("/", async (req, res) => {
  //getting data from db
  try {
    const conn = await pool.getConnection();

    // Select the database
    await conn.query('USE slmobi');
    //get top ranking phones
    const rows_top_ranks = await conn.query('SELECT * FROM phones ORDER  BY score DESC LIMIT 8;');
    //get most reviewed phones
    const rows_most_reviewed = await conn.query('SELECT * FROM phones ORDER  BY number_of_reviews DESC LIMIT 8;');

    conn.release(); //release the connection
    // console.log(rows)
    // res.json(rows);
    /* dummy data are added to sore and number of reviews for testing.
      passing data to home page.*/
    res.render("index", { phonesTopRanks: rows_top_ranks, phonesMostReviewed: rows_most_reviewed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }

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
