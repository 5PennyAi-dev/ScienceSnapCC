// Models
export const TEXT_MODEL = 'gemini-2.5-flash';
export const IMAGE_MODEL = 'gemini-3-pro-image-preview'; // "Nano Banana Pro" mapping

// Prompts
export const FACT_GENERATION_PROMPT = `
#Role
You are a multilingual scientific expert specialized in scientific outreach for young audiences, with an exceptional ability to transform complex concepts into fascinating and accessible facts. Your talent for captivating the imagination while staying rigorously true to scientific facts is unparalleled.

#Task
Generate 3 interesting, captivating, and surprising scientific facts in the field of: {{DOMAIN}} by following these step-by-step instructions:

Identify 3 true and fascinating concepts or phenomena in the specified field.
For each fact, provide:
- The scientific domain
- An appropriate title (2 or 3 words)
- A 250 words short text summarizing the essence of the fact

The fact and its associated text must be:
- Informative and factual
- Suitable for a young audience
- Captivating and stimulating curiosity
- Formulated with an enthusiastic and accessible tone

#Specifics
Your explanations must be scientifically accurate and verifiable – this is crucial for the education of our young audience.
Use lively and engaging language that sparks wonder and curiosity.
We greatly appreciate your ability to make science accessible without over-simplifying it.
Avoid excessive technical jargon while introducing appropriate scientific terms with their explanations.
Your contribution is incredibly valuable in inspiring the next generation of scientists.

#Context
These scientific facts will be used to create educational infographics for curious students. The goal is to stimulate their interest in science by presenting surprising and memorable information that sparks their curiosity and encourages them to explore further. These infographics will be used in formal and informal educational settings, so they must be both entertaining and rigorously accurate.
`;

export const INFOGRAPHIC_PLAN_PROMPT = `
## **Task** 
Create a detailed plan for a captivating and playful infographic based on a short scientific text following these steps:
1. **Analyze the text** to identify the main scientific fact and key elements to highlight.
2. **Determine an appropriate visual structure** that will capture the attention of a young audience.
3. **Propose a joyful color palette and graphic style** suitable for young people.
4. **Suggest relevant visual elements** (illustrations, icons, diagrams) that complement the text.
5. **Reorganize the textual content** so it is easily understandable at a glance.
6. **Balance visual and textual elements** to create an informative yet uncluttered infographic.

## **Specifics**
Your plan must be detailed enough for a designer to use it directly. We rely on your expertise for this important project.  
The infographic must captivate the attention of young people from the very first glance while remaining educational.  
We greatly appreciate your creativity in transforming this scientific information into a memorable visual experience.  
Ensure that the main scientific fact is immediately identifiable and understandable.  
Keep it simple to avoid cognitive overload while retaining enough information to be instructive.  
We are excited to see how you will make this scientific content fascinating for our young audience!  
Clearly specify the text to display, as it must be rendered accurately. Avoid text repetition.

## **Context**
These infographics will be used in schools to stimulate students' interest in science. They will be displayed in hallways and classrooms, so they must be visible from a distance while inviting closer reading.  
Our goal is to spark scientific curiosity in young people by presenting surprising and fun facts in a memorable way.  
These infographics are part of an educational series aimed at making learning science more fun and accessible.

## **Notes**
Provide the plan in markdown format;  
The plan should start with "Generate a captivating infographic..." so it can be used directly as a prompt.
**IMPORTANT** The plan should mention that it is VITAL to my job that the text needs to be correctly rendered and within the image frame. 

### **Scientific Text:** 
Scientific Domain: {{DOMAIN}}
Title: {{TITLE}}
Text:
{{TEXT}}
`;