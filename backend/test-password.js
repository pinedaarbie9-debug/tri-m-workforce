import bcrypt from "bcryptjs";

const hash = "$2a$10$u3qgJ2pUKRqqIiLtR.UhueMF8Dwzm0uBeurZQyEoieN...";

const result = await bcrypt.compare(
  "415266031998",
  hash
);

console.log(result);