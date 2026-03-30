import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { getMongoClient, getMongoDb } from "@/lib/mongo";

const baseURL = process.env.BETTER_AUTH_URL;
if (!baseURL) {
  throw new Error("BETTER_AUTH_URL is required");
}

const trustedOrigins = [
  baseURL,
  process.env.NEXT_PUBLIC_APP_URL,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? []),
].filter((u): u is string => Boolean(u));

const uniqueTrusted = [...new Set(trustedOrigins)];

const cookieDomain = process.env.BETTER_AUTH_COOKIE_DOMAIN?.trim();

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(getMongoDb(), {
    client: getMongoClient(),
    transaction: process.env.MONGODB_DISABLE_TRANSACTIONS === "true" ? false : undefined,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders:
    googleId && googleSecret
      ? {
          google: {
            clientId: googleId,
            clientSecret: googleSecret,
          },
        }
      : {},
  trustedOrigins: uniqueTrusted,
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    ...(cookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: cookieDomain,
          },
        }
      : {}),
  },
  plugins: [nextCookies()],
});
