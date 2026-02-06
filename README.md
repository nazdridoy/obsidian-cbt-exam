# CBT Exam Simulator

[![GitHub Release](https://img.shields.io/github/v/release/nazdridoy/obsidian-cbt-exam?style=for-the-badge&color=blue)](https://github.com/nazdridoy/obsidian-cbt-exam/releases)

An [Obsidian](https://obsidian.md/) plugin for creating interactive, timed exams from your notes. It uses a human-readable syntax to render professional computer-based testing (CBT) environments directly within your vault.

## Features

- **integrated Exam View**: Runs as a native workspace tab with an integrated timer and question navigator.
- **7 Question Types**: Supports Multiple Choice, Select All (SATA), True/False, Fill in the Blank, Matching, and Short/Long answers.
- **Mark for Review**: Flag questions during the exam with a yellow marker to return to them later.
- **Enhanced Results Dashboard**: Detailed statistics including accuracy, total score, and time taken.
- **Retake Exam**: Quickly restart an exam after viewing your results.
- **Review Mode**: Review your results with color-coded navigation (green/red) and persistent marks.
- **Markdown & LaTeX Support**: Full support for standard Obsidian Markdown and LaTeX (MathJax) in questions and options.
- **Shuffle & Timer**: Configurable time limits and question/option shuffling managed via note frontmatter.

## Demo

https://github.com/user-attachments/assets/405c2c6a-0246-4621-9c93-caa3e8b92a24


## YAML Frontmatter

Configure quiz settings at the beginning of the file using YAML frontmatter.

| Option         | Type    | Description                                      | Example                    |
| -------------- | ------- | ------------------------------------------------ | -------------------------- |
| `quiz-title`   | String  | The title of the quiz                            | `quiz-title: "My Quiz"`    |
| `time-limit`   | Number  | Time limit for the quiz in minutes               | `time-limit: 30`           |
| `pass-score`   | Number  | Minimum percentage required to pass              | `pass-score: 70`           |
| `shuffle`      | Boolean | Whether to shuffle the question order            | `shuffle: true`            |
| `show-answer`  | Boolean | Whether to show answers during the quiz (flashcard mode)   | `show-answer: true`        |

**Example:**
```yaml
---
quiz-title: "Science Quiz"
time-limit: 15
pass-score: 80
shuffle: true
show-answer: true
---
```

## Question Syntax

Questions are defined using specific markers followed by the question text and answer details.

### Markers

| Marker   | Type                  | Answer Format        |
| -------- | --------------------- | -------------------- |
| `@mc`    | Multiple Choice       | `= b`                |
| `@sata`  | Select All That Apply | `= a, c, e`          |
| `@tf`    | True/False            | `= true` / `= false` |
| `@fib`   | Fill in the Blank     | `= answer1, answer2` |
| `@match` | Matching              | Left \| Right pairs  |
| `@sa`    | Short Answer          | `= text`             |
| `@la`    | Long Answer           | `= text`             |

### Standard Rules

1.  **Marker**: Start a question with `@type` (e.g., `@mc`).
2.  **Options**: Use `a)`, `b)`, `c)`... for choices (lowercase letters followed by a parenthesis).
3.  **Answer**: Use the `=` prefix followed by a space (e.g., `= a`).
4.  **Multiple Answers**: Separate multiple answers with a comma and space (e.g., `= a, c`).
5.  **Question Separator**: Questions should be separated by a blank line or the next marker.


---

## Installation

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/nazdridoy/obsidian-cbt-exam/releases).
2. Create `cbt-exam` in your vault's `.obsidian/plugins/` directory.
3. Move the downloaded files into that folder.
4. Enable **CBT Exam Simulator** in Obsidian Settings > Community Plugins.

---

## Usage

### 1. Create a Quiz File
Add quiz metadata to your note's frontmatter and write questions using the markers above.

#### Example (`quiz.md`)
```text
---
quiz-title: "Sample Quiz"
time-limit: 30
pass-score: 70
shuffle: true
---

# Physics Quiz (@mc)

@mc 1) Calculate the force if $m=5kg$ and $a=2m/s^2$.
a) $10N$
b) $7N$
c) $3N$
d) $2.5N$
= a

# Chemistry (@sata)

@sata 2) Which of these are **Nobel Gases**?
a) Helium
b) Oxygen
c) Argon
d) Neon
= a, c, d
```

> [!TIP]
> See [FLASHQUIZ_SPEC.md](./FLASHQUIZ_SPEC.md) for full syntax documentation and [ExampleQuiz.md](./ExampleQuiz.md) for a comprehensive example file.

### 2. Start the Exam
- **Ribbon**: Click the graduation cap icon 🎓 in the left ribbon.
- **Command Palette**: Search for **"Start exam from current file"** (`Ctrl/Cmd + P`).

### 3. Navigation & Submission
- Use the **Question Navigator** tab to jump between questions.
- Use the **Quit** button to exit the exam at any time.
- Click **Submit** (or wait for the timer) to view results.

### 4. Results & Review
The results dashboard provides a comprehensive breakdown of your performance, including accuracy percentage, points, and time taken. You can:
- **Review Answers**: Analyze your performance question-by-question (persistent marks and color-coding help you focus on areas for improvement).
- **Retake Exam**: Immediately restart the exam for another attempt.
- **Close Exam**: Return to your Obsidian vault.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
