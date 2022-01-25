const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL Client Setup
const mysql = require('mysql')
const connection = mysql.createConnection({
    host: keys.mySqlHost,
    port: keys.mySqlPort,
    database: keys.mySqlDatabase,
    user: keys.mySqlUser,
    password: keys.mySqlPassword
});

connection.connect(function (err) {
    if (err) {
        console.log("error occurred while connecting");
    } else {
        console.log("connection created with Mysql successfully");
    }
});

connection
  .query('CREATE TABLE IF NOT EXISTS values (number INT)', function(err, result) {
      if (err) {
          console.log(err)
      }
  })

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
    res.send('Hi');
});

app.get('/values/all', async (req, res) => {
    const values = await connection.query('SELECT * from values');

    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/values', async (req, res) => {
    const index = req.body.index;

    if (parseInt(index) > 40) {
        return res.status(422).send('Index too high');
    }

    redisClient.hset('values', index, 'Nothing yet!');
    redisPublisher.publish('insert', index);
    connection.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({working: true});
});

app.listen(5000, err => {
    console.log('Listening');
});
