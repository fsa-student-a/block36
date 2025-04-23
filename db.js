require("dotenv");
const pg = require("pg");
const uuid = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "safe!";

const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/acme_talent_agency_db"
);

const createTables = async () => {
  const SQL = `
        DROP TABLE IF EXISTS user_skills;
        DROP TABLE IF EXISTS users;
        DROP TABLE IF EXISTS skills;

        CREATE TABLE skills(
            id UUID PRIMARY KEY, 
            name VARCHAR(255) NOT NULL UNIQUE
        );

        CREATE TABLE users(
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE, 
            password VARCHAR(255) NOT NULL
        );

        CREATE TABLE user_skills(
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES users(id) NOT NULL,
            skill_id UUID REFERENCES skills(id) NOT NULL,
            CONSTRAINT unique_user_skill UNIQUE (user_id, skill_id)
        );
    `;

  await client.query(SQL);
};

const createUser = async (name, password) => {
  const SQL = `INSERT INTO users(id, name, password) VALUES($1, $2, $3) RETURNING *;`;
  const hashed_password = await bcrypt.hash(password, 5);

  const response = await client.query(SQL, [uuid.v4(), name, hashed_password]);

  return response.rows[0];
};

const createSkill = async (name) => {
  const SQL = `INSERT INTO skills(id, name) VALUES($1,$2) RETURNING *;`;

  const response = await client.query(SQL, [uuid.v4(), name]);

  return response.rows[0];
};

const fetchUsers = async () => {
  const SQL = `SELECT * from users;`;

  const response = await client.query(SQL);

  return response.rows;
};

const fetchSkills = async () => {
  const SQL = `SELECT * from skills;`;

  const response = await client.query(SQL);

  return response.rows;
};

const createUserSkill = async (user_id, skill_id) => {
  const SQL = `INSERT INTO user_skills(id, user_id, skill_id) VALUES($1, $2, $3) RETURNING *;`;

  const reponse = await client.query(SQL, [uuid.v4(), user_id, skill_id]);

  return reponse.rows[0];
};

const fetchUserSkills = async (user_id) => {
  const SQL = `SELECT * from user_skills WHERE user_id = $1;`;

  const response = await client.query(SQL, [user_id]);

  return response.rows;
};

const destroyUserSkill = async (id, user_id) => {
  const SQL = `DELETE FROM user_skills WHERE id = $1 AND user_id = $2`;

  await client.query(SQL, [id, user_id]);
};

const authenticate = async (name, password) => {
  const SQL = `SELECT id, password FROM users WHERE name = $1;`;

  const response = await client.query(SQL, [name]);

  //check that the password matches
  const match_password = await bcrypt.compare(
    password,
    response.rows[0]?.password
  );

  //check that a user exists
  if (match_password) {
    //create token
    return await signToken(response.rows[0].id);
  }

  return null;
};

const findUserByToken = async (token) => {
  //verify the token
  const { id } = await jwt.verify(token, JWT_SECRET);

  const SQL = `SELECT * FROM users WHERE id = $1`;

  const response = await client.query(SQL, [id]);

  return response.rows[0];
};

const signToken = async (user_id) => {
  return jwt.sign({ id: user_id }, JWT_SECRET);
};

module.exports = {
  client,
  createTables,
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
};
