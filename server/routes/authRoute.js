const config = require("../config");
const jwt = require("jwt-simple");
const jws = require("jws-jwk");
const axios = require("axios");
const UserModel = require("../models/user");
const express = require("express");
const router = express.Router();

let jwk;

router.post("/", (req, res) => {
  token = req.header("Authorization");
  if (!token) res.status(404).send("The token is missing");

  if (jwk) {
    handleAuth(token, res);
  } else {
    axios
      .get("https://accounts.google.com/.well-known/openid-configuration")
      .then(function(response) {
        axios.get(response.data.jwks_uri).then(function(response) {
          jwk = response.data;
          handleAuth(token, res);
        });
      });
  }
});

function handleAuth(token, res) {
  jws.verify(token, jwk);
  payload = jwt.decode(token, "", true);

  UserModel.findOne({
    email: payload.email
  }).exec((err, user) => {
    if (err) throw err;

    if (user) {
      res.set("Content-Type", "application/json");
      res.status(200).send({ token: jwt.encode(user, config.GOOGLE_API_SECRET)});
    } else {
      const user = new UserModel({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        balance: 0
      });
      user.save(err => {
        if (err) throw err;
      });

      res.set("Content-Type", "application/json");
      res.status(201).send({ token: jwt.encode(user, config.GOOGLE_API_SECRET)});
    }
  });
}

module.exports = router;
