require("dotenv");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const {
  client,
  createUser,
  createSkill,
  fetchUsers,
  fetchSkills,
  createUserSkill,
  fetchUserSkills,
  destroyUserSkill,
  authenticate,
  findUserByToken,
  signToken,
} = require("./db");

const server = express();
client.connect();

//middlewares
server.use(express.json());
server.use(morgan("dev"));
server.use(cors());
server.use(async (req, res, next) => {
  try {
    //get the token from the request
    const token = req.header("Authorization");

    if (token) {
      const user = await findUserByToken(token);

      if (!user || !user.id) {
        next({
          name: "Authorization Header Error",
          message: "Authorization token malformed",
        });
        return;
      } else {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`server listening on port ${port}`));

server.get("/api/users", async (req, res, next) => {
  try {
    const users = await fetchUsers();
    res.send(users);
  } catch (error) {
    next(error);
  }
});

server.get("/api/skills", async (req, res, next) => {
  try {
    const skills = await fetchSkills();
    res.send(skills);
  } catch (error) {
    next(error);
  }
});

server.get("/api/users/userSkills", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }

    const skills = await fetchUserSkills(req.user.id);
    res.send(skills);
  } catch (error) {
    next(error);
  }
});

server.post("/api/users/userSkills", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }

    const skill = await createUserSkill(req.user.id, req.body.skill_id);
    res.send(skill);
  } catch (error) {
    next(error);
  }
});

server.delete("/api/users/userSkills/:id", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }

    await destroyUserSkill(req.params.id, req.user.id);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

server.post("/api/auth/register", async (req, res, next) => {
  try {
    const user = await createUser(req.body?.name, req.body?.password);

    const token = await signToken(user.id);
    res.send({ token });
  } catch (error) {
    next(error);
  }
});
