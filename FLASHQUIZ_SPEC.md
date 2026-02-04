# FlashQuiz Format Specification

FlashQuiz is a simple markdown-based markup language used to create quizzes and flashcards for Obsidian. It supports various question types and can be configured using YAML frontmatter.

## YAML Frontmatter

You can configure the quiz settings at the beginning of the file using YAML frontmatter.

| Option         | Type    | Description                                      | Example                    |
| -------------- | ------- | ------------------------------------------------ | -------------------------- |
| `quiz-title`   | String  | The title of the quiz                            | `quiz-title: "My Quiz"`    |
| `time-limit`   | Number  | Time limit for the quiz in minutes               | `time-limit: 30`           |
| `pass-score`   | Number  | Minimum percentage required to pass              | `pass-score: 70`           |
| `shuffle`      | Boolean | Whether to shuffle the question order            | `shuffle: true`            |
| `show-answer`  | Boolean | Whether to show answers after quiz completion    | `show-answer: true`        |

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

## Question Types

### Multiple Choice (`@mc`)
Select one correct option.

**Input:**
```md
@mc 1) What is 2 + 2?
a) 3
b) 4
c) 5
= b
```

### Select All That Apply (`@sata`)
Select multiple correct options.

**Input:**
```md
@sata 2) Which are primary colors?
a) Red
b) Green
c) Blue
d) Yellow
= a, c, d
```

### True / False (`@tf`)
Standard true or false question.

**Input:**
```md
@tf 3) The Earth is flat.
= false
```

### Fill In The Blank (`@fib`)
Use backticks and underscores for blanks.

**Input:**
```md
@fib 4) Water is made of `____` and `____`.
= Hydrogen, Oxygen
```

### Matching (`@match`)
Pair items using the pipe (`|`) separator. The right side is automatically shuffled when rendered.

**Input:**
```md
@match 5) Match the capital to its country.
Paris | France
Tokyo | Japan
London | UK
```

### Short Answer (`@sa`)
Brief text answer.

**Input:**
```md
@sa 6) Who wrote "Romeo and Juliet"?
= William Shakespeare
```

### Long Answer (`@la`)
Detailed text explanation.

**Input:**
```md
@la 7) Describe the theory of relativity.
= Relativity states that the laws of physics are the same for all observers...
```

