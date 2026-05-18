class StudyManager {
    constructor() {
        // Elementos da Tela de Boas-Vindas
        this.welcomeScreen = document.getElementById("welcome-screen");
        this.mainAppContent = document.getElementById("main-app-content");
        this.inputUsername = document.getElementById("username-input");
        this.btnEnterApp = document.getElementById("btn-enter-app");
        this.userDisplayName = document.getElementById("user-display-name");
        this.btnLogout = document.getElementById("btn-logout"); 

        // Elementos normais do App
        this.timerDisplay = document.querySelector("#timer");
        this.subjectTitle = document.querySelector("#active-subject-title");
        this.btnStart = document.querySelector("#btn-start");
        this.btnPause = document.querySelector("#btn-pause");
        this.btnReset = document.querySelector("#btn-reset");
        this.btnComplete = document.querySelector("#btn-complete");
        
        // 🕒 NOVOS ELEMENTOS: Botões de ajuste rápido de tempo
        this.btnMinus5 = document.getElementById("btn-minus-5");
        this.btnPlus5 = document.getElementById("btn-plus-5");
        
        this.subjectsContainer = document.querySelector("#subjects-container");
        this.inputNewSubject = document.querySelector("#new-subject-input");
        this.selectSubjectHours = document.querySelector("#subject-hours-select");
        this.btnAddSubject = document.querySelector("#btn-add-subject");
        this.btnClearAll = document.querySelector("#btn-clear-all");
        
        this.audioNotification = document.querySelector("#end-sound");

        // Elementos da Lista de Tarefas
        this.inputNewTask = document.querySelector("#new-task-input");
        this.btnAddTask = document.querySelector("#btn-add-task");
        this.todoListContainer = document.querySelector("#todo-list");
        
        // Botão de Filtro
        this.btnToggleFilter = document.getElementById("btn-toggle-filter");
        
        this.selectedCard = null;
        this.selectedSubject = null;
        this.selectedIndex = null; 
        this.countdownInterval = null;
        this.isPaused = true;
        this.hideCompleted = false; 

        // Recupera dados salvos com segurança
        try {
            this.subjectsList = JSON.parse(localStorage.getItem("mySubjects")) || [];
            if (!Array.isArray(this.subjectsList)) this.subjectsList = [];
        } catch (e) {
            this.subjectsList = [];
        }

        this.sanitizeSubjects();
        this.initWelcomeLogic(); 
        this.initEvents();
    }

    initWelcomeLogic() {
        const savedName = localStorage.getItem("appUsername");

        if (savedName) {
            if (this.welcomeScreen) this.welcomeScreen.style.setProperty("display", "none", "important");
            if (this.mainAppContent) this.mainAppContent.style.setProperty("display", "block", "important");
            if (this.userDisplayName) this.userDisplayName.innerText = savedName;
            
            this.renderSubjects();
            this.renderTasks();
        } else {
            if (this.welcomeScreen) this.welcomeScreen.style.setProperty("display", "flex", "important");
            if (this.mainAppContent) this.mainAppContent.style.setProperty("display", "none", "important");
            if (this.inputUsername) this.inputUsername.value = ""; 
        }
    }

    handleLogin() {
        if (!this.inputUsername) return;
        const name = this.inputUsername.value.trim();

        if (!name) {
            alert("Por favor, digite como prefere ser chamado para continuar!");
            return;
        }

        localStorage.setItem("appUsername", name);
        this.initWelcomeLogic();
    }

    handleLogout() {
        if (!this.isPaused) {
            alert("Pause o cronômetro antes de sair do aplicativo.");
            return;
        }
        localStorage.removeItem("appUsername");
        this.initWelcomeLogic();
    }

    toggleFilter() {
        this.hideCompleted = !this.hideCompleted;
        
        if (this.btnToggleFilter) {
            if (this.hideCompleted) {
                this.btnToggleFilter.classList.add("active");
                this.btnToggleFilter.innerText = "Mostrar Concluídas";
            } else {
                this.btnToggleFilter.classList.remove("active");
                this.btnToggleFilter.innerText = "Esconder Concluídas";
            }
        }
        
        this.renderSubjects(); 
    }

    // 🕒 NOVA FUNÇÃO: ADICIONA OU REMOVE TEMPO DO CRONÔMETRO ATIVO
    adjustTime(minutes) {
        if (this.selectedIndex === null) return;

        const currentSubject = this.subjectsList[this.selectedIndex];
        if (!currentSubject) return;

        const secondsChange = minutes * 60;
        const newSeconds = currentSubject.remainingSeconds + secondsChange;

        // Segurança: Não deixa o tempo ficar negativo
        if (newSeconds < 0) {
            currentSubject.remainingSeconds = 0;
        } else {
            currentSubject.remainingSeconds = newSeconds;
        }

        this.updateDisplay();
        this.renderSubjects();
        this.saveToStorage();

        // Se o tempo foi zerado manualmente via ajuste, encerra o ciclo
        if (currentSubject.remainingSeconds === 0) {
            clearInterval(this.countdownInterval);
            this.playEndSound();
            this.completeSubject();
        }
    }

    initEvents() {
        if (this.btnEnterApp) this.btnEnterApp.addEventListener("click", () => this.handleLogin());
        if (this.inputUsername) {
            this.inputUsername.addEventListener("keypress", (e) => {
                if (e.key === "Enter") this.handleLogin();
            });
        }

        if (this.btnLogout) this.btnLogout.addEventListener("click", () => this.handleLogout());
        if (this.btnToggleFilter) this.btnToggleFilter.addEventListener("click", () => this.toggleFilter());

        // 🕒 Ouvintes dos novos botões de ajuste de tempo
        if (this.btnMinus5) this.btnMinus5.addEventListener("click", () => this.adjustTime(-5));
        if (this.btnPlus5) this.btnPlus5.addEventListener("click", () => this.adjustTime(5));

        if (this.btnStart) this.btnStart.addEventListener("click", () => this.startTimer());
        if (this.btnPause) this.btnPause.addEventListener("click", () => this.pauseTimer());
        if (this.btnReset) this.btnReset.addEventListener("click", () => this.resetTimer());
        if (this.btnComplete) this.btnComplete.addEventListener("click", () => this.completeSubject());
        
        if (this.btnAddSubject) this.btnAddSubject.addEventListener("click", () => this.addNewSubject());
        if (this.btnClearAll) this.btnClearAll.addEventListener("click", () => this.clearAllSubjects());
        
        if (this.inputNewSubject) {
            this.inputNewSubject.addEventListener("keypress", (e) => {
                if (e.key === "Enter") this.addNewSubject();
            });
        }

        if (this.btnAddTask) this.btnAddTask.addEventListener("click", () => this.addNewTask());
        if (this.inputNewTask) {
            this.inputNewTask.addEventListener("keypress", (e) => {
                if (e.key === "Enter") this.addNewTask();
            });
        }
    }

    sanitizeSubjects() {
        try {
            this.subjectsList = this.subjectsList.map(subject => {
                if (!subject || !subject.name) return null;
                const hours = parseFloat(subject.hours) || 1;
                return {
                    name: String(subject.name),
                    cycles: parseInt(subject.cycles) || 0,
                    done: !!subject.done,
                    hours: hours,
                    remainingSeconds: (typeof subject.remainingSeconds !== 'undefined' && !isNaN(subject.remainingSeconds)) 
                        ? parseInt(subject.remainingSeconds) 
                        : hours * 3600,
                    tasks: Array.isArray(subject.tasks) ? subject.tasks : []
                };
            }).filter(s => s !== null);
            this.saveToStorage();
        } catch (e) {
            this.subjectsList = [];
            this.saveToStorage();
        }
    }

    saveToStorage() {
        localStorage.setItem("mySubjects", JSON.stringify(this.subjectsList));
    }

    formatarTempo(totalSegundos) {
        if (isNaN(totalSegundos) || totalSegundos < 0) return "00:00:00";
        const hours = Math.floor(totalSegundos / 3600);
        const minutes = Math.floor((totalSegundos % 3600) / 60);
        const seconds = totalSegundos % 60;
        const format = (num) => String(num).padStart(2, "0");
        return `${format(hours)}:${format(minutes)}:${format(seconds)}`;
    }

    formatarHorasMeta(horasDecimais) {
        if (horasDecimais === 1) return "1 hora";
        if (horasDecimais % 1 === 0) return `${horasDecimais} horas`;
        const h = Math.floor(horasDecimais);
        const m = Math.round((horasDecimais - h) * 60);
        return `${h}h ${m}m`;
    }

    renderSubjects() {
        if (!this.subjectsContainer) return;
        this.subjectsContainer.innerHTML = ""; 

        this.subjectsList.forEach((subject, index) => {
            if (this.hideCompleted && subject.done) {
                if (this.selectedIndex === index) {
                    this.selectedIndex = null;
                    this.selectedSubject = null;
                    if (this.subjectTitle) this.subjectTitle.innerText = "Nenhuma matéria selecionada";
                    this.updateDisplay();
                    this.renderTasks();
                    // Desabilita botões de ajuste
                    if (this.btnMinus5) this.btnMinus5.disabled = true;
                    if (this.btnPlus5) this.btnPlus5.disabled = true;
                }
                return; 
            }

            const card = document.createElement("div");
            card.className = "subject-card";
            if (subject.done) card.classList.add("completed");
            if (this.selectedIndex === index) card.classList.add("selected");
            
            card.setAttribute("data-index", index);

            card.innerHTML = `
                <div class="card-status">${subject.done ? 'Feito!' : 'Pendente'}</div>
                <h4>${subject.name} <span class="cycles-count" style="color: #10b981">${subject.cycles > 0 ? `(${subject.cycles}x)` : ''}</span></h4>
                <p>Meta total: ${this.formatarHorasMeta(subject.hours)}</p>
                <div class="card-timer" style="font-size: 1.2rem; font-weight: bold; margin-top: 8px; color: #3b82f6;">
                    Tempo restante: ${this.formatarTempo(subject.remainingSeconds)}
                </div>
            `;

            card.addEventListener("click", () => this.selectSubject(card, subject, index));
            this.subjectsContainer.appendChild(card);
        });
    }

    addNewTask() {
        if (this.selectedIndex === null) {
            alert("Selecione uma matéria antes de adicionar uma tarefa para ela!");
            return;
        }
        if (!this.inputNewTask) return;
        
        const taskText = this.inputNewTask.value.trim();
        if (!taskText) return;

        this.subjectsList[this.selectedIndex].tasks.push({
            text: taskText,
            completed: false
        });

        this.inputNewTask.value = "";
        this.saveToStorage();
        this.renderTasks();
    }

    toggleTask(taskIndex) {
        if (this.selectedIndex !== null && this.subjectsList[this.selectedIndex].tasks[taskIndex]) {
            const task = this.subjectsList[this.selectedIndex].tasks[taskIndex];
            task.completed = !task.completed;
            this.saveToStorage();
            this.renderTasks();
        }
    }

    deleteTask(taskIndex, event) {
        event.stopPropagation(); 
        if (this.selectedIndex !== null) {
            this.subjectsList[this.selectedIndex].tasks.splice(taskIndex, 1);
            this.saveToStorage();
            this.renderTasks();
        }
    }

    renderTasks() {
        if (!this.todoListContainer) return;
        this.todoListContainer.innerHTML = "";

        if (this.selectedIndex === null) {
            this.todoListContainer.innerHTML = `<li class="todo-empty">Selecione uma matéria acima para ver suas tarefas.</li>`;
            return;
        }

        const currentTasks = this.subjectsList[this.selectedIndex].tasks || [];

        if (currentTasks.length === 0) {
            this.todoListContainer.innerHTML = `<li class="todo-empty">Nenhuma tarefa para a matéria ${this.selectedSubject}.</li>`;
            return;
        }

        currentTasks.forEach((task, index) => {
            const li = document.createElement("li");
            li.className = "todo-item";
            if (task.completed) li.classList.add("done");

            li.innerHTML = `
                <span class="todo-text">${task.text}</span>
                <button class="btn-todo-delete" title="Excluir tarefa">×</button>
            `;

            li.addEventListener("click", () => this.toggleTask(index));
            
            const btnDelete = li.querySelector(".btn-todo-delete");
            if (btnDelete) {
                btnDelete.addEventListener("click", (e) => this.deleteTask(index, e));
            }

            this.todoListContainer.appendChild(li);
        });
    }

    addNewSubject() {
        if (!this.inputNewSubject) return;
        const name = this.inputNewSubject.value.trim();
        
        let minutos = 60;
        if (this.selectSubjectHours) {
            minutos = parseInt(this.selectSubjectHours.value) || 60;
        }
        if (!name) return;

        const existe = this.subjectsList.some(sub => sub && sub.name && sub.name.toLowerCase() === name.toLowerCase());
        if (existe) {
            alert("Você já adicionou essa matéria!");
            return;
        }

        const totalSeconds = minutos * 60;
        const horasExibicao = minutos / 60; 
        
        this.subjectsList.push({ 
            name: name, 
            cycles: 0, 
            done: false, 
            hours: horasExibicao, 
            remainingSeconds: totalSeconds,
            tasks: []
        });
        
        this.inputNewSubject.value = ""; 
        if (this.selectSubjectHours) this.selectSubjectHours.value = "60"; 
        
        this.saveToStorage();
        this.renderSubjects();
    }

    clearAllSubjects() {
        if (!this.isPaused) {
            alert("Pause o timer antes de resetar a lista.");
            return;
        }
        if (confirm("Deseja apagar todas as matérias e suas respectivas tarefas?")) {
            this.subjectsList = [];
            this.saveToStorage();
            if (this.timerDisplay) this.timerDisplay.innerText = "01:00:00";
            this.selectedCard = null;
            this.selectedSubject = null;
            this.selectedIndex = null;
            if (this.subjectTitle) this.subjectTitle.innerText = "Nenhuma matéria selecionada";
            
            if (this.btnStart) this.btnStart.disabled = true;
            if (this.btnPause) this.btnPause.disabled = true;
            if (this.btnReset) this.btnReset.disabled = true;
            if (this.btnComplete) this.btnComplete.disabled = true;
            
            // Desabilita botões de ajuste
            if (this.btnMinus5) this.btnMinus5.disabled = true;
            if (this.btnPlus5) this.btnPlus5.disabled = true;
            
            this.renderSubjects();
            this.renderTasks(); 
        }
    }

    selectSubject(card, subject, index) {
        if (!this.isPaused) {
            alert("Pause o cronômetro atual antes de mudar de matéria.");
            return;
        }
        this.selectedCard = card;
        this.selectedSubject = subject.name;
        this.selectedIndex = index;

        this.renderSubjects();
        if (this.subjectTitle) this.subjectTitle.innerText = `Focando em: ${this.selectedSubject}`;
        
        this.updateDisplay();
        this.renderTasks();

        if (this.btnStart) this.btnStart.disabled = false;
        if (this.btnComplete) this.btnComplete.disabled = false;
        if (this.btnReset) this.btnReset.disabled = false;
        if (this.btnPause) this.btnPause.disabled = true;
        
        // 🕒 Ativa os botões de ajuste de tempo quando uma matéria é escolhida
        if (this.btnMinus5) this.btnMinus5.disabled = false;
        if (this.btnPlus5) this.btnPlus5.disabled = false;
    }

    startTimer() {
        if (this.selectedIndex === null) return;
        this.isPaused = false;
        if (this.btnStart) this.btnStart.disabled = true;
        if (this.btnPause) this.btnPause.disabled = false;
        clearInterval(this.countdownInterval);

        this.countdownInterval = setInterval(() => {
            const currentSubject = this.subjectsList[this.selectedIndex];
            if (currentSubject && currentSubject.remainingSeconds > 0) {
                currentSubject.remainingSeconds--;
                this.updateDisplay();
                this.renderSubjects(); 
                this.saveToStorage();  
            } else {
                clearInterval(this.countdownInterval);
                this.playEndSound();
                this.completeSubject();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isPaused = true;
        clearInterval(this.countdownInterval);
        if (this.btnStart) this.btnStart.disabled = false;
        if (this.btnPause) this.btnPause.disabled = true;
    }

    resetTimer() {
        if (this.selectedIndex === null) return;
        this.pauseTimer();
        const currentSubject = this.subjectsList[this.selectedIndex];
        if (currentSubject) currentSubject.remainingSeconds = (currentSubject.hours || 1) * 3600;
        
        this.updateDisplay();
        this.renderSubjects();
        this.saveToStorage();
        if (this.btnStart) this.btnStart.disabled = false;
    }

    updateDisplay() {
        if (!this.timerDisplay) return;
        if (this.selectedIndex === null) {
            this.timerDisplay.innerText = "01:00:00";
            return;
        }
        const currentSubject = this.subjectsList[this.selectedIndex];
        const tempo = currentSubject ? currentSubject.remainingSeconds : 0;
        this.timerDisplay.innerText = this.formatarTempo(tempo);
    }

    playEndSound() {
        if (this.audioNotification) {
            this.audioNotification.currentTime = 0;
            this.audioNotification.play().catch(e => console.log("Erro ao tocar áudio: ", e));
        }
    }

    completeSubject() {
        if (this.selectedIndex === null) return;
        this.pauseTimer();

        const currentSubject = this.subjectsList[this.selectedIndex];
        if (currentSubject) {
            currentSubject.cycles++;
            currentSubject.done = true;
            currentSubject.remainingSeconds = (currentSubject.hours || 1) * 3600; 
            currentSubject.tasks = currentSubject.tasks.map(task => {
                return { ...task, completed: true };
            });
        }

        this.saveToStorage(); 
        this.renderSubjects(); 
        this.renderTasks(); 
        this.updateDisplay();

        if (this.subjectTitle) this.subjectTitle.innerText = `Meta concluída! Deseja iniciar outro ciclo em ${this.selectedSubject}?`;
        if (this.btnStart) this.btnStart.disabled = false;
        if (this.btnComplete) this.btnComplete.disabled = false;
        if (this.btnReset) this.btnReset.disabled = false;

        setTimeout(() => {
            alert(`🎉 Meta concluída para a matéria: ${this.selectedSubject}!`);
        }, 300);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const app = new StudyManager();
});