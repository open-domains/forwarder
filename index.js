const express = require('express');
const app = express();
const mongodb = require('mongodb');
const bodyParser = require('body-parser');
require("dotenv").config();

// Connect to MongoDB
const uri =  process.env.MONGODB_URI;
const client = new mongodb.MongoClient(uri, { useNewUrlParser: true });
client.connect((err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const db = client.db('forwarding');
  const collection = db.collection('domains');

  app.use((req, res, next) => {
    const host = req.get('host');

    // Query the MongoDB collection to get the new URL for the host
    collection.findOne({ host: host }, (err, result) => {
      if (err) {
        console.error(err);
        return next();
      }

      if (result) {
        res.redirect(301, result.newUrl + req.url);
      } else {
        res.redirect(301, 'https://open-domains.net');
      }
    });
  });

  // Parse the body of incoming requests
  app.use(bodyParser.json());

  // API endpoint to add new domains and redirects
  app.post('/api/domains', (req, res) => {
    const apiKey = req.get('X-API-Key');

    if (apiKey !== process.env.API_KEY) {
      return res.status(401).send({ error: 'Invalid API key' });
    }

    const { host, newUrl } = req.body;

    // Insert the new domain and redirect into the MongoDB collection
    collection.insertOne({ host, newUrl }, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ error: 'Failed to insert document' });
      }

      res.send({ message: 'Document inserted successfully' });
    });
  });

  app.listen(3000, () => {
    console.log('App listening on port 3000');
  });
});
