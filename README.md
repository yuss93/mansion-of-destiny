# 🏰 Mansion of Destiny

A browser-based adventure game — originally written in C++ as a first-semester project,
then ported to JavaScript for a live portfolio demo.

**By Yusuf Dirawi**

---

## 🎮 How to Play

Open `index.html` in any browser. No server needed.

---

## 🚀 Deploying to GitHub Pages (free)

1. Create a new GitHub repository called `mansion-of-destiny`
2. Upload these 3 files:
   - `index.html`
   - `style.css`
   - `game.js`
3. Go to **Settings → Pages**
4. Under **Source**, select `main` branch → `/ (root)`
5. Click Save
6. Your game is live at: `https://yourusername.github.io/mansion-of-destiny`

---

## 🌍 Setting Up the Global Leaderboard (Supabase)

The game works without this — scores save locally.
To enable a global leaderboard where all players compete:

### Step 1 — Create a free Supabase account
Go to https://supabase.com and sign up (free, no credit card)

### Step 2 — Create a new project
- Give it any name (e.g. "mansion-leaderboard")
- Choose a region close to you
- Wait ~2 minutes for it to spin up

### Step 3 — Create the scores table
In the Supabase dashboard, go to **SQL Editor** and run:

```sql
CREATE TABLE scores (
  id        bigint generated always as identity primary key,
  name      text not null,
  score     integer not null,
  rank      text,
  diff      text,
  played_at timestamp with time zone default now()
);

-- Allow anyone to read and insert (public game)
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scores"
  ON scores FOR SELECT USING (true);

CREATE POLICY "Anyone can insert scores"
  ON scores FOR INSERT WITH CHECK (true);
```

### Step 4 — Get your API keys
In Supabase dashboard:
- Go to **Settings → API**
- Copy your **Project URL** (looks like `https://xxxx.supabase.co`)
- Copy your **anon public** key

### Step 5 — Add keys to game.js
Open `game.js` and find these two lines near the top:

```javascript
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Replace with your actual values:

```javascript
const SUPABASE_URL = "https://xxxx.supabase.co";
const SUPABASE_KEY = "eyJhbGc...your-anon-key...";
```

### Step 6 — Push to GitHub
That's it. The global leaderboard is now live.
All players will see each other's scores and the total player count.

---

## 🗂 File Structure

```
mansion-of-destiny/
├── index.html   — All screens and HTML structure
├── style.css    — Theme system (sky→sunset→dusk→dark→blood)
├── game.js      — All game logic (C++ → JavaScript translation)
└── README.md    — This file
```

---

## 🧠 C++ → JavaScript Translation

| C++ Original | JavaScript Version |
|---|---|
| `class Room` (abstract) | `const ROOMS = [...]` array of room objects |
| `virtual bool playGame() = 0` | `buildAnswerArea(room)` router function |
| `LuckGameRoom : public Room` | `buildLuck(room, aa)` function |
| `player.loseHealth(amt)` | `loseHP(amt)` |
| `cin >> playerGuess` | Button click handler |
| `cout << "Correct!"` | `showFeedback(msg, true)` |
| `usleep(1000000)` | `setTimeout(() => {}, 1000)` |
| `rand() % 5 + 1` | `Math.floor(Math.random() * 5) + 1` |
| `vector<Room> rooms` | `const ROOMS = [...]` |

---

## ✨ Features

- 10 rooms with different game types
- 2 Asura boss encounters with rage mode
- Sky→blood progressive theme
- Walk / Charge / Run approach system
- Inventory with 6 usable items
- NPC ghost merchant between rooms
- Elimination system for luck game and horse race
- Animated horse race with finish line
- Turn-based boss combat with floating damage numbers
- Combo system, first-try bonus, speedrun timer
- Global leaderboard via Supabase
- About screen explaining the C++ → JS story

---

## 📄 Resume Line

```
Mansion of Destiny — Interactive Browser Game
• Originally engineered in C++ using OOP: inheritance,
  polymorphism, abstract classes, vectors
• Translated full game logic from C++ to JavaScript,
  mapping cin/cout to DOM events and Web Audio API
• Features: 10 rooms, turn-based boss combat, inventory system,
  animated horse racing, progressive theme, global leaderboard
• Live demo: https://yourusername.github.io/mansion-of-destiny
Tech: C++, JavaScript, HTML5, CSS3, Web Audio API, Supabase
```
