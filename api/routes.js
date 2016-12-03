var auth = require('./controllers/auth');
var users = require('./controllers/users');
var usersPhoto = require('./controllers/users/photo');
var clients = require('./controllers/client');
var photos = require('./controllers/photos');
var Artists = require('./controllers/artists');
var memberships = require('./controllers/memberships');
var reviews = require('./controllers/reviews');

var multer = require('multer');
var multerOpts = {
  storage: multer.diskStorage({}),
  limits: {
    fileSize: 5000000, // 5mb
    files: 1
  }
};
var upload = multer(multerOpts);

/**
 * Configures all routes.
 * @param app The express application.
 * @param passport The passport middleware.
 */
module.exports = function(app, passport) {



  app.post('/api/users/login', passport.authenticate('local'), auth.loginCallback);
  app.post('/api/users/logout', auth.logout);
  app.get('/api/users/is-authenticated', auth.isAuthenticated);

  app.get('/api/users', /*auth.ensureAdmin,*/ users.index);
  app.get('/api/users/:id', users.single);
  app.put('/api/users/:id', auth.ensureAuthenticated, users.update);
  app.post('/api/users/:id/change-password', auth.ensureAuthenticated, users.changePassword);
  app.post('/api/users', users.create);
  app.post('/api/users/reset-password', users.resetPassword);

  app.get('/api/users/:id/photo', auth.ensureAuthenticated, usersPhoto.index);
  app.post('/api/users/:id/photo', auth.ensureAuthenticated, upload.single('file'), usersPhoto.create);
  app.delete('/api/users/:id/photo', auth.ensureAuthenticated, usersPhoto.delete);

  app.get('/api/clients', auth.ensureAdmin, hosts.index);
  app.get('/api/clients/:id', hosts.single);
  app.put('/api/clients/:id', auth.ensureAuthenticated, hosts.update);
  app.post('/api/clients', auth.ensureAuthenticated, hosts.create);

  app.get('/api/photos/:id', photos.single);
  app.put('/api/photos/:id', auth.ensureAuthenticated, photos.update);
  app.post('/api/photos', auth.ensureAuthenticated, upload.single('file'), photos.create);
  app.delete('/api/photos/:id', auth.ensureAuthenticated, photos.delete);



  app.get('/api/artists', auth.ensureAuthenticated, wwoofers.index);
  app.get('/api/artists/:id', auth.ensureAuthenticated, wwoofers.single);
  app.put('/api/artists/:id', auth.ensureAuthenticated, wwoofers.update);
  app.post('/api/artists', auth.ensureAuthenticated, wwoofers.create);
  app.post('/api/artists/:id/contact', auth.ensureAuthenticated, wwoofers.contact);




};
