const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const difficultySelect = document.getElementById('difficulty');

const scoreDiv = document.querySelector('.score');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');

canvas.width = 400;
canvas.height = 400;

const gridSize = 20;
const tileCount = canvas.width / gridSize;
let gameSpeed = parseInt(difficultySelect.value);
let isPaused = false;

let snake = [
    { x: 10, y: 10 }
];
let food = { x: 5, y: 5 };
let dx = 0;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoop = null;
let lastDirection = '';
let lastDirectionChange = Date.now();
let nextDirection = '';
const DIRECTION_CHANGE_DELAY = 30;
let isGameRunning = false;

const FRUITS = [
    { name: 'elma', color: '#e74c3c', highlightColor: '#c0392b' },
    { name: 'portakal', color: '#f39c12', highlightColor: '#d35400' },
    { name: 'kiraz', color: '#c0392b', highlightColor: '#962b22' },
    { name: 'şeftali', color: '#ffb6c1', highlightColor: '#ff69b4' },
    { name: 'erik', color: '#8e44ad', highlightColor: '#6c3483' }
];

let currentFruit = FRUITS[0];
let tongueAngle = 0;
let tongueOut = false;

highScoreElement.textContent = highScore;

// Zorluk seviyelerine göre puan çarpanları
const DIFFICULTY_SCORES = {
    '200': 5,  // Kolay: 5 puan
    '100': 10, // Normal: 10 puan
    '50': 20   // Zor: 20 puan
};

// Ses efektleri
const sounds = {
    eat: new Audio('sound/eatSound.mp3'),
    die: new Audio('sound/game-over.mp3'),
    move: new Audio('sound/moveSound.wav')
};

// Hareket sesi için ayarlar
sounds.move.volume = 0.3; // Ses seviyesini %30'a düşür
sounds.move.currentTime = 5; // 5. saniyeden başlat
sounds.move.loop = true; // Sürekli çalsın

// Ses çalma fonksiyonu
function playSound(soundName) {
    if (soundToggle.checked) {
        if (soundName === 'move') {
            sounds.move.play().catch(() => {});
        } else {
            sounds[soundName].currentTime = soundName === 'move' ? 5 : 0;
            sounds[soundName].play().catch(() => {});
        }
    }
}

// Ses durdurma fonksiyonu
function stopSound(soundName) {
    sounds[soundName].pause();
    if (soundName === 'move') {
        sounds[soundName].currentTime = 5;
    } else {
        sounds[soundName].currentTime = 0;
    }
}

function drawGame() {
    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('DURAKLATILDI', canvas.width/2, canvas.height/2);
        return;
    }

    clearCanvas();
    moveSnake();
    checkCollision();
    drawSnake();
    drawFood();
}

