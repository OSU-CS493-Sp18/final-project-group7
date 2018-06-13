DROP TABLE IF EXISTS `consoles`;
DROP TABLE IF EXISTS `games`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `rentals`;
DROP TABLE IF EXISTS `platforms`;
DROP TABLE IF EXISTS `gamereviews`;
DROP TABLE IF EXISTS `consolereviews`;

CREATE TABLE consoles
(
  consoleID INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(25) NOT NULL,
  rating FLOAT(2,1),
  tvrequirements CHAR(4) NOT NULL,
  price INT NOT NULL,
  PRIMARY KEY (consoleID)
);

CREATE TABLE games
(
  gameID INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  genre VARCHAR(255) NOT NULL,
  esrb CHAR(5) NOT NULL,
  rating FLOAT(2,1),
  price INT NOT NULL,
  PRIMARY KEY (gameID)
);

CREATE TABLE users
(
  userID INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL,
  firstname VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  lastname VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  PRIMARY KEY (userID),
  UNIQUE (username)
);

CREATE TABLE rentals
(
  startdate VARCHAR(255) NOT NULL,
  enddate VARCHAR(255) NOT NULL,
  returned CHAR(1) NOT NULL,
  rentalID INT NOT NULL AUTO_INCREMENT,
  consoleID INT NOT NULL,
  gameID INT NOT NULL,
  renterID INT NOT NULL,
  PRIMARY KEY (rentalID),
  FOREIGN KEY (consoleID) REFERENCES consoles(consoleID) ON DELETE CASCADE,
  FOREIGN KEY (gameID) REFERENCES games(gameID) ON DELETE CASCADE,
  FOREIGN KEY (renterID) REFERENCES users(userID) ON DELETE CASCADE
);

CREATE TABLE platforms
(
  consoleID INT NOT NULL,
  gameID INT NOT NULL,
  PRIMARY KEY (consoleID, gameID),
  FOREIGN KEY (consoleID) REFERENCES consoles(consoleID) ON DELETE CASCADE,
  FOREIGN KEY (gameID) REFERENCES games(gameID) ON DELETE CASCADE
);

CREATE TABLE gamereviews
(
  reviewID INT NOT NULL AUTO_INCREMENT,
  rating INT NOT NULL,
  review VARCHAR(255) NOT NULL,
  gameID INT NOT NULL,
  userID INT NOT NULL,
  PRIMARY KEY (reviewID),
  FOREIGN KEY (gameID) REFERENCES games(gameID) ON DELETE CASCADE,
  FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
);

CREATE TABLE consolereviews
(
  reviewID INT NOT NULL AUTO_INCREMENT,
  review VARCHAR(255) NOT NULL,
  rating INT NOT NULL,
  consoleID INT NOT NULL,
  userID INT NOT NULL,
  PRIMARY KEY (reviewID),
  FOREIGN KEY (consoleID) REFERENCES consoles(consoleID) ON DELETE CASCADE,
  FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
);

CREATE TRIGGER computeGameRatAvg
AFTER INSERT ON gamereviews
FOR EACH ROW
    UPDATE games
    SET rating = (SELECT AVG(rating) FROM gamereviews
                         WHERE gamereviews.gameID = games.gameID)
    WHERE gameID = NEW.gameID;

CREATE TRIGGER computeConsoleRatAvg
AFTER INSERT ON consolereviews
FOR EACH ROW
    UPDATE consoles
    SET rating = (SELECT AVG(rating) FROM consolereviews
                         WHERE consolereviews.consoleID = consoles.consoleID)
    WHERE consoleID = NEW.consoleID;

INSERT INTO consoles SET
consoleID = NULL,
name = 'Playstation 4',
rating = NULL,
tvrequirements = 'HDMI',
price = '100';

INSERT INTO consoles SET
consoleID = NULL,
name = 'XBox One',
rating = NULL,
tvrequirements = 'HDMI',
price = '100';

INSERT INTO games SET
gameID = NULL,
name = 'Horizon: Zero Dawn',
genre = 'Action',
esrb = 'M',
rating = NULL,
price = '10';

INSERT INTO games SET
gameID = NULL,
name = 'Halo 5',
genre = 'Action',
esrb = 'M',
rating = NULL,
price = '10';

INSERT INTO users SET
userID = NULL,
username = 'jimbob',
firstname = 'Jim',
password = '$2a$08$JKVWmE.65zcCuGcSYRSuk.v.vjPuAqWsTScBZQO1CkP.Gw.2dmnve', /* hunter192 */
lastname = 'Bob',
email = 'test1@test.com';

INSERT INTO users SET
userID = NULL,
username = 'bobjim',
firstname = 'Bob',
password = '$2a$08$TsAVN2q42yOK3if3.4BABueCQ4KsjdbB8Cvl7bPdqKX1R6t5kGq8.', /* hunter192 */
lastname = 'Jim',
email = 'test2@test.com';

INSERT INTO rentals SET
rentalID = NULL,
startdate = '1 JUN 2018',
enddate = '5 JUN 2018',
returned = 'Y',
consoleID = '1',
gameID = '1',
renterID = '1';

INSERT INTO rentals SET
rentalID = NULL,
startdate = '1 JUN 2018',
enddate = '5 JUN 2018',
returned = 'N',
consoleID = '2',
gameID = '2',
renterID = '2';

INSERT INTO platforms SET
consoleID = '1',
gameID = '1';

INSERT INTO platforms SET
consoleID = '2',
gameID = '2';

INSERT INTO gamereviews SET
reviewID = NULL,
rating = '5',
review = 'Great game!',
gameID = '1',
userID = '1';

INSERT INTO gamereviews SET
reviewID = NULL,
rating = '5',
review = 'Definitely a Great game!',
gameID = '2',
userID = '2';

INSERT INTO consolereviews SET
reviewID = NULL,
review = 'I love this console!',
rating = '5',
consoleID = '1',
userID = '1';

INSERT INTO consolereviews SET
reviewID = NULL,
review = 'I definitely love this console!',
rating = '5',
consoleID = '2',
userID = '2';
