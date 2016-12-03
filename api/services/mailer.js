var nodemailer = require('nodemailer'),
  emailTemplates = require('email-templates'),
  moment = require('moment'),
  i18n = require('i18n'),
  path = require('path');

var EmailTemplate = emailTemplates.EmailTemplate;

var transporter;

var publicDir = path.resolve(__dirname, '..', 'public');
var templatesDir = path.resolve(__dirname, '..', 'views');
var partialsDir = path.join(templatesDir, 'partials');

var defaultMailOptions = {
  from: 'WWOOF France <hello@wwoof.fr>',
  attachments: [
    {
      filename: 'email-logo.png',
      path: path.join(publicDir, 'email-logo.png'),
      cid: 'wwoof-logo'
    },
    {
      filename: 'facebook-circle.png',
      path: path.join(publicDir, 'facebook-circle.png'),
      cid: 'facebook-circle'
    },
    {
      filename: 'twitter-circle.png',
      path: path.join(publicDir, 'twitter-circle.png'),
      cid: 'twitter-circle'
    }
  ]
};

/**
 * Configures the mailer.
 * @param {Object} options
 */
exports.configure = function(options) {

  transporter = nodemailer.createTransport(options.smtp, defaultMailOptions);

  emailTemplates.requires.handlebars = options.viewEngine.handlebars;

  options.viewEngine.handlebars.registerPartial('html-email-layout', require(path.join(partialsDir, 'html-email-layout.hbs')));
  options.viewEngine.handlebars.registerPartial('text-email-layout', require(path.join(partialsDir, 'text-email-layout.hbs')));
};

/**
 * Sends a welcome email to new users.
 * @param {Object} user The new user.
 * @returns {Promise}
 */
exports.register = function(user) {

  var locale = user.locale;
  var subject = i18n.__({ phrase: 'register.subject', locale: locale });

  var template = new EmailTemplate(path.join(templatesDir, 'register'));

  var sendRegister = transporter.templateSender(template);

  return sendRegister({
    to: user.email,
    subject: subject
  }, {
    user: user,
    subject: subject,
    locale: locale
  });
};

/**
 * Sends an email with a new password.
 * @param {Object} user The user whose password was reset.
 * @param {String} newPassword The new password of the user.
 * @returns {Promise}
 */
exports.resetPassword = function(user, newPassword) {

  var locale = user.locale;
  var subject = i18n.__({ phrase: 'resetPassword.subject', locale: locale });

  var template = new EmailTemplate(path.join(templatesDir, 'reset-password'));

  var sendResetPassword = transporter.templateSender(template);

  return sendResetPassword({
    to: user.email,
    subject: subject
  }, {
    user: user,
    newPassword: newPassword,
    subject: subject,
    locale: locale
  });
};

/**
 * Sends an email to inform a host that it has been approved.
 * @param {Object} user The host's user.
 * @returns {Promise}
 */
exports.approveHost = function(user) {

  var subject = 'Votre profil hôte a été approuvé !';

  var template = new EmailTemplate(path.join(templatesDir, 'host-approved'));

  var sendHostApproval = transporter.templateSender(template);

  return sendHostApproval({
    to: user.email,
    subject: subject
  }, {
    user: user,
    subject: subject,
    locale: user.locale
  });
};

/**
 * Sends an email to a host after purchasing a membership.
 * @param {Object} user The host's user.
 * @param {Object} host The host.
 * @returns {Promise}
 */
exports.membershipHost = function(user, host) {

  var locale = user.locale;
  var subject = i18n.__({ phrase: 'membershipHost.subject', locale: locale });

  var template = new EmailTemplate(path.join(templatesDir, 'membership-host'));

  var sendMembershipNotice = transporter.templateSender(template);

  return sendMembershipNotice({
    to: user.email,
    subject: subject
  }, {
    user: user,
    hostId: host.id,
    subject: subject,
    locale: user.locale
  });
};

/**
 * Sends an email to a wwoofer after purchasing a membership.
 * @param {Object} user The wwoofer's user.
 * @returns {Promise}
 */
exports.membershipWwoofer = function(user) {

  var locale = user.locale;
  var subject = i18n.__({ phrase: 'membershipWwoofer.subject', locale: locale });

  var template = new EmailTemplate(path.join(templatesDir, 'membership-wwoofer'));

  var sendMembershipNotice = transporter.templateSender(template);

  return sendMembershipNotice({
    to: user.email,
    subject: subject
  }, {
    user: user,
    subject: subject,
    locale: locale
  });
};

/**
 * Sends an email informing a user that its membership is about to expire.
 * @param {Object} user The user whose membership is about to expire.
 * @param {Object} membership The membership about to expire.
 * @returns {Promise}
 */
exports.reminder = function(user, membership) {

  var locale = user.locale;
  var subject = i18n.__({ phrase: 'reminder.subject', locale: locale });

  // Prepare the expiration date for formatting
  var expireDate = moment(membership.expireAt);
  expireDate.locale(locale);

  var template = new EmailTemplate(path.join(templatesDir, 'reminder'));

  var sendReminder = transporter.templateSender(template);

  return sendReminder({
    to: user.email,
    subject: subject
  }, {
    user: user,
    expireDate: expireDate.format('LL'),
    renewUrl: `https://app.wwoof.fr/memberships/new?type=${membership.type}`,
    locale: locale
  });
};

