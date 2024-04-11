const keypress = require('keypress');
const db = require('./db.js');
const rl = require('readline/promises').createInterface({
  input: process.stdin,
  output: process.stdout
})

keypress(process.stdin);

const hat = '^';
const hole = 'O';
const fieldCharacter = '░';
const pathCharacter = '*';

class Game {
  constructor(field, dbUtil) {
    this.field = field;
    this.dbUtil = dbUtil;
    this.profile = null;

    dbUtil.connection.connect(async (err) => {
      if (err) {
        console.error('Erreur de connexion à la base de données:', err);
        return;
      }
      this.dbUtil.DBSetup();

      if (!this.profile) {
        this.profile = await this.dbUtil.getAllProfiles()
          .then(async function(profiles) {
            if (profiles.length == 0) {
                let new_profile_name = await rl.question("Please enter a profile name> ")
                .then( name => name)
                .catch(e => console.log(e))
                let result = await db.insertProfile(new_profile_name)
                console.log("~~~>>>>>", result)
                return new_profile_name;
                // , async function(name){
                //   result = await db.insertProfile(name)
                //   console.log("-------> result", result)

                //   rl.close()
          
              
            } else {
              console.log("Available profiles ->", profiles)
            }
          })
          .catch(e => {
            console.log(e)
            this.end();
          })
      }
    });
  }

  uploadScore(steps, is_win) {
    this.dbUtil.insertScore(this.field.fieldSize, this.field.holeCount, steps, is_win)
      .then(insertResults => {
        if (insertResults[0].affectedRows == 0) { console.log("Score could not be saved!") }
      })
      .then(_ => this.dbUtil.connection.end())
  }

  end() {
    this.dbUtil.connection.end();
    process.exit()
  }
}

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
        if (field[y][x] == hole) holeCount++;
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
    return [field, holeCount];
  }
}


const game = new Game(new Field(5, 5, 0.2), db)
let stepCounter = 0;

/*
process.stdout.write("\u001b[2J\u001b[0;0H");
game.field.print()

process.stdin.on('keypress', function (ch, key) {
  let shouldEndGame = false;
  if (key && key.ctrl && key.name == 'c') {
    process.stdin.pause();
    game.uploadScore(stepCounter, false)
  } else {
    stepCounter++;
    process.stdout.write("\u001b[2J\u001b[0;0H");
    if (key.name == 'up') game.field.locationY -= 1;
    if (key.name == 'down') game.field.locationY += 1;
    if (key.name == 'left') game.field.locationX -= 1;
    if (key.name == 'right') game.field.locationX += 1;;
    if (!game.field.isInBounds()) {
      console.log('Sorry, you went out of bonds!');
      process.stdin.pause();
      game.uploadScore(stepCounter, false)
      shouldEndGame = true;
    } else if (game.field.isHole()) {
      console.log('Sorry, you fell down a hole!');
      process.stdin.pause();
      game.uploadScore(stepCounter, false)
      shouldEndGame = true;
    } else if (game.field.isHat()) {
      console.log('Congrats, you found your hat!');
      process.stdin.pause();
      game.uploadScore(stepCounter, true)
      shouldEndGame = true;
    }

    if(!shouldEndGame){
      // Update the current location on the map
      game.field.field[game.field.locationY][game.field.locationX] = pathCharacter;
    }
    game.field.print()
  }
});


// Resume `process.stdin` to begin listening for keystrokes
process.stdin.setRawMode(true);
process.stdin.resume();

*/
