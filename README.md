# Study Questions App

> ⚠️ **AI Generation Disclaimer**: This application was developed with significant assistance from AI (GitHub Copilot). While the code has been reviewed and tested, users should be aware of this development approach.

A modern, intelligent study application built with Angular 21 that helps you master course material through spaced repetition and smart question prioritization.

## ✨ Features

### 🎯 Smart Learning Algorithm
- **Adaptive Question Prioritization**: Questions are presented based on your mastery level
  - New questions get priority to expand knowledge
  - Struggling questions appear more frequently
  - Mastered questions appear occasionally for retention
- **Mastery Levels**: Track progress through 4 levels (Not Started → Learning → Reviewing → Mastered)
- **Streak Tracking**: Monitor your learning momentum with consecutive correct answer tracking

### 📊 Comprehensive Progress Tracking
- **Detailed Metrics**: Track attempts, accuracy, consecutive correct answers, and mastery levels for each question
- **Visual Progress Dashboard**: See your overall and per-topic progress at a glance
- **Persistent Storage**: Progress automatically saved to localStorage and optionally synced to the cloud
- **Import/Export**: Backup and transfer your progress as JSON files
- **Sync Conflict Resolution**: When cloud and local progress diverge, you are prompted to choose which version to keep

### ☁️ Firebase Integration (optional)
- **Google Sign-In**: Log in with your Google account via a button in the navbar — no forced login
- **Firestore Sync**: Progress is automatically saved to and loaded from Firestore when logged in
- **Graceful Degradation**: The app works fully offline/without Firebase — progress is stored in localStorage
- **App Check (reCAPTCHA v3)**: Optional abuse protection for the Firebase backend

### 🎨 Modern UI/UX
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Bootstrap 5**: Clean, professional interface
- **Accessible**: WCAG AA compliant with proper ARIA labels and keyboard navigation
- **Real-time Feedback**: Instant visual feedback on answers with explanations
- **Loading States**: Auth and course loading states are clearly communicated to the user

### 📚 Course Management
- **Multiple Courses**: Support for unlimited courses
- **Topic Organization**: Questions grouped by topics/themes
- **Course Synchronization**: Progress is automatically reconciled when course content changes

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v11.6.2 or higher)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd study-questions
```

2. Install dependencies:
```bash
npm install
```

3. Add your course data:
   - Place your course JSON files in the `public/` directory
   - Format: `{courseId}.json` (e.g., `daten-informatikrecht.json`)

### Configuration

The app is configured at runtime via a `public/config.json` file (loaded before bootstrapping Angular). This means no secrets are baked into the build — the same Docker image can be deployed to multiple environments.

Copy the example and fill in your values:
```bash
cp public/config.json.example public/config.json
```

```json
{
  "firebase": {
    "apiKey": "...",
    "authDomain": "...",
    "projectId": "...",
    "storageBucket": "...",
    "messagingSenderId": "...",
    "appId": "...",
    "recaptchaSiteKey": "..."
  }
}
```

> **Note**: If `config.json` is missing or `apiKey` is empty, Firebase features (login & sync) are silently disabled and the app runs in local-only mode.

> **Note on security**: Firebase web API keys are [not secret](https://firebase.google.com/docs/projects/api-keys). Access to your data is protected by Firebase Security Rules, not by keeping the key private. It is safe to commit `config.json` to a public repository.

#### Firebase Setup

1. Create a project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication → Google** as a sign-in provider
3. Add your domain (e.g. `learn.avox.at`) under **Authentication → Settings → Authorized domains**
4. Create a **Firestore Database** and apply the following security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
    match /users/{userId}/progress/{courseId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

5. (Optional) Register a **reCAPTCHA v3** site key and enable **App Check** in the Firebase console, then add `recaptchaSiteKey` to `config.json`.

### Development Server

Start the local development server:

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload when you change source files.

## 🐳 Docker Deployment

The included `Dockerfile` builds a production image served by nginx. Firebase configuration is injected at container startup via environment variables — no rebuild required.

### Build

```bash
docker build -t study-questions .
```

### Run

```bash
docker run -p 8080:80 \
  -e FIREBASE_API_KEY="..." \
  -e FIREBASE_AUTH_DOMAIN="..." \
  -e FIREBASE_PROJECT_ID="..." \
  -e FIREBASE_STORAGE_BUCKET="..." \
  -e FIREBASE_MESSAGING_SENDER_ID="..." \
  -e FIREBASE_APP_ID="..." \
  -e FIREBASE_RECAPTCHA_SITE_KEY="..." \
  study-questions
