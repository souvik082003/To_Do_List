// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    signInAnonymously,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    updateProfile // ✨ Import updateProfile
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc, 
    setLogLevel, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyBMSPuM1AbKBgkKHYV_TCN7GWWmiGeU_Mc",
    authDomain: "finsnap-1fcda.firebaseapp.com",
    projectId: "finsnap-1fcda",
    storageBucket: "finsnap-1fcda.appspot.com",
    messagingSenderId: "698206969022",
    appId: "1:698206969022:web:a000a8489e967a882292ef",
    measurementId: "G-R4WKDHRSSH"
};

// --- ✨ Hardcoded Gemini API Key ---
const geminiApiKey = "AIzaSyB_RFaW9xeG-2qSGMS6SyCjTWhSrrP9Kyc";


// --- App Initialization ---
let app, auth, db;
try {
     app = initializeApp(firebaseConfig);
     auth = getAuth(app);
     db = getFirestore(app);
     setLogLevel('debug');
} catch (e) {
    console.error("Firebase initialization failed. Please provide your Firebase config.", e);
}

// --- ✨ New: Wait for DOM to be ready before starting auth flow ---
document.addEventListener('DOMContentLoaded', () => {
    const originalBodyHTML = document.getElementById('app-container-wrapper').innerHTML;
    // Show a full-page loader initially to handle redirect state
    document.body.innerHTML = `<div class="flex items-center justify-center h-screen">
        <svg class="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
    </div>`;

    getRedirectResult(auth)
        .then((result) => {
            setupAuthListener(originalBodyHTML);
        }).catch((error) => {
            console.error("Redirect Error:", error);
            setupAuthListener(originalBodyHTML);
        });
});


function setupAuthListener(originalBodyHTML) {
    onAuthStateChanged(auth, user => {
        document.body.innerHTML = originalBodyHTML;
        
        const authView = document.getElementById('auth-view');
        const mainAppView = document.getElementById('main-app-view');

        if (user) {
            authView.classList.add('hidden');
            mainAppView.classList.remove('hidden');
            document.getElementById('user-email-display').textContent = user.displayName || user.email || 'Anonymous User';
            document.getElementById('user-id-display').textContent = user.uid;
            fetchTasks(user.uid);
        } else {
            authView.classList.remove('hidden');
            mainAppView.classList.add('hidden');
            if (unsubscribeFromTasks) unsubscribeFromTasks();
        }
        addEventListeners(); 
    });
}

function addEventListeners() {
    document.getElementById('login-btn').addEventListener('click', () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!isValidEmail(email)) {
            showToast("Please enter a valid email address.", "error");
            return;
        }

        signInWithEmailAndPassword(auth, email, password)
            .then(() => showToast("Logged in successfully!", "success"))
            .catch(error => showToast(error.message, "error"));
    });

    document.getElementById('signup-btn').addEventListener('click', () => {
        const name = document.getElementById('name').value; // ✨ Get name
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!name) {
            showToast("Please enter your name.", "error");
            return;
        }
        if (!isValidEmail(email)) {
            showToast("Please enter a valid email address.", "error");
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // ✨ Update the profile with the new name
                return updateProfile(userCredential.user, {
                    displayName: name
                });
            })
            .then(() => {
                showToast("Account created successfully!", "success");
            })
            .catch(error => showToast(error.message, "error"));
    });

    document.getElementById('anon-login-btn').addEventListener('click', () => {
        signInAnonymously(auth)
            .then(() => showToast("Continuing as an anonymous user.", "success"))
            .catch((error) => showToast(error.message, "error"));
    });

    document.getElementById('google-login-btn').addEventListener('click', () => {
        const provider = new GoogleAuthProvider();
        signInWithRedirect(auth, provider);
    });

    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth)
                .then(() => {
                    showToast("Logged out.", "success");
                })
                .catch(error => showToast(error.message, "error"));
        });
    }
    
    const addTaskBtn = document.getElementById('add-task-btn');
    if(addTaskBtn) {
        addTaskBtn.addEventListener('click', async () => {
            const titleInput = document.getElementById('new-task-title');
            const priorityInput = document.getElementById('new-task-priority');
            if (await addTask(titleInput.value.trim(), priorityInput.value)) {
                titleInput.value = '';
                showToast("Task added!", "success");
            }
        });
    }
    
    const breakdownBtn = document.getElementById('breakdown-task-btn');
    if(breakdownBtn) {
        breakdownBtn.addEventListener('click', onBreakdownClick);
    }

    const suggestBtn = document.getElementById('suggest-task-btn');
    if(suggestBtn) {
        suggestBtn.addEventListener('click', onSuggestClick);
    }
    
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            currentFilter = e.target.dataset.filter;
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('bg-white', 'dark:bg-gray-700');
            });
            e.target.classList.add('bg-blue-500', 'text-white');
            e.target.classList.remove('bg-white', 'dark:bg-gray-700');
            renderTasks(allTasks);
        });
    });
}

