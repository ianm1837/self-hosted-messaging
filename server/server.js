const express = require('express')
const path = require('path')
const db = require('.config/connection')
const routes = require('./routes')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

app.use(routes)

db.once('open', () => {
  app.listen(PORT, () => console.log('now listening on: ', PORT))
})
