import express from "express";
import bodyParser from 'body-parser';

import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { rateLimit } from 'express-rate-limit'
import pool from './public/js/dbconnection.js';
import session from 'express-session';
import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import multer from 'multer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const router = express.Router();
const port = 3000;

// Load environment variables from a .env file in the same directory
config();

// Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }, // Set the maximum age of the session to one hour
  }));


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

app.get("/reviews/:id/:model/:sort/page/:pNumber", async (req, res) => {
  const phoneId = parseInt(req.params.id);
  const sortBy = req.params.sort;
  const pageNumber = parseInt(req.params.pNumber);

  let startRow = (pageNumber - 1) * 10;
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
        page_number: pageNumber
      });
    } else if (sortBy == 'high_to_low') {

      const [userReviews] = await connection.query(
        `SELECT * FROM user_reviews WHERE phone_id=${phoneId} ORDER BY score DESC LIMIT ${startRow}, ${endRow};`);
      connection.release();

      res.render("reviews", {
        phone_info: phoneInfo[0],
        user_reviews: userReviews,
        phone_specs: specs[0],
        sort_by: "High to low",
        page_number: pageNumber
      });
    } else if (sortBy == 'low_to_high') {

      const [userReviews] = await connection.query(
        `SELECT * FROM user_reviews WHERE phone_id=${phoneId} ORDER BY score ASC LIMIT ${startRow}, ${endRow};`);
      connection.release();

      res.render("reviews", {
        phone_info: phoneInfo[0],
        user_reviews: userReviews,
        phone_specs: specs[0],
        sort_by: "Low to high",
        page_number: pageNumber
      });
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

  // console.log(textReview);
  try {
    const connection = await pool.getConnection();
    await connection.query('USE slmobi');

    const [modelObject] = await connection.query(`SELECT model FROM phones WHERE phone_id=${phoneId};`);
    const modelName = modelObject[0].model;
    // console.log(modelName)

    await connection.query(`
    INSERT INTO pending_reviews
    (post_by, post_date, score, review, phone_id, model)
    VALUES('${uName}', '${postDate}', ${starScore}, '${textReview}', ${phoneId}, '${modelName}');
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

//password hashing, don't remove this comment
// bcrypt.genSalt(10, (err, salt) => {
//   bcrypt.hash('type password here', salt, (err, hash) => {
//     // Store 'hash' securely in your code or a database
//     console.log(hash);
//   });
// });

// A middleware to check authentication
async function authenticate(req, res, next) {
  const password = req.body.accpw;

  try {
    const [queryResult] = await pool.query('SELECT password FROM users WHERE id=1;');
    const hashedPassword = queryResult[0].password;
    const result = await bcrypt.compare(password, hashedPassword);
    if (result) {
      req.session.authenticated = true; // Set an "authenticated" property in the session

      next(); // Passwords match, continue to the account.ejs page
    } else {
      res.status(401).send('Authentication failed'); // Passwords don't match
    }
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).send('Authentication failed');
  }
}

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next(); // User is authenticated
  }
  res.redirect('/log-me'); // Redirect to the login page if not authenticated
}

// This route only renders the login page
app.get("/log-me", (req, res) => {
  res.render("login");
});

app.post("/master_acc", authenticate, (req, res) => {
  res.redirect("/profile");
});

app.get("/profile",isAuthenticated, (req,res) => {
  res.render("account");
});

// Set up Multer for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img');
//   },
//   filename: (req, file, cb) => {
//     cb(null, file.originalname);
//   },
// });

//manage pending and published reviews 
app.get("/edit/:status", isAuthenticated, async (req, res) => {
  const reviewStatus = req.params.status;

  if (reviewStatus == 'pending') {

    try {
      const connection = await pool.getConnection();
      await connection.query('USE slmobi');

      const [pendingReviews] = await connection.query(`SELECT * FROM pending_reviews WHERE is_checked=0 LIMIT 0,15;`)
      // console.log(pendingReviews)

      connection.release();
      res.render("pending-reviews", { pending_reviews: pendingReviews });

    } catch (err) {
      console.log(err.message);
      res.render('errors');
    }
  } else if (reviewStatus == 'published') {
    //published reviews can be edited here.
  } else if (reviewStatus == 'add_phone') {
    //add phone page
    res.render("add-phone");
  }
});

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname + '/public/img');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// 1st step uploading a new phone. model, brand and image.
app.post('/upload-phone-step-one', upload.single('phone_image'), async (req, res) => {
  const phoneModel = req.body.phone_model;
  const phoneBrand = req.body.phone_brand;
  
  if (req.file) {
    const imageName = req.file.filename;
    try {
      const connection = await pool.getConnection();

      await connection.query(`
      INSERT INTO phones 
      (model, brand, img)
      VALUES('${phoneModel}', '${phoneBrand}', '${imageName}');`);

      const [phoneIdModel] = await connection.query(`
      SELECT phone_id, model FROM phones
      ORDER BY phone_id DESC
      LIMIT 1;`);

      connection.release();
      res.render("add-phone-specs", {phone_id_and_model: phoneIdModel[0]});
    }catch (err) {
      console.log(err.message);
      res.render('errors');
    }
  } else {
    throw 'File upload not successful!';
  }
});

// 2nd step of adding a new phone
app.post('/upload-phone-step-two/:id/:model',async (req, res)=>{
  const phoneId = parseInt(req.params.id);
  const phoneModel = req.params.model;

  // console.log(req.body)
  try {
    const connection = await pool.getConnection();

    await connection.query(`
    INSERT INTO specs 
    (phone_id, model, release_date, dimensions, weight, display_size, os, chipset, internal_memory, main_cam, selfie_cam, battery)
    VALUES('${phoneId}', 
          '${phoneModel}', 
          '${req.body.release_date}',
          '${req.body.phone_dimensions}',
          '${req.body.phone_weight}',
          '${req.body.phone_display_size}',
          '${req.body.phone_os}',
          '${req.body.phone_chipset}',
          '${req.body.phone_internal_memory}',
          '${req.body.phone_main_cam}',
          '${req.body.phone_selfie_cam}',
          '${req.body.phone_battery}');`);

    connection.release();
    res.send('<div><h3>Phone added!</h3><a href="/profile">Goto Profile</a></div>');
  }catch (err) {
    console.log(err.message);
    res.render('errors');
  }

});


app.get("/action/:action_to_take/:r_id", isAuthenticated, async (req, res) => {
  const revId = req.params.r_id;
  const action = req.params.action_to_take;

  try {
    const connection = await pool.getConnection();
    await connection.query('USE slmobi');

    if (action == 'publish') {
      // get review from pending_reviews table
      const [pendingReview] = await connection.query(`SELECT * FROM pending_reviews WHERE rev_id=${revId};`)
      // console.log(pendingReview[0].post_date.toISOString().split('T')[0])

      const score = pendingReview[0].score;
      const phoneId = pendingReview[0].phone_id;

      // save review to user_reviews table
      if (pendingReview[0].is_posted == 0) {
        await connection.query(`
        INSERT INTO user_reviews
        (r_id, post_by, post_date, score, review, phone_id, model)
        VALUES(${pendingReview[0].rev_id},
                '${pendingReview[0].post_by}', 
                '${pendingReview[0].post_date.toISOString().split('T')[0]}', 
                ${score}, 
                '${pendingReview[0].review}',
                ${phoneId},
                '${pendingReview[0].model}');
                `);

        // update score and number_of_reviews columns in phones table
        const [phoneStat] = await connection.query(`SELECT score,number_of_reviews FROM phones
                                                    WHERE phone_id=${phoneId}`);

        let meanScore = phoneStat[0].score;
        let numberOfReviews = phoneStat[0].number_of_reviews;
        // calculate new mean score
        meanScore = ((meanScore * numberOfReviews) + score) / (numberOfReviews + 1);
        //update columns on phones table
        await connection.query(`UPDATE phones SET 
                                score=${meanScore}, 
                                number_of_reviews=${numberOfReviews + 1}
                                WHERE phone_id=${phoneId}`);

        // delete review from pending_reviews after saving to user_reviews
        await connection.query(`DELETE FROM pending_reviews WHERE rev_id=${revId};`);
        res.send('Posted ✔️ ✔️ ');
      }
    } else if (action == 'reject') {

      await connection.query(`UPDATE pending_reviews SET is_checked = 1 WHERE rev_id=${revId};`);
      res.send('Rejected! ❌❌');
    }

    connection.release();
    // res.render("pending-reviews", {pending_reviews: pendingReviews});

  } catch (err) {
    console.log(err.message);
    res.render('errors');
  }

});

app.listen(port, () => {
  console.log(`Server runnig on port${port}`);
});
