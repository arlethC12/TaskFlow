// =====================================
// ARREGLO DE TAREAS
// =====================================
let tasks = [];
let currentFilter = 'all';

// =====================================
// REFERENCIAS
// =====================================
const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");

const totalTasks = document.getElementById("totalTasks");
const pendingTasks = document.getElementById("pendingTasks");
const completedTasks = document.getElementById("completedTasks");

// =====================================
// MODO OSCURO
// =====================================
function initDarkMode() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark', prefersDark);
    document.body.classList.toggle('light', !prefersDark);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        document.body.classList.toggle('dark', e.matches);
        document.body.classList.toggle('light', !e.matches);
    });
}

// =====================================
// ICONOS LUCIDE
// =====================================
function refreshIcons() {
    lucide.createIcons();
}

// =====================================
// ACTUALIZAR ESTADÍSTICAS
// =====================================
function updateStats() {
    totalTasks.textContent = tasks.length;
    const completedCount = tasks.filter(t => t.completed).length;
    completedTasks.textContent = completedCount;
    pendingTasks.textContent = tasks.length - completedCount;

    const emptyMessage = document.getElementById("emptyMessage");
    emptyMessage.style.display = tasks.length === 0 ? "block" : "none";
}

// =====================================
// GUARDAR EN LOCALSTORAGE
// =====================================
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// =====================================
// FILTRAR TAREAS
// =====================================
function filterTasks() {
    const items = taskList.querySelectorAll("li");
    items.forEach(li => {
        const isCompleted = li.querySelector("span").classList.contains("completed");
        if (currentFilter === 'all') {
            li.style.display = "flex";
        } else if (currentFilter === 'pending' && !isCompleted) {
            li.style.display = "flex";
        } else if (currentFilter === 'completed' && isCompleted) {
            li.style.display = "flex";
        } else {
            li.style.display = "none";
        }
    });
}

// =====================================
// DRAG AND DROP
// =====================================
function enableDragAndDrop() {
    taskList.addEventListener('dragstart', e => {
        if (e.target.tagName === 'LI') {
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    taskList.addEventListener('dragend', e => {
        if (e.target.tagName === 'LI') {
            e.target.classList.remove('dragging');
            document.querySelectorAll('li').forEach(li => li.classList.remove('drag-over'));
        }
    });

    taskList.addEventListener('dragover', e => {
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        if (!dragging) return;

        const afterElement = getDragAfterElement(taskList, e.clientY);
        if (afterElement == null) {
            taskList.appendChild(dragging);
        } else {
            taskList.insertBefore(dragging, afterElement);
        }
    });

    taskList.addEventListener('drop', () => {
        updateTasksOrder();
    });
}

// Obtener elemento después del cursor
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Actualizar orden en el array tasks
function updateTasksOrder() {
    const taskElements = Array.from(taskList.querySelectorAll('li'));
    const newOrder = taskElements.map(li => {
        const text = li.querySelector('span').textContent;
        return tasks.find(task => task.text === text);
    }).filter(Boolean);

    tasks = newOrder;
    saveTasks();
}

// =====================================
// CREAR TAREA
// =====================================
function createTaskElement(task) {
    const li = document.createElement("li");
    li.draggable = true;

    li.innerHTML = `
    <input type="checkbox" ${task.completed ? "checked" : ""}>

    <div class="task-content">
        <span class="${task.completed ? "completed" : ""}">
            ${task.text}
        </span>
    </div>

    <div class="task-actions">
        <button class="edit-btn">
            <i data-lucide="edit-3"></i>
            Editar
        </button>

        <button class="delete-btn">
            <i data-lucide="trash-2"></i>
            Eliminar
        </button>
    </div>
`;

    const checkbox = li.querySelector("input[type='checkbox']");
    const taskSpan = li.querySelector(".task-content span");

    checkbox.addEventListener("change", () => {
        task.completed = checkbox.checked;
        taskSpan.classList.toggle("completed", task.completed);
        saveTasks();
        updateStats();
        filterTasks();
    });

    // Editar inline
    const editBtn = li.querySelector(".edit-btn");
    editBtn.addEventListener("click", () => {
        const originalText = task.text;
        const input = document.createElement("input");
        input.type = "text";
        input.value = originalText;
        input.style.width = "100%";

        const contentWrapper = li.querySelector('.task-content');
        contentWrapper.classList.add('editing');
        taskSpan.replaceWith(input);
        input.focus();
        input.select();

        const cleanup = () => {
            input.removeEventListener("blur", onBlur);
            input.removeEventListener("keydown", onKeydown);
            contentWrapper.classList.remove('editing');
        };

        const cancelEdit = () => {
            input.replaceWith(taskSpan);
            cleanup();
        };

        const saveEdit = () => {
            const newText = input.value.trim();
            if (newText && newText !== originalText) {
                task.text = newText;
                taskSpan.textContent = newText;
            }
            input.replaceWith(taskSpan);
            cleanup();
            saveTasks();
        };

        const onBlur = () => saveEdit();
        const onKeydown = e => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") cancelEdit();
        };

        input.addEventListener("blur", onBlur);
        input.addEventListener("keydown", onKeydown);
    });

    // Eliminar con animación
    const deleteBtn = li.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", () => {
        if (confirm(`¿Eliminar esta tarea?\n\n"${task.text}"`)) {
            li.classList.add("removing");
            setTimeout(() => {
                tasks = tasks.filter(t => t !== task);
                li.remove();
                saveTasks();
                updateStats();
                filterTasks();
            }, 400);
        }
    });

    taskList.appendChild(li);
    refreshIcons();
}

