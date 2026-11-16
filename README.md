# Orgforge

Organization design and workforce planning studio. Job evaluation (Hay),
cost modeling, governance, SFIA skills, rewards, restructuring, talent,
performance, and an AI copilot. Rules-engine core with an optional
Live AI mode.

## Develop

```
npm ci
npm test
cd web && npm ci && npm run dev
```

## Live AI (optional)

The native rules engine works with no setup. Live AI uses any
OpenAI-compatible chat completions endpoint (`HttpLlmClient`).
Keep API keys server-side.

## Docker

```
docker build -t orgforge .
docker run -p 8080:80 orgforge
```

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
