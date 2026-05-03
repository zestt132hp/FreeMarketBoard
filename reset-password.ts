import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "./shared/schema.js";
import bcrypt from 'bcrypt';
import { eq } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function resetPassword(phone: string, newPassword: string) {
  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    const result = await db.update(schema.users)
      .set({ password: hashedPassword })
      .where(eq(schema.users.phone, phone));
    
    if (result.length === 0) {
      console.log(`User with phone ${phone} not found.`);
    } else {
      console.log(`Password for user ${phone} has been reset successfully.`);
      console.log(`New password: ${newPassword}`);
    }
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await client.end();
  }
}

// Usage: node reset-password.ts <phone> <newPassword>
const phone = process.argv[2];
const newPassword = process.argv[3];

if (!phone || !newPassword) {
  console.log('Usage: node reset-password.ts <phone> <newPassword>');
  console.log('Example: node reset-password.ts 77872858 qwe123');
  process.exit(1);
}

resetPassword(phone, newPassword);