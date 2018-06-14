const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { generateAuthToken, requireAuthentication } = require('../lib/auth');
const validation = require('../lib/validation');

const { getRentalsByUserID } = require('./rentals');
const { getGameReviewsByUserID } = require('./game_reviews');
const { getConsoleReviewsByUserID } = require('./console_reviews');

const userSchema = {
  userid: { required: false },
  username: { required: true },
  firstname: { required: true },
  lastname: { required: true },
  password: { required: true },
  email: { required: true }
};

function insertNewUser(user, mysqlPool) {
  return bcrypt.hash(user.password, 8)
    .then((passwordHash) => {
      return new Promise((resolve, reject) => {
        const userValues = {
          userID: null,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          password: passwordHash
        };
        mysqlPool.query(
          'INSERT INTO users SET ?',
          userValues,
          function (err, result) {
            if (err) {
              reject(err);
            } else {
              resolve(result.insertId);
            }
          }
        );
      });
    });
  }

router.post('/', function (req, res) {
  const mysqlPool = req.app.locals.mysqlPool;
  if (validation.validateAgainstSchema(req.body, userSchema)) {
    insertNewUser(req.body, mysqlPool)
      .then((userID) => {
        res.status(201).json({
          userID: userID,
          links: {
            user: `/users/${userID}`
          }
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: "Failed to insert new user."
        });
      });
  } else {
    res.status(400).json({
      error: "Request doesn't contain a valid user."
    })
  }
});

function getUserByID(userID, mysqlPool, includePassword) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT * FROM users WHERE userID = ?', [ userID ], function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
}

router.post('/login', function (req, res) {
  const mysqlPool = req.app.locals.mysqlPool;
  if (req.body && req.body.userID && req.body.password) {
    getUserByID(req.body.userID, mysqlPool, true)
      .then((user) => {
        if (user) {
          return bcrypt.compare(req.body.password, user.password);
        } else {
          return Promise.reject(401);
        }
      })
      .then((loginSuccessful) => {
        if (loginSuccessful) {
          return generateAuthToken(req.body.userID);
        } else {
          return Promise.reject(401);
        }
      })
      .then((token) => {
        res.status(200).json({
          token: token
        });
      })
      .catch((err) => {
        if (err === 401) {
          res.status(401).json({
            error: "Invalid credentials."
          });
        } else {
          res.status(500).json({
            error: "Failed to fetch user."
          });
        }
      });
  } else {
    res.status(400).json({
      error: "Request needs a userID and password."
    })
  }
});

router.get('/:userID', requireAuthentication, function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  var userObj;
  var rentalsObj;
  var gameReviewsObj;
  var consoleReviewsObj;

  if (req.user !== req.params.userID) {
    res.status(403).json({
      error: "Unauthorized to access that resource."
    });
  } else {
    getUserByID(req.params.userID, mysqlPool, true)
      .then((user) => {
        if (user) {
            userObj = user;
            return getRentalsByUserID(req.params.userID, mysqlPool)
            .then((rentals) => {
              if(rentals){
                rentalObj = rentals;
                return getGameReviewsByUserID(req.params.userID, mysqlPool)
                .then((gameReviews) => {
                  if(gameReviews){
                    gameReviewsObj = gameReviews;
                    return getConsoleReviewsByUserID(req.params.userID, mysqlPool)
                    .then((consoleReviews) => {
                      if(consoleReviews){
                        consoleReviewsObj = consoleReviews;
                        res.status(200).json({
                          user: userObj,
                          rentals: rentalObj,
                          gameReviews: gameReviewsObj,
                          consoleReviews: consoleReviewsObj
                        });
                      }
                    })
                  }
                })
              }
            })
          } else {
            next();
          }
        })
      .catch((err) => {
        res.status(500).json({
          error: "Failed to fetch user."
        });
      });
  }
});

function deleteUserByID(userID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'DELETE FROM users WHERE userID = ?',
      [ userID ],
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

router.delete('/:userID', requireAuthentication, function (req, res, next) {
  const userID = parseInt(req.params.userID);
  const mysqlPool = req.app.locals.mysqlPool;
  if (req.user !== req.params.userID) {
    res.status(403).json({
      error: "Unauthorized to access that resource."
    });
  } else {
    deleteUserByID(userID, mysqlPool)
      .then((deleteSuccessful) => {
        if (deleteSuccessful) {
          res.status(204).end();
        } else {
          next();
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: "Unable to delete user."
        });
      });
    }
});

function updateUserByID(userID, user, mysqlPool) {
  return new Promise((resolve, reject) => {
    const userValues = {
      userID: userID,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email
    };
    mysqlPool.query(
      'UPDATE users SET ? WHERE userID = ?',
      [ userValues, userID ],
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

router.put('/:userID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const userID = parseInt(req.params.userID);
  if (validation.validateAgainstSchema(req.body, userSchema)) {
    updateUserByID(userID, req.body, mysqlPool)
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              userID: `/users/${userID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: "Unable to update user."
        });
      });
  } else {
    res.status(400).json({
      error: "Please fill out all required fields."
    });
  }
});

exports.router = router;
