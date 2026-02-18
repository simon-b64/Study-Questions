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
- **Persistent Storage**: Progress automatically saved to localStorage
- **Import/Export**: Backup and transfer your progress as JSON files
- **Version Control**: Hash-based validation warns you when course content changes

### 🎨 Modern UI/UX
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Bootstrap 5**: Clean, professional interface
- **Accessible**: WCAG AA compliant with proper ARIA labels and keyboard navigation
- **Real-time Feedback**: Instant visual feedback on answers with explanations

### 📚 Course Management
- **Multiple Courses**: Support for unlimited courses
- **Topic Organization**: Questions grouped by topics/themes
- **Course Validation**: Automatic detection of course updates via content hashing

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

### Development Server

Start the local development server:

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload when you change source files.

## 📖 Usage

### Adding a Course

1. Create a JSON file in the `public/` directory following this structure:
```json
{
  "questionGroups": [
    {
      "name": "Topic Name",
      "question": [
        {
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
│   ├── components/       # Reusable components (navbar, etc.)
│   ├── model/           # Data models and interfaces
│   ├── store/           # NgRx Signals store for state management
│   ├── utils/           # Utility functions (hashing, etc.)
│   └── view/            # Page components
│       ├── home/                 # Course selection page
│       ├── course-overview/     # Progress dashboard
│       └── question-view/       # Question answering interface
└── public/              # Static assets and course JSON files
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
- **Bootstrap 5**: Responsive UI framework
- **Bootstrap Icons**: Icon library
- **TypeScript**: Type-safe development
- **RxJS**: Reactive programming

## 🧪 Testing

Run unit tests:

```bash
npm test
```

Tests are run using [Vitest](https://vitest.dev/).

## 🤝 Contributing

When adding new features:
1. Follow Angular best practices (standalone components, signals, OnPush change detection)
2. Maintain accessibility standards (WCAG AA)
3. Ensure mobile responsiveness
4. Update progress tracking if modifying question flow

## 🙏 Acknowledgments

- Built with [Angular CLI](https://angular.dev/tools/cli) version 21.1.0
- Developed with assistance from AI tooling
- Bootstrap components and styling
