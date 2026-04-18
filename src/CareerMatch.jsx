import { useState, useEffect, useRef } from "react";
import { supabase, authFetch } from "./supabaseClient";
import AuthScreen from "./AuthScreen";
import { assignArchetype, ARCHETYPES } from "./archetypes";
import { OceanRadarChart, OceanTraitBars, OCEAN_COLORS } from "./OceanComponents.jsx";

const questions = [
  // ── Part 1: Openness (Q1–Q7) ──────────────────────────────────────────────
  { id: 1, part: "Openness", partNum: 1, big5: "Openness", text: "When you think about your best days at work, what were you actually doing hour to hour? Not the title — the real actions.", type: "text" },
  { id: 2, part: "Openness", partNum: 1, big5: "Openness", text: "When you encounter a problem you've never seen before, your first instinct is:", type: "choice", options: ["Break it down into familiar parts and apply what I know", "Research how others have solved it before attempting anything", "Get excited and start experimenting immediately", "Talk it through with someone to think out loud", "Step back and look for the pattern underneath it"] },
  { id: 3, part: "Openness", partNum: 1, big5: "Openness", text: "How do you feel about routine and repetition in your work?", type: "choice", options: ["I find comfort in it — consistency helps me perform", "I tolerate it as long as the work matters", "I need variety or I disengage quickly", "I actively redesign routines to make them more efficient", "It depends on whether I chose the routine or had it imposed on me"] },
  { id: 4, part: "Openness", partNum: 1, big5: "Openness", text: "When given a completely open-ended brief with no constraints, you feel:", type: "choice", options: ["Energized — the blank canvas is exciting", "Mildly comfortable — I like some freedom but need a starting point", "Neutral — I work well either way", "Slightly uncomfortable — I prefer clearer parameters", "Frustrated — constraints actually help me do better work"] },
  { id: 5, part: "Openness", partNum: 1, big5: "Openness", text: "Which of these best describes how you consume information?", type: "choice", options: ["I go deep on one topic until I feel like I've mastered it", "I scan widely across many topics and connect the dots", "I follow what's useful for current projects and nothing more", "I read broadly but go deep when something really hooks me", "I prefer learning through doing rather than reading or researching"] },
  { id: 6, part: "Openness", partNum: 1, big5: "Openness", text: "How do you typically respond to rules and established processes?", type: "choice", options: ["I follow them — they exist for good reasons", "I follow them while quietly looking for improvements", "I question them openly and advocate for changes I believe in", "I work around them if they slow me down", "I ignore them if they don't make sense to me"] },
  { id: 7, part: "Openness", partNum: 1, big5: "Openness", text: "What do you find yourself analyzing or thinking about without anyone asking you to?", type: "text" },

  // ── Part 2: Conscientiousness (Q8–Q14) ─────────────────────────────────────
  { id: 8, part: "Conscientiousness", partNum: 2, big5: "Conscientiousness", text: "When starting a new project, you typically:", type: "choice", options: ["Map out the full plan before writing a single line or taking any action", "Create a rough outline then figure it out as I go", "Dive straight in and build the plan from what I discover", "Spend time understanding the goal first then decide my approach", "Ask whoever assigned it what they actually need before planning anything"] },
  { id: 9, part: "Conscientiousness", partNum: 2, big5: "Conscientiousness", text: "How would you describe your relationship with deadlines?", type: "choice", options: ["I set internal deadlines earlier than the real ones as a buffer", "I hit deadlines consistently — it's a matter of professional respect", "I hit most deadlines but sometimes need an extension on complex work", "I work better under pressure so I tend to leave things late", "Deadlines feel arbitrary to me — I finish when the work is ready"] },
  { id: 10, part: "Conscientiousness", partNum: 2, big5: "Conscientiousness", text: "How does your workspace or digital environment usually look?", type: "choice", options: ["Meticulously organized — a place for everything, always", "Organized enough that I can find things quickly", "Organized chaos — it looks messy but I know exactly where things are", "Variable — tidy when I have time, chaotic when I'm deep in work", "Consistently messy — I work better that way"] },
  { id: 11, part: "Conscientiousness", partNum: 2, big5: "Conscientiousness", text: "When you commit to something, how often do you follow through?", type: "choice", options: ["Almost always — my word is important to me", "Usually — unless something more important comes up", "Depends on how interested I still am when the time comes", "I overcommit and underdeliver more than I'd like to admit", "I'm selective about what I commit to so I can follow through completely"] },
  { id: 12, part: "Conscientiousness", partNum: 2, big5: "Conscientiousness", text: "How comfortable are you with work that takes months or years to show results?", type: "choice", options: ["Very comfortable — I naturally think in long timeframes", "Comfortable as long as I can see progress along the way", "I need regular wins to stay motivated — long games are hard for me", "Uncomfortable — I need to see the impact of my work relatively quickly", "It depends on how much I believe in what I'm building"] },
  { id: 13, part: "Conscientiousness", partNum: 2, big5: "Conscientiousness", text: "Which of these best describes the work life you're building toward?", type: "choice", options: ["Leading a team and shaping company or product direction", "Mastering a craft and becoming the best in my field", "Building something of my own eventually", "Flexible location-independent work that funds the life I want", "Stable well-compensated work at a company I believe in"] },
  { id: 14, part: "Conscientiousness", partNum: 2, big5: "Conscientiousness", text: "When you have a list of tasks, how do you typically approach it?", type: "choice", options: ["Prioritize ruthlessly and work top to bottom", "Start with the easiest to build momentum", "Start with the hardest to get it out of the way", "Work on whatever feels most important in the moment", "I don't usually have lists — I keep it in my head"] },

  // ── Part 3: Extraversion (Q15–Q21) ─────────────────────────────────────────
  { id: 15, part: "Extraversion", partNum: 3, big5: "Extraversion", text: "After a full day of back-to-back meetings, you typically feel:", type: "choice", options: ["Energized — that's a good day for me", "Fine — meetings don't affect my energy much", "Drained but satisfied if the meetings were productive", "Exhausted — I need significant recovery time", "Completely depleted — that's my worst kind of day"] },
  { id: 16, part: "Extraversion", partNum: 3, big5: "Extraversion", text: "When you have a complex problem to solve, your default is:", type: "choice", options: ["Think it through alone first then share my conclusion", "Talk it through with others — thinking out loud helps me", "Research independently until I have a point of view", "Bring a group together to workshop it collaboratively", "Write it out privately to organize my thinking"] },
  { id: 17, part: "Extraversion", partNum: 3, big5: "Extraversion", text: "In a group setting, you tend to:", type: "choice", options: ["Naturally take the lead and direct the conversation", "Contribute actively when I have something valuable to add", "Listen and observe more than I speak", "Adapt my role depending on who else is in the room", "Gravitate toward one-on-ones or small groups over large ones"] },
  { id: 18, part: "Extraversion", partNum: 3, big5: "Extraversion", text: "How do you prefer to receive recognition for your work?", type: "choice", options: ["Publicly — I appreciate being acknowledged in front of others", "Privately — a direct message or conversation means more to me", "Through the work itself — great results are their own reward", "Through increased responsibility or opportunity", "I don't need recognition — I know when I've done good work"] },
  { id: 19, part: "Extraversion", partNum: 3, big5: "Extraversion", text: "Which environment brings out your best work?", type: "choice", options: ["Open collaborative spaces with lots of energy and interaction", "A mix — collaboration time and deep focus time balanced well", "Quiet private spaces where I can concentrate without interruption", "Remote and async — I work best on my own schedule", "It depends entirely on the type of work I'm doing"] },
  { id: 20, part: "Extraversion", partNum: 3, big5: "Extraversion", text: "When you join a new team, you typically:", type: "choice", options: ["Introduce yourself proactively and start building relationships immediately", "Observe for a while before inserting yourself into the dynamic", "Focus on the work first and let relationships develop naturally", "Find one or two people to connect with and build outward from there", "Stay heads down until you have a clear read on the team dynamic"] },
  { id: 21, part: "Extraversion", partNum: 3, big5: "Extraversion", text: "How do you feel about public speaking or presenting to groups?", type: "choice", options: ["I enjoy it — presenting energizes me", "I'm comfortable with it even if it's not my favorite", "I prepare extensively to compensate for the discomfort", "I do it when required but actively avoid it when I can", "I've turned down opportunities specifically because they involved public speaking"] },

  // ── Part 4: Agreeableness (Q22–Q28) ────────────────────────────────────────
  { id: 22, part: "Agreeableness", partNum: 4, big5: "Agreeableness", text: "When someone on your team is visibly struggling, your instinct is:", type: "choice", options: ["Check in immediately and offer concrete help", "Give them space but let them know I'm available", "Watch for a bit before deciding whether to intervene", "Flag it to a manager or lead — it's not my place to step in", "Focus on my own work — they'll ask for help if they need it"] },
  { id: 23, part: "Agreeableness", partNum: 4, big5: "Agreeableness", text: "In a disagreement with a colleague you respect, you typically:", type: "choice", options: ["Hold your position if the evidence supports it", "Look for the middle ground that works for both of you", "Defer to their judgment — they may have context you don't", "Push back hard until one of you convinces the other", "Table the disagreement and revisit when emotions are lower"] },
  { id: 24, part: "Agreeableness", partNum: 4, big5: "Agreeableness", text: "When a team decision is being made and you disagree with the direction, you typically:", type: "choice", options: ["Voice your concern clearly even if it creates tension", "Raise it once then align with the group once it's been heard", "Go along with the group — harmony matters more than being right", "Push back persistently until your perspective is genuinely considered", "Depends on how much the decision actually matters to you"] },
  { id: 25, part: "Agreeableness", partNum: 4, big5: "Agreeableness", text: "When your manager makes a decision you strongly disagree with, you:", type: "choice", options: ["Voice your concern directly and persistently advocate for a different approach", "Raise it once clearly then commit fully once the decision is made", "Go along with it outwardly but continue to question it internally", "Trust the process — they have context you don't and defer completely"] },
  { id: 26, part: "Agreeableness", partNum: 4, big5: "Agreeableness", text: "How much does other people's stress affect your own emotional state?", type: "choice", options: ["Significantly — I absorb the energy of people around me", "Somewhat — I notice it but can usually maintain my own state", "Minimally — I'm aware of it but stay focused on my work", "Rarely — other people's stress doesn't affect me much", "Almost never — I'm able to fully separate my state from others'"] },
  { id: 27, part: "Agreeableness", partNum: 4, big5: "Agreeableness", text: "When giving feedback to someone whose work isn't meeting the bar, you:", type: "choice", options: ["Lead with empathy and soften the message carefully", "Give it directly but respectfully — they deserve the truth", "Focus on the work not the person and keep it factual", "Struggle to give it and often avoid the conversation", "Deliver it matter-of-factly — emotional framing feels unnecessary"] },
  { id: 28, part: "Agreeableness", partNum: 4, big5: "Agreeableness", text: "What do people naturally come to you for — at work or in life?", type: "text" },

  // ── Part 5: Neuroticism (Q29–Q35) ──────────────────────────────────────────
  { id: 29, part: "Neuroticism", partNum: 5, big5: "Neuroticism", text: "After a tough week at work, you typically:", type: "choice", options: ["Bounce back quickly — I don't carry it past the weekend", "Need a day or two to fully decompress and reset", "Replay what went wrong for a while before letting it go", "Find it hard to switch off — work stress follows me home", "Struggle to identify what I'm feeling until it builds up"] },
  { id: 30, part: "Neuroticism", partNum: 5, big5: "Neuroticism", text: "When you're blocked on something important, your default reaction is:", type: "choice", options: ["Stay calm and systematically work around the obstacle", "Feel frustrated but channel it into finding a solution", "Spiral briefly then regroup and push through", "Seek reassurance from someone I trust before continuing", "Shut down temporarily and need time before I can re-engage"] },
  { id: 31, part: "Neuroticism", partNum: 5, big5: "Neuroticism", text: "How often do you second-guess decisions after you've made them?", type: "choice", options: ["Rarely — I commit and move on without looking back", "Occasionally — mainly on high stakes calls", "Fairly often — I replay decisions and wonder about alternatives", "Very often — it's something I actively struggle with", "It depends — some decisions I let go easily, others stay with me"] },
  { id: 32, part: "Neuroticism", partNum: 5, big5: "Neuroticism", text: "When facing an important deadline that feels unrealistic, you:", type: "choice", options: ["Stay focused and do what you can with the time available", "Feel anxious but perform well under the pressure", "Communicate early that the timeline needs adjustment", "Stress significantly and find it hard to work at full capacity", "Freeze up and have difficulty prioritizing what matters most"] },
  { id: 33, part: "Neuroticism", partNum: 5, big5: "Neuroticism", text: "How do you typically respond to critical feedback about your work?", type: "choice", options: ["Take it in stride — feedback makes the work better", "Feel a brief sting then use it constructively", "Need some time to process it before I can engage with it well", "Find it genuinely difficult and it affects my confidence", "Struggle to separate feedback about my work from feedback about me"] },
  { id: 34, part: "Neuroticism", partNum: 5, big5: "Neuroticism", text: "In high stakes situations — big presentations, important decisions, critical moments — you:", type: "choice", options: ["Thrive — pressure brings out my best performance", "Perform well but feel the nerves beforehand", "Get through it but it costs me significant energy", "Find it genuinely stressful and sometimes underperform", "Avoid high stakes situations when possible"] },
  { id: 35, part: "Neuroticism", partNum: 5, big5: "Neuroticism", text: "How would you describe your baseline emotional state at work?", type: "choice", options: ["Consistently calm and steady regardless of what's happening", "Generally positive with occasional dips when things get hard", "Variable — my state tracks closely with how work is going", "Frequently anxious or on edge even when things are going well", "Hard to describe — I don't pay much attention to my emotional state"] },

  // ── Q36: Experience ────────────────────────────────────────────────────────
  { id: 36, part: "Experience", partNum: 6, big5: "Experience", text: "How many years of professional experience do you have?", type: "choice", options: ["Just starting out (0–2 years)", "Finding my footing (3–5 years)", "Mid-career (6–10 years)", "Senior level (11–15 years)", "Veteran (15+ years)"] },
];

