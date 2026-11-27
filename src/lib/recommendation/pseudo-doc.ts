import { MenteeGoalInput, MentorCandidate } from "./types";
import { normalizeSkills } from "./taxonomy";

/**
 * Generates a structured pseudo-document representing a mentee's specific mentorship request or goal.
 * Resolves profile asymmetry by phrasing student needs in alignment with mentor capabilities.
 */
export function generateMenteePseudoDocument(goal: MenteeGoalInput): string {
  const department = goal.department || "General Engineering";
  const gradYear = goal.graduationYear ? `Class of ${goal.graduationYear}` : "Current Student";
  const currentSkills = normalizeSkills(goal.currentSkills).join(", ") || "Foundational Computer Science";
  const targetRole = goal.targetRole || "Software Engineering Intern / Professional";
  const targetIndustry = goal.targetIndustry || "Technology";
  const careerGoal = goal.careerGoal || "Advance technical career and secure engineering role";
  const knowledgeGaps = normalizeSkills(goal.knowledgeGaps).join(", ") || "System Design, Microservices, Scalability";
  const skillsToLearn = normalizeSkills(goal.skillsToLearn).join(", ") || knowledgeGaps;
  const problemDesc = goal.problemDescription || "Guidance on technical interviews, system architecture, and career progression";
  const style = goal.preferredMentoringStyle ? `Preferred Style: ${goal.preferredMentoringStyle}` : "";
  const mode = goal.meetingPreference ? `Meeting Mode: ${goal.meetingPreference}` : "";

  return `[MENTEE GOAL REQUEST]
Department: ${department}
Academic Stage: ${gradYear}
Target Role: ${targetRole}
Target Industry: ${targetIndustry}
Career Goal: ${careerGoal}
Current Skills: ${currentSkills}
Knowledge Gaps & Skills to Learn: ${skillsToLearn}
Mentorship Requirements: ${problemDesc}
${style}
${mode}`.trim();
}

/**
 * Generates a structured pseudo-document representing an alumni mentor's capabilities and mentoring offering.
 */
export function generateMentorPseudoDocument(mentor: MentorCandidate): string {
  const role = mentor.jobTitle || "Senior Software Engineer";
  const company = mentor.company || "Leading Technology Company";
  const industry = mentor.industry || "Technology";
  const yoe = mentor.yearsOfExperience ? `${mentor.yearsOfExperience} years` : "Experienced Professional";
  const coreSkills = normalizeSkills(mentor.skills).join(", ") || "Software Engineering, Architecture";
  
  // Distinguish skills known vs skills mentor can explicitly teach
  const canTeach = normalizeSkills(
    mentor.skillsCanTeach && mentor.skillsCanTeach.length > 0
      ? mentor.skillsCanTeach
      : mentor.skills
  ).join(", ");

  const topics = (mentor.topicsCanMentor && mentor.topicsCanMentor.length > 0
    ? mentor.topicsCanMentor
    : mentor.expertiseTags || []
  ).join(", ") || "Technical Interviews, Career Growth, System Design";

  const mentoringExp = mentor.mentoringExperience || `${mentor.activeMentees || 0} active mentees guided`;
  const style = mentor.preferredMentoringStyle ? `Mentoring Style: ${mentor.preferredMentoringStyle}` : "";
  const mode = mentor.meetingPreference ? `Meeting Mode: ${mentor.meetingPreference}` : "";

  return `[MENTOR CAPABILITY PROFILE]
Current Role: ${role}
Company: ${company}
Industry: ${industry}
Professional Experience: ${yoe} in ${industry}
Core Expertise & Skills: ${coreSkills}
Can Teach: ${canTeach}
Topics Willing to Mentor: ${topics}
Mentoring Experience: ${mentoringExp}
${style}
${mode}`.trim();
}
