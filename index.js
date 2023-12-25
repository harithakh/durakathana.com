import express from "express";
import bodyParser from 'body-parser';

import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { rateLimit } from 'express-rate-limit'
import pool from './public/js/dbconnection.js';
import scraper from './public/js/scraper.js';
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
      const [userReviews] = await connection.
        query(`SELECT * FROM user_reviews WHERE phone_id=${phoneId} ORDER BY post_date ASC LIMIT ${startRow}, ${endRow};`);
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
    res.redirect('/review_feedback');

  } catch (err) {
    // res.status(500).json({ error: err.message });
    console.log(err.message);
    res.render('errors');
  }

});

//show feedback message
app.get('/review_feedback', (req, res) => {
  res.render('feedback');
})

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
app.get('/brand/:brand/page/:pNumber', async (req, res) => {
  const phoneBrand = req.params.brand;
  const pageNumber = parseInt(req.params.pNumber);
  // console.log(PhoneBrand);

  let startRow = (pageNumber - 1) * 20;
  let endRow = startRow + 20;
  try {
    const connection = await pool.getConnection();
    await connection.query('USE slmobi');

    const [brandResults] = await connection.
      query(`SELECT * FROM phones WHERE brand='${phoneBrand}' ORDER BY release_date DESC LIMIT ${startRow}, ${endRow};`)
    // console.log(brandResults.length);
    connection.release();

    res.render("brand-results", { search_results: brandResults, phone_brand: phoneBrand, page_number: pageNumber });
  } catch (err) {
    console.log(err.message);
    res.render('errors');
  }
});

//phone suggest page
app.get('/suggest_device', (req, res) => {
  res.render('suggest-a-device');
});

app.get('/sumbit_suggested_device', async (req, res) => {
  const userInputModel = req.query.modelSuggestion;

  //replace symbols other than lettes, numbers and dots. 
  const regex = /[^a-zA-Z0-9. ]/g;
  const modelSanitizedString = userInputModel.replace(regex, '');

  const sql = 'INSERT INTO device_suggestions (suggested_model) VALUES (?)';
  await pool.query(sql, [modelSanitizedString])

  // Use a status code of 204 to indicate success with no content
  res.status(204).end();
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

app.get("/profile", isAuthenticated, (req, res) => {
  res.render("admin/account");
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
      res.render("admin/pending-reviews", { pending_reviews: pendingReviews });

    } catch (err) {
      console.log(err.message);
      res.render('errors');
    }
  } else if (reviewStatus == 'published') {
    //published reviews can be edited here.
  } else if (reviewStatus == 'add_phone') {
    //add phone page
    res.render("admin/add-phone");
  } else if (reviewStatus == 'add_phone_scraping') {
    // scraping link adding page
    res.render("admin/add-phone-scraping-link");
  } else if (reviewStatus == 'phone_suggestions') {
    // see phone suggetions by users
    try {
      const connection = await pool.getConnection();
      await connection.query('USE slmobi');

      const [phoneSuggestions] = await connection.query(`SELECT * FROM device_suggestions`)
      console.log(phoneSuggestions)

      connection.release();
      res.render("admin/phone-suggestions", { phone_suggestions: phoneSuggestions });

    } catch (err) {
      console.log(err.message);
      res.render('errors');
    }

  }
});

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname + '/public/img/phones');
  },
  filename: (req, file, cb) => {
    const originalname = path.parse(file.originalname).name; // Extract the original filename without extension
    const extension = path.extname(file.originalname); // Extract the file extension
    const newFilename = originalname + '-slm' + extension;
    cb(null, newFilename);
  },
});

const upload = multer({ storage });

// 1st step uploading a new phone. model, brand and image.
app.post('/upload-phone-step-one', upload.single('phone_image'), async (req, res) => {
  const phoneModel = req.body.phone_model;
  const phoneBrand = req.body.phoneBrand;
  const releaseDate = req.body.release_date;

  if (req.file) {
    const imageName = req.file.filename;
    try {
      const connection = await pool.getConnection();

      await connection.query(`
      INSERT INTO phones 
      (model, brand, img, release_date)
      VALUES('${phoneModel}', '${phoneBrand}', '${imageName}', '${releaseDate}');`);

      const [phoneIdModel] = await connection.query(`
      SELECT phone_id, model FROM phones
      ORDER BY phone_id DESC
      LIMIT 1;`);

      connection.release();
      res.render("admin/add-phone-specs", { phone_id_and_model: phoneIdModel[0] });
    } catch (err) {
      console.log(err.message);
      res.render('errors');
    }
  } else {
    throw 'File upload not successful!';
  }
});