function clearCanvas() {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnake() {
    snake.forEach((segment, index) => {
        if (index === 0) {
            ctx.fillStyle = '#2ecc71';
        } else {
            ctx.fillStyle = '#27ae60';
        }
        
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;
        const size = gridSize - 2;
        const radius = 8;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + size - radius, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
        ctx.lineTo(x + size, y + size - radius);
        ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
        ctx.lineTo(x + radius, y + size);
        ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fill();
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        if (index === 0) {
            const centerX = x + size/2;
            const centerY = y + size/2;
            
            let angle = 0;
            if (dx === 1) angle = 0;
            else if (dx === -1) angle = Math.PI;
            else if (dy === -1) angle = -Math.PI/2;
            else if (dy === 1) angle = Math.PI/2;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);
            
            const eyeSize = 4;
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(0, -size/4, eyeSize, 0, Math.PI * 2);
            ctx.arc(0, size/4, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(0, -size/4, eyeSize/2, 0, Math.PI * 2);
            ctx.arc(0, size/4, eyeSize/2, 0, Math.PI * 2);
            ctx.fill();

            tongueAngle += 0.1;
            const tongueLength = tongueOut ? Math.sin(tongueAngle) * 8 + 8 : 0;
            
            ctx.beginPath();
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.moveTo(size/2, 0);
            ctx.lineTo(size/2 + tongueLength, -3);
            ctx.moveTo(size/2, 0);
            ctx.lineTo(size/2 + tongueLength, 3);
            ctx.stroke();
            
            ctx.restore();
        }
    });
}

function drawFood() {
    const x = food.x * gridSize;
    const y = food.y * gridSize;
    const size = gridSize - 2;

    ctx.fillStyle = currentFruit.color;
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = currentFruit.highlightColor;
    ctx.beginPath();
    ctx.arc(x + size/3, y + size/3, size/4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#27ae60';
    ctx.fillRect(x + size/2 - 2, y + 2, 4, 6);

    ctx.beginPath();
    ctx.moveTo(x + size/2, y + 4);
    ctx.quadraticCurveTo(x + size/2 + 6, y + 2, x + size/2 + 4, y + 8);
    ctx.quadraticCurveTo(x + size/2 + 2, y + 6, x + size/2, y + 4);
    ctx.fill();
}

function moveSnake() {
    if (nextDirection) {
        switch (nextDirection) {
            case 'up':
                if (lastDirection !== 'down') {
                    dx = 0;
                    dy = -1;
                    lastDirection = 'up';
                }
                break;
            case 'down':
                if (lastDirection !== 'up') {
                    dx = 0;
                    dy = 1;
                    lastDirection = 'down';
                }
                break;
            case 'left':
                if (lastDirection !== 'right') {
                    dx = -1;
                    dy = 0;
                    lastDirection = 'left';
                }
                break;
            case 'right':
                if (lastDirection !== 'left') {
                    dx = 1;
                    dy = 0;
                    lastDirection = 'right';
                }
                break;
        }
        nextDirection = '';
    }

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        const difficultyScore = DIFFICULTY_SCORES[difficultySelect.value];
        score += difficultyScore;
        scoreElement.textContent = score;
        generateFood();
        playSound('eat'); // Yem yeme sesi
    } else {
        snake.pop();
    }
}

function generateFood() {
    let newFood;
    let isValidPosition;
    
    do {
        isValidPosition = true;
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        
        for (let segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                isValidPosition = false;
                break;
            }
        }
    } while (!isValidPosition);
    
    food = newFood;
    currentFruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    tongueOut = true;
    setTimeout(() => {
        tongueOut = false;
    }, 500);
}

function checkCollision() {
    const head = snake[0];

    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
    }

    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
        }
    }
}

function gameOver() {
    clearInterval(gameLoop);
    stopSound('move'); // Hareket sesini durdur
    playSound('die'); // Ölüm sesi
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
        alert(`Yeni En Yüksek Skor: ${score}!`);
    } else {
        alert(`Oyun Bitti! Skorunuz: ${score}`);
    }
    
    resetGame();
}

function resetGame() {
    snake = [{ x: 10, y: 10 }];
    generateFood();
    dx = 0;
    dy = 0;
    lastDirection = '';
    nextDirection = '';
    score = 0;
    scoreElement.textContent = '0';
    startButton.style.display = 'block';
    isGameRunning = false;
    isPaused = false;
}

function startGame() {
    startButton.style.display = 'none';
    currentFruit = FRUITS[0];
    tongueOut = false;
    tongueAngle = 0;
    dx = 0;
    dy = 0;
    nextDirection = '';
    lastDirection = '';
    isPaused = false;
    isGameRunning = true;
    gameSpeed = parseInt(difficultySelect.value);
    gameLoop = setInterval(drawGame, gameSpeed);
    playSound('move'); // Oyun başladığında hareket sesi başlat
}

function togglePause() {
    if (!isGameRunning) return;
    
    isPaused = !isPaused;
    if (isPaused) {
        clearInterval(gameLoop);
        stopSound('move'); // Duraklatıldığında hareket sesini durdur
    } else {
        gameLoop = setInterval(drawGame, gameSpeed);
        playSound('move'); // Devam ettiğinde hareket sesini başlat
    }
}

