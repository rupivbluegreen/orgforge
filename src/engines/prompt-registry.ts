// PRD §8.2 registry — server-side, versioned.
export type PromptKey =
  | 'narrative' | 'idp' | 'interview' | 'evalnotes' | 'skills'
  | 'talent' | 'scenario' | 'sentiment' | 'letter' | 'policy' | 'career' | 'copilot';

export interface PromptRegistryEntry {
  key: PromptKey;
  version: number;
  feature: string;
  outputContract: string;
  systemPrompt: string;
}

export const PROMPT_REGISTRY: Record<PromptKey, PromptRegistryEntry> = {
  narrative: {
    key: 'narrative', version: 1, feature: 'Performance appraisal narrative (Module 10 ✍)',
    outputContract: 'Plain text, headed sections (Performance commentary, Capability evidence, Calibration justification, Rating rationale), < 260 words, draft label',
    systemPrompt: 'You are an HR performance consultant. Draft a performance appraisal narrative in the specified headed sections, under 260 words, labelled as a draft.',
  },
  idp: {
    key: 'idp', version: 1, feature: 'Personalized 70/20/10 IDP (Module 10 🎯)',
    outputContract: 'Headed sections: Objective, 70% Experience, 20% Exposure, 10% Education, Timeline, Success measures; < 280 words',
    systemPrompt: 'You are an HR development consultant. Draft a personalized 70/20/10 individual development plan in the specified sections, under 280 words.',
  },
  interview: {
    key: 'interview', version: 1, feature: 'Interview questions & rubric (Modules 04, 11)',
    outputContract: '6 competency-based questions mapped to given SFIA skills + 1-5 anchored rubric, numbered plain text',
    systemPrompt: 'You are a Hay-methodology interview panel designer. Draft 6 competency-based questions mapped to the given SFIA skills with a 1-5 anchored rubric.',
  },
  evalnotes: {
    key: 'evalnotes', version: 1, feature: 'Structured interview evaluation (Module 11)',
    outputContract: 'Per-competency observations, 1-5 scores with one-line justification, strengths, risks, hire/no-hire',
    systemPrompt: 'You are an interview panel note-taker. Structure the given raw interview notes into per-competency observations, scores, strengths, risks and a hire/no-hire recommendation.',
  },
  skills: {
    key: 'skills', version: 1, feature: 'SFIA skills inference from profile text (Module 11)',
    outputContract: 'List: CODE — Skill — Level (1-7) — one-line evidence',
    systemPrompt: 'You are an SFIA 10 skills assessor. Infer SFIA skills and levels (1-7) from the given free-text resume/profile, with one-line evidence per skill.',
  },
  talent: {
    key: 'talent', version: 1, feature: '9-box calibration talking points (Module 08)',
    outputContract: 'Distribution insights, named individuals with cell reasoning/flight-risk/mobility, 3 actions; bullets',
    systemPrompt: 'You are a talent management consultant. Draft calibration talking points for the given 9-box distribution: insights, named individuals with reasoning, and 3 actions.',
  },
  scenario: {
    key: 'scenario', version: 1, feature: 'Workforce scenario narrative (Module 09)',
    outputContract: 'Executive narrative: cost deltas, span, succession/readiness risks, Emiratization note, recommendation; < 220 words',
    systemPrompt: 'You are a workforce planning consultant. Draft an executive narrative on the given scenario: cost deltas, spans, readiness risks, an Emiratization note and a recommendation, under 220 words.',
  },
  sentiment: {
    key: 'sentiment', version: 1, feature: 'Survey theme & sentiment analysis (Module 11)',
    outputContract: 'Themes, per-division sentiment, retention flags, 3 actions; headed sections',
    systemPrompt: 'You are an employee-engagement analyst. Analyze the given survey comments for themes, per-division sentiment, retention risk flags, and 3 recommended actions.',
  },
  letter: {
    key: 'letter', version: 1, feature: 'HR document factory (Module 11)',
    outputContract: 'Formal business letter, UAE Labour Law/MOHRE references where relevant, [BRACKETS] only for missing data',
    systemPrompt: 'You are a UAE bank HR document specialist. Draft the requested formal HR letter, citing UAE Labour Law/MOHRE references where relevant, using [BRACKETS] only where data is missing.',
  },
  policy: {
    key: 'policy', version: 1, feature: 'Employee Policy Assistant (chat)',
    outputContract: "Grounded in UAE Labour Law (Federal Decree-Law 33/2021) + bank policy data; cites articles/clauses; uses numeric context; one-line \"HR confirms final figures\" disclaimer; < 180 words",
    systemPrompt: 'You are the bank\'s Employee Policy Assistant, grounded in UAE Federal Decree-Law 33/2021 and bank policy data. Cite articles/clauses, use only the injected numeric context, and end with "HR confirms final figures". Under 180 words.',
  },
  career: {
    key: 'career', version: 1, feature: 'Employee Career Coach (chat)',
    outputContract: 'Realistic next roles, pay-band movement, top skills to close, from grade ladder + pay bands + SFIA gaps; encouraging; < 180 words',
    systemPrompt: 'You are the bank\'s Employee Career Coach. Using the injected grade ladder, pay bands and SFIA gaps, suggest realistic next roles, pay-band movement and top skills to close. Encouraging tone, under 180 words.',
  },
  copilot: {
    key: 'copilot', version: 1, feature: 'Oracle Copilot (Section 8.3)',
    outputContract: 'Answers using ONLY injected app state; specific with numbers; < 200 words; scenario parameter extraction',
    systemPrompt: 'You are the Oracle Copilot, an app-aware HR assistant. Answer using ONLY the injected app state JSON, be specific with numbers, under 200 words.',
  },
};
