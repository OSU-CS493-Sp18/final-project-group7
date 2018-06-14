const router = require('express').Router();
const validation = require('../lib/validation');

const { getConsoleReviewsByConsoleID } = require('./console_reviews');

// Verification schema for consoles
const addConsoleSchema = {
    name:           { required: true },
    price:          { required: true },
    tvrequirements: { required: true }
};

const updateConsoleSchema = {
    name:           { required: false },
    price:          { required: false },
    tvrequirements: { required: false }
};


// Add a new console to the consoles SQL database.
function insertNewConsole(info, pool) {
  return new Promise((resolve, reject) => {
    consoleObj = {
      consoleID:      null,
      rating:         null,
      name:           info.name,
      price:          info.price,
      tvrequirements: info.tvrequirements
    };
    pool.query(
      'INSERT INTO consoles SET ?',
      consoleObj,
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

// Route for posting a new console.
router.post('/', function (req, res, next) {
  const pool = req.app.locals.mysqlPool;
  if (validation.validateAgainstSchema(req.body, addConsoleSchema)) {
    insertNewConsole(req.body, pool)
      .then((consoleID) => {
        res.status(201).json({
          id: consoleID,
          links: {
            console: `/consoles/${consoleID}`
          }
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({
          error: "Error inserting console into DB.  Please try again later."
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid console object."
    });
  }
});

// Updates console info by ID.
function updateConsoleByID(id, info, pool){
  return new Promise((resolve, reject) => {
    info = validation.extractValidFields(info, updateConsoleSchema);
    consoleObj = {
      consoleID:      id,
      name:           info.name,
      price:          info.price,
      tvrequirements: info.tvrequirements
    };
    pool.query('UPDATE consoles SET ? WHERE consoleID = ?',
    [ consoleObj, id ],
    function (err, result) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    }
    );
  });
} 

// Route to update a new console by consoleID
router.put('/:consoleID', function(req, res, next) {
  const pool = req.app.locals.mysqlPool;
  const consoleID = parseInt(req.params.consoleID);
  console.log(validation.validateAgainstSchema(req.body, updateConsoleSchema));
  if (validation.validateAgainstSchema(req.body, updateConsoleSchema)) {
    console.log(consoleID);
    updateConsoleByID(consoleID, req.body, pool)
      .then((updateSuccessful) => {
        console.log(updateSuccessful);
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              console: `/consoles/${consoleID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({
          error: "Unable to update console."
        });
      });
  } else {
    res.status(400).json({
      error: "Please fill out all required fields."
    });
  }
});

// Delete console by consoleID.
function deleteConsoleByID(id, pool) {
  return new Promise((resolve, reject) => {
    pool.query(
      'DELETE FROM consoles WHERE consoleID = ?',
      [ id ],
      function (err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result.affectedRows > 0);
        }
      }
    );
  });
}

// Route to delete a console by consoleID.
router.delete('/:consoleID', function (req, res, next) {
  const consoleID = parseInt(req.params.consoleID);
  const pool = req.app.locals.mysqlPool;
  deleteConsoleByID(consoleID, pool)
    .then((deleteSuccessful) => {
      if (deleteSuccessful) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to delete console."
      });
    });
});

// Function to retrieve information about a specific console.
function getConsoleByID(id, pool) {
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM consoles WHERE consoleID = ?', [ id ], function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
}

// Route for getting a specific console by consoleID
router.get('/:consoleID', function (req, res, next) {
  const pool = req.app.locals.mysqlPool;
  var consoleObj;
  var consoleReviewsObj;

  getConsoleByID(req.params.consoleID, pool)
  .then((cons) => {
    if (cons) {
      consoleObj = cons;
      return getConsoleReviewsByConsoleID(req.params.consoleID, pool)
      .then((consoleReviews) => {
        if(consoleReviews){
          consoleReviewsObj = consoleReviews;
          res.status(200).json({
            console:        consoleObj,
            consoleReviews: consoleReviewsObj
          });
        }
      });
    } else {
      next();
    }
  })
  .catch((err) => {
    res.status(500).json({
      error: "Failed to fetch console."
    });
  });
});


// Support functions for getting paginated console list.
// Get a console count, to help with pagincation.
function getConsoleCount(pool){
  return new Promise((resolve, reject) => {
    pool.query('SELECT COUNT(*) AS count FROM consoles', function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0].count);
      }
    });
  });
}

// Get a page for the paginated list.
function getConsolePage(page, totalCount, pool){
  return new Promise((resolve, reject) => {
    /*
     * Compute last page number and make sure page is within allowed bounds.
     * Compute offset into collection.
     */
    const numPerPage = 10;
    const lastPage = Math.max(Math.ceil(totalCount / numPerPage), 1);
    page = page < 1 ? 1 : page;
    page = page > lastPage ? lastPage : page;
    const offset = (page - 1) * numPerPage;

    pool.query(
      'SELECT * FROM consoles ORDER BY consoleID LIMIT ?,?',
      [ offset, numPerPage ],
      function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve({
            console: results,
            pageNumber: page,
            totalPages: lastPage,
            pageSize: numPerPage,
            totalCount: totalCount
          });
        }
      }
    );
  });
}

// Route for paginated list of consoles.
router.get('/', function(req, res) {
  const pool = req.app.locals.mysqlPool;
  getConsoleCount(pool)
    .then((count) => {
      return getConsolePage(parseInt(req.query.page) || 1, count, pool);
    })
    .then((consolePageInfo) => {
      /*
       * Generate HATEOAS links for surrounding pages and then send response.
       */
      consolePageInfo.links = {};
      let { links, pageNumber, totalPages } = consolePageInfo;
      if (pageNumber < totalPages) {
        links.nextPage = `/consoles?page=${pageNumber + 1}`;
        links.lastPage = `/consoles?page=${totalPages}`;
      }
      if (pageNumber > 1) {
        links.prevPage = `/consoles?page=${pageNumber - 1}`;
        links.firstPage = '/consoles?page=1';
      }
      res.status(200).json(consolePageInfo);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        error: "Error fetching consoles list.  Please try again later."
      });
    });
});

exports.router = router;