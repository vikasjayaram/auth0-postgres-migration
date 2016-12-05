"use strict";

 const jwt        = require('jsonwebtoken');
 const moment     = require('moment');
 const request    = require('request');
 const express    = require('express');
 const Webtask    = require('webtask-tools');
 const async      = require('async');
 const randomize  = require('randomatic');
 const pg         = require('pg');
 const app        = express();

 /*
 * Local variables
 */
 let accessToken = null;
 let lastLogin = null;
 app.post('/call_ext_db', function (req, res) {
   const context = req.webtaskContext;
   const user = req.webtaskContext.body.user;
   console.log(user);
   if (!user) {
     return res.status(400).json({error: 'user object is required'});
   }
   async.waterfall([
     async.apply(getUserFromExternalDB, user, context),
     getAuth0AccessToken,
     searchForUser,
     createUser,
     linkAccount
   ], function (err, result) {
     if (err) return res.status(400).json({error: err});
     return res.status(200).json({data: result});
   });
 });

function getUserFromExternalDB(user, context, callback) {
  let config = {
                 user: context.data.PGUSER, //env var: PGUSER, context.data.PGUSER
                 database: context.data.PGDATABASE, //env var: PGDATABASE, context.data.PGDATABASE
                 password: context.data.PGPASSWORD, //env var: PGPASSWORD, context.data.PGPASSWORD
                 host: context.data.PGHOST, // Server hosting the postgres database, context.data.PGHOST
                 port: context.data.PGPORT, //env var: PGPORT, context.data.PGPORT
                 max: 10, // max number of clients in the pool
                 idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
               };
   pg.connect(config, function (err, client, done) {
      if (err) {
        console.log('could not connect to postgres db', err);
        return callback(err);
      }
      // NOTE:
      // Assumes your have a column in your users table called strategy.
      // E.g google-oauth2, facebook, fitbit, etc
      // Change strategy to your equivalent column name in the users table.
      let query = 'SELECT * FROM users WHERE email = $1 AND strategy = $2';
      let provider = user.user_id.split('|')[0];
      client.query(query, [user.email, provider], function (e, result) {
        // NOTE: always call `done()` here to close the connection to the database
        done();

        if (e) {
          console.log('error executing query', e);
          return callback(e);
        }

        if (result.rows.length === 0) {
          // new signup
          return callback("No existing records");
        }

        var userSocial = result.rows[0];
        // user exists in PostGres migrate user.
        console.log('userSocial', userSocial);
        callback(null, user, context, userSocial);
      });
    });
};

/*
* Request a Auth0 access token every 30 minutes
*/
function getAuth0AccessToken(user, context, userSocial, cb) {
   if (!accessToken || !lastLogin || moment(new Date()).diff(lastLogin, 'minutes') > 30) {
     const options = {
       url: 'https://' + context.data.ACCOUNT_NAME + '.auth0.com/oauth/token',
       json: {
         audience: 'https://' + context.data.ACCOUNT_NAME + '.auth0.com/api/v2/',
         grant_type: 'client_credentials',
         client_id: context.data.CLIENT_ID,
         client_secret: context.data.CLIENT_SECRET
       }
     };

     return request.post(options, function(err, response, body){
       if (err) return cb(err);
       else {
         lastLogin = moment();
         accessToken = body.access_token;
         return cb(null, user, context, userSocial, accessToken);
       }
     });
   } else {
     return cb(null, user, context, userSocial, accessToken);
   }
 };

/*
* Search for user based on email and migration database connection name
*/
function searchForUser(user, context, userSocial, token, cb){
   const options = {
     url: 'https://' + context.data.ACCOUNT_NAME + '.auth0.com/api/v2/users',
     json: true,
     headers: {
       authorization: 'Bearer ' + token
     },
     qs: {
       search_engine: 'v2',
       q: 'email:"' + user.email + '"AND identities.connection:"' + context.data.AUTH0_CONNECTION_NAME + '"',
     }
   };

  request.get(options, function(error, response, body){
     if (error) return cb(error);
     if (response.statusCode !== 200) return cb(body);
     var data = body;
     console.log('data', JSON.stringify(data));
     return cb(error, user, context, userSocial, token, data);
   });
 };

function createUser (user, context, userSocial, token, existingUser, cb) {
  if (existingUser.length == 0) {
    let new_password = null;
    new_password = randomize('*', 10);
    //create user in auth0 db. Link the newly create user with the google-oauth2 account.
    return request.post({
      url: 'https://' + context.data.ACCOUNT_NAME + '.auth0.com/api/v2/users',
      headers: {
        Authorization: 'Bearer ' + token
      },
      json: { email: userSocial.email, password: new_password, connection: context.data.AUTH0_CONNECTION_NAME, email_verified: true }
    }, function(err, response, body) {
        console.log(err);
        console.log(body);
        if (err || response.statusCode >= 400) {
          cb(body);
        } else {
          cb(null, user, context, userSocial, token, existingUser, body);
        }
    });
  } else {
    return cb(null, user, context, userSocial, token, existingUser, null);
  }
};

function linkAccount (user, context, userSocial, token, existingUser, targetUser, cb) {
  if (!targetUser) {
    return cb(null, user, context);
  } else {
    let aryTmp = user.user_id.split('|');
    let provider = aryTmp[0];
    let targetUserId = aryTmp[1];
    console.log('provider', provider);
    console.log('user.user_id', user.user_id);
    console.log('targetUserId', targetUserId);
    request.post({
      url: 'https://' + context.data.ACCOUNT_NAME + '.auth0.com/api/v2/users/' + targetUser.user_id + '/identities',
      headers: {
        Authorization: 'Bearer ' + token
      },
      json: { provider: provider, user_id: user.user_id }
    }, function(err, response, body) {
        if (err || response.statusCode >= 400) {
          return cb('Error linking account: ' + response.statusMessage);
        } else {
          return cb(null, body, context);
        }
    });
  }
}

module.exports = Webtask.fromExpress(app);
