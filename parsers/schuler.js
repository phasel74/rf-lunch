const pdfParser = require('pdf-parser');

const util = require('./util')

exports.parse = function () {
    return new Promise((resolve, reject) => {
        // parse pdf
        var PDF_PATH = 'https://rf-lunch.hasels.de/media/schuler/schuler-aktuell.pdf';
        pdfParser.pdf2json(PDF_PATH, function (error, pdfData) {
            if (error != null) {
                reject(error);
            }
            // initialize dishes array
            const nDays = 5, nDishes = 3;
            let dishes = [];
            let i;
            for (i = 0; i < nDays * nDishes; ++i) {
                dishes.push({
                    name: '',
                    day: Math.floor(i / nDishes + 1),
                    price: '',
                    garnish: { name: '', price: '' }
                })
            }
            // texts of first pdf page
            const texts = pdfData.pages[pdfData.pages.length - 1].texts;
            // loop over all texts (skipping the first 10 from heading)
            for (i = 10; i < texts.length; ++i) {
                // coordinates of text
                const x = texts[i].left;
                const y = texts[i].top;
                // decode text
                const text = decodeURIComponent(texts[i].text);
                console.log(x + ", " + y + ", " + text)
                // get week day of text from y coordinate
                const iDay = Math.floor((-y + 617) / (56 + 17));
                if (iDay < 0 || iDay > 4) continue;
                // get dish index (0 or 1) from x coordinate
                const iDish = Math.floor((x - 120) / 140);;
                if (iDish < 0 || iDish > 2) continue;
                // current dish in dish array
                const dish = dishes[iDay * nDishes + iDish];
                // check if text is a price, a garnish and/or a additive
                const isPrice = (x - 120) % 140 >= 110;
                const isGarnish = (-y + 617) % (56 + 17) >= 56.05;
                const isAdditive = text.slice(-2).match(/,/);
                // insert information into current dish
                if (isAdditive) continue;
                if (!isGarnish) {
                    if (!isPrice) {
                        dish.name += text;
                        if (text.slice(-1) !== '-' && text.slice(-1) !== ' ') dish.name += ' ';
                    } else {
                        dish.price += text;
                    }
                } else {
                    if (!isPrice) {
                        dish.garnish.name += text;
                        if (text.slice(-1) !== '-' && text.slice(-1) !== ' ') dish.garnish.name += ' ';
                    } else {
                        dish.garnish.price += text;
                    }
                }
            }
            // filter 'Hurra Feiertag!!!' etc.
            dishes = dishes.filter(e => e.name.indexOf("!") < 0)
            // @todo create offers object above directly
            offers = {
                title: "Tagesessen"
            }
            for (let dish of dishes) {
                if (dish.price == "") continue; 
                const day = util.weekdays[dish.day];
                if (!offers[day]) offers[day] = [];
                const dish2 = {}
                if (dish.name) dish2.name = dish.name;
                if (dish.price) dish2.price = dish.price;
                if (dish.garnish.name) {
                    dish2.garnish = {
                        name: dish.garnish.name
                    }
                    if (dish.garnish.price) dish2.garnish.price = dish.garnish.price
                }
                offers[day].push(dish2);
            }
            resolve({
                dateStart: util.germanDateToInternational(texts[2].text),
                dateEnd: util.germanDateToInternational(texts[3].text),
                offers: offers
            });
        });
    })
}