// 2nd step of adding a new phone
app.post('/upload-phone-step-two/:id/:model', async (req, res) => {
  const phoneId = parseInt(req.params.id);
  const phoneModel = req.params.model;

  // console.log(req.body)
  try {
    const connection = await pool.getConnection();

    await connection.query(`
    INSERT INTO specs 
    (phone_id, model, release_date, dimensions, weight, display_size, os, chipset, internal_memory, main_cam, selfie_cam, battery)
    VALUES(${phoneId}, 
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
  } catch (err) {
    console.log(err.message);
    res.render('errors');
  }

});

//upload phone with scraping get link
app.post('/scrap-link', async (req, res) => {
  const url = req.body.phoneLink

  //getting next auto increment id
  try {
    const connection = await pool.getConnection();

    //getting next auto increment id of the phones table
    const [dbStatus] = await connection.query('SHOW TABLE STATUS LIKE \'phones\'');

    //scraping data using scraper function
    const extractedData = await scraper(url);

    //check for duplicates
    const [checkAvailable] = await connection
      .query(`SELECT phone_id FROM phones WHERE model='${extractedData.model}'`); 

    let similarModel = 0;
    if (checkAvailable.length>0){
      similarModel = checkAvailable[0].phone_id
    }
    connection.release();

    // console.log(checkAvailable);
    res.render("admin/add-phone-scraping-submit", { extracted_phone_data: extractedData, 
      next_id: dbStatus[0].Auto_increment, phone_available: similarModel});
  
  } catch (err) {
    console.log(err.message);
    res.render('errors');
  }

});


//save scrapped phone data into the db
app.post('/save-scrapped-phone',upload.single('phone_image_scrap'), async (req, res) => {

  const imageName = req.file.filename;
  if (req.file) {
    
    try {
      const connection = await pool.getConnection();
  
      const [dbStatus] = await connection.query('SHOW TABLE STATUS LIKE \'phones\'');
      const nextId = dbStatus[0].Auto_increment; //next available id in phones.
  
      await connection.query(`
        INSERT INTO phones 
        (phone_id, model, brand, img, release_date)
        VALUES(${nextId},
          '${req.body.phone_model_scrap}', 
          '${req.body.phone_brand_scrap}', 
          '${imageName}', 
          '${req.body.release_date_scrap}');`);
  
  
      await connection.query(`
      INSERT INTO specs 
      (phone_id, model, release_date, dimensions, weight, display_size, os, chipset, internal_memory, main_cam, selfie_cam, battery)
      VALUES(${nextId}, 
            '${req.body.phone_model_scrap}', 
            '${req.body.release_date_scrap_input}',
            '${req.body.phone_dimensions_scrap}',
            '${req.body.phone_weight_scrap}',
            '${req.body.phone_display_size_scrap}',
            '${req.body.phone_os_scrap}',
            '${req.body.phone_chipset_scrap}',
            '${req.body.phone_internal_memory_scrap}',
            '${req.body.phone_maincam_scrap}',
            '${req.body.phone_selfiecam_scrap}',
            '${req.body.phone_battery_scrap}');`);
  
      connection.release();
      res.send('<div><h3>Phone added!</h3><a href="/profile">Goto Profile</a></div>');
    } catch (err) {
      console.log(err.message);
      res.render('errors');
    }
  }else {
    console.log('No file selected')
    res.render('errors');
  }

});

//master page actions
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
    } else if (action == 'delete') {
      await connection.query(`DELETE FROM pending_reviews WHERE rev_id=${revId};`);
      res.send('Deleted! ⛔⛔');
    }

    connection.release();
    // res.render("pending-reviews", {pending_reviews: pendingReviews});

  } catch (err) {
    console.log(err.message);
    res.render('errors');
  }

});

// terms and conditions 
app.get("/q/:term", (req, res) => {
  const term = req.params.term;
  res.render('legal', { page_content: term });
});

app.listen(port, () => {
  console.log(`Server runnig on port${port}`);
});
