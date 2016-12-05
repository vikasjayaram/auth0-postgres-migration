# Migrating Users from PostGres Database

This uses [WEBTASK.IO](https://webtask.io)
Sample project for creating an Express-based server that runs on webtask.io for accessing external PostGres database.
This webtask migrates social login users existing in postgres but do not have a `email /password`
user record.

### Version
0.0.1

# Initial Setup & Configuration
```bash
# Create a new wt-cli profile
npm install -g wt-cli
wt init

# Or, if you already use wt-cli:
wt profile ls
```

### Initialization
```sh
$ wt create ext_idp_webtask.js
    -s CLIENT_ID=YOUR_NON_INTERACTIVE_AUTH0_CLIENT_ID
    -s CLIENT_SECRET=YOUR_NON_INTERACTIVE_AUTHO_CLIENT_SECRET
    -s ACCOUNT_NAME=YOUR_AUTH0_DOMAIN
    -s AUTH0_CONNECTION_NAME=YOUR_AUTH0_CUSTOM_DB_CONNECTION_NAME
    -s PGUSER=YOUR_PG_USER
    -s PGDATABASE=YOUR_PG_DATABASE
    -s PGPASSWORD=YOUR_PG_PASSWORD
    -s PGHOST=YOUR_PG_HOST
    -s PGPORT=YOUR_PG_PORT
```

### Steps this webtask does

- Gets user record from postgres database based on `email` and `strategy`
- Gets Auth0 Access token to search for the user based on `email` and `connection`
- Searches Auth0 for the user based on `email` and `connection`
- Creates a user with the email and random password if the user does not exist in Auth0 and
  external postgres database
- Once the user is created the social account is linked as the secondary to the created
  user in the previous step used as the primary for account linking.
