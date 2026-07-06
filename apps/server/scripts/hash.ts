import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('uso: pnpm --filter @z-notes/server hash "sua-senha"');
  process.exit(1);
}
console.log(bcrypt.hashSync(password, 10));
