# ScienceSnap Infographics

ScienceSnap is an interactive, AI-powered educational web application that generates stunning visual infographics about scientific facts. Designed to engage young audiences, it combines the power of Google's Gemini models with a persistent gallery to make learning science visually captivating and accessible.

## 🌟 Features

### 1. Dual Discovery Modes
- **Explore Domain**: Enter a scientific field (e.g., *Astrophysics*, *Marine Biology*) to generate a set of surprising and interesting facts.
- **Explain Concept**: Enter a specific concept (e.g., *Black Holes*, *Photosynthesis*) to get a deep-dive explanation tailored for visualization.

### 2. AI-Powered Creation Pipeline
The app uses a multi-step AI process to ensure high-quality output:
- **Fact Generation**: Uses `gemini-2.5-flash` to source accurate, kid-friendly scientific information.
- **Visual Planning**: Generates a detailed design plan for the infographic, specifying layout, color palette, and visual metaphors.
- **Image Generation**: Uses `gemini-3-pro-image-preview` (Imagen 3) to render high-fidelity 3:4 infographics based on the generated plan.

### 3. Interactive Gallery
- **Persistence**: Saved infographics are stored using **InstantDB**, allowing for real-time updates and persistence.
- **Domain Filtering**: Filter your collection by scientific domain (e.g., show only "Physics" or "Biology" cards).
- **Details View**: Inspect infographics in a focused modal with full metadata.
- **Image Editing**: Refine generated images using natural language prompts (e.g., *"Add a starry background"*).
- **Download**: Save high-resolution images to your device.

### 4. Multilingual Support
- Fully localized for **English** and **French**.
- Content generation (facts and image text) adapts to the selected language.

## 🛠 Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI Integration**: [Google GenAI SDK](https://www.npmjs.com/package/@google/genai)
- **Database**: [InstantDB](https://www.instantdb.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Setup & Usage

### Prerequisites
- A valid **Google GenAI API Key** with access to:
  - `gemini-2.5-flash` (Text generation)
  - `gemini-3-pro-image-preview` (Image generation)

### Running the App
1. **Launch**:
   Serve the project root using a static file server.
   ```bash
   npx serve .
   ```

2. **API Key**:
   When you first launch the app, you will be prompted to select or enter your Google API Key. This key is used for all AI generation tasks.

## 📂 Project Structure

- **`App.tsx`**: Main application logic, state management, and view routing.
- **`services/geminiService.ts`**: Handles all interactions with the Google Gemini API.
- **`services/imageUploadService.ts`**: Manages image uploads (fallback to local Base64 if offline/unconfigured).
- **`components/`**: Reusable UI components (`FactCard`, `GalleryGrid`, `ImageModal`).
- **`db.ts`**: InstantDB initialization.
- **`translations.ts`**: Localization dictionaries.

## 📝 License

This project is created for educational purposes to demonstrate the capabilities of Generative AI in education technology.