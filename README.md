# Block 36 - Authentication

We are adding more authentication onto our server from Block 35. We have hashed our passwords to be more secure. Now we need to be able to login a user and compare the password they provide to make sure they are authenticated.

We also want to simplify our endpoints and not have to pass the `user_id` in the url. We will generate JSON web tokens (JWT) to send as a way to authenticate a user.

The following image shows the database schema:
![database schema](./assets/db_schema.png)

We need to add the following to the data layer:

- `authenticate`
  - Takes credentials and if the username and password match what is saved in the database we will return a JWT
- `findUserByToken`
  - Takes a token and returns a user
- `signToken`
  - Takes a user id and returns a JWT token

The guided practice should successfully create the following routes:

| Method | Endpoint                  | Description                                                                    |
| ------ | ------------------------- | ------------------------------------------------------------------------------ |
| GET    | /api/users                | Returns an array of users                                                      |
| GET    | /api/skills               | Returns an array of skills                                                     |
| GET    | /api/users/userSkills     | Returns an array of skills for the user.                                       |
| POST   | /api/users/userSkills     | Creates a new user_skill for the user and returns the newly created user_skill |
| DEL    | /api/users/userSkills/:id | Returns nothing                                                                |
| POST   | /api/auth/register        | Creates a user and returns a JWT token when successful                         |

Note the following endpoints will pass a JWT in the header `Authorization` to authenticate the user

- `GET /api/users/userSkills`
- `POST /api/users/userSkills`
- `DEL /api/users/userSkills/:id`

1. Since we will be creating JWT (`jsonwebtoken`) we need to install the `jsonwebtoken` package

- `jsonwebtoken` needs a secret to create and validate tokens so we will need to create a `.env` file and add a constant `JWT_SECRET` equal to some secure string.
  - Make sure to add the `.env` to our `.gitignore` so we don't push up secret information
- Since we will be needing the value from our environment file we need to install `dotenv` and require it in our `db.js` file

<details>
    <summary>Show Answer</summary>

.env

```
JWT_SECRET="super secret super safe!"
```

.gitignore

```
node_modules
.env
```

</details>

2. Create the `authenticate` function in the data layer (`db.js`)

- The function will take a name and password for a user
- It will compare the password provided with the hashed password from the database
- If a match is found a JWT will be returned
  - The user's id will be added into the payload of the JWT token
- If there the user doesn't exist or the password is incorrect `null` or `false` should be returned

<details>
    <summary>Show Answer</summary>

/server/db.js

```js
const pg = require("pg");
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "shhh";
require("dotenv");

//... all the functions from block 35 ...

const authenticate = async ({ username, password }) => {
  const SQL = `
    SELECT id, password
    FROM users
    WHERE username = $1
  `;

  const response = await client.query(SQL, [username]);

  //if no user or the password isn't correct return false
  if (
    !response.rows.length ||
    (await bcrypt.compare(password, response.rows[0].password)) === false
  ) {
    return false;
  }

  //if the user exists and the password is correct return the JWT
  const token = await jwt.sign({ id: response.rows[0].id }, JWT_SECRET);

  return { token };
};
```

</details>

3. Create the function `findUserByToken` in the `db.js` file
   - The function takes a token and verify the token
   - Using the user id from the token check that the user exists and return the user
   - If the user doesn't exist return `null` or `false`

<details>
    <summary>Show Answer</summary>

/server/db.js

```js
// ...everything else still in the file ...

const findUserByToken = async (token) => {
  const SQL = `
    SELECT id, username
    FROM users
    WHERE id = $1
  `;
  const { id } = await jwt.verify(token, JWT_SECRET);

  const response = await client.query(SQL, [id]);
  if (!response.rows.length) {
    return null;
  }
  return response.rows[0];
};
```

</details>

4. Create the function `signToken` in the `db.js` file

   - The function takes a user id and returns a valid JWT
   - Make sure to sign the token with the user id provided

<details>
    <summary>Show Answer</summary>

/server/db.js

```js
// ...everything else still in the file ...

const signToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET);
};
```

</details>

5. Create the `POST /api/auth/register` endpoint

- The username and password should be within the request body
- The endpoint should return a JWT token upon successful creation of the user

<details>
  <summary>Show Answer</summary>

/server/index.js

```js
// ... rest of the file ...
//registers a user
server.post("/api/auth/register", async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    const token = await signToken(user.id);
    res.status(201).send({ token });
  } catch (error) {
    next(error);
  }
});
```

</details>

6. Add a middleware on the server to get the token from the `Authorization` header and call `findUserByToken`. Add the user returned to the request.

<details>
  <summary>Show Answer</summary>

/server/index.js

```js
const express = require("express");
const {
  client,
  createUserSkill,
  fetchUsers,
  fetchUserSkills,
  fetchSkills,
  deleteUserSkill,
  findUserByToken,
} = require("./db");

//create the express server
const server = express();
//connect to the db client
client.connect();

//middleware to use before all routes
server.use(express.json()); //parses the request body so our route can access it

server.use(async (req, res, next) => {
  try {
    const token = req.header("Authorization");
    console.log(token);
    if (!token) {
      next();
    } else {
      req.user = await findUserByToken(token);
      if (!user || !user?.id) {
        next({
          name: "AuthorizationHeaderError",
          message: "Authorization token malformed",
        });
      } else {
        req.user = user;
        next();
      }
    }
  } catch (error) {
    next(error);
  }
});

// ...endpoints...
```

</details>

7.  Update the following routes so the user id is no longer in the url and is retrieved from the request

- `GET /api/users/userSkills`
- `POST /api/users/userSkills`
- `DEL /api/users/userSkills/:id`

<details>
  <summary>Show Answer</summary>

/server/index.js

```js
//...other endpoints...

//returns an array of a particular user's skills
server.get("/api/users/userSkills", async (req, res, next) => {
  try {
    //check if there is a user on the request
    //if there isn't that means no token was sent and they are unauthorized
    if (!req?.user) {
      return res.status(401).send("You must be logged in to do that.");
    }

    res.send(await fetchUserSkills(req.user.id));
  } catch (ex) {
    next(ex);
  }
});

//adds a skill to a particular user
server.post("/api/users/userSkills", async (req, res, next) => {
  try {
    if (!req?.user) {
      return res.status(401).send("You must be logged in to do that.");
    }

    res.status(201).send(
      await createUserSkill({
        user_id: req.user.id,
        skill_id: req.body.skill_id,
      })
    );
  } catch (ex) {
    next(ex);
  }
});

//deletes a particular user's skill
server.delete("/api/users/userSkills/:id", async (req, res, next) => {
  try {
    if (!req?.user) {
      return res.status(401).send("You must be logged in to do that.");
    }

    await deleteUserSkill({ id: req.params.id, user_id: req.user.id });
    res.sendStatus(204);
  } catch (ex) {
    next(ex);
  }
});
```

</details>

6. Now that our server is complete we can deploy the API on Render. Before deploying we need a npm package called `cors` to let our server be able to talk other application across the internet

<details>
  <summary>Show Answer</summary>
You can install the package via:

```bash
npm i cors
```

/server/index.js

```js
const express = require("express");
const server = express();
const cors = require("cors");

// .... code ...

server.use(express.json());
server.use(cors());

// .... rest of code ...
```

</details>

7. You can follow the directions found [here](../../../deploy_api/README.md) or in Canvas.
