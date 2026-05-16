import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Crown, Shield, Star, Timer, Trophy, Zap } from "lucide-react";

const NORMAL_GAME_SECONDS = 60;
const SCHOOL_BATTLE_SECONDS = 70;
const ADDITION_PENALTY_SECONDS = 5;
const QUESTION_COUNT_OPTIONS = [10, 20, 30, 40];
const STORAGE_KEY = "gangemester_highscores_v1";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const ADMIN_PIN_FALLBACK = import.meta.env.VITE_ADMIN_PIN_FALLBACK || "48291736";
const APP_URL = "https://regnemester.vercel.app/";

const SCHOOL_OPTIONS = [
  "Austafjord skole",
  "Foldereid oppvekstsenter",
  "Gravvik oppvekstsenter",
  "Kolvereid skole",
  "Nærøysundet skole",
  "Rørvik skole",
];

const BLOCKED_CONTAINS = [
  "faen",
  "faan",
  "fanden",
  "satan",
  "satans",
  "helvete",
  "hælvete",
  "haelvete",
  "jævel",
  "javel",
  "jævla",
  "javla",
  "jævlig",
  "javlig",
  "dritt",
  "drit",
  "driten",
  "drittsekk",
  "shit",
  "sh1t",
  "bæsj",
  "baesj",
  "bajs",
  "tiss",
  "piss",
  "promp",
  "fjesing",
  "ræv",
  "raev",
  "rompe",
  "rumpe",
  "idiot",
  "dust",
  "dumming",
  "taper",
  "loser",
  "mongo",
  "retard",
  "teit",
  "stygg",
  "styggen",
  "feit",
  "fett",
  "dum",
  "hater",
  "mobber",
  "slem",
  "ekkel",
  "ekkelt",
  "creep",
  "sex",
  "sexy",
  "porno",
  "porn",
  "naken",
  "nude",
  "penis",
  "pikk",
  "p1kk",
  "kuk",
  "kukk",
  "fitte",
  "f1tte",
  "vagina",
  "pupp",
  "pupper",
  "boobs",
  "boob",
  "tits",
  "hore",
  "h0re",
  "slut",
  "dildo",
  "sug",
  "suge",
  "suger",
  "blowjob",
  "handjob",
  "cum",
  "cumming",
  "orgasme",
  "fuck",
  "fck",
  "fuk",
  "fucker",
  "fucking",
  "motherfucker",
  "bitch",
  "btch",
  "asshole",
  "bastard",
  "damn",
  "crap",
  "dick",
  "cock",
  "pussy",
  "whore",
  "kill",
  "killer",
  "killing",
  "drep",
  "drepe",
  "dreper",
  "mord",
  "morder",
  "myrd",
  "death",
  "die",
  "dead",
  "blod",
  "blood",
  "kniv",
  "knife",
  "gun",
  "guns",
  "våpen",
  "vapen",
  "bomb",
  "bombe",
  "skyte",
  "skyt",
  "shoot",
  "nazi",
  "nazist",
  "hitler",
  "rasist",
  "racist",
  "terror",
  "terrorist",
  "isis",
  "kkk",
  "alkohol",
  "drunk",
  "vodka",
  "beer",
  "dop",
  "drug",
  "drugs",
  "weed",
  "hasj",
  "hash",
  "røyk",
  "royk",
  "snus",
  "vape",
];

const BLOCKED_EXACT = ["ass", "tit", "poo", "pee", "die", "dum", "slem", "stygg", "feit", "teit"];

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

  if (hasBlockedContainsWord || hasBlockedExactWord) {
    return "Velg et annet spillnavn. Bruk et hyggelig navn.";
  }

  return "";
}

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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

function randomWrongAnswer(correct) {
  if (correct === 0) return Math.floor(Math.random() * 20) + 1;

  const strategies = [
    correct + (Math.floor(Math.random() * 9) - 4),
    correct + 10,
    correct - 10,
    correct + Math.floor(Math.random() * 12) + 1,
    Math.max(1, correct - (Math.floor(Math.random() * 12) + 1)),
  ];

  const candidate = strategies[Math.floor(Math.random() * strategies.length)];
  return Math.max(0, candidate);
}

function randomDivisionWrongAnswer(correct, max = 10) {
  const nearbyCandidates = [
    correct - 4,
    correct - 3,
    correct - 2,
    correct - 1,
    correct + 1,
    correct + 2,
    correct + 3,
    correct + 4,
  ].filter((value) => value >= 1 && value <= max && value !== correct);

  if (nearbyCandidates.length > 0) {
    return nearbyCandidates[Math.floor(Math.random() * nearbyCandidates.length)];
  }

  let candidate = correct;
  while (candidate === correct) candidate = Math.floor(Math.random() * max) + 1;
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

function getLevelLabel(level) {
  if (level === "easy") return "Lett";
  if (level === "hard") return "Vanskelig";
  return "Middels";
}

function getLevelDescription(mode, level) {
  const max = getLevelMax(level, mode);
  if (mode === "addition") return `${getLevelLabel(level)}: addisjon med svar fra 0–${max}`;
  if (mode === "subtraction") return `${getLevelLabel(level)}: subtraksjon uten minus, tall fra 0–${max}`;
  if (mode === "division") return `${getLevelLabel(level)}: deling med tall fra 1–${max}`;
  return `${getLevelLabel(level)}: gangestykker fra 0–${max}`;
}

function createQuestionDeck(mode = "multiplication", level = "medium") {
  const questions = [];
  const max = getLevelMax(level, mode);

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

function getModeLabel(mode) {
  if (mode === "addition") return "Addisjon";
  if (mode === "subtraction") return "Subtraksjon";
  if (mode === "division") return "Divisjon";
  return "Multiplikasjon";
}

function getResetModeLabel(mode) {
  if (mode === "all") return "Alt";
  return getModeLabel(mode);
}

function getGradeLabel(gradeLevel) {
  if (Number(gradeLevel) === 8) return "Eldre";
  return `${gradeLevel}. klasse`;
}

function getGameSeconds(gameType) {
  return gameType === "school_battle" ? SCHOOL_BATTLE_SECONDS : NORMAL_GAME_SECONDS;
}

function getHighscoreTitle(mode, level, gradeLevel, questionCount = 10) {
  const baseTitle = `${getGradeLabel(gradeLevel)} - ${getModeLabel(mode)} - ${getLevelLabel(level)}`;
  if (isTimeChallengeMode(mode)) return `${baseTitle} - ${questionCount} oppgaver - Topp 10`;
  return `${baseTitle} - Topp 10`;
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

function sortSchoolBattleScores(scores) {
  return [...scores]
    .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(Number(entry.score)))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      school: entry.school || "Ukjent skole",
      score: Number(entry.score),
      mode: entry.mode || "multiplication",
    }))
    .sort((a, b) => b.score - a.score)
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

