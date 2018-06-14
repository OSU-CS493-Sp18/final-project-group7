const router = require('express').Router();
const validation = require('../lib/validation');

// Verification schema for consoles
const addConsoleReviewSchema = {
    consoleID:  { required: true },
    userID:     { required: true },
    rating:     { required: true },    
    review:     { required: false }
};

const updateConsoleReviewSchema = {
    consoleID:  { required: true },
    userID:     { required: true },
    rating:     { required: true },    
    review:     { required: false }
};

// Check if user has reviewed this console previously.
function existingReviewByUser(userID, consoleID, pool) {
  return new Promise((resolve, reject) => {
    pool.query(
      'SELECT COUNT(*) AS count FROM consolereviews WHERE userID = ? AND consoleID = ?',
      [ userID, consoleID ],
      function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve(results[0].count > 0);
        }
      }
    );
  });
}

// Add a new console review to the console reviews SQL database.
function insertNewConsoleReview(review, pool) {
  return new Promise((resolve, reject) => {
    review = validation.extractValidFields(review, addConsoleReviewSchema);
    pool.query(
      'INSERT INTO consolereviews SET ?',
      review,
      function (err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result.insertId);
        }
      }
    );
  });
}

// Route for posting a new console review.
router.post('/', function (req, res) {
  const pool = req.app.locals.mysqlPool;
  if (validation.validateAgainstSchema(req.body, addConsoleReviewSchema)) {
    existingReviewByUser(req.body.userID, req.body.consoleID, pool)
      .then((hasUserReviewed) => {
        if (hasUserReviewed) {
          return Promise.reject(403);
        } else {
          return insertNewConsoleReview(req.body, pool);
        }
      })
      .then((id) => {
        res.status(201).json({
          id: id,
          links: {
            console_review: `/console_reviews/${id}`,
            console: `/console/${req.body.consoleID}`
          }
        });
      })
      .catch((err) => {
        if (err === 403) {
          res.status(403).json({
            error: "User has already posted a review for this console."
          });
        } else {
          console.log(err);
          res.status(500).json({
            error: "Error inserting review into DB.  Please try again later."
          });
        }
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid review object."
    });
  }
});

// Updates console review info by ID.
function updateConsoleReviewByID(id, info, pool){
  return new Promise((resolve, reject) => {
    info = validation.extractValidFields(info, updateConsoleReviewSchema);
    pool.query('UPDATE consolereviews SET ? WHERE reviewID = ?',
    [ info, id ],
    function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
} 

// Route to update a console review by reviewID
router.put('/:reviewID', function(req, res, next) {
  const pool = req.app.locals.mysqlPool;
  const reviewID = parseInt(req.params.reviewID);
  if (validation.validateAgainstSchema(req.body, updateConsoleReviewSchema)) {
    let updatedReview = validation.extractValidFields(req.body, updateConsoleReviewSchema);
    getReviewByID(reviewID, pool)
      .then((existingReview) => {
        if (existingReview) {
          if (updatedReview.consoleID === existingReview.consoleID && updatedReview.userID === existingReview.userID) {
            return updateConsoleReviewByID(reviewID, updatedReview, pool);
          } else {
            return Promise.reject(403);
          }
        } else {
          next();
        }
      })
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              console: `/consoles/${updatedReview.consoleID}`,
              review: `/reviews/${reviewID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
        console.log(err);
        if (err === 403) {
          res.status(403).json({
            error: "Updated review must have the same consoleID and userID"
          });
        } else {
          res.status(500).json({
            error: "Unable to update review.  Please try again later."
          });
        }
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid review object."
    });
  }
});

// Delete console review by reviewID.
function deleteConsoleReviewByID(id, pool) {
  return new Promise((resolve, reject) => {
    pool.query('DELETE FROM consolereviews WHERE reviewID = ?',
    [ id ],
    function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
}

// Route to delete a console review by reviewID.
router.delete('/:reviewID', function (req, res, next) {
  const pool = req.app.locals.mysqlPool;
  const reviewID = parseInt(req.params.reviewID);
  deleteConsoleReviewByID(reviewID, pool)
    .then((deleteSuccessful) => {
      if (deleteSuccessful) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to delete review.  Please try again later."
      });
    });
});

// Function to retrieve information about a specific review by reviewID.
function getReviewByID(id, pool) {
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM consolereviews WHERE reviewID = ?',
    [ id ],
    function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
}

// Route for getting a specific console review by reviewID
router.get('/:reviewID', function (req, res, next) {
  const pool = req.app.locals.mysqlPool;
  const reviewID = parseInt(req.params.reviewID);
  getReviewByID(reviewID, pool)
    .then((review) => {
      if (review) {
        res.status(200).json(review);
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to fetch review.  Please try again later."
      });
    });
});

function getConsoleReviewsByUserID(id, pool) {
  return new Promise((resolve, reject) => {
    pool.query(
      'SELECT * FROM consolereviews WHERE userID = ?',
      [ id ],
      function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
}

function getReviewsByConsoleID(id, pool){
  return new Promise((resolve, reject) => {
    pool.query(
      'SELECT * FROM consolereviews WHERE consoleID = ?',
      [ id ],
      function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
}

exports.getConsoleReviewsByUserID = getConsoleReviewsByUserID;
exports.getConsoleReviewsByConsoleID = getReviewsByConsoleID;
exports.router = router;