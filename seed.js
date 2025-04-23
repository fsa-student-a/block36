const {
  client,
  createTables,
  createUser,
  createSkill,
  fetchUsers,
  fetchSkills,
  createUserSkill,
  fetchUserSkills,
  destroyUserSkill,
} = require("./db");

const seed = async () => {
  await client.connect();

  await createTables();
  console.log("tables created");

  const [user, student, admin, writing, reading, hacking] = await Promise.all([
    createUser("user", "abc123"),
    createUser("student", "somePassword"),
    createUser("admin", "admin"),
    createSkill("writing"),
    createSkill("reading"),
    createSkill("hacking"),
  ]);

  console.log("users created");
  console.log(await fetchUsers());

  console.log("skills created");
  console.log(await fetchSkills());

  const [student_skill] = await Promise.all([
    createUserSkill(student.id, hacking.id),
    createUserSkill(user.id, writing.id),
    createUserSkill(admin.id, reading.id),
  ]);

  console.log("user skills created");
  console.log(await fetchUserSkills(student.id));

  await destroyUserSkill(student_skill.id, student.id);

  console.log("after deleting user skill");
  console.log(await fetchUserSkills(student.id));

  await client.end();
};

seed();
