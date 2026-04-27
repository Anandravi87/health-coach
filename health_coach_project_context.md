# AI Health Coach - Project Context for LLM Handoff

This document contains everything needed to continue building the AI Health Coach prototype. It summarizes all product decisions, technical architecture, files created, and next steps from the original conversation.

---

## 1. PROJECT OVERVIEW

We are building a **conversational AI health coach prototype** designed for people living with **Type 2 Diabetes (T2D) or Pre-Diabetes**.

**The gap:** 589 million people live with T2D globally. They get roughly 60 minutes of doctor guidance per year (4 visits x 15 min). Between those visits, they make hundreds of daily decisions about food, activity, stress, and sleep completely alone, with no feedback.

**The product:** A chat-based AI coach that helps them answer the question: *What should I eat right now, given my condition, my cultural diet, my day's context, and my goals?*

**The prototype purpose:** A working demo to share on LinkedIn as the final post in an 8-post series. It demonstrates product thinking + execution capability. It is NOT a production medical product.

---

## 2. TARGET USER

**Segment: The Chronic Condition Navigator**

- Living with Type 2 Diabetes or Pre-Diabetes
- Sees a doctor every 2-3 months but lives with their condition every single day
- Receives a generic 1-page diet handout from their doctor that doesn't fit their life
- Knows what they *should* do but struggles to actually do it
- Key frustration: 'My doctor tells me what not to eat. Nobody tells me what I should actually eat TODAY.'

**Core problems this product solves:**
1. Daily decisions are made against invisible, simultaneous variables (blood sugar reading, stress/cortisol, behavioral patterns like skipping lunch)
2. When the day goes off-plan, nothing catches the fall. Apps record broken streaks, users feel shame, one bad meal triggers a spiral.

---

## 3. DESIGN PHILOSOPHY (6 Non-Negotiable Principles)

1. **Be useful from the first message.** No onboarding, no forms, no setup gate. Answer first, learn through conversation.
2. **Be condition-aware, not calorie-aware.** Don't say 'rice = 350 calories.' Say 'this is ~60g of fast-digesting carbs, it'll spike your blood sugar in 30-45 min. Eat the vegetables first.'
3. **Be culturally grounded.** Rajma chawal in Punjab is not pinto beans in Mexico. A dosa is not a pancake. Resolve cultural food context in every response.
4. **Fit around their life.** When they're traveling, at a wedding, exhausted, or having a terrible week, adapt. Don't punish.
5. **Catch the fall before it becomes a spiral.** One imperfect meal does NOT undo progress. Give: (a) what happened physiologically, (b) one thing to do in next 30 min, (c) reassurance.
6. **Every response ends with a forward path.** Never end on what went wrong. Always end on what they can do next.

---

## 4. TECH STACK

| Component | Choice | Why |
|---|---|---|
| LLM | Claude Haiku 3.5 (claude-3-5-haiku-20241022) | Best quality-to-cost ratio. $0.80/M input, $4/M output. Fast (~40 tok/s). 200K context window. |
| Backend | Node.js + Express | Simple, one file, no framework overhead |
| Frontend | Vanilla HTML/CSS/JS | Single file, no build step, no dependencies |
| API SDK | @anthropic-ai/sdk | Official Anthropic Node SDK |
| Hosting (planned) | Vercel | Free tier, supports Node.js serverless functions |

---

## 5. ARCHITECTURE
**Key detail:** The full conversation history is sent on every request. Claude is stateless. The frontend (index.html) maintains the chatHistory array in JavaScript and sends it each time.

**Key detail:** The system prompt (~2,937 tokens) is sent on every request. At $0.80/M input tokens, this costs ~$0.002 per request. With prompt caching enabled, it drops to ~$0.0002.

---

## 6. FILES CREATED

All files go in one folder:

### package.json
- Dependencies: express ^4.21.0, @anthropic-ai/sdk ^0.39.0
- Start script: node server.js

### server.js
- Reads system_prompt.md at startup
- GET / serves index.html
- POST /api/chat accepts { messages: [{role, content}, ...] }
- Rate limiter: 3 requests/minute, 20 requests/day per IP (in-memory Map)
- Input validation: rejects empty, rejects > 500 chars
- Calls Claude with max_tokens: 400
- Reads ANTHROPIC_API_KEY from environment variable
- Listens on PORT env var or 3000

### system_prompt.md
Full system prompt with these sections:
1. Identity (who the coach is)
2. Target user profile (Chronic Condition Navigator)
3. Design principles (6 rules)
4. Tone rules (DO and NEVER lists)
5. Hard safety boundaries (no diagnosis, no medication advice, no crisis counseling, no ungrounded claims, proportional escalation)
6. Handling out-of-scope users and questions (redirects for non-T2D users, fitness questions, mental health, medication questions)
7. Profile building through conversation (micro-signals flywheel)
8. Response format (structure for meal advice, recovery situations, general coaching)
9. Identity anchor ('the 8,760 hours' closing line)

### index.html
- Phone shell UI (390px wide, 85vh tall, rounded corners, dark shadow)
- Warm color palette: app-bg #f5e9db, chat-bg #faf7f4, coach bubbles white, user bubbles #dce8fb
- Decorative orange blobs (blurred, low opacity)
- Status bar (fake time, signal, wifi, battery)
- App header with hamburger menu and 3-dot menu icons
- Welcome text: 'Your AI health coach for Type 2 Diabetes'
- 3 starter chip buttons: 'What should I eat for breakfast?', 'I had rice and dal for lunch', 'I'm on Metformin'
- Coach messages: blue gradient avatar with anatomical heart emoji, left-aligned white bubbles
- User messages: right-aligned blue bubbles
- Typing indicator: 3 bouncing dots animation
- Input bar: pill-shaped textarea, blue send button appears when typing
- Enter sends, Shift+Enter for newline
- Markdown parsing: **bold** and - bullet lists
- Error display for failed requests
- Disclaimer footer: 'Prototype. Not medical advice. Built by Anand Ravi'
- Segoe UI font family throughout

