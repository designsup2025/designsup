import * as AuthSession from 'expo-auth-session';

export const SMARTTHINGS = {
  clientId: "154750f6-8d11-47de-bb75-8c8f00c15904",
  clientSecret: "432846dc-d9ee-4f3e-9b1a-b0bfebcc84ba",
  redirectUri: AuthSession.makeRedirectUri({
    scheme: "designsup",
    preferLocalhost: true,
  }),
  authUrl: "https://auth-global.api.smartthings.com/oauth/authorize",
  tokenUrl: "https://auth-global.api.smartthings.com/oauth/token",
  apiBase: "https://api.smartthings.com/v1",
};
