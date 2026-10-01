import { config as loadEnv } from 'dotenv';
loadEnv({path:new URL('../../.env',import.meta.url).pathname,quiet:true});
import type { NextConfig } from 'next';
const config: NextConfig = {transpilePackages:['@gov/core','@gov/government','@gov/db','@gov/retrieval','@gov/ai','@gov/evals'],serverExternalPackages:['postgres','@langfuse/otel','@opentelemetry/sdk-node'], poweredByHeader:false};
export default config;
