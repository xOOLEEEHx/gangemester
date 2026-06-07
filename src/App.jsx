import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Crown, Shield, Star, Timer, Trophy, Zap } from "lucide-react";

const NORMAL_GAME_SECONDS = 60;
const SCHOOL_BATTLE_SECONDS = 70;
const TIME_PENALTY_SECONDS = 5;
const SCHOOL_BATTLE_TIME_QUESTION_COUNT = 25;
const NORMAL_HIGHSCORE_VISIBLE_LIMIT = 10;
const NORMAL_VISIBLE_FETCH_LIMIT = 1000;
const SCHOOL_BATTLE_VISIBLE_FETCH_LIMIT = 1000;
const QUESTION_COUNT_OPTIONS = [10, 20, 30, 40];
const STORAGE_KEY = "gangemester_highscores_v1";
const PENDING_HIGHSCORE_KEY = "regnemester_pending_highscores_v1";
const HIGHSCORE_SAVE_PENDING_MESSAGE = "Runden er fullført, men resultatet kunne ikke lagres på highscore akkurat nå. Appen prøver igjen automatisk.";
const HIGHSCORE_SAVE_CONFIRMED_MESSAGE = "Resultatet ble lagret på highscore.";
const HIGHSCORE_LOAD_FAILED_MESSAGE = "Highscore-listen kunne ikke lastes akkurat nå.";
const PENDING_HIGHSCORE_SAVED_MESSAGE = "Tidligere resultat ble lagret på highscore.";
const NORMAL_RESULT_MOTIVATION_MESSAGES = [
  "Flott innsats! ⭐",
  "Godt jobbet! 💪",
  "Du blir bedre og bedre! 🚀",
  "Sterkt levert! 🔥",
  "Klar for en ny runde? 🎯",
  "Dette var bra øving! 🧠",
  "Regnemester i farta! ⚡",
  "Supert jobbet! 🌟",
  "Du er på god vei! 🏆",
  "Fortsett sånn! ✨",
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const ADMIN_PIN_FALLBACK = import.meta.env.VITE_ADMIN_PIN_FALLBACK || "48291736";
const APP_URL = "https://regnemester.vercel.app/";

const MODE_ORDER = ["addition", "subtraction", "multiplication", "division"];
const MIXED_MODE = "mixed";
const MIXED_MODE_OPTIONS = MODE_ORDER;
const PRACTICE_MODE_ORDER = [...MODE_ORDER, MIXED_MODE];
const LEVEL_ORDER = ["easy", "medium", "hard"];
const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const ALL_FILTER_VALUE = "all";

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

function scrollToGameTop(target = null) {
  if (typeof window === "undefined") return;
  const doc = window.document;
  const scroll = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (doc?.scrollingElement) doc.scrollingElement.scrollTop = 0;
    if (doc?.documentElement) doc.documentElement.scrollTop = 0;
    if (doc?.body) doc.body.scrollTop = 0;
    if (target?.scrollIntoView) target.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
  };
  const frame = typeof window.requestAnimationFrame === "function"
    ? (callback) => window.requestAnimationFrame(callback)
    : (callback) => setTimeout(callback, 0);

  setTimeout(scroll, 0);
  frame(() => frame(scroll));
  setTimeout(scroll, 80);
  setTimeout(scroll, 180);
}

function scrollToTopNow(target = null) {
  scrollToGameTop(target);
}

function getRandomNormalResultMotivationMessage() {
  const index = Math.floor(Math.random() * NORMAL_RESULT_MOTIVATION_MESSAGES.length);
  return NORMAL_RESULT_MOTIVATION_MESSAGES[index] || "Flott innsats! ⭐";
}

function getBossConfig(bossId) {
  return BOSS_OPTIONS.find((boss) => boss.id === bossId) || BOSS_OPTIONS[0];
}

function getBossDamage(streak) {
  if (streak >= 5) return 2;
  return 1;
}

function getBossAttackName(bossId) {
  if (bossId === "troll") return "Trollklask!";
  if (bossId === "shadow" || bossId === "dragon") return "Skyggestøt!";
  return "Slimsprut!";
}

function getBossIntroText(bossId) {
  if (bossId === "troll") return "Trollkongen tramper inn!";
  if (bossId === "shadow" || bossId === "dragon") return "Skyggegolemen samler mørk energi!";
  return "Slimbossen bobler fram!";
}

function getBossMood(hpPercent = 100) {
  if (hpPercent <= 0) return "defeated";
  if (hpPercent < 40) return "weak";
  if (hpPercent <= 70) return "angry";
  return "confident";
}

function getModeLabel(mode) {
  if (mode === "addition") return "Addisjon";
  if (mode === "subtraction") return "Subtraksjon";
  if (mode === "division") return "Divisjon";
  if (mode === MIXED_MODE) return "Blanding";
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
  if (mode === MIXED_MODE) return `${getLevelLabel(level)}: oppgaver fra +, −, × og ÷`;
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

function getNormalAdminQuestionCount(entry) {
  const count = Number(entry?.question_count || 0);
  return count > 0 ? count : 10;
}

function normalizeNormalAdminScore(entry) {
  const mode = entry?.mode || "multiplication";
  const isTimed = isTimeChallengeMode(mode);
  return {
    id: entry?.id,
    name: typeof entry?.name === "string" ? entry.name : "",
    score: Number(entry?.score),
    mode,
    level: entry?.level || "medium",
    grade_level: Number(entry?.grade_level || 4),
    game_type: "normal",
    question_count: isTimed ? getNormalAdminQuestionCount(entry) : 0,
  };
}

function sortNormalAdminEntries(entries, mode) {
  const isTimed = isTimeChallengeMode(mode);
  return [...entries].sort((a, b) => (isTimed ? Number(a.score) - Number(b.score) : Number(b.score) - Number(a.score)));
}

function getNormalAdminGroupKey(entry) {
  const isTimed = isTimeChallengeMode(entry.mode);
  const questionPart = isTimed ? getNormalAdminQuestionCount(entry) : "score";
  return `${entry.grade_level}-${entry.mode}-${entry.level}-${questionPart}`;
}

function getNormalAdminGroupTitle(group) {
  const baseTitle = `${getGradeLabel(group.gradeLevel)} · ${getModeLabel(group.mode)} · ${getLevelLabel(group.level)}`;
  if (isTimeChallengeMode(group.mode)) return `${baseTitle} · ${group.questionCount} oppgaver`;
  return baseTitle;
}

function buildNormalAdminGroups(entries, filters = {}) {
  const searchTerm = (filters.search || "").trim().toLowerCase();
  const gradeFilter = filters.grade ?? ALL_FILTER_VALUE;
  const modeFilter = filters.mode ?? ALL_FILTER_VALUE;
  const levelFilter = filters.level ?? ALL_FILTER_VALUE;
  const questionCountFilter = filters.questionCount ?? ALL_FILTER_VALUE;
  const grouped = new Map();

  entries
    .map(normalizeNormalAdminScore)
    .filter((entry) => entry.name && Number.isFinite(entry.score))
    .forEach((entry) => {
      if (gradeFilter !== ALL_FILTER_VALUE && Number(entry.grade_level) !== Number(gradeFilter)) return;
      if (modeFilter !== ALL_FILTER_VALUE && entry.mode !== modeFilter) return;
      if (levelFilter !== ALL_FILTER_VALUE && entry.level !== levelFilter) return;
      if (questionCountFilter !== ALL_FILTER_VALUE && isTimeChallengeMode(entry.mode) && Number(entry.question_count) !== Number(questionCountFilter)) return;
      if (questionCountFilter !== ALL_FILTER_VALUE && !isTimeChallengeMode(entry.mode)) return;
      if (searchTerm && !entry.name.toLowerCase().includes(searchTerm)) return;

      const key = getNormalAdminGroupKey(entry);
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          gradeLevel: entry.grade_level,
          mode: entry.mode,
          level: entry.level,
          questionCount: isTimeChallengeMode(entry.mode) ? getNormalAdminQuestionCount(entry) : null,
          entries: [],
        });
      }
      grouped.get(key).entries.push(entry);
    });

  return [...grouped.values()]
    .map((group) => ({ ...group, entries: sortNormalAdminEntries(group.entries, group.mode) }))
    .sort((a, b) => {
      if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel - b.gradeLevel;
      const modeDiff = MODE_ORDER.indexOf(a.mode) - MODE_ORDER.indexOf(b.mode);
      if (modeDiff !== 0) return modeDiff;
      const levelDiff = LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
      if (levelDiff !== 0) return levelDiff;
      return Number(a.questionCount || 0) - Number(b.questionCount || 0);
    });
}

function getNormalAdminStats(entries) {
  const normalizedEntries = entries.map(normalizeNormalAdminScore).filter((entry) => entry.name && Number.isFinite(entry.score));
  const groups = buildNormalAdminGroups(normalizedEntries);
  const bestScoreEntry = normalizedEntries
    .filter((entry) => !isTimeChallengeMode(entry.mode))
    .sort((a, b) => Number(b.score) - Number(a.score))[0];
  const bestTimeEntry = normalizedEntries
    .filter((entry) => isTimeChallengeMode(entry.mode))
    .sort((a, b) => Number(a.score) - Number(b.score))[0];

  return {
    totalResults: normalizedEntries.length,
    activeLists: groups.length,
    bestScoreEntry,
    bestTimeEntry,
  };
}

