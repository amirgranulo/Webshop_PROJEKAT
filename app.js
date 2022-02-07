var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
const fileUpload = require('express-fileupload');

const app = express();
var uuid = require('uuid');



var utils = require('./utils/pomocne_funkcije');
var auth = require('./utils/auth');

var homeRouter = require('./routes/home');
var artikalRouter = require('./routes/artikal');
var profilRouter = require('./routes/profil');
var pretragaRouter = require('./routes/pretraga');
var korpaRouter = require('./routes/korpa');
var narudzbeRouter = require('./routes/narudzbe')
var adminRouter = require('./routes/admin');
var chatRouter = require('./routes/chat');




// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret : 'tajnikljucnecesnikadpogodit',
    genid: function(req) {
        return uuid.v4(); // ⇨ '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
     // enkripcija
    },
    resave : false,
  saveUninitialized : true
}));


app.use(fileUpload());

app.use('/home',homeRouter);
app.use('/artikal',artikalRouter);
app.use('/profil',profilRouter);
app.use('/pretraga',pretragaRouter);
app.use('/korpa',korpaRouter);
app.use('/narudzbe', narudzbeRouter);
app.use('/admin',adminRouter)
app.use('/chat',chatRouter);
app.use(express.static(__dirname + '/public')); // omoguci css



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
