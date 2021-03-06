function getByEmail (email, callback) {
 var pg = require('pg@4.3.0');
 var config = {
   user: configuration.PGUSER, //env var: PGUSER
   database: configuration.PGDATABASE, //env var: PGDATABASE
   password: configuration.PGPASSWORD, //env var: PGPASSWORD
   host: configuration.PGHOST, // Server hosting the postgres database
   port: configuration.PGPORT, //env var: PGPORT
   max: 10, // max number of clients in the pool
   idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
 };

 pg.connect(config, function (err, client, done) {
   if (err) {
     console.log('could not connect to postgres db', err);
     return callback(err);
   }

   var query = 'SELECT * FROM users WHERE email = $1 AND strategy = $2';
   // check for default strategy in this case it is "database".
   client.query(query, [email, "database"], function (err, result) {
     // NOTE: always call `done()` here to close
     // the connection to the database
     done();

     if (err) {
       console.log('error executing query', err);
       return callback(err);
     }

     if (result.rows.length === 0) {
       return callback();
     }

     var user = result.rows[0];
     callback(null, {
       user_id: user.id.toString(),
       nickname: user.nickname,
       email: user.email
     });
   });
 });
}
