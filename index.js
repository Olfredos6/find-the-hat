const keypress = require('keypress');
keypress(process.stdin);
let db = require("./db.js");


db.connection.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err);
    return;
  }
});

// Ensure the table exists. If not, create it
db.createScoresTable();


const hat = '^';
const hole = 'O';
const fieldCharacter = '░';
const pathCharacter = '*';

class Field {
  constructor(height, width, maxHoleProbability) {
    this.locationX = 0;
    this.locationY = 0;
    this.holeCount = 0;
    this.fieldSize = height * width

    // Setup the field
    let [_field, _holeCount] = this._generateField(height, width, maxHoleProbability);
    this.field = _field
    this.holeCount = _holeCount
    
    // Set the "home" position before the game starts
    this.field[0][0] = pathCharacter;
  }

  isInBounds() {
    return (
      this.locationY >= 0 &&
      this.locationX >= 0 &&
      this.locationY < this.field.length &&
      this.locationX < this.field[0].length
    );
  }

  isHat() {
    return this.field[this.locationY][this.locationX] === hat;
  }

  isHole() {
    return this.field[this.locationY][this.locationX] === hole;
  }

  print() {
    const displayString = this.field.map(row => {
      return row.join('');
    }).join('\n');
    console.log(displayString);
  }

  _generateField(height, width, percentage = 0.1) {
    const field = new Array(height).fill(0).map(el => new Array(width));
    let holeCount = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const prob = Math.random();
        field[y][x] = prob > percentage ? fieldCharacter : hole;

        // Incremen Hole Count
        if(field[y][x] == hole) holeCount++;
      }
    }
    // Set the "hat" location
    const hatLocation = {
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height)
    };
    // Make sure the "hat" is not at the starting point
    while (hatLocation.x === 0 && hatLocation.y === 0) {
      hatLocation.x = Math.floor(Math.random() * width);
      hatLocation.y = Math.floor(Math.random() * height);
    }
    field[hatLocation.y][hatLocation.x] = hat;
    return [ field, holeCount ];
  }
}

const gameField = new Field(10, 10, 0.2)
let stepCounter = 0;

process.stdout.write("\u001b[2J\u001b[0;0H");
gameField.print()

process.stdin.on('keypress', function (ch, key) {
  if (key && key.ctrl && key.name == 'c') {
    process.stdin.pause();
    processGameEnd(gameField.fieldSize, gameField.holeCount, stepCounter, false)
  } else {
    stepCounter++;
    process.stdout.write("\u001b[2J\u001b[0;0H");
    if (key.name == 'up') gameField.locationY -= 1; 
    if (key.name == 'down') gameField.locationY += 1;
    if (key.name == 'left') gameField.locationX -= 1;
    if (key.name == 'right') gameField.locationX += 1;;
    if (!gameField.isInBounds()) {
      console.log('Out of bounds instruction!');
      process.stdin.pause();
      processGameEnd(gameField.fieldSize, gameField.holeCount, stepCounter, false)

    } else if (gameField.isHole()) {
      console.log('Sorry, you fell down a hole!');
      process.stdin.pause();
      processGameEnd(gameField.fieldSize, gameField.holeCount, stepCounter, false)

    } else if (gameField.isHat()) {
      console.log('Congrats, you found your hat!');
      process.stdin.pause();
      processGameEnd(gameField.fieldSize, gameField.holeCount, stepCounter, true)
    }
    // Update the current location on the map
    gameField.field[gameField.locationY][gameField.locationX] = pathCharacter;
    gameField.print()
  }
});


function uploadScore(field_size, hole_count, steps, is_win){
  return db.connection.promise()
  .query(
    `INSERT INTO scores (field_size, hole_count, steps, is_win) VALUES (?, ?, ?, ?)`, 
    [field_size, hole_count, steps, is_win]
  )
  .then((results) => {
    // console.log("Score saved!")
  })
  .catch(e => {
    console.log(`Error: ${e}`)
  })
}

function processGameEnd(field_size, hole_count, steps, is_win){
  uploadScore(field_size, hole_count, steps, is_win)
  db.connection.end();
}



// Resume `process.stdin` to begin listening for keystrokes
process.stdin.setRawMode(true);
process.stdin.resume();
