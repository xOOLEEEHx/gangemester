import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Crown, Shield, Star, Timer, Trophy, Zap } from "lucide-react";

const GAME_SECONDS = 60;
const STORAGE_KEY = "gangemester_highscores_v1";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const ADMIN_PIN_FALLBACK = import.meta.env.VITE_ADMIN_PIN_FALLBACK || "1992";

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

function makeQuestion() {
  const a = Math.floor(Math.random() * 11);
  const b = Math.floor(Math.random() * 11);
  const correct = a * b;

  const wrongs = new Set();
  while (wrongs.size < 3) {
    const candidate = randomWrongAnswer(correct);
    if (candidate !== correct) wrongs.add(candidate);
  }

  return {
    a,
    b,
    correct,
    options: shuffle([correct, ...wrongs]),
  };
}

function getStars(score) {
  if (score >= 30) return 5;
  if (score >= 20) return 4;
  if (score >= 15) return 3;
  if (score >= 8) return 2;
  return 1;
}

function getMessage(score) {
  if (score >= 30) return "Gangemester!";
  if (score >= 20) return "Kjempebra!";
  if (score >= 15) return "Sterkt jobbet!";
  if (score >= 8) return "Bra innsats!";
  return "God start!";
}

function sortScores(scores) {
  return [...scores]
    .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(Number(entry.score)))
    .map((entry) => ({ name: entry.name, score: Number(entry.score) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

async function loadScores() {
  if (supabase) {
    const { data, error } = await supabase
      .from("scores")
      .select("name, score")
      .order("score", { ascending: false })
      .limit(10);

    if (!error && data) return sortScores(data);
    throw new Error(error?.message || "Kunne ikke hente highscore.");
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sortScores(raw ? JSON.parse(raw) : []);
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

  const current = await loadScores();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortScores([...current, entry])));
}

async function clearScores(adminPin) {
  if (supabase) {
    const { error } = await supabase.rpc("reset_scores", { admin_pin: adminPin });
    if (error) throw new Error(error.message || "Kunne ikke nullstille listen.");
    return;
  }

  if (adminPin !== ADMIN_PIN_FALLBACK) {
    throw new Error("Feil PIN. Prøv igjen.");
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
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
  const [screen, setScreen] = useState("start");
  const [playerName, setPlayerName] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [question, setQuestion] = useState(() => makeQuestion());
  const [feedback, setFeedback] = useState(null);
  const [scores, setScores] = useState([]);
  const [pin, setPin] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [scoreMessage, setScoreMessage] = useState("");
  const savedThisRound = useRef(false);

  const trimmedName = playerName.trim();
  const stars = useMemo(() => getStars(score), [score]);

  useEffect(() => {
    refreshScores();
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

  async function refreshScores() {
    try {
      const loaded = await loadScores();
      setScores(loaded);
      setScoreMessage("");
    } catch (error) {
      setScoreMessage(error.message);
    }
  }

  function startGame() {
    if (!trimmedName) return;

    savedThisRound.current = false;
    setScore(0);
    setTimeLeft(GAME_SECONDS);
    setQuestion(makeQuestion());
    setFeedback(null);
    setScreen("play");
  }

  async function finishGame() {
    setScreen("result");
    setFeedback(null);

    if (!savedThisRound.current && trimmedName) {
      savedThisRound.current = true;

      try {
        await saveScore({ name: trimmedName.slice(0, 18), score });
        await refreshScores();
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
      setQuestion(makeQuestion());
      setFeedback(null);
    }, 450);
  }

  async function resetHighscore() {
    setAdminMessage("");

    try {
      await clearScores(pin);
      setScores([]);
      setPin("");
      setAdminMessage("Highscore-listen er nullstilt.");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  if (screen === "start") {
    return (
      <Shell>
        <div className="hero">
          <div className="icon-box icon-blue">
            <Zap />
          </div>
          <h1>Gangemester</h1>
          <p>Hvor mange gangestykker klarer du på 60 sekunder?</p>
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
          <Button onClick={startGame} disabled={!trimmedName} className="full">
            Start spillet
          </Button>
        </div>

        <Button variant="secondary" onClick={() => setScreen("highscore")} className="full top-space">
          Se highscore
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
            {question.a} × {question.b} = ?
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
          <Button variant="secondary" onClick={() => setScreen("highscore")}>
            Se highscore
          </Button>
          <Button variant="light" onClick={() => setScreen("start")}>
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
          <p>Topp 10</p>
        </div>

        {scoreMessage && <p className="error-box">{scoreMessage}</p>}

        <div className="card highscore-card">
          {scores.length === 0 ? (
            <div className="empty-state">
              <h2>Ingen resultater ennå</h2>
              <p>Spill en runde for å lage første score.</p>
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
          <Button onClick={() => setScreen("start")}>Spill</Button>
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
        <label htmlFor="admin-pin">Skriv PIN</label>
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
