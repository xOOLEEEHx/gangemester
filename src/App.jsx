import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Crown, Shield, Star, Timer, Trophy, Zap } from "lucide-react";

const GAME_SECONDS = 60;
const STORAGE_KEY = "gangemester_highscores_v1";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const ADMIN_PIN_FALLBACK = import.meta.env.VITE_ADMIN_PIN_FALLBACK || "1992";
const APP_URL = "https://regnemester.vercel.app/";
const BLOCKED_CONTAINS = [
  // Norske banneord / grovt språk
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

  // Kropp, doord og typisk barneskole-tulling
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

  // Norske fornærmelser / mobbeord
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

  // Seksuelle ord / ikke barnevennlig
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

  // Engelske banneord / grove ord
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

  // Vold / trusler / mørkt innhold
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

  // Hat, ekstremisme og uønskede navn i skolebruk
  "nazi",
  "nazist",
  "hitler",
  "rasist",
  "racist",
  "terror",
  "terrorist",
  "isis",
  "kkk",

  // Rus / alkohol
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

const BLOCKED_EXACT = [
  // Ord som kan gi rare treff hvis de bare søkes som deler av andre ord
  "ass",
  "tit",
  "poo",
  "pee",
  "die",
  "dum",
  "slem",
  "stygg",
  "feit",
  "teit",
];

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

  if (cleanName.length < 3) {
    return "Spillnavnet må ha minst 3 tegn.";
  }

  if (cleanName.length > 18) {
    return "Spillnavnet kan maks ha 18 tegn.";
  }

  if (!/^[a-zA-ZæøåÆØÅ0-9-]+$/.test(cleanName)) {
    return "Bruk bare bokstaver, tall eller bindestrek.";
  }

  if (/^\d+$/.test(cleanName)) {
    return "Spillnavnet kan ikke bare være tall.";
  }

  const normalized = normalizeNameForCheck(cleanName);

  const hasBlockedContainsWord = BLOCKED_CONTAINS.some((word) =>
    normalized.includes(normalizeNameForCheck(word))
  );

  const hasBlockedExactWord = BLOCKED_EXACT.some(
    (word) => normalized === normalizeNameForCheck(word)
  );

  if (hasBlockedContainsWord || hasBlockedExactWord) {
    return "Velg et annet spillnavn. Bruk et hyggelig navn.";
  }

  return "";
}

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function randomWrongAnswer(correct) {
  if (correct === 0) {
    return Math.floor(Math.random() * 20) + 1;
  }

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

  while (candidate === correct) {
    candidate = Math.floor(Math.random() * max) + 1;
  }

  return candidate;
}

function makeOptions(correct, mode, max = 10) {
  const wrongs = new Set();

  while (wrongs.size < 3) {
    const candidate =
      mode === "division"
        ? randomDivisionWrongAnswer(correct, max)
        : randomWrongAnswer(correct);

    if (candidate !== correct) wrongs.add(candidate);
  }

  return shuffle([correct, ...wrongs]);
}

function makeMultiplicationQuestion(a, b) {
  const correct = a * b;

  return {
    mode: "multiplication",
    a,
    b,
    symbol: "×",
    correct,
    options: makeOptions(correct, "multiplication"),
  };
}

function makeDivisionQuestion(divisor, answer, max = 10) {
  const dividend = divisor * answer;
  const correct = answer;

  return {
    mode: "division",
    a: dividend,
    b: divisor,
    symbol: "÷",
    correct,
    options: makeOptions(correct, "division", max),
  };
}

function getLevelMax(level = "medium", mode = "multiplication") {
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

  if (mode === "division") {
    return `${getLevelLabel(level)}: deling med tall fra 1–${max}`;
  }

  return `${getLevelLabel(level)}: gangestykker fra 0–${max}`;
}