// --- Global variables for tasks ---
let allTasks = [];
let unsubscribeFromTasks = null;
let currentFilter = 'all';

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function fetchTasks(userId) {
    const loadingSpinner = document.getElementById('loading-spinner');
    const emptyState = document.getElementById('empty-state');
    const taskListEl = document.getElementById('task-list');

    loadingSpinner.classList.remove('hidden');
    emptyState.classList.add('hidden');
    taskListEl.innerHTML = '';

    const tasksRef = collection(db, "tasks");
    const q = query(tasksRef, where("userId", "==", userId));

    unsubscribeFromTasks = onSnapshot(q, (querySnapshot) => {
        loadingSpinner.classList.add('hidden');
        const tasks = [];
        querySnapshot.forEach((doc) => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        tasks.sort((a, b) => (a.createdAt?.toDate() || 0) - (b.createdAt?.toDate() || 0));
        allTasks = tasks;
        renderTasks(allTasks);
    }, (error) => {
        console.error("Error fetching tasks: ", error);
        showToast("Could not fetch tasks.", "error");
        loadingSpinner.classList.add('hidden');
    });
}

function renderTasks(tasks) {
    const taskListEl = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');

    taskListEl.innerHTML = '';
    const filteredTasks = tasks.filter(task => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'active') return !task.completed;
        if (currentFilter === 'completed') return task.completed;
    });

    document.getElementById('task-count').textContent = filteredTasks.length;

    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        filteredTasks.forEach(task => {
            const taskElement = createTaskElement(task);
            taskListEl.appendChild(taskElement);
        });
    }
}

function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = `task-item bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center justify-between border-l-4 priority-${task.priority}`;
    div.dataset.id = task.id;
    const isCompleted = task.completed;

    div.innerHTML = `
        <div class="flex items-center flex-grow min-w-0">
            <input type="checkbox" ${isCompleted ? 'checked' : ''} class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0">
            <p class="ml-4 text-lg truncate ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}">${escapeHTML(task.title)}</p>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
            <span class="text-xs font-semibold uppercase px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${escapeHTML(task.priority)}</span>
            <button class="delete-btn text-gray-400 hover:text-red-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    `;

    div.querySelector('input[type="checkbox"]').addEventListener('change', (e) => updateTaskStatus(task.id, e.target.checked));
    div.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

    return div;
}

async function addTask(title, priority) {
     if (title === '' || !auth.currentUser) {
        showToast("Task title cannot be empty.", "error");
        return false;
    }
    try {
        await addDoc(collection(db, "tasks"), {
            userId: auth.currentUser.uid,
            title: title,
            priority: priority,
            completed: false,
            createdAt: new Date()
        });
        return true;
    } catch (e) {
        console.error("Error adding document: ", e);
        showToast("Failed to add task.", "error");
        return false;
    }
}

async function updateTaskStatus(taskId, isCompleted) {
    await updateDoc(doc(db, "tasks", taskId), { completed: isCompleted });
}

