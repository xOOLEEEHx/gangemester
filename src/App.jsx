import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Crown, Shield, Star, Timer, Trophy, Zap } from "lucide-react";

const NORMAL_GAME_SECONDS = 60;
const SCHOOL_BATTLE_SECONDS = 70;
const TIME_PENALTY_SECONDS = 5;
const SCHOOL_BATTLE_TIME_QUESTION_COUNT = 25;
const QUESTION_COUNT_OPTIONS = [10, 20, 30, 40];
const STORAGE_KEY = "gangemester_highscores_v1";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const ADMIN_PIN_FALLBACK = import.meta.env.VITE_ADMIN_PIN_FALLBACK || "48291736";
const APP_URL = "https://regnemester.vercel.app/";

const MODE_ORDER = ["addition", "subtraction", "multiplication", "division"];

const SCHOOL_OPTIONS = [
  "Austafjord skole",
  "Foldereid oppvekstsenter",
  "Gravvik oppvekstsenter",
  "Kolvereid skole",
  "Nærøysundet skole",
  "Rørvik skole",
];

const BOSS_OPTIONS = [
  {
    id: "slime",
    name: "Slimbossen",
    treasureName: "Slimbossens skatt",
    lives: 10,
    hearts: 5,
    arena: "Slimmyra",
    shortIcon: "SLIM",
    treasureSize: "small",
    gradient: "linear-gradient(135deg, #d9f99d, #86efac, #22c55e)",
    accent: "#16a34a",
  },
  {
    id: "troll",
    name: "Trollkongen",
    treasureName: "Trollkongens skatt",
    lives: 20,
    hearts: 4,
    arena: "Trollhulen",
    shortIcon: "TROLL",
    treasureSize: "medium",
    gradient: "linear-gradient(135deg, #fde68a, #f59e0b, #92400e)",
    accent: "#b45309",
  },
  {
    id: "shadow",
    name: "Skyggegolemen",
    treasureName: "Skyggegolemens skatt",
    lives: 30,
    hearts: 3,
    arena: "Skyggeborgen",
    shortIcon: "GOLEM",
    treasureSize: "large",
    gradient: "linear-gradient(135deg, #cbd5e1, #475569, #020617)",
    accent: "#111827",
  },
];

const BLOCKED_CONTAINS = [
  "faen", "faan", "fanden", "satan", "satans", "helvete", "hælvete", "haelvete", "jævel", "javel", "jævla", "javla", "jævlig", "javlig", "dritt", "drit", "driten", "drittsekk", "shit", "sh1t", "bæsj", "baesj", "bajs", "tiss", "piss", "promp", "fjesing", "ræv", "raev", "rompe", "rumpe", "idiot", "dust", "dumming", "taper", "loser", "mongo", "retard", "teit", "stygg", "styggen", "feit", "fett", "dum", "hater", "mobber", "slem", "ekkel", "ekkelt", "creep", "sex", "sexy", "porno", "porn", "naken", "nude", "penis", "pikk", "p1kk", "kuk", "kukk", "fitte", "f1tte", "vagina", "pupp", "pupper", "boobs", "boob", "tits", "hore", "h0re", "slut", "dildo", "sug", "suge", "suger", "blowjob", "handjob", "cum", "cumming", "orgasme", "fuck", "fck", "fuk", "fucker", "fucking", "motherfucker", "bitch", "btch", "asshole", "bastard", "damn", "crap", "dick", "cock", "pussy", "whore", "kill", "killer", "killing", "drep", "drepe", "dreper", "mord", "morder", "myrd", "death", "die", "dead", "blod", "blood", "kniv", "knife", "gun", "guns", "våpen", "vapen", "bomb", "bombe", "skyte", "skyt", "shoot", "nazi", "nazist", "hitler", "rasist", "racist", "terror", "terrorist", "isis", "kkk", "alkohol", "drunk", "vodka", "beer", "dop", "drug", "drugs", "weed", "hasj", "hash", "røyk", "royk", "snus", "vape",
];
const BLOCKED_EXACT = ["ass", "tit", "poo", "pee", "die", "dum", "slem", "stygg", "feit", "teit"];

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function normalizeNameForCheck(name) {
  return name
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    .replaceAll("0", "o")
    .replaceAll("1", "i")
    .replaceAll("!", "i")
    .replaceAll("3", "e")
    .replaceAll("4", "a")
    .replaceAll("@", "a")
    .replaceAll("5", "s")
    .replaceAll("$", "s")
    .replaceAll("7", "t")
    .replace(/[^a-z0-9]/g, "");
}

function validatePlayerName(name) {
  const cleanName = name.trim();
  if (cleanName.length < 3) return "Spillnavnet må ha minst 3 tegn.";
  if (cleanName.length > 18) return "Spillnavnet kan maks ha 18 tegn.";
  if (!/^[a-zA-ZæøåÆØÅ0-9-]+$/.test(cleanName)) return "Bruk bare bokstaver, tall eller bindestrek.";
  if (/^\d+$/.test(cleanName)) return "Spillnavnet kan ikke bare være tall.";

  const normalized = normalizeNameForCheck(cleanName);
  const hasBlockedContainsWord = BLOCKED_CONTAINS.some((word) => normalized.includes(normalizeNameForCheck(word)));
  const hasBlockedExactWord = BLOCKED_EXACT.some((word) => normalized === normalizeNameForCheck(word));
  if (hasBlockedContainsWord || hasBlockedExactWord) return "Velg et annet spillnavn. Bruk et hyggelig navn.";
  return "";
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isTimeChallengeMode(mode) {
  return mode === "addition" || mode === "subtraction";
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  if (minutes <= 0) return `${seconds} sek`;
  return `${minutes} min ${String(seconds).padStart(2, "0")} sek`;
}

function getBossConfig(bossId) {
  return BOSS_OPTIONS.find((boss) => boss.id === bossId) || BOSS_OPTIONS[0];
}

function getBossDamage(streak) {
  if (streak >= 5) return 2;
  return 1;
}

function getModeLabel(mode) {
  if (mode === "addition") return "Addisjon";
  if (mode === "subtraction") return "Subtraksjon";
  if (mode === "division") return "Divisjon";
  return "Multiplikasjon";
}

function getLevelLabel(level) {
  if (level === "easy") return "Lett";
  if (level === "hard") return "Vanskelig";
  return "Middels";
}

function getGradeLabel(gradeLevel) {
  if (Number(gradeLevel) === 8) return "Eldre";
  return `${gradeLevel}. klasse`;
}

function getGradeGroupLabel(gradeGroup) {
  if (gradeGroup === "middle") return "Mellomtrinn";
  return "Småtrinn";
}

function getLevelMax(level = "medium", mode = "multiplication") {
  if (mode === "addition" || mode === "subtraction") {
    if (level === "easy") return 20;
    if (level === "hard") return 1000;
    return 100;
  }
  if (level === "easy") return mode === "division" ? 5 : 5;
  if (level === "hard") return mode === "division" ? 20 : 20;
  return mode === "division" ? 10 : 10;
}

function getLevelDescription(mode, level) {
  const max = getLevelMax(level, mode);
  if (mode === "addition") return `${getLevelLabel(level)}: addisjon med svar fra 0–${max}`;
  if (mode === "subtraction") return `${getLevelLabel(level)}: subtraksjon uten minus, tall fra 0–${max}`;
  if (mode === "division") return `${getLevelLabel(level)}: deling med tall fra 1–${max}`;
  return `${getLevelLabel(level)}: gangestykker fra 0–${max}`;
}

function getGameSeconds(gameType) {
  return gameType === "school_battle" ? SCHOOL_BATTLE_SECONDS : NORMAL_GAME_SECONDS;
}

function getHighscoreTitle(mode, level, gradeLevel, questionCount = 10) {
  const baseTitle = `${getGradeLabel(gradeLevel)} - ${getModeLabel(mode)} - ${getLevelLabel(level)}`;
  if (isTimeChallengeMode(mode)) return `${baseTitle} - ${questionCount} oppgaver - Topp 10`;
  return `${baseTitle} - Topp 10`;
}

function randomWrongAnswer(correct) {
  if (correct === 0) return randomInt(1, 20);
  const strategies = [
    correct + randomInt(-4, 4),
    correct + 10,
    correct - 10,
    correct + randomInt(1, 12),
    Math.max(1, correct - randomInt(1, 12)),
  ];
  return Math.max(0, strategies[randomInt(0, strategies.length - 1)]);
}

function randomDivisionWrongAnswer(correct, max = 10) {
  const nearbyCandidates = [correct - 4, correct - 3, correct - 2, correct - 1, correct + 1, correct + 2, correct + 3, correct + 4].filter(
    (value) => value >= 1 && value <= max && value !== correct
  );
  if (nearbyCandidates.length > 0) return nearbyCandidates[randomInt(0, nearbyCandidates.length - 1)];
  let candidate = correct;
  while (candidate === correct) candidate = randomInt(1, max);
  return candidate;
}

function makeOptions(correct, mode, max = 10) {
  const wrongs = new Set();
  while (wrongs.size < 3) {
    const candidate = mode === "division" ? randomDivisionWrongAnswer(correct, max) : randomWrongAnswer(correct);
    if (candidate !== correct) wrongs.add(candidate);
  }
  return shuffle([correct, ...wrongs]);
}

function makeMultiplicationQuestion(a, b) {
  const correct = a * b;
  return { mode: "multiplication", a, b, symbol: "×", correct, options: makeOptions(correct, "multiplication") };
}

function makeDivisionQuestion(divisor, answer, max = 10) {
  const dividend = divisor * answer;
  const correct = answer;
  return { mode: "division", a: dividend, b: divisor, symbol: "÷", correct, options: makeOptions(correct, "division", max) };
}

function makeAdditionQuestion(level = "medium") {
  const max = getLevelMax(level, "addition");
  const a = randomInt(0, max);
  const b = randomInt(0, max - a);
  const correct = a + b;
  return { mode: "addition", a, b, symbol: "+", correct, options: makeOptions(correct, "addition") };
}

function makeSubtractionQuestion(level = "medium") {
  const max = getLevelMax(level, "subtraction");
  const a = randomInt(0, max);
  const b = randomInt(0, a);
  const correct = a - b;
  return { mode: "subtraction", a, b, symbol: "−", correct, options: makeOptions(correct, "subtraction") };
}

function makeCalculationQuestion(mode, a, b) {
  const correct = mode === "addition" ? a + b : a - b;
  const symbol = mode === "addition" ? "+" : "−";
  return { mode, a, b, symbol, correct, options: makeOptions(correct, mode) };
}

function makeSchoolBattleCalculationQuestion(mode, gradeGroup = "small", category = randomInt(0, 4)) {
  if (gradeGroup === "middle") {
    if (mode === "addition") {
      if (category === 0) return makeCalculationQuestion(mode, randomInt(20, 99), randomInt(20, 99));
      if (category === 1) {
        const a = randomInt(100, 900);
        const b = randomInt(10, Math.min(99, 999 - a));
        return makeCalculationQuestion(mode, a, b);
      }
      if (category === 2) {
        const a = randomInt(100, 800);
        const b = randomInt(100, Math.min(999 - a, 899));
        return makeCalculationQuestion(mode, a, b);
      }
      if (category === 3) {
        const a = randomInt(1, 9) * 100;
        const b = randomInt(0, 10 - a / 100) * 100;
        return makeCalculationQuestion(mode, a, b);
      }
      const a = randomInt(100, 900);
      const b = randomInt(1, 999 - a);
      return makeCalculationQuestion(mode, a, b);
    }
    if (category === 0) {
      const a = randomInt(40, 99);
      const b = randomInt(20, a);
      return makeCalculationQuestion(mode, a, b);
    }
    if (category === 1) {
      const a = randomInt(100, 999);
      const b = randomInt(10, Math.min(99, a));
      return makeCalculationQuestion(mode, a, b);
    }
    if (category === 2) {
      const a = randomInt(200, 999);
      const b = randomInt(100, a);
      return makeCalculationQuestion(mode, a, b);
    }
    if (category === 3) {
      const a = randomInt(2, 10) * 100;
      const b = randomInt(0, Math.floor(a / 100)) * 100;
      return makeCalculationQuestion(mode, a, b);
    }
    const a = randomInt(100, 999);
    const b = randomInt(1, a);
    return makeCalculationQuestion(mode, a, b);
  }
  if (mode === "addition") {
    if (category === 0) {
      const a = randomInt(0, 10);
      const b = randomInt(0, Math.min(9, 19 - a));
      return makeCalculationQuestion(mode, a, b);
    }
    if (category === 1) {
      const a = randomInt(5, 9);
      const b = randomInt(10 - a, 10);
      return makeCalculationQuestion(mode, a, b);
    }
    if (category === 2) {
      const a = randomInt(10, 95);
      const b = randomInt(1, Math.min(9, 99 - a));
      return makeCalculationQuestion(mode, a, b);
    }
    if (category === 3) {
      const a = randomInt(1, 9) * 10;
      const b = randomInt(0, 10 - a / 10) * 10;
      return makeCalculationQuestion(mode, a, b);
    }
    const a = randomInt(10, 80);
    const b = randomInt(10, 99 - a);
    return makeCalculationQuestion(mode, a, b);
  }
  if (category === 0) {
    const a = randomInt(1, 20);
    const b = randomInt(0, Math.min(10, a));
    return makeCalculationQuestion(mode, a, b);
  }
  if (category === 1) {
    const a = randomInt(11, 20);
    const minB = Math.min(a, (a % 10) + 1);
    const b = randomInt(minB, Math.min(a, 9));
    return makeCalculationQuestion(mode, a, b);
  }
  if (category === 2) {
    const a = randomInt(10, 99);
    const b = randomInt(1, Math.min(9, a));
    return makeCalculationQuestion(mode, a, b);
  }
  if (category === 3) {
    const a = randomInt(2, 10) * 10;
    const b = randomInt(0, Math.floor(a / 10)) * 10;
    return makeCalculationQuestion(mode, a, b);
  }
  const a = randomInt(20, 99);
  const b = randomInt(10, a);
  return makeCalculationQuestion(mode, a, b);
}

function createQuestionDeck(mode = "multiplication", level = "medium", gradeGroup = null) {
  const questions = [];
  const max = getLevelMax(level, mode);
  if ((mode === "addition" || mode === "subtraction") && gradeGroup) {
    for (let category = 0; category < 5; category += 1) {
      for (let index = 0; index < 5; index += 1) questions.push(makeSchoolBattleCalculationQuestion(mode, gradeGroup, category));
    }
    return shuffle(questions);
  }
  if (mode === "addition") {
    for (let index = 0; index < 200; index += 1) questions.push(makeAdditionQuestion(level));
    return shuffle(questions);
  }
  if (mode === "subtraction") {
    for (let index = 0; index < 200; index += 1) questions.push(makeSubtractionQuestion(level));
    return shuffle(questions);
  }
  if (mode === "division") {
    for (let divisor = 1; divisor <= max; divisor += 1) {
      for (let answer = 1; answer <= max; answer += 1) questions.push(makeDivisionQuestion(divisor, answer, max));
    }
    return shuffle(questions);
  }
  for (let a = 0; a <= max; a += 1) {
    for (let b = 0; b <= max; b += 1) questions.push(makeMultiplicationQuestion(a, b));
  }
  return shuffle(questions);
}

function makeQuestion(mode = "multiplication", level = "medium") {
  const deck = createQuestionDeck(mode, level);
  return deck[0];
}

function getStars(score) {
  if (score >= 30) return 5;
  if (score >= 20) return 4;
  if (score >= 15) return 3;
  if (score >= 8) return 2;
  return 1;
}

function getMessage(score) {
  if (score >= 30) return "Regnemester!";
  if (score >= 20) return "Kjempebra!";
  if (score >= 15) return "Sterkt jobbet!";
  if (score >= 8) return "Bra innsats!";
  return "God start!";
}

function sortScores(scores, mode = "multiplication") {
  const isTimed = isTimeChallengeMode(mode);
  return [...scores]
    .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(Number(entry.score)))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      score: Number(entry.score),
      mode: entry.mode || "multiplication",
      level: entry.level || "medium",
      grade_level: Number(entry.grade_level || 4),
      school: entry.school || "",
      question_count: Number(entry.question_count || 0),
    }))
    .sort((a, b) => (isTimed ? a.score - b.score : b.score - a.score))
    .slice(0, 10);
}

