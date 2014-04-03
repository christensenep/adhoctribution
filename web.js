var express = require("express");
var logfmt = require("logfmt");
var util = require("./lib/util");
var logic = require("./lib/logic");
var app = express();

// set up handlebars view engine
var handlebars = require('express3-handlebars').create({
  defaultLayout: 'main'
});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(logfmt.requestLogger());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.cookieParser());
app.use(express.session({
  secret: process.env.SESSION_SECRET
}));
app.use(express.favicon());
app.use(app.router);
app.use(express.static(__dirname + '/public'));
app.use('/bower', express.static(__dirname + '/bower_components'));

// persona
require("express-persona")(app, {
  audience: process.env.HOST + ":" + process.env.PORT, // Must match your browser's address bar
  verifyResponse: function (err, req, res, email) {
    if (util.endsWith(email, "mozillafoundation.org")) {
      req.session.authorized = true;
      res.json({
        status: "okay",
        email: email
      });
      return;
    }

    res.json({
      status: "failure",
      reason: "Only users with a mozillafoundation.org email address may use this tool"
    });
  },
  logoutResponse: function (err, req, res) {
    if (req.session.authorized) {
      req.session.authorized = null;
    }

    res.json({
      status: "okay"
    });
  }
});

// routes
app.get('/', function (req, res) {
  if (req.session.authorized) {
    res.redirect('/log-em');
  } else {
    res.render('home', {
      authorized: (req.session.authorized)
    });
  }
});

app.get('/log-em', function (req, res) {
  if (!req.session.authorized) {
    res.redirect('/');
  } else {
    var email = req.session.email;
    var username = email.replace("@mozillafoundation.org", "");
    res.render('log-em', {
      currentUser: email,
      username: username,
      authorized: (req.session.authorized)
    });
  }
});

app.post('/log-em', function (req, res) {
  if (!req.session.authorized) {
    res.redirect('/');
  } else {
    logic.processForm(req.body, req.session.email, function processedForm(err, response) {
      if (err) {
        console.error(err);
      }
      res.redirect('/log-em?yippee');
    });
  }
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function () {
  console.log("Listening on " + port);
});
