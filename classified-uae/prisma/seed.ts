import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash("admin123", 10)

  await prisma.user.upsert({
    where: { email: "admin@classifieduae.com" },
    update: {},
    create: {
      email: "admin@classifieduae.com",
      name: "Admin",
      password,
      role: "ADMIN",
    },
  })

  console.log("admin user created")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