```

The entrypoint script writes these variables into `/usr/share/nginx/html/config.json` before nginx starts, so the Angular app picks them up at runtime.

## 📖 Usage

### Logging In

Click the **Login** button in the navbar to sign in with Google. Login is entirely optional — the app works without an account. When logged in, your progress is synced to Firestore and available across all your devices.

### Adding a Course

1. Create a JSON file in the `public/` directory following this structure:
```json
{
  "questionGroups": [
    {
      "name": "Topic Name",
      "questions": [
        {
          "id": "q-unique-id",
          "question": "Your question text?",
          "hint": "A helpful hint",
          "answers": [
            { "text": "Ja", "correct": true },
            { "text": "Nein", "correct": false }
          ],
          "reason": "Explanation why this is correct"
        }
      ]
    }
  ]
}
```

2. Update `src/app/view/course-overview/course-overview.ts` and `src/app/view/home/home.ts` to include your course metadata.

### Studying

1. **Select a Course**: Click on a course from the home page
2. **View Progress**: See your overall and per-topic progress
3. **Start Questions**: Click "Alle Fragen starten" or choose a specific topic
4. **Answer Questions**: Select your answer and get immediate feedback
5. **Track Progress**: Watch your mastery levels increase as you learn

### Managing Progress

- **Export**: Download your progress as JSON for backup
- **Import**: Load previously saved progress
- **Reset**: Clear all progress and start fresh

## 🏗️ Project Structure

```
src/
├── app/
│   ├── components/       # Reusable components (navbar, auth button, modals)
│   ├── model/           # Data models and interfaces
│   ├── services/        # Auth, Firestore, localStorage, sync conflict services
│   ├── store/           # NgRx Signals stores (AuthStore, CourseStore)
│   ├── utils/           # Utility functions (progress calc, course loading)
│   └── view/            # Page components
│       ├── home/                 # Course selection page
│       ├── course-overview/      # Progress dashboard
│       └── question-view/        # Question answering interface
public/
├── config.json.example   # Firebase config template
└── *.json                # Course data files
```

## 🛠️ Building for Production

Build the project:

```bash
npm run build
```

Build artifacts will be stored in the `dist/` directory, optimized for production deployment.

## 📦 Technologies Used

- **Angular 21**: Modern standalone components with signals
- **NgRx Signals**: Reactive state management
- **Firebase / AngularFire**: Google Sign-In authentication and Firestore cloud sync
- **Firebase App Check**: reCAPTCHA v3-based abuse protection (optional)
- **Bootstrap 5**: Responsive UI framework
- **Bootstrap Icons**: Icon library
- **TypeScript**: Type-safe development
- **RxJS**: Reactive programming

Tests are run using [Vitest](https://vitest.dev/).

## 🤝 Contributing

When adding new features:
1. Follow Angular best practices (standalone components, signals, OnPush change detection)
2. Maintain accessibility standards (WCAG AA)
3. Ensure mobile responsiveness
4. Update progress tracking if modifying question flow

## 📝 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

### What this means:
- ✅ **Free to use**: You can use this software for any purpose
- ✅ **Free to modify**: You can change and adapt the code
- ✅ **Free to distribute**: You can share the original or modified versions
- ⚠️ **Copyleft**: If you distribute modified versions, they must also be open source under GPL-3.0
- ⚠️ **Share improvements**: Modifications must be made available under the same license
- 📋 **Attribution**: You must include the original copyright and license notices

See the [LICENSE](LICENSE) file for the full license text, or visit [https://www.gnu.org/licenses/gpl-3.0.html](https://www.gnu.org/licenses/gpl-3.0.html)

## 🙏 Acknowledgments

- Built with [Angular CLI](https://angular.dev/tools/cli) version 21.1.0
- Developed with assistance from AI tooling
- Bootstrap components and styling
