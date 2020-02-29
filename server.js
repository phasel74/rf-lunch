const express = require('express')
const cors = require('cors');
const { execSync } = require('child_process')
const bodyParser = require('body-parser')
const path = require('path')
const parser = require("./parsers")

const app = express()
app.use(cors());
app.use(bodyParser.json())

app.get('/', (request, response) => {
  response.status(200).send('Hello from RF::Lunch express server!')
})

app.get('/api/providers', function (request, response) {
  //response.status(200).send('providers api'); 
  response.sendFile(path.join(__dirname, 'providers.json'))
});

app.get('/api/dishes/:name', function (request, response) {
  var name = request.params.name;
  //response.status(200).send('dishes api for ' + name);
  parser.parse(name).then(dishes => {
    // @todo check if dish1 is undefined / null / ??? (due to parse errors)
    response.json(dishes)
  }).catch(error => {
    console.log(error)
    res.send({ 'error': error }); // @todo?
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
