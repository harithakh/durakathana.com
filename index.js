import express from "express";
import bodyParser from 'body-parser';

import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { rateLimit } from 'express-rate-limit'
import pool from './public/js/dbconnection.js'; // Import the database connection

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const router = express.Router();
const port = 3000;

// Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true }));

//a middleware for Express which is used to limit repeated requests to public APIs 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

//setting view engine to ejs
app.set("view engine", "ejs");

// Define the path to the views directory
app.set("views", path.join(__dirname, "views"));
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

//test
const phoneObjects = [
  { id: 1, model: "Aquos Sense7", img: "../img/aquos-sense7.jpg" },
  { id: 2, model: "Iphone 13", img: "../img/iphone-13.jpg" },
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
    //get data from user_reviews inner join with phones table
    const rows_reviews = await conn.query('SELECT user_reviews.*, phones.model FROM user_reviews LEFT JOIN phones ON user_reviews.phone_id = phones.phone_id ORDER BY post_date DESC LIMIT 4;');
    //release the connection
    conn.release();
    /* dummy data are added to score and number of reviews for testing.
      passing data to home page.*/
    res.render("index", {
      phonesTopRanks: rows_top_ranks,
      phonesMostReviewed: rows_most_reviewed,
      userReviews: rows_reviews
    });
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

app.get("/reviews/:id/:model", async (req, res) => {
  const phoneId = parseInt(req.params.id);
  try {
    const connection = await pool.getConnection();
    await connection.query('USE slmobi');
    const phoneInfo = await connection.query(`SELECT * FROM phones WHERE phone_id=${phoneId};`);
    const userReviews = await connection.query(`SELECT * FROM user_reviews WHERE phone_id=${phoneId};`);
    connection.release();
    //phoneInfo is an array of objects.
    res.render("reviews", { phone_info: phoneInfo[0], user_reviews: userReviews });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/submit', (req, res) =>{
  const uName = req.body.userName;
  const starScore = parseInt(req.body.starScore); 
  const textReview = req.body.reviewText;
  const postDate = new Date().toISOString().split('T')[0];

  console.log(uName);
  console.log(typeof(starScore));
  console.log(textReview);


  res.send('Form submitted successfully!');
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
