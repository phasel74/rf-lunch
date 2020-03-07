const path = require('path')
const fs = require('fs')

const cafe_museum = require("./cafe-museum")
const eiszeit = require("./eiszeit")
const hausmann = require("./hausmann")
//const kbzo = require("./kbzo")
const schuler = require("./schuler")
const sonne = require("./sonne")

function parse(name) {
  return new Promise((resolve, reject) => {
    // @todo more elegant way?
    switch (name) {
      case "schuler":
      case "schuler-kantine":
        schuler.parse().then(resolve);
        return;
      case "hausmann":
      case "baeckerei-hausmann":
        hausmann.parse().then(resolve);
        return;
      case "hotel-sonne":
      case "sonne":
        sonne.parse().then(resolve);
        return;
      case "cafe-museum":
      case "museum":
        cafe_museum.parse().then(resolve);
        return;
      //case "kbzo-kantine":
      //case "kbzo":
      //kbzo.parse().then(resolve)
      //return;
      case "eiszeit":
        eiszeit.parse().then(resolve);
        return;
      default:
      //reject({ error: "unknown parse function '" + name + "'!" });
    }
    // no parse function defined - try to load dishes json
    fs.readFile(path.join(__dirname, '../dishes/' + name + '.json'), 'utf8', (err, jsonString) => {
      if (err) {
        reject({ error: "no parse function or json for '" + name + "'!" });
        return
      }
      resolve({ ...JSON.parse(jsonString) })
    })
  });
}

//
exports.parse = parse;
