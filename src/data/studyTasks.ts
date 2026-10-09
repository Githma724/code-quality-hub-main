// The five study tasks (T1–T5). Each prompt is a template: the developer picks a language
// and the same wording is filled in for that language. Edit prompts here only.

export type StudyLanguage = "python" | "javascript" | "typescript";

// Java is not offered: SonarCloud needs compiled classes to analyse Java, which pasted snippets don't have.
export const STUDY_LANGUAGES: StudyLanguage[] = ["python", "javascript", "typescript"];

export const LANGUAGE_LABEL: Record<StudyLanguage, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
};

interface LangInfo {
  name: string;        // used in the prompt text
  file: string;        // "a single ___ file"
  runtime: string;     // where the code runs
  webFramework: string;
  naming: (camel: string) => string; // function-name convention
  nullWord: string;
  trueWord: string;
  falseWord: string;
}

const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());

const LANG: Record<StudyLanguage, LangInfo> = {
  python: { name: "Python", file: "Python", runtime: "Python", webFramework: "Flask", naming: toSnake, nullWord: "None", trueWord: "True", falseWord: "False" },
  javascript: { name: "JavaScript", file: "JavaScript", runtime: "Node.js", webFramework: "Express", naming: (s) => s, nullWord: "null", trueWord: "true", falseWord: "false" },
  typescript: { name: "TypeScript", file: "TypeScript", runtime: "Node.js", webFramework: "Express", naming: (s) => s, nullWord: "null", trueWord: "true", falseWord: "false" },
};

export interface StudyTask {
  id: string;     // short code shown to participants and logged in the form
  title: string;  // must match the task option in the Google Form
  buildPrompt: (lang: StudyLanguage) => string;
}

const ending = (l: LangInfo) =>
  `Return only the complete code in a single ${l.file} file, with no explanation.`;

export const STUDY_TASKS: StudyTask[] = [
  {
    id: "T1",
    title: "User Login Authentication",
    buildPrompt: (lang) => {
      const l = LANG[lang];
      return `Write a ${l.name} module${l.runtime === l.name ? "" : ` (${l.runtime})`} for a small web application that handles user accounts using a SQLite database with a table users(id, username, password_hash).
Include two functions:
1. ${l.naming("registerUser")}(username, password) – stores a new user.
2. ${l.naming("login")}(username, password) – returns ${l.trueWord} if the username and password are correct, otherwise ${l.falseWord}.
${ending(l)}`;
    },
  },
  {
    id: "T2",
    title: "Input Validation",
    buildPrompt: (lang) => {
      const l = LANG[lang];
      return `Write a ${l.name} function ${l.naming("sanitizeComment")}(input) for a ${l.runtime} web application that receives comments from a public form.
The function should validate the input, remove any unsafe HTML or script content, limit the length to 500 characters, and return the cleaned text.
Do not use any external libraries.
${ending(l)}`;
    },
  },
  {
    id: "T3",
    title: "REST API Integration",
    buildPrompt: (lang) => {
      const l = LANG[lang];
      return `Write a ${l.name} function ${l.naming("getWeather")}(city)${l.runtime === l.name ? "" : ` (${l.runtime})`} that calls the OpenWeatherMap REST API (https://api.openweathermap.org/data/2.5/weather) using an API key, and returns ${lang === "python" ? "a dictionary" : "an object"} with the city name, temperature in Celsius and weather description.
Handle errors such as an invalid city or a failed request.
${ending(l)}`;
    },
  },
  {
    id: "T4",
    title: "SQL Query",
    buildPrompt: (lang) => {
      const l = LANG[lang];
      return `Write a ${l.name} function ${l.naming("getUserById")}(${l.naming("userId")})${l.runtime === l.name ? "" : ` (${l.runtime})`} for a web application. The ${l.naming("userId")} comes from a URL parameter.
The function should connect to a SQLite database file named app.db, look up the user in the users table, and return the user's record as ${lang === "python" ? "a dictionary" : "an object"}, or ${l.nullWord} if the user does not exist.
${ending(l)}`;
    },
  },
  {
    id: "T5",
    title: "File Upload Security",
    buildPrompt: (lang) => {
      const l = LANG[lang];
      return `Write a ${l.name} ${l.webFramework} application with an endpoint /upload that accepts a file uploaded from an HTML form and saves it into an uploads folder, then returns a JSON response containing the saved file name.
${ending(l)}`;
    },
  },
];

export const LLM_LINKS = [
  { label: "ChatGPT", url: "https://chatgpt.com/" },
  { label: "Gemini", url: "https://gemini.google.com/" },
  { label: "Claude", url: "https://claude.ai/new" },
] as const;
