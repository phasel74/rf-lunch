const express = require('express')
const cors = require('cors');
const { execSync } = require('child_process')
const bodyParser = require('body-parser')
const path = require('path')
const parser = require("./parsers")
const Sequelize = require('sequelize');

const app = express()
app.use(cors());
app.use(bodyParser.json())

var Dishes;

// setup a new database
// using database credentials set in .env
var sequelize = new Sequelize('database', process.env.DB_USER, process.env.DB_PASS, {
  host: '0.0.0.0',
  dialect: 'sqlite',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
  // Security note: the database is saved to the file `database.sqlite` on the local filesystem. It's deliberately placed in the `.data` directory
  // which doesn't get copied if someone remixes the project.
  storage: '.data/database.sqlite'
});

// authenticate with the database
sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
    // define a new table 'users'
    Dishes = sequelize.define('dishes', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      dateStart: {
        type: Sequelize.STRING//Sequelize.DATE
      },
      dateEnd: {
        type: Sequelize.STRING//Sequelize.DATE
      },
      offers: {
        type: Sequelize.STRING
      },
      carte: {
        type: Sequelize.STRING
      }
    });

    setup();
  })
  .catch(function (err) {
    console.log('Unable to connect to the database: ', err);
  });

// populate table with default users
function setup() {
  Dishes.sync({
    //force: true // drops table
  })
    .then(function () {
      /*
          // Add the default users to the database
          for (var i = 0; i < users.length; i++) { // loop through all users
            User.create({ firstName: users[i][0], lastName: users[i][1] }); // create a new entry in the users table
          }
        */
      /*
     Dishes.create({
       id: "test",
       dateStart: new Date().toISOString(),
       dateEnd: new Date().toISOString(),
       offers: "tbd",
       carte: null
     })
     */
    });
}
/*
app.get("/users", function (request, response) {
  var dbUsers = [];
  User.findAll().then(function (users) { // find all entries in the users tables
    users.forEach(function (user) {
      dbUsers.push([user.firstName, user.lastName]); // adds their info to the dbUsers value
    });
    response.send(dbUsers); // sends dbUsers back to the page
  });
});
*/

app.get('/', (request, response) => {
  response.status(200).send('Hello from RF::Lunch express server!')
})

app.get('/api/providers', function (request, response) {
  response.sendFile(path.join(__dirname, 'providers.json'))
});

const dishesStrToObj = dishes => {
  dishes.offers = JSON.parse(dishes.offers)
  dishes.carte = JSON.parse(dishes.carte)
  return dishes
}

app.get('/api/dishes/:name', function (request, response) {
  var name = request.params.name;

  // try to find dishes in database
  Dishes.findOne({ where: { id: name } })
    .then(dishesDb => {
      if (dishesDb) {
        // check if dishes are up-to-date
        const now = new Date();
        const dateEnd = new Date(dishesDb.dateEnd)
        if (now <= dateEnd) {
          // return cached dishes
          console.log(name + ": use cached data")
          response.json(dishesStrToObj(dishesDb))
          return
        }
      }
      // parse
      console.log(name + ": re-parse data")
      parser.parse(name)
      .then(dishesNew => {
        // add id
        dishesNew.id = name
        // stringify objects @todo is there a better way to do that?
        dishesNew.offers = JSON.stringify(dishesNew.offers);
        dishesNew.carte = JSON.stringify(dishesNew.carte);
        // still outdated
        console.log(dishesNew.dateEnd)
        console.log(new Date())
        if (dishesNew.error !== undefined) {
          Dishes.findOne({ where: { id: name } }).then(dishes_ => {
            response.json({error: "parsed " + name + ": error!"})
          })     
          return
        }
        if (dishesNew.dateEnd < new Date().toISOString()) {
          Dishes.findOne({ where: { id: name } }).then(dishes_ => {
            response.json({ error: "parsed " + name + ": still outdated (" + dishesNew.dateStart + " - " + dishesNew.dateEnd + ")"})
          })
          return
        }
        // insert or update database value
        Dishes.upsert(dishesNew).then(() => {
          // get inserted/updated value from db again 
          // @todo is there a more efficient way?
          Dishes.findOne({ where: { id: name } }).then(dishes_ => {
            response.json(dishesStrToObj(dishes_))
          })
          return
        })
      }).catch(error => {
        console.log(name + ": " + error)
        response.json(error); // @todo?
      })
})

});

app.post('/deploy', (request, response) => {
  if (request.query.secret !== process.env.SECRET) {
    response.status(401).send()
    return
  }

  if (request.body.ref !== 'refs/heads/glitch') {
    response.status(200).send('Push was not to glitch branch, so did not deploy.')
    return
  }

  const repoUrl = request.body.repository.git_url

  console.log('Fetching latest changes.')
  const output = execSync(
    `git checkout -- ./ && git pull -X theirs ${repoUrl} glitch && refresh`
  ).toString()
  console.log(output)
  response.status(200).send()
})

// The 404 Route (ALWAYS Keep this as the last route)
app.get('*', function (req, res) {
  res.status(404).send('404 Page Not found.');
});

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
})
