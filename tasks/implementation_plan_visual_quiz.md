# Implementation Plan: Option B - Visual Worksheet (Static Quiz)

## Goal
Implement a second mode of "Quiz" generation that produces a **single, high-quality static infographic image** containing embedded questions and answers (e.g., a worksheet, board game layout, or Q&A poster). This contrasts with Option A (Interactive/App-like).

## 1. User Interface Updates (New Folder Dashboard)
The user requires a dedicated section in the main gallery view for managing folder actions, separating it from the sidebar list.

### A. Remove Legacy Button
*   **`FolderList.tsx`**: Remove the "Create Quiz" (Gamepad) button from the sidebar items.

### B. Create "Folder Dashboard" in `App.tsx`
*   **Location**: Top of the main content area (above the Search/Filter bar), visible *only* when a folder is selected.
*   **Design**: A stylized header card containing:
    *   **Title**: Large folder name.
    *   **Stats**: Item count.
    *   **Action Area**: "Create Quiz" section with two distinct branding cards/buttons.
*   **Buttons**:
    1.  **Interactive Quiz** (Gamepad Icon):
        *   Label: "Playable Quiz"
        *   Action: Calls existing `handleCreateQuiz`.
    2.  **Visual Worksheet** (FileText/Image Icon):
        *   Label: "Visual Worksheet"
        *   Action: Calls new `handleCreateVisualQuiz`.

## 2. Logic & Service Layer (`geminiService.ts`)
This is the core challenge. Unlike Option A (which generates JSON for code to render), Option B requires the **Image Model** to render legible text.

### Strategy: "Concept-to-Visual-Prompt"
1.  **Step 1 (Text Model)**: Analyze folder facts and generate a **Visual Prompt Design**.
    *   *Input*: Facts from folder.
    *   *Task*: Select 3-4 short, punchy questions/facts suitable for a poster.
    *   *Output*: A detailed prompt for the Image Model. 
    *   *Example Prompt Structure*: "A vertical educational poster about Ants. Title at top: 'ANT QUIZ'. Colorful vector style. Section 1: Illustration of an ant lifting a leaf with text 'Strongest Insect!'. Section 2: Question text 'How many legs?'. Bottom section: Answer text upside down '6 Legs'."

2.  **Step 2 (Image Model)**:
    *   *Model*: `gemini-3-pro-image-preview` (crucial for text rendering capabilities).
    *   *Aspect Ratio*: Force `TALL` (9:16) for a "Worksheet" feel.
    *   *Prompt*: The output from Step 1.

### New Functions:
*   `generateVisualQuizPrompt(facts: ScientificFact[], style: ArtStyle)`: Returns the string prompt for the image model.

## 3. Data Model & Persistence
*   **Type**: Stored as a standard `InfographicItem`.
*   **Metadata**:
    *   `isQuiz`: `false` (It is NOT an interactive app).
    *   `domain`: "Visual Quiz" (or existing domain).
    *   `tags`: ["worksheet", "static-quiz"].
*   This ensures it appears in the gallery as a standard image, viewable in the standard `ImageModal`. No special `QuizModal` interaction is required.

## 4. Step-by-Step Implementation Checklist

- [ ] **UI**: Create `FolderDashboard` component in `App.tsx` (or as separate component).
- [ ] **UI**: Remove old button from `FolderList`.
- [ ] **Service**: Implement `generateVisualQuizPrompt` in `geminiService.ts`.
    - [ ] Create specialized prompt template `VISUAL_WORKSHEET_PROMPT` in `constants.ts` (Focus on instructing the model to "Draw text clearly").
- [ ] **App**: Implement `handleCreateVisualQuiz` in `App.tsx`.
    - [ ] Fetch facts (reuse existing logic).
    - [ ] Call `generateVisualQuizPrompt`.
    - [ ] Call `generateInfographicImage` with `TALL` aspect ratio.
    - [ ] Save to DB as standard infographic.

## 5. Potential Challenges & Mitigations
*   **Challenge**: Text legibility in generated images.
    *   *Mitigation*: Limit to 3 questions maximum. Use "Poster" or "Infographic" style keywords.
*   **Challenge**: User Confusion between Quiz types.
    *   *Mitigation*: Clear icons and labels in the selection menu ("Play Game" vs "Printable Sheet").
