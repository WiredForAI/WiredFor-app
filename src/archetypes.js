// WiredFor.ai — Official 16 Archetype Framework
// Archetypes are assigned mathematically from OCEAN scores. Never AI-generated.

export const ARCHETYPES = [
  {
    id: "the-architect",
    name: "The Architect",
    category: "Builder",
    tagline: "Designs complex systems that outlast the moment",
    description:
      "You think in structures and build for longevity. You do your sharpest work with full ownership, minimal interruption, and a hard problem worth solving. Depth over breadth — always.",
    shadowSide:
      "Can disappear into the work and forget to bring others along",
    techFit: ["Staff Engineer", "Platform Engineer", "Solutions Architect"],
    // Representative OCEAN center for RMS fallback
    oceanProfile: { openness: 82, conscientiousness: 82, extraversion: 30, agreeableness: 55, neuroticism: 50 },
  },
  {
    id: "the-artisan",
    name: "The Artisan",
    category: "Builder",
    tagline: "Masters the craft. Delivers without drama.",
    description:
      "You execute with precision and consistency. Clear specs, defined outcomes, and room to perfect your work is where you thrive. You measure twice and cut once — every time.",
    shadowSide:
      "Struggles when the path is undefined or changes without warning",
    techFit: ["QA Engineer", "DevOps Engineer", "Security Analyst"],
    oceanProfile: { openness: 35, conscientiousness: 82, extraversion: 50, agreeableness: 35, neuroticism: 50 },
  },
  {
    id: "the-trailblazer",
    name: "The Trailblazer",
    category: "Builder",
    tagline: "Makes the path by walking it",
    description:
      "You grind through obstacles without drama. Emotionally stable, fiercely independent, and relentlessly results-driven. You don't need recognition — you need outcomes.",
    shadowSide:
      "Can come across as cold or dismissive of team dynamics",
    techFit: ["Backend Engineer", "Site Reliability Engineer", "Infrastructure Lead"],
    oceanProfile: { openness: 55, conscientiousness: 82, extraversion: 55, agreeableness: 35, neuroticism: 28 },
  },
  {
    id: "the-divergent",
    name: "The Divergent",
    category: "Builder",
    tagline: "Connects dots nobody else sees",
    description:
      "You think in directions others haven't considered. High energy, creative, and genuinely excited by new ideas — you build things nobody asked for but everyone needed. Gets bored with routine fast.",
    shadowSide:
      "Starts more than finishes — needs strong execution partners",
    techFit: ["Full Stack Developer", "Developer Advocate", "Product Engineer"],
    oceanProfile: { openness: 82, conscientiousness: 35, extraversion: 78, agreeableness: 55, neuroticism: 50 },
  },
  {
    id: "the-visionary",
    name: "The Visionary",
    category: "Leader",
    tagline: "Sees the future before anyone else",
    description:
      "You see the big picture before anyone else and rally people around it. You make complex ideas feel simple and exciting. Momentum follows you naturally.",
    shadowSide:
      "Loses interest once the vision is set and execution begins",
    techFit: ["Product Manager", "Head of Product", "Chief of Staff"],
    oceanProfile: { openness: 82, conscientiousness: 55, extraversion: 82, agreeableness: 55, neuroticism: 30 },
  },
  {
    id: "the-executor",
    name: "The Executor",
    category: "Leader",
    tagline: "Sets the goal. Hits the goal. Every time.",
    description:
      "You combine ambition with discipline. You set aggressive goals and execute toward them systematically. Comfortable making unpopular decisions and holding people accountable without flinching.",
    shadowSide:
      "Prioritizes results over relationships — can burn people out",
    techFit: ["Engineering Manager", "VP Engineering", "Technical Program Manager"],
    oceanProfile: { openness: 55, conscientiousness: 82, extraversion: 82, agreeableness: 55, neuroticism: 30 },
  },
  {
    id: "the-conductor",
    name: "The Conductor",
    category: "Leader",
    tagline: "Brings order to chaos",
    description:
      "You build processes, create accountability, and keep teams aligned without drama. Nothing falls through the cracks when you're involved. You're the reason things actually ship.",
    shadowSide:
      "Can resist innovation in favor of what's proven and predictable",
    techFit: ["Engineering Manager", "Scrum Master", "Technical Operations Lead"],
    oceanProfile: { openness: 35, conscientiousness: 82, extraversion: 78, agreeableness: 55, neuroticism: 50 },
  },
  {
    id: "the-catalyst",
    name: "The Catalyst",
    category: "Leader",
    tagline: "Energizes everything and everyone around them",
    description:
      "You walk into a room and things start moving. You build relationships effortlessly, resolve conflict naturally, and make people feel genuinely seen. You operate on intuition and momentum.",
    shadowSide:
      "Struggles with follow-through and detailed execution",
    techFit: ["Customer Success Manager", "Developer Relations", "Community Lead"],
    oceanProfile: { openness: 55, conscientiousness: 35, extraversion: 82, agreeableness: 82, neuroticism: 50 },
  },
  {
    id: "the-interpreter",
    name: "The Interpreter",
    category: "Connector",
    tagline: "Reads what others miss",
    description:
      "You read people and systems with equal precision. You synthesize qualitative signals into sharp insights that actually change how teams build. Your best thinking happens in quiet, focused environments.",
    shadowSide:
      "Can overindex on edge cases and delay decisions in search of more input",
    techFit: ["UX Researcher", "Product Strategist", "Design Researcher"],
    oceanProfile: { openness: 82, conscientiousness: 50, extraversion: 35, agreeableness: 82, neuroticism: 50 },
  },
  {
    id: "the-diplomat",
    name: "The Diplomat",
    category: "Connector",
    tagline: "Finds the path everyone can walk",
    description:
      "You navigate complexity with grace. You see multiple perspectives simultaneously and find solutions everyone can live with. Calm in conflict — trusted by all sides.",
    shadowSide:
      "Can avoid necessary confrontation for too long",
    techFit: ["Technical Program Manager", "Solutions Engineer", "Product Manager"],
    oceanProfile: { openness: 55, conscientiousness: 82, extraversion: 55, agreeableness: 82, neuroticism: 30 },
  },
  {
    id: "the-anchor",
    name: "The Anchor",
    category: "Connector",
    tagline: "The person everyone counts on",
    description:
      "You are the steady force that holds everything together. Consistent, trustworthy, and deeply committed to the team's success. You create psychological safety without ever asking for credit.",
    shadowSide:
      "Absorbs too much from others — burns out quietly",
    techFit: ["Engineering Lead", "Technical Support Lead", "Scrum Master"],
    oceanProfile: { openness: 55, conscientiousness: 78, extraversion: 30, agreeableness: 82, neuroticism: 50 },
  },
  {
    id: "the-curator",
    name: "The Curator",
    category: "Connector",
    tagline: "Shapes how people experience and understand things",
    description:
      "You see value and connections others miss and bring them to life for everyone around you. You turn complex ideas into compelling experiences. You don't just tell the story — you shape how it's understood.",
    shadowSide:
      "Can over-communicate vision and under-deliver on specifics",
    techFit: ["Product Manager", "Technical Writer", "Developer Advocate"],
    oceanProfile: { openness: 82, conscientiousness: 50, extraversion: 82, agreeableness: 82, neuroticism: 50 },
  },
  {
    id: "the-analyst",
    name: "The Analyst",
    category: "Specialist",
    tagline: "Evidence first. Always.",
    description:
      "You make decisions based on data not gut feel and hold others to the same standard. Clear, direct, and completely unsentimental. If it can't be measured it doesn't count.",
    shadowSide:
      "Dismisses qualitative signals — misses things data can't measure",
    techFit: ["Data Engineer", "Business Intelligence Analyst", "ML Engineer"],
    oceanProfile: { openness: 35, conscientiousness: 82, extraversion: 50, agreeableness: 35, neuroticism: 45 },
  },
  {
    id: "the-maven",
    name: "The Maven",
    category: "Specialist",
    tagline: "Knows more about their domain than almost anyone",
    description:
      "You go deeper than everyone else and stay there. You've chosen mastery over breadth and you're better for it. Your expertise is your identity — and it's earned, not claimed.",
    shadowSide:
      "Can be territorial about their domain and resistant to outside perspectives",
    techFit: ["Security Engineer", "ML Researcher", "Database Architect"],
    oceanProfile: { openness: 82, conscientiousness: 82, extraversion: 30, agreeableness: 35, neuroticism: 50 },
  },
  {
    id: "the-vanguard",
    name: "The Vanguard",
    category: "Specialist",
    tagline: "Ahead of the thinking. Ahead of the field.",
    description:
      "You challenge assumptions, question consensus, and bring uncomfortable truths to the table before anyone else is ready to hear them. Intellectually fearless and emotionally stable enough to stand alone in that position.",
    shadowSide:
      "Can alienate collaborators in cultures that punish dissent",
    techFit: ["Security Researcher", "Principal Engineer", "Technical Advisor"],
    oceanProfile: { openness: 82, conscientiousness: 55, extraversion: 55, agreeableness: 30, neuroticism: 30 },
  },
  {
    id: "the-synthesizer",
    name: "The Synthesizer",
    category: "Specialist",
    tagline: "Brings it all together into something greater",
    description:
      "You generate novel ideas AND follow through on them AND bring others along for the ride. The rarest combination — vision, discipline, and warmth in one person. You make the complex feel inevitable.",
    shadowSide:
      "Gets too attached to their own ideas — struggles to let go",
    techFit: ["Principal Engineer", "Technical Architect", "Staff Product Designer"],
    oceanProfile: { openness: 82, conscientiousness: 82, extraversion: 55, agreeableness: 82, neuroticism: 50 },
  },
];

