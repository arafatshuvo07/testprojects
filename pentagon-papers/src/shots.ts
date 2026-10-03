// Shot list. Every `t` is the narration time (seconds) where the cut lands,
// taken from word-level timestamps of the voiceover (cuts sit ~0.1s ahead of
// the word they illustrate, as an editor would cut). Image slots are real
// archival material, see scripts/slots.json for sources.

export type Motion = "in" | "out" | "left" | "right" | "up" | "down" | "still";

export type Overlay =
  | { kind: "counter" }
  | { kind: "year"; text: string; at: number }
  | { kind: "timeline" }
  | { kind: "date"; text: string; place?: string; at: number }
  | { kind: "papers" }
  | { kind: "ruling" }
  | { kind: "quote"; text: string; source: string }
  | { kind: "stamp"; text: string; at: number }
  | { kind: "label"; title: string; sub?: string; at: number }
  | { kind: "pages" }
  | { kind: "plumbers" }
  | { kind: "end" };

export type Shot = {
  t: number;
  img?: string;
  motion: Motion;
  focus?: [number, number]; // object-position in %, where the camera settles
  dim?: number; // extra darkening 0..1 for text-heavy shots
  overlays?: Overlay[];
};

export const AUDIO_END = 165.3;
export const TAIL = 5.0; // seconds of end card after the last word
export const TOTAL = AUDIO_END + TAIL;

