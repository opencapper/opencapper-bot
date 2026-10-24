interface BotEnvironment {
  DISCORD_BOT_TOKEN?: string;
  BOT_API_TOKEN?: string;
  OPENCAPPER_API_URL?: string;
  DEV_GUILD_ID?: string;
  BOT_NAME?: string;
  WEBSITE_URL?: string;
  BOT_ACTIVITY?: string;
  LOG_LEVEL?: string;
  RESULTS_CHANNEL?: string;
  DATA_DIR?: string;
}

declare namespace NodeJS {
  export interface ProcessEnv extends BotEnvironment {}
}
