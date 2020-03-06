exports.germanDateToInternational = function (date) {
    const [d, m, y] = date.split('.')
    return y + "-" + m + "-" + d;
}

exports.weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
]