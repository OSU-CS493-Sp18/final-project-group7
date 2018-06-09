const router = require('express').Router();
const validation = require('../lib/validation');

/*
 * Schema describing required/optional fields of a business object.
 */
const gamesSchema = {
  name: { required: true },
  genre: { required: true },
  esrb: { required: true },
  //rating: { required: false },
  price: { required: true },
  platforms: { required: false }
};


/*
 * Route to create a new game.
 */
/*
* Executes a MySQL query to insert a new business into the database.  Returns
* a Promise that resolves to the ID of the newly-created business entry.
*/
function insertNewBusiness(business, mysqlPool) {
 return new Promise((resolve, reject) => {
   business = validation.extractValidFields(business, businessSchema);
   businessInsert = {
     name: business.name,
     genre: business.genre,
     esrb: business.esrb,
     //rating: business.rating,
     price: business.price,
   };
   business.id = null;
   mysqlPool.query(
     'INSERT INTO games SET ?',
     business,
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
function gameConsoleLink(gameID, platforms, mysqlPool){
  var errorMSG = "No Errors on inserting connections";
  for (var i = 0; i < platforms.length; i++) {
    mysqlPool.query(
      'BEGIN \
        IF NOT EXISTS ( SELECT * FROM platforms \
                        WHERE gameID = ? \
                        AND consoleID = ? ) \
        BEGIN \
          INSERT INTO platforms (gameID, consoleID) \
          VALUES (?, ?) \
        END \
      END'
      , [gameID, platforms[i], gameID, platforms[i]],
      function (err, result) {
        if (err) {
          errorMSG = "Failed to insert some game/console connections";
        }
      }
    );
  }
  return errorMSG;
}
router.post('/', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  if (validation.validateAgainstSchema(req.body, gamesSchema)) {
    insertNewGame(req.body, mysqlPool)
      .then((id) => {
        if(req.body.platforms && req.body.platforms.length){
          gameConsoleLink(id, req.body.platforms, mysqlPool);
        }
        res.status(201).json({
          id: id,
          links: {
            business: `/games/${id}`
          }
        });
      })
      .catch((err) => {
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

exports.router = router;
