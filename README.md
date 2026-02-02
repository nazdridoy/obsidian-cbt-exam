# CBT Exam Simulator

[![GitHub Release](https://img.shields.io/github/v/release/nazdridoy/obsidian-cbt-exam?style=for-the-badge&color=blue)](https://github.com/nazdridoy/obsidian-cbt-exam/releases)

**CBT Exam Simulator** is an [Obsidian](https://obsidian.md/) plugin that turns your notes into interactive, timed exams. It uses the simple **FlashQuiz** format to render realistic computer-based testing (CBT) environments directly in your vault.

## Features

- **🎓 Realistic Exam Environment**: Full-screen modal with countdown timer, question navigation, and review flagging.
- **⚡ FlashQuiz Format**: Supports a clean, human-readable text syntax (`@mc`, `@tf`, etc.)—no complex JSON or YAML needed.
- **📊 Robust Scoring**: 
  - Real-time grading engine.
  - Detailed results summary with pass/fail status.
  - Review mode to check your answers against the key.
- **� Privacy First**: Runs entirely offline in your vault.

## Supported Question Types

The simulator parses the following 7 question types from your plain text notes:

| Type | Syntax | Description |
|------|--------|-------------|
| **Multiple Choice** | `@mc` | Standard single-answer questions |
| **Select All** | `@sata` | Multiple correct options |
| **True/False** | `@tf` | Simple binary choice |
| **Fill in the Blank** | `@fib` | Type answers for missing words |
| **Matching** | `@match` | Pair items from two columns |
| **Short Answer** | `@sa` | Open-ended text input |
| **Long Answer** | `@la` | Extended text response |

---

## Installation

### From Community Plugins
_Coming soon to the Obsidian Community Plugins list!_

### Manual Installation
1. Download the latest `main.js`, `manifest.json`, and `styles.css` from the [Releases](https://github.com/nazdridoy/obsidian-cbt-exam/releases) page.
2. Create a folder named `obsidian-cbt-exam` in your vault's `.obsidian/plugins/` directory.
3. Move the downloaded files into that folder.
4. Enable **CBT Exam Simulator** in Obsidian Settings > Community Plugins.

---

## Usage

### 1. Create a Quiz File
Create a new note and write your questions using the FlashQuiz syntax.

#### Example File (`quiz.md`)
```text
---
quiz-title: "Comprehensive Example Quiz"
time-limit: 30
pass-score: 70
shuffle: true
show-answer: true
---

# Multiple Choice (@mc)

@mc 1) Which planet is known as the Red Planet?
a) Venus
b) Mars
c) Jupiter
d) Saturn
= b

@mc 2) What is the chemical symbol for Gold?
a) Au
b) Ag
c) Fe
d) Pb
= a

@mc 3) Who painted the Mona Lisa?
a) Vincent van Gogh
b) Pablo Picasso
c) Leonardo da Vinci
d) Michelangelo
= c

---

# Select All That Apply (@sata)

@sata 4) Which of the following are noble gases? (Select all that apply)
a) Helium
b) Oxygen
c) Neon
d) Nitrogen
e) Argon
= a, c, e

@sata 5) Which numbers are prime?
a) 2
b) 4
c) 7
d) 9
e) 11
= a, c, e

@sata 6) Which of these are continents?
a) Africa
b) Greenland
c) Australia
d) India
e) Antarctica
= a, c, e

---

# True / False (@tf)

@tf 7) The sun rises in the West.
= false

@tf 8) Water boils at 100 degrees Celsius at sea level.
= true

@tf 9) Spiders are insects.
= false

---

# Fill In The Blank (@fib)

@fib 10) The capital of France is `_______`.
= Paris

@fib 11) `_______` is the largest mammal in the world.
= Blue Whale

@fib 12) H2O is the chemical formula for `_______`.
= Water

---

# Matching (@match)

@match 13) Match the country to its capital.
France | Paris
Japan | Tokyo
Egypt | Cairo
Brazil | Brasilia

@match 14) Match the animal to its group.
Frog | Amphibian
Eagle | Bird
Shark | Fish
Dog | Mammal

@match 15) Match the currency to the country.
Dollar | USA
Yen | Japan
Euro | Germany
Pound | UK

---

# Short Answer (@sa)

@sa 16) What is the process by which plants make food?
= Photosynthesis

@sa 17) How many sides does a hexagon have?
= 6

@sa 18) Name the largest ocean on Earth.
= Pacific

---

# Long Answer (@la)

@la 19) Explain the water cycle in your own words.
= Evaporation, condensation, precipitation.

@la 20) Describe the main causes of World War I.
= Alliances, Imperialism, Militarism, Nationalism.

@la 21) What defines a "tragic hero" in literature?
= A protagonist with a fatal flaw leading to their downfall.

```

### 2. Start the Exam
- **Ribbon Icon**: Click the graduation cap icon 🎓 in the left ribbon while viewing your quiz file.
- **Command Palette**: Press `Ctrl/Cmd + P` and search for **"Start Exam from current file"**.

### 3. Take the Exam
The exam modal will open with:
- **Timer**: Counts down based on your `time-limit`.
- **Navigation**: Jump between questions using the sidebar or Next/Prev buttons.
- **Flag for Review**: Mark unsure questions to revisit them later.

### 4. Results
Click **Submit** (or wait for the timer to run out) to see your score, percentage, and a breakdown of your answers.

---

## FlashQuiz Syntax Reference

| Marker | Type | Answer Format (`=`) |
|--------|------|---------------------|
| `@mc` | Multiple Choice | `= a` (letter of correct option) |
| `@sata` | Select All | `= a, c` (comma separated) |
| `@tf` | True/False | `= true` or `= false` |
| `@fib` | Fill in Blank | `= answer1, answer2` (in order) |
| `@match` | Matching | _(None, pairs are defined in text)_ |
| `@sa` | Short Answer | `= Expected Answer Text` |
| `@la` | Long Answer | `= Expected Model Answer` |

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
