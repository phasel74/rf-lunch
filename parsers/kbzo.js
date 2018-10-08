// @todo refactoring

const restler = require('restler');

const util = require('./util')

exports.parse = function () {
    return new Promise((resolve, reject) => {
        restler.get('https://www.kbzo.de/Bilder/__layout/images/PDFs/Speiseplan.pdf', { "decoding": "latin1" }).on('complete', function (result) {
            const dishes = makeKbzoDishes(result)
            console.log(`Sent KBZO dishes`);
            resolve(dishes)
        })
    })
};

function makeKbzoDishes(text) {
    // regex for Montag, Donnerstag, Freitag, start and end date
    var reg = []
    reg[0] = /\/TU\(Mo M1\).*?\/V\((.*?)\)/g
    reg[1] = /\/TU\(Mo M2\).*?\/V\((.*?)\)/g
    reg[6] = /\/TU\(Do\).*?\/V\((.*?)\)/g
    reg[7] = /\/TU\(Do M2\).*?\/V\((.*?)\)/g
    reg[8] = /\/TU\(Freitag M1\).*?\/V\((.*?)\)/g
    reg[9] = /\/TU\(Fr\).*?\/V\((.*?)\)/g
    reg[10] = /\/T\(3 Montag, den \?\?\).*?\/V\((.*?)\)/g // start date
    reg[11] = /\/TU\(Freitag\).*?\/V\((.*?)\)/g // end date
    var arr = []
    for (let i = 0; i < reg.length; ++i) {
        if (!reg[i]) continue;
        txt = text.match(reg[i])
        txt = clean(txt[txt.length - 1])
        arr[i] = {
            day: Math.floor(i / 2) + 1,
            name: txt
        }
        //console.log(txt)
    }
    var endDate = arr.pop().name.replace(/.*? (.*?)/, "")
    //console.log(endDate)
    var startDate = arr.pop().name.replace(/.*? (.*?)/, "")
    //console.log(startDate)

    // regex for Dienstag, Mittwoch
    reg0 = /\/T\(0\).*?\/V\((.*?)\)/g
    var xxx = text.match(reg0)
    // print all (for debugging)
    /*
    for (let i = 0; i < xxx.length; ++i) {
      var txt = clean(xxx[i])
      console.log(txt)
    }
    */
    let idx = 2;
    for (let i = xxx.length - 1; i > 0 && idx < 6; --i) {
        var txt = clean(xxx[i])
        if (txt.indexOf(',') >= 0) continue // skip date "Montag, 01.02.1903"
        arr[idx++] = {
            day: Math.floor((idx + 1) / 2),
            name: txt
        }
    }
    // console.log(txt)
    //console.log("--------------------")
    //console.log(arr)
    //console.log("--------------------")
    dishes_ = {
        dateStart: germanDateToInternational(startDate),
        dateEnd: germanDateToInternational(endDate), // @todo rename to expire?
        //dateStart: "1900-01-01",
        //dateEnd: "1900-01-05",
        dailyDishes: { title: "Speiseplan", arr: arr }
    }
    return dishes_
}