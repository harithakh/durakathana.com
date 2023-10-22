import express from "express";
import bodyParser from 'body-parser';

import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { rateLimit } from 'express-rate-limit'
import pool from './public/js/dbconnection.js';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const router = express.Router();
const port = 3000;

// Load environment variables from a .env file in the same directory
config();

// Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true }));

//a middleware for Express which is used to limit repeated requests to public APIs 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

//setting view engine to ejs
app.set("view engine", "ejs");

// Define the path to the views directory
app.set("views", path.join(__dirname, "views"));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

app.get("/", async (req, res) => {
  //getting data from db
  try {
    //get top ranking phones
    const [rowsTopRanks] = await pool.query('SELECT * FROM phones ORDER BY score DESC LIMIT 8');

    //get most reviewed phones
    const [rowsMostReviewed] = await pool.query('SELECT * FROM phones ORDER  BY number_of_reviews DESC LIMIT 8;');

    //get data from user_reviews inner join with phones table
    const [rowsReviews] = await pool.query('SELECT user_reviews.*, phones.model FROM user_reviews LEFT JOIN phones ON user_reviews.phone_id = phones.phone_id ORDER BY post_date DESC LIMIT 4;')

    /* dummy data are added to score and number of reviews for testing.
      passing data to home page.*/
    res.render("index", {
      phonesTopRanks: rowsTopRanks,
      phonesMostReviewed: rowsMostReviewed,
      userReviews: rowsReviews
    });
  } catch (err) {
    // res.status(500).json({ error: err.message });
    console.log(err.message);
    res.render('errors');
  }

});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/reviews/:id/:model/:sort/page/:pNumber", async (req, res) => {
  const phoneId = parseInt(req.params.id);
  const sortBy = req.params.sort;
  const pageNumber = parseInt(req.params.pNumber);
  
  let startRow = (pageNumber - 1)*10;
  let endRow = startRow + 10;
  

  try {
    const connection = await pool.getConnection();
    await connection.query('USE slmobi');

    //phoneInfo is an array of objects.
    const [phoneInfo] = await connection.query(`SELECT * FROM phones WHERE phone_id=${phoneId};`);
    const [specs] = await connection.query(`SELECT * FROM specs WHERE phone_id=${phoneId}`);

    if (sortBy == 'latest') {

      const [userReviews] = await connection.query(
        `SELECT * FROM user_reviews WHERE phone_id=${phoneId} ORDER BY post_date DESC LIMIT ${startRow}, ${endRow};`);
      // console.log(userReviews.length)
      connection.release();
      // console.log(specs[0].phone_id);
      res.render("reviews", {
        phone_info: phoneInfo[0],
        user_reviews: userReviews,
        phone_specs: specs[0],
        sort_by: "Latest first",
        page_number: pageNumber
      });
    } else if (sortBy == 'oldest') {

      const [userReviews] = await connection.query(
        `SELECT * FROM user_reviews WHERE phone_id=${phoneId} ORDER BY post_date ASC LIMIT ${startRow}, ${endRow};`);
      connection.release();

      res.render("reviews", { 
        phone_info: phoneInfo[0], 
        user_reviews: userReviews, 
        phone_specs: specs[0], 
        sort_by: "Oldest first",
        page_number: pageNumber });
    } else if (sortBy == 'high_to_low') {

      const [userReviews] = await connection.query(
        `SELECT * FROM user_reviews WHERE phone_id=${phoneId} ORDER BY score DESC LIMIT ${startRow}, ${endRow};`);
      connection.release();

      res.render("reviews", { 
        phone_info: phoneInfo[0], 
        user_reviews: userReviews, 
        phone_specs: specs[0], 
        sort_by: "High to low",
        page_number: pageNumber });
    } else if (sortBy == 'low_to_high') {

      const [userReviews] = await connection.query(
        `SELECT * FROM user_reviews WHERE phone_id=${phoneId} ORDER BY score ASC LIMIT ${startRow}, ${endRow};`);
      connection.release();

      res.render("reviews", { 
        phone_info: phoneInfo[0], 
        user_reviews: userReviews, 
        phone_specs: specs[0], 
        sort_by: "Low to high",
        page_number: pageNumber });
    }


  } catch (err) {
    // res.status(500).json({ error: 'Internal Server Error' });
    console.log(err.message);
    res.render('errors');
  }
});

//review submit
app.post('/submit/:id', async (req, res) => {
  const uName = req.body.userName;
  const phoneId = parseInt(req.params.id);
  const postDate = new Date().toISOString().split('T')[0];
  const starScore = parseInt(req.body.starScore);
  const textReview = req.body.reviewText;

  console.log(uName);
  console.log(textReview);
  try {
    const connection = await pool.getConnection();
    await connection.query('USE slmobi');

    await connection.query(`
    INSERT INTO pending_reviews
    (post_by, post_date, score, review, phone_id)
    VALUES('${uName}', '${postDate}', ${starScore}, '${textReview}', ${phoneId});
    `);

    connection.release();
    res.render('feedback');

  } catch (err) {
    // res.status(500).json({ error: err.message });
    console.log(err.message);
    res.render('errors');
  }

});

//search
app.get("/search", async (req, res) => {
  const searchQuery = req.query.searchQuery;
  //search logic mus be added. prevent sql injections

  //replace symbols other than lettes, numbers and dots. 
  const regex = /[^a-zA-Z0-9. ]/g;
  const sanitizedString = searchQuery.replace(regex, '');

  const sql = 'SELECT * FROM phones WHERE model LIKE ?';
  const searchPattern = `%${sanitizedString}%`;

  try {
    const [rows] = await pool.query(sql, [searchPattern])
    res.render("search", { search_results: rows });
  } catch (err) {
    console.log(err.message);
    res.render('errors')
  }
});

//get brands
app.get('/brand/:brand', async (req, res) => {
  const PhoneBrand = req.params.brand;
  // console.log(PhoneBrand);
  try {
    const connection = await pool.getConnection();
    await connection.query('USE slmobi');

    const [brandResults] = await connection.query(`SELECT * FROM phones WHERE brand='${PhoneBrand}';`)
    // console.log(brandResults[0])
    res.render('search', { search_results: brandResults });
  } catch (err) {
    console.log(err.message);
    res.render('errors');
  }
});

app.get('/suggest-a-device', (req, res) => {
  res.render('suggest-a-device');
});

app.get("/account", (req, res) => {
  res.render("account");
});

app.listen(port, () => {
  console.log(`Server runnig on port${port}`);
});
