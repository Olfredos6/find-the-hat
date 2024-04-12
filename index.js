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
    this.profile = { id: null, name: null };
    this.isDone = false

    dbUtil.connection.connect(async (err) => {
      if (err) {
        console.error('Erreur de connexion à la base de données:', err);
        return;
      }
      this.dbUtil.DBSetup();

      if (Object.values(this.profile).some(v => v == null)) {
        this.profile = await this.dbUtil.getAllProfiles()
          .then(async function (profiles) {
            if (profiles.length == 0) {
              console.warn('\x1b[33m%s\x1b[0m', "No profile found!")
              let new_profile_name = await rl.question("Please enter a name for your profile > ")
                .then(name => name)
                .catch(e => console.log(e))

              let result = await db.insertProfile(new_profile_name);
              return { "id": result[0].insertId, "name": new_profile_name }

            } else {
              profiles.forEach(function (profile) {
                console.log(`\t${profile.id} ${profile.name}`)
              })

              let profile_choice = await rl.question("Enter the number corresponding to your profile > ")
                .then(profile_id => profile_id)
              return profiles.find(p => p.id == profile_choice)
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
    this.dbUtil.insertScore(this.profile.id, this.field.fieldSize, this.field.holeCount, steps, is_win)
      .then(insertResults => {
        if (insertResults[0].affectedRows == 0) { console.log("Score could not be saved!") }
      })
    /*.then(_ => this.dbUtil.connection.end())*/
  }

  play(){
    
    process.stdout.write("\u001b[2J\u001b[0;0H");
    game.printField()

    function handleinput(ch, key) {
      let shouldEndGame = false;
      if (key && key.ctrl && key.name == 'c') {
        process.stdin.pause();
        game.uploadScore(stepCounter, false)
      } else {
        stepCounter++;
        process.stdout.write("\u001b[2J\u001b[0;0H");
        if (ch == 'r') game.field.rebuild();
        if (key.name == 'return' && game.isDone) { game.showIntermediaryMenu(); return;}
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
          console.log("press ENTER to return to menu")
          // process.stdin.pause();
          game.uploadScore(stepCounter, true)
          game.isDone = true;
        }

        if (!shouldEndGame) {
          // Update the current location on the map
          game.field.field[game.field.locationY][game.field.locationX] = pathCharacter;
        }
        game.printField()
      }
    }

    process.stdin.on('keypress', handleinput);
  }

  end() {
    this.dbUtil.connection.end();
    process.exit()
  }

  printField(){
    
    console.log('\x1b[42m%s\x1b[0m', `Profil: ${this.profile.name} | steps: ${this.field.starMovesCounter} `);
    this.field.print()
  }

  showIntermediaryMenu(){
    clearInterval(profileSetUpTimer)
    process.stdout.write("\u001b[2J\u001b[0;0H");
    clearScreen()

    function displayLeaderBoardScreen(){
      clearScreen()
      console.log(`\t\tLeadearboad`)
          db.getLeaderBoard()
          .then(([res, _]) => {
            res.forEach(profile => {
              console.log(`\t${profile.score}\t${profile.name}`)
            })
          })
          .catch(e => {console.log(e)})
    }
    // Display second menu
    const secondMenuItems = [
      ["Play game", game.play],
      ["Check Leaderboard", displayLeaderBoardScreen]
    ]

    let menuSelectIndex = 0;

    function printMenu(){
      console.log("\tWhat do you want to do?")
      secondMenuItems.forEach((item, index) =>{
        if(index == menuSelectIndex) console.error('\x1b[32m%s\x1b[0m', `\t${item[0]}`);
        else console.log(`\t${item[0]}`)
      })
    }

    printMenu()

    function handleInput(ch, key) {
      if (key && key.ctrl && key.name == 'c') {
        process.stdin.pause();
        game.uploadScore(stepCounter, false)
      } else {

        clearScreen()
        if (key.name == "up" && menuSelectIndex > 0) menuSelectIndex--
        if (key.name == "down" && menuSelectIndex < secondMenuItems.length - 1) menuSelectIndex++
        if (key.name == "return") {
          process.stdin.removeListener('keypress', handleInput)
          secondMenuItems[menuSelectIndex][1]()
          return
        }
        printMenu()
      }
    }

    process.stdin.on('keypress', handleInput)
  }
}

class Field {
  constructor(height, width, maxHoleProbability) {
    this._height = height
    this._width = width
    this._maxHoleProbability = maxHoleProbability
    this.locationX = 0;
    this.locationY = 0;
    this.starPreviousLocation = [this.locationX, this.locationY];
    this.starMovesCounter = 0;
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

  getFieldPrint() {
    const displayString = this.field.map(row => {
      return row.join('');
    }).join('\n');
    return displayString;
  }

  starHasMoved(){
    return this.starPreviousLocation != [this.locationX, this.locationY]
  }

  print(){
    console.log(this.getFieldPrint())
    if(this.starHasMoved()) this.starMovesCounter++;
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

  rebuild(){
    let [_field, _holeCount] = this._generateField(this._height, this._width, this._maxHoleProbability);
    this.field = _field
    this.holeCount = _holeCount
  }
}


function clearScreen(){
  process.stdout.write("\u001b[2J\u001b[0;0H");
}

clearScreen();

const game = new Game(new Field(5, 33, 0.2), db)
let stepCounter = 0;

// wait for user to complete setting their profile
let profileSetUpTimer = setInterval(function () {

  if (game.profile.id != null) {
    game.showIntermediaryMenu()
  }


  // Resume `process.stdin` to begin listening for keystrokes
  process.stdin.setRawMode(true);
  process.stdin.resume();
}, 500)