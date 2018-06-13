const router = require('express').Router();
const validation = require('../lib/validation');

const rentalSchema = {
  rentalID: { required: false },
  startdate: { required: true },
  enddate: { required: true },
  returned: { required: true },
  consoleID: { required: true },
  gameID: { required: true },
  renterID: { required: true }
};

function getRentalsCount(mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT COUNT(*) AS count FROM rentals', function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0].count);
      }
    });
  });
}

function getRentalsPage(page, totalCount, mysqlPool) {

  return new Promise((resolve, reject) => {
    const numPerPage = 10;
    const lastPage = Math.ceil(totalCount / numPerPage);
    page = page < 1 ? 1 : page;
    page = page > lastPage ? lastPage : page;
    const offset = (page - 1) * numPerPage;
    mysqlPool.query('SELECT * FROM rentals ORDER BY rentalID LIMIT ?,?', [offset, numPerPage], function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve({
          rentals: results,
          pageNumber: page,
          totalPages: lastPage,
          pageSize: numPerPage,
          totalCount: totalCount
        });
      }
    });
  });
}

router.get('/', function (req, res) {
  const mysqlPool = req.app.locals.mysqlPool;
  getRentalsCount(mysqlPool)
    .then((count) => {
      return getRentalsPage(parseInt(req.query.page) || 1, count, mysqlPool);
    })
    .then((RentalPageInfo) => {
      RentalPageInfo.links = {};
      let { links, pageNumber, totalPages } = RentalPageInfo;
      if (pageNumber < totalPages) {
        links.nextPage = '/rentals?page=' + (pageNumber + 1);
        links.lastPage = '/rentals?page=' + totalPages;
      }
      if (pageNumber > 1) {
        links.prevPage = '/rentals?page=' + (pageNumber - 1);
        links.firstPage = '/rentals?page=1';
      }
      res.status(200).json(RentalPageInfo);
    })
    .catch((err) => {
      console.log('  -- err:', err);
      res.status(500).json({
        error: "Error fetching rentals list.  Please try again later."
      });
    });
});

function insertNewRental(rental, mysqlPool) {
  return new Promise((resolve, reject) => {
    rental = validation.extractValidFields(rental, rentalSchema);
    rental.rentalID = null;
    mysqlPool.query(
      'INSERT INTO rentals SET ?',
      rental,
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

router.post('/', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  if (validation.validateAgainstSchema(req.body, rentalSchema)) {
    insertNewRental(req.body, mysqlPool)
      .then((rentalID) => {
        res.status(201).json({
          rentalID: rentalID,
          links: {
            rental: `/rental/${rentalID}`
          }
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: "Error inserting rental into DB.  Please try again later."
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid rental object."
    });
  }
});

function getRentalByID(rentalID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT * FROM rentals WHERE rentalID = ?', [ rentalID ], function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
}

router.get('/:rentalID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  getRentalByID(req.params.rentalID, mysqlPool)
    .then((rental) => {
      if (rental) {
        const rentalValues = {
          rentalID: rental.rentalID,
          startdate: rental.startdate,
          enddate: rental.enddate,
          returned: rental.returned,
          consoleID: rental.consoleID,
          gameID: rental.gameID,
          renterID: rental.renterID,
        };
        res.status(200).json(rentalValues);
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Failed to fetch rental."
      });
    });
});

function deleteRentalByID(rentalID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'DELETE FROM rentals WHERE rentalID = ?',
      [ rentalID ],
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

router.delete('/:rentalID', function (req, res, next) {
  const rentalID = parseInt(req.params.rentalID);
  const mysqlPool = req.app.locals.mysqlPool;
  deleteRentalByID(rentalID, mysqlPool)
    .then((deleteSuccessful) => {
      if (deleteSuccessful) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to delete rental."
      });
    });
});

function updateRentalByID(rentalID, rental, mysqlPool) {
  return new Promise((resolve, reject) => {
    const rentalValues = {
      rentalID: rentalID,
      startdate: rental.startdate,
      enddate: rental.enddate,
      returned: rental.returned,
      consoleID: rental.consoleID,
      gameID: rental.gameID,
      renterID: rental.renterID,
    };
    mysqlPool.query(
      'UPDATE rentals SET ? WHERE rentalID = ?',
      [ rentalValues, rentalID ],
      function (err, result) {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          console.log(result.affectedRows > 0);
          resolve(result.affectedRows > 0);
        }
      }
    );
  });
}

router.put('/:rentalID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const rentalID = parseInt(req.params.rentalID);
  if (validation.validateAgainstSchema(req.body, rentalSchema)) {
    console.log("Passed validation.");
    updateRentalByID(rentalID, req.body, mysqlPool)
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              rentalID: `/rentals/${rentalID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: "Unable to update rental."
        });
      });
  } else {
    res.status(400).json({
      error: "Please fill out all required fields."
    });
  }
});
exports.router = router;
