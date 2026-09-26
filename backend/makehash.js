import bcrypt from "bcryptjs";

const hash = await bcrypt.hash("415266031998", 10);
console.log(hash);