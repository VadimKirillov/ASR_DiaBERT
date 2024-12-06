// static/js/script.js

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

// Обработчик отправки формы
document.getElementById("upload-form").addEventListener("submit", function(event) {
    event.preventDefault();  // Останавливаем обычное поведение формы

    const formData = new FormData(this);
    const messageDiv = document.getElementById("message");

    // Отправка файла через fetch
    fetch("/uploadfile/", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "Файл обработан успешно") {
            messageDiv.style.color = "green";
            messageDiv.innerText = "Файл успешно загружен на сервер!";
        } else {
            messageDiv.style.color = "red";
            messageDiv.innerText = `Ошибка: ${data.error || "Неизвестная ошибка"}`;
        }
        messageDiv.style.display = "block";
    })
    .catch(error => {
        messageDiv.style.color = "red";
        messageDiv.innerText = `Ошибка при загрузке файла: ${error.message}`;
        messageDiv.style.display = "block";
    });
});

// Слушатель события для кнопки записи
recordButton.addEventListener("click", toggleRecording);
