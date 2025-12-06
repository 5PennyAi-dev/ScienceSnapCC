# ScienceSnap Infographics

ScienceSnap is an interactive, AI-powered educational web application that generates stunning visual infographics about scientific facts. Designed to engage young audiences, it combines the power of Google's Gemini models with Perplexity AI research and a persistent gallery to make learning science visually captivating and accessible.

## 🌟 Features

### 1. Dual Discovery Modes
- **Explore Domain**: Enter a scientific field (e.g., *Astrophysics*, *Marine Biology*) to generate a set of surprising and interesting facts.
- **Explain Concept**: Enter a specific concept (e.g., *Black Holes*, *Photosynthesis*) to get a deep-dive explanation tailored for visualization.

### 2. AI-Powered Creation Pipeline
The app uses a multi-step AI process to ensure high-quality output:
- **Perplexity Research**: Automatically researches scientific facts using Perplexity AI to gather accurate, up-to-date context and supporting details.
- **Fact Generation**: Uses `gemini-2.5-flash` to source accurate, kid-friendly scientific information enhanced with research context.
- **Visual Planning**: Generates a detailed design plan for the infographic, specifying layout, color palette, and visual metaphors.
- **Image Generation**: Choose between `gemini-2.5-flash` or `gemini-3-pro-image-preview` (default) to render high-fidelity 3:4 infographics based on the generated plan.

### 3. Interactive Gallery with Folder Organization
- **Persistence**: Saved infographics are stored using **InstantDB**, allowing for real-time updates and persistence.
- **Folder Organization**: Create custom folders to organize your infographics by topic, domain, or any category you choose.
- **Drag-and-Drop**: Easily move infographics between folders with intuitive drag-and-drop functionality.
- **Folder Management**: Rename, delete, and manage folders to keep your collection organized.
- **Domain Filtering**: Filter your collection by scientific domain (e.g., show only "Physics" or "Biology" cards).
- **Details View**: Inspect infographics in a focused modal with full metadata.
- **Image Editing**: Refine generated images using natural language prompts (e.g., *"Add a starry background"*).
- **Download**: Save high-resolution images to your device.

### 4. Model Selection
- **Flexible AI Models**: Choose your preferred image generation model:
  - `gemini-3-pro-image-preview` (Imagen 3) - Default, highest quality
  - `gemini-2.5-flash` - Faster generation
- Model selection is available directly in the home interface.

### 5. Multilingual Support
- Fully localized for **English** and **French**.
- Content generation (facts and image text) adapts to the selected language.

## 🛠 Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI Integration**: 
  - [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) - Text and image generation
  - [Perplexity AI](https://www.perplexity.ai/) - Real-time research and fact verification
- **Database**: [InstantDB](https://www.instantdb.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **Google GenAI API Key** with access to:
  - `gemini-2.5-flash` (Text generation)
  - `gemini-3-pro-image-preview` (Image generation)
- **Perplexity API Key** (optional but recommended for enhanced research features)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd ScienceSnapCC
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env.local` file in the project root:
   ```env
   GEMINI_API_KEY=your_google_genai_api_key_here
   PERPLEXITY_API_KEY=your_perplexity_api_key_here
   ```

   **Getting API Keys**:
   - **Google GenAI**: Get your key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - **Perplexity AI**: Get your key from [Perplexity API](https://www.perplexity.ai/settings/api)

### Running the App

1. **Development mode**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

2. **Build for production**:
   ```bash
   npm run build
   ```

3. **Preview production build**:
   ```bash
   npm run preview
   ```

### First Launch

When you first launch the app, you may be prompted to enter your API keys if they're not configured in the environment variables. The keys are used for:
- **Gemini API**: All text and image generation tasks
- **Perplexity API**: Real-time research to enhance fact accuracy and context

## 📂 Project Structure

- **`App.tsx`**: Main application logic, state management, and view routing.
- **`services/`**:
  - `geminiService.ts`: Handles all interactions with the Google Gemini API.
  - `perplexityService.ts`: Manages Perplexity AI research requests.
  - `imageUploadService.ts`: Manages image uploads (fallback to local Base64 if offline/unconfigured).
- **`components/`**: Reusable UI components:
  - `FactCard.tsx`: Individual fact display cards
  - `GalleryGrid.tsx`: Gallery view with drag-and-drop support
  - `FolderList.tsx`: Folder management sidebar
  - `ImageModal.tsx`: Full-screen image viewer and editor
- **`db.ts`**: InstantDB initialization and configuration.
- **`translations.ts`**: Localization dictionaries for English and French.
- **`types.ts`**: TypeScript type definitions.
- **`constants.ts`**: Application constants and configuration.

## 🎯 Usage Tips

- **Organize with Folders**: Create folders for different topics (e.g., "Space", "Biology", "Chemistry") and drag infographics to organize them.
- **Research Enhancement**: The Perplexity integration automatically enriches facts with current research, making infographics more accurate and detailed.
- **Model Selection**: Use `gemini-3-pro-image-preview` for the highest quality images, or switch to `gemini-2.5-flash` for faster generation.
- **Language Switching**: Toggle between English and French to generate content in your preferred language.

## 📝 License

This project is created for educational purposes to demonstrate the capabilities of Generative AI in education technology.