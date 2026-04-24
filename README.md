<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>WSK-Quiz</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
        }
        .app {
            max-width: 700px;
            margin: 0 auto;
            padding: 16px;
        }
        h1 {
            font-size: 1.4rem;
            text-align: center;
            margin-bottom: 8px;
        }
        .status-bar {
            display: flex;
            justify-content: space-between;
            font-size: 0.9rem;
            margin-bottom: 8px;
            color: #555;
        }
        .question-box {
            background: #fff;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            margin-bottom: 12px;
        }
        .question-text {
            font-size: 1rem;
            margin-bottom: 12px;
        }
        .answers {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .answer-btn {
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 10px;
            font-size: 0.95rem;
            text-align: left;
            background: #fafafa;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s;
        }
        .answer-btn:hover {
            background: #f0f0f0;
        }
        .answer-btn.correct {
            background: #DAF2D0;
            border-color: #7FB34F;
        }
        .answer-btn.wrong {
            background: #FBD0D0;
            border-color: #E06666;
        }
        .controls {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-top: 10px;
        }
        .btn {
            flex: 1;
            border: none;
            border-radius: 6px;
            padding: 10px;
            background: #004f9f;
            color: #fff;
            font-size: 0.95rem;
            cursor: pointer;
        }
        .btn.secondary {
            background: #777;
        }
        .btn:disabled {
            background: #ccc;
            cursor: default;
        }
        .result {
            font-size: 0.95rem;
            margin-top: 8px;
        }
        .result span {
            font-weight: bold;
        }
    </style>
</head>
<body>
<div class="app">
    <h1>WSK-Quiz</h1>
    <div class="status-bar">
        <div id="status-question"></div>
        <div id="status-score"></div>
    </div>
    <div class="question-box">
        <div class="question-text" id="question-text"></div>
        <div class="answers" id="answers-container"></div>
        <div class="result" id="result-text"></div>
    </div>
    <div class="controls">
        <button class="btn secondary" id="btn-random">Zufallsfrage</button>
        <button class="btn" id="btn-next">Nächste Frage</button>
    </div>
</div>

<script>
    // Beispiel-Fragen (nur ein paar zur Demo)
    const questions = [
        {
            id: 21,
            text: "Was versteht man unter dem Begriff „Bruttoarbeitsentgelt“?",
            answers: [
                "Das Arbeitsentgelt vor Abzug der Steuern und Sozialabgaben",
                "Die Geldsumme, die dem Arbeitnehmer ausgezahlt wird",
                "Die Summe der Abzüge vom Arbeitsentgelt",
                "Das Arbeitsentgelt nach Abzug der Sozialabgaben",
                "Die tatsächliche Kaufkraft des Arbeitsentgelts"
            ],
            correctIndex: 0 // 0 = Antwort 1, 1 = Antwort 2, ...
        },
        {
            id: 22,
            text: "Was versteht man unter dem Begriff „Nettoarbeitsentgelt“?",
            answers: [
                "Das Arbeitsentgelt vor Abzug der Steuern und Sozialabgaben",
                "Die Summe der Abzüge vom Arbeitsentgelt",
                "Das Arbeitsentgelt nach Abzug der Steuern und Sozialabgaben",
                "Das Arbeitsentgelt vor Abzug der Sozialabgaben",
                "Das Arbeitsentgelt vor Abzug der Steuern"
            ],
            correctIndex: 2
        },
        {
            id: 39,
            text: "Welches Gesetz regelt die rechtlichen Grundlagen der Berufsausbildung im „Dualen System“?",
            answers: [
                "Betriebsverfassungsgesetz (BetrVG)",
                "Berufsbildungsgesetz (BBiG)",
                "Jugendarbeitsschutzgesetz (JArbSchG)",
                "Jugendschutzgesetz (JuSchG)",
                "Bundesausbildungsförderungsgesetz (BAföG)"
            ],
            correctIndex: 1
        },
        {
            id: 55,
            text: "Wie viele Werktage Erholungsurlaub muss der Arbeitgeber einem Arbeitnehmer nach dem Bundesurlaubsgesetz (BUrlG) mindestens gewähren?",
            answers: [
                "18 Werktage",
                "20 Werktage",
                "24 Werktage",
                "27 Werktage",
                "30 Werktage"
            ],
            correctIndex: 2
        }
    ];

    let currentIndex = 0;
    let answered = false;
    let totalAnswered = 0;
    let totalCorrect = 0;

    const questionTextEl = document.getElementById("question-text");
    const answersContainerEl = document.getElementById("answers-container");
    const resultTextEl = document.getElementById("result-text");
    const statusQuestionEl = document.getElementById("status-question");
    const statusScoreEl = document.getElementById("status-score");
    const btnNext = document.getElementById("btn-next");
    const btnRandom = document.getElementById("btn-random");

    function updateStatus() {
        statusQuestionEl.textContent = `Frage ${currentIndex + 1} von ${questions.length}`;
        statusScoreEl.textContent = `Richtig: ${totalCorrect} / ${totalAnswered}`;
    }

    function showQuestion(index) {
        const q = questions[index];
        answered = false;
        resultTextEl.textContent = "";
        answersContainerEl.innerHTML = "";

        questionTextEl.textContent = q.text;

        q.answers.forEach((ansText, i) => {
            const btn = document.createElement("button");
            btn.className = "answer-btn";
            btn.textContent = `${i + 1}. ${ansText}`;
            btn.addEventListener("click", () => handleAnswerClick(i));
            answersContainerEl.appendChild(btn);
        });

        updateStatus();
    }

    function handleAnswerClick(chosenIndex) {
        if (answered) return;
        answered = true;
        totalAnswered++;

        const q = questions[currentIndex];
        const buttons = answersContainerEl.querySelectorAll(".answer-btn");

        buttons.forEach((btn, i) => {
            if (i === q.correctIndex) {
                btn.classList.add("correct");
            }
            if (i === chosenIndex && i !== q.correctIndex) {
                btn.classList.add("wrong");
            }
            // nach Antwort keine weiteren Klicks
            btn.disabled = true;
        });

        if (chosenIndex === q.correctIndex) {
            totalCorrect++;
            resultTextEl.innerHTML = "<span>Richtig!</span>";
        } else {
            resultTextEl.innerHTML = `<span>Falsch.</span> Richtige Antwort: ${q.correctIndex + 1}.`;
        }

        updateStatus();
    }

    btnNext.addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % questions.length;
        showQuestion(currentIndex);
    });

    btnRandom.addEventListener("click", () => {
        currentIndex = Math.floor(Math.random() * questions.length);
        showQuestion(currentIndex);
    });

    // Start
    showQuestion(currentIndex);
</script>
</body>
</html>