function randomWrongAnswer(correct) {
  if (correct === 0) return randomInt(1, 20);
  const strategies = [correct + randomInt(-4, 4), correct + 10, correct - 10, correct + randomInt(1, 12), Math.max(1, correct - randomInt(1, 12))];
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

function makeMixedQuestion(level = "medium") {
  const mode = MIXED_MODE_OPTIONS[randomInt(0, MIXED_MODE_OPTIONS.length - 1)];
  if (mode === "addition") return makeAdditionQuestion(level);
  if (mode === "subtraction") return makeSubtractionQuestion(level);
  const max = getLevelMax(level, mode);
  if (mode === "division") return makeDivisionQuestion(randomInt(1, max), randomInt(1, max), max);
  return makeMultiplicationQuestion(randomInt(0, max), randomInt(0, max));
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
    if (category === 0) return makeCalculationQuestion(mode, randomInt(40, 99), randomInt(20, 40));
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
  if (mode === MIXED_MODE) {
    for (let index = 0; index < 240; index += 1) questions.push(makeMixedQuestion(level));
    return shuffle(questions);
  }
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

function normalizeNormalScore(entry, mode = "multiplication", level = "medium", gradeLevel = 4, questionCount = 10) {
  const name = typeof entry?.name === "string" ? entry.name : "";
  const score = Number(entry?.score);
  if (!name.trim() || !Number.isFinite(score)) return null;
  const entryMode = entry.mode || mode || "multiplication";
  return {
    id: entry.id,
    name,
    score,
    mode: entryMode,
    level: entry.level || level || "medium",
    grade_level: Number(entry.grade_level || gradeLevel || 4),
    school: entry.school || "",
    game_type: entry.game_type || "normal",
    question_count: Number(entry.question_count || (isTimeChallengeMode(entryMode) ? questionCount : 0)),
  };
}

function sortScores(scores, mode = "multiplication", limit = NORMAL_HIGHSCORE_VISIBLE_LIMIT) {
  const isTimed = isTimeChallengeMode(mode);
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : NORMAL_HIGHSCORE_VISIBLE_LIMIT;
  return (Array.isArray(scores) ? scores : [])
    .map((entry) => normalizeNormalScore(entry, mode))
    .filter(Boolean)
    .sort((a, b) => (isTimed ? a.score - b.score : b.score - a.score))
    .slice(0, safeLimit);
}

function getNormalPlayerKey(entry) {
  const nameKey = String(entry?.name || "").trim().toLowerCase();
  const modeKey = String(entry?.mode || "multiplication").trim().toLowerCase();
  const levelKey = String(entry?.level || "medium").trim().toLowerCase();
  const gradeKey = String(entry?.grade_level || 4);
  const questionKey = isTimeChallengeMode(entry?.mode) ? String(entry?.question_count || 0) : "score";
  return `${modeKey}|${levelKey}|${gradeKey}|${questionKey}|${nameKey}`;
}

function isBetterNormalScore(candidate, current, mode = "multiplication") {
  if (!current) return true;
  if (candidate.score === current.score) return false;
  return isTimeChallengeMode(mode) ? candidate.score < current.score : candidate.score > current.score;
}

function dedupeNormalScores(scores, mode = "multiplication", limit = NORMAL_HIGHSCORE_VISIBLE_LIMIT) {
  const bestByPlayer = new Map();
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : NORMAL_HIGHSCORE_VISIBLE_LIMIT;
  for (const entry of Array.isArray(scores) ? scores : []) {
    const normalizedEntry = normalizeNormalScore(entry, mode);
    if (!normalizedEntry) continue;
    const key = getNormalPlayerKey(normalizedEntry);
    const currentBest = bestByPlayer.get(key);
    if (isBetterNormalScore(normalizedEntry, currentBest, mode)) bestByPlayer.set(key, normalizedEntry);
  }
  const isTimed = isTimeChallengeMode(mode);
  return [...bestByPlayer.values()]
    .sort((a, b) => (isTimed ? a.score - b.score : b.score - a.score))
    .slice(0, safeLimit);
}

function normalizeSchoolBattleScore(entry, mode = "multiplication") {
  const name = typeof entry?.name === "string" ? entry.name : "";
  const score = Number(entry?.score);
  if (!name.trim() || !Number.isFinite(score)) return null;
  return {
    id: entry.id,
    name,
    school: entry.school || "Ukjent skole",
    score,
    mode: entry.mode || mode || "multiplication",
    grade_group: entry.grade_group || "small",
    question_count: Number(entry.question_count || 0),
  };
}

function sortSchoolBattleScores(scores, mode = "multiplication", limit = 20) {
  const isTimed = isTimeChallengeMode(mode);
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 20;
  return (Array.isArray(scores) ? scores : [])
    .map((entry) => normalizeSchoolBattleScore(entry, mode))
    .filter(Boolean)
    .sort((a, b) => (isTimed ? a.score - b.score : b.score - a.score))
    .slice(0, safeLimit);
}

function getSchoolBattlePlayerKey(entry) {
  const nameKey = String(entry?.name || "").trim().toLowerCase();
  const schoolKey = String(entry?.school || "Ukjent skole").trim().toLowerCase();
  const modeKey = String(entry?.mode || "multiplication").trim().toLowerCase();
  return `${schoolKey}|${modeKey}|${nameKey}`;
}

function isBetterSchoolBattleScore(candidate, current, mode = "multiplication") {
  if (!current) return true;
  if (candidate.score === current.score) return false;
  return isTimeChallengeMode(mode) ? candidate.score < current.score : candidate.score > current.score;
}

function dedupeSchoolBattleScores(scores, mode = "multiplication", limit = 20) {
  const bestByPlayer = new Map();
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 20;
  for (const entry of Array.isArray(scores) ? scores : []) {
    const normalizedEntry = normalizeSchoolBattleScore(entry, mode);
    if (!normalizedEntry) continue;
    const key = getSchoolBattlePlayerKey(normalizedEntry);
    const currentBest = bestByPlayer.get(key);
    if (isBetterSchoolBattleScore(normalizedEntry, currentBest, mode)) bestByPlayer.set(key, normalizedEntry);
  }
  const isTimed = isTimeChallengeMode(mode);
  return [...bestByPlayer.values()]
    .sort((a, b) => (isTimed ? a.score - b.score : b.score - a.score))
    .slice(0, safeLimit);
}

function getPlayerNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

function compareScoreEntries(a, b, mode = "multiplication") {
  const aScore = Number(a?.score);
  const bScore = Number(b?.score);
  if (!Number.isFinite(aScore) && !Number.isFinite(bScore)) return 0;
  if (!Number.isFinite(aScore)) return 1;
  if (!Number.isFinite(bScore)) return -1;
  return isTimeChallengeMode(mode) ? aScore - bScore : bScore - aScore;
}

function isBetterScoreEntry(candidate, current, mode = "multiplication") {
  if (!current) return true;
  const candidateScore = Number(candidate?.score);
  const currentScore = Number(current?.score);
  if (!Number.isFinite(candidateScore)) return false;
  if (!Number.isFinite(currentScore)) return true;
  if (candidateScore === currentScore) return false;
  return isTimeChallengeMode(mode) ? candidateScore < currentScore : candidateScore > currentScore;
}

function getTopUniqueScoreEntries(entries, mode = "multiplication", limit = 10) {
  const bestByPlayer = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const nameKey = getPlayerNameKey(entry?.name);
    if (!nameKey || !Number.isFinite(Number(entry?.score))) continue;
    const currentBest = bestByPlayer.get(nameKey);
    if (isBetterScoreEntry(entry, currentBest, mode)) bestByPlayer.set(nameKey, entry);
  }
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 10;
  return [...bestByPlayer.values()].sort((a, b) => compareScoreEntries(a, b, mode)).slice(0, safeLimit);
}

function sameNormalScoreList(entry, reference) {
  const mode = reference?.mode || "multiplication";
  const sameBaseList =
    (entry?.game_type || "normal") === "normal" &&
    (entry?.mode || "multiplication") === mode &&
    (entry?.level || "medium") === (reference?.level || "medium") &&
    Number(entry?.grade_level || 4) === Number(reference?.grade_level || 4);
  if (!sameBaseList) return false;
  if (!isTimeChallengeMode(mode)) return true;
  return Number(entry?.question_count || 0) === Number(reference?.question_count || 0);
}

function sameSchoolBattleScoreList(entry, reference) {
  const mode = reference?.mode || "multiplication";
  const sameBaseList =
    entry?.game_type === "school_battle" &&
    entry?.mode === mode &&
    getPlayerNameKey(entry?.school || "Ukjent skole") === getPlayerNameKey(reference?.school || "Ukjent skole");
  if (!sameBaseList) return false;
  if (!isTimeChallengeMode(mode)) return true;
  return (
    (entry?.grade_group || "small") === (reference?.grade_group || "small") &&
    Number(entry?.question_count || 0) === Number(reference?.question_count || SCHOOL_BATTLE_TIME_QUESTION_COUNT)
  );
}

function cleanLocalHighscoreList(currentScores, entryWithType, sameListFn, limit) {
  const updatedScores = [...currentScores, entryWithType];
  const sameListScores = updatedScores.filter((scoreEntry) => sameListFn(scoreEntry, entryWithType));
  const keptScores = getTopUniqueScoreEntries(sameListScores, entryWithType.mode, limit);
  return {
    saved: keptScores.includes(entryWithType),
    trimmedScores: updatedScores.filter((storedEntry) => !sameListFn(storedEntry, entryWithType) || keptScores.includes(storedEntry)),
  };
}

function applySupabaseListFilters(query, type, entry) {
  const mode = entry?.mode || "multiplication";
  if (type === "normal_score" || type === "normal_time") {
    query = query
      .eq("game_type", "normal")
      .eq("mode", mode)
      .eq("level", entry?.level || "medium")
      .eq("grade_level", Number(entry?.grade_level || 4));
    if (isTimeChallengeMode(mode)) query = query.eq("question_count", Number(entry?.question_count || 0));
    return query;
  }

  query = query
    .eq("game_type", "school_battle")
    .eq("mode", mode)
    .eq("school", entry?.school || "Ukjent skole");
  if (isTimeChallengeMode(mode)) {
    query = query
      .eq("grade_group", entry?.grade_group || "small")
      .eq("question_count", SCHOOL_BATTLE_TIME_QUESTION_COUNT);
  }
  return query;
}

function getHighscoreListLimit(type) {
  return type === "school_battle_score" || type === "school_battle_time" ? 20 : NORMAL_HIGHSCORE_VISIBLE_LIMIT;
}

function buildSupabaseScorePayload(type, entry) {
  const mode = entry?.mode || "multiplication";
  const payload = {
    name: entry.name,
    score: Number(entry.score),
    mode,
    game_type: getHighscoreGameType(type),
  };

  if (type === "normal_score" || type === "normal_time") {
    return {
      ...payload,
      level: entry.level || "medium",
      grade_level: Number(entry.grade_level || 4),
      question_count: isTimeChallengeMode(mode) ? Number(entry.question_count || 0) : 0,
    };
  }

  return {
    ...payload,
    school: entry.school || "Ukjent skole",
    level: "medium",
    grade_level: 0,
    grade_group: entry.grade_group || "small",
    question_count: isTimeChallengeMode(mode) ? SCHOOL_BATTLE_TIME_QUESTION_COUNT : 0,
  };
}

async function loadSupabaseHighscoreListRows(type, entry) {
  const mode = entry?.mode || "multiplication";
  let query = supabase
    .from("scores")
    .select("id, name, score, mode, level, grade_level, game_type, question_count, school, grade_group")
    .limit(1000);
  query = applySupabaseListFilters(query, type, entry);
  query = isTimeChallengeMode(mode) ? query.order("score", { ascending: true }) : query.order("score", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function saveSupabaseHighscoreWithUniqueCleanup(type, entry, fallbackSave) {
  const mode = entry?.mode || "multiplication";
  const limit = getHighscoreListLimit(type);
  try {
    const rows = await loadSupabaseHighscoreListRows(type, entry);
    const candidate = buildSupabaseScorePayload(type, entry);
    const keptRows = getTopUniqueScoreEntries([...rows, candidate], mode, limit);
    if (!keptRows.includes(candidate)) {
      await cleanupSupabaseHighscoreListSafely(type, entry);
      return { saved: false, message: type.startsWith("school_battle") ? "Det holdt ikke til topp 20 i Skolekampen denne gangen." : "Det holdt ikke til topp 10 denne gangen." };
    }

    const { error } = await supabase.from("scores").insert(candidate);
    if (error) throw error;
    await cleanupSupabaseHighscoreListSafely(type, entry);
    return { saved: true, message: type.startsWith("school_battle") ? "Du kom på Skolekampen-listen!" : "Du kom på highscore-listen!" };
  } catch (error) {
    console.warn("[Regnemester highscore] Direkte unik lagring feilet, bruker RPC-fallback.", {
      type,
      mode,
      playerName: entry?.name,
      school: entry?.school,
      score: entry?.score,
      error,
    });
    const fallbackResult = await fallbackSave();
    await cleanupSupabaseHighscoreListSafely(type, entry);
    return fallbackResult;
  }
}

async function cleanupSupabaseHighscoreList(type, entry) {
  if (!supabase) return;
  const mode = entry?.mode || "multiplication";
  const limit = getHighscoreListLimit(type);
  const rows = await loadSupabaseHighscoreListRows(type, entry);
  const keptRows = getTopUniqueScoreEntries(rows, mode, limit);
  const keptIds = new Set(keptRows.map((row) => row.id).filter(Boolean));
  const deleteIds = rows.map((row) => row.id).filter((id) => id && !keptIds.has(id));
  if (deleteIds.length === 0) return;

  let deleteQuery = supabase.from("scores").delete().in("id", deleteIds);
  deleteQuery = applySupabaseListFilters(deleteQuery, type, entry);
  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw deleteError;
}

async function cleanupSupabaseHighscoreListSafely(type, entry) {
  try {
    await cleanupSupabaseHighscoreList(type, entry);
  } catch (error) {
    logHighscoreError("opprydding", { ...entry, type, game_type: getHighscoreGameType(type) }, error);
  }
}

let pendingHighscoreRetryInFlight = false;
const HIGHSCORE_RETRY_DELAYS_MS = [0, 1500, 4000];
const MAX_PENDING_HIGHSCORES = 50;

function makeLocalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getHighscoreGameType(type) {
  return type === "school_battle_score" || type === "school_battle_time" ? "school_battle" : "normal";
}

function delay(ms) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error) {
  if (!error) return "Ukjent feil.";
  if (typeof error === "string") return error;
  return error.message || error.error_description || error.details || "Ukjent feil.";
}

function normalizePendingHighscore(entry) {
  if (!entry || !entry.type || !Number.isFinite(Number(entry.score))) return null;
  const name = entry.name || entry.playerName || "";
  return {
    id: entry.id || makeLocalId(),
    type: entry.type,
    game_type: entry.game_type || getHighscoreGameType(entry.type),
    name,
    playerName: name,
    score: Number(entry.score),
    mode: entry.mode,
    operation: entry.operation || entry.mode,
    level: entry.level,
    grade_level: entry.grade_level,
    question_count: entry.question_count,
    school: entry.school,
    grade_group: entry.grade_group,
    createdAt: entry.createdAt || new Date().toISOString(),
    attemptCount: Number(entry.attemptCount || entry.retryCount || 0),
    lastAttemptAt: entry.lastAttemptAt || entry.lastRetryAt || null,
  };
}

function readPendingHighscores() {
  try {
    const raw = localStorage.getItem(PENDING_HIGHSCORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizePendingHighscore).filter(Boolean) : [];
  } catch (error) {
    console.error("[Regnemester highscore] Kunne ikke lese pending highscore-ko.", { error });
    return [];
  }
}

function writePendingHighscores(entries) {
  try {
    const normalized = entries.map(normalizePendingHighscore).filter(Boolean);
    const uniqueById = Array.from(new Map(normalized.map((entry) => [entry.id, entry])).values());
    localStorage.setItem(PENDING_HIGHSCORE_KEY, JSON.stringify(uniqueById.slice(-MAX_PENDING_HIGHSCORES)));
    return true;
  } catch (error) {
    console.error("[Regnemester highscore] Kunne ikke skrive pending highscore-ko.", { error });
    return false;
  }
}

function queuePendingHighscore(type, entry) {
  const pending = normalizePendingHighscore({
    ...entry,
    id: entry.id || makeLocalId(),
    type,
    game_type: getHighscoreGameType(type),
    name: entry.name || entry.playerName || "",
    playerName: entry.playerName || entry.name || "",
    operation: entry.operation || entry.mode,
    createdAt: new Date().toISOString(),
    attemptCount: 0,
    lastAttemptAt: null,
  });
  const current = readPendingHighscores();
  const existingIndex = current.findIndex((item) => item.id === pending.id);
  if (existingIndex >= 0) current[existingIndex] = { ...current[existingIndex], ...pending };
  else current.push(pending);
  writePendingHighscores(current);
  return pending;
}

function logHighscoreError(stage, context, error) {
  console.error("[Regnemester highscore]", {
    stage,
    game_type: context?.game_type || getHighscoreGameType(context?.type),
    mode: context?.mode,
    operation: context?.operation || context?.mode,
    level: context?.level,
    grade_level: context?.grade_level,
    question_count: context?.question_count,
    school: context?.school,
    grade_group: context?.grade_group,
    pendingId: context?.id,
    attemptNumber: context?.attemptNumber,
    attemptCount: context?.attemptCount,
    playerName: context?.name || context?.playerName,
    score: context?.score,
    message: getErrorMessage(error),
    error,
  });
}

function updatePendingHighscore(id, patch) {
  const current = readPendingHighscores();
  const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
  writePendingHighscores(next);
  return next.find((item) => item.id === id) || null;
}

function removePendingHighscore(id) {
  const current = readPendingHighscores();
  writePendingHighscores(current.filter((item) => item.id !== id));
}

async function saveHighscoreEntry(type, entry) {
  if (type === "normal_time") return saveTimeScore(entry);
  if (type === "school_battle_score") return saveSchoolBattleScore(entry);
  if (type === "school_battle_time") return saveSchoolBattleTimeScore(entry);
  return saveScore(entry);
}

async function savePendingHighscoreOnce(pending, context = {}) {
  const latest = readPendingHighscores().find((item) => item.id === pending.id);
  if (!latest) return { saved: true, message: "Resultatet er allerede behandlet." };
  const attemptCount = Number(latest.attemptCount || 0) + 1;
  const attemptAt = new Date().toISOString();
  const attemptEntry = updatePendingHighscore(latest.id, { attemptCount, lastAttemptAt: attemptAt }) || { ...latest, attemptCount, lastAttemptAt: attemptAt };
  try {
    const result = await saveHighscoreEntry(attemptEntry.type, attemptEntry);
    removePendingHighscore(attemptEntry.id);
    return result || { saved: true, message: "Resultatet ble lagret på highscore." };
  } catch (error) {
    logHighscoreError(context.stage || "lagring", { ...attemptEntry, attemptNumber: attemptCount, source: context.source }, error);
    throw error;
  }
}

async function savePendingHighscoreWithRetry(pending, context = {}) {
  let lastError = null;
  for (let index = 0; index < HIGHSCORE_RETRY_DELAYS_MS.length; index += 1) {
    await delay(HIGHSCORE_RETRY_DELAYS_MS[index]);
    const latest = readPendingHighscores().find((item) => item.id === pending.id);
    if (!latest) return { saved: true, message: "Resultatet er allerede behandlet." };
    try {
      return await savePendingHighscoreOnce(latest, { ...context, attemptNumber: index + 1 });
    } catch (error) {
      lastError = error;
      if (index < HIGHSCORE_RETRY_DELAYS_MS.length - 1) {
        console.warn("[Regnemester highscore] Lagring feilet, prover igjen.", {
          pendingId: latest.id,
          attemptNumber: index + 1,
          nextDelayMs: HIGHSCORE_RETRY_DELAYS_MS[index + 1],
          mode: latest.mode,
          operation: latest.operation,
          school: latest.school,
          playerName: latest.name,
          score: latest.score,
          error,
        });
      }
    }
  }
  throw lastError || new Error("Kunne ikke lagre highscore.");
}

async function retryPendingHighscores(context = {}) {
  const pending = readPendingHighscores().filter((item) => getHighscoreGameType(item.type) === "school_battle");
  if (pendingHighscoreRetryInFlight || pending.length === 0) return { savedCount: 0, failedCount: 0 };
  pendingHighscoreRetryInFlight = true;
  let savedCount = 0;
  let failedCount = 0;
  try {
    for (const item of pending) {
      try {
        await savePendingHighscoreWithRetry(item, { source: context.source || "pending-retry", stage: "retry" });
        savedCount += 1;
      } catch (error) {
        failedCount += 1;
        logHighscoreError("retry-ga-opp", { ...item, source: context.source }, error);
      }
    }
    return { savedCount, failedCount };
  } finally {
    pendingHighscoreRetryInFlight = false;
  }
}

async function loadScores(mode = "multiplication", level = "medium", gradeLevel = 4, questionCount = 10, resultLimit = NORMAL_HIGHSCORE_VISIBLE_LIMIT) {
  const isTimed = isTimeChallengeMode(mode);
  const safeLimit = Number.isFinite(Number(resultLimit)) ? Math.max(NORMAL_HIGHSCORE_VISIBLE_LIMIT, Number(resultLimit)) : NORMAL_HIGHSCORE_VISIBLE_LIMIT;
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
    const { data, error } = await query.limit(safeLimit);
    if (!error && data) return sortScores(data, mode, safeLimit);
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
    return sortScores(filteredScores, mode, safeLimit);
  } catch {
    return [];
  }
}


async function loadAllNormalAdminScores() {
  if (supabase) {
    const { data, error } = await supabase
      .from("scores")
      .select("id, name, score, mode, level, grade_level, game_type, question_count")
      .eq("game_type", "normal");
    if (!error && data) return data.map(normalizeNormalAdminScore).filter((entry) => entry.name && Number.isFinite(entry.score));
    throw new Error(error?.message || "Kunne ikke hente Normal-resultater.");
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const storedScores = raw ? JSON.parse(raw) : [];
    return storedScores
      .filter((entry) => (entry.game_type || "normal") === "normal")
      .map(normalizeNormalAdminScore)
      .filter((entry) => entry.name && Number.isFinite(entry.score));
  } catch {
    return [];
  }
}


async function loadSchoolBattleScores(mode = "multiplication", gradeGroup = "small", resultLimit = 20) {
  const isTimed = isTimeChallengeMode(mode);
  const safeLimit = Number.isFinite(Number(resultLimit)) ? Math.max(20, Number(resultLimit)) : 20;
  if (supabase) {
    let query = supabase
      .from("scores")
      .select("id, name, score, mode, school, game_type, grade_group, question_count")
      .eq("game_type", "school_battle")
      .eq("mode", mode);
    if (isTimed) query = query.eq("grade_group", gradeGroup).eq("question_count", SCHOOL_BATTLE_TIME_QUESTION_COUNT).order("score", { ascending: true });
    else query = query.order("score", { ascending: false });
    const { data, error } = await query.limit(safeLimit);
    if (!error && data) return sortSchoolBattleScores(data, mode, safeLimit);
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
    return sortSchoolBattleScores(filteredScores, mode, safeLimit);
  } catch {
    return [];
  }
}

async function saveScore(entry) {
  if (supabase) {
    return saveSupabaseHighscoreWithUniqueCleanup("normal_score", entry, async () => {
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
    });
    const { data, error } = await supabase.rpc("save_top_score", {
      player_name: entry.name,
      player_score: entry.score,
      score_mode: entry.mode,
      score_level: entry.level,
      score_grade_level: entry.grade_level,
    });
    if (error) throw new Error(error.message || "Kunne ikke lagre score.");
    const result = Array.isArray(data) ? data[0] : data;
    await cleanupSupabaseHighscoreListSafely("normal_score", entry);
    return { saved: Boolean(result?.saved), message: result?.message || "Resultatet er sjekket mot highscore-listen." };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];
  const entryWithType = { ...entry, id: crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, game_type: "normal" };
  const cleanedLocal = cleanLocalHighscoreList(current, entryWithType, sameNormalScoreList, NORMAL_HIGHSCORE_VISIBLE_LIMIT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedLocal.trimmedScores));
  if (!cleanedLocal.saved) return { saved: false, message: "Det holdt ikke til topp 10 denne gangen." };
  return { saved: true, message: "Du kom på highscore-listen!" };
}

async function saveTimeScore(entry) {
  if (supabase) {
    return saveSupabaseHighscoreWithUniqueCleanup("normal_time", entry, async () => {
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
    });
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
    await cleanupSupabaseHighscoreListSafely("normal_time", entry);
    return { saved: Boolean(result?.saved), message: result?.message || "Resultatet er sjekket mot highscore-listen." };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];
  const entryWithType = { ...entry, id: crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, game_type: "normal" };
  const cleanedLocal = cleanLocalHighscoreList(current, entryWithType, sameNormalScoreList, NORMAL_HIGHSCORE_VISIBLE_LIMIT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedLocal.trimmedScores));
  if (!cleanedLocal.saved) return { saved: false, message: "Det holdt ikke til topp 10 denne gangen." };
  return { saved: true, message: "Du kom på highscore-listen!" };
}

async function saveSchoolBattleTimeScore(entry) {
  if (supabase) {
    return saveSupabaseHighscoreWithUniqueCleanup("school_battle_time", entry, async () => {
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
    });
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
    await cleanupSupabaseHighscoreListSafely("school_battle_time", entry);
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
  const cleanedLocal = cleanLocalHighscoreList(current, entryWithType, sameSchoolBattleScoreList, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedLocal.trimmedScores));
  if (!cleanedLocal.saved) return { saved: false, message: "Det holdt ikke til topp 20 i Skolekampen denne gangen." };
  return { saved: true, message: "Du kom på Skolekampen-listen!" };
}

async function saveSchoolBattleScore(entry) {
  if (supabase) {
    return saveSupabaseHighscoreWithUniqueCleanup("school_battle_score", entry, async () => {
      const { data, error } = await supabase.rpc("save_school_battle_score", {
        player_name: entry.name,
        player_score: entry.score,
        score_mode: entry.mode,
        player_school: entry.school,
      });
      if (error) throw new Error(error.message || "Kunne ikke lagre Skolekampen-score.");
      const result = Array.isArray(data) ? data[0] : data;
      return { saved: Boolean(result?.saved), message: result?.message || "Resultatet er sjekket mot Skolekampen-listen." };
    });
    const { data, error } = await supabase.rpc("save_school_battle_score", {
      player_name: entry.name,
      player_score: entry.score,
      score_mode: entry.mode,
      player_school: entry.school,
    });
    if (error) throw new Error(error.message || "Kunne ikke lagre Skolekampen-score.");
    const result = Array.isArray(data) ? data[0] : data;
    await cleanupSupabaseHighscoreListSafely("school_battle_score", entry);
    return { saved: Boolean(result?.saved), message: result?.message || "Resultatet er sjekket mot Skolekampen-listen." };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];
  const entryWithType = { ...entry, id: crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, game_type: "school_battle", level: "medium", grade_level: 0 };
  const cleanedLocal = cleanLocalHighscoreList(current, entryWithType, sameSchoolBattleScoreList, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedLocal.trimmedScores));
  if (!cleanedLocal.saved) return { saved: false, message: "Det holdt ikke til topp 20 i Skolekampen denne gangen." };
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
  return <button onClick={onClick} disabled={disabled} className={`button button-${variant} ${className}`}>{children}</button>;
}

function ModeButtons({ selectedMode, onSelect, includeMixed = false }) {
  const modes = includeMixed ? PRACTICE_MODE_ORDER : MODE_ORDER;
  return <>{modes.map((mode, index) => <Button key={mode} variant={selectedMode === mode ? "primary" : "secondary"} onClick={() => onSelect(mode)} className={`full ${index > 0 ? "top-space" : ""}`}>{getModeLabel(mode)}</Button>)}</>;
}

function ModeFilterButtons({ selectedMode, onSelect }) {
  return <>{MODE_ORDER.map((mode, index) => <Button key={mode} variant={selectedMode === mode ? "primary" : "light"} onClick={() => onSelect(mode)} className={`full ${index > 0 ? "top-space" : ""}`}>{getModeLabel(mode)}</Button>)}</>;
}

