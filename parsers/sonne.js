const restler = require('restler');
const xpath = require('xpath')
const dom = require('xmldom').DOMParser

const util = require('./util')

exports.parse = function () {
    return new Promise((resolve, reject) => {
        restler.get('https://www.sonnehotel.de/news/20160731205535.htm').on('complete', function (result) {
            const dishes = makeHotelSonneDishes(result)
            resolve(dishes)
        })
    })
};

function makeHotelSonneDishes(html) {
    if (html <= 0) {
        res.json({ error: "could not load html. Please retry." })
        return
    }
    // replace broken umlauts 
    // @todo is there a better way to do that?
    const mapObj = {
        "&szlig;": "ß",
        "&nbsp;": " ",
        "&auml;": "a",
        "&ouml;": "ö",
        "&uuml;": "ü",
        "&amp;": "&",
    };
    html = html.replace(/&szlig;|&nbsp;|&auml;|&ouml;|&uuml;|&amp;/g, function (matched) { return mapObj[matched]; });
    // all <td> elements from html
    const nodes = xpath.select("//tr//td//strong", new dom().parseFromString(html))
    /*
    // print all nodes
    for (let i = 0, n = nodes.length; i < n; ++i) {
      console.log(i + ": " + nodes[i].firstChild.data)
    }
    //*/
    // offers (daily dishes)
    let offers = {
        title: "Tagesessen"
    };
    let iDay = 0; // current week day
    let dishName = null, dishPrice = null;
    for (let i = 0, n = nodes.length; i < n; ++i) {
        name = nodes[i].firstChild.data;
        if (name == undefined) continue; // skip empty node
        name = name.trim();
        // check if to update current weekday
        switch (name) {
            case '': continue; // skip empty node
            case 'Montag':
                iDay = 0;
                continue;
            case 'Dienstag':
                iDay = 1;
                continue;
            case 'Mittwoch':
                iDay = 2;
                continue;
            case 'Donnerstag':
                iDay = 3;
                continue;
            case 'Freitag':
                iDay = 4;
                continue;
        }
        if (name.indexOf("EUR") < 0) {
            dishName = name;
        } else {
            dishPrice = name;
        }
        if (dishName == undefined || dishPrice == undefined) continue;
        // add dish
        const day = util.weekdays[iDay + 1];
        if (!offers[day]) offers[day] = [];
        offers[day].push({
            name: dishName,
            price: dishPrice.replace("EUR", "").trim() + " €",
        })
        dishName = dishPrice = undefined;
    }
    // find start and end date
    const nodesStartEndDate = xpath.select("//tr//td//p//strong//em", new dom().parseFromString(html))
    var dateString = ""
    for (let i = 0; i < nodesStartEndDate.length; ++i) {
        dateString += nodesStartEndDate[i].firstChild.data
    }

    return {
        dateStart: util.germanDateToInternational(dateString.substring(17, 27)),
        dateEnd: util.germanDateToInternational(dateString.substring(32, 42)),
        ...offers
    }
}
