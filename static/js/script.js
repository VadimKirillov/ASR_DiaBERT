// static/js/script.js

// Обработчик перетаскивания файлов
const dropArea = document.getElementById("drop-area");
const warningMessage = document.getElementById("warning-message");

// Разрешенные форматы файлов
const allowedFormats = ["audio/mp3", "audio/mp4", "audio/wav"];

dropArea.addEventListener("dragover", function(event) {
    event.preventDefault();
    dropArea.style.backgroundColor = "#f0f0f0";
});

dropArea.addEventListener("dragleave", function(event) {
    dropArea.style.backgroundColor = "";
});

dropArea.addEventListener("drop", function(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];

    // Проверка формата файла
    if (!allowedFormats.includes(file.type)) {
        // Показываем предупреждение
        warningMessage.style.display = "block";
        dropArea.style.backgroundColor = "#f8d7da"; // Меняем фон области на красный
    } else {
        // Если формат правильный, скрываем предупреждение
        warningMessage.style.display = "none";
        dropArea.style.backgroundColor = "#fafafa";

        // Подготовка данных для отправки
        const formData = new FormData();
        formData.append("file", file);

        fetch("/uploadfile/", {
            method: "POST",
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            alert("Файл загружен и обработан!");
        })
        .catch(error => {
            alert("Ошибка при загрузке файла!");
        });
    }
});

// Запись аудио
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let timer;
let audioBlob;
let audioUrl;

const recordButton = document.getElementById("record-button");
const timerElement = document.getElementById("timer");
const audioPlayer = document.getElementById("audio-player");

// Функция для начала или остановки записи
async function toggleRecording() {
    if (isRecording) {
        // Останавливаем запись
        mediaRecorder.stop();
        recordButton.innerHTML = '<img src="/static/microphone-icon.png" alt="Микрофон" width="30" height="30"> Начать запись';
        isRecording = false;
        clearInterval(timer); // Останавливаем таймер
    } else {
        // Начинаем запись
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl; // Показываем записанный файл
            audioChunks = []; // Очищаем массив для следующей записи
            uploadAudioToServer(audioBlob); // Отправляем файл на сервер
        };

        // Ограничение на 1 минуту (60000 миллисекунд)
        setTimeout(() => {
            if (isRecording) {
                mediaRecorder.stop(); // Автоматически останавливаем запись
                recordButton.innerHTML = '<img src="/static/microphone-icon.png" alt="Микрофон" width="30" height="30"> Начать запись';
                isRecording = false;
                clearInterval(timer);
            }
        }, 60000); // 60 секунд

        mediaRecorder.start();
        recordButton.innerHTML = '<img src="/static/microphone-icon-stop.png" alt="Стоп" width="30" height="30"> Остановить запись';
        isRecording = true;

        // Обновление таймера
        let seconds = 0;
        timer = setInterval(() => {
            seconds++;
            let minutes = Math.floor(seconds / 60);
            let secs = seconds % 60;
            timerElement.innerText = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }, 1000);
    }
}

// Функция для отправки записанного аудио на сервер
function uploadAudioToServer(blob) {
    const formData = new FormData();
    formData.append("file", blob, "recorded_audio.wav");

    fetch("/uploadfile/", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log("Файл успешно загружен на сервер:", data);
        alert("Записанное аудио успешно загружено!");
    })
    .catch(error => {
        console.error("Ошибка при загрузке файла на сервер:", error);
        alert("Ошибка при загрузке аудио на сервер.");
    });
}

// Слушатель события для кнопки записи
recordButton.addEventListener("click", toggleRecording);
