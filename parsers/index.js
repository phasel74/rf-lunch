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
          break;
        case "hausmann":
        case "baeckerei-hausmann":
          hausmann.parse().then(resolve);
          break;
        case "hotel-sonne":
        case "sonne":
          sonne.parse().then(resolve);
          break;
        case "cafe-museum":
        case "museum":
          cafe_museum.parse().then(resolve);
          break;
        case "kbzo-kantine":
        //case "kbzo":
        //kbzo.parse().then(resolve)
        //break;
        case "eiszeit":
          eiszeit.parse().then(resolve);
          break;
        default:
          reject({ error: "unknown parse function" + name + "!" });
      }
    });
  }

  //
  exports.parse = parse;