import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {

const now = new Date();

/* 1️⃣ expire ads after 7 days */

const expired = await prisma.ad.updateMany({
where: {
status: "PUBLISHED",
expiresAt: {
lte: now,
},
},
data: {
status: "EXPIRED",
},
});

/* 2️⃣ delete ads 30 days after expiration */

const deletionLimit = new Date();
deletionLimit.setDate(deletionLimit.getDate() - 30);

const deleted = await prisma.ad.deleteMany({
where: {
status: "EXPIRED",
expiresAt: {
lt: deletionLimit,
},
},
});

return NextResponse.json({
ok: true,
expiredUpdated: expired.count,
adsDeleted: deleted.count,
});

}
