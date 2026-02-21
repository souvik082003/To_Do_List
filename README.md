# Modern To-Do List

A sleek, responsive to-do list web app that integrates **Firebase Authentication & Firestore** with **Google Gemini AI** for smart task breakdowns and suggestions.  
Built with **HTML**, **Tailwind CSS**, and **JavaScript**.
qd-test-1
## ✨ Features
- **User Authentication**  
  - Email & Password Sign Up / Login  
  - Google Sign-In  
  - Anonymous guest mode
  - add anything you want
- **Task Management**  
  - Add, complete, delete tasks  
  - Filter tasks by status (All, Active, Completed)  
  - Priority levels (High, Medium, Low) with color indicators  
- **AI Assistance (Gemini API)**  
  - Break down complex tasks into smaller sub-tasks  
  - Suggest relevant new tasks based on your list  
- **Real-time Sync** via Firebase Firestore  
- **Responsive Design** (works on mobile, tablet, desktop)  
- **Dark Mode** support

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/modern-todo-gemini.git
cd modern-todo-gemini
```

### 2. Set up Firebase
- Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
- Enable **Authentication** (Email/Password & Google)
- Enable **Cloud Firestore**
- Copy your Firebase config and replace it in `script.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

### 3. Add your Gemini API key
- Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Replace in `script.js`:
```javascript
const geminiApiKey = "YOUR_GEMINI_API_KEY";
```

### 4. Run locally
Just open `index.html` in your browser, or use a local server:
```bash
npx serve
```

### 5. Deploy
You can deploy easily to:
- **GitHub Pages**
- **Vercel**
- **Netlify**
- **Firebase Hosting**

---

## 📂 Project Structure
```
index.html     # Main UI layout
style.css      # Custom styles & overrides
script.js      # App logic, Firebase, AI integration
```

---

