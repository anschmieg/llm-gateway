export interface ProviderConfig {
  id: string;
  baseUrl: string;
  secretVar: string;
  type: 'openai' | 'azure' | 'anthropic';

  // New Filtering Rules (Strings interpreted as Regex)
  whitelist?: string[];
  blacklist?: string[];
}

export const providers: ProviderConfig[] = [
  // {
  //   id: "deepinfra",
  //   baseUrl: "https://api.deepinfra.com/v1/openai",
  //   secretVar: "DEEPINFRA_API_KEY",
  //   type: "openai",
  //   // Example: Only allow Qwen and DeepSeek models
  //   whitelist: ["Qwen", "deepseek"],
  //   blacklist: ["start"]
  // },
  // {
  //   id: "groq",
  //   baseUrl: "https://api.groq.com/openai/v1",
  //   secretVar: "GROQ_API_KEY",
  //   type: "openai",
  //   // Example: Block the whisper audio models from showing up in chat list
  //   blacklist: ["whisper", "audio"]
  // },
  {
    id: 'copilot',
    baseUrl: 'https://copilot.s-x.workers.dev/v1', // Your proxy URL
    secretVar: 'COPILOT_API_KEY',
    type: 'openai',
    // Copilot lists tons of weird snapshots. Let's keep it clean.
    whitelist: ['gpt-*', 'oswe-*', 'code*', 'grok-*'],
    blacklist: [
      'o*',
      'claude*',
      '*{ddd*}',
      'gemini*',
      'gpt-5',
      'gpt-5.1-*',
      '',
    ], // exclude snapshots, at least 4 digits trailing
  },
] as const;
