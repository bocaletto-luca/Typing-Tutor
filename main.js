 "use strict";
    
    /* ---------------- Tab Navigation ---------------- */
    function openTab(evt, tabName) {
      const tabcontents = document.getElementsByClassName("tabcontent");
      for (let i = 0; i < tabcontents.length; i++) {
        tabcontents[i].style.display = "none";
        tabcontents[i].classList.remove("active");
      }
      const tablinks = document.getElementsByClassName("tablinks");
      for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
      }
      document.getElementById(tabName).style.display = "block";
      document.getElementById(tabName).classList.add("active");
      evt.currentTarget.classList.add("active");
      if (tabName === "recordsTab") loadRecords();
    }
    document.getElementById("defaultTab").click();
    
    /* ---------------- Global Game Variables ---------------- */
    let gameRunning = false;
    let gameLoopID = null;
    let lastTime = 0;
    let spawnElapsed = 0;
    let spawnInterval = 1500; // milliseconds; decreases with level
    let baseSpeed = 100; // pixels per second; scales with level
    let difficultyMultiplier = 1; // increases with level
    let score = 0;
    let correctCount = 0;
    let errorCount = 0;
    let level = 1;
    const MAX_ERRORS = 5;
    let activeLetters = []; // Array of falling letter objects
    const gameCanvas = document.getElementById("gameCanvas");
    const ctx = gameCanvas.getContext("2d");
    
    const LETTER_FALL_THRESHOLD = gameCanvas.height; // remove letter if y > height
    const HIT_DISPLAY_TIME = 500; // ms to display hit effect
    
    /* ---------------- Falling Letter Object ---------------- */
    // Each letter: { char, x, y, speed, hit (boolean), hitTime (timestamp) }
    function spawnLetter() {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const char = letters.charAt(Math.floor(Math.random() * letters.length));
      const x = Math.random() * (gameCanvas.width - 30) + 15; // margin
      const y = -30; // start above canvas
      const speed = baseSpeed * difficultyMultiplier;
      return { char, x, y, speed, hit: false, hitTime: 0 };
    }
    
    /* ---------------- Flash Canvas on Error ---------------- */
    function flashCanvas(color, duration) {
      // Overlay a semi-transparent rectangle over the canvas.
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
      ctx.globalAlpha = 1.0;
      setTimeout(() => { drawLetters(); }, duration);
    }
    
    /* ---------------- Keyboard Event ---------------- */
    document.addEventListener("keydown", function(e) {
      if (!gameRunning) return;
      const key = e.key.toUpperCase();
      let letterFound = false;
      for (let i = 0; i < activeLetters.length; i++) {
        if (!activeLetters[i].hit && activeLetters[i].char === key) {
          activeLetters[i].hit = true;
          activeLetters[i].hitTime = performance.now();
          score += 10;
          correctCount++;
          letterFound = true;
          break; // Only remove one letter per key press
        }
      }
      if (!letterFound) {
        // Penalty for wrong key pressed: flash error and count an error.
        score -= 10;
        errorCount++;
        flashCanvas("red", 200);
      }
      updateGameInfo();
    });
    
    /* ---------------- Game Loop ---------------- */
    function gameLoop(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      spawnElapsed += deltaTime;
      
      // Clear canvas
      ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
      
      // Spawn a new letter if enough time has elapsed.
      if (spawnElapsed >= spawnInterval) {
        activeLetters.push(spawnLetter());
        spawnElapsed = 0;
      }
      
      // Update each letter
      for (let i = activeLetters.length - 1; i >= 0; i--) {
        let letter = activeLetters[i];
        if (!letter.hit) {
          letter.y += letter.speed * (deltaTime / 1000);
        } else {
          // If letter was correctly hit, wait HIT_DISPLAY_TIME then remove.
          if (timestamp - letter.hitTime > HIT_DISPLAY_TIME) {
            activeLetters.splice(i, 1);
            continue;
          }
        }
        // If letter falls below canvas and was not hit, mark it as missed.
        if (letter.y > LETTER_FALL_THRESHOLD && !letter.hit) {
          // Mark letter as missed (red), subtract score, increment error count.
          letter.hit = true;
          letter.hitTime = timestamp;
          score -= 10;
          errorCount++;
        }
      }
      
      // Increase difficulty: every 10 correct hits, level up.
      if (correctCount >= level * 10) {
        level++;
        spawnInterval = Math.max(500, 1500 - (level - 1) * 100);
        difficultyMultiplier = 1 + (level - 1) * 0.2;
      }
      
      drawLetters();
      updateGameInfo();
      
      // Check for Game Over (5 errors)
      if (errorCount >= MAX_ERRORS) {
        endGame();
      } else {
        if (gameRunning) gameLoopID = requestAnimationFrame(gameLoop);
      }
    }
    
    function drawLetters() {
      ctx.font = "30px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let letter of activeLetters) {
        if (letter.hit) {
          // If letter was hit or missed, draw in appropriate color:
          // If it was hit by input, draw green; if it reached the bottom or wrong key press error, draw red.
          ctx.fillStyle = letter.y > LETTER_FALL_THRESHOLD ? "red" : "green";
        } else {
          ctx.fillStyle = "black";
        }
        ctx.fillText(letter.char, letter.x, letter.y);
      }
    }
    
    /* ---------------- Update Display Info ---------------- */
    function updateGameInfo() {
      document.getElementById("scoreDisplay").innerText = score;
      document.getElementById("correctDisplay").innerText = correctCount;
      document.getElementById("levelDisplay").innerText = level;
      document.getElementById("errorDisplay").innerText = errorCount;
    }
    
    /* ---------------- Start/Stop Game ---------------- */
    document.getElementById("startGameBtn").addEventListener("click", function() {
      const playerName = document.getElementById("playerName").value.trim();
      if (playerName === "") {
        alert("Please enter your name to start the game.");
        return;
      }
      gameRunning = true;
      activeLetters = [];
      score = 0;
      correctCount = 0;
      errorCount = 0;
      level = 1;
      spawnInterval = 1500;
      difficultyMultiplier = 1;
      lastTime = 0;
      document.getElementById("startGameBtn").disabled = true;
      document.getElementById("stopGameBtn").disabled = false;
      updateGameInfo();
      gameLoopID = requestAnimationFrame(gameLoop);
    });
    
    document.getElementById("stopGameBtn").addEventListener("click", function() {
      gameRunning = false;
      cancelAnimationFrame(gameLoopID);
      document.getElementById("startGameBtn").disabled = false;
      document.getElementById("stopGameBtn").disabled = true;
      endGame();
    });
    
    function endGame() {
      gameRunning = false;
      cancelAnimationFrame(gameLoopID);
      alert("Game Over! You made " + errorCount + " errors.");
      saveRecord();
      // Reset buttons.
      document.getElementById("startGameBtn").disabled = false;
      document.getElementById("stopGameBtn").disabled = true;
    }
    
    /* ---------------- Records Functions ---------------- */
    // Save record in localStorage (simulate JSON storage)
    function saveRecord() {
      const playerName = document.getElementById("playerName").value.trim();
      const record = {
        name: playerName,
        score: score,
        correct: correctCount,
        level: level,
        date: new Date().toLocaleString()
      };
      let records = JSON.parse(localStorage.getItem("typingGameRecords") || "[]");
      records.push(record);
      // Sort by score descending.
      records.sort((a, b) => b.score - a.score);
      localStorage.setItem("typingGameRecords", JSON.stringify(records));
    }
    
    function loadRecords() {
      const recordsTableBody = document.querySelector("#recordsTable tbody");
      recordsTableBody.innerHTML = "";
      let records = JSON.parse(localStorage.getItem("typingGameRecords") || "[]");
      if (records.length === 0) {
        recordsTableBody.innerHTML = "<tr><td colspan='5'>No records yet.</td></tr>";
        return;
      }
      for (let rec of records) {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${rec.name}</td><td>${rec.score}</td><td>${rec.correct}</td><td>${rec.level}</td><td>${rec.date}</td>`;
        recordsTableBody.appendChild(row);
      }
    }
    
    function clearRecords() {
      if (confirm("Are you sure you want to clear all records?")) {
        localStorage.removeItem("typingGameRecords");
        loadRecords();
      }
    }
    
    /* ---------------- Initialize Game Info ---------------- */
    updateGameInfo();
