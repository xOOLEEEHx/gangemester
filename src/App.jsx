import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Crown, Shield, Star, Timer, Trophy, Zap } from "lucide-react";

const GAME_SECONDS = 60;
const STORAGE_KEY = "gangemester_highscores_v1";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const ADMIN_PIN_FALLBACK = import.meta.env.VITE_ADMIN_PIN_FALLBACK || "1992";
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

function randomDivisionWrongAnswer(correct) {
  let candidate = correct;

  while (candidate === correct) {
    candidate = Math.floor(Math.random() * 10) + 1;
  }

  return candidate;
}

function makeOptions(correct, mode) {
  const wrongs = new Set();

  while (wrongs.size < 3) {
    const candidate =
      mode === "division"
        ? randomDivisionWrongAnswer(correct)
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

function makeDivisionQuestion(divisor, answer) {
  const dividend = divisor * answer;
  const correct = answer;

  return {
    mode: "division",
    a: dividend,
    b: divisor,
    symbol: "÷",
    correct,
    options: makeOptions(correct, "division"),
  };
}

function createQuestionDeck(mode = "multiplication") {
  const questions = [];

  if (mode === "division") {
    for (let divisor = 1; divisor <= 10; divisor += 1) {
      for (let answer = 1; answer <= 10; answer += 1) {
        questions.push(makeDivisionQuestion(divisor, answer));
      }
    }

    return shuffle(questions);
  }

  for (let a = 0; a <= 10; a += 1) {
    for (let b = 0; b <= 10; b += 1) {
      questions.push(makeMultiplicationQuestion(a, b));
    }
  }

  return shuffle(questions);
}

function makeQuestion(mode = "multiplication") {
  const deck = createQuestionDeck(mode);
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
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

async function loadScores(mode = "multiplication") {
  if (supabase) {
    const { data, error } = await supabase
      .from("scores")
      .select("name, score, mode")
      .eq("mode", mode)
      .order("score", { ascending: false })
      .limit(10);

    if (!error && data) return sortScores(data);
    throw new Error(error?.message || "Kunne ikke hente highscore.");
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const storedScores = raw ? JSON.parse(raw) : [];
    const filteredScores = storedScores.filter(
      (entry) => (entry.mode || "multiplication") === mode
    );

    return sortScores(filteredScores);
  } catch {
    return [];
  }
}

async function saveScore(entry) {
  if (supabase) {
    const { error } = await supabase.from("scores").insert(entry);
    if (error) throw new Error(error.message || "Kunne ikke lagre score.");
    return;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, entry]));
}

async function clearScores(adminPin, resetMode = "all") {
  if (supabase) {
    const { error } = await supabase.rpc("reset_scores_by_mode", {
      admin_pin: adminPin,
      reset_mode: resetMode,
    });

    if (error) throw new Error(error.message || "Kunne ikke nullstille listen.");
    return;
  }

  if (adminPin !== ADMIN_PIN_FALLBACK) {
    throw new Error("Feil PIN. Prøv igjen.");
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : [];

  if (resetMode === "all") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return;
  }

  const remainingScores = current.filter(
    (entry) => (entry.mode || "multiplication") !== resetMode
  );

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

export default function App() {
  const [screen, setScreen] = useState("mode");
  const [gameMode, setGameMode] = useState("multiplication");
  const [highscoreMode, setHighscoreMode] = useState("multiplication");
  const [playerName, setPlayerName] = useState("");
  const [nameError, setNameError] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [question, setQuestion] = useState(() => makeQuestion("multiplication"));
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
    refreshScores("multiplication");
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

  async function refreshScores(mode = highscoreMode) {
    try {
      const loaded = await loadScores(mode);
      setScores(loaded);
      setScoreMessage("");
    } catch (error) {
      setScoreMessage(error.message);
    }
  }

  function openHighscore(mode = gameMode) {
    setHighscoreMode(mode);
    refreshScores(mode);
    setScreen("highscore");
  }

  function changeHighscoreMode(mode) {
    setHighscoreMode(mode);
    refreshScores(mode);
  }

  function getNextQuestion(mode = gameMode) {
    if (questionDeck.current.length === 0) {
      questionDeck.current = createQuestionDeck(mode);
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
    questionDeck.current = createQuestionDeck(gameMode);
    setScore(0);
    setTimeLeft(GAME_SECONDS);
    setQuestion(getNextQuestion(gameMode));
    setFeedback(null);
    setScreen("play");
  }

  async function finishGame() {
    setScreen("result");
    setFeedback(null);

    if (!savedThisRound.current && trimmedName) {
      savedThisRound.current = true;

      try {
        await saveScore({
          name: trimmedName.slice(0, 18),
          score,
          mode: gameMode,
        });
        setHighscoreMode(gameMode);
        await refreshScores(gameMode);
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
      setQuestion(getNextQuestion(gameMode));
      setFeedback(null);
    }, 450);
  }

  async function resetHighscore() {
    setAdminMessage("");

    try {
      await clearScores(pin, adminResetMode);
      setPin("");

      if (adminResetMode === "all" || adminResetMode === highscoreMode) {
        setScores([]);
      } else {
        await refreshScores(highscoreMode);
      }

      const resetText =
        adminResetMode === "all"
          ? "alle highscore-lister"
          : `${getModeLabel(adminResetMode).toLowerCase()}-listen`;

      setAdminMessage(`Nullstilte ${resetText}.`);
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  if (screen === "mode") {
    return (
      <Shell>
        <div className="hero">
          <div className="icon-box icon-blue">
            <Zap />
          </div>
          <h1>Regnemester</h1>
          <p>Velg hva du vil øve på.</p>
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

        <p className="small-note">Velg regneart før du starter spillet.</p>
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

        <Button variant="secondary" onClick={() => openHighscore(gameMode)} className="full top-space">
          Se highscore
        </Button>

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
          <p>{getModeLabel(highscoreMode)} - Topp 10</p>
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

        {scoreMessage && <p className="error-box">{scoreMessage}</p>}

        <div className="card highscore-card">
          {scores.length === 0 ? (
            <div className="empty-state">
              <h2>Ingen resultater ennå</h2>
              <p>Spill en runde med {getModeLabel(highscoreMode).toLowerCase()} for å lage første score.</p>
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
        <p>Nullstill highscore-listen</p>
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
