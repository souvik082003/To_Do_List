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
    updateProfile 
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
    setLogLevel
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
const geminiApiKey = "YOUR_GEMINI_API_KEY_HERE";

// --- App Initialization ---
let app, auth, db;
try {
     app = initializeApp(firebaseConfig);
     auth = getAuth(app);
     db = getFirestore(app);
     setLogLevel('debug');
} catch (e) {
    console.error("Firebase initialization failed:", e);
    alert("Could not connect to the database. Please check the console for errors.");
}

// --- Global State ---
let allTasks = [];
let unsubscribeFromTasks = null;
let currentFilter = 'all';

// --- Auth Flow Management ---
document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const appRoot = document.getElementById('app-root');

    // This listener is the single source of truth for the UI.
    onAuthStateChanged(auth, user => {
        loader.classList.add('hidden');
        appRoot.classList.remove('hidden');
        
        const authView = document.getElementById('auth-view');
        const mainAppView = document.getElementById('main-app-view');

        if (user) {
            // User is signed in
            authView.style.display = 'none';
            mainAppView.style.display = 'block';
            document.getElementById('user-email-display').textContent = user.displayName || user.email || 'Anonymous User';
            document.getElementById('user-id-display').textContent = user.uid;
            fetchTasks(user.uid);
        } else {
            // User is signed out
            authView.style.display = 'block';
            mainAppView.style.display = 'none';
            if (unsubscribeFromTasks) unsubscribeFromTasks();
        }
        addEventListeners();
    });

    // We still call getRedirectResult to complete the sign-in flow.
    // The onAuthStateChanged observer above will handle the UI update.
    getRedirectResult(auth).catch(error => {
        console.error("Error during redirect result:", error);
        showToast(error.message, 'error');
    });
});


// --- Event Listeners ---
function addEventListeners() {
    // Auth Buttons
    document.getElementById('login-btn').addEventListener('click', onLogin);
    document.getElementById('signup-btn').addEventListener('click', onSignup);
    document.getElementById('google-login-btn').addEventListener('click', onGoogleLogin);
    document.getElementById('anon-login-btn').addEventListener('click', onAnonLogin);
    
    // App Buttons (only add if the elements exist)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', onLogout);
    
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) addTaskBtn.addEventListener('click', onAddTask);

    const breakdownBtn = document.getElementById('breakdown-task-btn');
    if (breakdownBtn) breakdownBtn.addEventListener('click', onBreakdownClick);

    const suggestBtn = document.getElementById('suggest-task-btn');
    if (suggestBtn) suggestBtn.addEventListener('click', onSuggestClick);

    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', onFilterClick);
    });
}

// --- Auth Handlers ---
function onLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!isValidEmail(email)) {
        showToast("Please enter a valid email address.", "error");
        return;
    }
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => showToast(error.message, "error"));
}

function onSignup() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!name) return showToast("Please enter your name.", "error");
    if (!isValidEmail(email)) return showToast("Please enter a valid email address.", "error");
    if (password.length < 6) return showToast("Password must be at least 6 characters.", "error");

    createUserWithEmailAndPassword(auth, email, password)
        .then(userCredential => updateProfile(userCredential.user, { displayName: name }))
        .then(() => showToast("Account created successfully!", "success"))
        .catch(error => showToast(error.message, "error"));
}

function onGoogleLogin() {
    const provider = new GoogleAuthProvider();
    signInWithRedirect(auth, provider);
}

function onAnonLogin() {
    signInAnonymously(auth).catch(error => showToast(error.message, "error"));
}

function onLogout() {
    signOut(auth).catch(error => showToast(error.message, "error"));
}

// --- Task Handlers ---
function onAddTask() {
    const titleInput = document.getElementById('new-task-title');
    const priorityInput = document.getElementById('new-task-priority');
    const title = titleInput.value.trim();
    const priority = priorityInput.value;

    if (title) {
        addTask(title, priority);
        titleInput.value = '';
    } else {
        showToast("Task title cannot be empty.", "error");
    }
}

function onFilterClick(e) {
    currentFilter = e.target.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-white', 'dark:bg-gray-700');
    });
    e.target.classList.add('bg-blue-500', 'text-white');
    e.target.classList.remove('bg-white', 'dark:bg-gray-700');
    renderTasks(allTasks);
}

