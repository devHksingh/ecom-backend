import { config as conf } from "dotenv";
conf();

const _config = {
    port: process.env.PORT,
    databaseUrl: process.env.MONGO_CONNECTION_STRING,
    env: process.env.NODE_ENV,
    JWT_ACCESS_KEY: process.env.JWT_ACCESS_KEY,
    JWT_REFRESH_KEY: process.env.JWT_REFRESH_KEY,
    cloudinaryCloud: process.env.CLOUDINARY_CLOUD,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinarySecret: process.env.CLOUDINARY_API_SECRET,
    frontendDomain: process.env.FRONTEND_DOMAIN,
    clientDomain:process.env.CLIENT_DOMAIN,
    dashboardDomain:process.env.DASHBOARD_DOMAIN,
    JWT_REFRESH_EXP:process.env.JWT_REFRESH_EXP,
    JWT_ACCESS_EXP:process.env.JWT_ACCESS_EXP,
    JWT_ISSUER:process.env.JWT_ISSUER,
    JWT_AUDIENCE:process.env.JWT_REFRESH_EXP,
};

export const config = Object.freeze(_config);