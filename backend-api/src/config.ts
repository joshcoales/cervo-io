let configFile = "config.json";
if (process.env.CONFIG_FILE) {
    configFile = process.env.CONFIG_FILE;
}
interface MySqlConfig {
    host?: string
    socketPath?: string
    username: string
    password: string
    database: string
}
export interface Config {
    mysql: MySqlConfig
    google_distance_api_key: string
}

export const config: Config = require("../"+configFile);