async function loadSchoolBattleScores(mode = "multiplication") {
  if (supabase) {
    const { data, error } = await supabase
      .from("scores")
      .select("id, name, score, mode, school, game_type")
      .eq("game_type", "school_battle")
      .eq("mode", mode)
      .order("score", { ascending: false })
      .limit(20);

    if (!error && data) return sortSchoolBattleScores(data);
    throw new Error(error?.message || "Kunne ikke hente Skolekampen-listen.");
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const storedScores = raw ? JSON.parse(raw) : [];
    const filteredScores = storedScores.filter((entry) => entry.game_type === "school_battle" && entry.mode === mode);
    return sortSchoolBattleScores(filteredScores);
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

async function clearScores(adminPin, resetMode = "all", resetGradeLevel = 4) {
  if (supabase) {
    const { error } = await supabase.rpc("reset_scores_by_mode_and_grade", {
      admin_pin: adminPin,
      reset_mode: resetMode,
      reset_grade_level: resetGradeLevel,
    });

    if (error) throw new Error(error.message || "Kunne ikke nullstille listen.");
    return;
  }

  if (adminPin !== ADMIN_PIN_FALLBACK) throw new Error("Feil adminkode.");

  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];
  const remainingScores = current.filter((entry) => {
    const entryGrade = Number(entry.grade_level || 4);
    const entryMode = entry.mode || "multiplication";
    const entryGameType = entry.game_type || "normal";

    if (entryGameType !== "normal") return true;
    if (entryGrade !== Number(resetGradeLevel)) return true;
    if (resetMode === "all") return false;
    return entryMode !== resetMode;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingScores));
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

async function clearSchoolBattleScores(adminPin, resetMode = "all") {
  if (supabase) {
    const { error } = await supabase.rpc("reset_school_battle_scores", {
      admin_pin: adminPin,
      reset_mode: resetMode,
    });

    if (error) throw new Error(error.message || "Kunne ikke nullstille Skolekampen-listen.");
    return;
  }

  if (adminPin !== ADMIN_PIN_FALLBACK) throw new Error("Feil adminkode.");

  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];
  const remainingScores = current.filter((entry) => {
    if (entry.game_type !== "school_battle") return true;
    if (resetMode === "all") return false;
    return entry.mode !== resetMode;
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

function Shell({ children }) {
  return (
    <main className="app-shell">
      <section className="phone-frame">
        <div className="blob blob-one" />
        <div className="blob blob-two" />
        <div className="content">{children}</div>
      </section>
    </main>
  );
}

function StarsDisplay({ count }) {
  return (
    <div className="stars" aria-label={`${count} stjerner`}>
      {Array.from({ length: count }).map((_, index) => (
        <Star key={index} className="star-icon" />
      ))}
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
  const [gameMode, setGameMode] = useState("multiplication");
  const [gameLevel, setGameLevel] = useState("medium");
  const [gameQuestionCount, setGameQuestionCount] = useState(10);
  const [highscoreGradeLevel, setHighscoreGradeLevel] = useState(4);
  const [highscoreMode, setHighscoreMode] = useState("multiplication");
  const [highscoreLevel, setHighscoreLevel] = useState("medium");
  const [highscoreQuestionCount, setHighscoreQuestionCount] = useState(10);
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
  const [adminNormalMode, setAdminNormalMode] = useState("multiplication");
  const [adminNormalLevel, setAdminNormalLevel] = useState("medium");
  const [adminNormalQuestionCount, setAdminNormalQuestionCount] = useState(10);
  const [adminSchoolResetMode, setAdminSchoolResetMode] = useState("all");
  const [scoreMessage, setScoreMessage] = useState("");
  const savedThisRound = useRef(false);
  const questionDeck = useRef([]);

  const trimmedName = playerName.trim();
  const stars = useMemo(() => getStars(score), [score]);
  const isCurrentTimeChallenge = gameType === "normal" && isTimeChallengeMode(gameMode);

  useEffect(() => {
    refreshScores("multiplication", "medium", 4, 10);
  }, []);

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
    try {
      const loaded = await loadScores(mode, level, gradeLevel, questionCount);
      setScores(loaded);
      setScoreMessage("");
    } catch (error) {
      setScoreMessage(error.message);
    }
  }

  async function refreshSchoolBattleScores(mode = highscoreMode) {
    try {
      const loaded = await loadSchoolBattleScores(mode);
      setScores(loaded);
      setScoreMessage("");
    } catch (error) {
      setScoreMessage(error.message);
    }
  }

  function openHighscore(mode = gameMode, level = gameLevel, gradeLevel = gameGradeLevel, questionCount = gameQuestionCount) {
    setHighscoreMode(mode);
    setHighscoreLevel(level);
    setHighscoreGradeLevel(gradeLevel);
    setHighscoreQuestionCount(questionCount);
    refreshScores(mode, level, gradeLevel, questionCount);
    setScreen("highscore");
  }

  function openSchoolBattleHighscore(mode = gameMode) {
    setHighscoreMode(mode);
    refreshSchoolBattleScores(mode);
    setScreen("schoolHighscore");
  }

  function changeHighscoreMode(mode) {
    setHighscoreMode(mode);
    refreshScores(mode, highscoreLevel, highscoreGradeLevel, highscoreQuestionCount);
  }

  function changeHighscoreLevel(level) {
    setHighscoreLevel(level);
    refreshScores(highscoreMode, level, highscoreGradeLevel, highscoreQuestionCount);
  }

  function changeHighscoreQuestionCount(questionCount) {
    setHighscoreQuestionCount(questionCount);
    refreshScores(highscoreMode, highscoreLevel, highscoreGradeLevel, questionCount);
  }

  function changeSchoolBattleHighscoreMode(mode) {
    setHighscoreMode(mode);
    refreshSchoolBattleScores(mode);
  }

  function getNextQuestion(mode = gameMode, level = gameLevel) {
    if (questionDeck.current.length === 0) questionDeck.current = createQuestionDeck(mode, level);
    return questionDeck.current.pop();
  }

  function startGame() {
    const validationMessage = validatePlayerName(trimmedName);
    if (validationMessage) {
      setNameError(validationMessage);
      return;
    }

    setNameError("");
    savedThisRound.current = false;
    questionDeck.current = createQuestionDeck(gameMode, gameLevel);
    setScore(0);
    setTimeLeft(getGameSeconds(gameType));
    setElapsedSeconds(0);
    setQuestionsDone(0);
    setWrongAnswers(0);
    setResultTimeSeconds(0);
    setResultCorrectAnswers(0);
    setResultWrongAnswers(0);
    setQuestion(getNextQuestion(gameMode, gameLevel));
    setFeedback(null);
    setScreen("play");
  }

  async function finishGame(resultOverride = {}) {
    const finalScore = Number.isFinite(resultOverride.score) ? resultOverride.score : score;
    const finalWrongAnswers = Number.isFinite(resultOverride.wrongAnswers) ? resultOverride.wrongAnswers : wrongAnswers;
    const finalTime = Number.isFinite(resultOverride.timeSeconds)
      ? resultOverride.timeSeconds
      : elapsedSeconds + finalWrongAnswers * ADDITION_PENALTY_SECONDS;

    setScreen("result");
    setFeedback(null);

    if (isCurrentTimeChallenge) {
      setResultTimeSeconds(finalTime);
      setResultCorrectAnswers(finalScore);
      setResultWrongAnswers(finalWrongAnswers);
    }

    if (!savedThisRound.current && trimmedName) {
      savedThisRound.current = true;

      try {
        if (gameType === "school_battle") {
          const saveResult = await saveSchoolBattleScore({
            name: trimmedName.slice(0, 18),
            score,
            mode: gameMode,
            school: schoolBattleSchool,
          });

          setHighscoreMode(gameMode);
          await refreshSchoolBattleScores(gameMode);
          setScoreMessage(`Du fikk ${score} poeng. ${saveResult.message}`);
          return;
        }

        if (isCurrentTimeChallenge) {
          const saveResult = await saveTimeScore({
            name: trimmedName.slice(0, 18),
            score: finalTime,
            mode: gameMode,
            level: gameLevel,
            grade_level: gameGradeLevel,
            question_count: gameQuestionCount,
          });

          setHighscoreMode(gameMode);
          setHighscoreLevel(gameLevel);
          setHighscoreGradeLevel(gameGradeLevel);
          setHighscoreQuestionCount(gameQuestionCount);
          await refreshScores(gameMode, gameLevel, gameGradeLevel, gameQuestionCount);
          setScoreMessage(`Du brukte ${formatTime(finalTime)}. ${saveResult.message}`);
          return;
        }

        const saveResult = await saveScore({
          name: trimmedName.slice(0, 18),
          score,
          mode: gameMode,
          level: gameLevel,
          grade_level: gameGradeLevel,
        });

        setHighscoreMode(gameMode);
        setHighscoreLevel(gameLevel);
        setHighscoreGradeLevel(gameGradeLevel);
        await refreshScores(gameMode, gameLevel, gameGradeLevel, gameQuestionCount);
        setScoreMessage(`Du fikk ${score} poeng. ${saveResult.message}`);
      } catch (error) {
        setScoreMessage(error.message);
      }
    }
  }

  function answer(value) {
    if (feedback) return;

    const isCorrect = value === question.correct;

    if (isCurrentTimeChallenge) {
      const nextQuestionsDone = questionsDone + 1;
      const nextWrongAnswers = isCorrect ? wrongAnswers : wrongAnswers + 1;
      const nextScore = isCorrect ? score + 1 : score;
      const finalTime = elapsedSeconds + nextWrongAnswers * ADDITION_PENALTY_SECONDS;

      setScore(nextScore);
      setQuestionsDone(nextQuestionsDone);
      setWrongAnswers(nextWrongAnswers);
      setFeedback(isCorrect ? "correct" : "wrong");

      if (nextQuestionsDone >= gameQuestionCount) {
        setTimeout(() => {
          finishGame({ score: nextScore, wrongAnswers: nextWrongAnswers, timeSeconds: finalTime });
        }, 180);
        return;
      }

      setTimeout(() => {
        setQuestion(getNextQuestion(gameMode, gameLevel));
        setFeedback(null);
      }, 180);
      return;
    }

    if (isCorrect) {
      setScore((current) => current + 1);
      setFeedback("correct");
    } else {
      setScore((current) => Math.max(0, current - 1));
      setFeedback("wrong");
    }

    setTimeout(() => {
      setQuestion(getNextQuestion(gameMode, gameLevel));
      setFeedback(null);
    }, 180);
  }

  async function validateAdminLogin() {
    setAdminMessage("");
    const cleanPin = adminLoginPin.trim();

    try {
      let isValid = cleanPin === ADMIN_PIN_FALLBACK;

      if (supabase) {
        const { data, error } = await supabase.rpc("validate_admin_pin", {
          admin_pin: cleanPin,
        });

        if (error) throw new Error(error.message || "Kunne ikke sjekke adminkoden.");
        isValid = Boolean(data);
      }

      if (!isValid) {
        setAdminMessage("Feil adminkode.");
        return;
      }

      setAdminAccessPin(cleanPin);
      setAdminLoginPin("");
      setAdminMessage("");
      setScreen("adminHome");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function refreshNormalAdminScores(mode = adminNormalMode, level = adminNormalLevel, gradeLevel = adminNormalGradeLevel, questionCount = adminNormalQuestionCount) {
    try {
      const loaded = await loadScores(mode, level, gradeLevel, questionCount);
      setScores(loaded);
      setAdminMessage("");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  function changeAdminNormalGradeLevel(gradeLevel) {
    setAdminNormalGradeLevel(gradeLevel);
    refreshNormalAdminScores(adminNormalMode, adminNormalLevel, gradeLevel, adminNormalQuestionCount);
  }

  function changeAdminNormalMode(mode) {
    setAdminNormalMode(mode);
    refreshNormalAdminScores(mode, adminNormalLevel, adminNormalGradeLevel, adminNormalQuestionCount);
  }

  function changeAdminNormalLevel(level) {
    setAdminNormalLevel(level);
    refreshNormalAdminScores(adminNormalMode, level, adminNormalGradeLevel, adminNormalQuestionCount);
  }

  function changeAdminNormalQuestionCount(questionCount) {
    setAdminNormalQuestionCount(questionCount);
    refreshNormalAdminScores(adminNormalMode, adminNormalLevel, adminNormalGradeLevel, questionCount);
  }

  async function deleteNormalScore(scoreId) {
    setAdminMessage("");

    try {
      if (supabase) {
        const { error } = await supabase.rpc("delete_normal_score", {
          admin_pin: adminAccessPin,
          score_id: scoreId,
        });

        if (error) throw new Error(error.message || "Kunne ikke slette resultatet.");
      } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        const current = raw ? JSON.parse(raw) : [];
        const remainingScores = current.filter((entry) => entry.id !== scoreId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingScores));
      }

      await refreshNormalAdminScores(adminNormalMode, adminNormalLevel, adminNormalGradeLevel, adminNormalQuestionCount);
      setAdminMessage("Resultatet er slettet.");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function resetNormalFromAdmin() {
    setAdminMessage("");

    try {
      await clearNormalScoreList(adminAccessPin, adminNormalMode, adminNormalLevel, adminNormalGradeLevel, adminNormalQuestionCount);
      setScores([]);
      setAdminMessage(
        `Tømte ${getGradeLabel(adminNormalGradeLevel)} - ${getModeLabel(adminNormalMode).toLowerCase()} - ${getLevelLabel(adminNormalLevel).toLowerCase()}${isTimeChallengeMode(adminNormalMode) ? ` - ${adminNormalQuestionCount} oppgaver` : ""}.`
      );
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function resetSchoolBattleFromAdmin() {
    setAdminMessage("");

    try {
      await clearSchoolBattleScores(adminAccessPin, adminSchoolResetMode);
      await refreshSchoolBattleScores(highscoreMode);
      const resetText = adminSchoolResetMode === "all" ? "alle Skolekampen-lister" : `${getModeLabel(adminSchoolResetMode).toLowerCase()}-listen`;
      setAdminMessage(`Nullstilte ${resetText}.`);
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function deleteSchoolBattleScore(scoreId) {
    setAdminMessage("");

    try {
      if (supabase) {
        const { error } = await supabase.rpc("delete_school_battle_score", {
          delete_pin: adminAccessPin,
          score_id: scoreId,
        });

        if (error) throw new Error(error.message || "Kunne ikke slette resultatet.");
      } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        const current = raw ? JSON.parse(raw) : [];
        const remainingScores = current.filter((entry) => entry.id !== scoreId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingScores));
      }

      await refreshSchoolBattleScores(highscoreMode);
      setAdminMessage("Resultatet er slettet.");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  if (screen === "home") {
    return (
      <Shell>
        <div className="hero">
          <div className="icon-box icon-blue"><Zap /></div>
          <h1>Regnemester</h1>
          <p>Velg spilltype.</p>
        </div>

        <div className="card input-card">
          <Button
            onClick={() => {
              setGameType("normal");
              setScreen("grade");
            }}
            className="full"
          >
            Normal
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              setGameType("school_battle");
              setGameLevel("medium");
              setScreen("school");
            }}
            className="full top-space"
          >
            Skolekampen
          </Button>
        </div>

        <Button variant="light" onClick={() => setScreen("qr")} className="full top-space">
          Vis QR-kode
        </Button>

        <Button variant="light" onClick={() => setScreen("adminLogin")} className="full top-space">
          Admin
        </Button>
      </Shell>
    );
  }

  if (screen === "grade") {
    return (
      <Shell>
        <div className="hero">
          <div className="icon-box icon-blue"><Zap /></div>
          <h1>Normal</h1>
          <p>Velg trinn.</p>
        </div>

        <div className="card input-card">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((grade) => (
            <Button
              key={grade}
              variant={gameGradeLevel === grade ? "primary" : "light"}
              onClick={() => {
                setGameGradeLevel(grade);
                setHighscoreGradeLevel(grade);
                setScreen("mode");
              }}
              className="full top-space"
            >
              {getGradeLabel(grade)}
            </Button>
          ))}
        </div>

        <Button variant="light" onClick={() => setScreen("home")} className="full top-space">
          Tilbake
        </Button>
      </Shell>
    );
  }

  if (screen === "school") {
    return (
      <Shell>
        <div className="hero">
          <div className="icon-box icon-blue"><Trophy /></div>
          <h1>Skolekampen</h1>
          <p>Velg skole.</p>
        </div>

        <div className="card input-card">
          {SCHOOL_OPTIONS.map((school) => (
            <Button
              key={school}
              variant={schoolBattleSchool === school ? "primary" : "light"}
              onClick={() => {
                setSchoolBattleSchool(school);
                setScreen("schoolMode");
              }}
              className="full top-space"
            >
              {school}
            </Button>
          ))}
        </div>

        <Button variant="light" onClick={() => setScreen("home")} className="full top-space">
          Tilbake
        </Button>
      </Shell>
    );
  }

  if (screen === "schoolMode") {
    return (
      <Shell>
        <div className="hero">
          <div className="icon-box icon-blue"><Trophy /></div>
          <h1>Skolekampen</h1>
          <p>{schoolBattleSchool}</p>
          <p className="small-note">70 sekunder · Middels nivå</p>
        </div>

        <div className="card input-card">
          <Button
            onClick={() => {
              setGameMode("multiplication");
              setGameLevel("medium");
              setScreen("start");
            }}
            className="full"
          >
            Multiplikasjon
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              setGameMode("division");
              setGameLevel("medium");
              setScreen("start");
            }}
            className="full top-space"
          >
            Divisjon
          </Button>
        </div>

        <Button variant="secondary" onClick={() => openSchoolBattleHighscore(gameMode)} className="full top-space">
          Se highscore
        </Button>

        <Button variant="light" onClick={() => setScreen("school")} className="full top-space">
          Tilbake
        </Button>
      </Shell>
    );
  }

  if (screen === "mode") {
    return (
      <Shell>
        <div className="hero">
          <div className="icon-box icon-blue"><Zap /></div>
          <h1>Normal</h1>
          <p>{getGradeLabel(gameGradeLevel)} - velg hva du vil øve på.</p>
        </div>

        <div className="card input-card">
          <Button onClick={() => { setGameMode("multiplication"); setScreen("start"); }} className="full">Multiplikasjon</Button>
          <Button variant="secondary" onClick={() => { setGameMode("division"); setScreen("start"); }} className="full top-space">Divisjon</Button>
          <Button variant="secondary" onClick={() => { setGameMode("addition"); setGameQuestionCount(10); setScreen("start"); }} className="full top-space">Addisjon</Button>
          <Button variant="secondary" onClick={() => { setGameMode("subtraction"); setGameQuestionCount(10); setScreen("start"); }} className="full top-space">Subtraksjon</Button>
        </div>

        <Button variant="secondary" onClick={() => openHighscore(gameMode, gameLevel, gameGradeLevel, gameQuestionCount)} className="full top-space">Se highscore</Button>
        <Button variant="light" onClick={() => setScreen("grade")} className="full top-space">Tilbake</Button>
        <p className="small-note">Velg trinn og regneart før du starter spillet.</p>
      </Shell>
    );
  }

  if (screen === "qr") {
    return (
      <Shell>
        <div className="hero compact">
          <div className="icon-box icon-yellow"><Zap /></div>
          <h1>QR-kode</h1>
          <p>Skann for å åpne Regnemester.</p>
        </div>

        <div className="card input-card" style={{ alignItems: "center", textAlign: "center" }}>
          <QrCodeImage />
          <p className="small-note">{APP_URL}</p>
        </div>

        <Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button>
      </Shell>
    );
  }

  if (screen === "start") {
    const timeChallenge = gameType === "normal" && isTimeChallengeMode(gameMode);

    return (
      <Shell>
        <div className="hero">
          <div className="icon-box icon-blue"><Zap /></div>
          <h1>{gameType === "school_battle" ? "Skolekampen" : "Regnemester"}</h1>
          <p>
            {timeChallenge
              ? `Hvor raskt klarer du ${gameQuestionCount} ${gameMode === "subtraction" ? "subtraksjonsoppgaver" : "addisjonsoppgaver"}?`
              : gameMode === "multiplication"
                ? `Hvor mange gangestykker klarer du på ${getGameSeconds(gameType)} sekunder?`
                : `Hvor mange divisjonsstykker klarer du på ${getGameSeconds(gameType)} sekunder?`}
          </p>
          {gameType === "school_battle" ? (
            <p className="small-note">{schoolBattleSchool} · Middels nivå · 70 sekunder</p>
          ) : (
            <p className="small-note">
              {getGradeLabel(gameGradeLevel)} · {getLevelDescription(gameMode, gameLevel)}
              {timeChallenge ? ` · Feil svar gir +${ADDITION_PENALTY_SECONDS} sekunder` : ""}
            </p>
          )}
        </div>

        {gameType === "normal" ? (
          <div className="card input-card">
            <label>Velg nivå</label>
            <Button variant={gameLevel === "easy" ? "primary" : "light"} onClick={() => setGameLevel("easy")} className="full">Lett</Button>
            <Button variant={gameLevel === "medium" ? "primary" : "light"} onClick={() => setGameLevel("medium")} className="full top-space">Middels</Button>
            <Button variant={gameLevel === "hard" ? "primary" : "light"} onClick={() => setGameLevel("hard")} className="full top-space">Vanskelig</Button>
          </div>
        ) : (
          <div className="card input-card">
            <label>Skolekampen</label>
            <p className="small-note">Nivået er låst til Middels.</p>
          </div>
        )}

        {timeChallenge && (
          <div className="card input-card">
            <label>Velg antall oppgaver</label>
            {QUESTION_COUNT_OPTIONS.map((count) => (
              <Button key={count} variant={gameQuestionCount === count ? "primary" : "light"} onClick={() => setGameQuestionCount(count)} className="full top-space">
                {count} oppgaver
              </Button>
            ))}
          </div>
        )}

        <div className="card input-card">
          <label htmlFor="player-name">Skriv spillnavn</label>
          <input id="player-name" value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength={18} placeholder="f.eks. Tiger23" autoComplete="off" />
          {nameError && <p className="admin-message">{nameError}</p>}
          <Button onClick={startGame} disabled={!trimmedName} className="full">Start spillet</Button>
        </div>

        <Button variant="light" onClick={() => setScreen(gameType === "school_battle" ? "schoolMode" : "mode")} className="full top-space">Tilbake</Button>
        <p className="small-note">Ikke bruk etternavn. Bruk spillnavn eller fornavn.</p>
      </Shell>
    );
  }

  if (screen === "play") {
    const timeChallenge = gameType === "normal" && isTimeChallengeMode(gameMode);
    const displayedTime = elapsedSeconds + wrongAnswers * ADDITION_PENALTY_SECONDS;

    return (
      <Shell>
        {timeChallenge ? (
          <div className="status-row">
            <div className="status-pill red"><Timer /><span>{formatTime(displayedTime)}</span></div>
            <div className="status-pill green"><Trophy /><span>{questionsDone}/{gameQuestionCount}</span></div>
          </div>
        ) : (
          <div className="status-row">
            <div className="status-pill red"><Timer /><span>{timeLeft} sek</span></div>
            <div className="status-pill green"><Trophy /><span>{score} poeng</span></div>
          </div>
        )}

        <div className="card question-card">
          <p className="label">{timeChallenge ? `Oppgave ${Math.min(questionsDone + 1, gameQuestionCount)} av ${gameQuestionCount}` : "Velg riktig svar"}</p>
          <h2>{question.a} {question.symbol} {question.b} = ?</h2>
        </div>

        <div className="answer-grid">
          {question.options.map((option) => {
            let answerClass = "answer-button";
            if (feedback === "correct" && option === question.correct) answerClass += " correct";
            if (feedback === "wrong" && option !== question.correct) answerClass += " wrong";
            if (feedback === "wrong" && option === question.correct) answerClass += " correct";
            return <button key={option} onClick={() => answer(option)} disabled={Boolean(feedback)} className={answerClass}>{option}</button>;
          })}
        </div>

        <div className="feedback-area">
          {feedback === "correct" && <p className="feedback correct-text">Riktig! +1</p>}
          {feedback === "wrong" && <p className="feedback wrong-text">{timeChallenge ? `Feil! +${ADDITION_PENALTY_SECONDS} sekunder` : "Feil! -1 poeng"}</p>}
          {!feedback && <p className="feedback neutral-text">{timeChallenge ? "Svar riktig og raskt!" : "Svar så raskt du kan!"}</p>}
        </div>
      </Shell>
    );
  }

  if (screen === "result") {
    const timeChallenge = gameType === "normal" && isTimeChallengeMode(gameMode);

    return (
      <Shell>
        <div className="hero compact"><h1>{timeChallenge ? "Ferdig!" : "Tiden er ute!"}</h1></div>

        {timeChallenge ? (
          <div className="card result-card">
            <p>Din tid</p>
            <strong>{formatTime(resultTimeSeconds)}</strong>
            <span>{gameQuestionCount} oppgaver</span>
            <h2>Godt jobbet!</h2>
            <p className="small-note">Riktige: {resultCorrectAnswers} · Feil: {resultWrongAnswers}</p>
          </div>
        ) : (
          <div className="card result-card">
            <p>Du fikk</p>
            <strong>{score}</strong>
            <span>poeng</span>
            <StarsDisplay count={stars} />
            <h2>{getMessage(score)}</h2>
          </div>
        )}

        {scoreMessage && <p className="error-box">{scoreMessage}</p>}

        <div className="stack">
          <Button onClick={startGame}>Spill igjen</Button>
          <Button variant="secondary" onClick={() => (gameType === "school_battle" ? openSchoolBattleHighscore(gameMode) : openHighscore(gameMode, gameLevel, gameGradeLevel, gameQuestionCount))}>Se highscore</Button>
          <Button variant="light" onClick={() => setScreen(gameType === "school_battle" ? "schoolMode" : "mode")}>Tilbake</Button>
        </div>

        <p className="small-note">
          {timeChallenge
            ? `Highscore for ${getModeLabel(gameMode).toLowerCase()} lagrer kun topp 10 korteste tider. Feil svar gir +${ADDITION_PENALTY_SECONDS} sekunder.`
            : "Stjerner vises bare her. Highscore lagrer kun relevante toppresultater."}
        </p>
      </Shell>
    );
  }

  if (screen === "schoolHighscore") {
    return (
      <Shell>
        <div className="hero compact">
          <div className="icon-box icon-yellow"><Crown /></div>
          <h1>Skolekampen</h1>
          <p>{getModeLabel(highscoreMode)} - Topp 20</p>
        </div>

        <div className="card input-card">
          <Button variant={highscoreMode === "multiplication" ? "primary" : "light"} onClick={() => changeSchoolBattleHighscoreMode("multiplication")} className="full">Multiplikasjon</Button>
          <Button variant={highscoreMode === "division" ? "primary" : "light"} onClick={() => changeSchoolBattleHighscoreMode("division")} className="full top-space">Divisjon</Button>
        </div>

        {scoreMessage && <p className="error-box">{scoreMessage}</p>}

        <div className="card highscore-card">
          {scores.length === 0 ? (
            <div className="empty-state"><h2>Ingen resultater ennå</h2><p>Spill en runde i Skolekampen for å lage første score.</p></div>
          ) : (
            <div className="score-list">
              {scores.map((entry, index) => (
                <div key={`${entry.name}-${entry.school}-${entry.score}-${index}`} className="score-row">
                  <div className="score-name">
                    <span className={index === 0 ? "rank rank-first" : "rank"}>{index + 1}</span>
                    <strong>{entry.name}</strong>
                    <small>{entry.school}</small>
                  </div>
                  <span className="score-value">{entry.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="stack"><Button onClick={() => setScreen("schoolMode")}>Tilbake</Button></div>
      </Shell>
    );
  }

  if (screen === "highscore") {
    const timedHighscore = isTimeChallengeMode(highscoreMode);

    return (
      <Shell>
        <div className="hero compact">
          <div className="icon-box icon-yellow"><Crown /></div>
          <h1>Highscore</h1>
          <p>{getHighscoreTitle(highscoreMode, highscoreLevel, highscoreGradeLevel, highscoreQuestionCount)}</p>
        </div>

        <div className="card input-card">
          <Button variant={highscoreMode === "multiplication" ? "primary" : "light"} onClick={() => changeHighscoreMode("multiplication")} className="full">Multiplikasjon</Button>
          <Button variant={highscoreMode === "division" ? "primary" : "light"} onClick={() => changeHighscoreMode("division")} className="full top-space">Divisjon</Button>
          <Button variant={highscoreMode === "addition" ? "primary" : "light"} onClick={() => changeHighscoreMode("addition")} className="full top-space">Addisjon</Button>
          <Button variant={highscoreMode === "subtraction" ? "primary" : "light"} onClick={() => changeHighscoreMode("subtraction")} className="full top-space">Subtraksjon</Button>
        </div>

        <div className="card input-card">
          <Button variant={highscoreLevel === "easy" ? "primary" : "light"} onClick={() => changeHighscoreLevel("easy")} className="full">Lett</Button>
          <Button variant={highscoreLevel === "medium" ? "primary" : "light"} onClick={() => changeHighscoreLevel("medium")} className="full top-space">Middels</Button>
          <Button variant={highscoreLevel === "hard" ? "primary" : "light"} onClick={() => changeHighscoreLevel("hard")} className="full top-space">Vanskelig</Button>
        </div>

        {timedHighscore && (
          <div className="card input-card">
            <label>Antall oppgaver</label>
            {QUESTION_COUNT_OPTIONS.map((count) => (
              <Button key={count} variant={highscoreQuestionCount === count ? "primary" : "light"} onClick={() => changeHighscoreQuestionCount(count)} className="full top-space">
                {count} oppgaver
              </Button>
            ))}
          </div>
        )}

        {scoreMessage && <p className="error-box">{scoreMessage}</p>}

        <div className="card highscore-card">
          {scores.length === 0 ? (
            <div className="empty-state">
              <h2>Ingen resultater ennå</h2>
              <p>
                Spill en runde i {getGradeLabel(highscoreGradeLevel)} med {getModeLabel(highscoreMode).toLowerCase()} på {getLevelLabel(highscoreLevel).toLowerCase()} nivå
                {timedHighscore ? ` med ${highscoreQuestionCount} oppgaver` : ""} for å lage første score.
              </p>
            </div>
          ) : (
            <div className="score-list">
              {scores.map((entry, index) => (
                <div key={`${entry.name}-${entry.score}-${index}`} className="score-row">
                  <div className="score-name"><span className={index === 0 ? "rank rank-first" : "rank"}>{index + 1}</span><strong>{entry.name}</strong></div>
                  <span className="score-value">{timedHighscore ? formatTime(entry.score) : entry.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="stack">
          <Button onClick={() => setScreen("mode")}>Tilbake</Button>
        </div>
      </Shell>
    );
  }

  if (screen === "adminLogin") {
    return (
      <Shell>
        <div className="hero compact">
          <div className="icon-box icon-red"><Shield /></div>
          <h1>Admin</h1>
          <p>Skriv adminkode for å fortsette.</p>
        </div>

        <div className="card input-card">
          <label htmlFor="admin-login-pin">Adminkode</label>
          <input
            id="admin-login-pin"
            value={adminLoginPin}
            onChange={(event) => setAdminLoginPin(event.target.value)}
            type="password"
            inputMode="numeric"
            placeholder="8-sifret kode"
            maxLength={8}
          />
          <Button onClick={validateAdminLogin} disabled={adminLoginPin.trim().length !== 8} className="full">
            Logg inn
          </Button>
          {adminMessage && <p className="admin-message">{adminMessage}</p>}
        </div>

        <Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button>
      </Shell>
    );
  }

  if (screen === "adminHome") {
    return (
      <Shell>
        <div className="hero compact">
          <div className="icon-box icon-red"><Shield /></div>
          <h1>Admin</h1>
          <p>Velg hva du vil administrere.</p>
        </div>

        <div className="card input-card">
          <Button onClick={() => { refreshNormalAdminScores(); setScreen("adminNormal"); }} className="full">Normal highscore</Button>
          <Button variant="secondary" onClick={() => { refreshSchoolBattleScores(highscoreMode); setScreen("adminSchool"); }} className="full top-space">Skolekampen</Button>
        </div>

        <Button variant="light" onClick={() => setScreen("home")} className="full top-space">Tilbake</Button>
      </Shell>
    );
  }

  if (screen === "adminNormal") {
    const timedAdminList = isTimeChallengeMode(adminNormalMode);

    return (
      <Shell>
        <div className="hero compact">
          <div className="icon-box icon-red"><Shield /></div>
          <h1>Normal admin</h1>
          <p>Slett enkeltresultater eller tøm valgt liste.</p>
        </div>

        <div className="card input-card">
          <label>Velg trinn</label>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((grade) => (
            <Button key={grade} variant={adminNormalGradeLevel === grade ? "primary" : "light"} onClick={() => changeAdminNormalGradeLevel(grade)} className="full top-space">
              {getGradeLabel(grade)}
            </Button>
          ))}
        </div>

        <div className="card input-card">
          <label>Velg regneart</label>
          <Button variant={adminNormalMode === "multiplication" ? "primary" : "light"} onClick={() => changeAdminNormalMode("multiplication")} className="full">Multiplikasjon</Button>
          <Button variant={adminNormalMode === "division" ? "primary" : "light"} onClick={() => changeAdminNormalMode("division")} className="full top-space">Divisjon</Button>
          <Button variant={adminNormalMode === "addition" ? "primary" : "light"} onClick={() => changeAdminNormalMode("addition")} className="full top-space">Addisjon</Button>
          <Button variant={adminNormalMode === "subtraction" ? "primary" : "light"} onClick={() => changeAdminNormalMode("subtraction")} className="full top-space">Subtraksjon</Button>
        </div>

        <div className="card input-card">
          <label>Velg nivå</label>
          <Button variant={adminNormalLevel === "easy" ? "primary" : "light"} onClick={() => changeAdminNormalLevel("easy")} className="full">Lett</Button>
          <Button variant={adminNormalLevel === "medium" ? "primary" : "light"} onClick={() => changeAdminNormalLevel("medium")} className="full top-space">Middels</Button>
          <Button variant={adminNormalLevel === "hard" ? "primary" : "light"} onClick={() => changeAdminNormalLevel("hard")} className="full top-space">Vanskelig</Button>
        </div>

        {timedAdminList && (
          <div className="card input-card">
            <label>Antall oppgaver</label>
            {QUESTION_COUNT_OPTIONS.map((count) => (
              <Button key={count} variant={adminNormalQuestionCount === count ? "primary" : "light"} onClick={() => changeAdminNormalQuestionCount(count)} className="full top-space">
                {count} oppgaver
              </Button>
            ))}
          </div>
        )}

        <div className="card highscore-card">
          {scores.length === 0 ? (
            <div className="empty-state"><h2>Ingen resultater</h2><p>Det er ingen resultater på denne listen.</p></div>
          ) : (
            <div className="score-list">
              {scores.map((entry, index) => (
                <div key={`${entry.id}-${entry.name}-${entry.score}-${index}`} className="score-row">
                  <div className="score-name">
                    <span className={index === 0 ? "rank rank-first" : "rank"}>{index + 1}</span>
                    <strong>{entry.name}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="score-value">{timedAdminList ? formatTime(entry.score) : entry.score}</span>
                    {entry.id && (
                      <button type="button" className="button button-danger" onClick={() => deleteNormalScore(entry.id)} style={{ padding: "8px 10px", fontSize: "0.8rem" }}>
                        Slett
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card input-card">
          <p className="small-note">
            Valgt liste: {getGradeLabel(adminNormalGradeLevel)} · {getModeLabel(adminNormalMode)} · {getLevelLabel(adminNormalLevel)}{timedAdminList ? ` · ${adminNormalQuestionCount} oppgaver` : ""}
          </p>
          <Button variant="danger" onClick={resetNormalFromAdmin} className="full">Tøm denne listen</Button>
          {adminMessage && <p className="admin-message">{adminMessage}</p>}
        </div>

        <Button variant="light" onClick={() => setScreen("adminHome")} className="full top-space">Tilbake</Button>
      </Shell>
    );
  }

  if (screen === "adminSchool") {
    return (
      <Shell>
        <div className="hero compact">
          <div className="icon-box icon-red"><Shield /></div>
          <h1>Skolekampen admin</h1>
          <p>Slett enkeltresultater eller nullstill liste.</p>
        </div>

        <div className="card input-card">
          <Button variant={highscoreMode === "multiplication" ? "primary" : "light"} onClick={() => changeSchoolBattleHighscoreMode("multiplication")} className="full">Multiplikasjon</Button>
          <Button variant={highscoreMode === "division" ? "primary" : "light"} onClick={() => changeSchoolBattleHighscoreMode("division")} className="full top-space">Divisjon</Button>
        </div>

        <div className="card highscore-card">
          {scores.length === 0 ? (
            <div className="empty-state"><h2>Ingen resultater</h2><p>Det er ingen Skolekampen-resultater på denne listen.</p></div>
          ) : (
            <div className="score-list">
              {scores.map((entry, index) => (
                <div key={`${entry.id}-${entry.name}-${entry.school}-${entry.score}-${index}`} className="score-row">
                  <div className="score-name">
                    <span className={index === 0 ? "rank rank-first" : "rank"}>{index + 1}</span>
                    <strong>{entry.name}</strong>
                    <small>{entry.school}</small>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="score-value">{entry.score}</span>
                    {entry.id && (
                      <button type="button" className="button button-danger" onClick={() => deleteSchoolBattleScore(entry.id)} style={{ padding: "8px 10px", fontSize: "0.8rem" }}>
                        Slett
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button variant="light" onClick={() => setScreen("adminHome")} className="full top-space">Tilbake</Button>
      </Shell>
    );
  }

  return null;
}
