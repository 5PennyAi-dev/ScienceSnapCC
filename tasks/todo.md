# Adjust Process/Sequence Prompts for More Text Content

## Problem
- The images for processes/sequences have too little text/explanation
- Image 1 (lever): Too sparse - just short labels with minimal explanation
- Image 2 (ant strength): Good balance - engaging titles, clear explanations, educational details

## Todo
- [x] Review the current prompts for process step generation
- [x] Adjust `PROCESS_STEP_PLAN_PROMPT` to require more explanatory text like the ant strength example
- [x] Adjust `PROCESS_STEP_PLAN_PROMPT2` to require more explanatory text
- [x] Ensure the text guidance matches the quality level of the ant strength image

## Review

### Changes Made

Updated both `PROCESS_STEP_PLAN_PROMPT` and `PROCESS_STEP_PLAN_PROMPT2` in `constants.ts` to require more educational text content similar to the ant strength example.

**Key additions:**
1. **ENGAGING SPEECH BUBBLE/CALLOUT** - Now requires a prominent speech bubble with:
   - Fun comparisons (e.g., "C'est comme si...")
   - Surprising facts with numbers (e.g., "50 FOIS son poids!")
   - Relatable analogies for children

2. **3-5 LABELED COMPONENTS** - Each component now requires:
   - A numbered title with an engaging name (e.g., "1. L'Armure super solide!")
   - A 2-3 sentence explanation of what it is, does, and why it's amazing
   - Enthusiastic language with exclamation marks

3. **DETAILED EXPLANATIONS** - For each element:
   - What it is (identification)
   - What it does (function with fun comparison)
   - Why it matters (significance)

4. **CONCLUDING TAKEAWAY** - A final message box with:
   - An inspiring or memorable lesson
   - A rhetorical question to make kids think

These changes should result in infographics that look more like the ant strength example with rich, engaging educational content instead of sparse labels.