function Shell({ children }) {
  return <main className="app-shell"><BossBattleStyles /><section className="phone-frame"><div className="blob blob-one" /><div className="blob blob-two" /><div className="content">{children}</div></section></main>;
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
      @keyframes boss-breathe { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-3px) scale(1.025); } }
      @keyframes slime-squash { 0%, 100% { transform: translateY(0) scale(1); } 38% { transform: translateY(-5px) scale(1.045, .965); } 58% { transform: translateY(2px) scale(.97, 1.055); } }
      @keyframes troll-stomp { 0%, 100% { transform: translateY(0) rotate(0deg) scale(1); } 46% { transform: translateY(-2px) rotate(-.5deg) scale(1.01); } 62% { transform: translateY(3px) rotate(.35deg) scale(1.025, .985); } }
      @keyframes shadow-hover { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-6px) scale(1.018); } }
      @keyframes boss-attack-lunge { 0% { transform: translateX(0) scale(1); } 35% { transform: translateX(-7px) scale(1.04); } 58% { transform: translateX(12px) scale(1.08); } 100% { transform: translateX(0) scale(1); } }
      @keyframes boss-defeat-fall { 0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; filter: saturate(1); } 100% { transform: translateY(18px) rotate(-8deg) scale(.86); opacity: .55; filter: grayscale(.7) saturate(.55); } }
      @keyframes arena-drift { 0% { transform: translate3d(-8px, 0, 0) rotate(0deg); opacity: .45; } 50% { transform: translate3d(10px, -8px, 0) rotate(3deg); opacity: .75; } 100% { transform: translate3d(-8px, 0, 0) rotate(0deg); opacity: .45; } }
      @keyframes arena-haze-sway { 0%, 100% { transform: translate3d(-7px, 0, 0) scale(1); opacity: .72; } 50% { transform: translate3d(9px, -5px, 0) scale(1.03); opacity: .92; } }
      @keyframes arena-floor-pulse { 0%, 100% { filter: saturate(1) brightness(1); } 50% { filter: saturate(1.18) brightness(1.08); } }
      @keyframes cave-dust-drift { 0%, 100% { transform: translate3d(-5px, 2px, 0); opacity: .42; } 50% { transform: translate3d(8px, -7px, 0); opacity: .7; } }
      @keyframes shadow-smoke-roll { 0%, 100% { transform: translate3d(-10px, 2px, 0) scale(1); opacity: .6; } 50% { transform: translate3d(10px, -6px, 0) scale(1.06); opacity: .9; } }
      @keyframes attack-word-pop { 0% { transform: translate(-50%, 8px) scale(.7); opacity: 0; } 25% { transform: translate(-50%, -8px) scale(1.12); opacity: 1; } 100% { transform: translate(-50%, -32px) scale(.95); opacity: 0; } }
      @keyframes goo-wiggle { 0%, 100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(3px) scaleY(1.18); } }
      @keyframes crown-wobble { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-2deg); } 75% { transform: rotate(2deg); } }
      @keyframes core-pulse { 0%, 100% { opacity: .82; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
      @keyframes boss-eye-blink { 0%, 88%, 100% { transform: scaleY(1); } 92% { transform: scaleY(.16); } }
      @keyframes aura-pulse { 0%, 100% { opacity: .18; transform: scale(.96); } 50% { opacity: .42; transform: scale(1.06); } }
      @keyframes slime-bubble-float { 0%, 100% { transform: translateY(0) scale(1); opacity: .78; } 50% { transform: translateY(-5px) scale(1.08); opacity: 1; } }
      @keyframes shadow-wisp-drift { 0%, 100% { transform: translateY(0) rotate(0deg); opacity: .34; } 50% { transform: translateY(-8px) rotate(5deg); opacity: .72; } }
      @keyframes hit-flash-pop { 0% { opacity: 0; transform: scale(.86); } 28% { opacity: .72; transform: scale(1.05); } 100% { opacity: 0; transform: scale(1.18); } }
      @keyframes weak-stress { 0%, 100% { transform: translateX(0); } 30% { transform: translateX(-1.5px); } 65% { transform: translateX(1.5px); } }
      @keyframes battle-screen-shake { 0%, 100% { transform: translateX(0); } 18% { transform: translateX(-3px); } 36% { transform: translateX(3px); } 54% { transform: translateX(-2px); } 72% { transform: translateX(2px); } }
      @keyframes arena-danger-pulse { 0%, 100% { box-shadow: inset 0 -18px 34px rgba(15, 23, 42, 0.16), 0 16px 34px rgba(15, 23, 42, 0.2); } 50% { box-shadow: inset 0 -20px 38px rgba(127, 29, 29, 0.2), 0 18px 38px rgba(127, 29, 29, 0.22); } }
      @keyframes super-ring-surge { 0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(.9); } 45% { opacity: .64; transform: translate(-50%, -50%) scale(1.08); } }
      @keyframes damage-heavy-pop { 0% { transform: translate(-50%, 16px) scale(.55) rotate(-3deg); opacity: 0; } 18% { transform: translate(-50%, -8px) scale(1.38) rotate(2deg); opacity: 1; } 56% { transform: translate(-50%, -23px) scale(1.1) rotate(-1deg); opacity: 1; } 100% { transform: translate(-50%, -48px) scale(.9) rotate(0deg); opacity: 0; } }
      @keyframes hp-shine { 0% { transform: translateX(-70%); opacity: .35; } 100% { transform: translateX(120%); opacity: .82; } }
      @keyframes hp-danger-throb { 0%, 100% { filter: saturate(1.1) brightness(1); } 50% { filter: saturate(1.55) brightness(1.18); } }
      @keyframes super-meter-ready { 0%, 100% { filter: drop-shadow(0 0 0 rgba(251, 191, 36, 0)); } 50% { filter: drop-shadow(0 0 12px rgba(251, 191, 36, .9)); } }
      @keyframes boss-intro-reveal { 0% { opacity: 0; transform: translate(-50%, -12px) scale(.92); } 14%, 72% { opacity: 1; transform: translate(-50%, 0) scale(1); } 100% { opacity: 0; transform: translate(-50%, 12px) scale(.98); visibility: hidden; } }
      @keyframes hero-energy-shot { 0% { opacity: 0; transform: translate(-50%, 42px) scale(.7); } 18% { opacity: 1; } 72% { opacity: 1; transform: translate(-50%, -46px) scale(1.05); } 100% { opacity: 0; transform: translate(-50%, -62px) scale(1.28); } }
      @keyframes hero-energy-trail { 0% { opacity: 0; transform: translate(-50%, 20px) scaleY(.55); } 30% { opacity: .86; } 100% { opacity: 0; transform: translate(-50%, -42px) scaleY(1.2); } }
      @keyframes boss-retaliation-pop { 0% { opacity: 0; transform: scale(.96); } 24% { opacity: 1; transform: scale(1.02); } 100% { opacity: 0; transform: scale(1.06); } }
      @keyframes atmosphere-rise { 0% { opacity: 0; transform: translateY(18px) scale(.8); } 22% { opacity: .72; } 100% { opacity: 0; transform: translateY(-58px) scale(1.12); } }
      @keyframes atmosphere-drift { 0%, 100% { transform: translateX(-5px); } 50% { transform: translateX(7px); } }
      @keyframes answer-correct-pop { 0% { transform: scale(1); } 42% { transform: scale(1.045); box-shadow: 0 0 0 5px rgba(34,197,94,.18), 0 16px 26px rgba(21,128,61,.2); } 100% { transform: scale(1); } }
      @keyframes answer-wrong-jolt { 0%, 100% { transform: translateX(0); } 22% { transform: translateX(-4px); } 48% { transform: translateX(4px); } 72% { transform: translateX(-2px); } }
      @keyframes feedback-pop-in { 0% { opacity: 0; transform: translateY(4px) scale(.96); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes result-card-pop { 0% { transform: translateY(12px) scale(.97); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
      @keyframes result-spark-drift { 0%, 100% { transform: translateY(0) scale(.85); opacity: .45; } 50% { transform: translateY(-13px) scale(1.18); opacity: 1; } }
      @keyframes result-boss-victory { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-5px) rotate(2deg); } }
      @keyframes result-boss-loom { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-2px) scale(1.035); } }
      .play-compact-layout { display: flex; flex-direction: column; gap: 10px; }
      .status-row.play-status-compact { gap: 8px; margin-bottom: 0; }
      .status-row.play-status-compact .status-pill { padding: 9px 12px; min-height: 42px; border-radius: 16px; font-size: .95rem; }
      .status-row.play-status-compact .status-pill svg { width: 18px; height: 18px; }
      .question-card.play-question-compact { margin-top: 0; padding: 18px 14px; border-radius: 24px; }
      .question-card.play-question-compact .label { margin-bottom: 6px; font-size: .82rem; letter-spacing: .18em; }
      .question-card.play-question-compact h2 { font-size: clamp(2.15rem, 8vw, 3.25rem); line-height: 1; margin: 0; }
      .answer-grid.play-answer-grid-compact { gap: 10px; margin-top: 0; }
      .answer-grid.play-answer-grid-compact .answer-button { min-height: 76px; padding: 12px; border-radius: 22px; font-size: clamp(2rem, 7vw, 3.45rem); line-height: 1; }
      .feedback-area.play-feedback-compact { min-height: 28px; margin-top: 0; }
      .feedback-area.play-feedback-compact .feedback { margin: 2px 0 0; font-size: .9rem; }
      .play-compact-layout .quit-round-button { margin-top: 2px; }
      .boss-play-layout { display: flex; flex-direction: column; gap: 10px; }
      .boss-play-layout.player-under-attack { animation: battle-screen-shake .38s ease; }
      .boss-arena { border-radius: 24px; padding: 12px 12px 13px; color: #0f172a; box-shadow: inset 0 -22px 38px rgba(15, 23, 42, 0.15), inset 0 1px 0 rgba(255,255,255,.28), 0 16px 34px rgba(15, 23, 42, 0.18); position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,.62); isolation: isolate; background-size: cover; }
      .boss-arena::before { content: ""; position: absolute; inset: 0; z-index: 0; background: radial-gradient(ellipse at 50% 14%, rgba(255,255,255,.78), rgba(255,255,255,.18) 34%, transparent 58%), radial-gradient(ellipse at 50% 78%, rgba(15,23,42,.18), transparent 46%), linear-gradient(180deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,0) 48%, rgba(15,23,42,.18) 100%); pointer-events: none; transition: filter .25s ease, opacity .25s ease; }
      .boss-arena::after { content: ""; position: absolute; inset: -18px; z-index: 0; background: radial-gradient(circle at 18% 28%, rgba(255,255,255,.45) 0 4px, transparent 5px), radial-gradient(circle at 74% 22%, rgba(255,255,255,.28) 0 5px, transparent 6px), radial-gradient(circle at 82% 74%, rgba(255,255,255,.34) 0 3px, transparent 4px), radial-gradient(circle at 34% 82%, rgba(255,255,255,.25) 0 6px, transparent 7px); animation: arena-drift 5.5s ease-in-out infinite; pointer-events: none; opacity: .9; transition: filter .25s ease, opacity .25s ease; }
      .boss-arena.boss-theme-slime::before { background: linear-gradient(180deg, rgba(220,252,231,.7) 0 26%, rgba(134,239,172,.38) 27% 48%, rgba(22,101,52,.3) 49% 100%), radial-gradient(ellipse at 18% 55%, rgba(21,128,61,.42) 0 16%, transparent 17%), radial-gradient(ellipse at 82% 54%, rgba(20,184,166,.34) 0 18%, transparent 19%), linear-gradient(82deg, transparent 0 13%, rgba(22,101,52,.38) 14% 15%, transparent 16% 100%), linear-gradient(98deg, transparent 0 83%, rgba(22,101,52,.32) 84% 85%, transparent 86% 100%), repeating-linear-gradient(90deg, transparent 0 24px, rgba(20,83,45,.18) 25px 27px, transparent 28px 52px); animation: arena-haze-sway 6s ease-in-out infinite; }
      .boss-arena.boss-theme-slime::after { background: radial-gradient(ellipse at 24% 78%, rgba(34,197,94,.36) 0 14px, rgba(22,163,74,.2) 15px 32px, transparent 34px), radial-gradient(ellipse at 76% 78%, rgba(45,212,191,.28) 0 12px, rgba(20,184,166,.16) 13px 27px, transparent 29px), radial-gradient(circle at 18% 35%, rgba(220,252,231,.68) 0 3px, transparent 4px), radial-gradient(circle at 31% 49%, rgba(187,247,208,.52) 0 4px, transparent 5px), radial-gradient(circle at 72% 33%, rgba(220,252,231,.58) 0 3px, transparent 4px), radial-gradient(circle at 86% 58%, rgba(187,247,208,.48) 0 5px, transparent 6px), linear-gradient(180deg, transparent 0 58%, rgba(236,253,245,.28) 70%, transparent 100%); animation-duration: 6.2s; }
      .boss-arena.boss-theme-troll::before { background: linear-gradient(180deg, rgba(68,64,60,.44) 0 24%, rgba(120,53,15,.24) 25% 54%, rgba(41,37,36,.36) 55% 100%), linear-gradient(118deg, transparent 0 12%, rgba(41,37,36,.5) 13% 29%, transparent 30% 100%), linear-gradient(63deg, transparent 0 66%, rgba(68,64,60,.52) 67% 85%, transparent 86% 100%), radial-gradient(ellipse at 50% 19%, rgba(254,243,199,.46), rgba(245,158,11,.16) 22%, transparent 48%), repeating-linear-gradient(90deg, rgba(28,25,23,.1) 0 10px, rgba(87,83,78,.16) 11px 18px, transparent 19px 44px); }
      .boss-arena.boss-theme-troll::after { background: linear-gradient(25deg, transparent 0 32%, rgba(41,37,36,.36) 33% 35%, transparent 36% 100%), linear-gradient(145deg, transparent 0 62%, rgba(120,53,15,.3) 63% 65%, transparent 66% 100%), radial-gradient(ellipse at 16% 74%, rgba(68,64,60,.5) 0 14px, rgba(87,83,78,.26) 15px 25px, transparent 27px), radial-gradient(ellipse at 86% 73%, rgba(87,83,78,.46) 0 18px, rgba(120,53,15,.22) 19px 31px, transparent 33px), radial-gradient(circle at 23% 30%, rgba(254,243,199,.36) 0 3px, transparent 4px), radial-gradient(circle at 72% 38%, rgba(214,211,209,.28) 0 4px, transparent 5px); animation: cave-dust-drift 5.8s ease-in-out infinite; }
      .boss-arena.boss-theme-shadow { color: #f8fafc; border-color: rgba(148,163,184,.48); }
      .boss-arena.boss-theme-shadow .boss-badge { color: #111827; background: rgba(248,250,252,.78); border-color: rgba(248,250,252,.92); }
      .boss-arena.boss-theme-shadow .boss-arena-name { color: rgba(248,250,252,.76); }
      .boss-arena.boss-theme-shadow::before { background: linear-gradient(180deg, rgba(15,23,42,.36) 0 35%, rgba(30,41,59,.44) 36% 62%, rgba(2,6,23,.58) 63% 100%), linear-gradient(90deg, transparent 0 10%, rgba(15,23,42,.58) 11% 18%, transparent 19% 39%, rgba(15,23,42,.5) 40% 48%, transparent 49% 76%, rgba(15,23,42,.58) 77% 84%, transparent 85% 100%), linear-gradient(180deg, transparent 0 17%, rgba(148,163,184,.22) 18% 19%, transparent 20% 100%), radial-gradient(ellipse at 50% 25%, rgba(251,146,60,.42), rgba(127,29,29,.2) 26%, transparent 56%); }
      .boss-arena.boss-theme-shadow::after { background: linear-gradient(28deg, transparent 0 38%, rgba(248,113,113,.45) 39% 40%, transparent 41% 100%), linear-gradient(146deg, transparent 0 61%, rgba(251,146,60,.34) 62% 63%, transparent 64% 100%), radial-gradient(ellipse at 17% 75%, rgba(15,23,42,.56) 0 20px, rgba(2,6,23,.28) 21px 35px, transparent 37px), radial-gradient(ellipse at 84% 72%, rgba(30,41,59,.5) 0 18px, rgba(127,29,29,.24) 19px 33px, transparent 35px), radial-gradient(circle at 22% 35%, rgba(248,113,113,.38) 0 3px, transparent 4px), radial-gradient(circle at 78% 28%, rgba(251,146,60,.36) 0 5px, transparent 6px), radial-gradient(ellipse at 50% 74%, rgba(2,6,23,.45), transparent 48%); animation: shadow-smoke-roll 5.2s ease-in-out infinite; }
      .boss-arena.boss-phase-angry::before { filter: saturate(1.14) contrast(1.04); }
      .boss-arena.boss-phase-angry::after { opacity: 1; filter: saturate(1.18) brightness(1.08); }
      .boss-arena.boss-phase-weak { animation: arena-danger-pulse 1.45s ease-in-out infinite; }
      .boss-arena.boss-phase-weak::before { filter: saturate(1.32) contrast(1.08) brightness(.92); }
      .boss-arena.boss-phase-weak::after { opacity: 1; filter: saturate(1.45) brightness(1.12); animation-duration: 3.6s; }
      .boss-arena.super-ready::after { opacity: 1; filter: saturate(1.25) brightness(1.08); }
      .boss-arena.super-impact { box-shadow: inset 0 -22px 38px rgba(15, 23, 42, 0.12), inset 0 0 40px rgba(251,191,36,.18), 0 16px 34px rgba(15, 23, 42, 0.18), 0 0 26px rgba(251,191,36,.26); }
      .boss-arena.super-impact::before { filter: saturate(1.22) brightness(1.08); opacity: 1; }
      .boss-arena.super-impact::after { filter: saturate(1.28) brightness(1.12); opacity: 1; }
      .boss-scenery { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; pointer-events: none; opacity: .72; }
      .boss-scenery-slime { opacity: .68; filter: saturate(1.06); }
      .boss-scenery-troll { opacity: .74; filter: contrast(1.04); }
      .boss-scenery-shadow { opacity: .78; filter: saturate(1.18); }
      .boss-arena.boss-phase-weak .boss-scenery { opacity: .86; filter: saturate(1.28) contrast(1.05) brightness(.92); }
      .boss-arena.super-impact .boss-scenery { opacity: .86; filter: saturate(1.18) brightness(1.08); }
      .arena-atmosphere { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; animation: atmosphere-drift 6s ease-in-out infinite; }
      .arena-atmosphere span { position: absolute; bottom: 34px; width: 8px; height: 8px; border-radius: 999px; animation: atmosphere-rise 4.8s ease-in-out infinite; opacity: 0; }
      .arena-atmosphere span:nth-child(1) { left: 18%; animation-delay: .2s; }
      .arena-atmosphere span:nth-child(2) { left: 72%; width: 6px; height: 6px; animation-delay: 1.6s; }
      .arena-atmosphere span:nth-child(3) { left: 52%; width: 10px; height: 10px; animation-delay: 2.8s; }
      .atmosphere-slime span { background: rgba(220,252,231,.72); box-shadow: 0 0 10px rgba(34,197,94,.45); }
      .atmosphere-troll span { width: 5px; height: 5px; background: rgba(254,243,199,.42); box-shadow: 0 0 9px rgba(120,53,15,.32); }
      .atmosphere-shadow span { background: rgba(248,113,113,.48); box-shadow: 0 0 12px rgba(251,146,60,.5); }
      .boss-intro-banner { position: absolute; top: 42px; left: 50%; z-index: 8; width: min(86%, 360px); padding: 10px 12px; border-radius: 18px; text-align: center; pointer-events: none; background: rgba(255,255,255,.88); border: 2px solid rgba(255,255,255,.94); box-shadow: 0 16px 30px rgba(15,23,42,.22), 0 0 0 5px rgba(255,255,255,.14); animation: boss-intro-reveal 1.8s ease-out forwards; }
      .boss-intro-banner span { display: block; font-size: .68rem; font-weight: 1000; text-transform: uppercase; letter-spacing: .12em; color: #f97316; }
      .boss-intro-banner strong { display: block; font-size: 1.08rem; line-height: 1.05; color: #0f172a; }
      .boss-intro-banner em { display: block; margin-top: 3px; font-size: .76rem; line-height: 1.2; font-style: normal; font-weight: 900; color: #475569; }
      .intro-slime { background: rgba(240,253,244,.9); border-color: rgba(134,239,172,.88); }
      .intro-troll { background: rgba(255,251,235,.9); border-color: rgba(245,158,11,.55); }
      .intro-shadow { background: rgba(15,23,42,.88); border-color: rgba(248,113,113,.46); }
      .intro-shadow strong, .intro-shadow em { color: #f8fafc; }
      .boss-retaliation { position: absolute; inset: 0; z-index: 3; pointer-events: none; border-radius: inherit; animation: boss-retaliation-pop .46s ease-out forwards; }
      .boss-retaliation-slime { background: radial-gradient(circle at 50% 62%, rgba(34,197,94,.34) 0 12px, transparent 13px), radial-gradient(circle at 38% 56%, rgba(187,247,208,.45) 0 8px, transparent 9px), radial-gradient(circle at 64% 50%, rgba(74,222,128,.36) 0 10px, transparent 11px), linear-gradient(180deg, transparent, rgba(22,163,74,.16)); }
      .boss-retaliation-troll { background: radial-gradient(ellipse at 50% 80%, rgba(120,53,15,.34), transparent 42%), radial-gradient(circle at 32% 70%, rgba(214,211,209,.44) 0 5px, transparent 6px), radial-gradient(circle at 68% 64%, rgba(168,162,158,.4) 0 6px, transparent 7px); }
      .boss-retaliation-shadow { background: radial-gradient(ellipse at 50% 62%, rgba(127,29,29,.38), transparent 42%), radial-gradient(circle at 50% 50%, rgba(251,146,60,.28), transparent 26%), linear-gradient(180deg, rgba(2,6,23,.18), rgba(2,6,23,.32)); }
      .boss-arena-inner { position: relative; z-index: 1; }
      .boss-topline { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; }
      .boss-name-title { font-weight: 900; font-size: 1.05rem; line-height: 1; }
      .boss-arena-name { font-size: .72rem; opacity: .78; font-weight: 800; line-height: 1.1; }
      .boss-badge { font-size: .64rem; font-weight: 1000; padding: 6px 8px; border-radius: 999px; background: rgba(255,255,255,.72); border: 1px solid rgba(255,255,255,.8); }
      .boss-stage { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 2px; min-height: 124px; padding: 2px 0 8px; isolation: isolate; perspective: 520px; }
      .boss-stage::before { content: ""; position: absolute; left: 7%; right: 7%; bottom: 1px; height: 50px; border-radius: 50%; background: radial-gradient(ellipse at center, rgba(255,255,255,.72) 0%, rgba(255,255,255,.36) 38%, rgba(15,23,42,.16) 74%, rgba(15,23,42,0) 100%); transform: rotateX(62deg); transform-origin: center bottom; z-index: 0; box-shadow: inset 0 -10px 20px rgba(15,23,42,.08); }
      .boss-stage::after { content: ""; position: absolute; top: 2px; left: 50%; width: 190px; height: 92px; border-radius: 50%; background: radial-gradient(ellipse at center, rgba(255,255,255,.48), rgba(255,255,255,.16) 42%, rgba(255,255,255,0) 72%); transform: translateX(-50%); z-index: 0; pointer-events: none; }
      .boss-stage-slime::before { background: radial-gradient(ellipse at 50% 52%, rgba(187,247,208,.82) 0%, rgba(34,197,94,.38) 38%, rgba(21,128,61,.24) 66%, rgba(20,83,45,0) 100%), radial-gradient(ellipse at 28% 45%, rgba(220,252,231,.56) 0 7px, rgba(34,197,94,.22) 8px 18px, transparent 20px), radial-gradient(ellipse at 72% 58%, rgba(134,239,172,.46) 0 8px, rgba(22,163,74,.2) 9px 21px, transparent 23px), linear-gradient(12deg, transparent 0 41%, rgba(20,83,45,.3) 42% 44%, transparent 45% 100%); box-shadow: inset 0 -12px 18px rgba(21,128,61,.2), 0 8px 18px rgba(21,128,61,.16); animation: arena-floor-pulse 3.4s ease-in-out infinite; }
      .boss-stage-slime::after { background: radial-gradient(ellipse at center, rgba(220,252,231,.66), rgba(74,222,128,.22) 40%, rgba(20,184,166,0) 72%), linear-gradient(90deg, transparent 0 23%, rgba(22,101,52,.32) 24% 25%, transparent 26% 68%, rgba(22,101,52,.26) 69% 70%, transparent 71% 100%); animation: arena-haze-sway 5.4s ease-in-out infinite; }
      .boss-stage-troll::before { background: radial-gradient(ellipse at center, rgba(250,204,21,.36) 0%, rgba(146,64,14,.3) 42%, rgba(68,64,60,.28) 68%, rgba(41,37,36,0) 100%), linear-gradient(24deg, transparent 0 35%, rgba(41,37,36,.46) 36% 38%, transparent 39% 100%), linear-gradient(146deg, transparent 0 56%, rgba(120,53,15,.38) 57% 60%, transparent 61% 100%), linear-gradient(7deg, rgba(87,83,78,.18) 0 28%, transparent 29% 100%); box-shadow: inset 0 -12px 18px rgba(68,64,60,.24), 0 9px 18px rgba(120,53,15,.18); }
      .boss-stage-troll::after { background: radial-gradient(ellipse at center, rgba(254,243,199,.46), rgba(245,158,11,.14) 38%, rgba(120,53,15,0) 72%), radial-gradient(ellipse at 22% 70%, rgba(68,64,60,.34) 0 12px, transparent 14px), radial-gradient(ellipse at 78% 72%, rgba(87,83,78,.32) 0 10px, transparent 12px); animation: cave-dust-drift 6s ease-in-out infinite; }
      .boss-stage-shadow::before { background: radial-gradient(ellipse at center, rgba(248,113,113,.34) 0%, rgba(15,23,42,.46) 42%, rgba(2,6,23,.4) 70%, rgba(2,6,23,0) 100%), linear-gradient(30deg, transparent 0 38%, rgba(248,113,113,.48) 39% 41%, transparent 42% 100%), linear-gradient(150deg, transparent 0 58%, rgba(251,146,60,.34) 59% 61%, transparent 62% 100%), repeating-linear-gradient(90deg, rgba(15,23,42,.16) 0 12px, transparent 13px 26px); box-shadow: inset 0 -14px 20px rgba(2,6,23,.36), 0 0 24px rgba(127,29,29,.28); }
      .boss-stage-shadow::after { background: radial-gradient(ellipse at center, rgba(251,146,60,.36), rgba(127,29,29,.22) 34%, rgba(2,6,23,0) 74%), linear-gradient(90deg, transparent 0 26%, rgba(248,113,113,.38) 27% 28%, transparent 29% 72%, rgba(251,146,60,.28) 73% 74%, transparent 75% 100%); animation: shadow-smoke-roll 4.8s ease-in-out infinite; }
      .boss-stage-weak::before { filter: saturate(1.28) brightness(.95); box-shadow: inset 0 -14px 22px rgba(127,29,29,.22), 0 0 22px rgba(239,68,68,.22); }
      .boss-stage-weak::after { opacity: .95; filter: saturate(1.35) brightness(1.08); }
      .boss-stage.super-ready::after { animation: super-ring-surge 1.05s ease-in-out infinite; background: radial-gradient(ellipse at center, rgba(254,243,199,.78), rgba(251,191,36,.3) 38%, rgba(255,255,255,0) 72%); }
      .boss-stage.super-impact::after { opacity: .9; filter: saturate(1.22) brightness(1.16); }
      .hero-attack { position: absolute; left: 50%; bottom: 18px; z-index: 5; width: 16px; height: 16px; border-radius: 999px; background: radial-gradient(circle, #fff 0 24%, #bfdbfe 25% 55%, rgba(59,130,246,.24) 56% 100%); box-shadow: 0 0 16px rgba(59,130,246,.72), 0 0 0 5px rgba(219,234,254,.3); animation: hero-energy-shot .5s ease-out forwards; pointer-events: none; }
      .hero-attack::after { content: ""; position: absolute; left: 50%; bottom: -30px; width: 7px; height: 58px; border-radius: 999px; background: linear-gradient(180deg, rgba(219,234,254,0), rgba(219,234,254,.86), rgba(96,165,250,0)); transform-origin: center bottom; animation: hero-energy-trail .5s ease-out forwards; }
      .hero-attack.super { width: 24px; height: 24px; background: radial-gradient(circle, #fff 0 20%, #fef3c7 21% 50%, rgba(251,146,60,.28) 51% 100%); box-shadow: 0 0 24px rgba(251,191,36,.9), 0 0 0 8px rgba(251,191,36,.2), 0 0 38px rgba(249,115,22,.54); animation-duration: .62s; }
      .hero-attack.super::after { width: 12px; height: 76px; bottom: -42px; background: linear-gradient(180deg, rgba(254,243,199,0), rgba(254,243,199,.92), rgba(249,115,22,0)); animation-duration: .62s; }
      .boss-figure-wrap { position: relative; z-index: 2; width: 145px; height: 92px; display: grid; place-items: center; margin-bottom: -2px; animation: boss-float 2.5s ease-in-out infinite; transform-origin: center bottom; transition: transform .2s ease; }
      .boss-figure-wrap.hit { animation: boss-hit-shake .42s ease; }
      .boss-svg { width: 145px; height: 100px; overflow: visible; filter: drop-shadow(0 12px 13px rgba(15,23,42,.31)) drop-shadow(0 2px 2px rgba(255,255,255,.32)); }
      .boss-svg-shadow { width: 158px; height: 112px; filter: drop-shadow(0 12px 13px rgba(2,6,23,.38)) drop-shadow(0 0 10px rgba(248,113,113,.26)); }
      .boss-svg .boss-body-main { transform-box: fill-box; transform-origin: center bottom; animation: boss-breathe 2.2s ease-in-out infinite; }
      .boss-svg-slime .boss-body-main { animation-name: slime-squash; animation-duration: 2.25s; }
      .boss-svg-troll .boss-body-main { animation-name: troll-stomp; animation-duration: 2.85s; }
      .boss-svg-shadow .boss-body-main { animation-name: boss-breathe; animation-duration: 2.65s; opacity: 1; }
      .boss-svg .boss-eye { transform-box: fill-box; transform-origin: center; animation: boss-eye-blink 4.4s ease-in-out infinite; }
      .boss-svg .boss-aura { transform-box: fill-box; transform-origin: center; animation: aura-pulse 2.4s ease-in-out infinite; }
      .boss-svg .slime-drip { transform-box: fill-box; transform-origin: center top; animation: goo-wiggle 2.1s ease-in-out infinite; }
      .boss-svg .slime-bubble { transform-box: fill-box; transform-origin: center; animation: slime-bubble-float 2.6s ease-in-out infinite; }
      .boss-svg .troll-crown { transform-box: fill-box; transform-origin: center bottom; animation: crown-wobble 2.8s ease-in-out infinite; }
      .boss-svg .golem-core { transform-box: fill-box; transform-origin: center; animation: core-pulse 1.6s ease-in-out infinite; }
      .boss-svg .shadow-wisp { transform-box: fill-box; transform-origin: center; animation: shadow-wisp-drift 3.2s ease-in-out infinite; }
      .boss-svg .shadow-mist-back { opacity: .26; }
      .boss-svg .boss-hit-flash { opacity: 0; transform-box: fill-box; transform-origin: center; pointer-events: none; }
      .boss-svg.boss-action-hit .boss-hit-flash { animation: hit-flash-pop .42s ease-out; }
      .boss-svg.boss-action-hit .boss-body-main, .boss-svg.boss-action-hit .boss-head { filter: brightness(1.45) saturate(1.5); }
      .boss-svg.boss-action-attack { animation: boss-attack-lunge .46s ease-out; }
      .boss-svg.boss-action-defeat, .boss-svg.boss-defeated { animation: boss-defeat-fall .75s ease-out forwards; }
      .boss-svg.boss-mood-angry .boss-brow { stroke-width: 11; }
      .boss-svg.boss-mood-angry .boss-aura { animation-duration: 1.55s; filter: saturate(1.35); }
      .boss-svg.boss-mood-weak .boss-body-main { animation-duration: 1.1s; filter: saturate(.78); }
      .boss-svg.boss-mood-weak .boss-eye { animation-duration: 2.1s; }
      .boss-svg.boss-mood-weak:not(.boss-action-attack):not(.boss-action-defeat):not(.boss-defeated) { animation: weak-stress .46s ease-in-out infinite; }
      .boss-svg-shadow.boss-mood-angry .boss-aura, .boss-svg-shadow.boss-mood-weak .boss-aura { filter: saturate(1.6) brightness(1.12); }
      .boss-attack-effect { position: absolute; top: 32px; left: 50%; transform: translateX(-50%); z-index: 6; font-weight: 1000; font-size: 1.05rem; padding: 7px 10px; border-radius: 999px; color: #111827; background: rgba(255,255,255,.88); box-shadow: 0 10px 22px rgba(15,23,42,.22); border: 2px solid rgba(255,255,255,.95); animation: attack-word-pop .86s ease-out forwards; pointer-events: none; white-space: nowrap; }
      .boss-attack-effect.attack-slime { color: #14532d; }
      .boss-attack-effect.attack-troll { color: #78350f; }
      .boss-attack-effect.attack-shadow { color: #7f1d1d; }
      .boss-arena.boss-attacking .boss-attack-effect { background: #fff1f2; border-color: rgba(248,113,113,.7); box-shadow: 0 0 0 5px rgba(239,68,68,.14), 0 14px 28px rgba(127,29,29,.28); }
      .boss-result-hero { padding-top: 20px; }
      .boss-result-hero h1 { font-size: clamp(2.3rem, 10vw, 4.2rem); text-transform: uppercase; letter-spacing: 0; }
      .boss-result-hero p { margin-top: 10px; }
      .boss-result-card { position: relative; overflow: hidden; margin-top: 22px; padding: 24px 18px 22px; animation: result-card-pop .34s ease-out; }
      .boss-result-card::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 50% 12%, rgba(255,255,255,.78), transparent 30%), radial-gradient(circle at 18% 24%, rgba(250,204,21,.22), transparent 22%), radial-gradient(circle at 82% 30%, rgba(56,189,248,.18), transparent 24%); }
      .boss-result-card.won { border-color: rgba(250,204,21,.75); box-shadow: 0 18px 38px rgba(217,119,6,.16), 0 0 0 5px rgba(250,204,21,.12); }
      .boss-result-card.lost { color: #f8fafc; background: linear-gradient(155deg, #111827, #334155); border-color: rgba(148,163,184,.4); box-shadow: 0 18px 38px rgba(15,23,42,.2); }
      .boss-result-card.lost::before { background: radial-gradient(circle at 50% 12%, rgba(248,250,252,.16), transparent 32%), radial-gradient(circle at 82% 28%, rgba(248,113,113,.14), transparent 25%); }
      .boss-result-card > * { position: relative; z-index: 1; }
      .boss-result-banner { display: inline-flex; align-items: center; justify-content: center; min-height: 34px; margin: 0 auto 12px; padding: 8px 13px; border-radius: 999px; font-weight: 1000; font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; background: rgba(255,255,255,.82); color: #0f172a; border: 1px solid rgba(255,255,255,.9); }
      .boss-result-card.won .boss-result-banner { background: #fef3c7; color: #92400e; border-color: #facc15; box-shadow: 0 0 18px rgba(250,204,21,.35); }
      .boss-result-card.lost .boss-result-banner { background: rgba(15,23,42,.75); color: #fecaca; border-color: rgba(248,113,113,.4); }
      .boss-result-burst { position: absolute; inset: 10px 20px auto; height: 120px; pointer-events: none; z-index: 0; }
      .result-spark { position: absolute; width: 10px; height: 10px; border-radius: 999px; background: #facc15; box-shadow: 0 0 14px rgba(250,204,21,.72); animation: result-spark-drift 1.35s ease-in-out infinite; }
      .result-spark:nth-child(1) { left: 9%; top: 34px; animation-delay: 0s; }
      .result-spark:nth-child(2) { left: 21%; top: 8px; width: 7px; height: 7px; animation-delay: .16s; }
      .result-spark:nth-child(3) { left: 37%; top: 42px; background: #38bdf8; animation-delay: .28s; }
      .result-spark:nth-child(4) { left: 55%; top: 12px; width: 8px; height: 8px; animation-delay: .4s; }
      .result-spark:nth-child(5) { right: 25%; top: 44px; background: #86efac; animation-delay: .56s; }
      .result-spark:nth-child(6) { right: 10%; top: 18px; animation-delay: .7s; }
      .boss-result-card.lost .result-spark { background: #94a3b8; box-shadow: 0 0 12px rgba(148,163,184,.45); opacity: .6; }
      .boss-result-figure { width: 230px; height: 165px; margin: 0 auto 12px; display: grid; place-items: center; }
      .boss-result-figure .boss-svg { width: 225px; height: 160px; }
      .boss-result-defeated { animation: result-boss-victory 1.7s ease-in-out infinite; }
      .boss-result-defeated .boss-svg { filter: grayscale(.42) saturate(.72) drop-shadow(0 12px 14px rgba(15,23,42,.22)); }
      .boss-result-standing { animation: result-boss-loom 1.55s ease-in-out infinite; }
      .boss-result-standing .boss-svg { filter: drop-shadow(0 14px 16px rgba(15,23,42,.34)); }
      .boss-result-card h2 { margin-top: 8px; }
      .boss-result-card.lost h2, .boss-result-card.lost span { color: #f8fafc; }
      .boss-result-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
      .boss-result-stat { min-height: 58px; padding: 9px 7px; border-radius: 16px; background: rgba(248,250,252,.82); border: 1px solid rgba(226,232,240,.9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
      .boss-result-card.lost .boss-result-stat { background: rgba(15,23,42,.42); border-color: rgba(148,163,184,.34); }
      .boss-result-stat strong { margin: 0; font-size: 1.35rem; line-height: 1; color: #0f172a; }
      .boss-result-card.lost .boss-result-stat strong { color: #f8fafc; }
      .boss-result-stat span { font-size: .68rem; font-weight: 1000; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
      .boss-shadow { position: relative; z-index: 1; width: 108px; height: 14px; margin-top: -8px; border-radius: 999px; background: radial-gradient(ellipse at center, rgba(15,23,42,.36), rgba(15,23,42,.16) 48%, rgba(15,23,42,0) 74%); filter: blur(2px); transform: rotateX(58deg); opacity: .88; transition: width .2s ease, opacity .2s ease; }
      .boss-stage-troll .boss-shadow { width: 122px; opacity: .94; }
      .boss-stage-shadow .boss-shadow { background: radial-gradient(ellipse at center, rgba(2,6,23,.48), rgba(127,29,29,.2) 48%, rgba(15,23,42,0) 76%); }
      .boss-arena.boss-phase-weak .boss-shadow { width: 116px; opacity: 1; }
      .damage-popup { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); font-size: 1.65rem; font-weight: 1000; color: #dc2626; padding: 2px 9px; border-radius: 999px; background: rgba(255,255,255,.44); text-shadow: 0 3px 0 rgba(255,255,255,.9), 0 6px 14px rgba(0,0,0,.24); animation: damage-pop .82s ease-out forwards; pointer-events: none; z-index: 5; }
      .damage-popup.super { color: #f59e0b; font-size: 2rem; background: rgba(255,251,235,.72); box-shadow: 0 0 0 6px rgba(251,191,36,.16), 0 0 26px rgba(251,191,36,.72); text-shadow: 0 3px 0 rgba(255,255,255,.95), 0 0 18px rgba(251,191,36,.86), 0 8px 18px rgba(0,0,0,.24); animation: damage-heavy-pop .98s ease-out forwards; }
      .boss-hp-wrap { background: rgba(255,255,255,.76); border-radius: 16px; padding: 8px; border: 1px solid rgba(255,255,255,.86); box-shadow: inset 0 1px 0 rgba(255,255,255,.75), 0 8px 16px rgba(15,23,42,.1); }
      .boss-hp-label { display: flex; justify-content: space-between; font-weight: 900; font-size: .78rem; margin-bottom: 5px; }
      .boss-hp-bar { height: 16px; border-radius: 999px; background: linear-gradient(180deg, rgba(15,23,42,.28), rgba(15,23,42,.12)); overflow: hidden; border: 2px solid rgba(255,255,255,.88); box-shadow: inset 0 3px 7px rgba(15,23,42,.22); position: relative; }
      .boss-hp-bar::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, rgba(255,255,255,.34) 0 2px, transparent 2px 13px); mix-blend-mode: soft-light; pointer-events: none; }
      .boss-hp-fill { position: relative; height: 100%; border-radius: 999px; overflow: hidden; transition: width .35s ease; background: linear-gradient(90deg, #22c55e 0%, #84cc16 44%, #facc15 66%, #f97316 84%, #ef4444 100%); box-shadow: inset 0 2px 3px rgba(255,255,255,.45), inset 0 -4px 6px rgba(15,23,42,.2), 0 0 12px rgba(34,197,94,.28); }
      .boss-hp-fill::after { content: ""; position: absolute; top: 0; bottom: 0; left: -60%; width: 58%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.62), transparent); animation: hp-shine 1.7s ease-in-out infinite; }
      .boss-arena.boss-phase-angry .boss-hp-fill { box-shadow: inset 0 2px 3px rgba(255,255,255,.45), inset 0 -4px 6px rgba(15,23,42,.2), 0 0 15px rgba(249,115,22,.42); }
      .boss-arena.boss-phase-weak .boss-hp-fill { background: linear-gradient(90deg, #f97316, #ef4444, #991b1b); box-shadow: inset 0 2px 3px rgba(255,255,255,.35), inset 0 -4px 6px rgba(15,23,42,.26), 0 0 18px rgba(239,68,68,.62); animation: hp-danger-throb .82s ease-in-out infinite; }
      .player-panel { background: white; border-radius: 20px; padding: 10px 12px; box-shadow: 0 10px 22px rgba(15, 23, 42, .09); border: 1px solid rgba(226,232,240,.9); position: relative; overflow: hidden; }
      .player-panel.hit { animation: player-hit-shake .35s ease; background: #fff1f2; border-color: rgba(248,113,113,.55); box-shadow: 0 0 0 5px rgba(239,68,68,.08), 0 12px 24px rgba(127,29,29,.13); }
      .player-panel.hit::after { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 18% 50%, rgba(239,68,68,.18), transparent 42%); pointer-events: none; }
      .boss-compact-status { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 12px; }
      .heart-row { display: flex; justify-content: flex-start; gap: 5px; margin-bottom: 0; font-size: 1.25rem; line-height: 1; }
      .heart-lost { opacity: .25; filter: grayscale(1); transform: scale(.86); }
      .super-area { min-width: 0; }
      .super-meter { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; align-items: center; }
      .super-meter.ready { animation: super-meter-ready .82s ease-in-out infinite; }
      .super-cell { height: 10px; border-radius: 999px; background: #e2e8f0; border: 1px solid rgba(148,163,184,.6); transition: all .18s ease; box-shadow: inset 0 1px 0 rgba(255,255,255,.65); }
      .super-cell.filled { background: linear-gradient(90deg, #facc15, #f97316); border-color: #f59e0b; }
      .super-cell.ready { animation: super-pulse .7s ease-in-out infinite; background: linear-gradient(180deg, #f8fafc, #e2e8f0); border-color: #f59e0b; box-shadow: 0 0 18px rgba(251,191,36,.75), inset 0 1px 0 rgba(255,255,255,.7); }
      .super-meter-label { display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: .72rem; margin-bottom: 5px; }
      .boss-question-card { margin-top: 0; padding-top: 12px; padding-bottom: 12px; }
      .boss-question-card h2 { font-size: 2.1rem; line-height: 1; margin: 6px 0 2px; }
      .boss-feedback-area { min-height: 30px; }
      .boss-feedback-area .feedback { font-size: .9rem; margin: 4px 0 0; animation: feedback-pop-in .18s ease-out; }
      .boss-play-layout .answer-button.correct { animation: answer-correct-pop .34s ease-out; box-shadow: 0 0 0 5px rgba(34,197,94,.14), 0 14px 24px rgba(21,128,61,.16); }
      .boss-play-layout .answer-button.wrong { animation: answer-wrong-jolt .28s ease-out; }
      .treasure-wrap { display: flex; justify-content: center; align-items: center; margin: 4px auto 12px; animation: treasure-shine 1.7s ease-in-out infinite; }
      .treasure-wrap.small svg { width: 120px; height: 100px; }
      .treasure-wrap.medium svg { width: 160px; height: 130px; }
      .treasure-wrap.large svg { width: 210px; height: 165px; }
      .quit-round-button { margin-top: 10px; border: 2px solid rgba(239, 68, 68, .24); color: #991b1b; background: #fff7f7; }
      .quit-round-button:hover { background: #fee2e2; }
      .normal-result-motivation { margin: 2px auto 4px; text-align: center; font-size: clamp(1.16rem, 4vw, 1.45rem); font-weight: 1000; line-height: 1.2; color: #2563eb; text-shadow: 0 2px 10px rgba(37,99,235,.16); }
      .result-highscore-title { margin: 0 0 4px; text-align: center; font-size: 1.2rem; font-weight: 1000; color: #0f172a; }
      @media (max-width: 520px) { .play-compact-layout { gap: 8px; } .status-row.play-status-compact .status-pill { padding: 7px 9px; min-height: 38px; font-size: .82rem; border-radius: 14px; } .status-row.play-status-compact .status-pill svg { width: 16px; height: 16px; } .question-card.play-question-compact { padding: 13px 10px; border-radius: 21px; } .question-card.play-question-compact .label { font-size: .68rem; margin-bottom: 4px; } .question-card.play-question-compact h2 { font-size: clamp(1.85rem, 9vw, 2.65rem); } .answer-grid.play-answer-grid-compact { gap: 8px; } .answer-grid.play-answer-grid-compact .answer-button { min-height: 64px; padding: 10px; border-radius: 19px; font-size: clamp(1.8rem, 9vw, 2.85rem); } .feedback-area.play-feedback-compact { min-height: 24px; } .feedback-area.play-feedback-compact .feedback { font-size: .78rem; } .boss-play-layout { gap: 8px; } .boss-arena { padding: 10px; border-radius: 22px; } .boss-stage { min-height: 108px; padding-bottom: 7px; } .boss-stage::before { left: 5%; right: 5%; height: 42px; } .boss-stage::after { width: 166px; height: 78px; } .boss-figure-wrap { width: 128px; height: 76px; } .boss-svg { width: 128px; height: 88px; } .boss-shadow { width: 88px; height: 11px; margin-top: -7px; } .boss-hp-wrap { padding: 6px; } .boss-hp-bar { height: 11px; } .player-panel { padding: 8px 10px; border-radius: 18px; } .heart-row { font-size: 1.08rem; gap: 4px; } .super-meter-label { font-size: .67rem; margin-bottom: 4px; } .super-cell { height: 8px; } .boss-question-card { padding-top: 10px; padding-bottom: 10px; } .boss-question-card h2 { font-size: 1.9rem; } .boss-feedback-area { min-height: 26px; } .boss-feedback-area .feedback { font-size: .82rem; } }
    `}</style>
  );
}

function BossArenaScenery({ bossId }) {
  if (bossId === "troll") {
    return (
      <svg className="boss-scenery boss-scenery-troll" viewBox="0 0 680 230" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 0h680v230H0z" fill="rgba(28,25,23,.22)" />
        <path d="M0 98 52 57l49 24 62-52 58 34 72-43 73 39 54-24 74 48 50-20 136 54v113H0z" fill="rgba(41,37,36,.46)" />
        <path d="M0 126c54-22 103-23 157-12 54 12 98-3 151-18 75-20 119 8 171 22 60 17 112 1 201-23v135H0z" fill="rgba(120,53,15,.28)" />
        <path d="M0 170c83-13 151-9 226 3 84 14 134 5 209-9 90-17 153-8 245 13v53H0z" fill="rgba(68,64,60,.36)" />
        <path d="M134 168l30 16 42-12 24 18 45-10" fill="none" stroke="rgba(41,37,36,.48)" strokeWidth="5" strokeLinecap="round" />
        <path d="M432 164l34 20 33-11 36 23" fill="none" stroke="rgba(41,37,36,.42)" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="83" cy="164" rx="38" ry="18" fill="rgba(87,83,78,.5)" />
        <ellipse cx="590" cy="162" rx="48" ry="22" fill="rgba(68,64,60,.48)" />
        <circle cx="180" cy="72" r="3" fill="rgba(254,243,199,.42)" />
        <circle cx="525" cy="88" r="4" fill="rgba(254,243,199,.34)" />
      </svg>
    );
  }

  if (bossId === "shadow") {
    return (
      <svg className="boss-scenery boss-scenery-shadow" viewBox="0 0 680 230" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 0h680v230H0z" fill="rgba(2,6,23,.3)" />
        <path d="M58 64h52v116H58zM570 55h56v125h-56zM244 46h58v134h-58zM382 52h58v128h-58z" fill="rgba(15,23,42,.54)" />
        <path d="M0 118c83-31 151-33 214-7 58 24 99 12 152-9 67-27 148-18 314 25v103H0z" fill="rgba(15,23,42,.46)" />
        <path d="M221 180c34-61 199-61 236 0v50H221z" fill="rgba(2,6,23,.46)" />
        <path d="M0 174c110 8 184 4 282-10 101-15 178-9 398 16v50H0z" fill="rgba(2,6,23,.55)" />
        <path d="m148 164 35 14 18-21 24 39" fill="none" stroke="rgba(248,113,113,.52)" strokeWidth="5" strokeLinecap="round" />
        <path d="m484 158 24 35 31-22 18 27" fill="none" stroke="rgba(251,146,60,.48)" strokeWidth="5" strokeLinecap="round" />
        <polygon points="94,160 113,126 134,160" fill="rgba(248,113,113,.38)" />
        <polygon points="548,162 567,118 589,162" fill="rgba(251,146,60,.38)" />
        <circle cx="340" cy="80" r="36" fill="rgba(251,146,60,.18)" />
      </svg>
    );
  }

  return (
    <svg className="boss-scenery boss-scenery-slime" viewBox="0 0 680 230" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 0h680v230H0z" fill="rgba(220,252,231,.18)" />
      <path d="M0 113c70-33 124-28 184-7 62 22 111 8 163-12 68-27 135-24 333 30v106H0z" fill="rgba(34,197,94,.2)" />
      <path d="M0 154c74-20 132-16 207 0 72 16 122 5 184-9 79-18 165-9 289 23v62H0z" fill="rgba(21,128,61,.22)" />
      <path d="M0 184c107 15 184 8 263-7 71-14 135-12 211 2 73 13 125 11 206-6v57H0z" fill="rgba(20,83,45,.24)" />
      <ellipse cx="145" cy="166" rx="54" ry="18" fill="rgba(187,247,208,.42)" />
      <ellipse cx="526" cy="169" rx="62" ry="20" fill="rgba(45,212,191,.28)" />
      <path d="M65 162c10-25 9-43-3-61M96 160c-2-31 7-52 28-70M594 160c5-27 0-45-15-62M622 158c-4-30 5-47 27-62" fill="none" stroke="rgba(20,83,45,.46)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="118" cy="88" r="5" fill="rgba(220,252,231,.58)" />
      <circle cx="188" cy="64" r="3" fill="rgba(187,247,208,.56)" />
      <circle cx="486" cy="79" r="4" fill="rgba(220,252,231,.54)" />
      <circle cx="552" cy="102" r="6" fill="rgba(187,247,208,.5)" />
    </svg>
  );
}

function BossFigure({ bossId, hpPercent = 100, action = "idle", defeated = false }) {
  const mood = defeated ? "defeated" : getBossMood(hpPercent);
  if (bossId === "troll") return <TrollBossSvg hpPercent={hpPercent} action={action} mood={mood} defeated={defeated} />;
  if (bossId === "shadow" || bossId === "dragon") return <ShadowGolemSvg hpPercent={hpPercent} action={action} mood={mood} defeated={defeated} />;
  return <SlimeBossSvg hpPercent={hpPercent} action={action} mood={mood} defeated={defeated} />;
}

function SlimeBossSvg({ hpPercent, action = "idle", mood = "confident", defeated = false }) {
  const hurt = hpPercent <= 40;
  const veryHurt = hpPercent <= 20;
  const angry = mood === "angry";
  const weak = mood === "weak" || defeated;
  return (
    <svg className={`boss-svg boss-svg-slime boss-action-${action} boss-mood-${mood} ${defeated ? "boss-defeated" : ""}`} viewBox="0 0 260 205" role="img" aria-label="Slimbossen">
      <defs>
        <radialGradient id="slimeBody2" cx="38%" cy="22%" r="76%"><stop offset="0%" stopColor="#ecfccb" /><stop offset="35%" stopColor="#86efac" /><stop offset="72%" stopColor="#22c55e" /><stop offset="100%" stopColor="#15803d" /></radialGradient>
        <radialGradient id="slimeGlow2" cx="50%" cy="50%" r="58%"><stop offset="0%" stopColor="#bbf7d0" stopOpacity=".72" /><stop offset="100%" stopColor="#16a34a" stopOpacity="0" /></radialGradient>
        <radialGradient id="slimeBubble2" cx="35%" cy="25%" r="70%"><stop offset="0%" stopColor="#ffffff" stopOpacity=".9" /><stop offset="55%" stopColor="#bbf7d0" stopOpacity=".52" /><stop offset="100%" stopColor="#16a34a" stopOpacity=".28" /></radialGradient>
        <linearGradient id="slimeMouth2" x1="0" x2="1"><stop offset="0" stopColor="#052e16" /><stop offset="1" stopColor="#14532d" /></linearGradient>
      </defs>
      <ellipse cx="130" cy="178" rx="88" ry="14" fill="rgba(15,23,42,.2)" />
      <circle className="boss-aura" cx="130" cy="102" r="72" fill="url(#slimeGlow2)" />
      <circle className="boss-hit-flash" cx="130" cy="104" r="91" fill="#ecfccb" />
      <g className="boss-body-main">
        <path d="M40 128 C27 88 50 44 88 34 C101 13 145 13 158 34 C196 42 221 86 204 127 C198 156 174 169 130 171 C85 170 50 159 40 128Z" fill="url(#slimeBody2)" stroke="#14532d" strokeWidth="6" />
        <path d="M73 58 C97 39 146 36 170 55 C151 50 101 51 73 58Z" fill="rgba(255,255,255,.5)" />
        <path d="M61 103 C67 78 91 58 119 54 C99 70 91 92 92 116 C80 115 69 111 61 103Z" fill="rgba(255,255,255,.18)" />
        <path className="slime-drip" d="M64 131 C68 155 88 157 92 132" fill="#22c55e" stroke="#14532d" strokeWidth="4" />
        <path className="slime-drip" style={{ animationDelay: ".35s" }} d="M164 131 C168 160 190 158 193 131" fill="#16a34a" stroke="#14532d" strokeWidth="4" />
        <path className="slime-drip" style={{ animationDelay: ".7s" }} d="M116 158 C119 183 140 183 144 158" fill="#15803d" stroke="#14532d" strokeWidth="4" opacity=".85" />
        <circle className="slime-bubble" cx="73" cy="73" r="10" fill="url(#slimeBubble2)" stroke="#15803d" strokeWidth="3" />
        <circle className="slime-bubble" style={{ animationDelay: ".4s" }} cx="207" cy="86" r="8" fill="url(#slimeBubble2)" stroke="#15803d" strokeWidth="3" />
        <circle className="slime-bubble" style={{ animationDelay: ".9s" }} cx="197" cy="54" r="5" fill="#dcfce7" stroke="#15803d" strokeWidth="2" />
        <circle className="slime-bubble" style={{ animationDelay: "1.2s" }} cx="57" cy="104" r="5" fill="#bbf7d0" stroke="#15803d" strokeWidth="2" opacity=".8" />
        <g className="boss-eye">
          <circle cx="93" cy="96" r="20" fill="white" stroke="#14532d" strokeWidth="5" />
          <circle cx="165" cy="96" r="20" fill="white" stroke="#14532d" strokeWidth="5" />
          <circle cx={angry ? "101" : "98"} cy={weak ? "103" : "100"} r={hurt ? "6" : "9"} fill="#052e16" />
          <circle cx={angry ? "157" : "160"} cy={weak ? "103" : "100"} r={hurt ? "6" : "9"} fill="#052e16" />
          <circle cx="101" cy="96" r="3" fill="white" opacity=".9" />
          <circle cx="163" cy="96" r="3" fill="white" opacity=".9" />
        </g>
        {angry && <><path className="boss-brow" d="M76 78 L113 68" stroke="#052e16" strokeWidth="10" strokeLinecap="round" /><path className="boss-brow" d="M183 78 L146 68" stroke="#052e16" strokeWidth="10" strokeLinecap="round" /></>}
        {weak && <><path className="boss-brow" d="M77 82 L110 86" stroke="#052e16" strokeWidth="8" strokeLinecap="round" /><path className="boss-brow" d="M183 82 L150 86" stroke="#052e16" strokeWidth="8" strokeLinecap="round" /></>}
        {hurt ? <path d="M96 135 C111 121 148 121 164 135" fill="none" stroke="#052e16" strokeWidth={veryHurt ? "10" : "8"} strokeLinecap="round" /> : <path d="M95 127 C113 147 148 147 166 127" fill="none" stroke="url(#slimeMouth2)" strokeWidth="10" strokeLinecap="round" />}
        <path d="M64 144 C82 161 105 150 116 164 C126 176 147 176 158 164 C169 150 193 160 205 142" fill="none" stroke="rgba(255,255,255,.36)" strokeWidth="9" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function TrollBossSvg({ hpPercent, action = "idle", mood = "confident", defeated = false }) {
  const hurt = hpPercent <= 40;
  const veryHurt = hpPercent <= 20;
  const angry = mood === "angry";
  const weak = mood === "weak" || defeated;
  return (
    <svg className={`boss-svg boss-svg-troll boss-action-${action} boss-mood-${mood} ${defeated ? "boss-defeated" : ""}`} viewBox="0 0 260 205" role="img" aria-label="Trollkongen">
      <defs>
        <linearGradient id="trollStone2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#e7e5e4" /><stop offset="38%" stopColor="#a8a29e" /><stop offset="72%" stopColor="#57534e" /><stop offset="100%" stopColor="#292524" /></linearGradient>
        <linearGradient id="trollCrown2" x1="0" x2="1"><stop offset="0" stopColor="#fef3c7" /><stop offset="45%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#92400e" /></linearGradient>
        <radialGradient id="trollGlow2" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="#fde68a" stopOpacity=".35" /><stop offset="100%" stopColor="#92400e" stopOpacity="0" /></radialGradient>
        <radialGradient id="trollEyeGlow2" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fef3c7" /><stop offset=".55" stopColor="#f97316" /><stop offset="1" stopColor="#7c2d12" /></radialGradient>
      </defs>
      <ellipse cx="130" cy="180" rx="92" ry="14" fill="rgba(15,23,42,.24)" />
      <circle className="boss-aura" cx="130" cy="108" r="78" fill="url(#trollGlow2)" />
      <circle className="boss-hit-flash" cx="130" cy="113" r="94" fill="#fef3c7" />
      <g className="boss-body-main">
        <path d="M73 139 C78 109 101 96 130 96 C160 96 183 110 188 139 C181 171 157 188 130 188 C103 188 79 171 73 139Z" fill="url(#trollStone2)" stroke="#292524" strokeWidth="7" />
        <path d="M83 181 L108 181 L99 202 L72 202 Z" fill="#57534e" stroke="#292524" strokeWidth="6" />
        <path d="M152 181 L177 181 L188 202 L161 202 Z" fill="#57534e" stroke="#292524" strokeWidth="6" />
        <path className="boss-arm-left" d="M61 95 C36 90 28 126 48 141 C60 149 75 143 78 127 C81 110 75 98 61 95Z" fill="url(#trollStone2)" stroke="#292524" strokeWidth="6" />
        <path className="boss-arm-right" d="M199 95 C224 90 232 126 212 141 C200 149 185 143 182 127 C179 110 185 98 199 95Z" fill="url(#trollStone2)" stroke="#292524" strokeWidth="6" />
        <path className="troll-crown" d="M78 55 L91 24 L108 54 L130 20 L151 54 L170 24 L181 57 Z" fill="url(#trollCrown2)" stroke="#78350f" strokeWidth="5" />
        <circle cx="130" cy="39" r="6" fill="#fef08a" stroke="#78350f" strokeWidth="3" />
        <circle cx="91" cy="43" r="4" fill="#fef08a" stroke="#78350f" strokeWidth="2" />
        <circle cx="169" cy="43" r="4" fill="#fef08a" stroke="#78350f" strokeWidth="2" />
        <path className="boss-head" d="M55 84 C58 48 86 39 130 39 C176 39 202 51 206 86 C222 101 219 137 200 150 C193 173 170 182 130 182 C90 182 67 173 60 150 C41 137 38 101 55 84Z" fill="url(#trollStone2)" stroke="#292524" strokeWidth="7" />
        <path d="M74 60 C55 48 45 74 57 88" fill="#78716c" stroke="#292524" strokeWidth="5" />
        <path d="M186 60 C205 48 215 74 203 88" fill="#78716c" stroke="#292524" strokeWidth="5" />
        <path d="M89 61 L101 73 L116 61" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="5" strokeLinecap="round" />
        <path d="M144 61 L159 73 L174 61" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="5" strokeLinecap="round" />
        <path d="M76 117 L91 123 L83 137" fill="none" stroke="#292524" strokeWidth="5" strokeLinecap="round" opacity=".5" />
        <path d="M164 70 L154 88 L171 96" fill="none" stroke="#292524" strokeWidth="5" strokeLinecap="round" opacity=".45" />
        {weak && <path d="M118 54 L111 75 L124 92 L115 111" fill="none" stroke="#451a03" strokeWidth="5" strokeLinecap="round" opacity=".7" />}
        <path className="boss-brow" d={weak ? "M83 89 L113 85" : "M83 87 L113 77"} stroke="#292524" strokeWidth={angry ? "12" : "9"} strokeLinecap="round" />
        <path className="boss-brow" d={weak ? "M177 89 L147 85" : "M177 87 L147 77"} stroke="#292524" strokeWidth={angry ? "12" : "9"} strokeLinecap="round" />
        <g className="boss-eye">
          <circle cx="101" cy="105" r="15" fill={angry ? "url(#trollEyeGlow2)" : "white"} stroke="#292524" strokeWidth="5" />
          <circle cx="159" cy="105" r="15" fill={angry ? "url(#trollEyeGlow2)" : "white"} stroke="#292524" strokeWidth="5" />
          <circle cx={angry ? "106" : "105"} cy={weak ? "110" : "108"} r={hurt ? "5" : "8"} fill="#111827" />
          <circle cx={angry ? "154" : "155"} cy={weak ? "110" : "108"} r={hurt ? "5" : "8"} fill="#111827" />
        </g>
        <path d="M123 106 C107 132 109 150 130 148 C151 150 153 132 137 106" fill="#a8a29e" stroke="#292524" strokeWidth="5" />
        {hurt ? <path d="M99 158 C115 144 145 144 162 158" fill="none" stroke="#292524" strokeWidth={veryHurt ? "10" : "8"} strokeLinecap="round" /> : <path d="M98 150 C116 166 145 166 163 150" fill="none" stroke="#292524" strokeWidth="8" strokeLinecap="round" />}
        <path d="M72 137 L88 143" stroke="#57534e" strokeWidth="5" strokeLinecap="round" />
        <path d="M188 137 L172 143" stroke="#57534e" strokeWidth="5" strokeLinecap="round" />
        <path d="M86 62 L100 72 L116 61" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="5" strokeLinecap="round" />
        <path d="M145 62 L160 72 L174 61" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function ShadowGolemSvg({ hpPercent, action = "idle", mood = "confident", defeated = false }) {
  const hurt = hpPercent <= 40;
  const veryHurt = hpPercent <= 20;
  const angry = mood === "angry";
  const weak = mood === "weak" || defeated;
  return (
    <svg className={`boss-svg boss-svg-shadow boss-action-${action} boss-mood-${mood} ${defeated ? "boss-defeated" : ""}`} viewBox="0 0 280 210" role="img" aria-label="Skyggegolemen">
      <defs>
        <linearGradient id="golemStone2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#94a3b8" /><stop offset="40%" stopColor="#334155" /><stop offset="72%" stopColor="#0f172a" /><stop offset="100%" stopColor="#020617" /></linearGradient>
        <linearGradient id="golemCore2" x1="0" x2="1"><stop offset="0" stopColor="#fef3c7" /><stop offset="45%" stopColor="#f97316" /><stop offset="100%" stopColor="#dc2626" /></linearGradient>
        <radialGradient id="golemAura2" cx="50%" cy="50%" r="65%"><stop offset="0%" stopColor="#f97316" stopOpacity=".34" /><stop offset="55%" stopColor="#7f1d1d" stopOpacity=".22" /><stop offset="100%" stopColor="#020617" stopOpacity="0" /></radialGradient>
        <radialGradient id="golemEye2" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fef2f2" /><stop offset="45%" stopColor="#ef4444" /><stop offset="100%" stopColor="#7f1d1d" /></radialGradient>
        <radialGradient id="golemDarkMist2" cx="50%" cy="50%" r="70%"><stop offset="0%" stopColor="#7f1d1d" stopOpacity=".45" /><stop offset="55%" stopColor="#111827" stopOpacity=".35" /><stop offset="100%" stopColor="#020617" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="140" cy="188" rx="98" ry="14" fill="rgba(2,6,23,.32)" />
      <ellipse className="shadow-mist-back" cx="140" cy="126" rx="116" ry="76" fill="url(#golemDarkMist2)" />
      <circle className="boss-aura" cx="140" cy="112" r="86" fill="url(#golemAura2)" />
      <circle className="boss-hit-flash" cx="140" cy="115" r="102" fill="#fed7aa" />
      <path className="shadow-wisp" d="M58 84 C33 88 26 118 42 136 C31 136 22 128 20 115 C18 96 34 79 58 84Z" fill="#020617" opacity=".45" />
      <path className="shadow-wisp" style={{ animationDelay: ".55s" }} d="M224 82 C252 84 262 113 247 136 C260 134 267 124 267 112 C266 93 250 79 224 82Z" fill="#020617" opacity=".42" />
      <g className="boss-body-main">
        <path className="boss-arm-left" d="M62 108 C40 109 29 128 32 148 C34 168 50 178 69 172 C82 168 86 154 81 136 C77 119 73 109 62 108Z" fill="url(#golemStone2)" stroke="#020617" strokeWidth="7" />
        <path className="boss-arm-right" d="M218 108 C240 109 251 128 248 148 C246 168 230 178 211 172 C198 168 194 154 199 136 C203 119 207 109 218 108Z" fill="url(#golemStone2)" stroke="#020617" strokeWidth="7" />
        <path d="M58 171 L43 192" stroke="#020617" strokeWidth="9" strokeLinecap="round" />
        <path d="M222 171 L237 192" stroke="#020617" strokeWidth="9" strokeLinecap="round" />
        <path className="boss-head" d="M88 89 C87 53 108 33 140 33 C174 33 195 53 193 89 C208 99 215 118 213 141 C210 169 186 184 140 184 C95 184 70 169 67 141 C65 118 73 99 88 89Z" fill="url(#golemStone2)" stroke="#020617" strokeWidth="8" />
        <path d="M92 91 L72 56 L111 74" fill="#334155" stroke="#020617" strokeWidth="6" />
        <path d="M188 91 L208 56 L169 74" fill="#334155" stroke="#020617" strokeWidth="6" />
        <path d="M126 49 L140 17 L154 49" fill="#475569" stroke="#020617" strokeWidth="6" />
        <path d="M107 62 L105 39 L124 56" fill="#475569" stroke="#020617" strokeWidth="5" />
        <path d="M173 56 L194 39 L190 63" fill="#475569" stroke="#020617" strokeWidth="5" />
        <path d="M105 78 L118 91 L109 106" fill="none" stroke="#475569" strokeWidth="5" strokeLinecap="round" opacity=".75" />
        <path d="M175 77 L163 94 L177 109" fill="none" stroke="#475569" strokeWidth="5" strokeLinecap="round" opacity=".65" />
        {weak && <><path d="M132 57 L123 82 L135 101" fill="none" stroke="#f97316" strokeWidth="5" strokeLinecap="round" opacity=".74" /><path d="M151 142 L169 154 L160 176" fill="none" stroke="#f97316" strokeWidth="5" strokeLinecap="round" opacity=".66" /></>}
        <path className="boss-brow" d={weak ? "M103 103 L128 99" : "M103 101 L127 91"} stroke="#020617" strokeWidth={angry ? "12" : "9"} strokeLinecap="round" />
        <path className="boss-brow" d={weak ? "M177 103 L152 99" : "M177 101 L153 91"} stroke="#020617" strokeWidth={angry ? "12" : "9"} strokeLinecap="round" />
        <g className="boss-eye">
          <circle cx="118" cy="116" r={angry ? "17" : "15"} fill="url(#golemEye2)" stroke="#020617" strokeWidth="5" />
          <circle cx="162" cy="116" r={angry ? "17" : "15"} fill="url(#golemEye2)" stroke="#020617" strokeWidth="5" />
          {angry && <><path d="M101 116 H89" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" opacity=".75" /><path d="M179 116 H191" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" opacity=".75" /></>}
          <circle cx="122" cy="113" r="4" fill="#f8fafc" />
          <circle cx="166" cy="113" r="4" fill="#f8fafc" />
        </g>
        <path d="M128 131 L140 145 L153 131 Z" fill="#0f172a" stroke="#020617" strokeWidth="5" />
        {hurt ? <path d="M110 161 C125 148 155 148 172 161" fill="none" stroke="#020617" strokeWidth={veryHurt ? "10" : "8"} strokeLinecap="round" /> : <path d="M109 154 C126 170 155 170 172 154" fill="none" stroke="#020617" strokeWidth="8" strokeLinecap="round" />}
        <circle className="golem-core" cx="140" cy="160" r={weak ? "19" : "14"} fill="url(#golemCore2)" stroke="#020617" strokeWidth="5" />
        <circle className="golem-core" cx="140" cy="160" r={weak ? "27" : "21"} fill="none" stroke="#f97316" strokeWidth="4" opacity={weak ? ".45" : ".22"} />
        <path d="M122 168 L113 198" stroke="#020617" strokeWidth="10" strokeLinecap="round" />
        <path d="M158 168 L168 198" stroke="#020617" strokeWidth="10" strokeLinecap="round" />
        <path d="M110 198 L91 201" stroke="#020617" strokeWidth="7" strokeLinecap="round" />
        <path d="M171 198 L190 201" stroke="#020617" strokeWidth="7" strokeLinecap="round" />
        <path d="M91 132 L72 140" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
        <path d="M189 132 L208 140" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
      </g>
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

function ResultHighscoreList({ scores, mode, gameType, gradeLevel, level, questionCount, gradeGroup }) {
  const isTimed = isTimeChallengeMode(mode);
  const visibleScores = gameType === "school_battle"
    ? dedupeSchoolBattleScores(scores, mode)
    : dedupeNormalScores(scores, mode);
  const title = gameType === "school_battle"
    ? `Skolekampen - ${getModeLabel(mode)}${isTimed ? ` - ${getGradeGroupLabel(gradeGroup)}` : ""}`
    : getHighscoreTitle(mode, level, gradeLevel, questionCount);

  return (
    <div className="card highscore-card">
      <h2 className="result-highscore-title">Highscore</h2>
      <p className="small-note">{title}</p>
      {visibleScores.length === 0 ? (
        <div className="empty-state"><p>Ingen resultater på denne listen ennå.</p></div>
      ) : (
        <div className="score-list">
          {visibleScores.map((entry, index) => (
            <div key={`${entry.name}-${entry.school || ""}-${entry.score}-${index}`} className="score-row">
              <div className="score-name">
                <span className={index === 0 ? "rank rank-first" : "rank"}>{index + 1}</span>
                <strong>{entry.name}</strong>
                {gameType === "school_battle" && entry.school && <small>{entry.school}</small>}
              </div>
              <span className="score-value">{isTimed ? formatTime(entry.score) : entry.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
  const [gameMode, setGameMode] = useState("addition");
  const [gameLevel, setGameLevel] = useState("medium");
  const [gameQuestionCount, setGameQuestionCount] = useState(10);
  const [highscoreGradeLevel, setHighscoreGradeLevel] = useState(4);
  const [highscoreMode, setHighscoreMode] = useState("addition");
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
  const [question, setQuestion] = useState(() => makeQuestion("addition", "medium"));
  const [feedback, setFeedback] = useState(null);
  let [scores, setScores] = useState([]);
  const [resultScores, setResultScores] = useState([]);
  const [adminLoginPin, setAdminLoginPin] = useState("");
  const [adminAccessPin, setAdminAccessPin] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminNormalGradeLevel, setAdminNormalGradeLevel] = useState(4);
  const [adminNormalMode, setAdminNormalMode] = useState("addition");
  const [adminNormalLevel, setAdminNormalLevel] = useState("medium");
  const [adminNormalQuestionCount, setAdminNormalQuestionCount] = useState(10);
  const [adminNormalScores, setAdminNormalScores] = useState([]);
  const [adminNormalSearch, setAdminNormalSearch] = useState("");
  const [adminNormalGradeFilter, setAdminNormalGradeFilter] = useState(ALL_FILTER_VALUE);
  const [adminNormalModeFilter, setAdminNormalModeFilter] = useState(ALL_FILTER_VALUE);
  const [adminNormalLevelFilter, setAdminNormalLevelFilter] = useState(ALL_FILTER_VALUE);
  const [adminNormalQuestionCountFilter, setAdminNormalQuestionCountFilter] = useState(ALL_FILTER_VALUE);
  const [scoreMessage, setScoreMessage] = useState("");
  const [normalResultMotivationMessage, setNormalResultMotivationMessage] = useState("");

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
  const gameAreaRef = useRef(null);

  const trimmedName = playerName.trim();
  const stars = useMemo(() => getStars(score), [score]);
  const isCurrentTimeChallenge = isTimeChallengeMode(gameMode);
  const activeQuestionCount = gameType === "school_battle" && isTimeChallengeMode(gameMode) ? SCHOOL_BATTLE_TIME_QUESTION_COUNT : gameQuestionCount;
  const adminNormalGroups = useMemo(
    () =>
      buildNormalAdminGroups(adminNormalScores, {
        search: adminNormalSearch,
        grade: adminNormalGradeFilter,
        mode: adminNormalModeFilter,
        level: adminNormalLevelFilter,
        questionCount: adminNormalQuestionCountFilter,
      }),
    [adminNormalScores, adminNormalSearch, adminNormalGradeFilter, adminNormalModeFilter, adminNormalLevelFilter, adminNormalQuestionCountFilter]
  );
  const adminNormalStats = useMemo(() => getNormalAdminStats(adminNormalScores), [adminNormalScores]);

  useEffect(() => {
    retryPendingAndNotify("app-start");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleOnline = () => retryPendingAndNotify("online");
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  useEffect(() => {
    if (screen === "play" || screen === "bossPlay") scrollToGameTop(gameAreaRef.current);
  }, [screen]);

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

  async function refreshScores(mode = highscoreMode, level = highscoreLevel, gradeLevel = highscoreGradeLevel, questionCount = highscoreQuestionCount, resultLimit = NORMAL_HIGHSCORE_VISIBLE_LIMIT) {
    try { const loaded = await loadScores(mode, level, gradeLevel, questionCount, resultLimit); setScores(loaded); setScoreMessage(""); return loaded; } catch (error) { logHighscoreError("henting", { type: "normal_score", game_type: "normal", mode, level, grade_level: gradeLevel, question_count: questionCount }, error); setScoreMessage(HIGHSCORE_LOAD_FAILED_MESSAGE); return []; }
  }

  async function refreshSchoolBattleScores(mode = highscoreMode, gradeGroup = highscoreGradeGroup, resultLimit = 20) {
    try { const loaded = await loadSchoolBattleScores(mode, gradeGroup, resultLimit); setScores(loaded); setScoreMessage(""); return loaded; } catch (error) { logHighscoreError("henting", { type: "school_battle_score", game_type: "school_battle", mode, grade_group: gradeGroup }, error); setScoreMessage(HIGHSCORE_LOAD_FAILED_MESSAGE); return []; }
  }

  async function retryPendingAndNotify(source = "manual") {
    const result = await retryPendingHighscores({ source });
    if (result.savedCount > 0) {
      setScoreMessage((current) => current ? `${current} ${PENDING_HIGHSCORE_SAVED_MESSAGE}` : PENDING_HIGHSCORE_SAVED_MESSAGE);
    }
    return result;
  }

  async function saveRoundHighscore({ type, entry, baseMessage, loadScoresForResult, loadContext, applyHighscoreContext }) {
    applyHighscoreContext();
    const messages = [baseMessage];
    const pending = queuePendingHighscore(type, entry);
    setScoreMessage(`${baseMessage} Lagrer resultat...`);
    let saveConfirmed = false;
    try {
      const saveResult = await savePendingHighscoreWithRetry(pending, { source: "round-finished", stage: "lagring" });
      saveConfirmed = true;
      messages.push(saveResult?.message || HIGHSCORE_SAVE_CONFIRMED_MESSAGE);
    } catch (error) {
      logHighscoreError("lagring-ga-opp", { ...pending, type, game_type: getHighscoreGameType(type) }, error);
      messages.push(HIGHSCORE_SAVE_PENDING_MESSAGE);
    }
    try {
      const loaded = await loadScoresForResult();
      setScores(loaded);
      setResultScores(loaded);
    } catch (error) {
      logHighscoreError("henting", loadContext, error);
      setResultScores([]);
      messages.push(HIGHSCORE_LOAD_FAILED_MESSAGE);
    }
    if (saveConfirmed && messages.length === 1) messages.push(HIGHSCORE_SAVE_CONFIRMED_MESSAGE);
    setScoreMessage(messages.filter(Boolean).join(" "));
  }

  function openHighscore(mode = gameMode, level = gameLevel, gradeLevel = gameGradeLevel, questionCount = gameQuestionCount) {
    setHighscoreMode(mode); setHighscoreLevel(level); setHighscoreGradeLevel(gradeLevel); setHighscoreQuestionCount(questionCount); setScreen("highscoreHome");
  }

  function openSchoolBattleHighscore(mode = gameMode, gradeGroup = schoolBattleGradeGroup) {
    setHighscoreMode(mode); if (isTimeChallengeMode(mode)) setHighscoreGradeGroup(gradeGroup || "small"); refreshSchoolBattleScores(mode, gradeGroup || highscoreGradeGroup, SCHOOL_BATTLE_VISIBLE_FETCH_LIMIT); setScreen("schoolHighscore");
  }

  function openHighscoreFromHome() { setScreen("highscoreHome"); }

  function openNormalHighscoreFromHome() {
    setGameType("normal"); setHighscoreMode("addition"); setHighscoreLevel("medium"); setHighscoreQuestionCount(10); setScreen("highscoreHome");
  }

  function openSchoolHighscoreFromHome() {
    setGameType("school_battle"); setHighscoreMode("addition"); setHighscoreGradeGroup("small"); refreshSchoolBattleScores("addition", "small", SCHOOL_BATTLE_VISIBLE_FETCH_LIMIT); setScreen("schoolHighscore");
  }

  function changeHighscoreMode(mode) { setHighscoreMode(mode); }
  function changeHighscoreLevel(level) { setHighscoreLevel(level); }
  function changeHighscoreQuestionCount(questionCount) { setHighscoreQuestionCount(questionCount); }
  function changeSchoolBattleHighscoreMode(mode) { setHighscoreMode(mode); refreshSchoolBattleScores(mode, highscoreGradeGroup, screen === "adminSchool" ? 20 : SCHOOL_BATTLE_VISIBLE_FETCH_LIMIT); }
  function changeSchoolBattleGradeGroup(gradeGroup) { setHighscoreGradeGroup(gradeGroup); refreshSchoolBattleScores(highscoreMode, gradeGroup, screen === "adminSchool" ? 20 : SCHOOL_BATTLE_VISIBLE_FETCH_LIMIT); }

  function getNextQuestion(mode = gameMode, level = gameLevel, gradeGroup = gameType === "school_battle" ? schoolBattleGradeGroup : null) {
    if (questionDeck.current.length === 0) questionDeck.current = createQuestionDeck(mode, level, gradeGroup);
    return questionDeck.current.pop();
  }

  function startGame() {
    if (gameType === "school_battle") {
      const validationMessage = validatePlayerName(trimmedName);
      if (validationMessage) { setNameError(validationMessage); return; }
    }
    setNameError(""); setScoreMessage(""); setNormalResultMotivationMessage(""); setResultScores([]); savedThisRound.current = false; questionDeck.current = createQuestionDeck(gameMode, gameLevel, gameType === "school_battle" ? schoolBattleGradeGroup : null);
    setScore(0); setTimeLeft(getGameSeconds(gameType)); setElapsedSeconds(0); setQuestionsDone(0); setWrongAnswers(0); setResultTimeSeconds(0); setResultCorrectAnswers(0); setResultWrongAnswers(0); setQuestion(getNextQuestion(gameMode, gameLevel, gameType === "school_battle" ? schoolBattleGradeGroup : null)); setFeedback(null); setScreen("play"); scrollToTopNow();
  }

  function quitRound() {
    savedThisRound.current = true; setFeedback(null); setScore(0); setTimeLeft(getGameSeconds(gameType)); setElapsedSeconds(0); setQuestionsDone(0); setWrongAnswers(0); setResultScores([]);
    if (gameType === "school_battle") setScreen("schoolMode"); else setScreen("mode");
  }

  function quitBossBattle() { setFeedback(null); setDamagePopup(null); setBossHit(false); setPlayerHit(false); setScreen("bossSelect"); }

  async function finishGame(resultOverride = {}) {
    const finalScore = Number.isFinite(resultOverride.score) ? resultOverride.score : score;
    const finalWrongAnswers = Number.isFinite(resultOverride.wrongAnswers) ? resultOverride.wrongAnswers : wrongAnswers;
    const finalTime = Number.isFinite(resultOverride.timeSeconds) ? resultOverride.timeSeconds : elapsedSeconds + finalWrongAnswers * TIME_PENALTY_SECONDS;
    setScreen("result"); setFeedback(null);
    if (gameType === "school_battle") retryPendingAndNotify("round-finished");
    if (isCurrentTimeChallenge) { setResultTimeSeconds(finalTime); setResultCorrectAnswers(finalScore); setResultWrongAnswers(finalWrongAnswers); }
    if (gameType === "normal") {
      if (!savedThisRound.current) {
        savedThisRound.current = true;
        setScores([]);
        setResultScores([]);
        setScoreMessage("");
        setNormalResultMotivationMessage(getRandomNormalResultMotivationMessage());
      }
      return;
    }
    if (!savedThisRound.current && trimmedName) {
      savedThisRound.current = true;
      const playerResultName = trimmedName.slice(0, 18);
      if (gameType === "school_battle" && isCurrentTimeChallenge) {
        const entry = { name: playerResultName, score: finalTime, mode: gameMode, school: schoolBattleSchool, grade_group: schoolBattleGradeGroup, question_count: SCHOOL_BATTLE_TIME_QUESTION_COUNT };
        await saveRoundHighscore({
          type: "school_battle_time",
          entry,
          baseMessage: `Du brukte ${formatTime(finalTime)}.`,
          loadScoresForResult: () => loadSchoolBattleScores(gameMode, schoolBattleGradeGroup, SCHOOL_BATTLE_VISIBLE_FETCH_LIMIT),
          loadContext: { ...entry, type: "school_battle_time", game_type: "school_battle" },
          applyHighscoreContext: () => { setHighscoreMode(gameMode); setHighscoreGradeGroup(schoolBattleGradeGroup); },
        });
        return;
      }
      if (gameType === "school_battle") {
        const entry = { name: playerResultName, score: finalScore, mode: gameMode, school: schoolBattleSchool };
        await saveRoundHighscore({
          type: "school_battle_score",
          entry,
          baseMessage: `Du fikk ${finalScore} poeng.`,
          loadScoresForResult: () => loadSchoolBattleScores(gameMode, "small", SCHOOL_BATTLE_VISIBLE_FETCH_LIMIT),
          loadContext: { ...entry, type: "school_battle_score", game_type: "school_battle" },
          applyHighscoreContext: () => { setHighscoreMode(gameMode); },
        });
        return;
      }
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
      setTimeout(() => { setQuestion(getNextQuestion(gameMode, gameLevel)); setFeedback(null); }, 180); return;
    }
    if (isCorrect) { setScore((current) => current + 1); setFeedback("correct"); } else { setScore((current) => Math.max(0, current - 1)); setFeedback("wrong"); }
    setTimeout(() => { setQuestion(getNextQuestion(gameMode, gameLevel)); setFeedback(null); }, 180);
  }

  function startBossBattle() {
    const boss = getBossConfig(bossId);
    setGameType("boss_battle"); questionDeck.current = createQuestionDeck(gameMode, gameLevel); setQuestion(getNextQuestion(gameMode, gameLevel, null)); setBossLives(boss.lives); setBossMaxLives(boss.lives); setPlayerHearts(boss.hearts); setPlayerMaxHearts(boss.hearts); setCurrentStreak(0); setBestStreak(0); setBossCorrectAnswers(0); setBossWrongAnswers(0); setBossOutcome(null); setBossMessage(`${boss.name} er klar. Svar riktig for å angripe!`); setDamagePopup(null); setBossHit(false); setPlayerHit(false); setFeedback(null); setScreen("bossPlay"); scrollToTopNow();
  }

  function answerBoss(value) {
    if (feedback) return;
    const boss = getBossConfig(bossId); const isCorrect = value === question.correct;
    if (isCorrect) {
      const streakBeforeReset = currentStreak + 1; const damage = getBossDamage(streakBeforeReset); const nextStreak = streakBeforeReset >= 5 ? 0 : streakBeforeReset; const nextBossLives = Math.max(0, bossLives - damage); const nextCorrect = bossCorrectAnswers + 1; const nextBestStreak = Math.max(bestStreak, streakBeforeReset);
      setBossLives(nextBossLives); setCurrentStreak(nextStreak); setBestStreak(nextBestStreak); setBossCorrectAnswers(nextCorrect); setFeedback("correct"); setBossHit(true); setDamagePopup({ text: damage > 1 ? "-2 SUPER!" : "-1", super: damage > 1 }); setBossMessage(damage > 1 ? `Superangrep! ${boss.name} mistet 2 liv.` : `Riktig! ${boss.name} mistet 1 liv.`); setTimeout(() => setBossHit(false), 420); setTimeout(() => setDamagePopup(null), 780);
      if (nextBossLives <= 0) { setBossOutcome("won"); setTimeout(() => { setFeedback(null); setScreen("bossResult"); }, 650); return; }
      setTimeout(() => { setQuestion(getNextQuestion(gameMode, gameLevel)); setFeedback(null); }, 520); return;
    }
    const nextHearts = Math.max(0, playerHearts - 1); const nextWrong = bossWrongAnswers + 1;
    setPlayerHearts(nextHearts); setCurrentStreak(0); setBossWrongAnswers(nextWrong); setFeedback("wrong"); setPlayerHit(true); setBossMessage(`Feil! ${boss.name} bruker ${getBossAttackName(boss.id)} Du mister 1 hjerte.`); setTimeout(() => setPlayerHit(false), 420);
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

  async function refreshAllNormalAdminScores() {
    try {
      const loaded = await loadAllNormalAdminScores();
      setAdminNormalScores(loaded);
      setAdminMessage("");
      return loaded;
    } catch (error) {
      setAdminMessage(error.message);
      return [];
    }
  }

  function changeAdminNormalGradeLevel(gradeLevel) { setAdminNormalGradeLevel(gradeLevel); refreshNormalAdminScores(adminNormalMode, adminNormalLevel, gradeLevel, adminNormalQuestionCount); }
  function changeAdminNormalMode(mode) { setAdminNormalMode(mode); refreshNormalAdminScores(mode, adminNormalLevel, adminNormalGradeLevel, adminNormalQuestionCount); }
  function changeAdminNormalLevel(level) { setAdminNormalLevel(level); refreshNormalAdminScores(adminNormalMode, level, adminNormalGradeLevel, adminNormalQuestionCount); }
  function changeAdminNormalQuestionCount(questionCount) { setAdminNormalQuestionCount(questionCount); refreshNormalAdminScores(adminNormalMode, adminNormalLevel, adminNormalGradeLevel, questionCount); }

  async function deleteNormalScore(scoreId) {
    setAdminMessage("");
    try {
      if (supabase) {
        const { error } = await supabase.rpc("delete_normal_score", { admin_pin: adminAccessPin, score_id: scoreId });
        if (error) throw new Error(error.message || "Kunne ikke slette resultatet.");
      } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        const current = raw ? JSON.parse(raw) : [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current.filter((entry) => entry.id !== scoreId)));
      }
      await refreshAllNormalAdminScores();
      setAdminMessage("Resultatet er slettet.");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function deleteSchoolBattleScore(scoreId) {
    setAdminMessage("");
    try { if (supabase) { const { error } = await supabase.rpc("delete_school_battle_score", { delete_pin: adminAccessPin, score_id: scoreId }); if (error) throw new Error(error.message || "Kunne ikke slette resultatet."); } else { const raw = localStorage.getItem(STORAGE_KEY); const current = raw ? JSON.parse(raw) : []; localStorage.setItem(STORAGE_KEY, JSON.stringify(current.filter((entry) => entry.id !== scoreId))); } await refreshSchoolBattleScores(highscoreMode, highscoreGradeGroup); setAdminMessage("Resultatet er slettet."); } catch (error) { setAdminMessage(error.message); }
  }

  async function resetNormalFromAdmin() {
    setAdminMessage("");
    try {
      await clearNormalScoreList(adminAccessPin, adminNormalMode, adminNormalLevel, adminNormalGradeLevel, adminNormalQuestionCount);
      setScores([]);
      await refreshAllNormalAdminScores();
      setAdminMessage(`Tømte ${getGradeLabel(adminNormalGradeLevel)} - ${getModeLabel(adminNormalMode).toLowerCase()} - ${getLevelLabel(adminNormalLevel).toLowerCase()}${isTimeChallengeMode(adminNormalMode) ? ` - ${adminNormalQuestionCount} oppgaver` : ""}.`);
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function resetNormalAdminGroup(group) {
    setAdminMessage("");
    try {
      await clearNormalScoreList(adminAccessPin, group.mode, group.level, group.gradeLevel, group.questionCount);
      await refreshAllNormalAdminScores();
      setAdminMessage(`Tømte ${getNormalAdminGroupTitle(group)}.`);
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  function clearNormalAdminFilters() {
    setAdminNormalSearch("");
    setAdminNormalGradeFilter(ALL_FILTER_VALUE);
    setAdminNormalModeFilter(ALL_FILTER_VALUE);
    setAdminNormalLevelFilter(ALL_FILTER_VALUE);
    setAdminNormalQuestionCountFilter(ALL_FILTER_VALUE);
  }

  if (screen === "home") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Zap /></div><h1>Regnemester</h1><p>Velg spilltype.</p></div><div className="card input-card"><Button onClick={() => { setGameType("normal"); setScreen("mode"); }} className="full">Normal</Button><Button variant="secondary" onClick={() => { setGameType("school_battle"); setGameLevel("medium"); setScreen("school"); }} className="full top-space">Skolekampen</Button><Button variant="secondary" onClick={() => { setGameType("boss_battle"); setGameLevel("medium"); setScreen("bossMode"); }} className="full top-space">Boss Battle</Button></div><Button variant="secondary" onClick={openHighscoreFromHome} className="full top-space">Highscore</Button><Button variant="light" onClick={() => setScreen("qr")} className="full top-space">Vis QR-kode</Button><Button variant="light" onClick={() => setScreen("adminLogin")} className="full top-space">Admin</Button></Shell>;
  }

  if (screen === "highscoreHome") {
    return <Shell><div className="hero"><div className="icon-box icon-yellow"><Crown /></div><h1>Highscore</h1></div><div className="card input-card"><Button variant="secondary" onClick={openSchoolHighscoreFromHome} className="full">Skolekampen</Button></div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "highscoreGrade") {
    return <Shell><div className="hero"><div className="icon-box icon-yellow"><Crown /></div><h1>Highscore</h1></div><div className="card input-card"><Button variant="secondary" onClick={openSchoolHighscoreFromHome} className="full">Skolekampen</Button></div><Button variant="light" onClick={() => setScreen("highscoreHome")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "bossMode") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Star /></div><h1>Boss Battle</h1><p>Velg regneart.</p></div><div className="card input-card"><ModeButtons selectedMode={gameMode} includeMixed onSelect={(mode) => { setGameMode(mode); setScreen("bossSelect"); }} /></div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "bossSelect") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Star /></div><h1>Velg boss</h1><p>{getModeLabel(gameMode)}</p><p className="small-note">Velg boss og vanskelighetsgrad på oppgavene.</p></div><div className="card input-card">{BOSS_OPTIONS.map((boss) => <Button key={boss.id} variant={bossId === boss.id ? "primary" : "light"} onClick={() => setBossId(boss.id)} className="full top-space">{boss.name} · {boss.lives} liv · {boss.hearts} hjerter</Button>)}</div><div className="card input-card"><label>Velg vanskelighetsgrad</label><Button variant={gameLevel === "easy" ? "primary" : "light"} onClick={() => setGameLevel("easy")} className="full">Lett</Button><Button variant={gameLevel === "medium" ? "primary" : "light"} onClick={() => setGameLevel("medium")} className="full top-space">Middels</Button><Button variant={gameLevel === "hard" ? "primary" : "light"} onClick={() => setGameLevel("hard")} className="full top-space">Vanskelig</Button></div><div className="card input-card"><Button onClick={startBossBattle} className="full">Start bosskamp</Button><p className="small-note">Hvert 5. riktige svar på rad gir superangrep og 2 skade.</p></div><Button variant="light" onClick={() => setScreen("bossMode")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "bossPlay") {
    const boss = getBossConfig(bossId); const hpPercent = bossMaxLives > 0 ? Math.max(0, Math.min(100, (bossLives / bossMaxLives) * 100)) : 0; const visualPhase = getBossMood(hpPercent); const isSuperReady = currentStreak === 4; const isSuperImpact = Boolean(damagePopup?.super); const bossAction = bossHit ? "hit" : playerHit ? "attack" : "idle";
    return <Shell><div ref={gameAreaRef} className={`boss-play-layout ${playerHit ? "player-under-attack" : ""} ${isSuperImpact ? "super-impact" : ""}`}><div className={`boss-arena boss-theme-${boss.id} boss-phase-${visualPhase} ${isSuperReady ? "super-ready" : ""} ${isSuperImpact ? "super-impact" : ""} ${playerHit ? "boss-attacking" : ""}`} style={{ background: boss.gradient }}><BossArenaScenery bossId={boss.id} /><div className={`arena-atmosphere atmosphere-${boss.id}`} aria-hidden="true"><span /><span /><span /></div><div className={`boss-intro-banner intro-${boss.id}`} aria-hidden="true"><span>KAMP STARTER!</span><strong>{boss.name}</strong><em>{getBossIntroText(boss.id)}</em></div>{playerHit && <div className={`boss-retaliation boss-retaliation-${boss.id}`} aria-hidden="true" />}<div className="boss-arena-inner"><div className="boss-topline"><div><div className="boss-arena-name">{boss.arena}</div><div className="boss-name-title">{boss.name}</div></div><div className="boss-badge">{boss.shortIcon}</div></div><div className={`boss-stage boss-stage-${boss.id} boss-stage-${visualPhase} ${isSuperReady ? "super-ready" : ""} ${isSuperImpact ? "super-impact" : ""}`}><div className={`boss-figure-wrap ${bossHit ? "hit" : ""}`}><BossFigure bossId={bossId} hpPercent={hpPercent} action={bossAction} /></div>{feedback === "correct" && <div className={`hero-attack ${isSuperImpact ? "super" : ""}`} aria-hidden="true" />}{playerHit && <div className={`boss-attack-effect attack-${boss.id}`}>{getBossAttackName(boss.id)}</div>}{damagePopup && <div className={`damage-popup ${damagePopup.super ? "super" : ""}`}>{damagePopup.text}</div>}<div className="boss-shadow" /></div><div className="boss-hp-wrap"><div className="boss-hp-label"><span>Boss-liv</span><span>{bossLives}/{bossMaxLives}</span></div><div className="boss-hp-bar"><div className="boss-hp-fill" style={{ width: `${hpPercent}%` }} /></div></div></div></div><div className={`player-panel ${playerHit ? "hit" : ""}`}><div className="boss-compact-status"><div className="heart-row">{Array.from({ length: playerMaxHearts }).map((_, index) => <span key={index} className={index < playerHearts ? "" : "heart-lost"}>❤️</span>)}</div><div className="super-area"><div className="super-meter-label"><span>Super</span><span>{currentStreak}/5</span></div><div className={`super-meter ${isSuperReady ? "ready" : ""}`}>{Array.from({ length: 5 }).map((_, index) => <div key={index} className={`super-cell ${index < currentStreak ? "filled" : ""} ${isSuperReady && index === 4 ? "ready" : ""}`} />)}</div></div></div></div><div className="card question-card boss-question-card"><p className="label">Velg riktig svar</p><h2>{question.a} {question.symbol} {question.b} = ?</h2></div><div className="answer-grid">{question.options.map((option) => { let answerClass = "answer-button"; if (feedback === "correct" && option === question.correct) answerClass += " correct"; if (feedback === "wrong" && option !== question.correct) answerClass += " wrong"; if (feedback === "wrong" && option === question.correct) answerClass += " correct"; return <button key={option} onClick={() => answerBoss(option)} disabled={Boolean(feedback)} className={answerClass}>{option}</button>; })}</div><div className="feedback-area boss-feedback-area">{feedback === "correct" && <p className="feedback correct-text">{bossMessage}</p>}{feedback === "wrong" && <p className="feedback wrong-text">{bossMessage}</p>}{!feedback && <p className="feedback neutral-text">{isSuperReady ? "Neste riktige svar gir superangrep!" : bossMessage || "Slå bossen før du mister alle hjertene!"}</p>}</div><Button variant="light" onClick={quitBossBattle} className="full quit-round-button">Avslutt runde</Button></div></Shell>;
  }

  if (screen === "bossResult") {
    const boss = getBossConfig(bossId); const won = bossOutcome === "won";
    return (
      <Shell>
        <div className="hero compact boss-result-hero">
          <h1>{won ? "SEIER!" : "Bossen vant"}</h1>
          <p>{won ? `Du beseiret ${boss.name}!` : "Du var nær - prøv igjen!"}</p>
        </div>
        <div className={`card result-card boss-result-card ${won ? "won" : "lost"}`}>
          <div className="boss-result-burst" aria-hidden="true">{Array.from({ length: 6 }).map((_, index) => <span key={index} className="result-spark" />)}</div>
          <div className="boss-result-banner">{won ? "Du vant bosskampen" : "Neste gang tar du den"}</div>
          {won ? (
            <>
              <div className="boss-result-figure boss-result-defeated"><BossFigure bossId={bossId} hpPercent={0} action="defeat" defeated /></div>
              <TreasureChest size={boss.treasureSize} />
              <h2>{boss.treasureName}</h2>
              <span>{boss.name} ble slått</span>
            </>
          ) : (
            <>
              <div className="boss-result-figure boss-result-standing"><BossFigure bossId={bossId} hpPercent={Math.max(0, Math.min(100, (bossLives / bossMaxLives) * 100))} action="idle" /></div>
              <h2>{boss.name} står igjen</h2>
              <span>{bossLives} boss-liv igjen</span>
            </>
          )}
          <div className="boss-result-stats">
            <div className="boss-result-stat"><strong>{playerHearts}/{playerMaxHearts}</strong><span>Hjerter</span></div>
            <div className="boss-result-stat"><strong>{bossCorrectAnswers}</strong><span>Riktige</span></div>
          </div>
        </div>
        <div className="stack"><Button onClick={startBossBattle}>Prøv samme boss igjen</Button><Button variant="secondary" onClick={() => setScreen("bossSelect")}>Velg ny boss</Button><Button variant="light" onClick={() => setScreen("bossMode")}>Tilbake</Button></div>
        <p className="small-note">Boss Battle har ingen highscore og lagrer ingen resultater.</p>
      </Shell>
    );
  }

  if (screen === "grade") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Zap /></div><h1>Normal</h1><p>Velg regneart.</p></div><div className="card input-card"><ModeButtons selectedMode={gameMode} includeMixed onSelect={(mode) => { setGameMode(mode); if (isTimeChallengeMode(mode)) setGameQuestionCount(10); setScreen("start"); }} /></div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "school") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Trophy /></div><h1>Skolekampen</h1><p>Velg skole.</p></div><div className="card input-card">{SCHOOL_OPTIONS.map((school) => <Button key={school} variant={schoolBattleSchool === school ? "primary" : "light"} onClick={() => { setSchoolBattleSchool(school); setScreen("schoolMode"); }} className="full top-space">{school}</Button>)}</div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "schoolMode") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Trophy /></div><h1>Skolekampen</h1><p>{schoolBattleSchool}</p><p className="small-note">Velg regneart.</p></div><div className="card input-card"><ModeButtons selectedMode={gameMode} onSelect={(mode) => { setGameMode(mode); setGameLevel("medium"); if (isTimeChallengeMode(mode)) { setGameQuestionCount(SCHOOL_BATTLE_TIME_QUESTION_COUNT); setScreen("schoolGradeGroup"); } else { setScreen("start"); } }} /></div><Button variant="light" onClick={() => setScreen("school")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "schoolGradeGroup") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Trophy /></div><h1>Skolekampen</h1><p>{getModeLabel(gameMode)} · velg gruppe.</p><p className="small-note">25 riktige svar · Highscore på kortest tid</p></div><div className="card input-card"><Button variant={schoolBattleGradeGroup === "small" ? "primary" : "light"} onClick={() => { setSchoolBattleGradeGroup("small"); setScreen("start"); }} className="full">Småtrinn 1.–4.</Button><Button variant={schoolBattleGradeGroup === "middle" ? "primary" : "light"} onClick={() => { setSchoolBattleGradeGroup("middle"); setScreen("start"); }} className="full top-space">Mellomtrinn 5.–7.</Button></div><Button variant="light" onClick={() => setScreen("schoolMode")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "mode") {
    return <Shell><div className="hero"><div className="icon-box icon-blue"><Zap /></div><h1>Normal</h1><p>Velg regneart.</p></div><div className="card input-card"><ModeButtons selectedMode={gameMode} includeMixed onSelect={(mode) => { setGameMode(mode); if (isTimeChallengeMode(mode)) setGameQuestionCount(10); setScreen("start"); }} /></div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "qr") {
    return <Shell><div className="hero compact"><div className="icon-box icon-yellow"><Zap /></div><h1>QR-kode</h1><p>Skann for å åpne Regnemester.</p></div><div className="card input-card" style={{ alignItems: "center", textAlign: "center" }}><QrCodeImage /><p className="small-note">{APP_URL}</p></div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "start") {
    const timeChallenge = isTimeChallengeMode(gameMode); const selectedQuestionCount = gameType === "school_battle" && timeChallenge ? SCHOOL_BATTLE_TIME_QUESTION_COUNT : gameQuestionCount;
    const startPrompt = timeChallenge ? `Hvor raskt klarer du ${selectedQuestionCount} ${gameMode === "subtraction" ? "subtraksjonsoppgaver" : "addisjonsoppgaver"}?` : gameMode === MIXED_MODE ? `Hvor mange blandede oppgaver klarer du på ${getGameSeconds(gameType)} sekunder?` : gameMode === "multiplication" ? `Hvor mange gangestykker klarer du på ${getGameSeconds(gameType)} sekunder?` : `Hvor mange divisjonsstykker klarer du på ${getGameSeconds(gameType)} sekunder?`;
    return (
      <Shell>
        <div className="hero">
          <div className="icon-box icon-blue"><Zap /></div>
          <h1>{gameType === "school_battle" ? "Skolekampen" : "Regnemester"}</h1>
          <p>{startPrompt}</p>
          {gameType === "school_battle" ? (timeChallenge ? <p className="small-note">{schoolBattleSchool} · {getGradeGroupLabel(schoolBattleGradeGroup)} · 25 riktige svar · Feil gir +{TIME_PENALTY_SECONDS} sekunder</p> : <p className="small-note">{schoolBattleSchool} · Middels nivå · 70 sekunder</p>) : <p className="small-note">{getLevelDescription(gameMode, gameLevel)}{timeChallenge ? ` · Feil svar gir +${TIME_PENALTY_SECONDS} sekunder` : ""}</p>}
        </div>
        {gameType === "normal" ? <div className="card input-card"><label>Velg nivå</label><Button variant={gameLevel === "easy" ? "primary" : "light"} onClick={() => setGameLevel("easy")} className="full">Lett</Button><Button variant={gameLevel === "medium" ? "primary" : "light"} onClick={() => setGameLevel("medium")} className="full top-space">Middels</Button><Button variant={gameLevel === "hard" ? "primary" : "light"} onClick={() => setGameLevel("hard")} className="full top-space">Vanskelig</Button></div> : <div className="card input-card"><label>Skolekampen</label>{timeChallenge ? <p className="small-note">{getGradeGroupLabel(schoolBattleGradeGroup)} · 25 riktige svar · kortest tid vinner.</p> : <p className="small-note">Nivået er låst til Middels.</p>}</div>}
        {gameType === "normal" && timeChallenge && <div className="card input-card"><label>Velg antall oppgaver</label>{QUESTION_COUNT_OPTIONS.map((count) => <Button key={count} variant={gameQuestionCount === count ? "primary" : "light"} onClick={() => setGameQuestionCount(count)} className="full top-space">{count} oppgaver</Button>)}</div>}
        {gameType === "school_battle" ? <div className="card input-card"><label htmlFor="player-name">Skriv spillnavn</label><input id="player-name" value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength={18} placeholder="f.eks. Tiger23" autoComplete="off" />{nameError && <p className="admin-message">{nameError}</p>}<Button onClick={startGame} disabled={!trimmedName} className="full">Start spillet</Button></div> : <div className="card input-card"><Button onClick={startGame} className="full">Start spillet</Button></div>}
        <Button variant="light" onClick={() => setScreen(gameType === "school_battle" ? "schoolMode" : "mode")} className="full top-space">Tilbake</Button>
        {gameType === "school_battle" && <p className="small-note">Ikke bruk etternavn. Bruk spillnavn eller fornavn.</p>}
      </Shell>
    );
  }

  if (screen === "play") {
    const timeChallenge = isTimeChallengeMode(gameMode); const displayedTime = elapsedSeconds + wrongAnswers * TIME_PENALTY_SECONDS; const displayedQuestionCount = gameType === "school_battle" && timeChallenge ? SCHOOL_BATTLE_TIME_QUESTION_COUNT : gameQuestionCount;
    return <Shell><div ref={gameAreaRef} className="play-compact-layout">{timeChallenge ? <div className="status-row play-status-compact"><div className="status-pill red"><Timer /><span>{formatTime(displayedTime)}</span></div><div className="status-pill green"><Trophy /><span>{questionsDone}/{displayedQuestionCount}</span></div></div> : <div className="status-row play-status-compact"><div className="status-pill red"><Timer /><span>{timeLeft} sek</span></div><div className="status-pill green"><Trophy /><span>{score} poeng</span></div></div>}<div className="card question-card play-question-compact"><p className="label">{timeChallenge ? `Oppgave ${Math.min(questionsDone + 1, displayedQuestionCount)} av ${displayedQuestionCount}` : "Velg riktig svar"}</p><h2>{question.a} {question.symbol} {question.b} = ?</h2></div><div className="answer-grid play-answer-grid-compact">{question.options.map((option) => { let answerClass = "answer-button"; if (feedback === "correct" && option === question.correct) answerClass += " correct"; if (feedback === "wrong" && option !== question.correct) answerClass += " wrong"; if (feedback === "wrong" && option === question.correct) answerClass += " correct"; return <button key={option} onClick={() => answer(option)} disabled={Boolean(feedback)} className={answerClass}>{option}</button>; })}</div><div className="feedback-area play-feedback-compact">{feedback === "correct" && <p className="feedback correct-text">Riktig! +1</p>}{feedback === "wrong" && <p className="feedback wrong-text">{timeChallenge ? `Feil! +${TIME_PENALTY_SECONDS} sekunder. Oppgaven teller ikke.` : "Feil! -1 poeng"}</p>}{!feedback && <p className="feedback neutral-text">{timeChallenge ? "Svar riktig og raskt!" : "Svar så raskt du kan!"}</p>}</div><Button variant="light" onClick={quitRound} className="full quit-round-button">Avslutt runde</Button></div></Shell>;
  }

  if (screen === "result") {
    const timeChallenge = isTimeChallengeMode(gameMode); const resultQuestionCount = gameType === "school_battle" && timeChallenge ? SCHOOL_BATTLE_TIME_QUESTION_COUNT : gameQuestionCount;
    const normalResultMessage = normalResultMotivationMessage || NORMAL_RESULT_MOTIVATION_MESSAGES[0];
    return (
      <Shell>
        <div className="hero compact"><h1>{timeChallenge ? "Ferdig!" : "Tiden er ute!"}</h1></div>
        {timeChallenge ? <div className="card result-card"><p>Din tid</p><strong>{formatTime(resultTimeSeconds)}</strong><span>{resultQuestionCount} riktige svar</span><h2>Godt jobbet!</h2></div> : <div className="card result-card"><p>Du fikk</p><strong>{score}</strong><span>poeng</span><StarsDisplay count={stars} /><h2>{getMessage(score)}</h2></div>}
        {gameType === "normal" && <p className="normal-result-motivation">{normalResultMessage}</p>}
        {gameType === "school_battle" && scoreMessage && <p className="error-box">{scoreMessage}</p>}
        <div className="stack"><Button onClick={startGame}>Spill igjen</Button><Button variant="light" onClick={() => setScreen(gameType === "school_battle" ? "schoolMode" : "mode")}>Tilbake</Button></div>
        {gameType === "school_battle" && <ResultHighscoreList scores={resultScores} mode={gameMode} gameType={gameType} gradeLevel={gameGradeLevel} level={gameLevel} questionCount={gameQuestionCount} gradeGroup={schoolBattleGradeGroup} />}
        {gameType === "school_battle" && <p className="small-note">{timeChallenge ? `Highscore for ${getModeLabel(gameMode).toLowerCase()} lagrer kun toppresultater. Feil svar gir +${TIME_PENALTY_SECONDS} sekunder.` : "Highscore lagrer kun relevante toppresultater."}</p>}
      </Shell>
    );
  }

  if (screen === "schoolHighscore") {
    const visibleSchoolScores = dedupeSchoolBattleScores(scores, highscoreMode);
    scores = visibleSchoolScores;
    return <Shell><div className="hero compact"><div className="icon-box icon-yellow"><Crown /></div><h1>Skolekampen</h1><p>{getModeLabel(highscoreMode)} - {isTimeChallengeMode(highscoreMode) ? `${getGradeGroupLabel(highscoreGradeGroup)} - Topp 20 korteste tider` : "Topp 20"}</p></div><div className="card input-card"><ModeFilterButtons selectedMode={highscoreMode} onSelect={changeSchoolBattleHighscoreMode} /></div>{isTimeChallengeMode(highscoreMode) && <div className="card input-card"><label>Velg gruppe</label><Button variant={highscoreGradeGroup === "small" ? "primary" : "light"} onClick={() => changeSchoolBattleGradeGroup("small")} className="full">Småtrinn 1.–4.</Button><Button variant={highscoreGradeGroup === "middle" ? "primary" : "light"} onClick={() => changeSchoolBattleGradeGroup("middle")} className="full top-space">Mellomtrinn 5.–7.</Button></div>}{scoreMessage && <p className="error-box">{scoreMessage}</p>}<div className="card highscore-card">{scores.length === 0 ? <div className="empty-state"><h2>Ingen resultater ennå</h2><p>Spill en runde i Skolekampen for å lage første score.</p></div> : <div className="score-list">{scores.map((entry, index) => <div key={`${entry.name}-${entry.school}-${entry.score}-${index}`} className="score-row"><div className="score-name"><span className={index === 0 ? "rank rank-first" : "rank"}>{index + 1}</span><strong>{entry.name}</strong><small>{entry.school}</small></div><span className="score-value">{isTimeChallengeMode(highscoreMode) ? formatTime(entry.score) : entry.score}</span></div>)}</div>}</div><div className="stack"><Button onClick={() => setScreen("highscoreHome")}>Tilbake</Button></div></Shell>;
  }

  if (screen === "highscore") {
    return <Shell><div className="hero compact"><div className="icon-box icon-yellow"><Crown /></div><h1>Highscore</h1></div><div className="card input-card"><Button variant="secondary" onClick={openSchoolHighscoreFromHome} className="full">Skolekampen</Button></div><Button variant="light" onClick={() => setScreen("highscoreHome")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "adminLogin") {
    return <Shell><div className="hero compact"><div className="icon-box icon-red"><Shield /></div><h1>Admin</h1><p>Skriv adminkode for å fortsette.</p></div><div className="card input-card"><label htmlFor="admin-login-pin">Adminkode</label><input id="admin-login-pin" value={adminLoginPin} onChange={(event) => setAdminLoginPin(event.target.value)} type="password" inputMode="numeric" placeholder="8-sifret kode" maxLength={8} /><Button onClick={validateAdminLogin} disabled={adminLoginPin.trim().length !== 8} className="full">Logg inn</Button>{adminMessage && <p className="admin-message">{adminMessage}</p>}</div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "adminHome") {
    return <Shell><div className="hero compact"><div className="icon-box icon-red"><Shield /></div><h1>Admin</h1><p>Velg hva du vil administrere.</p></div><div className="card input-card"><Button onClick={() => { refreshAllNormalAdminScores(); setScreen("adminNormal"); }} className="full">Normal highscore</Button><Button variant="secondary" onClick={() => { refreshSchoolBattleScores(highscoreMode); setScreen("adminSchool"); }} className="full top-space">Skolekampen</Button></div><Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button></Shell>;
  }

  if (screen === "adminNormal") {
    const hasActiveFilters =
      adminNormalSearch.trim() ||
      adminNormalGradeFilter !== ALL_FILTER_VALUE ||
      adminNormalModeFilter !== ALL_FILTER_VALUE ||
      adminNormalLevelFilter !== ALL_FILTER_VALUE ||
      adminNormalQuestionCountFilter !== ALL_FILTER_VALUE;

    return (
      <Shell>
        <div className="hero compact">
          <div className="icon-box icon-red"><Shield /></div>
          <h1>Normal admin</h1>
          <p>Samlet oversikt over alle Normal-lister.</p>
        </div>

        <div className="card input-card">
          <label htmlFor="admin-normal-search">Søk etter spillnavn</label>
          <input
            id="admin-normal-search"
            value={adminNormalSearch}
            onChange={(event) => setAdminNormalSearch(event.target.value)}
            placeholder="Skriv navn, f.eks. Tiger23"
            autoComplete="off"
          />
          <p className="small-note">Filtrer, finn og slett uten å måtte gå inn på hver enkelt liste.</p>
        </div>

        <div className="card input-card">
          <label>Oversikt</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div className="status-pill green" style={{ justifyContent: "center" }}>
              <Trophy />
              <span>{adminNormalStats.totalResults} resultater</span>
            </div>
            <div className="status-pill red" style={{ justifyContent: "center" }}>
              <Crown />
              <span>{adminNormalStats.activeLists} lister</span>
            </div>
          </div>
          <p className="small-note">
            Beste poengsum: {adminNormalStats.bestScoreEntry ? `${adminNormalStats.bestScoreEntry.name} · ${adminNormalStats.bestScoreEntry.score} poeng` : "ingen ennå"}
          </p>
          <p className="small-note">
            Beste tid: {adminNormalStats.bestTimeEntry ? `${adminNormalStats.bestTimeEntry.name} · ${formatTime(adminNormalStats.bestTimeEntry.score)}` : "ingen ennå"}
          </p>
        </div>

        <div className="card input-card">
          <label>Filtrer trinn</label>
          <Button
            variant={adminNormalGradeFilter === ALL_FILTER_VALUE ? "primary" : "light"}
            onClick={() => setAdminNormalGradeFilter(ALL_FILTER_VALUE)}
            className="full"
          >
            Alle trinn
          </Button>
          {GRADE_OPTIONS.map((grade) => (
            <Button
              key={grade}
              variant={Number(adminNormalGradeFilter) === grade ? "primary" : "light"}
              onClick={() => setAdminNormalGradeFilter(grade)}
              className="full top-space"
            >
              {getGradeLabel(grade)}
            </Button>
          ))}
        </div>

        <div className="card input-card">
          <label>Filtrer regneart</label>
          <Button
            variant={adminNormalModeFilter === ALL_FILTER_VALUE ? "primary" : "light"}
            onClick={() => setAdminNormalModeFilter(ALL_FILTER_VALUE)}
            className="full"
          >
            Alle regnearter
          </Button>
          {MODE_ORDER.map((mode) => (
            <Button
              key={mode}
              variant={adminNormalModeFilter === mode ? "primary" : "light"}
              onClick={() => setAdminNormalModeFilter(mode)}
              className="full top-space"
            >
              {getModeLabel(mode)}
            </Button>
          ))}
        </div>

        <div className="card input-card">
          <label>Filtrer nivå</label>
          <Button
            variant={adminNormalLevelFilter === ALL_FILTER_VALUE ? "primary" : "light"}
            onClick={() => setAdminNormalLevelFilter(ALL_FILTER_VALUE)}
            className="full"
          >
            Alle nivå
          </Button>
          {LEVEL_ORDER.map((level) => (
            <Button
              key={level}
              variant={adminNormalLevelFilter === level ? "primary" : "light"}
              onClick={() => setAdminNormalLevelFilter(level)}
              className="full top-space"
            >
              {getLevelLabel(level)}
            </Button>
          ))}
        </div>

        <div className="card input-card">
          <label>Filtrer antall oppgaver</label>
          <Button
            variant={adminNormalQuestionCountFilter === ALL_FILTER_VALUE ? "primary" : "light"}
            onClick={() => setAdminNormalQuestionCountFilter(ALL_FILTER_VALUE)}
            className="full"
          >
            Alle / poengmoduser
          </Button>
          {QUESTION_COUNT_OPTIONS.map((count) => (
            <Button
              key={count}
              variant={Number(adminNormalQuestionCountFilter) === count ? "primary" : "light"}
              onClick={() => setAdminNormalQuestionCountFilter(count)}
              className="full top-space"
            >
              {count} oppgaver
            </Button>
          ))}
          <p className="small-note">Antall oppgaver gjelder addisjon og subtraksjon. Multiplikasjon og divisjon vises under “Alle / poengmoduser”.</p>
        </div>

        {hasActiveFilters && (
          <Button variant="light" onClick={clearNormalAdminFilters} className="full top-space">
            Nullstill søk og filtre
          </Button>
        )}

        {adminMessage && <p className="admin-message">{adminMessage}</p>}

        {adminNormalGroups.length === 0 ? (
          <div className="card highscore-card">
            <div className="empty-state">
              <h2>Ingen resultater funnet</h2>
              <p>Prøv å endre søket eller filtrene.</p>
            </div>
          </div>
        ) : (
          <div className="stack">
            {adminNormalGroups.map((group) => {
              const groupIsTimed = isTimeChallengeMode(group.mode);
              return (
                <div key={group.key} className="card highscore-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <h2 className="result-highscore-title" style={{ textAlign: "left", marginBottom: "2px" }}>{getNormalAdminGroupTitle(group)}</h2>
                      <p className="small-note">{group.entries.length} resultat{group.entries.length === 1 ? "" : "er"} på listen</p>
                    </div>
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() => resetNormalAdminGroup(group)}
                      style={{ padding: "8px 10px", fontSize: "0.78rem", flexShrink: 0 }}
                    >
                      Tøm
                    </button>
                  </div>

                  <div className="score-list">
                    {group.entries.map((entry, index) => (
                      <div key={`${entry.id || "local"}-${entry.name}-${entry.score}-${index}`} className="score-row">
                        <div className="score-name">
                          <span className={index === 0 ? "rank rank-first" : "rank"}>{index + 1}</span>
                          <strong>{entry.name}</strong>
                          <small>{getNormalAdminGroupTitle(group)}</small>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className="score-value">{groupIsTimed ? formatTime(entry.score) : entry.score}</span>
                          {entry.id && (
                            <button
                              type="button"
                              className="button button-danger"
                              onClick={() => deleteNormalScore(entry.id)}
                              style={{ padding: "8px 10px", fontSize: "0.8rem" }}
                            >
                              Slett
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button variant="light" onClick={() => setScreen("adminHome")} className="full top-space">Tilbake</Button>
      </Shell>
    );
  }

  if (screen === "adminSchool") {
    return <Shell><div className="hero compact"><div className="icon-box icon-red"><Shield /></div><h1>Skolekampen admin</h1><p>Slett enkeltresultater.</p></div><div className="card input-card"><ModeFilterButtons selectedMode={highscoreMode} onSelect={changeSchoolBattleHighscoreMode} /></div>{isTimeChallengeMode(highscoreMode) && <div className="card input-card"><label>Velg gruppe</label><Button variant={highscoreGradeGroup === "small" ? "primary" : "light"} onClick={() => changeSchoolBattleGradeGroup("small")} className="full">Småtrinn 1.–4.</Button><Button variant={highscoreGradeGroup === "middle" ? "primary" : "light"} onClick={() => changeSchoolBattleGradeGroup("middle")} className="full top-space">Mellomtrinn 5.–7.</Button></div>}<div className="card highscore-card">{scores.length === 0 ? <div className="empty-state"><h2>Ingen resultater</h2><p>Det er ingen Skolekampen-resultater på denne listen.</p></div> : <div className="score-list">{scores.map((entry, index) => <div key={`${entry.id}-${entry.name}-${entry.school}-${entry.score}-${index}`} className="score-row"><div className="score-name"><span className={index === 0 ? "rank rank-first" : "rank"}>{index + 1}</span><strong>{entry.name}</strong><small>{entry.school}</small></div><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span className="score-value">{isTimeChallengeMode(highscoreMode) ? formatTime(entry.score) : entry.score}</span>{entry.id && <button type="button" className="button button-danger" onClick={() => deleteSchoolBattleScore(entry.id)} style={{ padding: "8px 10px", fontSize: "0.8rem" }}>Slett</button>}</div></div>)}</div>}</div><Button variant="light" onClick={() => setScreen("adminHome")} className="full top-space">Tilbake</Button></Shell>;
  }

  return null;
}