export const SHOTS: Shot[] = [
  // "Seven thousand pages, forty-seven volumes, top secret."
  { t: 0, img: "doc_text", motion: "in", focus: [50, 40], dim: 0.6, overlays: [{ kind: "counter" }] },
  // "And one man decided to copy them."
  { t: 4.4, img: "copier", motion: "in", focus: [50, 50] },
  // "Daniel Ellsberg wasn't a spy..."
  { t: 6.55, img: "ellsberg_a", motion: "in", focus: [50, 30],
    overlays: [{ kind: "label", title: "Daniel Ellsberg", sub: "Former military analyst", at: 6.9 }] },
  // "...breaking into the Pentagon."
  { t: 8.4, img: "pentagon_aerial", motion: "out", focus: [50, 50] },
  // "He was a former Defense Department analyst..."
  { t: 9.85, img: "pentagon_bldg", motion: "left", focus: [50, 50],
    overlays: [{ kind: "label", title: "U.S. Department of Defense", sub: "Ellsberg's post: 1964 – 1965", at: 10.5 }] },
  // "...who had helped work on the classified study itself."
  { t: 12.8, img: "doc_cover", motion: "in", focus: [50, 30] },
  // "In 1967, Defense Secretary..."
  { t: 14.95, img: "pentagon_aerial", motion: "in", focus: [50, 45], dim: 0.62,
    overlays: [{ kind: "year", text: "1967", at: 15.3 }] },
  // "...Robert McNamara had ordered a massive internal history"
  { t: 17.6, img: "mcnamara", motion: "in", focus: [50, 35],
    overlays: [{ kind: "label", title: "Robert S. McNamara", sub: "Secretary of Defense, 1961 – 1968", at: 17.9 }] },
  // "...of America's involvement in Vietnam."
  { t: 20.6, img: "heli_1967", motion: "right", focus: [50, 50] },
  // "The finished report examined decisions stretching from 1945 to 1967"
  { t: 22.65, motion: "still", overlays: [{ kind: "timeline" }] },
  // "...and ran roughly seven thousand pages."
  { t: 27.7, img: "doc_page5", motion: "out", focus: [50, 30], dim: 0.35, overlays: [{ kind: "pages" }] },
  // "Ellsberg had access to it, and the deeper he read..."
  { t: 30.25, img: "ellsberg_b", motion: "in", focus: [50, 30], dim: 0.15 },
  // "Inside were years of private assessments, policy debates..."
  { t: 35.3, img: "doc_header", motion: "up", focus: [50, 40] },
  // "...records that revealed a far more complicated picture of the war"
  { t: 40.1, img: "patrol_1967", motion: "left", focus: [50, 50] },
  // "...than much of what Americans had heard publicly."
  { t: 43.6, img: "lbj_speech", motion: "in", focus: [50, 40] },
  // "Eventually Ellsberg made a decision that could put him in prison."
  { t: 45.8, img: "ellsberg_c", motion: "in", focus: [55, 30], dim: 0.3 },
  // "He started copying the documents."
  { t: 49.3, img: "copier_1965", motion: "right", focus: [50, 50] },
  // "With help from his former RAND colleague..."
  { t: 51.4, img: "santa_monica", motion: "left", focus: [50, 50],
    overlays: [{ kind: "label", title: "Santa Monica, California", sub: "Home of the RAND Corporation", at: 51.9 }] },
  // "...Anthony Russo"
  { t: 53.35, img: "doc_page8", motion: "in", focus: [50, 35], dim: 0.35,
    overlays: [{ kind: "label", title: "Anthony J. Russo", sub: "Former RAND colleague", at: 53.5 }] },
  // "thousands of classified pages were secretly duplicated."
  { t: 54.6, img: "doc_page6", motion: "down", focus: [50, 60], dim: 0.15 },
  // "Night after night, volume after volume..."
  { t: 57.95, img: "doc_page13", motion: "in", focus: [50, 50], dim: 0.45, overlays: [{ kind: "pages" }] },
  // "...moved through photocopy machines."
  { t: 60.25, img: "copier", motion: "out", focus: [50, 50], dim: 0.1 },
  // "This wasn't a single leaked memo."
  { t: 62.8, img: "topsecret", motion: "still", focus: [50, 50] },
  // "It was an entire hidden history of a war."
  { t: 65.0, img: "marines_1968", motion: "out", focus: [50, 50] },
  // "Ellsberg initially approached people in Congress..."
  { t: 67.6, img: "capitol_old", motion: "in", focus: [50, 45] },
  // "...hoping the material could become public through government channels."
  { t: 70.55, img: "capitol", motion: "in", focus: [50, 40],
    overlays: [{ kind: "label", title: "Senate Foreign Relations Committee", sub: "Ellsberg took copies to Sen. J. William Fulbright, 1969", at: 70.9 }] },
  // "But eventually copies reached The New York Times."
  { t: 73.75, img: "nyt", motion: "in", focus: [50, 10],
    overlays: [{ kind: "label", title: "The New York Times", sub: "229 West 43rd Street, New York", at: 76.7 }] },
  // "For months reporters quietly studied the documents."
  { t: 78.95, img: "typewriter", motion: "in", focus: [50, 50], dim: 0.15,
    overlays: [{ kind: "label", title: "Reporter Neil Sheehan", sub: "Obtained the papers in March 1971", at: 79.4 }] },
  // "Then, on June 13, 1971, the first story appeared."
  { t: 82.75, img: "press", motion: "in", focus: [50, 50], dim: 0.5,
    overlays: [{ kind: "date", text: "Sunday, June 13, 1971", place: "New York", at: 83.5 }] },
  // "Washington reacted almost immediately."
  { t: 87.55, img: "white_house_old", motion: "in", focus: [50, 50] },
  // "The Nixon administration went to court..."
  { t: 90.2, img: "nixon", motion: "in", focus: [50, 35],
    overlays: [{ kind: "label", title: "Richard M. Nixon", sub: "37th President of the United States", at: 90.5 }] },
  // "...arguing that continued release of classified material threatened national security."
  { t: 93.95, img: "nixon_tv", motion: "left", focus: [50, 40] },
  // "For a moment, publication by the Times was halted..."
  { t: 98.8, img: "nyt", motion: "out", focus: [50, 10], dim: 0.55,
    overlays: [{ kind: "stamp", text: "Restrained", at: 101.4 }] },
  // "...but the documents were already spreading."
  { t: 102.25, img: "press2", motion: "right", focus: [50, 50] },
  // "The Washington Post..."
  { t: 105.05, img: "wapo", motion: "in", focus: [50, 45],
    overlays: [{ kind: "label", title: "The Washington Post", sub: "Publisher Katharine Graham", at: 105.4 }] },
  // "...and other newspapers obtained copies and began publishing as well."
  { t: 107.3, img: "press3", motion: "in", focus: [50, 50], dim: 0.68, overlays: [{ kind: "papers" }] },
  // "Suddenly the story was bigger than Vietnam."
  { t: 111.05, img: "protest", motion: "left", focus: [50, 50] },
  // "The United States government was trying to prevent major newspapers..."
  { t: 113.75, img: "white_house", motion: "up", focus: [50, 50] },
  // "...and the question raced toward the Supreme Court."
  { t: 119.1, img: "scotus_old", motion: "in", focus: [50, 55] },
  // "On June 30, 1971, the Court rejected the government's attempt..."
  { t: 121.9, img: "scotus", motion: "in", focus: [50, 45], dim: 0.62,
    overlays: [{ kind: "date", text: "June 30, 1971", place: "Washington, D.C.", at: 122.2 }, { kind: "ruling" }] },
  // "...finding that it had not met the heavy burden required to justify prior restraint."
  { t: 127.8, img: "scotus2", motion: "out", focus: [50, 40], dim: 0.65,
    overlays: [{ kind: "quote", text: "Any system of prior restraints of expression comes to this Court bearing a heavy presumption against its constitutional validity.", source: "New York Times Co. v. United States, 403 U.S. 713 (1971)" }] },
  // "Ellsberg still faced criminal prosecution."
  { t: 132.2, img: "ellsberg_d", motion: "in", focus: [50, 30], dim: 0.3,
    overlays: [{ kind: "label", title: "12 felony counts", sub: "Espionage · theft · conspiracy — up to 115 years", at: 132.6 }] },
  // "Then his trial revealed something extraordinary."
  { t: 135.15, img: "topsecret", motion: "in", focus: [50, 40], dim: 0.45,
    overlays: [{ kind: "label", title: "United States v. Russo & Ellsberg", sub: "U.S. District Court, Los Angeles · 1973", at: 135.6 }] },
  // "A White House investigative unit known as the Plumbers..."
  { t: 138.1, img: "white_house", motion: "out", focus: [50, 50], dim: 0.55, overlays: [{ kind: "plumbers" }] },
  // "...had broken into the office of Ellsberg's psychiatrist..."
  { t: 141.05, img: "beverly_hills", motion: "in", focus: [50, 50],
    overlays: [{ kind: "label", title: "Beverly Hills, California", sub: "Office of Dr. Lewis Fielding · broken into Sept. 3, 1971", at: 142.0 }] },
  // "In 1973 the judge dismissed all charges..."
  { t: 145.9, img: "typewriter2", motion: "in", focus: [50, 50], dim: 0.45,
    overlays: [{ kind: "date", text: "May 11, 1973", place: "Los Angeles", at: 146.2 },
               { kind: "label", title: "Judge William M. Byrne Jr.", sub: "U.S. District Court", at: 147.6 }] },
  // "...citing improper government conduct."
  { t: 150.85, img: "doc_page12", motion: "in", focus: [50, 40], dim: 0.5,
    overlays: [{ kind: "stamp", text: "Dismissed", at: 151.3 }] },
  // "What began as seven thousand classified pages..."
  { t: 153.25, img: "doc_cover", motion: "out", focus: [50, 30], dim: 0.15 },
  // "...had become something much larger: a confrontation over war,"
  { t: 156.3, img: "heli_1969", motion: "in", focus: [50, 50] },
  // "government secrecy,"
  { t: 159.9, img: "pentagon_aerial", motion: "in", focus: [50, 50] },
  // "the press,"
  { t: 161.4, img: "press", motion: "right", focus: [50, 50] },
  // "and who gets to decide what the public is allowed to know."
  { t: 162.3, img: "ellsberg_e", motion: "in", focus: [50, 30], dim: 0.1 },
  // End card
  { t: 165.6, motion: "still", overlays: [{ kind: "end" }] },
];
