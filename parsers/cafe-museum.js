const pdfParser = require('pdf-parser');

const util = require('./util')

exports.parse = function () {
    return new Promise((resolve, reject) => {
        // parse pdf
        var PDF_PATH = 'https://www.cafemuseum.de/images/cafe-museum/speisekarten/Wochenkarte-Cafe-Museum.pdf';
        pdfParser.pdf2json(PDF_PATH, function (error, pdfData) {
            if (error != null) {
                console.log(error);
                reject(error);
            }
            // texts of first pdf page
            const texts = pdfData.pages[0].texts;

            // get texts for start date, end date, weekly dishes and daily dishes prices
            let i = 11
            let str = ""
            for (; ; ++i) {
                if (texts[i].text == "Mo") break
                str += texts[i].text;
            }
            var match = str.match(/ *([0-9.]*) – ([0-9.]*) *([^0-9]*) *([0-9,]*) *([^0-9]*) *([0-9,]*) *([0-9,]*) *([0-9,]*) */)
            if (match == null) {
                console.log("Error while parsing Cafe Museum!")
                return null
            }
            // split regex match into variables
            let [_, startDate, endDate, weekDish1, weekPrice1, weekDish2, weekPrice2, dailyPrice1, dailyPrice2] = match

            // week dishes
            weekDishes = {
                title: "Wochenessen",
                arr: [
                    {
                        name: weekDish1.replace(/der Woche!* */, "der Woche: ").trim(),
                        price: weekPrice1 + " €"
                    },
                    {
                        name: weekDish2.replace(/der Woche!* */, "der Woche: ").trim(),
                        price: weekPrice2 + " €"
                    }
                ]
            }

            dailyPrice1 += " €"
            dailyPrice2 += " €"

            // initialize daily dishes array
            const nDays = 5, nDishes = 2;
            let dailyDishes = [];
            for (var j = 0; j < nDays * nDishes; ++j) {
                dailyDishes.push({
                    name: '',
                    day: Math.floor(j / nDishes + 1),
                    price: '',
                })
            }
            let iDay = 0 // current week day
            // loop over all remaining texts
            for (; i < texts.length; ++i) {
                // x coordinate of text
                const x = texts[i].left;
                // decode text
                const text = decodeURIComponent(texts[i].text);
                // check if to update current weekday
                switch (text) {
                    case "Mo":
                        iDay = 0
                        break
                    case "Di":
                        iDay = 1
                        break
                    case "Mi":
                        iDay = 2
                        break
                    case "Do":
                        iDay = 3
                        break
                    case "Fr":
                        iDay = 4
                        break
                    case "Beilagensalat zum Menü ":
                        iDay = 5
                }
                if (iDay < 0) continue
                if (iDay > 4) break
                // get dish index (0 or 1) from x coordinate
                const iDish = Math.floor((x - 50) / (300 - 58));
                if (iDish < 0 || iDish > nDishes - 1) continue;
                // current dish in dish array
                const dish = dailyDishes[iDay * nDishes + iDish];
                dish.name += text;
            }

            for (i = 0; i < nDays * nDishes; ++i) {
                // add dish price
                if (i % 2 == 0) dailyDishes[i].price = dailyPrice1
                else dailyDishes[i].price = dailyPrice2
                // trim dish name and remove duplicate white space
                dailyDishes[i].name = dailyDishes[i].name.trim().replace(/\s+/g, " ")
            }
            resolve({
                dateStart: util.germanDateToInternational(startDate),
                dateEnd: util.germanDateToInternational(endDate),
                dailyDishes: { title: "Tagesessen", arr: dailyDishes },
                weekDishes: weekDishes
            });
        });
    })
}