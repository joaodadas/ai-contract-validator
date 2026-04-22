import "dotenv/config";
console.log("DATABASE_URL atual:", process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ":****@"));