function createQuestionDeck(mode = "multiplication", level = "medium") {
  const questions = [];
  const max = getLevelMax(level, mode);

  if (mode === "division") {
    for (let divisor = 1; divisor <= max; divisor += 1) {
      for (let answer = 1; answer <= max; answer += 1) {
        questions.push(makeDivisionQuestion(divisor, answer, max));
      }
    }

    return shuffle(questions);
  }

  for (let a = 0; a <= max; a += 1) {
    for (let b = 0; b <= max; b += 1) {
      questions.push(makeMultiplicationQuestion(a, b));
    }
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
  return mode === "division" ? "Divisjon" : "Multiplikasjon";
}

function getGradeLabel(gradeLevel) {
  if (Number(gradeLevel) === 8) return "Eldre";
  return `${gradeLevel}. klasse`;
}

function getHighscoreTitle(mode, level, gradeLevel) {
  return `${getGradeLabel(gradeLevel)} - ${getModeLabel(mode)} - ${getLevelLabel(level)} - Topp 10`;
}

function sortScores(scores) {
  return [...scores]
    .filter(
      (entry) =>
        entry &&
        typeof entry.name === "string" &&
        Number.isFinite(Number(entry.score))
    )
    .map((entry) => ({
      name: entry.name,
      score: Number(entry.score),
      mode: entry.mode || "multiplication",
      level: entry.level || "medium",
      grade_level: Number(entry.grade_level || 4),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

async function loadScores(mode = "multiplication", level = "medium", gradeLevel = 4) {
  if (supabase) {
    const { data, error } = await supabase
      .from("scores")
      .select("name, score, mode, level, grade_level")
      .eq("mode", mode)
      .eq("level", level)
      .eq("grade_level", gradeLevel)
      .order("score", { ascending: false })
      .limit(10);

    if (!error && data) return sortScores(data);
    throw new Error(error?.message || "Kunne ikke hente highscore.");
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const storedScores = raw ? JSON.parse(raw) : [];
    const filteredScores = storedScores.filter(
      (entry) =>
        (entry.mode || "multiplication") === mode &&
        (entry.level || "medium") === level &&
        Number(entry.grade_level || 4) === Number(gradeLevel)
    );

    return sortScores(filteredScores);
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

    return {
      saved: Boolean(result?.saved),
      message: result?.message || "Resultatet er sjekket mot highscore-listen.",
    };
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];
  const matchingScores = current
    .filter(
      (storedEntry) =>
        (storedEntry.mode || "multiplication") === entry.mode &&
        (storedEntry.level || "medium") === entry.level &&
        Number(storedEntry.grade_level || 4) === Number(entry.grade_level)
    )
    .sort((a, b) => Number(b.score) - Number(a.score));

  const lowestTopScore = matchingScores[9]?.score;
  const shouldSave = matchingScores.length < 10 || entry.score > Number(lowestTopScore);

  if (!shouldSave) {
    return {
      saved: false,
      message: `Du fikk ${entry.score} poeng. Det holdt ikke til topp 10 denne gangen.`,
    };
  }

  const updatedScores = [...current, entry];
  const trimmedScores = updatedScores.filter((storedEntry) => {
    const sameList =
      (storedEntry.mode || "multiplication") === entry.mode &&
      (storedEntry.level || "medium") === entry.level &&
      Number(storedEntry.grade_level || 4) === Number(entry.grade_level);

    if (!sameList) return true;

    const sameListScores = updatedScores
      .filter(
        (scoreEntry) =>
          (scoreEntry.mode || "multiplication") === entry.mode &&
          (scoreEntry.level || "medium") === entry.level &&
          Number(scoreEntry.grade_level || 4) === Number(entry.grade_level)
      )
      .sort((a, b) => Number(b.score) - Number(a.score))
      .slice(0, 10);

    return sameListScores.includes(storedEntry);
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedScores));

  return {
    saved: true,
    message: "Du kom på highscore-listen!",
  };
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

  if (adminPin !== ADMIN_PIN_FALLBACK) {
    throw new Error("Feil PIN. Prøv igjen.");
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];

  const remainingScores = current.filter((entry) => {
    const entryGrade = Number(entry.grade_level || 4);
    const entryMode = entry.mode || "multiplication";

    if (entryGrade !== Number(resetGradeLevel)) return true;
    if (resetMode === "all") return false;
    return entryMode !== resetMode;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingScores));
}

function Button({ children, onClick, variant = "primary", disabled = false, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`button button-${variant} ${className}`}
    >
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

  return (
    <img
      src={qrUrl}
      alt="QR-kode til Regnemester"
      style={{ width: "260px", height: "260px", maxWidth: "100%", borderRadius: "18px" }}
    />
  );
}

export default function App() {
  const [screen, setScreen] = useState("grade");
  const [gameGradeLevel, setGameGradeLevel] = useState(null);
  const [gameMode, setGameMode] = useState("multiplication");
  const [gameLevel, setGameLevel] = useState("medium");
  const [highscoreGradeLevel, setHighscoreGradeLevel] = useState(4);
  const [highscoreMode, setHighscoreMode] = useState("multiplication");
  const [highscoreLevel, setHighscoreLevel] = useState("medium");
  const [playerName, setPlayerName] = useState("");
  const [nameError, setNameError] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [question, setQuestion] = useState(() => makeQuestion("multiplication", "medium"));
  const [feedback, setFeedback] = useState(null);
  const [scores, setScores] = useState([]);
  const [pin, setPin] = useState("");
  const [adminResetMode, setAdminResetMode] = useState("all");
  const [adminMessage, setAdminMessage] = useState("");
  const [scoreMessage, setScoreMessage] = useState("");
  const savedThisRound = useRef(false);
  const questionDeck = useRef([]);

  const trimmedName = playerName.trim();
  const stars = useMemo(() => getStars(score), [score]);

  useEffect(() => {
    refreshScores("multiplication", "medium", 4);
  }, []);

  useEffect(() => {
    if (screen !== "play") return;

    if (timeLeft <= 0) {
      finishGame();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [screen, timeLeft]);

  async function refreshScores(mode = highscoreMode, level = highscoreLevel, gradeLevel = highscoreGradeLevel) {
    try {
      const loaded = await loadScores(mode, level, gradeLevel);
      setScores(loaded);
      setScoreMessage("");
    } catch (error) {
      setScoreMessage(error.message);
    }
  }

  function openHighscore(mode = gameMode, level = gameLevel, gradeLevel = gameGradeLevel) {
    setHighscoreMode(mode);
    setHighscoreLevel(level);
    setHighscoreGradeLevel(gradeLevel);
    refreshScores(mode, level, gradeLevel);
    setScreen("highscore");
  }

  function changeHighscoreMode(mode) {
    setHighscoreMode(mode);
    refreshScores(mode, highscoreLevel, highscoreGradeLevel);
  }

  function changeHighscoreLevel(level) {
    setHighscoreLevel(level);
    refreshScores(highscoreMode, level, highscoreGradeLevel);
  }

  function changeHighscoreGradeLevel(gradeLevel) {
    setHighscoreGradeLevel(gradeLevel);
    refreshScores(highscoreMode, highscoreLevel, gradeLevel);
  }

  function getNextQuestion(mode = gameMode, level = gameLevel) {
    if (questionDeck.current.length === 0) {
      questionDeck.current = createQuestionDeck(mode, level);
    }

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
    setTimeLeft(GAME_SECONDS);
    setQuestion(getNextQuestion(gameMode, gameLevel));
    setFeedback(null);
    setScreen("play");
  }

  async function finishGame() {
    setScreen("result");
    setFeedback(null);

    if (!savedThisRound.current && trimmedName) {
      savedThisRound.current = true;

      try {
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
        await refreshScores(gameMode, gameLevel, gameGradeLevel);

        if (saveResult.saved) {
          setScoreMessage(`Du fikk ${score} poeng. ${saveResult.message}`);
        } else {
          setScoreMessage(`Du fikk ${score} poeng. ${saveResult.message}`);
        }
      } catch (error) {
        setScoreMessage(error.message);
      }
    }
  }

  function answer(value) {
    if (feedback) return;

    const isCorrect = value === question.correct;

    if (isCorrect) {
      setScore((current) => current + 1);
      setFeedback("correct");
    } else {
      setFeedback("wrong");
    }

    setTimeout(() => {
      setQuestion(getNextQuestion(gameMode, gameLevel));
      setFeedback(null);
    }, 450);
  }

  async function resetHighscore() {
    setAdminMessage("");

    try {
      await clearScores(pin, adminResetMode, highscoreGradeLevel);
      setPin("");

      if (adminResetMode === "all" || adminResetMode === highscoreMode) {
        setScores([]);
      } else {
        await refreshScores(highscoreMode, highscoreLevel, highscoreGradeLevel);
      }

      const resetText =
        adminResetMode === "all"
          ? "alle highscore-lister"
          : `${getModeLabel(adminResetMode).toLowerCase()}-listen`;

      setAdminMessage(`Nullstilte ${resetText} for ${getGradeLabel(highscoreGradeLevel)}.`);
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  if (screen === "grade") {
    return (
      <Shell>
        <div className="hero">
          <div className="icon-box icon-blue">
            <Zap />
          </div>
          <h1>Regnemester</h1>
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

        <Button variant="light" onClick={() => setScreen("qr")} className="full top-space">
          Vis QR-kode
        </Button>
      </Shell>
    );
  }

  if (screen === "mode") {
    return (
      <Shell>
        <div className="hero">
          <div className="icon-box icon-blue">
            <Zap />
          </div>
          <h1>Regnemester</h1>
          <p>{getGradeLabel(gameGradeLevel)} - velg hva du vil øve på.</p>
        </div>

        <div className="card input-card">
          <Button
            onClick={() => {
              setGameMode("multiplication");
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
              setScreen("start");
            }}
            className="full top-space"
          >
            Divisjon
          </Button>
        </div>

        <Button variant="secondary" onClick={() => openHighscore(gameMode, gameLevel, gameGradeLevel)} className="full top-space">
          Se highscore
        </Button>

        <Button variant="light" onClick={() => setScreen("grade")} className="full top-space">
          Bytt trinn
        </Button>

        <Button variant="light" onClick={() => setScreen("qr")} className="full top-space">
          Vis QR-kode
        </Button>

        <p className="small-note">Velg trinn og regneart før du starter spillet.</p>
      </Shell>
    );
  }

  if (screen === "qr") {
    return (
      <Shell>
        <div className="hero compact">
          <div className="icon-box icon-yellow">
            <Zap />
          </div>
          <h1>QR-kode</h1>
          <p>Skann for å åpne Regnemester.</p>
        </div>

        <div className="card input-card" style={{ alignItems: "center", textAlign: "center" }}>
          <QrCodeImage />
          <p className="small-note">{APP_URL}</p>
        </div>

        <Button variant="light" onClick={() => setScreen("grade")} className="full top-space">
          Tilbake
        </Button>
      </Shell>
    );
  }

  if (screen === "start") {
    return (
      <Shell>
        <div className="hero">
          <div className="icon-box icon-blue">
            <Zap />
          </div>
          <h1>Regnemester</h1>
          <p>
            {gameMode === "multiplication"
              ? "Hvor mange gangestykker klarer du på 60 sekunder?"
              : "Hvor mange divisjonsstykker klarer du på 60 sekunder?"}
          </p>
          <p className="small-note">{getGradeLabel(gameGradeLevel)} · {getLevelDescription(gameMode, gameLevel)}</p>
        </div>

        <div className="card input-card">
          <label>Velg nivå</label>

          <Button
            variant={gameLevel === "easy" ? "primary" : "light"}
            onClick={() => setGameLevel("easy")}
            className="full"
          >
            Lett
          </Button>

          <Button
            variant={gameLevel === "medium" ? "primary" : "light"}
            onClick={() => setGameLevel("medium")}
            className="full top-space"
          >
            Middels
          </Button>

          <Button
            variant={gameLevel === "hard" ? "primary" : "light"}
            onClick={() => setGameLevel("hard")}
            className="full top-space"
          >
            Vanskelig
          </Button>
        </div>

        <div className="card input-card">
          <label htmlFor="player-name">Skriv spillnavn</label>
          <input
            id="player-name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            maxLength={18}
            placeholder="f.eks. Tiger23"
            autoComplete="off"
          />

          {nameError && <p className="admin-message">{nameError}</p>}

          <Button onClick={startGame} disabled={!trimmedName} className="full">
            Start spillet
          </Button>
        </div>

        <Button variant="light" onClick={() => setScreen("mode")} className="full top-space">
          Bytt spilltype
        </Button>

        <p className="small-note">Ikke bruk etternavn. Bruk spillnavn eller fornavn.</p>
      </Shell>
    );
  }

  if (screen === "play") {
    return (
      <Shell>
        <div className="status-row">
          <div className="status-pill red">
            <Timer />
            <span>{timeLeft} sek</span>
          </div>
          <div className="status-pill green">
            <Trophy />
            <span>{score} poeng</span>
          </div>
        </div>

        <div className="card question-card">
          <p className="label">Velg riktig svar</p>
          <h2>
            {question.a} {question.symbol} {question.b} = ?
          </h2>
        </div>

        <div className="answer-grid">
          {question.options.map((option) => {
            let answerClass = "answer-button";

            if (feedback === "correct" && option === question.correct) answerClass += " correct";
            if (feedback === "wrong" && option !== question.correct) answerClass += " wrong";
            if (feedback === "wrong" && option === question.correct) answerClass += " correct";

            return (
              <button
                key={option}
                onClick={() => answer(option)}
                disabled={Boolean(feedback)}
                className={answerClass}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="feedback-area">
          {feedback === "correct" && <p className="feedback correct-text">Riktig! +1</p>}
          {feedback === "wrong" && <p className="feedback wrong-text">Nesten! Prøv neste.</p>}
          {!feedback && <p className="feedback neutral-text">Svar så raskt du kan!</p>}
        </div>
      </Shell>
    );
  }

  if (screen === "result") {
    return (
      <Shell>
        <div className="hero compact">
          <h1>Tiden er ute!</h1>
        </div>

        <div className="card result-card">
          <p>Du fikk</p>
          <strong>{score}</strong>
          <span>poeng</span>
          <StarsDisplay count={stars} />
          <h2>{getMessage(score)}</h2>
        </div>

        {scoreMessage && <p className="error-box">{scoreMessage}</p>}

        <div className="stack">
          <Button onClick={startGame}>Spill igjen</Button>
          <Button variant="secondary" onClick={() => openHighscore(gameMode)}>
            Se highscore
          </Button>
          <Button variant="light" onClick={() => setScreen("mode")}>
            Til start
          </Button>
        </div>

        <p className="small-note">Stjerner vises bare her. Highscore lagrer kun navn og poeng.</p>
      </Shell>
    );
  }

  if (screen === "highscore") {
    return (
      <Shell>
        <div className="hero compact">
          <div className="icon-box icon-yellow">
            <Crown />
          </div>
          <h1>Highscore</h1>
          <p>{getHighscoreTitle(highscoreMode, highscoreLevel, highscoreGradeLevel)}</p>
        </div>

        <div className="card input-card">
          <Button
            variant={highscoreMode === "multiplication" ? "primary" : "light"}
            onClick={() => changeHighscoreMode("multiplication")}
            className="full"
          >
            Multiplikasjon
          </Button>

          <Button
            variant={highscoreMode === "division" ? "primary" : "light"}
            onClick={() => changeHighscoreMode("division")}
            className="full top-space"
          >
            Divisjon
          </Button>
        </div>

        <div className="card input-card">
          <Button
            variant={highscoreLevel === "easy" ? "primary" : "light"}
            onClick={() => changeHighscoreLevel("easy")}
            className="full"
          >
            Lett
          </Button>

          <Button
            variant={highscoreLevel === "medium" ? "primary" : "light"}
            onClick={() => changeHighscoreLevel("medium")}
            className="full top-space"
          >
            Middels
          </Button>

          <Button
            variant={highscoreLevel === "hard" ? "primary" : "light"}
            onClick={() => changeHighscoreLevel("hard")}
            className="full top-space"
          >
            Vanskelig
          </Button>
        </div>

        {scoreMessage && <p className="error-box">{scoreMessage}</p>}

        <div className="card highscore-card">
          {scores.length === 0 ? (
            <div className="empty-state">
              <h2>Ingen resultater ennå</h2>
              <p>Spill en runde i {getGradeLabel(highscoreGradeLevel)} med {getModeLabel(highscoreMode).toLowerCase()} på {getLevelLabel(highscoreLevel).toLowerCase()} nivå for å lage første score.</p>
            </div>
          ) : (
            <div className="score-list">
              {scores.map((entry, index) => (
                <div key={`${entry.name}-${entry.score}-${index}`} className="score-row">
                  <div className="score-name">
                    <span className={index === 0 ? "rank rank-first" : "rank"}>{index + 1}</span>
                    <strong>{entry.name}</strong>
                  </div>
                  <span className="score-value">{entry.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="stack">
          <Button onClick={() => setScreen("mode")}>Spill</Button>
          <Button variant="light" onClick={() => setScreen("admin")}>
            Admin
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="hero compact">
        <div className="icon-box icon-red">
          <Shield />
        </div>
        <h1>Admin</h1>
        <p>Nullstill highscore-listen for {getGradeLabel(highscoreGradeLevel)}</p>
      </div>

      <div className="card input-card">
        <label>Hva vil du nullstille?</label>

        <Button
          variant={adminResetMode === "multiplication" ? "primary" : "light"}
          onClick={() => setAdminResetMode("multiplication")}
          className="full"
        >
          Multiplikasjon
        </Button>

        <Button
          variant={adminResetMode === "division" ? "primary" : "light"}
          onClick={() => setAdminResetMode("division")}
          className="full top-space"
        >
          Divisjon
        </Button>

        <Button
          variant={adminResetMode === "all" ? "danger" : "light"}
          onClick={() => setAdminResetMode("all")}
          className="full top-space"
        >
          Alt
        </Button>

        <label htmlFor="admin-pin" className="top-space">Skriv PIN</label>
        <input
          id="admin-pin"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          type="password"
          inputMode="numeric"
          placeholder="PIN"
        />
        <Button variant="danger" onClick={resetHighscore} className="full">
          Nullstill highscore
        </Button>
        {adminMessage && <p className="admin-message">{adminMessage}</p>}
      </div>

      <Button variant="light" onClick={() => setScreen("highscore")} className="full top-space">
        Tilbake
      </Button>
    </Shell>
  );
}
