const router = require('express').Router();
const validation = require('../lib/validation');

/*
 * Schema describing required/optional fields of a game object.
 */
const gamesSchema = {
  name: { required: true },
  genre: { required: true },
  esrb: { required: true },
  //rating: { required: false }, //aggregated rating will be calculated later
  price: { required: true },
  platforms: { required: false } //an array of consoles/OS's that the game has been ported to
};
const gamesPutSchema = {
  name: { required: true },
  genre: { required: true },
  esrb: { required: true },
  //rating: { required: false }, //aggregated rating will be calculated later
  price: { required: true },
};

/*
 * Executes a MySQL query to fetch the total number of game.  Returns
 * a Promise that resolves to this count.
 */
function getgameCount(mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT COUNT(*) AS count FROM games', function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0].count);
      }
    });
  });
}

/*
 * Executes a MySQL query to return a single page of game.  Returns a
 * Promise that resolves to an array containing the fetched page of game.
 */
function getgamePage(page, totalCount, mysqlPool) {
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

    mysqlPool.query(
      'SELECT * FROM games ORDER BY gameID LIMIT ?,?',
      [ offset, numPerPage ],
      function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve({
            game: results,
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
/*
 * Route to return a paginated list of game.
 */
router.get('/', function (req, res) {
  const mysqlPool = req.app.locals.mysqlPool;
  getgameCount(mysqlPool)
    .then((count) => {
      return getgamePage(parseInt(req.query.page) || 1, count, mysqlPool);
    })
    .then((gamePageInfo) => {
      /*
       * Generate HATEOAS links for surrounding pages and then send response.
       */
      gamePageInfo.links = {};
      let { links, pageNumber, totalPages } = gamePageInfo;
      if (pageNumber < totalPages) {
        links.nextPage = `/games?page=${pageNumber + 1}`;
        links.lastPage = `/games?page=${totalPages}`;
      }
      if (pageNumber > 1) {
        links.prevPage = `/games?page=${pageNumber - 1}`;
        links.firstPage = '/games?page=1';
      }
      res.status(200).json(gamePageInfo);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        error: "Error fetching games list.  Please try again later."
      });
    });
});
/*
* Executes a MySQL query to insert a new game into the database.  Returns
* a Promise that resolves to the ID of the newly-created game entry.
*/
function insertNewGame(game, mysqlPool) {
 return new Promise((resolve, reject) => {
   game = validation.extractValidFields(game, gamesSchema);
   gameInsert = {
     name: game.name,
     genre: game.genre,
     esrb: game.esrb,
     //rating: game.rating,
     price: game.price,
   };
   game.gameID = null;
   mysqlPool.query(
     'INSERT INTO games SET ?',
     gameInsert,
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
/*
* Adds all game-platform connections
*/
function gameConsoleLink(gameID, platforms, mysqlPool){
  var errorMSG = "No Errors on inserting connections";
  /*/delete existing links
  mysqlPool.query(
    'DELETE FROM platforms WHERE gameID = ?', gameID,
    function (err, result){}
  );/**/
  //add all links
  for (var i = 0; i < platforms.length; i++) {
    mysqlPool.query(
      'INSERT INTO platforms (gameID, consoleID) VALUES (?, ?)'
      ,[gameID, platforms[i]],
      function (err, result) {
        if (err) {
          errorMSG = "Failed to insert some game/console connections";
        }
      }
    );
  }
  return errorMSG;
}
/*
 * Route to create a new game.
 */
router.post('/', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  if (validation.validateAgainstSchema(req.body, gamesSchema)) {
    insertNewGame(req.body, mysqlPool)
      .then((id) => {
        var connMSG;
        if(req.body.platforms && req.body.platforms.length){
          connMSG = gameConsoleLink(id, req.body.platforms, mysqlPool);
        }
        res.status(201).json({
          id: id,
          msg: connMSG,
          links: {
            game: `/games/${id}`
          }
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({
          error: "Error inserting game into DB.  Please try again later."
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid game object."
    });
  }
});


/*
 * Executes a MySQL query to fetch information about a single specified
 * games based on its ID.  Returns a Promise that resolves to an object
 * containing information about the requested games.  If no games with
 * the specified ID exists, the returned Promise will resolve to null.
 */
function getGamePlatforms(gamesID, mysqlPool){
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT consoleID FROM platforms where gameID = ?', [ gamesID ], function (err, results) {
      if (err) {
        resolve(null);
      } else {
        resolve(results);
      }
    });
  })
}
function getgamesByID(gamesID, mysqlPool) {
  /*
   * Execute three sequential queries to get all of the info about the
   * specified games, including its reviews and photos.  If the original
   * request to fetch the games doesn't match a games, send null through
   * the promise chain.
   */
  let returngames = {};
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT * FROM games WHERE gameID = ?', gamesID, function (err, results) {
      if (err) {
        //console.log("Err at games");
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  }).then((games) => {
    if(games){
      returngames = games;
      return getGamePlatforms(gamesID, mysqlPool);
    } else {
      return Promise.resolve(null);
    }
  }).then((platforms) => {
    if (platforms){
      returngames.platforms = platforms;
    }
    return Promise.resolve(returngames);
  })
  /*.then((games) => {
    if (games) {
      returngames = games;
      return getReviewsBygamesID(gamesID, mysqlPool);
    } else {
      return Promise.resolve(null);
    }
  }).then((reviews) => {
    if (reviews) {
      returngames.reviews = reviews;
      return getPhotosBygamesID(gamesID, mysqlPool);
    } else {
      return Promise.resolve(null);
    }
  }).then((photos) => {
    if (photos) {
      returngames.photos = photos;
      return Promise.resolve(returngames);
    } else {
      return Promise.resolve(null);
    }
  })*/
}

/*
 * Route to fetch info about a specific games.
 */
router.get('/:gameID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const gameID = parseInt(req.params.gameID);
  getgamesByID(gameID, mysqlPool)
    .then((game) => {
      if (game) {
        res.status(200).json(game);
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to fetch game.  Please try again later."
      });
    });
});


/*
 * Executes a MySQL query to delete a game specified by its ID.  Returns
 * a Promise that resolves to true if the game specified by `gameID`
 * existed and was successfully deleted or to false otherwise.
 */
function deletegameByID(gameID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('DELETE FROM games WHERE gameID = ?', [ gameID ], function (err, result) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
}


/*
 * Executes a MySQL query to replace a specified games with new data.
 * Returns a Promise that resolves to true if the games specified by
 * `gamesID` existed and was successfully updated or to false otherwise.
 */
function replacegamesByID(gamesID, games, mysqlPool) {
  return new Promise((resolve, reject) => {
    games = validation.extractValidFields(games, gamesPutSchema);
    mysqlPool.query('UPDATE games SET ? WHERE gameID = ?', [ games, gamesID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
}

/*
 * Route to replace data for a games.
 */
router.put('/:gamesID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const gamesID = parseInt(req.params.gamesID);
  if (validation.validateAgainstSchema(req.body, gamesSchema)) {
    replacegamesByID(gamesID, req.body, mysqlPool)
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              games: `/games/${gamesID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({
          error: "Unable to update specified games.  Please try again later."
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid games object"
    });
  }
});


/*
 * Route to delete a game.
 */
router.delete('/:gameID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const gameID = parseInt(req.params.gameID);
  deletegameByID(gameID, mysqlPool)
    .then((deleteSuccessful) => {
      if (deleteSuccessful) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to delete game.  Please try again later."
      });
    });
});

exports.router = router;
