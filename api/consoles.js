const router = require('express').Router();
const validation = require('../lib/validation');

exports.router = router;

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
      consoleID:      Snull,
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
            id: `/consoles/${id}`
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
    consoleInfo = validation.extractValidFields(info, updateConsoleSchema);
    consoleObj = {
      consoleID:      id,
      name:           info.name,
      price:          info.price,
      tvrequirements: info.tvrequirements
    };
    pool.query('UPDATE console SET ? WHERE consoleID = ?',
    [ consoleObj, consoleID ],
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
  if (validation.validateAgainstSchema(req.body, updateConsoleSchema)) {
    updateConsoleByID(consoleID, req.body, pool)
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              id: `/consoles/${consoleID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
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
  deleteconsoleByID(consoleID, pool)
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
  const consoleID = parseInt(req.params.consoleID);
  getConsoleByID(consoleID, pool)
    .then((consoleObj) => {
      if (consoleObj) {
        res.status(200).json(consoleObj);
      } else {
        next();
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        error: "Unable to fetch console.  Please try again later."
      });
    });
});


// Support functions for getting paginated console list.
// Get a console count, to help with pagincation.
function getConsoleCount(pool){

}

// Get a page for the paginated list.
function getConsolePage(page, totalCount, pool){

}

// Route for paginated list of consoles.
router.get('/', function(req, res) {

});