function sortSchoolBattleScores(scores, mode = "multiplication") {
  const isTimed = isTimeChallengeMode(mode);
  return [...scores]
    .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(Number(entry.score)))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      school: entry.school || "Ukjent skole",
      score: Number(entry.score),
      mode: entry.mode || "multiplication",
      grade_group: entry.grade_group || "small",
      question_count: Number(entry.question_count || 0),
    }))
    .sort((a, b) => (isTimed ? a.score - b.score : b.score - a.score))
    .slice(0, 20);
}

async function loadScores(mode = "multiplication", level = "medium", gradeLevel = 4, questionCount = 10) {
  const isTimed = isTimeChallengeMode(mode);
  if (supabase) {
    let query = supabase
      .from("scores")
      .select("id, name, score, mode, level, grade_level, game_type, question_count")
      .eq("game_type", "normal")
      .eq("mode", mode)
      .eq("level", level)
      .eq("grade_level", gradeLevel);
    if (isTimed) query = query.eq("question_count", questionCount).order("score", { ascending: true });
    else query = query.order("score", { ascending: false });
    const { data, error } = await query.limit(10);
    if (!error && data) return sortScores(data, mode);
    throw new Error(error?.message || "Kunne ikke hente highscore.");
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const storedScores = raw ? JSON.parse(raw) : [];
    const filteredScores = storedScores.filter((entry) => {
      const sameBaseList =
        (entry.game_type || "normal") === "normal" &&
        (entry.mode || "multiplication") === mode &&
        (entry.level || "medium") === level &&
        Number(entry.grade_level || 4) === Number(gradeLevel);
      if (!sameBaseList) return false;
      if (!isTimed) return true;
      return Number(entry.question_count || 0) === Number(questionCount);
    });
    return sortScores(filteredScores, mode);
  } catch {
    return [];
  }
}

async function loadSchoolBattleScores(mode = "multiplication", gradeGroup = "small") {
  const isTimed = isTimeChallengeMode(mode);
  if (supabase) {
    let query = supabase
      .from("scores")
      .select("id, name, score, mode, school, game_type, grade_group, question_count")
      .eq("game_type", "school_battle")
      .eq("mode", mode);
    if (isTimed) query = query.eq("grade_group", gradeGroup).eq("question_count", SCHOOL_BATTLE_TIME_QUESTION_COUNT).order("score", { ascending: true });
    else query = query.order("score", { ascending: false });
    const { data, error } = await query.limit(20);
    if (!error && data) return sortSchoolBattleScores(data, mode);
    throw new Error(error?.message || "Kunne ikke hente Skolekampen-listen.");
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const storedScores = raw ? JSON.parse(raw) : [];
    const filteredScores = storedScores.filter((entry) => {
      const sameMode = entry.game_type === "school_battle" && entry.mode === mode;
      if (!sameMode) return false;
      if (!isTimed) return true;
      return entry.grade_group === gradeGroup && Number(entry.question_count) === SCHOOL_BATTLE_TIME_QUESTION_COUNT;
    });
    return sortSchoolBattleScores(filteredScores, mode);
  } catch {
    return [];
  }
}

async function saveScore(entry) {
  if (supabase) {
    const { data, error } = await supabase.rpc("save_top_score", {
      player_name: entry.name,
      player_score: entry.score,
      score_mode: entry.mode,
      score_level: entry.level,
      score_grade_level: entry.grade_level,
    });
    if (error) throw new Error(error.message || "Kunne ikke lagre score.");
    const result = Array.isArray(data) ? data[0] : data;
    return { saved: Boolean(result?.saved), message: result?.message || "Resultatet er sjekket mot highscore-listen." };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];
  const entryWithType = { ...entry, id: crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, game_type: "normal" };
  const matchingScores = current
    .filter(
      (storedEntry) =>
        (storedEntry.game_type || "normal") === "normal" &&
        (storedEntry.mode || "multiplication") === entry.mode &&
        (storedEntry.level || "medium") === entry.level &&
        Number(storedEntry.grade_level || 4) === Number(entry.grade_level)
    )
    .sort((a, b) => Number(b.score) - Number(a.score));
  const lowestTopScore = matchingScores[9]?.score;
  const shouldSave = matchingScores.length < 10 || entry.score > Number(lowestTopScore);
  if (!shouldSave) return { saved: false, message: "Det holdt ikke til topp 10 denne gangen." };
  const updatedScores = [...current, entryWithType];
  const sameListScores = updatedScores
    .filter(
      (scoreEntry) =>
        (scoreEntry.game_type || "normal") === "normal" &&
        (scoreEntry.mode || "multiplication") === entry.mode &&
        (scoreEntry.level || "medium") === entry.level &&
        Number(scoreEntry.grade_level || 4) === Number(entry.grade_level)
    )
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 10);
  const trimmedScores = updatedScores.filter((storedEntry) => {
    const sameList =
      (storedEntry.game_type || "normal") === "normal" &&
      (storedEntry.mode || "multiplication") === entry.mode &&
      (storedEntry.level || "medium") === entry.level &&
      Number(storedEntry.grade_level || 4) === Number(entry.grade_level);
    if (!sameList) return true;
    return sameListScores.includes(storedEntry);
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedScores));
  return { saved: true, message: "Du kom på highscore-listen!" };
}

async function saveTimeScore(entry) {
  if (supabase) {
    const { data, error } = await supabase.rpc("save_time_score", {
      player_name: entry.name,
      player_time: entry.score,
      score_mode: entry.mode,
      score_level: entry.level,
      score_grade_level: entry.grade_level,
      score_question_count: entry.question_count,
    });
    if (error) throw new Error(error.message || "Kunne ikke lagre tidsscore.");
    const result = Array.isArray(data) ? data[0] : data;
    return { saved: Boolean(result?.saved), message: result?.message || "Resultatet er sjekket mot highscore-listen." };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];
  const entryWithType = { ...entry, id: crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, game_type: "normal" };
  const matchingScores = current
    .filter(
      (storedEntry) =>
        (storedEntry.game_type || "normal") === "normal" &&
        storedEntry.mode === entry.mode &&
        storedEntry.level === entry.level &&
        Number(storedEntry.grade_level) === Number(entry.grade_level) &&
        Number(storedEntry.question_count) === Number(entry.question_count)
    )
    .sort((a, b) => Number(a.score) - Number(b.score));
  const worstTopTime = matchingScores[9]?.score;
  const shouldSave = matchingScores.length < 10 || entry.score < Number(worstTopTime);
  if (!shouldSave) return { saved: false, message: "Det holdt ikke til topp 10 denne gangen." };
  const updatedScores = [...current, entryWithType];
  const sameListScores = updatedScores
    .filter(
      (scoreEntry) =>
        (scoreEntry.game_type || "normal") === "normal" &&
        scoreEntry.mode === entry.mode &&
        scoreEntry.level === entry.level &&
        Number(scoreEntry.grade_level) === Number(entry.grade_level) &&
        Number(scoreEntry.question_count) === Number(entry.question_count)
    )
    .sort((a, b) => Number(a.score) - Number(b.score))
    .slice(0, 10);
  const trimmedScores = updatedScores.filter((storedEntry) => {
    const sameList =
      (storedEntry.game_type || "normal") === "normal" &&
      storedEntry.mode === entry.mode &&
      storedEntry.level === entry.level &&
      Number(storedEntry.grade_level) === Number(entry.grade_level) &&
      Number(storedEntry.question_count) === Number(entry.question_count);
    if (!sameList) return true;
    return sameListScores.includes(storedEntry);
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedScores));
  return { saved: true, message: "Du kom på highscore-listen!" };
}

