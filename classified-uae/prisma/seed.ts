import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10)

  const admin = await prisma.user.upsert({
    where: { email: "admin@classifieduae.com" },
    update: {},
    create: {
      email: "admin@classifieduae.com",
    
      password: hashedPassword,
      role: "ADMIN",
    },
  })

  console.log("Admin user created:", admin)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })