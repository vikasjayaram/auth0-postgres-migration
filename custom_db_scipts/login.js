function login(email, password, callback) {
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

    var query = 'SELECT * FROM users WHERE email = $1';

    client.query(query, [email], function (err, result) {
      // NOTE: always call `done()` here to close
      // the connection to the database
      done();

      if (err) {
        console.log('error executing query', err);
        return callback(err);
      }

      if (result.rows.length === 0) {
        return callback(new WrongUsernameOrPasswordError(email));
      }

      var user = result.rows[0];      
      //bcrypt.compare(password, user.password, function (err, isValid) {
      // if (!isValid) {
      //  callback(new WrongUsernameOrPasswordError(email));
      // } else {
      //   callback(null, {
      //     id: user.id.toString(),
      //     nickname: user.nickname,
      //     email: user.email
      //   });
      // }
      //}
      //});
      if (password !== user.password) {
        callback(new WrongUsernameOrPasswordError(email));
        } else {
          callback(null, {
            id: user.id.toString(),
            nickname: user.nickname,
            email: user.email
          });
        }
    });
  });
}