async function saveSchoolBattleTimeScore(entry) {
  if (supabase) {
    const { data, error } = await supabase.rpc("save_school_battle_time_score", {
      player_name: entry.name,
      player_time: entry.score,
      score_mode: entry.mode,
      player_school: entry.school,
      player_grade_group: entry.grade_group,
      score_question_count: SCHOOL_BATTLE_TIME_QUESTION_COUNT,
    });
    if (error) throw new Error(error.message || "Kunne ikke lagre Skolekampen-tid.");
    const result = Array.isArray(data) ? data[0] : data;
    return { saved: Boolean(result?.saved), message: result?.message || "Resultatet er sjekket mot Skolekampen-listen." };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];
  const entryWithType = {
    ...entry,
    id: crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    game_type: "school_battle",
    level: "medium",
    grade_level: 0,
    question_count: SCHOOL_BATTLE_TIME_QUESTION_COUNT,
  };
  const matchingScores = current
    .filter(
      (storedEntry) =>
        storedEntry.game_type === "school_battle" &&
        storedEntry.mode === entry.mode &&
        storedEntry.grade_group === entry.grade_group &&
        Number(storedEntry.question_count) === SCHOOL_BATTLE_TIME_QUESTION_COUNT
    )
    .sort((a, b) => Number(a.score) - Number(b.score));
  const worstTopTime = matchingScores[19]?.score;
  const shouldSave = matchingScores.length < 20 || entry.score < Number(worstTopTime);
  if (!shouldSave) return { saved: false, message: "Det holdt ikke til topp 20 i Skolekampen denne gangen." };
  const updatedScores = [...current, entryWithType];
  const sameListScores = updatedScores
    .filter(
      (scoreEntry) =>
        scoreEntry.game_type === "school_battle" &&
        scoreEntry.mode === entry.mode &&
        scoreEntry.grade_group === entry.grade_group &&
        Number(scoreEntry.question_count) === SCHOOL_BATTLE_TIME_QUESTION_COUNT
    )
    .sort((a, b) => Number(a.score) - Number(b.score))
    .slice(0, 20);
  const trimmedScores = updatedScores.filter((storedEntry) => {
    const sameList =
      storedEntry.game_type === "school_battle" &&
      storedEntry.mode === entry.mode &&
      storedEntry.grade_group === entry.grade_group &&
      Number(storedEntry.question_count) === SCHOOL_BATTLE_TIME_QUESTION_COUNT;
    if (!sameList) return true;
    return sameListScores.includes(storedEntry);
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedScores));
  return { saved: true, message: "Du kom på Skolekampen-listen!" };
}

async function saveSchoolBattleScore(entry) {
  if (supabase) {
    const { data, error } = await supabase.rpc("save_school_battle_score", {
      player_name: entry.name,
      player_score: entry.score,
      score_mode: entry.mode,
      player_school: entry.school,
    });
    if (error) throw new Error(error.message || "Kunne ikke lagre Skolekampen-score.");
    const result = Array.isArray(data) ? data[0] : data;
    return { saved: Boolean(result?.saved), message: result?.message || "Resultatet er sjekket mot Skolekampen-listen." };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];
  const entryWithType = { ...entry, id: crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, game_type: "school_battle", level: "medium", grade_level: 0 };
  const matchingScores = current
    .filter((storedEntry) => storedEntry.game_type === "school_battle" && storedEntry.mode === entry.mode)
    .sort((a, b) => Number(b.score) - Number(a.score));
  const lowestTopScore = matchingScores[19]?.score;
  const shouldSave = matchingScores.length < 20 || entry.score > Number(lowestTopScore);
  if (!shouldSave) return { saved: false, message: "Det holdt ikke til topp 20 i Skolekampen denne gangen." };
  const updatedScores = [...current, entryWithType];
  const sameListScores = updatedScores
    .filter((scoreEntry) => scoreEntry.game_type === "school_battle" && scoreEntry.mode === entry.mode)
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 20);
  const trimmedScores = updatedScores.filter((storedEntry) => {
    if (!(storedEntry.game_type === "school_battle" && storedEntry.mode === entry.mode)) return true;
    return sameListScores.includes(storedEntry);
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedScores));
  return { saved: true, message: "Du kom på Skolekampen-listen!" };
}

async function clearNormalScoreList(adminPin, resetMode, resetLevel, resetGradeLevel, resetQuestionCount = null) {
  const isTimedList = isTimeChallengeMode(resetMode);
  if (supabase) {
    const { error } = await supabase.rpc("reset_normal_score_list", {
      admin_pin: adminPin,
      reset_mode: resetMode,
      reset_level: resetLevel,
      reset_grade_level: resetGradeLevel,
      reset_question_count: isTimedList ? resetQuestionCount : null,
    });
    if (error) throw new Error(error.message || "Kunne ikke tømme listen.");
    return;
  }
  if (adminPin !== ADMIN_PIN_FALLBACK) throw new Error("Feil adminkode.");
  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];
  const remainingScores = current.filter((entry) => {
    const sameBaseList =
      (entry.game_type || "normal") === "normal" &&
      (entry.mode || "multiplication") === resetMode &&
      (entry.level || "medium") === resetLevel &&
      Number(entry.grade_level || 4) === Number(resetGradeLevel);
    if (!sameBaseList) return true;
    if (!isTimedList) return false;
    return Number(entry.question_count || 0) !== Number(resetQuestionCount);
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingScores));
}

function Button({ children, onClick, variant = "primary", disabled = false, className = "" }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`button button-${variant} ${className}`}>
      {children}
    </button>
  );
}

function ModeButtons({ selectedMode, onSelect }) {
  return (
    <>
      {MODE_ORDER.map((mode, index) => (
        <Button key={mode} variant={selectedMode === mode ? "primary" : index === 0 ? "primary" : "secondary"} onClick={() => onSelect(mode)} className={`full ${index > 0 ? "top-space" : ""}`}>
          {getModeLabel(mode)}
        </Button>
      ))}
    </>
  );
}

function ModeFilterButtons({ selectedMode, onSelect }) {
  return (
    <>
      {MODE_ORDER.map((mode, index) => (
        <Button key={mode} variant={selectedMode === mode ? "primary" : "light"} onClick={() => onSelect(mode)} className={`full ${index > 0 ? "top-space" : ""}`}>
          {getModeLabel(mode)}
        </Button>
      ))}
    </>
  );
}

function Shell({ children }) {
  return (
    <main className="app-shell">
      <BossBattleStyles />
      <section className="phone-frame">
        <div className="blob blob-one" />
        <div className="blob blob-two" />
        <div className="content">{children}</div>
      </section>
    </main>
  );
}

function BossBattleStyles() {
  return (
    <style>{`
      @keyframes boss-hit-shake { 0% { transform: translateX(0) scale(1); filter: brightness(1); } 20% { transform: translateX(-8px) scale(1.03); filter: brightness(1.25) saturate(1.4); } 40% { transform: translateX(8px) scale(0.98); filter: brightness(1.1); } 60% { transform: translateX(-5px) scale(1.02); filter: brightness(1.3) saturate(1.7); } 80% { transform: translateX(5px) scale(1); } 100% { transform: translateX(0) scale(1); filter: brightness(1); } }
      @keyframes player-hit-shake { 0% { transform: translateX(0); } 20% { transform: translateX(-7px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } 100% { transform: translateX(0); } }
      @keyframes damage-pop { 0% { transform: translate(-50%, 12px) scale(.6); opacity: 0; } 20% { transform: translate(-50%, -4px) scale(1.25); opacity: 1; } 100% { transform: translate(-50%, -34px) scale(1); opacity: 0; } }
      @keyframes super-pulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(251, 191, 36, 0); } 50% { transform: scale(1.05); box-shadow: 0 0 26px rgba(251, 191, 36, .8); } }
      @keyframes boss-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      @keyframes treasure-shine { 0%, 100% { transform: scale(1) rotate(-1deg); filter: brightness(1); } 50% { transform: scale(1.04) rotate(1deg); filter: brightness(1.16); } }
      .boss-play-layout { display: flex; flex-direction: column; gap: 10px; }
      .boss-arena { border-radius: 24px; padding: 12px; color: #0f172a; box-shadow: 0 14px 30px rgba(15, 23, 42, 0.16); position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,.55); }
      .boss-arena::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at top left, rgba(255,255,255,.7), transparent 32%), radial-gradient(circle at bottom right, rgba(255,255,255,.28), transparent 36%); pointer-events: none; }
      .boss-arena-inner { position: relative; z-index: 1; }
      .boss-topline { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; }
      .boss-name-title { font-weight: 900; font-size: 1.05rem; line-height: 1; }
      .boss-arena-name { font-size: .72rem; opacity: .78; font-weight: 800; line-height: 1.1; }
      .boss-badge { font-size: .64rem; font-weight: 1000; padding: 6px 8px; border-radius: 999px; background: rgba(255,255,255,.72); border: 1px solid rgba(255,255,255,.8); }
      .boss-stage { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 0 0 5px; }
      .boss-figure-wrap { width: 145px; height: 92px; display: grid; place-items: center; animation: boss-float 2.5s ease-in-out infinite; transition: transform .2s ease; }
      .boss-figure-wrap.hit { animation: boss-hit-shake .42s ease; }
      .boss-svg { width: 145px; height: 100px; filter: drop-shadow(0 9px 12px rgba(15,23,42,.25)); }
      .boss-result-figure { width: 230px; height: 165px; margin: 0 auto 12px; display: grid; place-items: center; }
      .boss-result-figure .boss-svg { width: 225px; height: 160px; }
      .boss-shadow { width: 92px; height: 10px; border-radius: 999px; background: rgba(15,23,42,.20); filter: blur(1px); }
      .damage-popup { position: absolute; top: 28px; left: 50%; transform: translateX(-50%); font-size: 1.55rem; font-weight: 1000; color: #dc2626; text-shadow: 0 3px 0 rgba(255,255,255,.85), 0 6px 14px rgba(0,0,0,.22); animation: damage-pop .8s ease-out forwards; pointer-events: none; z-index: 5; }
      .damage-popup.super { color: #f59e0b; font-size: 1.75rem; }
      .boss-hp-wrap { background: rgba(255,255,255,.72); border-radius: 14px; padding: 7px; border: 1px solid rgba(255,255,255,.8); }
      .boss-hp-label { display: flex; justify-content: space-between; font-weight: 900; font-size: .78rem; margin-bottom: 5px; }
      .boss-hp-bar { height: 13px; border-radius: 999px; background: rgba(15, 23, 42, .16); overflow: hidden; border: 2px solid rgba(255,255,255,.8); }
      .boss-hp-fill { height: 100%; border-radius: 999px; transition: width .35s ease; background: linear-gradient(90deg, #22c55e, #eab308, #ef4444); }
      .player-panel { background: white; border-radius: 20px; padding: 10px 12px; box-shadow: 0 10px 22px rgba(15, 23, 42, .09); border: 1px solid rgba(226,232,240,.9); }
      .player-panel.hit { animation: player-hit-shake .35s ease; background: #fff1f2; }
      .boss-compact-status { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 12px; }
      .heart-row { display: flex; justify-content: flex-start; gap: 5px; margin-bottom: 0; font-size: 1.25rem; line-height: 1; }
      .heart-lost { opacity: .25; filter: grayscale(1); transform: scale(.86); }
      .super-area { min-width: 0; }
      .super-meter { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; align-items: center; }
      .super-cell { height: 10px; border-radius: 999px; background: #e2e8f0; border: 1px solid rgba(148,163,184,.6); transition: all .18s ease; }
      .super-cell.filled { background: linear-gradient(90deg, #facc15, #f97316); border-color: #f59e0b; }
      .super-cell.ready { animation: super-pulse .7s ease-in-out infinite; }
      .super-meter-label { display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: .72rem; margin-bottom: 5px; }
      .boss-question-card { margin-top: 0; padding-top: 12px; padding-bottom: 12px; }
      .boss-question-card h2 { font-size: 2.1rem; line-height: 1; margin: 6px 0 2px; }
      .boss-feedback-area { min-height: 30px; }
      .boss-feedback-area .feedback { font-size: .9rem; margin: 4px 0 0; }
      .treasure-wrap { display: flex; justify-content: center; align-items: center; margin: 4px auto 12px; animation: treasure-shine 1.7s ease-in-out infinite; }
      .treasure-wrap.small svg { width: 120px; height: 100px; }
      .treasure-wrap.medium svg { width: 160px; height: 130px; }
      .treasure-wrap.large svg { width: 210px; height: 165px; }
      .quit-round-button { margin-top: 10px; border: 2px solid rgba(239, 68, 68, .24); color: #991b1b; background: #fff7f7; }
      .quit-round-button:hover { background: #fee2e2; }
      @media (max-width: 520px) { .boss-play-layout { gap: 8px; } .boss-arena { padding: 10px; border-radius: 22px; } .boss-figure-wrap { width: 128px; height: 76px; } .boss-svg { width: 128px; height: 88px; } .boss-shadow { width: 78px; height: 8px; } .boss-hp-wrap { padding: 6px; } .boss-hp-bar { height: 11px; } .player-panel { padding: 8px 10px; border-radius: 18px; } .heart-row { font-size: 1.08rem; gap: 4px; } .super-meter-label { font-size: .67rem; margin-bottom: 4px; } .super-cell { height: 8px; } .boss-question-card { padding-top: 10px; padding-bottom: 10px; } .boss-question-card h2 { font-size: 1.9rem; } .boss-feedback-area { min-height: 26px; } .boss-feedback-area .feedback { font-size: .82rem; } }
    `}</style>
  );
}

