/** Local rulebooks supplied by the BUIC organizing team. Never use upstream rulebook links. */
export const COMPETITION_RULEBOOKS: Record<string, { url: string; duration: string; summary: string }> = {
  "contest-1": {
    url: "/rulebooks/speed-programming.pdf",
    duration: "2 hours",
    summary: "Solo or teams of up to 2 members sharing one workstation and judging account.\n2 hours to solve 4–6 problems using C, C++, Java or Python.\nOnly official language documentation and standard library references are permitted; AI code assistants and code sharing are prohibited.",
  },
  "contest-2": {
    url: "/rulebooks/hackathon.pdf",
    duration: "2 hours",
    summary: "Teams of 3–5 enrolled university or college students.\n2-hour onsite sprint; the problem is revealed at the opening and development must begin during the event.\nSubmit a public source repository, a live or recorded demo and a pitch of up to 3 minutes.",
  },
  "pitch-your-idea": {
    url: "/rulebooks/pitch-your-idea.pdf",
    duration: "3–5 min pitch",
    summary: "Individuals or teams of up to 4 members presenting an original idea.\nSubmit a one-page executive summary and a pitch deck of no more than 10 slides before the deadline.\nScreening pitches last 3 minutes; finalists receive 5 minutes to pitch and 5 minutes for questions.",
  },
  "reel-competition": {
    url: "/rulebooks/reel-competition.pdf",
    duration: "15–60 sec reel",
    summary: "Individuals or teams of up to 3 members.\nCreate an original 15–60 second vertical reel in 9:16 format.\nSubmit an MP4 at a minimum of 1080p by the deadline and follow the publishing and hashtag instructions in the rulebook.",
  },
  "graphic-design": {
    url: "/rulebooks/graphic-design.pdf",
    duration: "2 hours",
    summary: "Individuals or teams of up to 2 members using their own devices.\n2-hour onsite contest with the theme announced at the start; pre-made designs and templates are prohibited.\nSubmit a print-ready PDF or PNG at a minimum of 300 dpi together with the editable working file.",
  },
  "contest-4": {
    url: "/rulebooks/speech.pdf",
    duration: "5 minutes",
    summary: "Individual participation with separate English and Urdu judging.\nDeclare your language at registration; prepared topics are announced at least 2 days before the event.\nMaximum 5 minutes, with a warning at 4 minutes; memorized delivery or minimal notes are allowed, but reading a full script is prohibited.",
  },
};