/**
 * Assign one of the 16 fixed archetypes based on OCEAN scores.
 * Rules are checked in priority order; falls back to RMS distance.
 *
 * @param {{ openness: number, conscientiousness: number, extraversion: number, agreeableness: number, neuroticism: number }} ocean
 * @returns {object} The matched archetype object from ARCHETYPES
 */
export function assignArchetype(ocean) {
  const { openness: O, conscientiousness: C, extraversion: E, agreeableness: A, neuroticism: N } = ocean;

  // Priority rules — checked in exact order
  if (O >= 75 && C >= 75 && E < 40 && A < 45) return findArchetype("the-maven");
  if (O >= 75 && C >= 75 && A >= 75)           return findArchetype("the-synthesizer");
  if (O >= 75 && C >= 75 && E < 40)            return findArchetype("the-architect");
  if (O >= 75 && E >= 75 && A >= 75)           return findArchetype("the-curator");
  if (O >= 75 && E >= 75 && N < 40)            return findArchetype("the-visionary");
  if (O >= 75 && A >= 75 && E < 45)            return findArchetype("the-interpreter");
  if (O >= 75 && A < 40  && N < 40)            return findArchetype("the-vanguard");
  if (O >= 75 && C < 45  && E >= 70)           return findArchetype("the-divergent");
  if (C >= 75 && E >= 75 && N < 40)            return findArchetype("the-executor");
  if (C >= 75 && E >= 70 && O < 45)            return findArchetype("the-conductor");
  if (C >= 75 && N < 35  && A < 45)            return findArchetype("the-trailblazer");
  if (C >= 75 && O < 45  && A < 45)            return findArchetype("the-artisan");
  if (C >= 75 && A >= 75 && N < 40)            return findArchetype("the-diplomat");
  if (A >= 75 && C >= 70 && E < 40)            return findArchetype("the-anchor");
  if (E >= 75 && A >= 75 && C < 45)            return findArchetype("the-catalyst");

  // Fallback — RMS distance to nearest archetype center profile
  return nearestByRMS(ocean);
}

function findArchetype(id) {
  return ARCHETYPES.find(a => a.id === id);
}

function nearestByRMS(ocean) {
  const traits = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"];
  let best = null;
  let bestDist = Infinity;

  for (const archetype of ARCHETYPES) {
    const sumSq = traits.reduce((acc, t) => {
      const diff = (ocean[t] || 0) - (archetype.oceanProfile[t] || 0);
      return acc + diff * diff;
    }, 0);
    const dist = Math.sqrt(sumSq / traits.length);
    if (dist < bestDist) {
      bestDist = dist;
      best = archetype;
    }
  }

  return best;
}