/**
 * Send an email on behalf of a wwoofer to a host.
 * @param {Object} hostUser The host's user.
 * @param {Object} wwooferUser The wwoofer's user.
 * @param {Object} host The host.
 * @param {Object} wwoofer The wwoofer.
 * @param {String} message The message to send.
 * @returns {Promise}
 */
exports.contactHost = function(hostUser, wwooferUser, host, wwoofer, message) {

  var subject = `Nouveau message de ${wwooferUser.firstName}`;

  var template = new EmailTemplate(path.join(templatesDir, 'contact-host'));

  var sendContactHost = transporter.templateSender(template);

  return sendContactHost({
    from: 'WWOOF France <messaging@wwoof.fr>',
    to: hostUser.email,
    replyTo: wwooferUser.email,
    subject: subject
  }, {
    subject: subject,
    message: message,
    hostUser: hostUser,
    wwooferUser: wwooferUser,
    wwooferUrl: `https://app.wwoof.fr/wwoofer/${wwoofer.id}`,
    hostUrl: `https://app.wwoof.fr/host/${host.id}`,
    locale: hostUser.locale
  });
};

/**
 * Send a copy of a wwoofer's message to the wwoofer for reference.
 * @param {Object} hostUser The host's user.
 * @param {Object} wwooferUser The wwoofer's user.
 * @param {Object} host The host.
 * @param {Object} wwoofer The wwoofer.
 * @param {String} message The message that was sent.
 * @returns {Promise}
 */
exports.contactHostCopy = function(hostUser, wwooferUser, host, wwoofer, message) {

  var locale = wwooferUser.locale;
  var subject = i18n.__({ phrase: 'contactHostCopy.subject', locale: locale }, { firstName: hostUser.firstName });

  var template = new EmailTemplate(path.join(templatesDir, 'contact-host-copy'));

  var sendContactHostCopy = transporter.templateSender(template);

  return sendContactHostCopy({
    from: 'noreply@wwoof.fr',
    to: wwooferUser.email,
    subject: subject
  }, {
    subject: subject,
    message: message,
    hostUser: hostUser,
    wwooferUser: wwooferUser,
    host: host,
    hostUrl: `https://app.wwoof.fr/host/${host.id}`,
    locale: wwooferUser.locale
  });
};

/**
 * Send an email on behalf of a host to a wwoofer.
 * @param {Object} hostUser The host's user.
 * @param {Object} wwooferUser The wwoofer's user.
 * @param {Object} host The host.
 * @param {Object} wwoofer The wwoofer.
 * @param {String} message The message to send.
 * @returns {Promise}
 */
exports.contactWwoofer = function(hostUser, wwooferUser, host, wwoofer, message) {

  var locale = wwooferUser.locale;
  var subject = i18n.__({ phrase: 'contactWwoofer.subject', locale: locale }, { firstName: hostUser.firstName });

  var template = new EmailTemplate(path.join(templatesDir, 'contact-wwoofer'));

  var sendContactWwoofer = transporter.templateSender(template);

  return sendContactWwoofer({
    from: 'WWOOF France <messaging@wwoof.fr>',
    to: wwooferUser.email,
    replyTo: hostUser.email,
    subject: subject
  }, {
    subject: subject,
    message: message,
    host: host,
    hostUser: hostUser,
    wwooferUser: wwooferUser,
    hostUrl: `https://app.wwoof.fr/host/${host.id}`,
    locale: wwooferUser.locale
  });
};

/**
 * Sends an email informing a user that a new review was published on its profile.
 * @param {Object} review The review.
 * @param {Object} profileUrl The URL where the review can be read at.
 * @param {Object} authorUser The user who submitted the review.
 * @param {Object} revieweeUser The user who received the review.
 * @returns {Promise}
 */
exports.newReview = function(review, profileUrl, authorUser, revieweeUser) {

  var locale = revieweeUser.locale;
  var subject = i18n.__({ phrase: 'newReview.subject', locale: locale }, { firstName: authorUser.firstName });

  var template = new EmailTemplate(path.join(templatesDir, 'new-review'));

  var sendNewReview = transporter.templateSender(template);

  return sendNewReview({
    to: revieweeUser.email,
    subject: subject
  }, {
    subject,
    review,
    authorUser,
    revieweeUser,
    profileUrl,
    locale
  });
};

/**
 * Sends an email informing the author of a review that it received a reply.
 * @param {Object} review The review.
 * @param {Object} profileUrl The URL where the review can be read at.
 * @param {Object} authorUser The user who submitted the review.
 * @param {Object} revieweeUser The user who received the review.
 * @returns {Promise}
 */
exports.replyReview = function(review, profileUrl, authorUser, revieweeUser) {

  var locale = authorUser.locale;
  var subject = i18n.__({ phrase: 'replyReview.subject', locale: locale }, { firstName: revieweeUser.firstName });

  var template = new EmailTemplate(path.join(templatesDir, 'reply-review'));

  var sendReplyReview = transporter.templateSender(template);

  return sendReplyReview({
    to: authorUser.email,
    subject: subject
  }, {
    subject,
    review,
    authorUser,
    revieweeUser,
    profileUrl,
    locale
  });
};
