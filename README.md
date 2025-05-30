# SmartSpend AI CoPilot

SmartSpend is a Next.js application designed to help you manage your finances intelligently using AI-powered features. Track expenses, scan receipts, manage a smart shopping list, and get financial insights, all with the assistance of AI.

## Features

*   **Dashboard Overview**: A quick summary of your financial status (currently with placeholder data).
*   **Expense Tracking**:
    *   Manually add, edit, and delete expenses.
    *   AI-powered category suggestions for manually entered items.
*   **Receipt Scanning**:
    *   Upload receipt images for automatic item extraction using OCR.
    *   AI attempts to categorize scanned items and identify store names.
*   **Smart Shopping List**:
    *   Add items using natural language prompts (e.g., "I need eggs and milk").
    *   AI agent attempts to find the best prices and brand details from (mock) expense history.
    *   Get quick AI-based suggestions for items to add based on past purchase patterns.
*   **Financial Reports**: Visualize spending by category and monthly trends (currently with mock data).
*   **Currency Selection**: Choose your preferred currency (USD, AED, PHP, JPY, EUR, GBP) for displaying financial values.
*   **Theme Toggle**: Switch between Light and Dark mode.

## Tech Stack

*   **Frontend**:
    *   Next.js (App Router, Server Components)
    *   React
    *   TypeScript
*   **UI & Styling**:
    *   ShadCN UI (for UI components)
    *   Tailwind CSS
    *   Lucide React (for icons)
*   **AI & Backend Logic**:
    *   Genkit (Firebase Genkit for orchestrating AI flows)
    *   Google AI / Gemini Models (for generative AI capabilities)
    *   Next.js Server Actions (implicitly, as Genkit flows are server-side)
*   **Forms & State Management**:
    *   React Hook Form
    *   Zod (for schema validation)
    *   React Context API (for global state like currency)
*   **Charts**:
    *   Recharts
*   **Planned for Future**:
    *   Firebase Authentication (for user management)
    *   Firestore (as a persistent NoSQL database)

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm (comes with Node.js) or yarn
*   **Firebase Project**:
    *   Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
    *   You'll need this to get Firebase configuration details for the app and eventually for using Firestore and Firebase Authentication.
*   **Google AI API Key**:
    *   Genkit uses Google AI models. You'll need an API key.
    *   You can obtain one from Google AI Studio: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <your-repository-url>
    cd <repository-name>
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    # or
    # yarn install
    ```

### Configuration

1.  **Create an environment file**:
    Create a file named `.env.local` in the root of your project.

2.  **Add Firebase Configuration (Optional for now, but required for database/auth features later)**:
    In your Firebase project console, go to Project settings > General. Under "Your apps", select your web app (or create one). Find the "SDK setup and configuration" and copy the `firebaseConfig` object values into your `.env.local`:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
    ```
    *Note: These `NEXT_PUBLIC_` variables are accessible on the client-side. For server-side Firebase Admin SDK (if used directly later), keys would be handled differently.*

3.  **Add Google AI API Key for Genkit**:
    Add the API key you obtained from Google AI Studio to your `.env.local` file:
    ```env
    GOOGLE_API_KEY="YOUR_GOOGLE_AI_API_KEY"
    ```
    The `googleAI()` plugin in `src/ai/genkit.ts` will use this key.

### Running the Development Servers

You need to run two development servers concurrently: one for the Next.js application and one for Genkit.

1.  **Start the Next.js development server**:
    ```bash
    npm run dev
    ```
    This will typically start the application on `http://localhost:9002`.

2.  **Start the Genkit development server (in a separate terminal)**:
    ```bash
    npm run genkit:dev
    ```
    This starts the Genkit development UI, usually on `http://localhost:3400`, where you can inspect and test your AI flows.

    Alternatively, to have Genkit watch for changes in your flow files:
    ```bash
    npm run genkit:watch
    ```

3.  Open `http://localhost:9002` in your browser to use the application.

## Building for Production

To create an optimized production build:
```bash
npm run build
```
This will generate a `.next` folder with the production-ready assets. To run this locally:
```bash
npm run start
```

## Deployment

This project includes an `apphosting.yaml` file, indicating it's set up for deployment to **Firebase App Hosting**.

1.  **Install Firebase CLI**: If you don't have it already:
    ```bash
    npm install -g firebase-tools
    ```
2.  **Login to Firebase**:
    ```bash
    firebase login
    ```
3.  **Initialize App Hosting**: If you haven't linked your local project to your Firebase project for App Hosting:
    ```bash
    firebase init apphosting
    ```
    Follow the prompts to select your Firebase project and configure the backend.
4.  **Deploy**:
    ```bash
    firebase apphosting:backends:deploy yourBackendId --source=.
    # Or use the generic deploy command if you have other Firebase services
    # firebase deploy --only hosting # (This might need adjustment for App Hosting specifics)
    ```
    Refer to the official Firebase App Hosting documentation for the most current deployment commands and procedures.

## AI Flows

The AI logic is managed by Genkit flows, located in `src/ai/flows/`:

*   **`categorize-expenses.ts`**: Takes an item name and suggests a financial category for it.
*   **`process-shopping-request.ts`**: Interprets a natural language shopping request (e.g., "I need eggs and bread"), searches a provided (currently mock) expense history for the best prices/brands, and returns a list of items to add to the shopping list with details.
*   **`scan-receipt.ts`**: Uses multimodal capabilities to analyze an image of a receipt. It extracts the store name, total amount, and a list of items, including their names, prices, brands, and attempts to categorize each item.
*   **`suggest-shopping-list-items.ts`**: Based on a comma-separated string of past purchases, suggests a specified number of new items for the shopping list.

The Genkit configuration, including the chosen AI model (e.g., `gemini-2.0-flash`), is in `src/ai/genkit.ts`.

## Key Folder Structure

```
smartspend-ai-copilot/
├── src/
│   ├── app/                        # Next.js App Router (pages, layouts)
│   │   ├── (app)/                  # Authenticated/main app routes
│   │   │   ├── dashboard/
│   │   │   ├── expenses/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   └── shopping-list/
│   │   ├── globals.css             # Global styles and ShadCN theme variables
│   │   └── layout.tsx              # Root layout
│   ├── ai/                         # Genkit AI configuration and flows
│   │   ├── flows/                  # Individual AI flows
│   │   ├── dev.ts                  # Genkit development server entry point
│   │   └── genkit.ts               # Genkit global configuration
│   ├── components/                 # React components
│   │   ├── common/                 # General reusable components
│   │   ├── features/               # Feature-specific components
│   │   └── ui/                     # ShadCN UI components
│   ├── config/                     # Application-level configurations (e.g., currencies)
│   ├── contexts/                   # React Context API providers
│   ├── hooks/                      # Custom React hooks
│   ├── lib/                        # Utility functions
│   └── types/                      # TypeScript type definitions
├── public/                         # Static assets
├── .env.local.example              # Example environment file (rename to .env.local)
├── apphosting.yaml                 # Firebase App Hosting configuration
├── components.json                 # ShadCN UI configuration
├── next.config.ts                  # Next.js configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Future Enhancements (Ideas)

*   Full Firebase Authentication for user accounts.
*   Firestore integration for persistent storage of expenses, shopping lists, user preferences.
*   Enhanced AI:
    *   Budget creation and tracking assistance.
    *   Spending pattern analysis and insights.
    *   Subscription management reminders.
*   More detailed financial reports and visualizations.
*   User profile management.

## Contributing

Currently, this project is primarily a demonstration within Firebase Studio. If it were to become a community project, contribution guidelines would be added here.
```