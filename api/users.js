const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { generateAuthToken, requireAuthentication } = require('../lib/auth');
const validation = require('../lib/validation');

const { getBusinessesByOwnerID } = require('./businesses');
const { getReviewsByUserID } = require('./reviews');
const { getPhotosByUserID } = require('./photos');

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
        console.log(err);
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
  if (req.user !== req.params.userID) {
    res.status(403).json({
      error: "Unauthorized to access that resource."
    });
  } else {
    getUserByID(req.params.userID, mysqlPool)
      .then((user) => {
        if (user) {
          const userValues = {
            userID: user.userID,
            username: user.username,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email
          };
          res.status(200).json(userValues);
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
      userID: user.userID,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email
    };
    mysqlPool.query(
      'UPDATE users SET ? WHERE id = ?',
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
              business: `/users/${userID}`
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

//
// /*
//  * Route to list all of a user's businesses.
//  */
// router.get('/:userID/businesses', requireAuthentication, function (req, res) {
//   const mysqlPool = req.app.locals.mysqlPool;
//   const userID = parseInt(req.params.userID);
//   if (req.user !== req.params.userID) {
//     res.status(403).json({
//       error: "Unauthorized to access that resource"
//     });
//   } else {
//   getBusinessesByOwnerID(userID, mysqlPool)
//     .then((businesses) => {
//       if (businesses) {
//         res.status(200).json({ businesses: businesses });
//       } else {
//         next();
//       }
//     })
//     .catch((err) => {
//       res.status(500).json({
//         error: "Unable to fetch businesses.  Please try again later."
//       });
//     });
//   }
// });
//
// /*
//  * Route to list all of a user's reviews.
//  */
// router.get('/:userID/reviews', requireAuthentication, function (req, res) {
//   const mysqlPool = req.app.locals.mysqlPool;
//   const userID = parseInt(req.params.userID);
//   if (req.user !== req.params.userID) {
//     res.status(403).json({
//       error: "Unauthorized to access that resource"
//     });
//   } else {
//     getReviewsByUserID(userID, mysqlPool)
//       .then((reviews) => {
//         if (reviews) {
//           res.status(200).json({ reviews: reviews });
//         } else {
//           next();
//         }
//       })
//       .catch((err) => {
//         res.status(500).json({
//           error: "Unable to fetch reviews.  Please try again later."
//         });
//       });
//     }
// });
//
// /*
//  * Route to list all of a user's photos.
//  */
// router.get('/:userID/photos', requireAuthentication, function (req, res) {
//   const mysqlPool = req.app.locals.mysqlPool;
//   const userID = parseInt(req.params.userID);
//   if (req.user !== req.params.userID) {
//     res.status(403).json({
//       error: "Unauthorized to access that resource"
//     });
//   } else {
//     getPhotosByUserID(userID, mysqlPool)
//       .then((photos) => {
//         if (photos) {
//           res.status(200).json({ photos: photos });
//         } else {
//           next();
//         }
//       })
//       .catch((err) => {
//         res.status(500).json({
//           error: "Unable to fetch photos.  Please try again later."
//         });
//       });
//     }
// });

exports.router = router;
