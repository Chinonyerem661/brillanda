import bcrypt from "bcryptjs";
import { env } from "./env";

// Cost 12 in real use; tests use the minimum so the suite stays fast.
const COST = env.NODE_ENV === "test" ? 4 : 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | undefined;

/** Takes as long as a real check, so response time doesn't reveal whether an email has an account. */
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= bcrypt.hash("brillanda-no-such-account", COST);
  await bcrypt.compare(password, await dummyHash);
}
