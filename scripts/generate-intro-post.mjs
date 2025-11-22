import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyDO98RVVbNRRkRj-oykCdXVriIZhhR41T4');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

const prompt = `You are writing the FIRST blog post for EMS ProtoQuiz.

This is an introduction post explaining what ProtoQuiz is and why it exists.

THE PROBLEM:
- EMTs and Paramedics often work for multiple agencies
- When you move agencies or pick up shifts elsewhere, you need to learn new protocols
- It's hard to remember all the different medications, doses, algorithms from different protocol books
- Traditional methods: reading PDFs, making flashcards manually, trying to memorize everything

THE SOLUTION - EMS ProtoQuiz:
- Upload your agency's protocol PDF
- ProtoQuiz automatically creates quizzes, scenarios, and flashcards from YOUR protocols
- Algorithm tests with page citations
- Study your specific protocols, not generic EMS content
- Built by a Paramedic student who faced this exact problem

TONE:
- Simple and direct
- Don't try to sound overly EMS insider-ish
- No jargon or acronyms unless necessary
- Focus on the practical problem and solution

Write 500-700 words. Structure:
1. Hook about the problem (moving between agencies, learning new protocols)
2. Why this is hard (different protocol books, lots to remember)
3. What ProtoQuiz does (upload PDF → get quizzes/scenarios)
4. How it helps (study YOUR protocols, stay sharp)
5. Who built it and why (paramedic student solving own problem)

Return ONLY JSON:
{
  "title": "50-60 character title",
  "excerpt": "140-160 character summary",
  "content_html": "Full HTML content with h2, p, ul, li tags",
  "keywords": "EMS protocols, paramedic, EMT, protocol study, EMS app"
}
`;

const result = await model.generateContent(prompt, {
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json'
  }
});

console.log(result.response.text());
