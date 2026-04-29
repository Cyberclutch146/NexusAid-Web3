import { CommunityEvent } from "@/types";

// ─── Skill-to-Category Mapping ──────────────────────────
// Maps user skills to event categories and related keywords
const SKILL_CATEGORY_MAP: Record<string, string[]> = {
  // Food & cooking
  cooking: ["Food Drive", "Community Kitchen", "Meal Program", "food", "cooking", "meals", "hunger"],
  baking: ["Food Drive", "Community Kitchen", "baking", "food"],
  "food prep": ["Food Drive", "Community Kitchen", "food", "prep", "meals"],
  nutrition: ["Food Drive", "Health", "nutrition", "food", "wellness"],

  // Medical & health
  "first aid": ["Emergency Response", "Health", "medical", "first aid", "emergency", "disaster"],
  nursing: ["Health", "Emergency Response", "medical", "care", "nursing", "wellness"],
  "mental health": ["Health", "Counseling", "mental health", "support", "wellness"],
  counseling: ["Health", "Counseling", "support", "mental health"],

  // Education & mentoring
  teaching: ["Education", "Tutoring", "Workshop", "teaching", "education", "school", "learning"],
  tutoring: ["Education", "Tutoring", "tutoring", "learning", "school", "students"],
  mentoring: ["Education", "Mentoring", "youth", "mentoring", "guidance"],

  // Technical & logistics
  driving: ["Delivery", "Transport", "Logistics", "driving", "transport", "delivery", "supply"],
  logistics: ["Logistics", "Transport", "Delivery", "logistics", "supply", "distribution"],
  "project management": ["Community", "Organization", "management", "planning", "coordination"],
  technology: ["Technology", "Workshop", "tech", "digital", "computer", "IT"],
  programming: ["Technology", "Workshop", "coding", "tech", "digital", "software"],

  // Construction & manual
  construction: ["Construction", "Rebuilding", "building", "repair", "construction", "renovation"],
  carpentry: ["Construction", "Rebuilding", "woodwork", "repair", "building"],
  plumbing: ["Construction", "Repair", "plumbing", "water", "repair"],
  electrical: ["Construction", "Repair", "electrical", "wiring"],
  landscaping: ["Environment", "Clean Up", "landscaping", "garden", "outdoor"],

  // Communication
  "social media": ["Outreach", "Communication", "social media", "marketing", "promotion"],
  writing: ["Communication", "Outreach", "writing", "content", "documentation"],
  photography: ["Documentation", "Outreach", "photography", "media", "visual"],
  "public speaking": ["Community", "Outreach", "speaking", "presentation", "event"],

  // General
  organizing: ["Community", "Event", "organizing", "planning", "coordination"],
  fundraising: ["Fundraising", "Community", "fundraising", "donation", "fund"],
  cleaning: ["Clean Up", "Environment", "cleaning", "sanitation", "hygiene"],
  "animal care": ["Animal", "Shelter", "animal", "pet", "rescue"],
  childcare: ["Childcare", "Education", "children", "kids", "youth"],
  "elder care": ["Senior", "Health", "elderly", "senior", "care"],
  translation: ["Community", "Outreach", "translation", "language", "interpreter"],
  art: ["Art", "Workshop", "creative", "art", "design"],
  music: ["Art", "Workshop", "Entertainment", "music", "performance"],
};

// ─── Scoring Algorithm ──────────────────────────────────

interface ScoredEvent {
  event: CommunityEvent;
  score: number;
  matchedSkills: string[];
}

export function getRecommendedEvents(
  userSkills: string[],
  events: CommunityEvent[],
  maxResults: number = 5,
  userEquipment: string[] = []
): ScoredEvent[] {
  if ((!userSkills || userSkills.length === 0) && (!userEquipment || userEquipment.length === 0) || events.length === 0) {
    return [];
  }

  // Normalize user skills
  const normalizedSkills = userSkills.map((s) => s.toLowerCase().trim());

  const scored: ScoredEvent[] = events.map((event) => {
    let score = 0;
    const matchedSkills: string[] = [];

    const eventCategory = event.category || '';
    const eventTitle = event.title || '';
    const eventDescription = event.description || '';
    const eventText = `${eventTitle} ${eventDescription} ${eventCategory}`.toLowerCase();

    for (const skill of normalizedSkills) {
      let skillScore = 0;

      // Direct category mapping check
      const mappings = SKILL_CATEGORY_MAP[skill];
      if (mappings) {
        for (const keyword of mappings) {
          const kw = keyword.toLowerCase();
          // Category exact match (highest weight)
          if (eventCategory.toLowerCase() === kw) {
            skillScore += 15;
          }
          // Category partial match
          else if (eventCategory.toLowerCase().includes(kw)) {
            skillScore += 10;
          }
          // Title match (high weight)
          else if (eventTitle.toLowerCase().includes(kw)) {
            skillScore += 6;
          }
          // Description match (moderate weight)
          else if (eventDescription.toLowerCase().includes(kw)) {
            skillScore += 3;
          }
        }
      }

      // Direct skill word match in event text (fallback for unmapped skills)
      if (skillScore === 0) {
        const skillWords = skill.split(/\s+/);
        for (const word of skillWords) {
          if (word.length > 2 && eventText.includes(word)) {
            skillScore += 4;
          }
        }
      }

      if (skillScore > 0) {
        score += skillScore;
        matchedSkills.push(skill);
      }
    }

    // Urgency boost
    if (event.urgency === "high" && score > 0) {
      score += 5;
    }

    // Active status boost
    if (event.status === "active") {
      score += 2;
    }

    // Volunteer availability boost
    if (event.needs?.volunteers) {
      const { current, goal } = event.needs.volunteers;
      if (current < goal) {
        score += 3; // Still needs volunteers
        // Extra boost if they're really short-handed
        const fillRate = goal > 0 ? current / goal : 1;
        if (fillRate < 0.5) score += 2;
      }
    }

    // Equipment match boost
    if (userEquipment && userEquipment.length > 0) {
      const normalizedEquipment = userEquipment.map(e => e.toLowerCase().trim());
      for (const item of normalizedEquipment) {
        // Check event text for equipment keyword mentions
        if (eventText.includes(item)) {
          score += 6;
          matchedSkills.push(`🔧 ${item}`);
        }
        // Partial word match (e.g. "truck" matches "trucks needed")
        const itemWords = item.split(/\s+/);
        for (const word of itemWords) {
          if (word.length > 2 && eventText.includes(word) && !matchedSkills.includes(`🔧 ${item}`)) {
            score += 3;
            matchedSkills.push(`🔧 ${item}`);
          }
        }
      }
    }

    return { event, score, matchedSkills };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// ─── Match Percentage ───────────────────────────────────
// Convert raw score to a user-friendly percentage (capped at 99)
export function getMatchPercentage(score: number): number {
  // Logarithmic scaling: diminishing returns for very high scores
  const percentage = Math.min(99, Math.round(40 + 20 * Math.log2(Math.max(1, score))));
  return percentage;
}
