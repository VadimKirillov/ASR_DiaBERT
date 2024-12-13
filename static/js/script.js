let recognition;
    const startButton = document.getElementById('startButton');
    const output = document.getElementById('output');
    const statusText = document.getElementById('statusText');
    const audioFile = document.getElementById('audioFile');
    const uploadForm = document.getElementById('uploadForm');
    const downloadDocxButton = document.getElementById('downloadDocxButton');
    const makeTimeTableButton = document.getElementById('makeTimeTableButton');
    const clearTextButton = document.getElementById('clearTextButton');
    const timeTrackerToggle = document.getElementById('timeTrackerToggle');
    let isTimeTrackerEnabled = false;
    let commandRecognition, recordingRecognition;
    let isRecording = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

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
        const transcript = event.results[i][0].transcript.toLowerCase();

        if (event.results[i].isFinal) {
            finalTranscript += transcript;
        } else {
            interimTranscript += transcript;
        }

        // Проверяем на команды остановки
        if (transcript.includes('стоп') || transcript.includes('завершить')) {
             stopRecording();
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
            startButton.textContent = 'Остановить распознавание';
            startButton.classList.add('recording');
            startButton.style.backgroundColor = 'red';
            statusText.textContent = 'Идёт распознавание';
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
            startButton.textContent = 'Начать распознавание';
            startButton.classList.remove('recording');
            startButton.style.backgroundColor = '';
            statusText.textContent = 'Распознавание остановлено';
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

document.getElementById('clearTextButton').addEventListener('click', function() {
    document.getElementById('output').textContent = ''; // очищаем текстовое содержимое
    // или
    // document.getElementById('output').value = ''; // если это текстовое поле ввода
});

document.addEventListener('DOMContentLoaded', function() {
    // Делаем текстовое поле редактируемым
    document.getElementById('output').setAttribute('contenteditable', 'true');

    // Добавляем обработчик для проверки времени
    document.querySelectorAll('.time-cell').forEach(cell => {
        cell.addEventListener('input', function(e) {
            validateTimeCell(this);
        });

        cell.addEventListener('blur', function(e) {
            formatTimeCell(this);
        });
    });
});

function validateTimeCell(cell) {
    const value = cell.textContent;
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!timePattern.test(value) && value.length >= 5) {
        cell.classList.add('invalid');
    } else {
        cell.classList.remove('invalid');
    }
}

function formatTimeCell(cell) {
    let value = cell.textContent.trim();
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (timePattern.test(value)) {
        // Добавляем ведущие нули если необходимо
        let [hours, minutes] = value.split(':');
        hours = hours.padStart(2, '0');
        cell.textContent = `${hours}:${minutes}`;
        cell.classList.remove('invalid');
    } else {
        cell.textContent = '00:00';
        cell.classList.remove('invalid');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const addButton = document.querySelector('.add-row');
    const tbody = document.querySelector('.operations-table tbody');

    // Функция для создания новой строки
    function createNewRow() {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td contenteditable="true"></td>
            <td contenteditable="true" class="time-cell"></td>
            <td contenteditable="true" class="time-cell"></td>
            <td><button class="delete-row">-</button></td>
        `;
        return tr;
    }

    // Обработчик добавления новой строки
    addButton.addEventListener('click', function() {
        const newRow = createNewRow();
        tbody.appendChild(newRow);
    });

    // Обработчик удаления строки (делегирование событий)
    tbody.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-row')) {
            const row = e.target.closest('tr');
            if (tbody.children.length > 1) { // Проверка, чтобы всегда оставалась хотя бы одна строка
                row.remove();
            }
        }
    });
});

document.getElementById('downloadDocxButton').addEventListener('click', async function() {
    // Получаем данные из редактируемого div
    const textContent = document.getElementById('output').innerHTML;

    // Получаем данные из таблицы
    const tableRows = [];
    const tbody = document.querySelector('.operations-table tbody');
    for (let row of tbody.rows) {
        tableRows.push({
            operation: row.cells[0].textContent,
            startTime: row.cells[1].textContent,
            endTime: row.cells[2].textContent
        });
    }

    try {
        const response = await fetch('/generate-docx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: textContent,
                tableData: tableRows
            })
        });

        if (response.ok) {
            // Получаем blob из ответа
            const blob = await response.blob();
            // Создаем ссылку для скачивания
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'document.docx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } else {
            console.error('Error generating DOCX');
        }
    } catch (error) {
        console.error('Error:', error);
    }
});