function BossFigure({ bossId, hpPercent = 100 }) {
  if (bossId === "troll") return <TrollBossSvg hpPercent={hpPercent} />;
  if (bossId === "shadow" || bossId === "dragon") return <ShadowGolemSvg hpPercent={hpPercent} />;
  return <SlimeBossSvg hpPercent={hpPercent} />;
}

function SlimeBossSvg({ hpPercent }) {
  const hurt = hpPercent <= 40;
  return (
    <svg className="boss-svg" viewBox="0 0 220 180" role="img" aria-label="Slimbossen">
      <defs><radialGradient id="slimeBody" cx="42%" cy="28%" r="70%"><stop offset="0%" stopColor="#bbf7d0" /><stop offset="48%" stopColor="#22c55e" /><stop offset="100%" stopColor="#15803d" /></radialGradient><linearGradient id="slimeMouth" x1="0" x2="1"><stop offset="0" stopColor="#052e16" /><stop offset="1" stopColor="#14532d" /></linearGradient></defs>
      <ellipse cx="110" cy="155" rx="80" ry="14" fill="rgba(15,23,42,.18)" /><path d="M42 121 C25 86 45 41 82 31 C92 14 126 14 137 31 C176 40 198 80 181 121 C171 150 52 151 42 121Z" fill="url(#slimeBody)" stroke="#14532d" strokeWidth="5" /><path d="M72 53 C91 38 126 37 148 51 C135 45 92 45 72 53Z" fill="rgba(255,255,255,.35)" />
      <circle cx="76" cy="86" r="17" fill="white" stroke="#14532d" strokeWidth="4" /><circle cx="141" cy="86" r="17" fill="white" stroke="#14532d" strokeWidth="4" /><circle cx="80" cy="90" r={hurt ? "5" : "8"} fill="#052e16" /><circle cx="137" cy="90" r={hurt ? "5" : "8"} fill="#052e16" />
      {hurt ? <path d="M83 121 C99 107 124 107 139 121" fill="none" stroke="#052e16" strokeWidth="8" strokeLinecap="round" /> : <path d="M82 115 C98 132 125 132 141 115" fill="none" stroke="url(#slimeMouth)" strokeWidth="9" strokeLinecap="round" />}
      <circle cx="39" cy="70" r="9" fill="#86efac" stroke="#15803d" strokeWidth="3" /><circle cx="188" cy="75" r="7" fill="#bbf7d0" stroke="#15803d" strokeWidth="3" /><circle cx="174" cy="45" r="5" fill="#dcfce7" stroke="#15803d" strokeWidth="2" /><path d="M53 127 C64 145 86 134 94 148 C102 161 126 161 135 148 C144 134 167 145 176 126" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function TrollBossSvg({ hpPercent }) {
  const hurt = hpPercent <= 40;
  return (
    <svg className="boss-svg" viewBox="0 0 220 180" role="img" aria-label="Trollkongen">
      <defs><linearGradient id="trollStone" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#d6d3d1" /><stop offset="50%" stopColor="#78716c" /><stop offset="100%" stopColor="#44403c" /></linearGradient><linearGradient id="trollCrown" x1="0" x2="1"><stop offset="0" stopColor="#fef3c7" /><stop offset="1" stopColor="#f59e0b" /></linearGradient></defs>
      <ellipse cx="110" cy="158" rx="78" ry="13" fill="rgba(15,23,42,.22)" /><path d="M67 42 L82 18 L98 42 L112 16 L128 42 L146 18 L155 44 Z" fill="url(#trollCrown)" stroke="#78350f" strokeWidth="4" /><path d="M47 72 C50 43 74 34 111 34 C151 34 174 44 178 74 C192 87 191 118 174 129 C169 151 149 160 111 160 C73 160 53 150 48 129 C31 117 31 87 47 72Z" fill="url(#trollStone)" stroke="#292524" strokeWidth="6" />
      <path d="M50 72 C28 60 24 93 43 101" fill="#78716c" stroke="#292524" strokeWidth="6" /><path d="M176 72 C197 60 201 93 182 101" fill="#78716c" stroke="#292524" strokeWidth="6" /><path d="M68 76 L96 67" stroke="#292524" strokeWidth="9" strokeLinecap="round" /><path d="M152 76 L124 67" stroke="#292524" strokeWidth="9" strokeLinecap="round" />
      <circle cx="82" cy="91" r="13" fill="white" stroke="#292524" strokeWidth="4" /><circle cx="138" cy="91" r="13" fill="white" stroke="#292524" strokeWidth="4" /><circle cx="85" cy="94" r={hurt ? "4" : "7"} fill="#111827" /><circle cx="135" cy="94" r={hurt ? "4" : "7"} fill="#111827" /><path d="M105 94 C92 119 92 134 112 132 C132 134 132 119 119 94" fill="#a8a29e" stroke="#292524" strokeWidth="5" />
      {hurt ? <path d="M82 139 C99 126 124 126 140 139" fill="none" stroke="#292524" strokeWidth="8" strokeLinecap="round" /> : <path d="M82 131 C99 146 124 146 140 131" fill="none" stroke="#292524" strokeWidth="8" strokeLinecap="round" />}
      <path d="M69 48 L82 58 L96 48" fill="none" stroke="rgba(255,255,255,.24)" strokeWidth="5" strokeLinecap="round" /><path d="M139 49 L153 58 L164 49" fill="none" stroke="rgba(255,255,255,.24)" strokeWidth="5" strokeLinecap="round" /><path d="M63 116 L78 121" stroke="#57534e" strokeWidth="4" strokeLinecap="round" /><path d="M158 116 L143 121" stroke="#57534e" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function ShadowGolemSvg({ hpPercent }) {
  const hurt = hpPercent <= 40;
  return (
    <svg className="boss-svg" viewBox="0 0 260 190" role="img" aria-label="Skyggegolemen">
      <defs><linearGradient id="golemStone" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#64748b" /><stop offset="45%" stopColor="#1e293b" /><stop offset="100%" stopColor="#020617" /></linearGradient><linearGradient id="golemCore" x1="0" x2="1"><stop offset="0" stopColor="#fef3c7" /><stop offset="45%" stopColor="#f97316" /><stop offset="100%" stopColor="#dc2626" /></linearGradient><radialGradient id="golemEye" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fef2f2" /><stop offset="45%" stopColor="#ef4444" /><stop offset="100%" stopColor="#7f1d1d" /></radialGradient></defs>
      <ellipse cx="132" cy="170" rx="88" ry="13" fill="rgba(2,6,23,.28)" /><path d="M56 100 C38 101 28 116 30 135 C31 153 44 163 62 159 C73 156 77 143 73 126 C70 110 67 101 56 100Z" fill="url(#golemStone)" stroke="#020617" strokeWidth="6" /><path d="M204 100 C222 101 232 116 230 135 C229 153 216 163 198 159 C187 156 183 143 187 126 C190 110 193 101 204 100Z" fill="url(#golemStone)" stroke="#020617" strokeWidth="6" />
      <path d="M50 158 L37 177" stroke="#020617" strokeWidth="8" strokeLinecap="round" /><path d="M211 158 L224 177" stroke="#020617" strokeWidth="8" strokeLinecap="round" /><path d="M83 82 C82 50 101 31 132 31 C164 31 183 50 181 82 C195 91 202 107 200 128 C197 155 175 168 132 168 C90 168 68 155 65 128 C63 107 70 91 83 82Z" fill="url(#golemStone)" stroke="#020617" strokeWidth="7" />
      <path d="M88 84 L72 52 L105 69" fill="#334155" stroke="#020617" strokeWidth="5" /><path d="M176 84 L192 52 L159 69" fill="#334155" stroke="#020617" strokeWidth="5" /><path d="M97 91 L119 84" stroke="#020617" strokeWidth="8" strokeLinecap="round" /><path d="M166 91 L144 84" stroke="#020617" strokeWidth="8" strokeLinecap="round" />
      <circle cx="109" cy="105" r="13" fill="url(#golemEye)" stroke="#020617" strokeWidth="4" /><circle cx="153" cy="105" r="13" fill="url(#golemEye)" stroke="#020617" strokeWidth="4" /><circle cx="113" cy="103" r="4" fill="#f8fafc" /><circle cx="157" cy="103" r="4" fill="#f8fafc" /><path d="M121 119 L133 132 L145 119 Z" fill="#0f172a" stroke="#020617" strokeWidth="4" />
      {hurt ? <path d="M104 145 C119 134 144 134 160 145" fill="none" stroke="#020617" strokeWidth="8" strokeLinecap="round" /> : <path d="M104 138 C120 153 145 153 161 138" fill="none" stroke="#020617" strokeWidth="8" strokeLinecap="round" />}
      <path d="M120 45 L130 18 L141 45" fill="#475569" stroke="#020617" strokeWidth="5" /><path d="M101 55 L101 34 L116 51" fill="#475569" stroke="#020617" strokeWidth="4" /><path d="M159 51 L174 34 L174 55" fill="#475569" stroke="#020617" strokeWidth="4" /><path d="M116 150 L108 178" stroke="#020617" strokeWidth="10" strokeLinecap="round" /><path d="M149 150 L157 178" stroke="#020617" strokeWidth="10" strokeLinecap="round" /><path d="M104 178 L87 181" stroke="#020617" strokeWidth="7" strokeLinecap="round" /><path d="M160 178 L177 181" stroke="#020617" strokeWidth="7" strokeLinecap="round" /><circle cx="132" cy="143" r="12" fill="url(#golemCore)" stroke="#020617" strokeWidth="4" /><path d="M87 118 L72 125" stroke="#475569" strokeWidth="5" strokeLinecap="round" /><path d="M177 118 L192 125" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function TreasureChest({ size = "small" }) {
  const goldCount = size === "large" ? 18 : size === "medium" ? 12 : 7;
  const diamondCount = size === "large" ? 7 : size === "medium" ? 4 : 2;
  return (
    <div className={`treasure-wrap ${size}`} aria-label="Åpen skattekiste med gull og diamanter">
      <svg viewBox="0 0 240 180" role="img">
        <defs><linearGradient id="chestWoodOpen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#92400e" /><stop offset="55%" stopColor="#b45309" /><stop offset="100%" stopColor="#78350f" /></linearGradient><linearGradient id="goldGlowOpen" x1="0" x2="1"><stop offset="0" stopColor="#fef3c7" /><stop offset="45%" stopColor="#facc15" /><stop offset="100%" stopColor="#d97706" /></linearGradient><linearGradient id="diamondGlow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e0f2fe" /><stop offset="45%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#2563eb" /></linearGradient></defs>
        <ellipse cx="120" cy="160" rx="92" ry="12" fill="rgba(15,23,42,.18)" /><path d="M51 75 C58 38 85 20 122 22 C158 24 185 43 190 80 L174 100 C161 81 143 72 119 72 C95 72 76 81 63 101Z" fill="#7c2d12" stroke="#451a03" strokeWidth="7" /><path d="M72 72 C82 48 101 39 122 40 C144 41 160 50 171 73" fill="none" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" opacity=".8" />
        {Array.from({ length: goldCount }).map((_, index) => { const x = 65 + (index % 7) * 17; const y = 83 + Math.floor(index / 7) * 13 + (index % 2) * 3; return <circle key={`gold-${index}`} cx={x} cy={y} r="9" fill="url(#goldGlowOpen)" stroke="#a16207" strokeWidth="3" />; })}
        {Array.from({ length: diamondCount }).map((_, index) => { const x = 76 + (index % 5) * 28; const y = 75 + Math.floor(index / 5) * 16; return <path key={`diamond-${index}`} d={`M${x} ${y} L${x + 8} ${y + 9} L${x} ${y + 18} L${x - 8} ${y + 9} Z`} fill="url(#diamondGlow)" stroke="#075985" strokeWidth="2" />; })}
        <rect x="42" y="89" width="156" height="66" rx="14" fill="url(#chestWoodOpen)" stroke="#451a03" strokeWidth="7" /><path d="M42 113 H198" stroke="#451a03" strokeWidth="5" /><path d="M82 91 V154" stroke="#451a03" strokeWidth="5" /><path d="M158 91 V154" stroke="#451a03" strokeWidth="5" /><rect x="102" y="107" width="36" height="32" rx="7" fill="url(#goldGlowOpen)" stroke="#78350f" strokeWidth="4" /><circle cx="120" cy="124" r="4" fill="#78350f" />
      </svg>
    </div>
  );
}

function StarsDisplay({ count }) {
  return <div className="stars" aria-label={`${count} stjerner`}>{Array.from({ length: count }).map((_, index) => <Star key={index} className="star-icon" />)}</div>;
}

function QrCodeImage() {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(APP_URL)}`;
  return <img src={qrUrl} alt="QR-kode til Regnemester" style={{ width: "260px", height: "260px", maxWidth: "100%", borderRadius: "18px" }} />;
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [gameType, setGameType] = useState("normal");
  const [gameGradeLevel, setGameGradeLevel] = useState(null);
  const [schoolBattleSchool, setSchoolBattleSchool] = useState("");
  const [schoolBattleGradeGroup, setSchoolBattleGradeGroup] = useState("small");
  const [gameMode, setGameMode] = useState("multiplication");
  const [gameLevel, setGameLevel] = useState("medium");
  const [gameQuestionCount, setGameQuestionCount] = useState(10);
  const [highscoreGradeLevel, setHighscoreGradeLevel] = useState(4);
  const [highscoreMode, setHighscoreMode] = useState("multiplication");
  const [highscoreLevel, setHighscoreLevel] = useState("medium");
  const [highscoreQuestionCount, setHighscoreQuestionCount] = useState(10);
  const [highscoreGradeGroup, setHighscoreGradeGroup] = useState("small");
  const [playerName, setPlayerName] = useState("");
  const [nameError, setNameError] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(NORMAL_GAME_SECONDS);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionsDone, setQuestionsDone] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [resultTimeSeconds, setResultTimeSeconds] = useState(0);
  const [resultCorrectAnswers, setResultCorrectAnswers] = useState(0);
  const [resultWrongAnswers, setResultWrongAnswers] = useState(0);
  const [question, setQuestion] = useState(() => makeQuestion("multiplication", "medium"));
  const [feedback, setFeedback] = useState(null);
  const [scores, setScores] = useState([]);
  const [adminLoginPin, setAdminLoginPin] = useState("");
  const [adminAccessPin, setAdminAccessPin] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminNormalGradeLevel, setAdminNormalGradeLevel] = useState(4);
  const [adminNormalMode, setAdminNormalMode] = useState("addition");
  const [adminNormalLevel, setAdminNormalLevel] = useState("medium");
  const [adminNormalQuestionCount, setAdminNormalQuestionCount] = useState(10);
  const [scoreMessage, setScoreMessage] = useState("");

  const [bossId, setBossId] = useState("slime");
  const [bossLives, setBossLives] = useState(0);
  const [bossMaxLives, setBossMaxLives] = useState(0);
  const [playerHearts, setPlayerHearts] = useState(0);
  const [playerMaxHearts, setPlayerMaxHearts] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [bossCorrectAnswers, setBossCorrectAnswers] = useState(0);
  const [bossWrongAnswers, setBossWrongAnswers] = useState(0);
  const [bossOutcome, setBossOutcome] = useState(null);
  const [bossMessage, setBossMessage] = useState("");
  const [damagePopup, setDamagePopup] = useState(null);
  const [bossHit, setBossHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);

  const savedThisRound = useRef(false);
  const questionDeck = useRef([]);

  const trimmedName = playerName.trim();
  const stars = useMemo(() => getStars(score), [score]);
  const isCurrentTimeChallenge = isTimeChallengeMode(gameMode);
  const activeQuestionCount = gameType === "school_battle" && isTimeChallengeMode(gameMode) ? SCHOOL_BATTLE_TIME_QUESTION_COUNT : gameQuestionCount;

  useEffect(() => { refreshScores("addition", "medium", 4, 10); }, []);

  useEffect(() => {
    if (screen !== "play") return;
    if (isCurrentTimeChallenge) {
      const timer = setTimeout(() => setElapsedSeconds((current) => current + 1), 1000);
      return () => clearTimeout(timer);
    }
    if (timeLeft <= 0) {
      finishGame();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [screen, timeLeft, elapsedSeconds, isCurrentTimeChallenge]);

  async function refreshScores(mode = highscoreMode, level = highscoreLevel, gradeLevel = highscoreGradeLevel, questionCount = highscoreQuestionCount) {
    try { const loaded = await loadScores(mode, level, gradeLevel, questionCount); setScores(loaded); setScoreMessage(""); } catch (error) { setScoreMessage(error.message); }
  }

  async function refreshSchoolBattleScores(mode = highscoreMode, gradeGroup = highscoreGradeGroup) {
    try { const loaded = await loadSchoolBattleScores(mode, gradeGroup); setScores(loaded); setScoreMessage(""); } catch (error) { setScoreMessage(error.message); }
  }

  function openHighscore(mode = gameMode, level = gameLevel, gradeLevel = gameGradeLevel, questionCount = gameQuestionCount) {
    setHighscoreMode(mode); setHighscoreLevel(level); setHighscoreGradeLevel(gradeLevel); setHighscoreQuestionCount(questionCount); refreshScores(mode, level, gradeLevel, questionCount); setScreen("highscore");
  }

  function openSchoolBattleHighscore(mode = gameMode, gradeGroup = schoolBattleGradeGroup) {
    setHighscoreMode(mode); if (isTimeChallengeMode(mode)) setHighscoreGradeGroup(gradeGroup || "small"); refreshSchoolBattleScores(mode, gradeGroup || highscoreGradeGroup); setScreen("schoolHighscore");
  }

  function changeHighscoreMode(mode) { setHighscoreMode(mode); refreshScores(mode, highscoreLevel, highscoreGradeLevel, highscoreQuestionCount); }
  function changeHighscoreLevel(level) { setHighscoreLevel(level); refreshScores(highscoreMode, level, highscoreGradeLevel, highscoreQuestionCount); }
  function changeHighscoreQuestionCount(questionCount) { setHighscoreQuestionCount(questionCount); refreshScores(highscoreMode, highscoreLevel, highscoreGradeLevel, questionCount); }
  function changeSchoolBattleHighscoreMode(mode) { setHighscoreMode(mode); refreshSchoolBattleScores(mode, highscoreGradeGroup); }
  function changeSchoolBattleGradeGroup(gradeGroup) { setHighscoreGradeGroup(gradeGroup); refreshSchoolBattleScores(highscoreMode, gradeGroup); }

  function getNextQuestion(mode = gameMode, level = gameLevel, gradeGroup = gameType === "school_battle" ? schoolBattleGradeGroup : null) {
    if (questionDeck.current.length === 0) questionDeck.current = createQuestionDeck(mode, level, gradeGroup);
    return questionDeck.current.pop();
  }

  function startGame() {
    const validationMessage = validatePlayerName(trimmedName);
    if (validationMessage) { setNameError(validationMessage); return; }
    setNameError(""); savedThisRound.current = false; questionDeck.current = createQuestionDeck(gameMode, gameLevel, gameType === "school_battle" ? schoolBattleGradeGroup : null);
    setScore(0); setTimeLeft(getGameSeconds(gameType)); setElapsedSeconds(0); setQuestionsDone(0); setWrongAnswers(0); setResultTimeSeconds(0); setResultCorrectAnswers(0); setResultWrongAnswers(0); setQuestion(getNextQuestion(gameMode, gameLevel, gameType === "school_battle" ? schoolBattleGradeGroup : null)); setFeedback(null); setScreen("play");
  }

  function quitRound() {
    savedThisRound.current = true;
    setFeedback(null);
    setScore(0);
    setTimeLeft(getGameSeconds(gameType));
    setElapsedSeconds(0);
    setQuestionsDone(0);
    setWrongAnswers(0);
    if (gameType === "school_battle") setScreen("schoolMode");
    else setScreen("mode");
  }

  function quitBossBattle() {
    setFeedback(null);
    setDamagePopup(null);
    setBossHit(false);
    setPlayerHit(false);
    setScreen("bossSelect");
  }

  async function finishGame(resultOverride = {}) {
    const finalScore = Number.isFinite(resultOverride.score) ? resultOverride.score : score;
    const finalWrongAnswers = Number.isFinite(resultOverride.wrongAnswers) ? resultOverride.wrongAnswers : wrongAnswers;
    const finalTime = Number.isFinite(resultOverride.timeSeconds) ? resultOverride.timeSeconds : elapsedSeconds + finalWrongAnswers * TIME_PENALTY_SECONDS;
    setScreen("result"); setFeedback(null);
    if (isCurrentTimeChallenge) { setResultTimeSeconds(finalTime); setResultCorrectAnswers(finalScore); setResultWrongAnswers(finalWrongAnswers); }
    if (!savedThisRound.current && trimmedName) {
      savedThisRound.current = true;
      try {
        if (gameType === "school_battle" && isCurrentTimeChallenge) {
          const saveResult = await saveSchoolBattleTimeScore({ name: trimmedName.slice(0, 18), score: finalTime, mode: gameMode, school: schoolBattleSchool, grade_group: schoolBattleGradeGroup });
          setHighscoreMode(gameMode); setHighscoreGradeGroup(schoolBattleGradeGroup); await refreshSchoolBattleScores(gameMode, schoolBattleGradeGroup); setScoreMessage(`Du brukte ${formatTime(finalTime)}. ${saveResult.message}`); return;
        }
        if (gameType === "school_battle") {
          const saveResult = await saveSchoolBattleScore({ name: trimmedName.slice(0, 18), score, mode: gameMode, school: schoolBattleSchool });
          setHighscoreMode(gameMode); await refreshSchoolBattleScores(gameMode); setScoreMessage(`Du fikk ${score} poeng. ${saveResult.message}`); return;
        }
        if (isCurrentTimeChallenge) {
          const saveResult = await saveTimeScore({ name: trimmedName.slice(0, 18), score: finalTime, mode: gameMode, level: gameLevel, grade_level: gameGradeLevel, question_count: gameQuestionCount });
          setHighscoreMode(gameMode); setHighscoreLevel(gameLevel); setHighscoreGradeLevel(gameGradeLevel); setHighscoreQuestionCount(gameQuestionCount); await refreshScores(gameMode, gameLevel, gameGradeLevel, gameQuestionCount); setScoreMessage(`Du brukte ${formatTime(finalTime)}. ${saveResult.message}`); return;
        }
        const saveResult = await saveScore({ name: trimmedName.slice(0, 18), score, mode: gameMode, level: gameLevel, grade_level: gameGradeLevel });
        setHighscoreMode(gameMode); setHighscoreLevel(gameLevel); setHighscoreGradeLevel(gameGradeLevel); await refreshScores(gameMode, gameLevel, gameGradeLevel, gameQuestionCount); setScoreMessage(`Du fikk ${score} poeng. ${saveResult.message}`);
      } catch (error) { setScoreMessage(error.message); }
    }
  }

  function answer(value) {
    if (feedback) return;
    const isCorrect = value === question.correct;
    if (isCurrentTimeChallenge) {
      const nextCorrectAnswers = isCorrect ? score + 1 : score;
      const nextWrongAnswers = isCorrect ? wrongAnswers : wrongAnswers + 1;
      const finalTime = elapsedSeconds + nextWrongAnswers * TIME_PENALTY_SECONDS;
      setScore(nextCorrectAnswers); setQuestionsDone(nextCorrectAnswers); setWrongAnswers(nextWrongAnswers); setFeedback(isCorrect ? "correct" : "wrong");
      if (nextCorrectAnswers >= activeQuestionCount) { setTimeout(() => finishGame({ score: nextCorrectAnswers, wrongAnswers: nextWrongAnswers, timeSeconds: finalTime }), 180); return; }
      setTimeout(() => { setQuestion(getNextQuestion(gameMode, gameLevel)); setFeedback(null); }, 180);
      return;
    }
    if (isCorrect) { setScore((current) => current + 1); setFeedback("correct"); } else { setScore((current) => Math.max(0, current - 1)); setFeedback("wrong"); }
    setTimeout(() => { setQuestion(getNextQuestion(gameMode, gameLevel)); setFeedback(null); }, 180);
  }

  function startBossBattle() {
    const boss = getBossConfig(bossId);
    setGameType("boss_battle"); questionDeck.current = createQuestionDeck(gameMode, gameLevel); setQuestion(getNextQuestion(gameMode, gameLevel, null)); setBossLives(boss.lives); setBossMaxLives(boss.lives); setPlayerHearts(boss.hearts); setPlayerMaxHearts(boss.hearts); setCurrentStreak(0); setBestStreak(0); setBossCorrectAnswers(0); setBossWrongAnswers(0); setBossOutcome(null); setBossMessage(`${boss.name} er klar. Svar riktig for å angripe!`); setDamagePopup(null); setBossHit(false); setPlayerHit(false); setFeedback(null); setScreen("bossPlay");
  }

  function answerBoss(value) {
    if (feedback) return;
    const boss = getBossConfig(bossId);
    const isCorrect = value === question.correct;
    if (isCorrect) {
      const streakBeforeReset = currentStreak + 1; const damage = getBossDamage(streakBeforeReset); const nextStreak = streakBeforeReset >= 5 ? 0 : streakBeforeReset; const nextBossLives = Math.max(0, bossLives - damage); const nextCorrect = bossCorrectAnswers + 1; const nextBestStreak = Math.max(bestStreak, streakBeforeReset);
      setBossLives(nextBossLives); setCurrentStreak(nextStreak); setBestStreak(nextBestStreak); setBossCorrectAnswers(nextCorrect); setFeedback("correct"); setBossHit(true); setDamagePopup({ text: damage > 1 ? "-2 SUPER!" : "-1", super: damage > 1 }); setBossMessage(damage > 1 ? `Superangrep! ${boss.name} mistet 2 liv.` : `Riktig! ${boss.name} mistet 1 liv.`); setTimeout(() => setBossHit(false), 420); setTimeout(() => setDamagePopup(null), 780);
      if (nextBossLives <= 0) { setBossOutcome("won"); setTimeout(() => { setFeedback(null); setScreen("bossResult"); }, 650); return; }
      setTimeout(() => { setQuestion(getNextQuestion(gameMode, gameLevel)); setFeedback(null); }, 520); return;
    }
    const nextHearts = Math.max(0, playerHearts - 1); const nextWrong = bossWrongAnswers + 1;
    setPlayerHearts(nextHearts); setCurrentStreak(0); setBossWrongAnswers(nextWrong); setFeedback("wrong"); setPlayerHit(true); setBossMessage(`Feil! ${boss.name} angriper tilbake. Du mister 1 hjerte.`); setTimeout(() => setPlayerHit(false), 420);
    if (nextHearts <= 0) { setBossOutcome("lost"); setTimeout(() => { setFeedback(null); setScreen("bossResult"); }, 650); return; }
    setTimeout(() => { setQuestion(getNextQuestion(gameMode, gameLevel)); setFeedback(null); }, 520);
  }

  async function validateAdminLogin() {
    setAdminMessage(""); const cleanPin = adminLoginPin.trim();
    try {
      let isValid = cleanPin === ADMIN_PIN_FALLBACK;
      if (supabase) { const { data, error } = await supabase.rpc("validate_admin_pin", { admin_pin: cleanPin }); if (error) throw new Error(error.message || "Kunne ikke sjekke adminkoden."); isValid = Boolean(data); }
      if (!isValid) { setAdminMessage("Feil adminkode."); return; }
      setAdminAccessPin(cleanPin); setAdminLoginPin(""); setAdminMessage(""); setScreen("adminHome");
    } catch (error) { setAdminMessage(error.message); }
  }

  async function refreshNormalAdminScores(mode = adminNormalMode, level = adminNormalLevel, gradeLevel = adminNormalGradeLevel, questionCount = adminNormalQuestionCount) {
    try { const loaded = await loadScores(mode, level, gradeLevel, questionCount); setScores(loaded); setAdminMessage(""); } catch (error) { setAdminMessage(error.message); }
  }
  function changeAdminNormalGradeLevel(gradeLevel) { setAdminNormalGradeLevel(gradeLevel); refreshNormalAdminScores(adminNormalMode, adminNormalLevel, gradeLevel, adminNormalQuestionCount); }
  function changeAdminNormalMode(mode) { setAdminNormalMode(mode); refreshNormalAdminScores(mode, adminNormalLevel, adminNormalGradeLevel, adminNormalQuestionCount); }
  function changeAdminNormalLevel(level) { setAdminNormalLevel(level); refreshNormalAdminScores(adminNormalMode, level, adminNormalGradeLevel, adminNormalQuestionCount); }
  function changeAdminNormalQuestionCount(questionCount) { setAdminNormalQuestionCount(questionCount); refreshNormalAdminScores(adminNormalMode, adminNormalLevel, adminNormalGradeLevel, questionCount); }

  async function deleteNormalScore(scoreId) {
    setAdminMessage("");
    try { if (supabase) { const { error } = await supabase.rpc("delete_normal_score", { admin_pin: adminAccessPin, score_id: scoreId }); if (error) throw new Error(error.message || "Kunne ikke slette resultatet."); } else { const raw = localStorage.getItem(STORAGE_KEY); const current = raw ? JSON.parse(raw) : []; localStorage.setItem(STORAGE_KEY, JSON.stringify(current.filter((entry) => entry.id !== scoreId))); } await refreshNormalAdminScores(adminNormalMode, adminNormalLevel, adminNormalGradeLevel, adminNormalQuestionCount); setAdminMessage("Resultatet er slettet."); } catch (error) { setAdminMessage(error.message); }
  }

  async function deleteSchoolBattleScore(scoreId) {
    setAdminMessage("");
    try { if (supabase) { const { error } = await supabase.rpc("delete_school_battle_score", { delete_pin: adminAccessPin, score_id: scoreId }); if (error) throw new Error(error.message || "Kunne ikke slette resultatet."); } else { const raw = localStorage.getItem(STORAGE_KEY); const current = raw ? JSON.parse(raw) : []; localStorage.setItem(STORAGE_KEY, JSON.stringify(current.filter((entry) => entry.id !== scoreId))); } await refreshSchoolBattleScores(highscoreMode, highscoreGradeGroup); setAdminMessage("Resultatet er slettet."); } catch (error) { setAdminMessage(error.message); }
  }

  async function resetNormalFromAdmin() {
    setAdminMessage("");
    try { await clearNormalScoreList(adminAccessPin, adminNormalMode, adminNormalLevel, adminNormalGradeLevel, adminNormalQuestionCount); setScores([]); setAdminMessage(`Tømte ${getGradeLabel(adminNormalGradeLevel)} - ${getModeLabel(adminNormalMode).toLowerCase()} - ${getLevelLabel(adminNormalLevel).toLowerCase()}${isTimeChallengeMode(adminNormalMode) ? ` - ${adminNormalQuestionCount} oppgaver` : ""}.`); } catch (error) { setAdminMessage(error.message); }
  }

  if (screen === "home") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Zap /></div><h1>Regnemester</h1><p>Velg spilltype.</p></div><div className="card input-card"><Button onClick={() => { setGameType("normal"); setScreen("grade"); }} className="full">Normal</Button><Button variant="secondary" onClick={() => { setGameType("school_battle"); setGameLevel("medium"); setScreen("school"); }} className="full top-space">Skolekampen</Button><Button variant="secondary" onClick={() => { setGameType("boss_battle"); setGameLevel("medium"); setScreen("bossMode"); }} className="full top-space">Boss Battle</Button></div><Button variant="light" onClick={() => setScreen("qr")} className="full top-space">Vis QR-kode</Button><Button variant="light" onClick={() => setScreen("adminLogin")} className="full top-space">Admin</Button></Shell>;
  }

  if (screen === "bossMode") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Star /></div><h1>Boss Battle</h1><p>Velg regneart.</p></div><div className="card input-card"><ModeButtons selectedMode={gameMode} onSelect={(mode) => { setGameMode(mode); setScreen("bossSelect"); }} /></div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "bossSelect") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Star /></div><h1>Velg boss</h1><p>{getModeLabel(gameMode)}</p><p className="small-note">Velg boss og vanskelighetsgrad på oppgavene.</p></div><div className="card input-card">{BOSS_OPTIONS.map((boss) => <Button key={boss.id} variant={bossId === boss.id ? "primary" : "light"} onClick={() => setBossId(boss.id)} className="full top-space">{boss.name} · {boss.lives} liv · {boss.hearts} hjerter</Button>)}</div><div className="card input-card"><label>Velg vanskelighetsgrad</label><Button variant={gameLevel === "easy" ? "primary" : "light"} onClick={() => setGameLevel("easy")} className="full">Lett</Button><Button variant={gameLevel === "medium" ? "primary" : "light"} onClick={() => setGameLevel("medium")} className="full top-space">Middels</Button><Button variant={gameLevel === "hard" ? "primary" : "light"} onClick={() => setGameLevel("hard")} className="full top-space">Vanskelig</Button></div><div className="card input-card"><Button onClick={startBossBattle} className="full">Start bosskamp</Button><p className="small-note">Hvert 5. riktige svar på rad gir superangrep og 2 skade.</p></div><Button variant="light" onClick={() => setScreen("bossMode")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "bossPlay") {
    const boss = getBossConfig(bossId); const hpPercent = bossMaxLives > 0 ? Math.max(0, Math.min(100, (bossLives / bossMaxLives) * 100)) : 0; const isSuperReady = currentStreak === 4;
    return <Shell><div className="boss-play-layout"><div className="boss-arena" style={{ background: boss.gradient }}><div className="boss-arena-inner"><div className="boss-topline"><div><div className="boss-arena-name">{boss.arena}</div><div className="boss-name-title">{boss.name}</div></div><div className="boss-badge">{boss.shortIcon}</div></div><div className="boss-stage"><div className={`boss-figure-wrap ${bossHit ? "hit" : ""}`}><BossFigure bossId={bossId} hpPercent={hpPercent} /></div>{damagePopup && <div className={`damage-popup ${damagePopup.super ? "super" : ""}`}>{damagePopup.text}</div>}<div className="boss-shadow" /></div><div className="boss-hp-wrap"><div className="boss-hp-label"><span>Boss-liv</span><span>{bossLives}/{bossMaxLives}</span></div><div className="boss-hp-bar"><div className="boss-hp-fill" style={{ width: `${hpPercent}%` }} /></div></div></div></div><div className={`player-panel ${playerHit ? "hit" : ""}`}><div className="boss-compact-status"><div className="heart-row">{Array.from({ length: playerMaxHearts }).map((_, index) => <span key={index} className={index < playerHearts ? "" : "heart-lost"}>❤️</span>)}</div><div className="super-area"><div className="super-meter-label"><span>Super</span><span>{currentStreak}/5</span></div><div className="super-meter">{Array.from({ length: 5 }).map((_, index) => <div key={index} className={`super-cell ${index < currentStreak ? "filled" : ""} ${isSuperReady && index === 4 ? "ready" : ""}`} />)}</div></div></div></div><div className="card question-card boss-question-card"><p className="label">Velg riktig svar</p><h2>{question.a} {question.symbol} {question.b} = ?</h2></div><div className="answer-grid">{question.options.map((option) => { let answerClass = "answer-button"; if (feedback === "correct" && option === question.correct) answerClass += " correct"; if (feedback === "wrong" && option !== question.correct) answerClass += " wrong"; if (feedback === "wrong" && option === question.correct) answerClass += " correct"; return <button key={option} onClick={() => answerBoss(option)} disabled={Boolean(feedback)} className={answerClass}>{option}</button>; })}</div><div className="feedback-area boss-feedback-area">{feedback === "correct" && <p className="feedback correct-text">{bossMessage}</p>}{feedback === "wrong" && <p className="feedback wrong-text">{bossMessage}</p>}{!feedback && <p className="feedback neutral-text">{isSuperReady ? "Neste riktige svar gir superangrep!" : bossMessage || "Slå bossen før du mister alle hjertene!"}</p>}</div><Button variant="light" onClick={quitBossBattle} className="full quit-round-button">Avslutt runde</Button></div></Shell>;
  }

  if (screen === "bossResult") {
    const boss = getBossConfig(bossId); const won = bossOutcome === "won";
    return <Shell><div className="hero compact"><h1>{won ? `Du slo ${boss.name}!` : `${boss.name} vant denne gangen`}</h1><p>{won ? `Du tar med deg ${boss.treasureName} hjem.` : "Prøv igjen og slå tilbake!"}</p></div><div className="card result-card">{won ? <><TreasureChest size={boss.treasureSize} /><h2>{boss.treasureName}</h2><span>{boss.name} ble slått</span></> : <><div className="boss-result-figure"><BossFigure bossId={bossId} hpPercent={Math.max(0, Math.min(100, (bossLives / bossMaxLives) * 100))} /></div><h2>{boss.name} står igjen</h2><span>{bossLives} boss-liv igjen</span></>}</div><div className="stack"><Button onClick={startBossBattle}>Prøv samme boss igjen</Button><Button variant="secondary" onClick={() => setScreen("bossSelect")}>Velg ny boss</Button><Button variant="light" onClick={() => setScreen("bossMode")}>Tilbake</Button></div><p className="small-note">Boss Battle har ingen highscore og lagrer ingen resultater.</p></Shell>;
  }

  if (screen === "grade") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Zap /></div><h1>Normal</h1><p>Velg trinn.</p></div><div className="card input-card">{[1, 2, 3, 4, 5, 6, 7, 8].map((grade) => <Button key={grade} variant={gameGradeLevel === grade ? "primary" : "light"} onClick={() => { setGameGradeLevel(grade); setHighscoreGradeLevel(grade); setScreen("mode"); }} className="full top-space">{getGradeLabel(grade)}</Button>)}</div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "school") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Trophy /></div><h1>Skolekampen</h1><p>Velg skole.</p></div><div className="card input-card">{SCHOOL_OPTIONS.map((school) => <Button key={school} variant={schoolBattleSchool === school ? "primary" : "light"} onClick={() => { setSchoolBattleSchool(school); setScreen("schoolMode"); }} className="full top-space">{school}</Button>)}</div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "schoolMode") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Trophy /></div><h1>Skolekampen</h1><p>{schoolBattleSchool}</p><p className="small-note">Velg regneart.</p></div><div className="card input-card"><ModeButtons selectedMode={gameMode} onSelect={(mode) => { setGameMode(mode); setGameLevel("medium"); if (isTimeChallengeMode(mode)) { setGameQuestionCount(SCHOOL_BATTLE_TIME_QUESTION_COUNT); setScreen("schoolGradeGroup"); } else { setScreen("start"); } }} /></div><Button variant="secondary" onClick={() => openSchoolBattleHighscore("addition", highscoreGradeGroup)} className="full top-space">Se highscore</Button><Button variant="light" onClick={() => setScreen("school")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "schoolGradeGroup") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Trophy /></div><h1>Skolekampen</h1><p>{getModeLabel(gameMode)} · velg gruppe.</p><p className="small-note">25 riktige svar · Highscore på kortest tid</p></div><div className="card input-card"><Button variant={schoolBattleGradeGroup === "small" ? "primary" : "light"} onClick={() => { setSchoolBattleGradeGroup("small"); setScreen("start"); }} className="full">Småtrinn 1.–4.</Button><Button variant={schoolBattleGradeGroup === "middle" ? "primary" : "light"} onClick={() => { setSchoolBattleGradeGroup("middle"); setScreen("start"); }} className="full top-space">Mellomtrinn 5.–7.</Button></div><Button variant="light" onClick={() => setScreen("schoolMode")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "mode") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Zap /></div><h1>Normal</h1><p>{getGradeLabel(gameGradeLevel)} - velg hva du vil øve på.</p></div><div className="card input-card"><ModeButtons selectedMode={gameMode} onSelect={(mode) => { setGameMode(mode); if (isTimeChallengeMode(mode)) setGameQuestionCount(10); setScreen("start"); }} /></div><Button variant="secondary" onClick={() => openHighscore("addition", gameLevel, gameGradeLevel, gameQuestionCount)} className="full top-space">Se highscore</Button><Button variant="light" onClick={() => setScreen("grade")} className="full top-space">Tilbake</Button><p className="small-note">Velg trinn og regneart før du starter spillet.</p></Shell>;
  }

  if (screen === "qr") {
    return <Shell><div className="hero compact"><div className="icon-box icon-yellow"><Zap /></div><h1>QR-kode</h1><p>Skann for å åpne Regnemester.</p></div><div className="card input-card" style={{ alignItems: "center", textAlign: "center" }}><QrCodeImage /><p className="small-note">{APP_URL}</p></div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "start") {
    const timeChallenge = isTimeChallengeMode(gameMode); const selectedQuestionCount = gameType === "school_battle" && timeChallenge ? SCHOOL_BATTLE_TIME_QUESTION_COUNT : gameQuestionCount;
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Zap /></div><h1>{gameType === "school_battle" ? "Skolekampen" : "Regnemester"}</h1><p>{timeChallenge ? `Hvor raskt klarer du ${selectedQuestionCount} ${gameMode === "subtraction" ? "subtraksjonsoppgaver" : "addisjonsoppgaver"}?` : gameMode === "multiplication" ? `Hvor mange gangestykker klarer du på ${getGameSeconds(gameType)} sekunder?` : `Hvor mange divisjonsstykker klarer du på ${getGameSeconds(gameType)} sekunder?`}</p>{gameType === "school_battle" ? (timeChallenge ? <p className="small-note">{schoolBattleSchool} · {getGradeGroupLabel(schoolBattleGradeGroup)} · 25 riktige svar · Feil gir +{TIME_PENALTY_SECONDS} sekunder</p> : <p className="small-note">{schoolBattleSchool} · Middels nivå · 70 sekunder</p>) : <p className="small-note">{getGradeLabel(gameGradeLevel)} · {getLevelDescription(gameMode, gameLevel)}{timeChallenge ? ` · Feil svar gir +${TIME_PENALTY_SECONDS} sekunder` : ""}</p>}</div>{gameType === "normal" ? <div className="card input-card"><label>Velg nivå</label><Button variant={gameLevel === "easy" ? "primary" : "light"} onClick={() => setGameLevel("easy")} className="full">Lett</Button><Button variant={gameLevel === "medium" ? "primary" : "light"} onClick={() => setGameLevel("medium")} className="full top-space">Middels</Button><Button variant={gameLevel === "hard" ? "primary" : "light"} onClick={() => setGameLevel("hard")} className="full top-space">Vanskelig</Button></div> : <div className="card input-card"><label>Skolekampen</label>{timeChallenge ? <p className="small-note">{getGradeGroupLabel(schoolBattleGradeGroup)} · 25 riktige svar · kortest tid vinner.</p> : <p className="small-note">Nivået er låst til Middels.</p>}</div>}{gameType === "normal" && timeChallenge && <div className="card input-card"><label>Velg antall oppgaver</label>{QUESTION_COUNT_OPTIONS.map((count) => <Button key={count} variant={gameQuestionCount === count ? "primary" : "light"} onClick={() => setGameQuestionCount(count)} className="full top-space">{count} oppgaver</Button>)}</div>}<div className="card input-card"><label htmlFor="player-name">Skriv spillnavn</label><input id="player-name" value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength={18} placeholder="f.eks. Tiger23" autoComplete="off" />{nameError && <p className="admin-message">{nameError}</p>}<Button onClick={startGame} disabled={!trimmedName} className="full">Start spillet</Button></div><Button variant="light" onClick={() => setScreen(gameType === "school_battle" ? "schoolMode" : "mode")} className="full top-space">Tilbake</Button><p className="small-note">Ikke bruk etternavn. Bruk spillnavn eller fornavn.</p></Shell>;
  }

  if (screen === "play") {
    const timeChallenge = isTimeChallengeMode(gameMode); const displayedTime = elapsedSeconds + wrongAnswers * TIME_PENALTY_SECONDS; const displayedQuestionCount = gameType === "school_battle" && timeChallenge ? SCHOOL_BATTLE_TIME_QUESTION_COUNT : gameQuestionCount;
    return <Shell>{timeChallenge ? <div className="status-row"><div className="status-pill red"><Timer /><span>{formatTime(displayedTime)}</span></div><div className="status-pill green"><Trophy /><span>{questionsDone}/{displayedQuestionCount}</span></div></div> : <div className="status-row"><div className="status-pill red"><Timer /><span>{timeLeft} sek</span></div><div className="status-pill green"><Trophy /><span>{score} poeng</span></div></div>}<div className="card question-card"><p className="label">{timeChallenge ? `Oppgave ${Math.min(questionsDone + 1, displayedQuestionCount)} av ${displayedQuestionCount}` : "Velg riktig svar"}</p><h2>{question.a} {question.symbol} {question.b} = ?</h2></div><div className="answer-grid">{question.options.map((option) => { let answerClass = "answer-button"; if (feedback === "correct" && option === question.correct) answerClass += " correct"; if (feedback === "wrong" && option !== question.correct) answerClass += " wrong"; if (feedback === "wrong" && option === question.correct) answerClass += " correct"; return <button key={option} onClick={() => answer(option)} disabled={Boolean(feedback)} className={answerClass}>{option}</button>; })}</div><div className="feedback-area">{feedback === "correct" && <p className="feedback correct-text">Riktig! +1</p>}{feedback === "wrong" && <p className="feedback wrong-text">{timeChallenge ? `Feil! +${TIME_PENALTY_SECONDS} sekunder. Oppgaven teller ikke.` : "Feil! -1 poeng"}</p>}{!feedback && <p className="feedback neutral-text">{timeChallenge ? "Svar riktig og raskt!" : "Svar så raskt du kan!"}</p>}</div><Button variant="light" onClick={quitRound} className="full quit-round-button">Avslutt runde</Button></Shell>;
  }

  if (screen === "result") {
    const timeChallenge = isTimeChallengeMode(gameMode); const resultQuestionCount = gameType === "school_battle" && timeChallenge ? SCHOOL_BATTLE_TIME_QUESTION_COUNT : gameQuestionCount;
    return <Shell><div className="hero compact"><h1>{timeChallenge ? "Ferdig!" : "Tiden er ute!"}</h1></div>{timeChallenge ? <div className="card result-card"><p>Din tid</p><strong>{formatTime(resultTimeSeconds)}</strong><span>{resultQuestionCount} riktige svar</span><h2>Godt jobbet!</h2><p className="small-note">Riktige: {resultCorrectAnswers} · Feil: {resultWrongAnswers}</p></div> : <div className="card result-card"><p>Du fikk</p><strong>{score}</strong><span>poeng</span><StarsDisplay count={stars} /><h2>{getMessage(score)}</h2></div>}{scoreMessage && <p className="error-box">{scoreMessage}</p>}<div className="stack"><Button onClick={startGame}>Spill igjen</Button><Button variant="secondary" onClick={() => (gameType === "school_battle" ? openSchoolBattleHighscore(gameMode, schoolBattleGradeGroup) : openHighscore(gameMode, gameLevel, gameGradeLevel, gameQuestionCount))}>Se highscore</Button><Button variant="light" onClick={() => setScreen(gameType === "school_battle" ? "schoolMode" : "mode")}>Tilbake</Button></div><p className="small-note">{timeChallenge ? `Highscore for ${getModeLabel(gameMode).toLowerCase()} lagrer kun toppresultater. Feil svar gir +${TIME_PENALTY_SECONDS} sekunder.` : "Stjerner vises bare her. Highscore lagrer kun relevante toppresultater."}</p></Shell>;
  }

  if (screen === "schoolHighscore") {
    return <Shell><div className="hero compact"><div className="icon-box icon-yellow"><Crown /></div><h1>Skolekampen</h1><p>{getModeLabel(highscoreMode)} - {isTimeChallengeMode(highscoreMode) ? `${getGradeGroupLabel(highscoreGradeGroup)} - Topp 20 korteste tider` : "Topp 20"}</p></div><div className="card input-card"><ModeFilterButtons selectedMode={highscoreMode} onSelect={changeSchoolBattleHighscoreMode} /></div>{isTimeChallengeMode(highscoreMode) && <div className="card input-card"><label>Velg gruppe</label><Button variant={highscoreGradeGroup === "small" ? "primary" : "light"} onClick={() => changeSchoolBattleGradeGroup("small")} className="full">Småtrinn 1.–4.</Button><Button variant={highscoreGradeGroup === "middle" ? "primary" : "light"} onClick={() => changeSchoolBattleGradeGroup("middle")} className="full top-space">Mellomtrinn 5.–7.</Button></div>}{scoreMessage && <p className="error-box">{scoreMessage}</p>}<div className="card highscore-card">{scores.length === 0 ? <div className="empty-state"><h2>Ingen resultater ennå</h2><p>Spill en runde i Skolekampen for å lage første score.</p></div> : <div className="score-list">{scores.map((entry, index) => <div key={`${entry.name}-${entry.school}-${entry.score}-${index}`} className="score-row"><div className="score-name"><span className={index === 0 ? "rank rank-first" : "rank"}>{index + 1}</span><strong>{entry.name}</strong><small>{entry.school}</small></div><span className="score-value">{isTimeChallengeMode(highscoreMode) ? formatTime(entry.score) : entry.score}</span></div>)}</div>}</div><div className="stack"><Button onClick={() => setScreen("schoolMode")}>Tilbake</Button></div></Shell>;
  }

  if (screen === "highscore") {
    const timedHighscore = isTimeChallengeMode(highscoreMode);
    return <Shell><div className="hero compact"><div className="icon-box icon-yellow"><Crown /></div><h1>Highscore</h1><p>{getHighscoreTitle(highscoreMode, highscoreLevel, highscoreGradeLevel, highscoreQuestionCount)}</p></div><div className="card input-card"><ModeFilterButtons selectedMode={highscoreMode} onSelect={changeHighscoreMode} /></div><div className="card input-card"><Button variant={highscoreLevel === "easy" ? "primary" : "light"} onClick={() => changeHighscoreLevel("easy")} className="full">Lett</Button><Button variant={highscoreLevel === "medium" ? "primary" : "light"} onClick={() => changeHighscoreLevel("medium")} className="full top-space">Middels</Button><Button variant={highscoreLevel === "hard" ? "primary" : "light"} onClick={() => changeHighscoreLevel("hard")} className="full top-space">Vanskelig</Button></div>{timedHighscore && <div className="card input-card"><label>Antall oppgaver</label>{QUESTION_COUNT_OPTIONS.map((count) => <Button key={count} variant={highscoreQuestionCount === count ? "primary" : "light"} onClick={() => changeHighscoreQuestionCount(count)} className="full top-space">{count} oppgaver</Button>)}</div>}{scoreMessage && <p className="error-box">{scoreMessage}</p>}<div className="card highscore-card">{scores.length === 0 ? <div className="empty-state"><h2>Ingen resultater ennå</h2><p>Spill en runde i {getGradeLabel(highscoreGradeLevel)} med {getModeLabel(highscoreMode).toLowerCase()} på {getLevelLabel(highscoreLevel).toLowerCase()} nivå{timedHighscore ? ` med ${highscoreQuestionCount} oppgaver` : ""} for å lage første score.</p></div> : <div className="score-list">{scores.map((entry, index) => <div key={`${entry.name}-${entry.score}-${index}`} className="score-row"><div className="score-name"><span className={index === 0 ? "rank rank-first" : "rank"}>{index + 1}</span><strong>{entry.name}</strong></div><span className="score-value">{timedHighscore ? formatTime(entry.score) : entry.score}</span></div>)}</div>}</div><div className="stack"><Button onClick={() => setScreen("mode")}>Tilbake</Button></div></Shell>;
  }

  if (screen === "adminLogin") {
    return <Shell><div className="hero compact"><div className="icon-box icon-red"><Shield /></div><h1>Admin</h1><p>Skriv adminkode for å fortsette.</p></div><div className="card input-card"><label htmlFor="admin-login-pin">Adminkode</label><input id="admin-login-pin" value={adminLoginPin} onChange={(event) => setAdminLoginPin(event.target.value)} type="password" inputMode="numeric" placeholder="8-sifret kode" maxLength={8} /><Button onClick={validateAdminLogin} disabled={adminLoginPin.trim().length !== 8} className="full">Logg inn</Button>{adminMessage && <p className="admin-message">{adminMessage}</p>}</div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "adminHome") {
    return <Shell><div className="hero compact"><div className="icon-box icon-red"><Shield /></div><h1>Admin</h1><p>Velg hva du vil administrere.</p></div><div className="card input-card"><Button onClick={() => { refreshNormalAdminScores(); setScreen("adminNormal"); }} className="full">Normal highscore</Button><Button variant="secondary" onClick={() => { refreshSchoolBattleScores(highscoreMode); setScreen("adminSchool"); }} className="full top-space">Skolekampen</Button></div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "adminNormal") {
    const timedAdminList = isTimeChallengeMode(adminNormalMode);
    return <Shell><div className="hero compact"><div className="icon-box icon-red"><Shield /></div><h1>Normal admin</h1><p>Slett enkeltresultater eller tøm valgt liste.</p></div><div className="card input-card"><label>Velg trinn</label>{[1, 2, 3, 4, 5, 6, 7, 8].map((grade) => <Button key={grade} variant={adminNormalGradeLevel === grade ? "primary" : "light"} onClick={() => changeAdminNormalGradeLevel(grade)} className="full top-space">{getGradeLabel(grade)}</Button>)}</div><div className="card input-card"><label>Velg regneart</label><ModeFilterButtons selectedMode={adminNormalMode} onSelect={changeAdminNormalMode} /></div><div className="card input-card"><label>Velg nivå</label><Button variant={adminNormalLevel === "easy" ? "primary" : "light"} onClick={() => changeAdminNormalLevel("easy")} className="full">Lett</Button><Button variant={adminNormalLevel === "medium" ? "primary" : "light"} onClick={() => changeAdminNormalLevel("medium")} className="full top-space">Middels</Button><Button variant={adminNormalLevel === "hard" ? "primary" : "light"} onClick={() => changeAdminNormalLevel("hard")} className="full top-space">Vanskelig</Button></div>{timedAdminList && <div className="card input-card"><label>Antall oppgaver</label>{QUESTION_COUNT_OPTIONS.map((count) => <Button key={count} variant={adminNormalQuestionCount === count ? "primary" : "light"} onClick={() => changeAdminNormalQuestionCount(count)} className="full top-space">{count} oppgaver</Button>)}</div>}<div className="card highscore-card">{scores.length === 0 ? <div className="empty-state"><h2>Ingen resultater</h2><p>Det er ingen resultater på denne listen.</p></div> : <div className="score-list">{scores.map((entry, index) => <div key={`${entry.id}-${entry.name}-${entry.score}-${index}`} className="score-row"><div className="score-name"><span className={index === 0 ? "rank rank-first" : "rank"}>{index + 1}</span><strong>{entry.name}</strong></div><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span className="score-value">{timedAdminList ? formatTime(entry.score) : entry.score}</span>{entry.id && <button type="button" className="button button-danger" onClick={() => deleteNormalScore(entry.id)} style={{ padding: "8px 10px", fontSize: "0.8rem" }}>Slett</button>}</div></div>)}</div>}</div><div className="card input-card"><p className="small-note">Valgt liste: {getGradeLabel(adminNormalGradeLevel)} · {getModeLabel(adminNormalMode)} · {getLevelLabel(adminNormalLevel)}{timedAdminList ? ` · ${adminNormalQuestionCount} oppgaver` : ""}</p><Button variant="danger" onClick={resetNormalFromAdmin} className="full">Tøm denne listen</Button>{adminMessage && <p className="admin-message">{adminMessage}</p>}</div><Button variant="light" onClick={() => setScreen("adminHome")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "adminSchool") {
    return <Shell><div className="hero compact"><div className="icon-box icon-red"><Shield /></div><h1>Skolekampen admin</h1><p>Slett enkeltresultater.</p></div><div className="card input-card"><ModeFilterButtons selectedMode={highscoreMode} onSelect={changeSchoolBattleHighscoreMode} /></div>{isTimeChallengeMode(highscoreMode) && <div className="card input-card"><label>Velg gruppe</label><Button variant={highscoreGradeGroup === "small" ? "primary" : "light"} onClick={() => changeSchoolBattleGradeGroup("small")} className="full">Småtrinn 1.–4.</Button><Button variant={highscoreGradeGroup === "middle" ? "primary" : "light"} onClick={() => changeSchoolBattleGradeGroup("middle")} className="full top-space">Mellomtrinn 5.–7.</Button></div>}<div className="card highscore-card">{scores.length === 0 ? <div className="empty-state"><h2>Ingen resultater</h2><p>Det er ingen Skolekampen-resultater på denne listen.</p></div> : <div className="score-list">{scores.map((entry, index) => <div key={`${entry.id}-${entry.name}-${entry.school}-${entry.score}-${index}`} className="score-row"><div className="score-name"><span className={index === 0 ? "rank rank-first" : "rank"}>{index + 1}</span><strong>{entry.name}</strong><small>{entry.school}</small></div><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span className="score-value">{isTimeChallengeMode(highscoreMode) ? formatTime(entry.score) : entry.score}</span>{entry.id && <button type="button" className="button button-danger" onClick={() => deleteSchoolBattleScore(entry.id)} style={{ padding: "8px 10px", fontSize: "0.8rem" }}>Slett</button>}</div></div>)}</div>}</div><Button variant="light" onClick={() => setScreen("adminHome")} className="full top-space">Tilbake</Button></Shell>;
  }

  return null;
}
