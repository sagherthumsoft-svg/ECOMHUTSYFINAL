# EcomHutsy Platform

A complete Next.js modern chat platform and internal team hub with Firebase.

## Setup Instructions

1. **Create Firebase Project**:
   - Enable Authentication (Google Sign-In + Email/Password).
   - Enable Firestore Database.
   - Enable Storage.

2. **Database Setup**:
   - Manually create the first user in Firebase Auth.
   - Manually create a document in the `users` collection matching the Auth UID with `role: "owner"`.

3. **Configure Environment Variables**:
   Copy `.env.local` or map the variables to your Hosting secrets:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account"...}'
   ```

4. **Security Rules Deployment**:
   Inside the project, run:
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

5. **Local Development**:
   ```bash
   npm run dev
   ```

6. **Production Deployment**:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy
   ```
   (Uses Next.js App Hosting framework out-of-the-box by Firebase)

## Architecture Overview
- **Next.js App Router**: Optimized layout components.
- **TailwindCSS**: Used for a soft card and modern design.
- **Firebase Admin SDK**: Securely handles routing requests to create a new user profile over the REST API and pushes them to Firestore, bypassing client-enforced logged-in user overrides.
- **Zustand**: Cross-component synchronization of `userSession` and `activeChat`.

Enjoy!