// =====================================
// CARGAR TAREAS
// =====================================
function loadTasks() {
    const stored = localStorage.getItem("tasks");
    if (!stored) return;
    
    tasks = JSON.parse(stored);
    tasks.forEach(task => createTaskElement(task));
    updateStats();
    filterTasks();
}

// =====================================
// AGREGAR TAREA
// =====================================
addTaskBtn.addEventListener("click", () => {
    const taskText = taskInput.value.trim();
    if (!taskText) {
        alert("Escribe una tarea");
        return;
    }

    const task = { text: taskText, completed: false };
    tasks.push(task);
    saveTasks();
    createTaskElement(task);
    updateStats();
    taskInput.value = "";
});

// =====================================
// INICIALIZAR
// =====================================
document.addEventListener("DOMContentLoaded", () => {
    initDarkMode();
    loadTasks();
    refreshIcons();
    enableDragAndDrop();
    // Registrar Service Worker para PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('✅ Service Worker registrado correctamente'))
            .catch(err => console.log('❌ Error al registrar Service Worker:', err));
    }
    // Filtros + Botón limpiar
    const filtersHTML = `
        <div class="filters">
            <button class="filter-btn active" data-filter="all">Todas</button>
            <button class="filter-btn" data-filter="pending">Pendientes</button>
            <button class="filter-btn" data-filter="completed">Completadas</button>
        </div>
        <button class="clear-completed">Eliminar completadas</button>
    `;

    taskList.insertAdjacentHTML('afterend', filtersHTML);

    // Eventos filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterTasks();
        });
    });

    // Eliminar completadas
    document.querySelector('.clear-completed').addEventListener('click', () => {
        if (confirm("¿Eliminar todas las tareas completadas?")) {
            tasks = tasks.filter(task => !task.completed);
            document.querySelectorAll('li').forEach(li => {
                if (li.querySelector("span").classList.contains("completed")) {
                    li.classList.add("removing");
                }
            });
            setTimeout(() => {
                taskList.innerHTML = '';
                tasks.forEach(task => createTaskElement(task));
                saveTasks();
                updateStats();
                filterTasks();
            }, 400);
        }
    });

    // Enter key
    taskInput.addEventListener("keypress", e => {
        if (e.key === "Enter") addTaskBtn.click();
    });
});