// --- Firestore Logic ---
function fetchTasks(userId) {
    const tasksRef = collection(db, "tasks");
    const q = query(tasksRef, where("userId", "==", userId));

    unsubscribeFromTasks = onSnapshot(q, (querySnapshot) => {
        const tasks = [];
        querySnapshot.forEach((doc) => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        allTasks = tasks.sort((a, b) => (a.createdAt?.toDate() || 0) - (b.createdAt?.toDate() || 0));
        renderTasks(allTasks);
    }, (error) => {
        console.error("Error fetching tasks: ", error);
        showToast("Could not fetch tasks.", "error");
    });
}

function renderTasks(tasks) {
    const taskListEl = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    loadingSpinner.classList.add('hidden');
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

    div.innerHTML = `
        <div class="flex items-center flex-grow min-w-0">
            <input type="checkbox" ${task.completed ? 'checked' : ''} class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0">
            <p class="ml-4 text-lg truncate ${task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}">${escapeHTML(task.title)}</p>
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
    if (!auth.currentUser) return;
    try {
        await addDoc(collection(db, "tasks"), {
            userId: auth.currentUser.uid,
            title,
            priority,
            completed: false,
            createdAt: new Date()
        });
    } catch (e) {
        console.error("Error adding document: ", e);
        showToast("Failed to add task.", "error");
    }
}

async function updateTaskStatus(taskId, isCompleted) {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, { completed: isCompleted });
}

async function deleteTask(taskId) {
    const taskRef = doc(db, "tasks", taskId);
    await deleteDoc(taskRef);
    showToast("Task deleted.", "success");
}

// --- Gemini AI Features ---
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=`;

async function onBreakdownClick() {
    const titleInput = document.getElementById('new-task-title');
    const taskToBreakDown = titleInput.value.trim();
    if (!taskToBreakDown) return showToast("Please enter a task to break down.", "error");
    if (!geminiApiKey || geminiApiKey === "YOUR_GEMINI_API_KEY_HERE") return showToast("Please add your Gemini API key to script.js.", "error");

    const button = document.getElementById('breakdown-task-btn');
    toggleButtonLoading(button, true);

    const prompt = `Break down this task into a short list of actionable sub-tasks: "${taskToBreakDown}"`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { "subtasks": { "type": "ARRAY", "items": { "type": "STRING" } } } } }
    };

    try {
        const response = await fetch(GEMINI_API_URL + geminiApiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        const result = await response.json();
        const subtasks = JSON.parse(result.candidates[0].content.parts[0].text).subtasks;
        if (subtasks && subtasks.length > 0) {
            const priority = document.getElementById('new-task-priority').value;
            for (const subtask of subtasks) await addTask(subtask, priority);
            titleInput.value = '';
            showToast(`✨ Broke down "${taskToBreakDown}" into ${subtasks.length} tasks!`, 'success');
        } else {
            showToast("AI couldn't break down the task.", "error");
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        showToast("Failed to get AI response. Check API key.", "error");
    } finally {
        toggleButtonLoading(button, false);
    }
}

async function onSuggestClick() {
    if (!geminiApiKey || geminiApiKey === "YOUR_GEMINI_API_KEY_HERE") return showToast("Please add your Gemini API key to script.js.", "error");
    if (allTasks.length === 0) return showToast("Add some tasks first for context!", "error");

    const button = document.getElementById('suggest-task-btn');
    toggleButtonLoading(button, true);

    const taskTitles = allTasks.map(t => `- ${t.title} (${t.completed ? 'done' : 'not done'})`).join('\n');
    const prompt = `Based on this to-do list, suggest one new, relevant task. Keep it short and actionable.\n\nMy list:\n${taskTitles}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };

    try {
        const response = await fetch(GEMINI_API_URL + geminiApiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        const result = await response.json();
        const suggestion = result.candidates[0].content.parts[0].text.trim().replace(/\"/g, '');
        if (suggestion) {
            document.getElementById('new-task-title').value = suggestion;
            showToast("✨ AI suggested a new task!", 'success');
        } else {
            showToast("AI couldn't think of a suggestion.", "error");
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        showToast("Failed to get AI suggestion. Check API key.", "error");
    } finally {
        toggleButtonLoading(button, false);
    }
}

// --- UI Helpers ---
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

let toastTimer;
function showToast(message, type = "success") {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.className = `fixed bottom-5 right-5 text-white py-3 px-6 rounded-lg shadow-lg`;
    toast.classList.add(type === 'error' ? 'bg-red-600' : 'bg-gray-800', 'animate-fadeIn');
    toast.classList.remove('hidden');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.replace('animate-fadeIn', 'animate-fadeOut');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 4000);
}

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}
