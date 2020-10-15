// @todo refactoring!

const request = require('request'); // @todo deprecated??
const xpath = require('xpath')
const dom = require('xmldom').DOMParser

const util = require('./util')

exports.parse = function () {
    return new Promise((resolve, reject) => {
        // get json for Weingarten
        request.get('https://baeckerei-hausmann.visuscreen.de/init/vins/Weingarten.json', { json: true }, (err, res, body) => {
            const feedpath = body[0].feedpath;
            const feedID = body[0].feedID;
            // get textfile with html
            const textfile = "https://baeckerei-hausmann.visuscreen.de/" + feedpath + "/" + feedID + "_IS1.txt"
            //console.log(textfile);

            request.get(textfile, (err, res) => {
                let offers = parseBaeckereiHausmannHtml(res.body)
                // date
                let date = new Date(res.headers['last-modified'])
                nextMonday(date)
                let dateStart = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0') //date.toISOString()
                date.setDate(date.getDate() + 4); // @todo only date (not time)
                date.setHours(23, 59, 59)
                dateEnd = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0') //date.toISOString()
                offers.dateStart = dateStart
                offers.dateEnd = dateEnd
                resolve({
                    dateStart: dateStart,
                    dateEnd: dateEnd,
                    offers: offers
                })
            });
        })
    })
}

function nextMonday(d) {
    d.setDate(d.getDate() + (1 + 7 - d.getDay()) % 7);
}

function parseBaeckereiHausmannHtml(html) {
    //const li = html.match(/(<li.*<\/li>)(<li.*<\/li>)/)
    const li = html.match(/(<li.*<\/li>)/)
    if (li == null) return; // @todo error (for example no Mittagsdish in holidays)
    // look for "Wochenkarte1 Weingarten"
    const idx = li[1].substring(11, 37) === "Mittagstisch Weingarten - " ? 2 : 1
    // 
    const nodes = xpath.select("/li/div/@data-x", new dom().parseFromString(li[idx]))
    var days = [];
    for (let i = 0; i < 5; ++i) {
        days.push({ dishes: [], prices: [] })
    }
    console.log(nodes.length)
    // test
    for (let i = 0; i < nodes.length; ++i) {
        let div1 = nodes[i].ownerElement
        let div2 = div1.childNodes[0]
        let div3 = div2.childNodes[0]
        var x, y
        for (let j = 0; j < div1.attributes.length; ++j) {
            let attr = div1.attributes[j]
            if (attr.name == "data-x") x = parseFloat(attr.value)
            else if (attr.name == "data-y") y = parseFloat(attr.value)
        }
        if (!x || !y) continue

        const isPrice = x % 50 > 40
        var iDay = Math.floor((y - 16) / 27)
        if (iDay < 0 || iDay > 2) continue
        if (x > 50) iDay += 3

        if (!isPrice) {
            for (let j = 0; j < div3.childNodes.length; j += 2) {
                let text = div3 && div3.childNodes ? div3.childNodes[j] : undefined
                days[iDay].dishes.push({ y: y, text: text.nodeValue })
            }
        } else {
            for (let j = 0; j < div3.childNodes.length; j += 1) {
                let text = div3 && div3.childNodes ? div3.childNodes[j] : undefined
                if (text.nodeValue == null) continue
                days[iDay].prices.push({ y: y, text: text.nodeValue })
            }
        }
        //console.log("(" + x + ", " + y + "), Tag " + iDay + ", " + (isPrice ? "Preis: " : "Gericht: ") + div3.childNodes[0])
    }
    console.log("raw data:")
    console.log(JSON.stringify(days))
    console.log(":::::::::::::::::::::")

    // move prices to correct day @todo better description
    for (var iDay = 0; iDay < days.length - 1; ++iDay) {
        const day = days[iDay];
        day.dishes = day.dishes.sort((a, b) => a.y - b.y)
        if (day.dishes.length > day.prices.length) {
            console.log("ERROR: should not happen1!!") // feiertag?
        }
        if (day.dishes.length >= day.prices.length) continue
        const nextDay = days[iDay + 1]
        if (nextDay.prices.length > 0) console.log("ERROR: should not happen2!!!")
        const len = day.dishes.length
        for (let j = 0; j < day.prices.length - day.dishes.length; ++j) {
            nextDay.prices.push(day.prices[len + j])
        }
    }

    // @todo more robust sorting
    for (var iDay = 0; iDay < days.length; ++iDay) {
        const day = days[iDay];
        if (!day.dishes[1]) continue; /// @todo this is a shitty fast fix!
        if (day.dishes[0].y > day.dishes[1].y) [day.dishes[0], day.dishes[1]] = [day.dishes[1], day.dishes[0]]
    }
    // @todo prices are incomplete!!!

    console.log("create daily dishes...................................................")

    var dailyDishes = [];
    for (var iDay = 0; iDay < days.length; ++iDay) {
        const day = days[iDay];
        for (var iDish = 0; iDish < day.dishes.length; ++iDish) {
            const dish = day.dishes[iDish]
            const price = iDish < day.prices.length ? day.prices[iDish] : "" // @todo

            if (!dish.text || !price.text) continue; // Feiertage do not have a price!
            dailyDishes.push({
                name: dish.text,
                day: iDay + 1,
                price: price.text.replace(/\s*€/, " €"),
                //garnish: { name: '', price: '' }
            })
        }
    }

    // weeks offers @todo!!!!!!!!!!!!!!!!!!!!!!!

    console.log("finalize ...................................................")

    const dishes_ = { // @todo name
        dateStart: "",//dateStart,
        dateEnd: "",//dateEnd, // @todo rename to expire?
        dailyDishes: { title: "Tagesessen", arr: dailyDishes },
        //weekDishes: weekDishes
    };
    console.log(dishes_);
    //res.json(dishes_);


    // @todo create offers object above directly
    offers = {
        title: "Tagesessen"
    }
    for (let dish of dishes_.dailyDishes.arr) {
        const day = util.weekdays[dish.day];
        if (!offers[day]) offers[day] = [];
        const dish2 = {}
        if (dish.name) dish2.name = dish.name;
        if (dish.price) dish2.price = dish.price;
        offers[day].push(dish2);
    }

    return offers
}