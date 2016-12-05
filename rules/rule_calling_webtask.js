function (user, context, callback) {
  // Add your supported strategies.
  var strategies = ["google-oauth2", "facebook", "fitbit"]
  var strategy = user.user_id.split('|')[0];
  if (strategies.indexOf(strategy) != -1) {
   var request = require('request');
   var base_url = "{Webtask URL}";
   var options = {
    url: base_url,
    json: {user: user}
   };
   request.post(options, function (err, response, body) {
     if (err || response.status >= 400) return callback(new Error("Something went wrong"));
     else return callback(null, user, context);
   });
  } else {
    callback(null, user, context);
  }
}
