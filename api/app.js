var express = require('express'),
  config = require('./config/config'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  morgan = require('morgan'),
  path = require('path'),
  expressValidator = require('express-validator'),
  passport = require('passport'),
  session = require('express-session'),
  MySQLStore = require('express-mysql-session')(session),
  i18n = require('i18n'),
  http = require('http'),
  favicon = require('serve-favicon'),
  errorHandler = require('express-error-handler'),
  domain = require('express-domain-middleware'),
  logger = require('./utils/logger'),
  expressLogger = require('./utils/express-logger'),
  expressHandlebars = require('express-handlebars'),
  mailer = require('./services/mailer');

module.exports = function() {

  // Create express app
  var app = express();
  app.set('port', process.env.PORT || config.port);

  // Configure express handlebars
  var hbs = expressHandlebars.create({
    extname: '.hbs'
  });

  // Set view engine
  app.engine('hbs', hbs.engine);
  app.set('view engine', 'hbs');

  // Configure mailer
  mailer.configure({ viewEngine: hbs, smtp: config.smtp });

  // Configure i18n
  i18n.configure({
    objectNotation: true,
    locales: ['en', 'fr'],
    defaultLocale: 'en',
    cookie: 'locale',
    indent: '  ',
    directory: path.join(__dirname, '/locales/server')
  });

  // Configure cookie parser
  app.use(cookieParser());

  // Configure session
  var sessionStore = new MySQLStore(config.mysql_session);
  app.use(session({
    secret: config.session_secret,
    cookie: { httpOnly: true },
    store: sessionStore,
    saveUninitialized: true,
    resave: true
  }));

  // Configure express logger (morgan)
  var morganFormat = process.env.NODE_ENV === 'development' ? 'dev' : 'combined';
  app.use(morgan(morganFormat, { stream: logger.stream }));

  // Configure the rest of the application
  app.use(favicon(path.join(__dirname, '/public/favicon.ico')));
  app.use(domain);
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(methodOverride('X-HTTP-Method-Override'));
  app.use(expressValidator(require('./utils/validators')));
  app.use(i18n.init);

  // Add helpers to handlebars
  hbs.handlebars.registerHelper('i18n', function() {
    var args = Array.prototype.slice.call(arguments);
    var options = args.pop();
    return i18n.__.apply(options.data.root, args);
  });
  hbs.handlebars.registerHelper('breaklines', function(text) {
    text = hbs.handlebars.Utils.escapeExpression(text);
    text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
    return new hbs.handlebars.SafeString(text);
  });

  // Configure authentication with passport
  require('./config/passport')(app, passport);

  // Set a cookie containing current locale if not present
  app.use(function(req, res, next) {
    var locale = req.user ? req.user.locale : req.getLocale();
    if (!req.cookies.locale || req.cookies.locale !== locale) {
      res.cookie('locale', locale, { maxAge: 900000, httpOnly: false });
    }
    next();
  });

  // All 'id' parameters will be parsed as integers
  app.param('id', function(req, res, next, id) {
    req.params.id = parseInt(id);
    if (isNaN(req.params.id)) {
      return res.sendStatus(404);
    }
    next();
  });

  app.use(function (req, res, next) {
    /**
     * Process the role of a user for the current request.
     * @param ownedEntityId Id (or array of ids) of the entity owned by the user.
     * @returns {string} The role of the user.
     */
    req.getUserRole = function(ownedEntityId) {
      var id = this.params.id;
      var ownedEntityIds = Array.isArray(ownedEntityId) ? ownedEntityId : [ownedEntityId];

      var role = 'other';
      if (this.isAuthenticated()) {
        if (this.user.isAdmin) {
          role = 'admin';
        } else if (ownedEntityIds.indexOf(id) > -1) {
          role = 'owner';
        } else if (this.user.hasNonExpiredMembership()) {
          role = 'member';
        }
      }
      return role;
    };
    next();
  });

  // Init all routes
  require('./routes')(app, passport);

  // Development and test only configurations
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    // Expose public folder for static files
    // Once in production, Nginx takes care of it
    app.use('/public/', express.static('public'));
  }

  // Error handler: log error then pass it to express-error-handler
  app.use(expressLogger());

  // Create a server
  var server = http.createServer(app);

  // Initialize express-error-handler (close connections and exit process on unhandled exceptions)
  app.use(errorHandler({ server: server }));

  return app;
};
