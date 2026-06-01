ALTER TABLE "store_account" RENAME COLUMN "shopifyAccessToken" TO "accessToken";--> statement-breakpoint
ALTER TABLE "store_account" RENAME COLUMN "shopifyAccessTokenExpiresAt" TO "accessTokenExpiresAt";--> statement-breakpoint
ALTER TABLE "store_account" RENAME COLUMN "shopifyRefreshToken" TO "refreshToken";--> statement-breakpoint
ALTER TABLE "store_account" RENAME COLUMN "shopifyRefreshTokenExpiresAt" TO "refreshTokenExpiresAt";