console.log(`[WiredFor.ai] Assessment loaded: ${questions.length} questions`);

const partColors = { 1: "#00C4A8", 2: "#6B4FFF", 3: "#F55D2C", 4: "#FFBE0B", 5: "#FF6B89", 6: "#00B4D8" };
const partIcons  = { 1: "🧭", 2: "🧠", 3: "🔥", 4: "🤝", 5: "🧪", 6: "🎯" };

const globalStyles = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes cmFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes revealFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes revealScale { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
  @keyframes barGrow { from { width: 0; } to { width: var(--bar-width); } }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; padding: 0; background: #FFFFFF; }

  .cm-container {
    min-height: 100dvh;
    background: #FFFFFF;
    color: #0A0A0A;
    font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0;
  }

  .cm-card {
    width: 100%;
    background: #FFFFFF;
    padding: 28px 20px 40px;
    flex: 1;
    display: flex;
    flex-direction: column;
    animation: cmFadeUp 0.5s ease both;
  }

  .cm-intro-title {
    font-family: 'DM Serif Display', serif;
    font-size: 38px;
    font-weight: 400;
    line-height: 1.08;
    margin: 0 0 16px;
    letter-spacing: -1px;
    color: #0A0A0A;
  }

  .cm-question-text {
    font-size: 19px;
    font-weight: 500;
    line-height: 1.48;
    color: #0A0A0A;
    margin: 0 0 24px;
    letter-spacing: -0.01em;
  }

  .cm-answer-btn {
    width: 100%;
    min-height: 54px;
    border-radius: 11px;
    padding: 13px 18px;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    line-height: 1.5;
    display: block;
    -webkit-appearance: none;
    letter-spacing: -0.01em;
  }

  .cm-primary-btn {
    width: 100%;
    min-height: 52px;
    padding: 15px;
    border: none;
    border-radius: 11px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: -0.01em;
    font-family: inherit;
    -webkit-appearance: none;
    transition: opacity 0.15s;
  }
  .cm-primary-btn:hover { opacity: 0.88; }

  .cm-next-btn {
    margin-top: 12px;
    width: 100%;
    min-height: 52px;
    padding: 14px;
    border: none;
    border-radius: 11px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.15s;
    -webkit-appearance: none;
    letter-spacing: -0.01em;
  }
  .cm-next-btn:hover { opacity: 0.88; }

  .cm-textarea {
    width: 100%;
    min-height: 130px;
    background: #F7F7F5;
    border: 1px solid rgba(0,0,0,0.10);
    border-radius: 11px;
    padding: 14px 16px;
    color: #0A0A0A;
    font-size: 15px;
    font-family: inherit;
    resize: vertical;
    outline: none;
    line-height: 1.65;
    transition: border-color 0.2s;
    -webkit-appearance: none;
    letter-spacing: -0.01em;
  }
  .cm-textarea:focus { border-color: rgba(0,0,0,0.25); }
  .cm-textarea::placeholder { color: #9B9B9B; }

  .cm-back-btn {
    margin-top: 20px;
    background: none;
    border: none;
    color: #9B9B9B;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    padding: 10px 0;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: color 0.15s;
    letter-spacing: -0.01em;
  }
  .cm-back-btn:hover { color: #6B6B6B; }

  .cm-retake-btn {
    background: none;
    border: 1px solid rgba(0,0,0,0.10);
    border-radius: 9px;
    color: #6B6B6B;
    font-size: 13px;
    padding: 10px 18px;
    min-height: 44px;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 0.15s, color 0.15s;
    letter-spacing: -0.01em;
  }
  .cm-retake-btn:hover { border-color: rgba(0,0,0,0.25); color: #0A0A0A; }

  .cm-role-card {
    background: #F7F7F5;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    transition: border-color 0.15s;
  }

  /* ── Reveal flow ─────────────────────────────────────────────────────── */
  .wf-reveal {
    min-height: 100dvh;
    font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
    display: flex;
    flex-direction: column;
  }
  .wf-reveal-dark {
    background: #0A0A0A;
    color: #FFFFFF;
  }
  .wf-reveal-light {
    background: #FFFFFF;
    color: #0A0A0A;
  }
  .wf-reveal-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 40px 24px 24px;
    max-width: 560px;
    width: 100%;
    margin: 0 auto;
    animation: revealFadeIn 0.6s ease both;
  }
  .wf-reveal-footer {
    padding: 20px 24px 32px;
    max-width: 560px;
    width: 100%;
    margin: 0 auto;
  }
  .wf-reveal-step-dots {
    display: flex;
    gap: 6px;
    justify-content: center;
    margin-bottom: 20px;
  }
  .wf-reveal-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    transition: background 0.3s, width 0.3s;
  }
  .wf-reveal-dot.active {
    background: #00C4A8;
    width: 20px;
    border-radius: 3px;
  }
  .wf-reveal-dot-dark {
    background: rgba(0,0,0,0.12);
  }
  .wf-reveal-dot-dark.active {
    background: #00C4A8;
  }
  .wf-reveal-cta {
    width: 100%;
    min-height: 54px;
    padding: 15px;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: -0.01em;
    font-family: inherit;
    transition: opacity 0.15s, transform 0.15s;
    -webkit-appearance: none;
  }
  .wf-reveal-cta:hover { opacity: 0.88; transform: translateY(-1px); }
  .wf-reveal-cta-dark {
    background: #00C4A8;
    color: #fff;
  }
  .wf-reveal-cta-light {
    background: #0A0A0A;
    color: #fff;
  }
  .wf-reveal-cta-teal {
    background: linear-gradient(135deg, #00C4A8, #6B4FFF);
    color: #fff;
  }

  /* ── Dashboard ───────────────────────────────────────────────────────── */
  .wf-dash {
    min-height: 100dvh;
    font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
    background: #FFFFFF;
    color: #0A0A0A;
  }

  /* Mobile layout */
  @media (max-width: 767px) {
    .wf-dash-header {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 60px;
      background: #FFFFFF;
      border-bottom: 1px solid rgba(0,0,0,0.07);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
    }
    .wf-dash-content {
      padding-top: 60px;
      padding-bottom: 76px;
      min-height: 100dvh;
    }
    .wf-dash-content-inner {
      padding: 20px 16px 16px;
    }
    .wf-dash-bottom-nav {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      height: 60px;
      background: #FFFFFF;
      border-top: 1px solid rgba(0,0,0,0.07);
      z-index: 100;
      display: flex;
      align-items: stretch;
    }
    .wf-dash-top-tabs { display: none; }
    .wf-dash-desktop-header { display: none; }
  }

  /* Desktop layout */
  @media (min-width: 768px) {
    .wf-dash-header { display: none; }
    .wf-dash-bottom-nav { display: none; }
    .wf-dash-content {
      max-width: 600px;
      margin: 0 auto;
      padding: 32px 16px 48px;
    }
    .wf-dash-content-inner { padding: 0; }
    .wf-dash-desktop-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
    }
    .wf-dash-top-tabs {
      display: flex;
      border-bottom: 1px solid rgba(0,0,0,0.08);
      margin-bottom: 28px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .wf-dash-top-tabs::-webkit-scrollbar { display: none; }
  }

  .wf-dash-tab-btn {
    flex: 1;
    min-width: 0;
    padding: 12px 4px;
    font-size: 11px;
    font-weight: 600;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    cursor: pointer;
    color: #9B9B9B;
    transition: color 0.15s, border-color 0.15s;
    font-family: inherit;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }
  .wf-dash-tab-btn.active { color: #0A0A0A; border-bottom-color: #00C4A8; }

  .wf-dash-nav-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px 4px;
    font-family: inherit;
    transition: color 0.15s;
    color: #9B9B9B;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
    min-height: 44px;
    -webkit-appearance: none;
  }
  .wf-dash-nav-btn.active { color: #00C4A8; }
  .wf-dash-nav-icon { font-size: 20px; line-height: 1; }

  @media (min-width: 560px) {
    .cm-container {
      padding: 32px 16px;
      justify-content: center;
    }
    .cm-card {
      max-width: 560px;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 18px;
      padding: 44px 40px;
      flex: none;
      background: #FFFFFF;
      box-shadow: 0 2px 20px rgba(0,0,0,0.06);
    }
    .cm-intro-title {
      font-size: 46px;
      letter-spacing: -1.5px;
    }
    .cm-question-text {
      font-size: 20px;
      margin-bottom: 28px;
    }
    .cm-answer-btn { font-size: 14px; }
  }
`;

// ── Small shared components ──────────────────────────────────────────────────

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{ width: "100%", marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#9B9B9B" }}>Progress</span>
        <span style={{ fontSize: 11, letterSpacing: 2, color: "#00C4A8" }}>{pct}%</span>
      </div>
      <div style={{ height: 2, background: "rgba(0,0,0,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #00C4A8, #6B4FFF)", transition: "width 0.5s ease", borderRadius: 2 }} />
      </div>
    </div>
  );
}

function JobCard({ job }) {
  const scoreColor = job.matchScore >= 85 ? "#00C4A8" : job.matchScore >= 70 ? "#6B4FFF" : "#F59E0B";
  return (
    <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      <div className="cm-role-card" style={{ cursor: "pointer", transition: "border-color 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.borderColor = scoreColor}
        onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)"}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 10, background: "#F7F7F5", border: "1px solid rgba(0,0,0,0.09)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden"
        }}>
          {job.logo
            ? <img src={job.logo} alt={job.company} style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
            : <span style={{ fontSize: 18 }}>🏢</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
            <div style={{ fontWeight: 600, color: "#0A0A0A", fontSize: 14, lineHeight: 1.3 }}>{job.title}</div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: scoreColor, background: `${scoreColor}15`,
              border: `1px solid ${scoreColor}33`, borderRadius: 6, padding: "2px 7px", flexShrink: 0
            }}>{job.matchScore}%</div>
          </div>
          <div style={{ fontSize: 12, color: "#6B6B6B", marginBottom: 8 }}>
            {job.company} · {job.location}
            {job.salary && <span style={{ color: "#9B9B9B" }}> · {job.salary}</span>}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {job.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase",
                padding: "3px 7px", borderRadius: 4, background: "rgba(0,0,0,0.05)", color: "#6B6B6B"
              }}>{tag}</span>
            ))}
            {job.source && (
              <span style={{ fontSize: 10, color: "#9B9B9B", letterSpacing: "0.04em", marginLeft: "auto", marginRight: 8 }}>{job.source}</span>
            )}
            <span style={{ fontSize: 11, color: "#00C4A8" }}>View Role →</span>
          </div>
        </div>
      </div>
    </a>
  );
}

// ── ResumeUploadBlock ────────────────────────────────────────────────────────

function ResumeUploadBlock({ resumeData, resumeUploading, resumeError, resumeFileName, onResumeUpload, darkMode = false }) {
  const textColor = darkMode ? "#FFFFFF" : "#0A0A0A";
  const subColor  = darkMode ? "rgba(255,255,255,0.55)" : "#6B6B6B";
  return (
    <div>
      {!resumeData && !resumeUploading && (
        <label style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 10, padding: "28px 16px",
          border: `1.5px dashed ${darkMode ? "rgba(0,196,168,0.4)" : "rgba(0,196,168,0.35)"}`,
          borderRadius: 14, cursor: "pointer",
          background: darkMode ? "rgba(0,196,168,0.04)" : "rgba(0,196,168,0.02)",
          transition: "border-color 0.2s, background 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4A8"; e.currentTarget.style.background = "rgba(0,196,168,0.07)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = darkMode ? "rgba(0,196,168,0.4)" : "rgba(0,196,168,0.35)"; e.currentTarget.style.background = darkMode ? "rgba(0,196,168,0.04)" : "rgba(0,196,168,0.02)"; }}
        >
          <input type="file" accept=".pdf,.txt" onChange={onResumeUpload} style={{ display: "none" }} />
          <div style={{ fontSize: 32 }}>📄</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: textColor, marginBottom: 4 }}>Upload your resume</div>
            <div style={{ fontSize: 13, color: subColor }}>PDF or text · under 5MB · unlocks career paths</div>
            <div style={{ fontSize: 11, color: subColor, marginTop: 6, opacity: 0.7 }}>Your resume is analyzed and immediately discarded. Only a summary of your experience is saved — your actual resume file is never stored on our servers.</div>
          </div>
        </label>
      )}
      {resumeUploading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 16px", background: "rgba(0,196,168,0.04)", border: "1px solid rgba(0,196,168,0.16)", borderRadius: 12 }}>
          <div style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,0.10)", borderTop: "2px solid #00C4A8", borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: subColor }}>Analyzing {resumeFileName}...</span>
        </div>
      )}
      {resumeError && (
        <div style={{ fontSize: 13, color: "#DC2626", padding: "10px 0" }}>{resumeError}</div>
      )}
      {resumeData && (
        <div style={{ background: "rgba(0,196,168,0.06)", border: "1px solid rgba(0,196,168,0.18)", borderRadius: 12, padding: "18px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: textColor, marginBottom: 3 }}>{resumeData.currentTitle || "Professional"}</div>
              <div style={{ fontSize: 12, color: subColor }}>{resumeData.yearsExperience != null ? `${resumeData.yearsExperience} yrs exp` : ""}{resumeData.industry ? ` · ${resumeData.industry}` : ""}</div>
            </div>
            <label style={{ cursor: "pointer", fontSize: 11, color: "#00C4A8", fontWeight: 600, whiteSpace: "nowrap", paddingTop: 2 }}>
              <input type="file" accept=".pdf,.txt" onChange={onResumeUpload} style={{ display: "none" }} />
              Replace
            </label>
          </div>
          {resumeData.backgroundSummary && (
            <p style={{ fontSize: 14, color: darkMode ? "rgba(255,255,255,0.75)" : "#4A4A4A", lineHeight: 1.72, margin: "0 0 12px" }}>{resumeData.backgroundSummary}</p>
          )}
          {(resumeData.skills || []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {resumeData.skills.map(s => (
                <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: "rgba(0,196,168,0.12)", color: "#00A08A", fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab content components ───────────────────────────────────────────────────

function ProfileTab({ result, wfId, resumeData, resumeUploading, resumeError, resumeFileName, onResumeUpload }) {
  return (
    <div>
      {/* Archetype */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#00C4A8" }}>Your Archetype</div>
          {result.archetypeCategory && (
            <span style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#6B4FFF", background: "rgba(107,79,255,0.08)", padding: "3px 9px", borderRadius: 20, fontWeight: 600 }}>{result.archetypeCategory}</span>
          )}
        </div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "#0A0A0A", margin: "0 0 6px", lineHeight: 1.2 }}>{result.archetype}</h2>
        {result.archetypeTagline && (
          <div style={{ fontSize: 13, color: "#00C4A8", fontStyle: "italic", marginBottom: 12, fontWeight: 500 }}>{result.archetypeTagline}</div>
        )}
        <p style={{ color: "#6B6B6B", fontSize: 15, margin: 0, lineHeight: 1.75 }}>{result.operatingStyle}</p>
        {result.archetypeTechFit && result.archetypeTechFit.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#6B4FFF", marginBottom: 8, fontWeight: 600 }}>Tech Fit</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {result.archetypeTechFit.map(role => (
                <span key={role} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "rgba(107,79,255,0.08)", color: "#6B4FFF", fontWeight: 500 }}>{role}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* OCEAN visualization */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#6B4FFF", marginBottom: 16 }}>Big Five Profile</div>
        <OceanRadarChart ocean={result.ocean} size={220} />
        <OceanTraitBars ocean={result.ocean} />
      </div>

      {/* Resume */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: "#00C4A8", flexShrink: 0 }} />
          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#00C4A8" }}>Background</div>
        </div>
        <ResumeUploadBlock
          resumeData={resumeData}
          resumeUploading={resumeUploading}
          resumeError={resumeError}
          resumeFileName={resumeFileName}
          onResumeUpload={onResumeUpload}
        />
      </div>

      {/* Review prompt — after full profile */}
      <div style={{ width: "100%", height: 1, background: "rgba(0,0,0,0.06)", margin: "32px 0" }} />
      <ReviewPrompt wfId={wfId} result={result} />
    </div>
  );
}

function RolesTab({ result, resumeMismatches, jobs, jobsLoading, jobsError, jobsVisible, onLoadJobs }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#6B4FFF", marginBottom: 16 }}>Roles Built For You</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
        {(result.roles || []).map((role, i) => (
          <div key={i} style={{ background: "#F7F7F5", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "18px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>{role.icon}</span>
              <span style={{ fontWeight: 700, color: "#0A0A0A", fontSize: 15, lineHeight: 1.3 }}>{role.title}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(role.whyItFits || []).map((bullet, j) => (
                <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#6B4FFF", fontSize: 12, flexShrink: 0, marginTop: 3 }}>▸</span>
                  <span style={{ color: "#6B6B6B", fontSize: 13, lineHeight: 1.65 }}>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {resumeMismatches && resumeMismatches.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: "#F59E0B", flexShrink: 0 }} />
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#F59E0B" }}>Heads Up</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {resumeMismatches.map((m, i) => (
              <div key={i} style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "#F59E0B", fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚡</span>
                <span style={{ color: "#4A4A4A", fontSize: 13, lineHeight: 1.65 }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!jobsVisible && (
        <button
          onClick={onLoadJobs}
          style={{
            width: "100%", padding: "14px 20px",
            background: "linear-gradient(135deg, rgba(107,79,255,0.08), rgba(0,196,168,0.08))",
            border: "1px solid rgba(107,79,255,0.22)", borderRadius: 11,
            color: "#0A0A0A", fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "border-color 0.2s", fontFamily: "inherit",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#6B4FFF"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(107,79,255,0.22)"}
        >
          See Open Roles <span style={{ fontSize: 16 }}>→</span>
        </button>
      )}

      {jobsVisible && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#00C4A8" }}>Live Openings</div>
            <div style={{ fontSize: 10, color: "#9B9B9B", letterSpacing: 1 }}>Remotive · RemoteOK · Findwork</div>
          </div>
          {jobsLoading && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", color: "#6B6B6B", fontSize: 13, padding: "20px 0" }}>
              <div style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.10)", borderTop: "2px solid #6B4FFF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              Finding live roles that fit your profile...
            </div>
          )}
          {!jobsLoading && (jobs.length === 0 || jobsError) && (
            <div style={{ color: "#6B6B6B", fontSize: 13, padding: "16px 0", lineHeight: 1.6 }}>
              No live matches right now — boards update daily.{" "}
              <a href="https://remotive.com/remote-jobs/software-dev" target="_blank" rel="noopener noreferrer" style={{ color: "#6B4FFF" }}>
                Browse all remote tech roles →
              </a>
            </div>
          )}
          {!jobsLoading && jobs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {jobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PathTab({ result, careerPaths, onSwitchTab }) {
  const PATH_DEFS = [
    { key: "bestFitNow", label: "Best Fit Now",  color: "#00C4A8", bg: "rgba(0,196,168,0.06)",  border: "rgba(0,196,168,0.20)" },
    { key: "wiredFor",   label: "Wired For",     color: "#6B4FFF", bg: "rgba(107,79,255,0.06)", border: "rgba(107,79,255,0.20)" },
    { key: "yourPivot",  label: "Your Pivot",    color: "#F55D2C", bg: "rgba(245,93,44,0.06)",  border: "rgba(245,93,44,0.20)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {careerPaths && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: "#6B4FFF", flexShrink: 0 }} />
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#6B4FFF" }}>Your Three Paths</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {PATH_DEFS.map(({ key, label, color, bg, border }) => {
              const path = careerPaths[key];
              if (!path) return null;
              return (
                <div key={key} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 16px" }}>
                  <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color, marginBottom: 6, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0A0A0A", marginBottom: 8, lineHeight: 1.3 }}>{path.headline}</div>
                  <p style={{ fontSize: 13, color: "#6B6B6B", lineHeight: 1.72, margin: "0 0 14px" }}>{path.description}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(path.roles || []).map((role, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.65)", borderRadius: 10, padding: "13px 14px" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0A0A0A", marginBottom: 5 }}>{role.title}</div>
                        <div style={{ fontSize: 13, color: "#6B6B6B", lineHeight: 1.6, marginBottom: 6 }}>{role.whyItFits}</div>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                          <span style={{ fontSize: 12, color, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
                          <span style={{ fontSize: 12, color: "#4A4A4A", lineHeight: 1.5 }}>{role.nextStep}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!careerPaths && (
        <div>
          <div style={{ background: "rgba(0,196,168,0.04)", border: "1px solid rgba(0,196,168,0.16)", borderRadius: 12, padding: "20px 18px", marginBottom: 20 }}>
            <p style={{ color: "#4A4A4A", fontSize: 14, lineHeight: 1.72, margin: 0 }}>
              Upload your resume to unlock your three career paths — <strong>Best Fit Now</strong>, <strong>Wired For</strong>, and <strong>Your Pivot</strong>. We'll combine your personality profile with your background to map out exactly where you should go next.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {PATH_DEFS.map(({ key, label, color, bg, border }) => (
              <div key={key} style={{ position: "relative", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color, fontWeight: 700, marginBottom: 8 }}>{label}</div>
                <div style={{ filter: "blur(6px)", WebkitFilter: "blur(6px)", userSelect: "none", WebkitUserSelect: "none", pointerEvents: "none" }}>
                  <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 16px" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0A0A0A", marginBottom: 8, lineHeight: 1.3 }}>Your personalized career headline</div>
                    <p style={{ fontSize: 13, color: "#6B6B6B", lineHeight: 1.72, margin: "0 0 14px" }}>A detailed description of why this path fits your unique personality wiring, based on your OCEAN scores and work style preferences. This content is generated from your resume and personality profile.</p>
                    <div style={{ background: "rgba(255,255,255,0.65)", borderRadius: 10, padding: "13px 14px" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0A0A0A", marginBottom: 5 }}>Senior Role Title</div>
                      <div style={{ fontSize: 13, color: "#6B6B6B", lineHeight: 1.6 }}>Why this specific role matches your personality and background.</div>
                    </div>
                  </div>
                </div>
                <div style={{ position: "absolute", inset: 0, top: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <button onClick={() => onSwitchTab && onSwitchTab(0)} style={{
                    background: "#00C4A8", color: "#fff", border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 600, padding: "10px 20px", borderRadius: 8,
                    boxShadow: "0 2px 12px rgba(0,196,168,0.3)",
                  }}>Upload Resume to Unlock →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.careerClarity && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: "#00C4A8", flexShrink: 0 }} />
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#00C4A8" }}>Career Clarity</div>
          </div>
          <div style={{ background: "rgba(0,196,168,0.04)", border: "1px solid rgba(0,196,168,0.16)", borderRadius: 12, padding: "18px 16px" }}>
            <p style={{ color: "#4A4A4A", fontSize: 14, lineHeight: 1.82, margin: 0 }}>{result.careerClarity}</p>
          </div>
        </div>
      )}

      {result.growthPath && result.growthPath.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: "#6B4FFF", flexShrink: 0 }} />
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#6B4FFF" }}>Growth Path</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.growthPath.map((step, i) => (
              <div key={i} style={{ background: "rgba(107,79,255,0.04)", border: "1px solid rgba(107,79,255,0.14)", borderRadius: 12, padding: "16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(107,79,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#6B4FFF", flexShrink: 0 }}>{i + 1}</div>
                <span style={{ color: "#4A4A4A", fontSize: 14, lineHeight: 1.65 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrepTab({ result }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {result.interviewIntelligence && result.interviewIntelligence.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: "#F55D2C", flexShrink: 0 }} />
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#F55D2C" }}>Interview Intelligence</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.interviewIntelligence.map((bullet, i) => (
              <div key={i} style={{ background: "rgba(245,93,44,0.04)", border: "1px solid rgba(245,93,44,0.14)", borderRadius: 12, padding: "16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ color: "#F55D2C", fontSize: 12, flexShrink: 0, marginTop: 3 }}>▸</span>
                <span style={{ color: "#4A4A4A", fontSize: 14, lineHeight: 1.72 }}>{bullet}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: "#6B4FFF", flexShrink: 0 }} />
          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#6B4FFF" }}>Culture Match</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, rgba(0,196,168,0.06), rgba(107,79,255,0.06))", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "22px 20px" }}>
          <p style={{ color: "#6B6B6B", fontSize: 14, lineHeight: 1.75, margin: 0 }}>{result.cultureFit}</p>
        </div>
      </div>

      {result.environmentsToAvoid && result.environmentsToAvoid.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: "#DC2626", flexShrink: 0 }} />
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#DC2626" }}>Environments to Avoid</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.environmentsToAvoid.map((env, i) => (
              <div key={i} style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ color: "#DC2626", fontSize: 14, flexShrink: 0, marginTop: 2 }}>✕</span>
                <span style={{ color: "#4A4A4A", fontSize: 14, lineHeight: 1.65 }}>{env}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(result.archetypeShadowSide || (result.watchOuts && result.watchOuts.length > 0)) && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: "#F55D2C", flexShrink: 0 }} />
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#F55D2C" }}>Watch Out For</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.archetypeShadowSide && (
              <div style={{ background: "rgba(245,93,44,0.05)", border: "1px solid rgba(245,93,44,0.22)", borderRadius: 11, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ color: "#F55D2C", fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠</span>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#F55D2C", marginBottom: 4, fontWeight: 600 }}>Shadow Side</div>
                  <span style={{ color: "#6B6B6B", fontSize: 14, lineHeight: 1.65 }}>{result.archetypeShadowSide}</span>
                </div>
              </div>
            )}
            {(result.watchOuts || []).map((w, i) => (
              <div key={i} style={{ background: "rgba(245,93,44,0.05)", border: "1px solid rgba(245,93,44,0.16)", borderRadius: 11, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ color: "#F55D2C", fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠</span>
                <span style={{ color: "#6B6B6B", fontSize: 14, lineHeight: 1.65 }}>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── GuidedReveal ─────────────────────────────────────────────────────────────

export function GuidedReveal({
  result, step, wfId, onNext, onComplete,
  jobs, jobsLoading, jobsError,
  resumeData, resumeUploading, resumeError, resumeFileName, onResumeUpload,
}) {
  const isDark  = step === 0;
  const dotBase = isDark ? "wf-reveal-dot" : "wf-reveal-dot wf-reveal-dot-dark";

  // Step labels for the CTA button
  const ctaLabels = [
    "See Your Profile →",
    "See Your Roles →",
    "See Live Jobs →",
    "Upload Resume →",
    "Enter My Dashboard →",
    "Enter My Dashboard →",
  ];

  const handleCta = () => {
    if (step >= 4) {
      onComplete();
    } else {
      onNext();
    }
  };

  return (
    <div className={`wf-reveal ${isDark ? "wf-reveal-dark" : "wf-reveal-light"}`}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
      <style>{globalStyles}</style>

      <div className="wf-reveal-content" key={step}>

        {/* ── Step 0: Archetype reveal (dark) ─────────────────────────── */}
        {step === 0 && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: 5, textTransform: "uppercase", color: "#00C4A8", marginBottom: 20 }}>
              Your Assessment is Complete
            </div>
            {result.archetypeCategory && (
              <div style={{ display: "inline-block", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#6B4FFF", background: "rgba(107,79,255,0.15)", padding: "5px 14px", borderRadius: 20, fontWeight: 600, marginBottom: 18 }}>
                {result.archetypeCategory}
              </div>
            )}
            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(42px, 10vw, 64px)",
              fontWeight: 400,
              lineHeight: 1.06,
              letterSpacing: "-1.5px",
              color: "#FFFFFF",
              margin: "0 0 16px",
              animation: "revealScale 0.8s ease both 0.1s",
            }}>
              {result.archetype}
            </h1>
            {result.archetypeTagline && (
              <div style={{ fontSize: 16, color: "#00C4A8", fontStyle: "italic", fontWeight: 500, marginBottom: 20, lineHeight: 1.5, animation: "revealFadeIn 0.6s ease both 0.4s" }}>
                {result.archetypeTagline}
              </div>
            )}
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, lineHeight: 1.8, margin: 0, animation: "revealFadeIn 0.6s ease both 0.6s" }}>
              {result.operatingStyle}
            </p>
            <div style={{ marginTop: 32, padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", animation: "revealFadeIn 0.6s ease both 0.8s" }}>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Your WiredFor ID</div>
              <div style={{ fontSize: 15, color: "#00C4A8", fontWeight: 600, letterSpacing: 1 }}>{wfId}</div>
            </div>
          </div>
        )}

        {/* ── Step 1: OCEAN profile ─────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#6B4FFF", marginBottom: 8 }}>Your Big Five Profile</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400, color: "#0A0A0A", margin: "0 0 6px" }}>How you're wired</h2>
            <p style={{ color: "#6B6B6B", fontSize: 14, lineHeight: 1.72, margin: "0 0 28px" }}>
              These five scores map your natural operating system — how you think, process, and show up.
            </p>
            <OceanRadarChart ocean={result.ocean} size={220} />
            <OceanTraitBars ocean={result.ocean} animated />
            {result.archetypeTechFit && result.archetypeTechFit.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#6B4FFF", marginBottom: 10, fontWeight: 600 }}>Tech Fit</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {result.archetypeTechFit.map(role => (
                    <span key={role} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8, background: "rgba(107,79,255,0.08)", color: "#6B4FFF", fontWeight: 500 }}>{role}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Roles ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#00C4A8", marginBottom: 8 }}>Your Matched Roles</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400, color: "#0A0A0A", margin: "0 0 20px" }}>Where you'll thrive</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(result.roles || []).map((role, i) => (
                <div key={i} style={{ background: "#F7F7F5", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "16px", animation: `revealFadeIn 0.5s ease both ${i * 0.1}s` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>{role.icon}</span>
                    <span style={{ fontWeight: 700, color: "#0A0A0A", fontSize: 14, lineHeight: 1.3 }}>{role.title}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(role.whyItFits || []).slice(0, 2).map((bullet, j) => (
                      <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: "#6B4FFF", fontSize: 11, flexShrink: 0, marginTop: 3 }}>▸</span>
                        <span style={{ color: "#6B6B6B", fontSize: 13, lineHeight: 1.6 }}>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Live jobs ─────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#F55D2C", marginBottom: 8 }}>Live Openings</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400, color: "#0A0A0A", margin: "0 0 6px" }}>Jobs matched to your wiring</h2>
            <p style={{ color: "#6B6B6B", fontSize: 13, lineHeight: 1.65, margin: "0 0 20px" }}>
              Remotive · RemoteOK · Findwork
            </p>
            {jobsLoading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 0" }}>
                <div style={{ width: 32, height: 32, border: "2px solid rgba(0,0,0,0.08)", borderTop: "2px solid #00C4A8", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13, color: "#9B9B9B" }}>Finding live roles that match your profile...</span>
              </div>
            )}
            {!jobsLoading && (jobs.length === 0 || jobsError) && (
              <div style={{ padding: "24px 16px", background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14, color: "#6B6B6B", lineHeight: 1.65 }}>
                  No live matches right now — job boards update daily.{" "}
                  <a href="https://remotive.com/remote-jobs/software-dev" target="_blank" rel="noopener noreferrer" style={{ color: "#6B4FFF" }}>
                    Browse remote tech roles →
                  </a>
                </div>
              </div>
            )}
            {!jobsLoading && jobs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {jobs.slice(0, 4).map(job => <JobCard key={job.id} job={job} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Resume upload ─────────────────────────────────────── */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#6B4FFF", marginBottom: 8 }}>Background Check</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400, color: "#0A0A0A", margin: "0 0 6px" }}>Add your background</h2>
            <p style={{ color: "#6B6B6B", fontSize: 14, lineHeight: 1.72, margin: "0 0 24px" }}>
              Upload your resume to unlock three personalized career paths built from your experience + personality.
            </p>
            <ResumeUploadBlock
              resumeData={resumeData}
              resumeUploading={resumeUploading}
              resumeError={resumeError}
              resumeFileName={resumeFileName}
              onResumeUpload={onResumeUpload}
            />
            {!resumeData && (
              <button
                onClick={onNext}
                style={{
                  marginTop: 16, width: "100%", padding: "12px", border: "none",
                  background: "none", color: "#9B9B9B", fontSize: 13,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Skip for now
              </button>
            )}
          </div>
        )}

        {/* ── Step 5: Dashboard ready ───────────────────────────────────── */}
        {step === 5 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 16, animation: "revealScale 0.6s ease both" }}>✓</div>
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#00C4A8", marginBottom: 12 }}>
              Your Profile is Ready
            </div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 400, color: "#0A0A0A", margin: "0 0 12px", lineHeight: 1.2 }}>
              {result.archetype}
            </h2>
            <p style={{ color: "#6B6B6B", fontSize: 14, lineHeight: 1.75, margin: "0 0 28px" }}>
              Your full dashboard is waiting — roles, career paths, interview intelligence, and everything else we built for your wiring.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
              {[
                ["👤", "Your complete profile + OCEAN breakdown"],
                ["💼", `${(result.roles || []).length} roles matched to your wiring`],
                ["🗺️", "Career paths" + (resumeData ? " + personalized paths from your resume" : " (upload resume to unlock)")],
                ["🎤", "Interview intelligence built for how you communicate"],
              ].map(([icon, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(0,196,168,0.04)", border: "1px solid rgba(0,196,168,0.14)", borderRadius: 10 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <span style={{ fontSize: 13, color: "#4A4A4A", lineHeight: 1.5 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer: dots + CTA */}
      <div className="wf-reveal-footer">
        {/* Step dots */}
        <div className="wf-reveal-step-dots">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`${dotBase}${i === step ? " active" : ""}`} />
          ))}
        </div>

        {/* Skip resume step has its own inline skip button, only show main CTA when past it */}
        {step !== 4 && (
          <button
            className={`wf-reveal-cta ${isDark ? "wf-reveal-cta-dark" : step === 5 ? "wf-reveal-cta-teal" : "wf-reveal-cta-light"}`}
            onClick={handleCta}
          >
            {ctaLabels[step]}
          </button>
        )}
        {step === 4 && resumeData && (
          <button
            className="wf-reveal-cta wf-reveal-cta-teal"
            onClick={onNext}
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

const TAB_DEFS = [
  { label: "Profile", icon: "👤", short: "Profile" },
  { label: "Roles",   icon: "💼", short: "Roles" },
  { label: "Path",    icon: "🗺️", short: "Path" },
  { label: "Prep",    icon: "🎤", short: "Prep" },
];

function ReviewPrompt({ wfId, result }) {
  const storageKey = `wf_reviewed_${wfId}`;
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(storageKey));
  const [stars, setStars] = useState(0);
  const [jobTitle, setJobTitle] = useState(result.resumeData?.currentTitle || "");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (dismissed) return null;

  const handleSubmit = async () => {
    if (!stars) return;
    setSubmitting(true);
    try {
      await authFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wfId,
          archetype: result.archetype,
          category: result.archetypeCategory || null,
          jobTitle: jobTitle.trim() || null,
          stars,
          reviewText: text.trim() || null,
        }),
      });
      setSubmitted(true);
      localStorage.setItem(storageKey, "1");
      setTimeout(() => setDismissed(true), 2000);
    } catch (err) {
      console.error("review submit error:", err);
    }
    setSubmitting(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  if (submitted) {
    return (
      <div style={{ background: "rgba(0,196,168,0.06)", border: "1px solid rgba(0,196,168,0.18)", borderRadius: 14, padding: "16px 18px", marginBottom: 20, textAlign: "center" }}>
        <span style={{ fontSize: 14, color: "#00C4A8", fontWeight: 600 }}>Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div style={{ background: "rgba(107,79,255,0.04)", border: "1px solid rgba(107,79,255,0.14)", borderRadius: 14, padding: "18px 18px 16px", marginBottom: 20, position: "relative" }}>
      <button onClick={handleDismiss} style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "#9B9B9B", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 2 }}>×</button>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", marginBottom: 8 }}>How accurate was your profile?</div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} onClick={() => setStars(i)} style={{
            background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: "0 2px",
            color: i <= stars ? "#FFBE0B" : "#D4D4D4", transition: "color 0.1s",
          }}>★</button>
        ))}
      </div>
      {stars > 0 && (
        <>
          <input
            type="text"
            placeholder="Your current job title (optional)"
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            style={{
              width: "100%", background: "#F7F7F5", border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#0A0A0A",
              fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", outline: "none",
              boxSizing: "border-box", marginBottom: 10,
            }}
          />
          <input
            type="text"
            placeholder="Short feedback (optional, 150 chars max)"
            value={text}
            onChange={e => setText(e.target.value.slice(0, 150))}
            maxLength={150}
            style={{
              width: "100%", background: "#F7F7F5", border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#0A0A0A",
              fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", outline: "none",
              boxSizing: "border-box", marginBottom: 10,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                background: "#00C4A8", color: "#fff", border: "none", borderRadius: 8,
                padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: submitting ? "default" : "pointer",
                fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
              }}
            >{submitting ? "Sending..." : "Submit"}</button>
            <span style={{ fontSize: 11, color: "#9B9B9B" }}>{text.length}/150</span>
          </div>
        </>
      )}
    </div>
  );
}

function Dashboard({
  result, wfId, onRetake,
  jobs, jobsLoading, jobsError, jobsVisible, onLoadJobs,
  resumeData, careerPaths, resumeMismatches,
  resumeUploading, resumeError, resumeFileName, onResumeUpload,
}) {
  const [tab, setTab] = useState(0);

  const tabContent = [
    <ProfileTab key="profile"
      result={result}
      wfId={wfId}
      resumeData={resumeData}
      resumeUploading={resumeUploading}
      resumeError={resumeError}
      resumeFileName={resumeFileName}
      onResumeUpload={onResumeUpload}
    />,
    <RolesTab key="roles"
      result={result}
      resumeMismatches={resumeMismatches}
      jobs={jobs}
      jobsLoading={jobsLoading}
      jobsError={jobsError}
      jobsVisible={jobsVisible}
      onLoadJobs={onLoadJobs}
    />,
    <PathTab key="path"
      result={result}
      careerPaths={careerPaths}
      onSwitchTab={setTab}
    />,
    <PrepTab key="prep" result={result} />,
  ];

  return (
    <div className="wf-dash">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
      <style>{globalStyles}</style>

      {/* Mobile fixed header */}
      <header className="wf-dash-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg viewBox="0 0 48 48" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="48" height="48" rx="12" fill="#0A0A0A"/>
            <circle cx="8" cy="13" r="4" fill="#00C4A8"/><circle cx="18" cy="35" r="3" fill="#6B4FFF"/><circle cx="24" cy="22" r="3.5" fill="#00C4A8"/><circle cx="30" cy="35" r="3" fill="#6B4FFF"/><circle cx="40" cy="13" r="4" fill="#00C4A8"/>
            <line x1="8" y1="13" x2="18" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="18" y1="35" x2="24" y2="22" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="24" y1="22" x2="30" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="30" y1="35" x2="40" y2="13" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em" }}>WiredFor<span style={{ color: "#00C4A8" }}>.ai</span></div>
            <div style={{ fontSize: 10, color: "#00C4A8", letterSpacing: 1, fontWeight: 500 }}>{wfId}</div>
          </div>
        </div>
        <button className="cm-retake-btn" onClick={onRetake}>Retake</button>
      </header>

      {/* Scrollable content area */}
      <div className="wf-dash-content">
        <div className="wf-dash-content-inner">

          {/* Desktop-only header */}
          <div className="wf-dash-desktop-header">
            <div>
              <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#9B9B9B" }}>Assessment Complete</div>
              <div style={{ fontSize: 12, color: "#00C4A8", marginTop: 4, letterSpacing: 1 }}>{wfId}</div>
            </div>
            <button className="cm-retake-btn" onClick={onRetake}>Retake</button>
          </div>

          {/* Desktop top tabs */}
          <div className="wf-dash-top-tabs">
            {TAB_DEFS.map((t, i) => (
              <button key={t.label} className={`wf-dash-tab-btn${tab === i ? " active" : ""}`} onClick={() => setTab(i)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tabContent[tab]}
        </div>
      </div>

      {/* Mobile fixed bottom nav */}
      <nav className="wf-dash-bottom-nav">
        {TAB_DEFS.map((t, i) => (
          <button key={t.label} className={`wf-dash-nav-btn${tab === i ? " active" : ""}`} onClick={() => setTab(i)}>
            <span className="wf-dash-nav-icon">{t.icon}</span>
            <span>{t.short}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── Utilities ────────────────────────────────────────────────────────────────

function generateWFId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "WF-";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// ── Main component ───────────────────────────────────────────────────────────

// Synchronous bootstrap — runs before first render
function getInitialState() {
  const params = new URLSearchParams(window.location.search);

  // Retake flag: clear everything and force intro
  if (params.get("retake") === "true") {
    localStorage.removeItem("careermatch_result");
    localStorage.removeItem("careermatch_wf_id");
    localStorage.removeItem("careermatch_test_mode");
    localStorage.removeItem("has_completed_onboarding");
    window.history.replaceState({}, "", "/assessment");
    return { screen: "intro", profile: null };
  }

  // Test mode: load profile from localStorage
  if (localStorage.getItem("careermatch_test_mode") === "true") {
    try {
      const raw = localStorage.getItem("careermatch_result");
      const profile = raw ? JSON.parse(raw) : null;
      if (profile) return { screen: "reveal", profile };
    } catch {}
  }

  return { screen: "checking", profile: null };
}

export default function CareerMatch() {
  // Synchronous initializers — retake flag, test mode, or default checking state
  const [initial]                        = useState(() => getInitialState());
  const [screen, setScreen]             = useState(initial.screen);
  const [currentQ, setCurrentQ]         = useState(0);
  const [answers, setAnswers]           = useState({});
  const [result, setResult]             = useState(initial.profile);
  const [selectedOption, setSelectedOption] = useState(null);
  const [textInput, setTextInput]       = useState("");
  const [animating, setAnimating]       = useState(false);
  const [pendingResult, setPendingResult] = useState(null);
  const [wfId, setWfId]                 = useState(() => {
    return localStorage.getItem("careermatch_wf_id") || generateWFId();
  });

  // Reveal flow
  const [revealStep, setRevealStep]     = useState(0);

  // Lifted jobs state
  const [jobs, setJobs]                 = useState([]);
  const [jobsLoading, setJobsLoading]   = useState(false);
  const [jobsError, setJobsError]       = useState(false);
  const [jobsVisible, setJobsVisible]   = useState(false);
  const jobsLoadedRef                   = useRef(false);

  // Lifted resume state
  const [resumeData, setResumeData]         = useState(initial.profile?.resumeData ?? null);
  const [careerPaths, setCareerPaths]       = useState(initial.profile?.careerPaths ?? null);
  const [resumeMismatches, setResumeMismatches] = useState([]);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError]       = useState(null);
  const [resumeFileName, setResumeFileName] = useState(null);

  // ── Mount: check for returning candidate ───────────────────────────────────
  useEffect(() => {
    // Retake and test mode were resolved synchronously in getInitialState() —
    // skip Supabase if screen is already set to intro or reveal.
    if (initial.screen !== "checking") return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        localStorage.removeItem("careermatch_result");
        setScreen("intro");
        return;
      }

      let candidate = null;
      try {
        const res = await authFetch(`/api/save-candidate?userId=${encodeURIComponent(session.user.id)}`);
        const json = await res.json();
        candidate = json.candidate || null;
      } catch (err) {
        console.error("get-candidate fetch error:", err.message);
      }

      if (candidate?.archetype) {
        const derivedArchetype = candidate.ocean
          ? assignArchetype(candidate.ocean)
          : ARCHETYPES.find(a => a.name === candidate.archetype) || null;

        const savedResult = {
          archetype:           derivedArchetype ? derivedArchetype.name : candidate.archetype,
          operatingStyle:      derivedArchetype ? derivedArchetype.description : candidate.operating_style,
          archetypeTagline:    derivedArchetype?.tagline || "",
          archetypeCategory:   derivedArchetype?.category || "",
          archetypeShadowSide: derivedArchetype?.shadowSide || "",
          archetypeTechFit:    derivedArchetype?.techFit || [],
          ocean:               candidate.ocean,
          roles:               candidate.roles || [],
          watchOuts:           candidate.watch_outs || [],
          cultureFit:          candidate.culture_fit,
          location:            candidate.location,
          workPreference:      candidate.work_preference,
          careerClarity:       candidate.career_clarity,
          growthPath:          candidate.growth_path,
          interviewIntelligence: candidate.interview_intelligence,
          environmentsToAvoid: candidate.environments_to_avoid,
          resumeData:          candidate.resume_data,
          careerPaths:         candidate.career_paths,
        };

        if (candidate.wf_id) localStorage.setItem("careermatch_wf_id", candidate.wf_id);
        localStorage.setItem("careermatch_result", JSON.stringify(savedResult));

        // Restore lifted resume state
        if (candidate.resume_data)  setResumeData(candidate.resume_data);
        if (candidate.career_paths) setCareerPaths(candidate.career_paths);

        setResult(savedResult);
        setScreen("dashboard");
      } else {
        localStorage.removeItem("careermatch_result");
        setScreen("intro");
      }
    });
  }, []);

  // ── Restore saved progress ──────────────────────────────────────────────────
  const [hasSavedProgress, setHasSavedProgress] = useState(false);

  useEffect(() => {
    if (screen !== "intro") return;
    const storedWfId = localStorage.getItem("careermatch_wf_id");
    if (!storedWfId) return;

    fetch(`/api/save-answers?wfId=${encodeURIComponent(storedWfId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.progress?.answers && Object.keys(data.progress.answers).length > 0) {
          setHasSavedProgress(true);
        }
      })
      .catch(() => {});
  }, [screen]);

  const restoreProgress = () => {
    const storedWfId = localStorage.getItem("careermatch_wf_id");
    if (!storedWfId) return;

    fetch(`/api/save-answers?wfId=${encodeURIComponent(storedWfId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.progress?.answers) {
          const saved = data.progress.answers;
          const answeredIds = Object.keys(saved).map(Number);
          const lastAnsweredIdx = questions.reduce((max, q, i) => answeredIds.includes(q.id) ? i : max, -1);
          setAnswers(saved);
          setCurrentQ(Math.min(lastAnsweredIdx + 1, questions.length - 1));
          setScreen("quiz");
        }
      })
      .catch(() => setScreen("quiz"));
  };

  // ── GA4: track assessment abandonment ──────────────────────────────────────
  useEffect(() => {
    if (screen !== "quiz") return;

    const handleAbandon = () => {
      window.gtag?.("event", "assessment_abandoned", {
        question_number: currentQ + 1,
        questions_answered: Object.keys(answers).length,
        total_questions: questions.length,
      });
    };

    window.addEventListener("beforeunload", handleAbandon);
    return () => window.removeEventListener("beforeunload", handleAbandon);
  }, [screen, currentQ, answers]);

  // ── Skip auth if session already active ────────────────────────────────────
  useEffect(() => {
    if (screen !== "auth") return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleAuthComplete({ userId: session.user.id, email: session.user.email, isNew: false });
    });
  }, [screen]);

  // ── Cleanup background retry on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => { if (bgRetryRef.current) clearInterval(bgRetryRef.current); };
  }, []);

  // ── Auto-load jobs on reveal step 3 ────────────────────────────────────────
  useEffect(() => {
    if (screen !== "reveal" || revealStep !== 3) return;
    if (jobsLoadedRef.current) return;
    jobsLoadedRef.current = true;
    loadJobs();
  }, [screen, revealStep]);

  // ── Jobs ───────────────────────────────────────────────────────────────────
  const loadJobs = () => {
    if (!result?.ocean) { setJobsError(true); return; }
    setJobsLoading(true);
    setJobsVisible(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 28000);
    fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        ocean: result.ocean,
        archetype: result.archetype,
        operatingStyle: result.operatingStyle,
        location: result.location || null,
        workPreference: result.workPreference || null,
        resumeData: resumeData || null,
      }),
    })
      .then(r => { if (!r.ok) throw new Error("non-200"); return r.json(); })
      .then(data => { if (Array.isArray(data) && data.length > 0) setJobs(data); else setJobsError(true); })
      .catch(() => setJobsError(true))
      .finally(() => { clearTimeout(timer); setJobsLoading(false); });
  };

  const handleLoadJobs = () => {
    if (jobsVisible) return;
    jobsLoadedRef.current = true;
    loadJobs();
  };

  // ── Resume upload ──────────────────────────────────────────────────────────
  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["application/pdf", "text/plain"];
    if (!allowedTypes.includes(file.type)) { setResumeError("Please upload a PDF or text file."); return; }
    if (file.size > 3 * 1024 * 1024)       { setResumeError("File must be under 3MB. Try re-saving your PDF without images."); return; }
    setResumeError(null);
    setResumeFileName(file.name);
    setResumeUploading(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      try {
        const res = await authFetch("/api/analyze-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64,
            fileType: file.type,
            ocean: result.ocean,
            archetype: result.archetype,
            operatingStyle: result.operatingStyle,
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error("resume API error:", res.status, errText.slice(0, 500));
          if (res.status === 413) throw new Error("File too large — try a smaller PDF (under 3MB).");
          throw new Error(`Analysis failed (${res.status})`);
        }
        const data = await res.json();
        window.gtag?.("event", "resume_uploaded");
        const newResumeData  = data.resumeData || null;
        const newCareerPaths = data.careerPaths || null;
        const newMismatches  = data.mismatches  || [];
        setResumeData(newResumeData);
        setCareerPaths(newCareerPaths);
        setResumeMismatches(newMismatches);
        handleResumeAnalyzed({ resumeData: newResumeData, careerPaths: newCareerPaths, mismatches: newMismatches });
      } catch (err) {
        setResumeError(err.message || "Analysis failed — please try again.");
        console.error("resume analysis error:", err);
      } finally {
        setResumeUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResumeAnalyzed = (analysisData) => {
    const stored = localStorage.getItem("careermatch_result");
    if (!stored) return;
    const current = JSON.parse(stored);
    const updated = {
      ...current,
      resumeData:      analysisData.resumeData || null,
      careerPaths:     analysisData.careerPaths || null,
      resumeMismatches: analysisData.mismatches || [],
    };
    localStorage.setItem("careermatch_result", JSON.stringify(updated));

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        authFetch("/api/save-candidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.id,
            wfId,
            email: session.user.email,
            archetype: updated.archetype,
            archetypeCategory: updated.archetypeCategory || null,
            operatingStyle: updated.operatingStyle,
            ocean: updated.ocean,
            roles: updated.roles,
            watchOuts: updated.watchOuts,
            cultureFit: updated.cultureFit,
            location: updated.location || null,
            workPreference: updated.workPreference || null,
            careerClarity: updated.careerClarity || null,
            growthPath: updated.growthPath || null,
            interviewIntelligence: updated.interviewIntelligence || null,
            environmentsToAvoid: updated.environmentsToAvoid || null,
            resumeData: updated.resumeData || null,
            careerPaths: updated.careerPaths || null,
          }),
        }).catch(err => console.error("resume save error:", err.message));
      }
    });
  };

  // ── Save to Supabase ───────────────────────────────────────────────────────
  const saveToSupabase = async (userId, email, wfid, extra = {}) => {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await new Promise(r => setTimeout(r, attempt * 600));
        const stored = localStorage.getItem("careermatch_result");
        if (!stored) { console.error("No localStorage backup found for", wfid); return; }
        const res = JSON.parse(stored);

        const response = await authFetch("/api/save-candidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            wfId: wfid,
            email,
            archetype: res.archetype,
            archetypeCategory: res.archetypeCategory || null,
            operatingStyle: res.operatingStyle,
            ocean: res.ocean,
            roles: res.roles,
            watchOuts: res.watchOuts,
            cultureFit: res.cultureFit,
            location: res.location || null,
            workPreference: res.workPreference || null,
            careerClarity: res.careerClarity || null,
            growthPath: res.growthPath || null,
            interviewIntelligence: res.interviewIntelligence || null,
            environmentsToAvoid: res.environmentsToAvoid || null,
            resumeData: res.resumeData || null,
            careerPaths: res.careerPaths || null,
            ...extra,
          }),
        });

        const data = await response.json();
        if (response.ok) return data;
        console.error(`Save attempt ${attempt}/${MAX_ATTEMPTS} failed:`, data.error, data.code);
      } catch (err) {
        console.error(`Save attempt ${attempt}/${MAX_ATTEMPTS} threw:`, err.message);
      }
    }
    console.error("All save attempts exhausted for", wfid);
  };

  const markOnboardingComplete = () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      authFetch("/api/save-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          wfId,
          email: session.user.email,
          hasCompletedOnboarding: true,
        }),
      }).catch(err => console.error("onboarding flag error:", err.message));
    });
  };

  // ── Auth complete ──────────────────────────────────────────────────────────
  const handleAuthComplete = async ({ userId, email, isNew, location, workPreference }) => {
    const res = pendingResult;
    if (!res) { setScreen("reveal"); return; }

    const enrichedRes = { ...res, location: location || null, workPreference: workPreference || null };
    localStorage.setItem("careermatch_wf_id", wfId);
    localStorage.setItem("careermatch_result", JSON.stringify(enrichedRes));
    setResult(enrichedRes);
    setPendingResult(null);
    setScreen("reveal");
    saveToSupabase(userId, email, wfId);
  };

  // ── Reveal navigation ──────────────────────────────────────────────────────
  const handleRevealNext = () => {
    setRevealStep(s => Math.min(s + 1, 5));
  };

  const handleRevealComplete = () => {
    markOnboardingComplete();
    setScreen("dashboard");
  };

  // ── Retake ─────────────────────────────────────────────────────────────────
  const handleRetake = async () => {
    localStorage.removeItem("careermatch_result");
    localStorage.removeItem("careermatch_test_mode");
    await supabase.auth.signOut();
    setResult(null);
    setCurrentQ(0);
    setAnswers({});
    setPendingResult(null);
    setRevealStep(0);
    setJobs([]);
    setJobsLoading(false);
    setJobsError(false);
    setJobsVisible(false);
    setResumeData(null);
    setCareerPaths(null);
    setResumeMismatches([]);
    jobsLoadedRef.current = false;
    setScreen("intro");
  };

  // ── Quiz ───────────────────────────────────────────────────────────────────
  const q = questions[currentQ];
  const isLastQ = currentQ === questions.length - 1;

  const handleAnswer = (value) => {
    if (q.type === "choice") {
      setSelectedOption(value);
      setTimeout(() => advance(value), 300);
    }
  };

  const saveAnswersProgress = (currentAnswers) => {
    authFetch("/api/save-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wfId, answers: currentAnswers }),
    }).catch(err => console.error("Progressive save failed:", err.message));
  };

  const advance = (value) => {
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);
    setAnimating(true);
    // Save progress after every question
    saveAnswersProgress(newAnswers);
    setTimeout(() => {
      setSelectedOption(null);
      setTextInput("");
      if (isLastQ) {
        setScreen("loading");
        runAnalysis(newAnswers);
      } else {
        setCurrentQ(c => c + 1);
        setAnimating(false);
      }
    }, 300);
  };

  const handleTextNext = () => {
    if (!textInput.trim()) return;
    advance(textInput);
  };

  // ── Analysis ───────────────────────────────────────────────────────────────
  const [retryCount, setRetryCount] = useState(0);
  const [retryStatus, setRetryStatus] = useState(null); // null | "retrying" | "background"
  const bgRetryRef = useRef(null);

  const runAnalysis = async (allAnswers, attempt = 1) => {
    const answerSummary = Object.entries(allAnswers).map(([id, ans]) => {
      const q = questions.find(q => q.id === parseInt(id));
      return `Q${id} [${q.big5}] ${q.text}\n→ ${ans}`;
    }).join("\n\n");

    const prompt = `You are a precise career analyst and psychometrician. Your job is to analyze someone's actual answers and produce a UNIQUE profile that reflects THEIR specific responses — not a generic template.

CRITICAL: Every person gets different results. If someone is an RN or works in healthcare or people-focused work, their roles should reflect that background. If someone is technical and introverted, reflect that. Never default to generic tech roles if the answers suggest otherwise.

Here are their answers:
${answerSummary}

QUESTION-TO-TRAIT MAPPING:
- Q1–Q7 → Openness (Q1 and Q7 are open-ended text — use for OCEAN scoring only, never quote in candidate-facing copy)
- Q8–Q14 → Conscientiousness
- Q15–Q21 → Extraversion
- Q22–Q28 → Agreeableness (Q28 is open-ended text — use for OCEAN scoring only, never quote in candidate-facing copy)
- Q29–Q35 → Neuroticism
- Q36 → Experience level (not an OCEAN trait — used only for seniority calibration)

OCEAN SCORING RULES:

Score each trait 20-90. Use the full range — most people should have at least
one trait below 40 and one above 75. Each trait has 7 dedicated questions — use all of them.

OPENNESS (curiosity, creativity, novelty preference) — scored from Q1–Q7
- 75-90: Explicitly seeks new ideas, hates routine, thinks in possibilities
- 55-74: Curious but values some structure, open to change when it makes sense
- 35-54: Prefers proven methods, comfortable with routine, practical over creative
- 20-34: Strongly routine-driven, resists change, concrete thinker

CONSCIENTIOUSNESS (organization, follow-through, planning) — scored from Q8–Q14
- 75-90: Plans everything, high follow-through, structured, detail-oriented
- 55-74: Generally organized but flexible, meets deadlines, some spontaneity
- 35-54: Inconsistent follow-through, works in bursts, struggles with structure
- 20-34: Spontaneous, resists process, starts more than finishes

EXTRAVERSION (social energy, collaboration, leadership drive) — scored from Q15–Q21
- 75-90: Energized by people, seeks collaboration, natural communicator
- 55-74: Comfortable socially but needs some alone time to recharge
- 35-54: Prefers small groups or 1:1, selective about social energy
- 20-34: Strongly introverted, drained by collaboration, works best alone

AGREEABLENESS (empathy, conflict style, people orientation) — scored from Q22–Q28
- 75-90: People-first, avoids conflict, high empathy, team harmony matters most
- 55-74: Caring but direct, can push back when needed, balanced
- 35-54: Task-focused over people-focused, direct, comfortable with conflict
- 20-34: Highly direct, challenges others readily, outcome over relationship

NEUROTICISM (stress response, emotional stability, pressure handling) — scored from Q29–Q35
- 75-90: Frequently stressed, overthinks, needs stability and predictability
- 55-74: Occasionally anxious under pressure but generally manages well
- 35-54: Generally stable, handles pressure without significant disruption
- 20-34: Very calm under pressure, stress rarely affects performance

ANCHORING RULE: Before finalizing scores, check that:
- No two traits are within 8 points of each other unless answers strongly justify it
- At least one trait is below 45
- At least one trait is above 72
- Scores reflect the PATTERN of all 7 answers per trait, not just one or two responses

Return ONLY valid JSON, no markdown, no explanation, no preamble:
{
  "ocean": {
    "openness": <integer 0-100>,
    "conscientiousness": <integer 0-100>,
    "extraversion": <integer 0-100>,
    "agreeableness": <integer 0-100>,
    "neuroticism": <integer 0-100>
  },
  "roles": [
    {
      "title": "Specific Job Title",
      "icon": "emoji",
      "whyItFits": [
        "Bullet 1 — tie directly to one of their OCEAN scores or a specific answer",
        "Bullet 2 — tie to their work preference or stated goals",
        "Bullet 3 — tie to their lifestyle vision or motivation answer"
      ]
    }
  ],
  "watchOuts": ["specific risk 1 based on their answers", "specific risk 2", "specific risk 3"],
  "cultureFit": "Specific culture description derived from their actual answers",
  "careerClarity": "4-5 sentence paragraph written as a perceptive outside observer. Explain WHY this specific OCEAN combination causes this person to thrive in certain environments and struggle in others. Reference their actual score values explicitly — e.g. 'Your openness at 87 combined with extraversion at 31 means...' Make it feel like a revelation, not a summary. Never generic.",
  "growthPath": [
    "Concrete, actionable step 1 toward their best-fit roles — specific to their OCEAN scores and stated goals, not generic career advice",
    "Step 2 — a different angle, equally concrete and specific to their profile",
    "Step 3 — could be a skill to build, a context to seek, or a behavior to shift based on their actual wiring"
  ],
  "interviewIntelligence": [
    "Lead with [their specific strength] — when asked [common interview question type], say: [exact suggested phrasing tailored to their wiring]",
    "Bullet 2 — different strength, different question type, different suggested phrasing",
    "Bullet 3 — address a potential weakness or unusual trait they should pre-empt or reframe",
    "Bullet 4 — specific language for talking about how they work with others, based on their Agreeableness + Extraversion scores"
  ],
  "environmentsToAvoid": [
    "A specific environment or role type that will drain or frustrate this candidate — be direct and honest, tied explicitly to their OCEAN scores",
    "Second specific environment to avoid — different from the first",
    "Third environment to avoid"
  ]
}

Rules:
- OCEAN scores must vary meaningfully — no two traits within 10 points of each other unless truly warranted
- Roles must match their background and answers — a nurse gets healthcare-adjacent roles, a developer gets technical roles
- 3-5 roles total
- Role titles must include seniority level (Senior, Lead, Staff, Principal, etc.) where experience or answers suggest it — do not default to entry-level titles
- Q36 is the explicit experience level tagged [Experience]. Use it as a hard seniority constraint — no exceptions:
  "Just starting out (0–2 years)" → entry-level and junior titles only
  "Finding my footing (3–5 years)" → junior to mid-level titles
  "Mid-career (6–10 years)" → mid-level titles, Senior acceptable where warranted
  "Senior level (11–15 years)" → Senior and Lead titles only, no junior or mid-level
  "Veteran (15+ years)" → Staff, Principal, Director, VP, or equivalent only
- Each whyItFits bullet must reference something specific — a score, a trait, or a direct answer they gave
- watchOuts must reference something specific from their answers, not generic advice
- Never use the words "dynamic", "passionate", "driven", or "innovative" anywhere in the output — they are filler and will be rejected
- careerClarity must cite at least two specific OCEAN score values by number
- interviewIntelligence bullets must each include a suggested phrase the candidate can actually say (format: "say: ..." or "tell them: ...")
- environmentsToAvoid must name a specific environment type, not vague advice — e.g. "High-volume sales orgs where quota is the primary metric" not "competitive environments"
- growthPath steps must be concrete and actionable — specific enough that the candidate knows exactly what to do next
- Do NOT include an "archetype" or "operatingStyle" field — those are assigned separately by the framework`;

    try {
      const response = await authFetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const text = data.content.map(i => i.type === "text" ? i.text : "").join("").trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      const parsed = JSON.parse(jsonMatch[0]);

      const matchedArchetype = assignArchetype(parsed.ocean);
      parsed.archetype           = matchedArchetype.name;
      parsed.operatingStyle      = matchedArchetype.description;
      parsed.archetypeTagline    = matchedArchetype.tagline;
      parsed.archetypeCategory   = matchedArchetype.category;
      parsed.archetypeShadowSide = matchedArchetype.shadowSide;
      parsed.archetypeTechFit    = matchedArchetype.techFit;

      // Success — clear any background retry
      if (bgRetryRef.current) { clearInterval(bgRetryRef.current); bgRetryRef.current = null; }
      setRetryStatus(null);
      setRetryCount(0);
      window.gtag?.("event", "assessment_completed");

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        localStorage.setItem("careermatch_wf_id", wfId);
        localStorage.setItem("careermatch_result", JSON.stringify(parsed));
        setResult(parsed);
        setRevealStep(0);
        setScreen("reveal");
        saveToSupabase(session.user.id, session.user.email, wfId);
      } else {
        setPendingResult(parsed);
        setScreen("auth");
      }
    } catch (err) {
      console.error(`Analysis error (attempt ${attempt}/3):`, err.message);

      // Retry up to 3 times with increasing delay
      if (attempt < 3) {
        const delay = attempt * 3000; // 3s, 6s
        setRetryStatus("retrying");
        setRetryCount(attempt);
        console.log(`[WiredFor.ai] Retrying analysis in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        return runAnalysis(allAnswers, attempt + 1);
      }

      // All 3 attempts failed — show pending message and start background retry
      console.log("[WiredFor.ai] All retries failed. Starting background retry.");
      setRetryStatus("background");
      setScreen("loading");

      // Save answers so they're not lost
      saveAnswersProgress(allAnswers);

      // Background retry every 5 minutes
      if (bgRetryRef.current) clearInterval(bgRetryRef.current);
      bgRetryRef.current = setInterval(() => {
        console.log("[WiredFor.ai] Background retry attempt...");
        runAnalysis(allAnswers, 1);
      }, 5 * 60 * 1000);
    }
  };

  // ── Screen renders ─────────────────────────────────────────────────────────

  if (screen === "checking") return (
    <div className="cm-container" style={{ justifyContent: "center" }}>
      <style>{globalStyles}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "0 24px" }}>
        <div style={{ width: 20, height: 20, border: "2px solid rgba(0,0,0,0.10)", borderTop: "2px solid #00C4A8", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <div style={{ fontSize: 13, color: "#9B9B9B", letterSpacing: "0.04em" }}>Loading your profile...</div>
      </div>
    </div>
  );

  if (screen === "intro") return (
    <div className="cm-container">
      <style>{globalStyles}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
      <div className="cm-card">
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: "inline-block", fontSize: 10, letterSpacing: 4, textTransform: "uppercase",
            color: "#00C4A8", border: "1px solid rgba(0,196,168,0.3)", padding: "6px 14px", borderRadius: 6, marginBottom: 24
          }}>Career Intelligence</div>
          <h1 className="cm-intro-title">
            Find your<br /><em style={{ color: "#00C4A8" }}>true fit</em>
          </h1>
          <p style={{ color: "#6B6B6B", fontSize: 15, lineHeight: 1.75, margin: 0 }}>
            35 questions that map how you actually operate — not just what you say you like. We'll match you to roles built for your wiring.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
          {[["🧭", "Operating style analysis"], ["💼", "3–5 matched roles"], ["⚠️", "Blind spots to watch"]].map(([icon, label]) => (
            <div key={label} style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ color: "#6B6B6B", fontSize: 15 }}>{label}</span>
            </div>
          ))}
        </div>
        {hasSavedProgress ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="cm-primary-btn" onClick={() => {
              localStorage.setItem("careermatch_wf_id", wfId);
              console.log("[WiredFor.ai] Resuming with WF-ID:", wfId);
              window.gtag?.("event", "assessment_resumed");
              restoreProgress();
            }} style={{ background: "#00C4A8", color: "#fff" }}>
              Continue Where You Left Off →
            </button>
            <button className="cm-primary-btn" onClick={() => {
              const freshId = generateWFId();
              localStorage.setItem("careermatch_wf_id", freshId);
              setWfId(freshId);
              console.log("[WiredFor.ai] Starting over with new WF-ID:", freshId);
              window.gtag?.("event", "assessment_started");
              setHasSavedProgress(false);
              setAnswers({});
              setCurrentQ(0);
              setScreen("quiz");
            }} style={{ background: "transparent", color: "#6B6B6B", border: "1px solid rgba(0,0,0,0.12)" }}>
              Start Over
            </button>
          </div>
        ) : (
          <button className="cm-primary-btn" onClick={() => {
            localStorage.setItem("careermatch_wf_id", wfId);
            console.log("[WiredFor.ai] Assessment started with WF-ID:", wfId);
            window.gtag?.("event", "assessment_started");
            setScreen("quiz");
          }} style={{ background: "#00C4A8", color: "#fff" }}>
            Start Assessment →
          </button>
        )}
      </div>
    </div>
  );

  if (screen === "loading") return (
    <div className="cm-container" style={{ justifyContent: "center" }}>
      <style>{globalStyles}</style>
      <div style={{ textAlign: "center", padding: "0 24px", maxWidth: 400 }}>
        <div style={{
          width: 56, height: 56, border: "2px solid rgba(0,0,0,0.08)", borderTop: "2px solid #00C4A8",
          borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 24px"
        }} />
        {retryStatus === "background" ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", marginBottom: 8 }}>Your results are being generated</div>
            <div style={{ fontSize: 13, color: "#6B6B6B", lineHeight: 1.6, marginBottom: 16 }}>
              This is taking longer than usual. Your answers are saved — you can stay on this page or come back later and your results will be ready.
            </div>
            <div style={{ fontSize: 11, color: "#9B9B9B" }}>Retrying automatically...</div>
          </>
        ) : retryStatus === "retrying" ? (
          <>
            <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#9B9B9B" }}>Analyzing your profile</div>
            <div style={{ fontSize: 12, color: "#9B9B9B", marginTop: 8 }}>Retry {retryCount} of 3...</div>
          </>
        ) : (
          <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#9B9B9B" }}>Analyzing your profile</div>
        )}
      </div>
    </div>
  );

  if (screen === "auth") return (
    <AuthScreen wfId={wfId} onComplete={handleAuthComplete} />
  );

  if (screen === "reveal") return (
    <GuidedReveal
      result={result}
      step={revealStep}
      wfId={localStorage.getItem("careermatch_wf_id") || wfId}
      onNext={handleRevealNext}
      onComplete={handleRevealComplete}
      jobs={jobs}
      jobsLoading={jobsLoading}
      jobsError={jobsError}
      resumeData={resumeData}
      resumeUploading={resumeUploading}
      resumeError={resumeError}
      resumeFileName={resumeFileName}
      onResumeUpload={handleResumeUpload}
    />
  );

  if (screen === "dashboard") return (
    <Dashboard
      result={result}
      wfId={localStorage.getItem("careermatch_wf_id") || wfId}
      onRetake={handleRetake}
      jobs={jobs}
      jobsLoading={jobsLoading}
      jobsError={jobsError}
      jobsVisible={jobsVisible}
      onLoadJobs={handleLoadJobs}
      resumeData={resumeData}
      careerPaths={careerPaths}
      resumeMismatches={resumeMismatches}
      resumeUploading={resumeUploading}
      resumeError={resumeError}
      resumeFileName={resumeFileName}
      onResumeUpload={handleResumeUpload}
    />
  );

  // ── Quiz ───────────────────────────────────────────────────────────────────
  const partColor = partColors[q.partNum];
  return (
    <div className="cm-container">
      <style>{globalStyles}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
      <div className="cm-card">
        <ProgressBar current={currentQ} total={questions.length} />
        <div style={{
          opacity: animating ? 0 : 1, transform: animating ? "translateX(-12px)" : "translateX(0)",
          transition: "all 0.3s ease", flex: 1
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: 16 }}>{partIcons[q.partNum]}</span>
            <span style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: partColor }}>{q.part}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#9B9B9B" }}>{currentQ + 1} / {questions.length}</span>
          </div>

          <h2 className="cm-question-text">{q.text}</h2>

          {q.type === "choice" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {q.options.map((opt, i) => {
                const isSelected = selectedOption === opt;
                return (
                  <button
                    key={i}
                    className="cm-answer-btn"
                    onClick={() => handleAnswer(opt)}
                    style={{
                      background: isSelected ? `${partColor}18` : "#F7F7F5",
                      border: `1px solid ${isSelected ? partColor : "rgba(0,0,0,0.09)"}`,
                      color: isSelected ? "#0A0A0A" : "#6B6B6B",
                    }}
                  >{opt}</button>
                );
              })}
            </div>
          ) : (
            <div>
              <textarea
                className="cm-textarea"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Type your answer here..."
                onFocus={e => e.target.style.borderColor = partColor}
                onBlur={e => e.target.style.borderColor = "rgba(0,0,0,0.10)"}
              />
              <button
                className="cm-next-btn"
                onClick={handleTextNext}
                disabled={!textInput.trim()}
                style={{
                  background: textInput.trim() ? partColor : "#F7F7F5",
                  color: textInput.trim() ? "#fff" : "#9B9B9B",
                  cursor: textInput.trim() ? "pointer" : "default",
                }}
              >{isLastQ ? "Get My Results →" : "Next →"}</button>
            </div>
          )}
        </div>

        {currentQ > 0 && (
          <button
            className="cm-back-btn"
            onClick={() => { setCurrentQ(c => c - 1); setSelectedOption(null); setTextInput(""); }}
          >← Back</button>
        )}
      </div>
    </div>
  );
}