difficultySelect.addEventListener('change', () => {
    gameSpeed = parseInt(difficultySelect.value);
    if (isGameRunning && !isPaused) {
        clearInterval(gameLoop);
        gameLoop = setInterval(drawGame, gameSpeed);
    }
    
    // Zorluk seviyesi değiştiğinde bilgi mesajı göster
    const difficultyScore = DIFFICULTY_SCORES[gameSpeed];
    const difficultyName = gameSpeed === 200 ? 'Kolay' : gameSpeed === 100 ? 'Normal' : 'Zor';
    const message = `${difficultyName} seviye seçildi - Her yem ${difficultyScore} puan!`;
    
    // Mesajı canvas üzerinde göster
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, canvas.height/2 - 40, canvas.width, 80);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width/2, canvas.height/2);
    
    // Mesajı 2 saniye sonra temizle
    setTimeout(() => {
        if (!isPaused) {
            clearCanvas();
            drawSnake();
            drawFood();
        }
    }, 2000);
});

document.addEventListener('keydown', (event) => {
    if (!isGameRunning) {
        if (event.key === 'Enter' && startButton.style.display !== 'none') {
            startGame();
        }
        return;
    }

    if (event.key === ' ') {
        togglePause();
        return;
    }

    if (isPaused) return;

    const now = Date.now();
    // Aynı yöne basılıyorsa gecikmeyi kontrol etme
    if (
        (event.key === 'ArrowUp' && lastDirection === 'up') ||
        (event.key === 'ArrowDown' && lastDirection === 'down') ||
        (event.key === 'ArrowLeft' && lastDirection === 'left') ||
        (event.key === 'ArrowRight' && lastDirection === 'right')
    ) {
        return;
    }

    // Zıt yönlere basılmadığı sürece gecikmeyi azalt
    if (
        (event.key === 'ArrowUp' && lastDirection !== 'down') ||
        (event.key === 'ArrowDown' && lastDirection !== 'up') ||
        (event.key === 'ArrowLeft' && lastDirection !== 'right') ||
        (event.key === 'ArrowRight' && lastDirection !== 'left')
    ) {
        if (now - lastDirectionChange < DIRECTION_CHANGE_DELAY) {
            // Son yön değişiminden bu yana geçen süre çok azsa, yeni yönü kuyruğa al
            nextDirection = event.key.toLowerCase().replace('arrow', '');
            return;
        }
    }

    switch (event.key) {
        case 'ArrowUp':
            if (lastDirection !== 'down' && lastDirection !== 'up') {
                nextDirection = 'up';
                lastDirectionChange = now;
            }
            break;
        case 'ArrowDown':
            if (lastDirection !== 'up' && lastDirection !== 'down') {
                nextDirection = 'down';
                lastDirectionChange = now;
            }
            break;
        case 'ArrowLeft':
            if (lastDirection !== 'right' && lastDirection !== 'left') {
                nextDirection = 'left';
                lastDirectionChange = now;
            }
            break;
        case 'ArrowRight':
            if (lastDirection !== 'left' && lastDirection !== 'right') {
                nextDirection = 'right';
                lastDirectionChange = now;
            }
            break;
    }
});

startButton.addEventListener('click', startGame);

// Ses kontrolü için event listener ekle
soundToggle.addEventListener('change', () => {
    if (!soundToggle.checked) {
        stopSound('move');
    } else if (isGameRunning && !isPaused) {
        playSound('move');
    }
});

// Mobil kontrol butonları için event listener'lar
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

const mobileButtons = [upBtn, downBtn, leftBtn, rightBtn];

function addMobileButtonListeners(btn, direction, oppositeDirection) {
    const handleStart = (e) => {
        e.preventDefault();
        if (lastDirection !== oppositeDirection && isGameRunning && !isPaused) {
            nextDirection = direction;
            btn.classList.add('active');
        }
    };

    const handleEnd = () => {
        btn.classList.remove('active');
    };

    btn.addEventListener('touchstart', handleStart);
    btn.addEventListener('mousedown', handleStart);
    btn.addEventListener('touchend', handleEnd);
    btn.addEventListener('mouseup', handleEnd);
    btn.addEventListener('mouseleave', handleEnd);
}

// Her buton için listener'ları ekle
addMobileButtonListeners(upBtn, 'up', 'down');
addMobileButtonListeners(downBtn, 'down', 'up');
addMobileButtonListeners(leftBtn, 'left', 'right');
addMobileButtonListeners(rightBtn, 'right', 'left');

// Eski event listener'ları kaldır
// ... Önceki click ve touchstart event listener'larını silin ... 