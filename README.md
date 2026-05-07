# Mansion of Destiny 🏰

A text-based adventure game I built in my first semester using C++, then turned into a live browser game you can actually play.

## The Story

In my first semester I had a final project — build a game in C++ using object-oriented programming. I made a mansion adventure where you go room by room solving different challenges to survive.

The game worked, but it only ran in the terminal. So I decided to take it further and convert it into a web version that anyone can play without installing anything.

**Play it here →  https://yuss93.github.io/mansion-of-destiny/

---

## What I used

- C++ for the original terminal version
- HTML, CSS, JavaScript for the web version
- Web Audio API for sounds (no audio files needed)
- Supabase for the global leaderboard
- localStorage as backup when offline

---

## What the game has

- 10 rooms, each with a different challenge
- Guess the number, secret word, math equations, rock paper scissors, horse racing, riddles, binary decoding, logic puzzles
- Two Asura boss fights — the second one is harder with rage mode
- Inventory system with 6 usable items
- Global leaderboard so players can compete

---

## How C++ became JavaScript

The logic is the same, just different syntax. For example:

| C++ | JavaScript |
|---|---|
| `cin >> guess` | button click |
| `cout << "Correct!"` | `element.textContent` |
| `usleep(1000000)` | `setTimeout(() => {}, 1000)` |
| `rand() % 5 + 1` | `Math.floor(Math.random() * 5) + 1` |
| `player.loseHealth(10)` | `loseHP(10)` |
| `vector<Room> rooms` | `const ROOMS = [...]` |

The original C++ used inheritance and polymorphism — `Room` was an abstract base class and each room type extended it. In JavaScript I kept the same structure using objects and functions.

---

## Running it locally

Just download the 3 files and open `index.html` in your browser. No setup needed.

```
index.html
style.css
game.js
```

---

## Original C++ files

The original terminal version is in the `/cpp` folder if you want to see where this started.