async function deleteTask(taskId) {
    await deleteDoc(doc(db, "tasks", taskId));
    showToast("Task deleted.", "success");
}

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=`;

function toggleButtonLoading(button, isLoading) {
    const text = button.querySelector('.btn-text');
    const loader = button.querySelector('.btn-loader');
    if (isLoading) {
        button.disabled = true;
        if(text) text.classList.add('hidden');
        if(loader) loader.classList.remove('hidden');
    } else {
        button.disabled = false;
        if(text) text.classList.remove('hidden');
        if(loader) loader.classList.add('hidden');
    }
}

async function onBreakdownClick() {
    const titleInput = document.getElementById('new-task-title');
    const taskToBreakDown = titleInput.value.trim();
    if (!taskToBreakDown) {
        showToast("Please enter a task to break down.", "error");
        return;
    }
    if (!geminiApiKey || geminiApiKey === "AIzaSyB_RFaW9xeG-2qSGMS6SyCjTWhSrrP9Kyc") {
        showToast("Please add your Gemini API key to the script.js file.", "error");
        return;
    }

    const button = document.getElementById('breakdown-task-btn');
    toggleButtonLoading(button, true);

    const prompt = `Break down the following complex task into a short list of simple, actionable sub-tasks. Task: "${taskToBreakDown}"`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: { "subtasks": { "type": "ARRAY", "items": { "type": "STRING" } } }
            }
        }
    };

    try {
        const response = await fetch(GEMINI_API_URL + geminiApiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        
        const result = await response.json();
        const subtasks = JSON.parse(result.candidates[0].content.parts[0].text).subtasks;
        
        if (subtasks && subtasks.length > 0) {
            const priority = document.getElementById('new-task-priority').value;
            for (const subtask of subtasks) {
                await addTask(subtask, priority);
            }
            titleInput.value = '';
            showToast(`✨ Broke down "${taskToBreakDown}" into ${subtasks.length} tasks!`, 'success');
        } else {
            showToast("AI couldn't break down the task. Try being more specific.", "error");
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        showToast("Failed to get AI response. Check your API key and console.", "error");
    } finally {
        toggleButtonLoading(button, false);
    }
}

async function onSuggestClick() {
    if (!geminiApiKey || geminiApiKey === "YOUR_GEMINI_API_KEY_HERE") {
        showToast("Please add your Gemini API key to the script.js file.", "error");
        return;
    }
    if (allTasks.length === 0) {
        showToast("Add some tasks first so the AI has context!", "error");
        return;
    }

    const button = document.getElementById('suggest-task-btn');
    toggleButtonLoading(button, true);

    const taskTitles = allTasks.map(t => `- ${t.title} (${t.completed ? 'done' : 'not done'})`).join('\n');
    const prompt = `Based on this to-do list, suggest one new, relevant task. Keep it short and actionable.\n\nMy list:\n${taskTitles}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };

    try {
        const response = await fetch(GEMINI_API_URL + geminiApiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

        const result = await response.json();
        const suggestion = result.candidates[0].content.parts[0].text.trim().replace(/\"/g, '');
        
        if (suggestion) {
            document.getElementById('new-task-title').value = suggestion;
            showToast("✨ AI suggested a new task!", 'success');
        } else {
            showToast("AI couldn't think of a suggestion right now.", "error");
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        showToast("Failed to get AI suggestion. Check your API key and console.", "error");
    } finally {
        toggleButtonLoading(button, false);
    }
}

let toastTimer;
function showToast(message, type = "success") {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.className = `fixed bottom-5 right-5 text-white py-3 px-6 rounded-lg shadow-lg animate-fadeIn`;
    toast.classList.add(type === 'error' ? 'bg-red-600' : 'bg-gray-800');
    toast.classList.remove('hidden');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.replace('animate-fadeIn', 'animate-fadeOut');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 4000);
}

function escapeHTML(str) {
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
}
