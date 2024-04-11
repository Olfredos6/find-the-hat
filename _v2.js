const keypress = require('keypress');
const readline = require('readline');

keypress(process.stdin);

const hat = '^';
const hole = 'O';
const fieldCharacter = '░';
const pathCharacter = '*';

// Get a MySQL connection
const connection = require("./db.js");


// Connect to the MySQL database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database');
});

class Field {
    constructor(field = [[]]) {
      this.field = field;
      this.locationX = 0;
      this.locationY = 0;
      
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
  
    static generateField(height, width, percentage = 0.1) {
      const field = new Array(height).fill(0).map(el => new Array(width));
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const prob = Math.random();
          field[y][x] = prob > percentage ? fieldCharacter : hole;
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
      return field;
    }
  }
  

const gameField = new Field(Field.generateField(10, 10, 0.2));
process.stdout.write("\u001b[2J\u001b[0;0H");
gameField.print();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function savePlayerInfo() {
  rl.question('Enter your name: ', (name) => {
    rl.question('Enter your score: ', (score) => {
      const query = 'INSERT INTO players (name, score) VALUES (?, ?)';
      connection.query(query, [name, score], (err, results) => {
        if (err) {
          console.error('Error saving player info:', err);
        } else {
          console.log('Player info saved successfully');
        }
        rl.close();
        process.stdin.setRawMode(true);
        process.stdin.resume();
      });
    });
  });
}

process.stdin.on('keypress', function (ch, key) {
  if (key && key.ctrl && key.name == 'c') {
    process.stdin.pause();
  } else if (key && key.name == 'm') {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    console.log('Menu:');
    console.log('1. Save player info');
    console.log('2. Resume game');
    rl.question('Enter your choice: ', (choice) => {
      if (choice === '1') {
        savePlayerInfo();
      } else if (choice === '2') {
        process.stdin.setRawMode(true);
        process.stdin.resume();
      } else {
        console.log('Invalid choice. Resuming game.');
        process.stdin.setRawMode(true);
        process.stdin.resume();
      }
    });
  } else {
    process.stdout.write("\u001b[2J\u001b[0;0H");
    if (key.name == 'up') gameField.locationY -= 1;
    if (key.name == 'down') gameField.locationY += 1;
    if (key.name == 'left') gameField.locationX -= 1;
    if (key.name == 'right') gameField.locationX += 1;
    
    // ... (game logic remains the same)
    
    gameField.field[gameField.locationY][gameField.locationX] = pathCharacter;
    gameField.print();
  }
});

process.stdin.setRawMode(true);
process.stdin.resume();