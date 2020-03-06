const restler = require('restler');
const xpath = require('xpath')
const dom = require('xmldom').DOMParser

const util = require('./util')

exports.parse = function () {
    return new Promise((resolve, reject) => {
        restler.get('https://www.eiszeit-rv.de/mittagstisch/').on('complete', function (result) {
            result = result.replace(/<br ?\/?>\w*\r?\n/g, " ")
            // start and end date
            const headers = xpath.select("//tr[@class='first-row']/td", new dom().parseFromString(result))
            const dateStart = util.germanDateToInternational(headers[0].firstChild.data)
            const dateEnd = util.germanDateToInternational(headers[headers.length - 2].firstChild.data)
            // offers (daily dishes)
            const rows = xpath.select("//tr[@class='follow-row']/td", new dom().parseFromString(result))
            var offers = {
                title: "Mittagstisch – all you can eat"
            };
            for (let i = 0; i < rows.length - 1; i += 2) {
                if (rows[i + 1].firstChild == null) continue; // @todo? 
                const day = util.weekdays[Math.floor(i / 8) + 1];
                if (!offers[day]) offers[day] = [];
                offers[day].push({
                    name: rows[i].firstChild.data + ": " + rows[i + 1].firstChild.data
                })
            }
            resolve({ 
                dateStart: dateStart,
                dateEnd: dateEnd,
                ...offers
            })
        })
    })
};