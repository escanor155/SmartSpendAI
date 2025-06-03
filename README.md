
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
*   **Database & Auth**:
    *   Firebase Authentication (for user management)
    *   Firestore (as a persistent NoSQL database)

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm (comes with Node.js) or yarn
*   **Firebase Project**:
    *   Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
    *   You'll need this to get Firebase configuration details for the app for using Firestore and Firebase Authentication.
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
    Create a file named `.env` (or `.env.local`) in the root of your project.

2.  **Add Firebase Configuration**:
    In your Firebase project console, go to Project settings > General. Under "Your apps", select your web app (or create one). Find the "SDK setup and configuration" and copy the `firebaseConfig` object values into your `.env` (or `.env.local`):
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
    Add the API key you obtained from Google AI Studio to your `.env` (or `.env.local`) file:
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

## Deployment (Free Tier using Vercel)

This project is well-suited for deployment on Vercel, which offers a generous free tier for Next.js applications.

1.  **Push to a Git Repository**:
    *   Ensure your project is a Git repository and you've committed your latest changes.
    *   Push your repository to GitHub, GitLab, or Bitbucket.

2.  **Sign Up/Log In to Vercel**:
    *   Go to [vercel.com](https://vercel.com/) and sign up (you can use your Git provider account for quick setup).

3.  **Import Your Project**:
    *   From your Vercel dashboard, click "Add New..." -> "Project".
    *   Import your Git repository. Vercel will usually auto-detect that it's a Next.js project.

4.  **Configure Environment Variables on Vercel**:
    *   During the import process or in your Vercel project settings (Settings -> Environment Variables), you **must** add the same environment variables you have in your local `.env` file. These are crucial for Firebase and Genkit to work in the deployed environment.
        *   `NEXT_PUBLIC_FIREBASE_API_KEY`
        *   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
        *   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
        *   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
        *   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
        *   `NEXT_PUBLIC_FIREBASE_APP_ID`
        *   `GOOGLE_API_KEY` (This one does *not* start with `NEXT_PUBLIC_`)
    *   Vercel will use these environment variables during the build and at runtime.

5.  **Deploy**:
    *   Click "Deploy". Vercel will build your application and deploy it.
    *   Once deployed, Vercel will provide you with a URL (e.g., `your-project-name.vercel.app`) that you can share with your beta testers.

6.  **Genkit on Vercel**:
    *   Your Genkit flows are server-side code that Next.js will handle as API routes or server actions. Vercel's Node.js environment supports this.
    *   You won't have the separate Genkit Dev UI (`:3400`) in production, but your flows will execute as part of your Next.js app.

## AI Flows

The AI logic is managed by Genkit flows, located in `src/ai/flows/`:

*   **`categorize-expenses.ts`**: Takes an item name and suggests a financial category for it.
*   **`process-shopping-request.ts`**: Interprets a natural language shopping request (e.g., "I need eggs and bread"), searches a provided (currently mock) expense history for the best prices/brands, and returns a list of items to add to the shopping list with details.
*   **`scan-receipt.ts`**: Uses multimodal capabilities to analyze an image of a receipt. It extracts the store name, total amount, and a list of items, including their names, prices, brands, and attempts to categorize each item.
*   **`suggest-shopping-list-items.ts`**: Based on a comma-separated string of past purchases, suggests a specified number of new items for the shopping list.

The Genkit configuration, including the chosen AI model (e.g., `gemini-2.0-flash`), is in `src/ai/genkit.ts`.

## Security Considerations

This application incorporates several security measures and best practices:

*   **Firebase Authentication**: Securely handles user registration, login, and session management. Sensitive credentials like passwords are not stored directly by the app.
*   **Firestore Security Rules**: Server-side rules are configured in your Firebase project to ensure users can only access and modify their own data (expenses, shopping list items, preferences). These rules are enforced by Firebase directly.
*   **Environment Variables**:
    *   Sensitive API keys (like `GOOGLE_API_KEY` for Genkit and Firebase service configurations) are managed through environment variables.
    *   **Crucially, `.env` and `.env.local` files containing these keys MUST NOT be committed to version control (GitHub).** They should be listed in your `.gitignore` file.
    *   When deploying to Vercel, these environment variables must be securely configured in the Vercel project settings.
*   **Input Validation**:
    *   Client-side forms use Zod for validating user input before submission.
    *   Genkit AI flows use Zod schemas to validate their inputs and expected outputs, ensuring data integrity when interacting with AI models.
*   **HTTPS**: Deployments on Vercel are automatically served over HTTPS, encrypting data in transit.
*   **Next.js/React Defaults**: The frameworks provide built-in protections against common web vulnerabilities like Cross-Site Scripting (XSS) through automatic data escaping in JSX.
*   **Genkit Flow Execution**: AI flows are executed on the server-side. Calls to AI models are authenticated. Data mutations resulting from flow outputs are typically performed by client-side logic that is subject to Firestore security rules.

It's important to regularly review security configurations, especially Firestore rules and environment variable management, as the application evolves.

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
├── .env.local.example              # Example environment file (rename to .env.local or .env)
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

    
    