---

## 7. ANTI-ABUSE PROTECTIONS

| Layer | What it does | Status |
|---|---|---|
| Anthropic Tier 1 cap | Hard $100/month ceiling (automatic) | Built-in |
| Console spend alert | User sets custom cap (e.g. $15) in Anthropic console | Manual config |
| Per-IP rate limiter | 3 req/min, 20/day per IP | Implemented in server.js |
| Input validation | Rejects empty input and messages > 500 chars | Implemented in server.js |
| max_tokens: 400 | Caps response length to prevent runaway costs | Implemented in server.js |
| Prompt caching | 10x cheaper system prompt reads | NOT yet implemented |

---

## 8. KEY PRODUCT DECISIONS

| Decision | Rationale |
|---|---|
| T2D/Pre-T2D only | Highest acuteness, daily engagement, TAM (1.5B+), most underserved, highest AI superiority potential |
| No onboarding/FRE | Kills Week 1 retention. Learn through conversation instead. |
| Condition-aware, not calorie-aware | Calorie counting is useless for diabetics. Blood sugar impact is what matters. |
| Culturally grounded | Global product. Food context must resolve at inference time. |
| No guilt language | Words like 'failed', 'missed', 'broke', 'cheat' are banned in the system prompt. |
| No streaks | Streaks punish imperfection. This coach is designed for imperfect days. |
| Forward path always | Every response ends with something actionable. |
| Proportional urgency | Missed lunch is not an emergency. Repeated high readings warrant 'talk to your doctor.' Severe symptoms warrant 'seek medical attention now.' |
| Out-of-scope warmth | Non-target users get a warm redirect, not a robotic refusal. |
| Fitness out of scope | This is a nutrition and daily habit coach, not a fitness trainer. |
| No medication advice | Regulatory boundary. Acknowledge meds, never advise on them. |
| No diagnosis | Hard boundary. Always redirect to doctor. |

---

## 9. KNOWN BUG (FIXED)

**Bug:** `history.push is not a function` error in browser console.

**Cause:** `history` is a reserved browser object (`window.history` for back/forward navigation). Our variable name collided with it.

**Fix:** Rename all occurrences of `history` to `chatHistory` in the JavaScript section of index.html. There are 6 occurrences:
1. `var chatHistory=[];`
2. `chatHistory.push({role:'user',content:msg});`
3. `body:JSON.stringify({messages:chatHistory})`
4. `chatHistory.pop();` (in error handler)
5. `chatHistory.push({role:'assistant',content:data.reply});`
6. `chatHistory.pop();` (in catch block)

**Status:** User was told to fix this. Verify it's applied when continuing work.

---

## 10. WHAT'S BUILT vs WHAT'S NEXT

### Done
- [x] System prompt (comprehensive, tested)
- [x] Server with rate limiting and validation
- [x] Chat UI with phone shell design
- [x] Claude Haiku 3.5 API integration
- [x] Starter chips for quick first interaction
- [x] Typing indicator animation
- [x] Markdown rendering in responses
- [x] Error handling
- [x] README content drafted

### Next (in priority order)
- [ ] Verify the chatHistory bug fix is applied
- [ ] Test end-to-end conversation flow
- [ ] Test out-of-scope responses (fitness questions, non-T2D user, medication queries)
- [ ] Test culturally grounded responses (Indian food, Mexican food, etc.)
- [ ] Polish UI if needed (spacing, colors, mobile responsiveness)
- [ ] Deploy to Vercel (or similar free hosting)
- [ ] Add prompt caching for cost optimization (optional for prototype)
- [ ] Create the README.md for the GitHub repo / live link

## 13. README CONTENT (for the live prototype)

### What does this app do?
A conversational AI health coach for people with T2D or Pre-Diabetes. It gives practical, condition-aware, culturally grounded daily guidance about food and lifestyle. It doesn't count calories. It understands how food affects blood sugar.

### Who is it designed for?
People with Type 2 Diabetes or Pre-Diabetes who want daily, practical guidance between doctor visits.

### Who is it NOT designed for?
- General wellness / weight loss (no medical condition)
- Fitness / workout planning
- Mental health support
- Medical diagnosis or medication advice
- Other chronic conditions (PCOS, hypertension, etc.) unless coexisting with T2D

Out-of-scope questions get a warm redirect, not a robotic refusal.

### How to get the best out of it
1. Start by mentioning your condition (T2D or Pre-Diabetes)
2. Mention your medication if comfortable (e.g. Metformin)
3. Tell it what you actually eat, not what you think you should eat
4. Share context about your day (traveling, stressful week, wedding buffet)
5. Ask 'what should I eat right now?' - this is the question it's built for
6. Come back when things go sideways - that's when it's most useful
7. Keep talking to it - it picks up patterns through conversation

### Disclaimers
- Prototype for demonstration purposes. Not a medical product.
- Not a doctor. Does not diagnose, prescribe, or replace professional medical advice.
- Powered by Claude Haiku 3.5. Responses are generated, not retrieved from a clinical database.
- If you experience a medical emergency, contact your doctor or emergency services immediately.

---

## 14. HOW TO RUN LOCALLY

```bash
cd health-coach
npm install
export ANTHROPIC_API_KEY=sk-ant-your-key-here   # Mac/Linux
# or: set ANTHROPIC_API_KEY=sk-ant-your-key-here   # Windows CMD
# or: $env:ANTHROPIC_API_KEY='sk-ant-your-key-here'   # Windows PowerShell
node server.js



