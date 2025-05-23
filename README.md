# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## AI Question Generation

This application includes AI-powered question generation from textbooks. The system supports multiple AI providers including OpenAI (GPT), Google (Gemini), and Anthropic (Claude).

### Configuration

To use the AI question generation feature, you need to configure API keys for at least one provider:

1. Add the following to your `.env` file:
   ```
   # Default AI provider (openai, gemini, or claude)
   DEFAULT_AI_PROVIDER=openai
   
   # OpenAI Configuration
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_MODEL=gpt-4-turbo-preview
   
   # Google Gemini Configuration
   GEMINI_API_KEY=your-gemini-api-key
   
   # Anthropic Claude Configuration
   CLAUDE_API_KEY=your-claude-api-key
   ```

2. Obtain API keys:
   - OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Anthropic Claude API key from [Anthropic Console](https://console.anthropic.com/)

3. You only need to configure the providers you plan to use. If you don't configure a provider, it will be unavailable in the UI.

### Usage

The AI configuration page allows users to:
- Select between available AI providers
- Choose specific models for the selected provider
- Configure question counts for each difficulty level

Each provider has different strengths and pricing models:
- OpenAI GPT: High capability with broad knowledge
- Google Gemini: Good integration with Google knowledge
- Anthropic Claude: Strong reasoning and instruction following

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
