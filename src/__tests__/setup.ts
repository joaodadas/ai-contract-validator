// Global test setup — env vars for tests
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local so DB tests can reach the dev database
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

process.env.CVCRM_BASE_URL = "https://test.cvcrm.com.br";
process.env.CVCRM_EMAIL = "test@test.com";
process.env.CVCRM_TOKEN = "test-token";
process.env.CVCRM_SYNC_ENABLED = "false";
