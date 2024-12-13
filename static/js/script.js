let recognition;
    const startButton = document.getElementById('startButton');
    const output = document.getElementById('output');
    const statusText = document.getElementById('statusText');
    const audioFile = document.getElementById('audioFile');
    const uploadForm = document.getElementById('uploadForm');
    const downloadDocxButton = document.getElementById('downloadDocxButton'); // Кнопка загрузки PDF
    const timeTrackerToggle = document.getElementById('timeTrackerToggle');
    let isTimeTrackerEnabled = false;
    let commandRecognition, recordingRecognition;
    let isRecording = false;
    let ws = new WebSocket(`ws://${window.location.hostname}:8000/ws`)

    // Speech recognition setup
if ('webkitSpeechRecognition' in window) {
    commandRecognition = new webkitSpeechRecognition();
    recordingRecognition = new webkitSpeechRecognition();

    // Настройка распознавания команд
    commandRecognition.continuous = false;
    commandRecognition.interimResults = false;
    commandRecognition.lang = 'ru-RU';

    // Настройка распознавания речи для записи
    recordingRecognition.continuous = true;
    recordingRecognition.interimResults = true;
    recordingRecognition.lang = 'ru-RU';

    // Обработчик результатов распознавания речи
recordingRecognition.onresult = function(event) {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            finalTranscript += transcript;
        } else {
            interimTranscript += transcript;
        }
    }

    // Добавление распознанного текста в элемент output
    if (finalTranscript !== '') {
        const outputElement = document.getElementById('output');
        // Если хотите добавить новый текст к существующему
        outputElement.textContent += (outputElement.textContent ? ' ' : '') + finalTranscript;

        // Или если хотите заменить текст полностью:
        // outputElement.textContent = finalTranscript;
    }
    };

    // Обработчик переключателя
    timeTrackerToggle.addEventListener('change', function() {
        isTimeTrackerEnabled = this.checked;
        console.log('Time tracker mode:', isTimeTrackerEnabled ? 'enabled' : 'disabled');

        if (isTimeTrackerEnabled) {
            try {
                commandRecognition.start();
                console.log('Command recognition started');
            } catch (e) {
                console.error('Error starting command recognition:', e);
            }
        } else {
            try {
                commandRecognition.stop();
                if (isRecording) {
                    stopRecording();
                }
            } catch (e) {
                console.error('Error stopping recognition:', e);
            }
        }
    });

    // Обработчик окончания сессии распознавания
    commandRecognition.onend = function() {
        console.log('Command recognition ended');
        if (isTimeTrackerEnabled && !isRecording) {
            try {
                commandRecognition.start();
            } catch (e) {
                console.error('Error restarting command recognition:', e);
            }
        }
    };

    commandRecognition.onresult = function(event) {
        const command = event.results[0][0].transcript.toLowerCase();
        console.log('Команда:', command);

        if (!isRecording && (command.includes('начать') || command.includes('старт'))) {
            startRecording();
        } else if (isRecording && command.includes('стоп')) {
            stopRecording();
        }
    };

    function startRecording() {
        isRecording = true;
        try {
            if (isTimeTrackerEnabled) {
                commandRecognition.stop();
            }
            recordingRecognition.start();
            startButton.textContent = 'Stop recording';
            startButton.classList.add('recording');
            startButton.style.backgroundColor = 'red';
            statusText.textContent = 'Recording in progress...';
        } catch (e) {
            console.error('Error starting recording:', e);
        }
    }

    function stopRecording() {
        isRecording = false;
        try {
            recordingRecognition.stop();
            if (isTimeTrackerEnabled) {
                commandRecognition.start();
            }
            startButton.textContent = 'Start recording';
            startButton.classList.remove('recording');
            startButton.style.backgroundColor = '';
            statusText.textContent = 'Recording stopped.';
            showDownloadButton();
        } catch (e) {
            console.error('Error stopping recording:', e);
        }
    }

    // Обработчики ошибок
    commandRecognition.onerror = function(event) {
        console.error('Command recognition error:', event.error);
    };

    recordingRecognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
    };

    // Обработчик кнопки
    startButton.onclick = function() {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    };
} else {
    startButton.disabled = true;
}

    // Устанавливаем начальное состояние переключателя
    isTimeTrackerEnabled = timeTrackerToggle.checked;
    if (isTimeTrackerEnabled) {
        commandRecognition.start();
    }

    // Показать кнопку загрузки DOCX
function showDownloadButton() {
    downloadDocxButton.style.display = 'inline-block';
}

downloadDocxButton.onclick = async () => {
    const text = output.textContent.trim(); // Берем содержимое из output
    if (!text) {
        alert('Нет текста для генерации документа.');
        return;
    }

    try {
        // Исправлен синтаксис шаблонной строки
        const response = await fetch(`/generate-docx?text=${encodeURIComponent(text)}`, {
            method: 'GET'
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // Создаем временную ссылку для скачивания
            const link = document.createElement('a');
            link.href = url;
            link.download = 'result.docx';
            document.body.appendChild(link); // Добавляем ссылку в DOM
            link.click();
            document.body.removeChild(link); // Удаляем ссылку из DOM

            // Очищаем URL после небольшой задержки
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 100);
        } else {
            alert('Ошибка при генерации документа.');
        }
    } catch (error) {
        console.error('Ошибка при скачивании документа:', error);
        alert('Произошла ошибка при скачивании документа.');
    }
};
