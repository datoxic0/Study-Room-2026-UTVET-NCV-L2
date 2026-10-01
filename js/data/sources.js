export const VERIFIED_ON = "2026-09-30";

export const SEARCH_ENGINES = [
  { id: "ddg", label: "DuckDuckGo", build: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  { id: "bing", label: "Bing", build: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  { id: "google", label: "Google", build: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
];

export const globalSources = [
  {
    id: "dbe-nsc",
    label: "Department of Basic Education — NSC past papers",
    url: "https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/NSCPastExaminationpapers.aspx",
    klass: "official",
    status: "verified",
    note: "Matric NSC papers + memos, year index 2008–2026. Different curriculum from NC(V) — use for extra practice only.",
  },
  {
    id: "thutong-mechatronics",
    label: "Thutong (DBE) — NC(V) Mechatronics learning space",
    url: "http://www.thutong.doe.gov.za/Default.aspx?alias=www.thutong.doe.gov.za%2Fmechatronics",
    klass: "official",
    status: "verified",
    note: "Official subject & assessment guidelines for every Level 2 Mechatronics subject (the syllabus behind your papers).",
  },
  {
    id: "dhet-nols",
    label: "DHET — NOLS examination repository",
    url: "https://www.dhet.gov.za/SitePages/NOLS.aspx",
    klass: "official",
    status: "verified",
    note: "Department of Higher Education & Training's official TVET exam paper channel.",
  },
  {
    id: "dhet-nols-sharepoint",
    label: "DHET NOLS (SharePoint)",
    url: "https://sharepoint.dhet.gov.za/dhetnols/",
    klass: "official",
    status: "verified",
    note: "Alternate official NOLS entry point.",
  },
  {
    id: "edupstairs-nols",
    label: "Edupstairs — NC(V) & NATED index over DHET/NOLS",
    url: "https://www.edupstairs.org/tvet-colleges/past-exam-papers/",
    klass: "community",
    status: "verified",
    note: "Filterable index: 192 exam sittings, NC(V) L2–L4 + NATED N1–N6, question paper / memorandum flags.",
  },
  {
    id: "tvetpapers",
    label: "TVET Papers — NATED + NCV downloads",
    url: "https://tvetpapers.co.za/",
    klass: "community",
    status: "verified",
    note: "Third-party portal: 128+ NCV and 168+ NATED subjects with memoranda.",
  },
  {
    id: "utvet",
    label: "Umgungundlovu TVET College (UTVET)",
    url: "https://www.utvet.co.za/",
    klass: "official",
    status: "unreachable",
    note: "Official college site. Unreachable from the build network on 2026-09-30 (TLS + transport errors). Try it from your own device.",
  },
  {
    id: "nols-root",
    label: "nols.gov.za repository root",
    url: "https://nols.gov.za/",
    klass: "official",
    status: "unreachable",
    note: "Transport error on 2 attempts from the build network (2026-09-30). Individual paper links below point into this host and may still open for you.",
  },
];

export const paperSubjects = [
  {
    id: "life-skills",
    subject: "Life Skills and Computer Literacy",
    stream: "NC(V) Business",
    papers: "L2 · Paper 1 & Paper 2",
    links: [
      {
        label: "QP + memos, L2 P1 & P2 (2021–2026 sittings)",
        url: "https://mytvet.co.za/life-skills-and-computer-literacy",
        source: "Mytvet",
        klass: "community",
        status: "verified",
      },
    ],
    searchQuery: "\"Life Skills and Computer Literacy\" NCV L2 past paper memorandum",
  },
  {
    id: "mathematics",
    subject: "Mathematics",
    stream: "NC(V) Engineering",
    papers: "L2 · Paper 1 & Paper 2",
    links: [
      {
        label: "NC(V) L2 Mathematics papers + memos",
        url: "https://mytvet.co.za/mathematics-l2",
        source: "Mytvet",
        klass: "community",
        status: "verified",
      },
      {
        label: "NATED Mathematics N1–N6 (different stream — extra practice)",
        url: "https://mytvet.co.za/mathematics",
        source: "Mytvet",
        klass: "community",
        status: "verified",
      },
      {
        label: "NSC Grade 12 Mathematics (CAPS — extra practice)",
        url: "https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/NSCPastExaminationpapers.aspx",
        source: "Department of Basic Education",
        klass: "official",
        status: "verified",
      },
    ],
    searchQuery: "NCV Level 2 Mathematics past paper memorandum download",
  },
  {
    id: "english-fal",
    subject: "English First Additional Language",
    stream: "NC(V) Business",
    papers: "L2 · Paper 1 & Paper 2",
    links: [
      {
        label: "QP + memos, L2 P1 & P2 (2015–2026 sittings)",
        url: "https://mytvet.co.za/english-first-additional-language",
        source: "Mytvet",
        klass: "community",
        status: "verified",
      },
      {
        label: "NSC English FAL papers + memos (extra practice)",
        url: "https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/NSCPastExaminationpapers.aspx",
        source: "Department of Basic Education",
        klass: "official",
        status: "verified",
      },
    ],
    searchQuery: "NCV Level 2 English First Additional Language past paper memorandum",
  },
  {
    id: "electrotechnology",
    subject: "Electrotechnology",
    stream: "NC(V) Engineering",
    papers: "L2 · Paper 1",
    links: [
      {
        label: "QP + memos, L2 (2015–2026 sittings)",
        url: "https://mytvet.co.za/electrotechnology",
        source: "Mytvet",
        klass: "community",
        status: "verified",
      },
      {
        label: "Subject & assessment guidelines (official syllabus)",
        url: "http://www.thutong.doe.gov.za/Default.aspx?alias=www.thutong.doe.gov.za%2Fmechatronics",
        source: "Thutong / DBE",
        klass: "official",
        status: "verified",
      },
    ],
    searchQuery: "NCV Level 2 Electrotechnology past paper memorandum",
  },
  {
    id: "introduction-computers",
    subject: "Introduction to Computer",
    stream: "NC(V) Engineering",
    papers: "L2 · Paper 1",
    links: [
      {
        label: "QP + memos, L2 (2015–2026 sittings)",
        url: "https://mytvet.co.za/introduction-to-computers",
        source: "Mytvet",
        klass: "community",
        status: "verified",
      },
      {
        label: "Subject & assessment guidelines (official syllabus)",
        url: "http://www.thutong.doe.gov.za/Default.aspx?alias=www.thutong.doe.gov.za%2Fmechatronics",
        source: "Thutong / DBE",
        klass: "official",
        status: "verified",
      },
    ],
    searchQuery: "NCV Level 2 \"Introduction to Computers\" past paper memorandum",
  },
  {
    id: "manual-manufacturing",
    subject: "Manual Manufacturing",
    stream: "NC(V) Engineering",
    papers: "L2 · Paper 1",
    links: [
      {
        label: "QP + memos, L2 (2015–2026 sittings)",
        url: "https://mytvet.co.za/manual-manufacturing",
        source: "Mytvet",
        klass: "community",
        status: "verified",
      },
      {
        label: "Subject & assessment guidelines (official syllabus)",
        url: "http://www.thutong.doe.gov.za/Default.aspx?alias=www.thutong.doe.gov.za%2Fmechatronics",
        source: "Thutong / DBE",
        klass: "official",
        status: "verified",
      },
    ],
    searchQuery: "NCV Level 2 \"Manual Manufacturing\" past paper memorandum",
  },
  {
    id: "mechatronic-systems",
    subject: "Mechatronic Systems",
    stream: "NC(V) Engineering",
    papers: "L2 · Paper 1",
    links: [
      {
        label: "QP + memos, L2 (2015–2025 sittings)",
        url: "https://mytvet.co.za/mechatronic-systems",
        source: "Mytvet",
        klass: "community",
        status: "verified",
      },
      {
        label: "Subject & assessment guidelines (official syllabus)",
        url: "http://www.thutong.doe.gov.za/Default.aspx?alias=www.thutong.doe.gov.za%2Fmechatronics",
        source: "Thutong / DBE",
        klass: "official",
        status: "verified",
      },
    ],
    searchQuery: "NCV Level 2 \"Mechatronic Systems\" past paper memorandum",
  },
];

export function subjectByName(name) {
  return paperSubjects.find((entry) => entry.subject === name) ?? null;
}

export function upcomingSubjects(examList) {
  const seen = new Set();
  const unique = [];
  for (const exam of examList) {
    if (seen.has(exam.subject)) continue;
    seen.add(exam.subject);
    const record = subjectByName(exam.subject);
    if (record) unique.push(record);
  }
  return unique;
}
