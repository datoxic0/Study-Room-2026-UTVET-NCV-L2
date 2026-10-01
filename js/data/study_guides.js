// Study guides — authored from the 17 hashed NotebookLM source captures
// (research/captures/notebooklm_sources/manifest.json). Every guide lists the
// capture files it draws on with their sha256; tests/guides.test.mjs verifies
// each sha against the manifest. Exam dates and past-paper links are NOT
// duplicated here — the Guides view derives them from exams.js and sources.js.

export const GUIDE_BUILT_ON = "2026-09-30";

export const studyGuides = [
  {
    id: "mathematics",
    subject: "Mathematics",
    stream: "NC(V) Engineering",
    papers: "L2 · Paper 1 & Paper 2",
    coverage: {
      level: "strong",
      docs: 3,
      sources: 17,
      chars: 106891,
      pages: 73,
      summaries: 17,
      note: "01_Mechatronic_Studying_L2 is shared with the Electrotechnology and Mechatronic Systems guides — its November 2015 Paper 1 sits alongside engineering material.",
    },
    summary:
      "Two national papers in two days (27–28 Oct). The captures give you the full marking culture — middle work, CA marks, decimal comma — plus worked ground on surds, exponents, sequences and interest.",
    sections: [
      {
        heading: "Exam facts from the captures",
        body:
          "Your timetable puts Paper 1 on 27 October and Paper 2 on 28 October, both 13:00 and 3 hours. The captured November 2015 First Paper ran three hours and shipped with a formula sheet and detachable coordinate-grid addenda, so expect calculators-permitted, formula-sheet-supported papers where graph work is done on supplied grids. The captured Task 6 paper (V1) is a different animal: 50 marks, 2½ hours, weighting 10 toward the ICASS final grade — that is coursework, not the November sitting.",
      },
      {
        heading: "Topic map (what the captures actually cover)",
        body:
          "Across the captured assessment and marking guideline, practice tasks and papers, the recurring topic blocks are:",
        points: [
          "Number systems — rational vs irrational by decimal behaviour, terminating decimals to simplified fractions, recurring decimals to fractions",
          "Surds — simplifying via prime factors (√8 = 2√2), rationalising denominators (monomial 'Rule of 1' and conjugate pairs via (a−b)(a+b) = a²−b²)",
          "Laws of exponents — zero rule a⁰ = 1, grouping coefficients, multiplication law aᵐ × aⁿ = aᵐ⁺ⁿ",
          "Algebra — simplification, factorisation, equation manipulation",
          "Sequences & series — arithmetic sequences and series",
          "Financial maths — simple (linear) vs compound (accelerating) interest, always convert time to years, evaluate competing investment options",
          "Functions & graphing — sketching on supplied grids (Nov 2015 Paper 1 section)",
          "Task 6 block (ICASS) — analytical geometry (gradients, coordinate transformations), volume and surface area of solids, right-angled trigonometry with a formula sheet",
        ],
      },
      {
        heading: "How marks are awarded — the marking culture",
        body:
          "The captured marking guides are unusually explicit about process marks, and this is where marks are won or lost:",
        points: [
          "Show all middle work — the guidelines reward transparent steps over bare final answers",
          "Continued Accuracy (CA) marks protect your score from minor slips when the method is right",
          "Use the South African decimal comma",
          "Keep three-decimal precision where the question demands numbers",
          "Final answers alone, without working, do not satisfy the guidelines",
        ],
      },
      {
        heading: "Worked procedures worth re-doing from memory",
        body:
          "These exact worked examples sit in the captures — reproduce each on paper without looking, then check:",
        points: [
          "Recurring decimal → fraction: solve x = 121.5151… by multiplying by 100 to shift the repeat, subtracting the original equation, then dividing by the GCD (the memo divides by 3)",
          "Surd simplification: break into prime factors, extract perfect squares, combine like surds, cancel the common √6 term",
          "Rationalise 1/(√8 + …) style denominators using the conjugate and difference of squares",
          "Apply the zero-exponent rule to turn (2x)⁰ into 1 before grouping bases",
          "Compare simple vs compound interest for the same principal, rate and time — the captures warn that short-term simple interest can beat a lower-rate compounding option",
        ],
      },
      {
        heading: "Papers in hand (captured)",
        points: [
          "Mathematics L2 First Paper, November 2015 (tvetpapers origin) — 4 sections: algebraic simplification, functional graphing, factorisation, financial maths; formula sheet + grid addenda",
          "March regional paper + marking memorandum — exponents, surds, unit conversions, rational numbers, with formula reference sheet",
          "Maths Task 2 (V2) — 30 marks: number classification, exponential laws, surds, financial formulas, arithmetic sequences",
          "Math Exercize memo — step-by-step solutions for number classification, equation manipulation, recurring decimals, sequences",
          "Task 6 (V1) — 50 marks / 2½ h / ICASS weighting 10: analytical geometry, measurement, right-angled trigonometry",
        ],
        body: "All five are inside the two mathematics capture files listed in the provenance below.",
      },
      {
        heading: "Gaps & cautions",
        body:
          "The captures contain no recent (2020–2026) national mathematics papers — the newest paper here is March-material and November 2015. Nothing in the captures clearly separates Paper 1 content from Paper 2 content beyond the 2015 'First Paper' label, so treat the topic map as the union of both papers until you check a recent pair from the Mytvet link. PDF pages were captured as images, so every statement above comes from the notebook's own summaries and extracted text, not from re-typeset papers.",
      },
    ],
    checkQuestions: [
      { q: "What three decimals of precision do the captured marking guides demand?", a: "Three-decimal precision, used together with the South African decimal comma." },
      { q: "Convert x = 121.515151… to a fraction — first move?", a: "Multiply both sides by 100 to shift the repeating block one full cycle, then subtract the original equation to eliminate the repeat." },
      { q: "What does 'Rule of 1' mean when rationalising a monomial denominator?", a: "Multiply numerator and denominator by the same non-zero expression (the denominator itself or a form of 1) so the value does not change but the irrational denominator disappears." },
      { q: "When is a conjugate required instead?", a: "When the denominator is a binomial containing a surd — multiply by the conjugate and expand with (a−b)(a+b) = a²−b²." },
      { q: "State the zero-exponent rule and one trap it prevents.", a: "a⁰ = 1 (any non-zero base to the power zero is one). It turns expressions like (2x)⁰ into 1 before you group coefficients and bases." },
      { q: "How do simple and compound interest differ in the captured guide?", a: "Simple interest grows linearly on the original principal; compound interest accelerates by earning on accumulated interest. Always convert the time period into years first." },
      { q: "What is a rational number in the captured material?", a: "Any number expressible as a/b with integers a and b (b ≠ 0) — decimals either terminate or repeat predictably. Irrationals (surds, π) have endless non-repeating decimals." },
      { q: "What are CA marks?", a: "Continued Accuracy marks — credit that protects your score from small arithmetic slips when your method and subsequent steps are correct." },
      { q: "Which calculation blocks make up the captured Task 6 paper?", a: "Analytical geometry (gradients, coordinate transformations), volume and surface area of geometric solids, and right-angled trigonometry —50 marks in 2½ hours with a formula sheet." },
      { q: "What addenda came with the November 2015 First Paper?", a: "A formula sheet and detachable coordinate-grid addenda for plotting the required graphs." },
    ],
    captures: [
      { file: "12_NC_V_Mathematics_NQF_Level_2_Assessment_and_Marking_Guideline_9b657786.json", sha256: "40E42A15EA9330B41F486991ADEADE7DFC60394F046862BCA2D34E2D2C71CEB2" },
      { file: "17_NC_V_Fundamentals_Mathematics_NQF_Level_2_Task_6_f791dbc6.json", sha256: "1E3C11F15F8D407B151CC6C48972279BDC1F1465F3073A695F4E734160BD7B3F" },
      { file: "01_Mechatronic_Studying_L2_0b9ba18c.json", sha256: "1531C4562151667C5776F412DE1F7DC44CAB1866E7A8FFC4231F35E2FFDC852E" },
    ],
  },

  {
    id: "electrotechnology",
    subject: "Electrotechnology",
    stream: "NC(V) Engineering",
    papers: "L2 · Paper 1",
    coverage: {
      level: "strong",
      docs: 5,
      sources: 21,
      chars: 395657,
      pages: 163,
      summaries: 19,
      note: "Includes the full Logic Gates notebook (113 page images) and the shared Mechatronic Studying L2 capture with its NC1000 memos.",
    },
    summary:
      "Your deepest calculation library: DC, capacitance, AC/RLC, cabling and power budgeting, backed by real NC1000 QP+memos (2022–2023) and the November 2025 Y-paper.",
    sections: [
      {
        heading: "Exam facts from the captures",
        body:
          "The captured November 2025 Electrotechnology NQF Level 2 paper (DHET, sat 21 November 2025) ran three hours for 100 marks. Its formula sheet comes with the paper, and the paper closes with a simulated maintenance record — meaning documentation format is itself examinable. Your own sitting is 6 November, 13:00, 3 hours.",
      },
      {
        heading: "Topic map — calculation spine",
        body:
          "The captured calculation study guide is explicitly built for a six-hour-to-exam sprint and mirrors what the NC1000 papers ask:",
        points: [
          "DC circuit analysis — resistors in series/parallel, Ohm's law; the guide's own trick: 'flip the fraction to solve for R'",
          "Capacitance & charge calculations",
          "AC & RLC circuits — inductive reactance X_L, capacitive reactance X_C, total current, active power",
          "Resistivity & cable calculations (wire length/size for a run)",
          "Power, energy & budgeting — DC power, AC active power, electrical energy consumption, project-style cost budgeting (materials, hourly rate, meals → TOTAL)",
          "Component identification & testing — semiconductor diode testing, transformer analysis, switch wiring configurations, electromagnetic induction",
          "Domestic installation wiring requirements and hand-tool application",
          "Fault-finding/troubleshooting methodology plus record-keeping (the maintenance-record section)",
          "IEC symbol recognition in technical diagrams",
        ],
      },
      {
        heading: "Topic map — digital logic block",
        body:
          "The Logic Gates capture (8 sources, 113 pages) is the single biggest library in the project, and its summaries agree across all eight sources on what it drills:",
        points: [
          "Gate family: NOT, AND, OR, NAND, NOR, XOR, XNOR — symbols, algebraic form and truth tables",
          "Building gate diagrams for compound expressions and mapping intermediate signals",
          "Boolean algebra rules: De Morgan's laws, distribution, absorption, order of precedence, removing repeated terms",
          "Timing diagrams and real applications (alarm systems, frequency counters, adders, D-type flip-flop as single-bit memory)",
          "Hardware grounding: 7400-series ICs, gates built from diodes/transistors, lab practice with build-and-document exercises",
        ],
      },
      {
        heading: "What the memos say is examinable (NC1000, Supp 2023 & Nov 2023)",
        body:
          "Both captured marking guidelines give standardised answers and point allocations for five comprehensive questions each. Together they put the following on the record as examinable:",
        points: [
          "Alternating-current theory and electromagnetic induction",
          "Circuit components and configurations (switch wiring, semiconductor diodes)",
          "Electrical safety",
          "Troubleshooting and fault-finding methodology",
          "Documentation and administrative record-keeping",
          "Ohm's law calculations and transformer analysis (Nov 2023 QP)",
        ],
      },
      {
        heading: "Practical activity capture (Electrotech ISAT material)",
        body:
          "One capture holds the hands-on build sequence that coursework-style questions describe: enclosure preparation (measure, drill, deburr), vero-board assembly (cut copper tracks, verify component polarity, solder fly-leads), multimeter fault-finding protocols, and the PLC interface inventory (micro PLC 24V DC / 230V AC unit, base unit, special relays, indicator lamps as outputs).",
      },
      {
        heading: "Papers in hand (captured)",
        points: [
          "NC1000 Electrotechnology L2 — Question Papers: November 2023 (tvetpapers origin)",
          "NC1000 Electrotechnology L2 — Marking Guidelines: November 2022 (edited), Supplementary 2023, November 2023",
          "Electrotechnology NQF Level 2 — November 2025 'Y-Paper' (6 page images + summary)",
          "Electrotechnology calculation study guide (worked formulas, real exam values)",
        ],
        body: "The Nov 2022/2023 memos live inside the shared 01_Mechatronic_Studying_L2 capture.",
      },
      {
        heading: "Gaps & cautions",
        body:
          "The November 2025 Y-paper was captured as page images with no extractable text — you have its summary (Ohm's law, circuit analysis, IEC symbols, hand tools, domestic wiring, fault-finding) but not verbatim questions; use the Mytvet link for the full paper. There is exactly one recent QP in the library (Nov 2023) for memos to match — the 2015–2022 QP range must come from the verified paper links. Logic-gate depth is enormous, but only the captured papers prove logic appears on YOUR paper — verify against a recent QP before over-investing.",
      },
    ],
    checkQuestions: [
      { q: "How long was the captured November 2025 paper and for how many marks?", a: "3 hours, 100 marks (DHET, sat 21 November 2025)." },
      { q: "What sits at the end of the November 2025 paper after the questions?", a: "A formula sheet and a simulated maintenance record — documentation format is examinable." },
      { q: "State the calculation guide's rule of thumb for solving for resistance.", a: "'Flip the fraction to solve for R' — rearrange I = V/R style relations rather than memorising every rearrangement." },
      { q: "Which five topics did the Supp 2023 NC1000 memo standardise answers for?", a: "AC theory, circuit components, electrical safety, troubleshooting, and documentation/record-keeping." },
      { q: "What does De Morgan's law let you do in Boolean algebra?", a: "Transform a complemented OR/AND into the complementary AND/OR form (NOR ↔ AND of complements; NAND ↔ OR of complements), enabling simpler gate implementations." },
      { q: "When is an AND gate's output HIGH?", a: "Only when all of its inputs are HIGH (1) — the Supp-style MCQs test exactly this condition." },
      { q: "What is X_L and X_C in the RLC calculation block?", a: "Inductive reactance and capacitive reactance — the opposing effects of inductors and capacitors in AC circuits, combined with resistance to determine total current." },
      { q: "Name two items in the captured PLC interface inventory.", a: "Micro PLC controller (24V DC / 230V AC) and its base unit — plus special relays and indicator lamps/output signals." },
      { q: "What build steps does the vero-board activity require, in order?", a: "Cut copper tracks, verify component polarity, solder joints, attach fly-leads — then test with a multimeter using fault-finding protocol." },
      { q: "Why does the calculation guide insist on unit conversions?", a: "Real exam values mix kΩ/MΩ, μF/nF and minute/hour periods — wrong-scale conversions are the guide's named 'common mathematical traps'." },
      { q: "What is the purpose of the power/energy budgeting block?", a: "To compute consumption, distance/cable runs and costed project totals (materials, hourly rate, supplies) — i.e. apply electrical power maths to real job costing." },
    ],
    captures: [
      { file: "07_Electrotechnology_NQF_Level_2_November_2025_Examination_Paper_625ae2a2.json", sha256: "1DD1FBB1F0ABD176870A660C385B7F941DC6838D44D646575BAAEA9905F68E4E" },
      { file: "04_Electrotechnology_NQF_Level_2_National_Certificate_Exam_Papers_2f776a22.json", sha256: "2ECC3CF7C10D972C740A8953F573A5BAB5B835E61848029FB2BAB7FA56D97B57" },
      { file: "10_Logic_Gates_Fundamentals_Symbols_and_Truth_Tables_8b2b28c0.json", sha256: "A83D6BF8542D2D7A0CF13E75F33A9EC9BA9BF1337EB0F3E49BA4FEC1A14D6B42" },
      { file: "01_Mechatronic_Studying_L2_0b9ba18c.json", sha256: "1531C4562151667C5776F412DE1F7DC44CAB1866E7A8FFC4231F35E2FFDC852E" },
      { file: "08_NC_V_Mechatronics_Level_2_Integrated_Assessment_Task_74d687c2.json", sha256: "2A413B9ADE670E762BB5389A0E923373CFDEF8709225F5ABA5A518A0A0A8AC8A" },
    ],
  },

  {
    id: "mechatronic-systems",
    subject: "Mechatronic Systems",
    stream: "NC(V) Engineering",
    papers: "L2 · Paper 1",
    coverage: {
      level: "strong",
      docs: 6,
      sources: 25,
      chars: 283009,
      pages: 106,
      summaries: 23,
      note: "Six captures: exam papers, control-system notes, troubleshooting methodology, practical assessments and the Msinga garden project.",
    },
    summary:
      "Your exam is last (16 Nov) but your richest library: relay ladder logic, sensors, pneumatics with the half-cut and Output-Input-Through methods, plus real ISAT practical structures.",
    sections: [
      {
        heading: "Exam facts from the captures",
        body:
          "The captured NC2090 Mechatronic Systems L2 paper (Supplementary 2019) is a 09:00–12:00 X-paper — three hours, matching your 16 November, 13:00 sitting. It ships a component designation addendum (e.g. TON A1 timer blocks) and tests drawing under time pressure: timing diagrams for cascaded timers, an indirectly controlled electropneumatic circuit, and a labelled working electropneumatic circuit. A Level 3 paper (NC2100, same 2019 session) is also captured — useful stretch material, but it is explicitly NQF Level 3.",
      },
      {
        heading: "Control systems — the conceptual spine",
        body:
          "The captured slides and topic notes build the subject in layers, and the papers ask you to place solutions inside this framework:",
        points: [
          "Mechatronics = synergistic integration of mechanical engineering, electronics and intelligent computer control",
          "Historical arc: Industrial Revolution → Semiconductor Revolution (ICs) → Information Revolution (microcontrollers/microprocessors)",
          "Control ladder: hardwired control (relay ladder logic) → electronic control → embedded control → processor control (PLC/PC), following the PLC input-process-output approach",
          "Remote control operates over distance between sites, using low safety voltages and intrinsic safety zones",
          "Safety layer: physical barriers and machine guards on moving machinery, visual and auditory feedback signals for operators",
          "Sensors: inductive (metal detection), limit/contact switches (gates), optical proximity (one-way, reflection and diffuse-reflection systems)",
          "Actuators: relay vs solenoid-valve action, direct vs indirect control, changeover switches, ON/OFF detent switches, motors, horns/sirens/buzzers",
        ],
      },
      {
        heading: "Pneumatics & troubleshooting — the highest-value section",
        body:
          "The Pathways capture is built around the exact question sets exams ask (including 8-mark action-logic walkthroughs):",
        points: [
          "Pneumatics = using compressed gas to generate power and control machinery; air transports and stores easily but needs filtration against moisture and impurities",
          "Vocabulary the memo expects: disturbance, fault, failure, malfunction, symptom, function, troubleshooting",
          "Method 1 — Output-Input-Through: start at the output, walk back through inputs to the supply; the sample asks what to test FIRST when a motor fails to start, and what to do when supply IS present at M1 but nothing runs",
          "Method 2 — Half-cut: bisect the system to isolate which half holds the fault; the paper asks you to evaluate its efficiency (4 marks)",
          "Contamination management: define contamination, name two forms, name two resulting problems in an electro-pneumatic system",
          "Commissioning: purpose, process and documented restart — safety precautions before restarting repaired machinery, then structured fault recording",
          "Fault-tree analysis as the third diagnostic structure",
        ],
      },
      {
        heading: "What the papers literally ask you to draw",
        body:
          "From the captured NC2090 (L2) and supporting materials:",
        points: [
          "Winch/cage mass problem: calculate work done and identify kinetic vs potential energy (FIGURE 1)",
          "Redraw FIGURE 3 as a hydro-electric power plant and complete it",
          "Timing diagram for cascaded timer operation (Q2.4)",
          "Fully labelled indirectly controlled electropneumatic circuit (Q4.5) and labelled working electropneumatic circuit (Q4.6)",
          "Relay ladder-logic circuits with standardised symbols for timers, sensors and switches",
          "Explain logic conditions behind control sequences",
        ],
      },
      {
        heading: "Practical & ISAT structures (captured)",
        body:
          "Two captures show exactly how the integrated assessment is built, which shapes both coursework and theory questions:",
        points: [
          "ISAT sub-task 1 — design a PLC program and assemble/configure a computer; sub-task 2 — layout and wiring of an electrical/electronic circuit (vero board, soldering); sub-task 3 — fabricate a G-clamp, with material lists, input/output address tables (e.g. PLC1 base unit, indicator lamps as outputs) and per-activity mark/time allocations",
          "Practical assessment: identify 15 workshop items across power/actuation/pneumatics, control/switching, diagnostics (multimeter) and safety; then wire a DC-motor inductive system (positive terminal → switch → load → negative return) with PPE protocol",
          "Physics of the motor task: Lorentz force law and Back EMF explain rotation and current regulation — the 'thorough physics' call-out is where top marks live",
          "G-clamp activity: layout → cutting, drilling, threading, assembly; lead-in chamfers and force-fit assemblies have explicit engineering justifications",
        ],
      },
      {
        heading: "Application corner — the Msinga garden capture",
        body:
          "The Automated Mechatronics Garden capture (6 sources, 96 884 chars) is a full engineering blueprint: ESP32 control layer, NPK-71-RS485 / VEML6075 / BMP581 / DHT22 sensors, DQ542MA stepper driver with NEMA 23, PWM charge control, climate-battery (GAHT) thermodynamics and a 40/60 community-vs-retail business model. It will not appear on Paper 1 verbatim — but it is the best 'real mechatronics' reading for open-ended and integrated-assessment prep, and every concept it uses (sensors, actuators, control loops, power budgets) is examinable vocabulary.",
      },
      {
        heading: "Papers in hand (captured)",
        points: [
          "NC2090 Mechatronic Systems L2 QP — Supplementary 2019 (X-paper, 12 March 2019) + addendum",
          "NC2100 Mechatronic Systems L3 QP — Supplementary 2019 (stretch: hydraulics, electrohydraulic symbols, heavy-steel sorting design)",
          "Mechatronic exam paper + memorandum paste (modules: technical systems architecture, relay/electronic control logic, industrial computing, fluid power actuation)",
          "Mechatronics June Practice Test Papers with question sets A–C and marking memoranda",
          "Mechatronic Systems L2 topic 2 notes (docx text) — control ladder, sensors, actuators",
          "Practical assessment (inductive systems) and both ISAT frameworks",
        ],
        body: "The L3 paper is flagged: use for stretch only, your paper is L2.",
      },
      {
        heading: "Gaps & cautions",
        body:
          "Most PDFs here were captured as page images — the content above comes from notebook summaries and extracted docx text, not verbatim paper re-typesets, so confirm wording against the real QP. There is no captured recent (2022–2026) Mechatronic Systems national paper; the freshest full paper is 2019 supplementary. The Msinga project is student-authored project material, not exam authority — treat its numbers as project data, not syllabus facts.",
      },
    ],
    checkQuestions: [
      { q: "Name the four rungs of the control ladder from hardwired to processor control.", a: "Hardwired control (relay ladder logic) → electronic control → embedded control → processor control (PLC/PC)." },
      { q: "What does an inductive proximity sensor detect, and where are limit switches used?", a: "Inductive sensors detect metal objects; limit/contact sensors are used on gates and moving machinery." },
      { q: "State the Output-Input-Through method in one sentence.", a: "Start at the output device and trace backwards through each input and connection toward the supply until the break in the chain is found." },
      { q: "When the motor fails to start, what does the captured question set say to test first?", a: "Apply the recommended Output-Input-Through approach — test from the output side; then check whether supply voltage is actually present at motor M1." },
      { q: "Give the half-cut method's definition and one evaluation point.", a: "It isolates a fault by testing the midpoint (cutting the system in half), halving the search space each time; the practice paper asks you to evaluate this efficiency for 4 marks." },
      { q: "Name two forms of air contamination and one resulting problem.", a: "Moisture and solid particles/dirt are the classic forms; problems include valve sticking, corrosion and unreliable actuator movement (any two forms + one downstream problem per memo).", },
      { q: "What must happen before restarting a repaired machine (captured L3 memo rule)?", a: "Apply safety precautions first — verify guards, clearances and safe state — then record the fault systematically." },
      { q: "Which three sub-tasks make up the captured NC(V) Mechatronics ISAT?", a: "1) Design a PLC program and assemble a computer, 2) layout and wiring of an electrical/electronic circuit, 3) fabricate a G-clamp — each with a knowledge questionnaire and workshop-safety compliance." },
      { q: "What physics explains why a DC motor keeps spinning and how current is regulated?", a: "The Lorentz force law drives conductor rotation; Back EMF opposes the supply current as speed rises, regulating it." },
      { q: "How do relay actuators and solenoid-valve actuators differ in action?", a: "A relay switches electrical circuits electromagnetically; a solenoid valve actuates fluid/air flow — the captured topic notes test this difference explicitly." },
      { q: "What are the three optical proximity sensor systems named in the notes?", a: "One-way (through-beam) system, reflection system, and diffuse-reflection system." },
      { q: "In the winch question, what two energy quantities must you identify and calculate?", a: "Kinetic or potential energy and the work done in bringing up the cage of given mass (FIGURE 1)." },
      { q: "What does the mechatronics definition require beyond mechanics?", a: "Electronics plus intelligent computer control — the synergistic integration of all three to manage system complexity." },
    ],
    captures: [
      { file: "06_Mechatronic_Systems_Advanced_Study_Guide_and_Assessment_Paper_528a75e0.json", sha256: "2870317495ABC1B269B5FBC6D012B1F8CACFE99BB92B9CFA9839DA9989941E0F" },
      { file: "01_Mechatronic_Studying_L2_0b9ba18c.json", sha256: "1531C4562151667C5776F412DE1F7DC44CAB1866E7A8FFC4231F35E2FFDC852E" },
      { file: "03_Pathways_to_Mechatronic_Pneumatic_and_Control_Systems_213c22a8.json", sha256: "5F5FE6EE53DE3DCCAC0655A7A762D858E958B20A4DA215DE522F8EB4B2B9D8FA" },
      { file: "13_Mechatronics_Practical_Assessment_Inductive_Systems_and_Component_Analysis_b52580ca.json", sha256: "44E5AA666C8367B094DB986741A8726FFC9CC9876E2E3BD49661DCBAA902196C" },
      { file: "05_NC_V_Mechatronics_Level_2_Integrated_Summative_Assessment_Task_4c380566.json", sha256: "D257B01BD2B01FD19FCF3EC31A460BD0DADFFA988792B7E3BCEBAE35A67B5B8F" },
      { file: "14_Automated_Mechatronics_Garden_Implementation_and_Sustainability_Plan_for_Msinga_be05f280.json", sha256: "330BCDC6F00F0883DAD01C2FDD0ECD2FC9F012DE75A2D2E0A4566F3FCCC183A8" },
    ],
  },

  {
    id: "introduction-to-computer",
    subject: "Introduction to Computer",
    stream: "NC(V) Engineering",
    papers: "L2 · Paper 1",
    coverage: {
      level: "strong",
      docs: 3,
      sources: 17,
      chars: 462827,
      pages: 82,
      summaries: 10,
      note: "The largest text library in the project — two 100k+ captures plus the PC hardware/networking guide.",
    },
    summary:
      "Three hours, 100 marks, on 11 Nov. The captures contain actual 2018 papers with instructions (calculator rules differ by sitting!) plus drill material on Boolean, binary, storage sizes and hardware.",
    sections: [
      {
        heading: "Exam facts from the captures",
        body:
          "Both captured 2018 papers state: 100 marks, 3 hours, 09:00–12:00, answer ALL questions, paper of 7 pages. One critical instruction differs between sittings — the March 2018 X-paper says 'Calculators may be used', the November 2018 paper says 'Calculators may NOT be used'. Check your own paper's instruction page on the day; do not train yourself into calculator dependence. Your sitting: 11 November, 13:00, 3 hours.",
      },
      {
        heading: "Topic map (question-paper evidence)",
        body:
          "The captured study guide organises practice into a marked structure that matches the paper's Section A style questions:",
        points: [
          "Data storage sizes (fill-in section, 5 marks in the guide)",
          "Types/classifications of computers (15 marks short questions & definitions in the guide)",
          "Boolean expressions & truth tables — AND/OR/NAND/NOR truth tables and gate diagrams (15 marks in the guide)",
          "Binary arithmetic — addition, subtraction, multiplication, division (15 marks in the guide)",
          "Number systems: decimal, binary, octal, hexadecimal; successive division for base conversion",
          "Real MCQ patterns from March 2018: fixed-function IC packages containing AND gates, conditions for HIGH AND output, binary→7-segment decoding devices, inverter identification, data-storage-device examples",
        ],
      },
      {
        heading: "Systems & software layer (library depth)",
        body:
          "The Computer Basics capture (297 366 chars) goes well beyond paper evidence — useful for definitions and short questions:",
        points: [
          "Input-Process-Output (IPO) cycle as the universal framework for how computers work",
          "Hardware: storage, memory (RAM vs storage), the CPU; Windows operating system; security basics",
          "Productivity: creating and managing documents, presentations and spreadsheets in Word, PowerPoint, Excel",
          "Logic expressions: sum-of-products and product-of-sums forms; variables, literals, minterms, maxterms; commutative/associative/identity/complement laws",
          "Assembly language: mnemonics and operands, CPU registers, status flags (zero flag, overflow flag), fetch-decode-execute cycle, why it is fast but not portable",
          "Python fundamentals (enrichment): variables, types, strings, conditionals, loops, functions, kwargs/varargs",
        ],
      },
      {
        heading: "Hardware & networking layer",
        body:
          "The PC hardware capture covers the practical-identification side:",
        points: [
          "Motherboard as central hub: chipset, sockets, form/specs (the capture walks a real A8V-DELUXE spec sheet: RAID, Serial ATA, Ultra DMA modes, Flash EEPROM BIOS)",
          "Peripheral connectivity: standardised ports and cables; connection checklists",
          "Networking: LAN vs WAN, physical topologies, transmission media/cabling options",
          "Safety precautions, environmental conditions and 'verify physical connections with a checklist' as the deployment discipline",
        ],
      },
      {
        heading: "Papers in hand (captured)",
        points: [
          "NC1520 Introduction to Computers L2 QP — 1 March 2018 (X-paper, calculators permitted, 7 pages)",
          "NC1540 Introduction to Computers L2 QP — 12 November 2018 (X-paper, calculators NOT permitted)",
          "Computer Basics study guide + interactive practice paper (Topic 1: storage sizes, computer types, logic gates, Boolean, binary arithmetic)",
          "PC hardware identification task scan (Module 4: specs, ports, connections)",
        ],
        body: "Both 2018 papers are full extracted text — you can attempt them verbatim.",
      },
      {
        heading: "Gaps & cautions",
        body:
          "The QP shelf here stops at 2018 — get 2019–2026 sittings from the Mytvet link (2015–2026 range flagged verified). The 5/15/15/15 mark split belongs to the captured study guide's four sections, not to the national paper's official section marks — treat it as a practice structure. Python, assembly-language and MS 365 material in the library is enrichment beyond anything provable from the two captured papers; paper-proven topics are storage sizes, computer types, logic/Boolean, binary and hardware/networking.",
      },
    ],
    checkQuestions: [
      { q: "Do calculators differ between the two captured 2018 papers?", a: "Yes — March 2018 permits calculators; November 2018 forbids them. Both are 100 marks over 3 hours, 7 pages, answer ALL." },
      { q: "When is an AND gate's output HIGH?", a: "When every input is HIGH/1 — directly tested in the March 2018 MCQ set." },
      { q: "What device converts a binary number for a 7-segment display?", a: "A decoder/driver (the 7-segment decoding device — March 2018 MCQ 1.1.3)." },
      { q: "What is an inverter, and what does a fixed-function IC with four AND gates exemplify?", a: "An inverter is a NOT gate (single input, opposite output). A package of four AND gates exemplifies a small-scale integration (SSI) fixed-function logic IC — the March 2018 MCQ wording." },
      { q: "Name the four base systems in the number-systems capture and the conversion method taught.", a: "Decimal (base 10), binary (base 2), octal (base 8), hexadecimal (base 16); successive division converts decimal to the target base." },
      { q: "What does IPO stand for and why is it 'universal' in the captures?", a: "Input-Process-Output — every computing operation is framed as taking input, processing it, producing output." },
      { q: "What are minterms and maxterms used for?", a: "They name the canonical product/sum building blocks of Boolean functions — sum-of-products and product-of-sums forms." },
      { q: "Which CPU status flags does the assembly capture name, and what does the zero flag do?", a: "Zero flag and overflow flag (among others); the zero flag is set when an operation's result is zero." },
      { q: "What are the four binary arithmetic operations in the practice structure?", a: "Binary addition, subtraction, multiplication and division (a 15-mark section in the captured study guide)." },
      { q: "What checklist discipline does the hardware capture push before declaring a build successful?", a: "Verify physical connections and operational success with a checklist, under correct safety/environmental conditions." },
      { q: "What does the fetch-decode-execute cycle describe?", a: "The processor's instruction loop: fetch an instruction from memory, decode what it requires, execute it — repeated continuously." },
    ],
    captures: [
      { file: "11_Introduction_to_Computers_NCV_Level_2_Exam_Guide_9a8d361c.json", sha256: "B531E14C00693783CA3F3E905ABB3E7F0FBDBC2AADCA08D0366659418579EF87" },
      { file: "02_Computer_Basics_A_Practical_Introduction_to_Systems_and_Software_15f8ab87.json", sha256: "11382CAFCE0E731F859B53067DCA05BE29FF44C8A98D143DD40565CCD54E4681" },
      { file: "16_Guide_to_PC_Hardware_Connectivity_and_Networking_Configuration_e3cc1a23.json", sha256: "1D71C9A8E2C144FC64C1C0C733FBF37F2C03479A736B258F857E8937C55EEC8F" },
    ],
  },

  {
    id: "manual-manufacturing",
    subject: "Manual Manufacturing",
    stream: "NC(V) Engineering",
    papers: "L2 · Paper 1",
    coverage: {
      level: "strong",
      docs: 3,
      sources: 15,
      chars: 253853,
      pages: 113,
      summaries: 14,
      note: "05_NC_V_Mechatronics_ISAT is shared — it carries the G-clamp manufacturing activity.",
    },
    summary:
      "12 Nov, 3 hours, 5 questions/100 marks (Feb 2025 shape). The Feb 2025 QP+memo are captured whole, plus a safety manual, tool guides and real accident-report formats.",
    sections: [
      {
        heading: "Exam facts from the captures",
        body:
          "The captured February 2025 NC1810 paper: five questions, 100 marks, three hours, covering workshop safety regulations, technical drawing interpretation, measuring instruments, fastening methods, welding techniques and metal/material classification. The Supplementary 2024 sitting used six questions; the November 2013 paper ordered candidates to answer all questions and bring proper drawing utensils for graphical tasks. Expect drawings (isometric views, symbol identification) alongside theory — and note the captured guide's own weighting claim: Topic 3 (hand & power tools) ≈ 80% of exam weight, Topic 1 (safety & health) ≈ 10% — that split comes from the guide, not an official DHET document.",
      },
      {
        heading: "Safety & health block (Topic 1 — from the safety manual capture)",
        body:
          "The 11-summary safety manual is the most memo-aligned safety source in the library:",
        points: [
          "Occupational Health and Safety Act as the legal framework; shared moral responsibility of employers and employees; prevention-first culture (NOSA grading system named)",
          "Basic first aid for common accidents; fire fighting built on the fire triangle: oxygen + heat + fuel",
          "Accident reporting using the captured form taxonomy: loss/damage categories (building, equipment, floor, machinery, vehicle, injury, product) → general causes (struck by/against, fall, handling, transport, fire, machine, electricity, falling objects) → unsafe acts / unsafe conditions / personal factors",
          "Environmental controls: waste-management hierarchy, housekeeping standards, safety signage recognition",
          "Tool maintenance as accident prevention",
        ],
      },
      {
        heading: "Workshop operations block (Topic 3 — the 80%)",
        body:
          "The engineering guide's four phases map straight onto the captured memo questions:",
        points: [
          "Phase 1 Preparation — material inspection, rough cutting with steel rule and hacksaw (18 TPI blade)",
          "Phase 2 Layout — engineering blue, scriber, try square, prick punch to mark coordinates",
          "Phase 3 Removal — drilling, filing, hole preparation and perimeter finishing; five hacksaw safety precautions are directly examined (Nov 2013 Q3.2)",
          "Phase 4 Forming — bending the metal strap profile in bench vice with hammer/press; compensate for springback",
          "Threading — internal thread cutting with a three-tap set (taper, second, plug), external threading with dies; screw-thread terminology examined (SUPP 2019)",
          "Metrology — Vernier calipers and outside micrometers (Nov 2013 asks the tool's function AND its accuracy); grinding-wheel ring test and dressing",
          "Joining — welding symbols (a 7-mark symbol-identification figure), welding and soldering techniques, matching electrode lead / workpiece clamps / welding mask / arc eyes / butt joint / flux in Column A–B exercises",
          "Fastening — vibration-resistant lock nuts, load-bearing washers, thread-locking fluids, split pins, retaining compounds",
        ],
      },
      {
        heading: "The G-strap/G-clamp thread",
        body:
          "Three captures converge on the same production story — the guide centres Topic 3 on producing a clamping device (G-strap), the mechatronics ISAT contains the G-clamp manufacturing activity, and both stress engineering reasoning: lead-in chamfers and force-fit assemblies exist so the finished tool survives heavy industrial use. Expect 'why this operation' questions, not just 'which tool'.",
      },
      {
        heading: "Papers in hand (captured)",
        points: [
          "NC1810 Manual Manufacturing L2 QP — February 2025 (5Q/100 marks/3h) + official memo",
          "NC1810 Manual Manufacturing L2 QP — Supplementary 2024 + official memo (6Q)",
          "NC1810 Manual Manufacturing L2 QP — Supplementary 2019 (screw threads, welding symbols, soldering)",
          "NC1780 Manual Manufacturing L2 QP — November 2013 (isometric view, tool accuracy, hacksaw/grinding questions, accident-report addendum)",
          "Comprehensive March exam mastery guide + NQF L2 manual (safety → metrology → drawing → joining)",
        ],
        body: "Two complete QP+memo pairs (Feb 2025, Supp 2024) are the highest-value items — attempt them under 3-hour conditions first.",
      },
      {
        heading: "Gaps & cautions",
        body:
          "No captured paper covers 2014–2018 or 2020–2023 — bridge that range from Mytvet. Everything here is written-paper evidence; no practical-assessment marks are documented in the captures. The '80%/10%' weighting is the private guide's claim — sanity-check it against two real papers before building your whole revision around it.",
      },
    ],
    checkQuestions: [
      { q: "What shape did the February 2025 NC1810 paper take?", a: "Five questions, 100 marks, three hours — safety, technical drawing interpretation, measuring instruments, fastening methods, welding techniques, metals/materials." },
      { q: "State the fire triangle as used in the captured first-aid material.", a: "Oxygen + heat + fuel — remove one leg to extinguish the fire." },
      { q: "What three top-level categories does the captured accident report use for causes?", a: "Unsafe acts, unsafe conditions and personal factors — under general causes like struck-by, falls, fire, electricity and machine causes." },
      { q: "Name the three taps in an internal thread-cutting set and their order of use.", a: "Taper tap first (starts the thread), second tap (continues), plug tap (finishes the full thread depth) — a three-tap set per the engineering guide." },
      { q: "Why does the guide insist on compensating for springback during bending?", a: "Metal springs back elastically after bending — over-bend slightly so the final strap profile holds the intended angle." },
      { q: "What do the ring test and dressing check/do for a grinding wheel?", a: "The ring test checks for internal cracks (sound ring = sound wheel); dressing restores a clean, true cutting surface." },
      { q: "Which five safety precautions does Nov 2013 ask about hacksaw use?", a: "The question demands FIVE — typical memo material: correct blade TPI for the material, secure workpiece, moderate pressure, no use of frame as hammer, keep blade guides tight. Verify exact wording against the captured memo." },
      { q: "What accuracy question does the 2013 paper ask about the Vernier caliper?", a: "It shows a tool in FIGURE 3 and asks both its ONE function and its accuracy (reading precision) — know your caliper's smallest division." },
      { q: "Name the fastener roles: lock nut, washer, thread-locking fluid, split pin.", a: "Lock nut resists vibration loosening; washer spreads load; thread-locking fluid fills gaps to seize threads; split pin prevents axial escape of a shaft/nut." },
      { q: "What is the layout trio used before any cutting?", a: "Engineering blue (coating), scriber (lines) with try square (right angles), plus prick punch to punch the marks permanent." },
      { q: "What makes a G-clamp's lead-in chamfer and force-fit significant?", a: "They are deliberate engineering choices: chamfers ease assembly/entry, force-fits preload the joint so the clamp withstands heavy industrial loading." },
      { q: "Which two complete QP+memo pairs sit in this library?", a: "February 2025 and Supplementary 2024 NC1810 papers, both with official marking guidelines." },
    ],
    captures: [
      { file: "15_Manual_Manufacturing_NQF_Level_2_Marking_Guideline_February_2025_dbfaedda.json", sha256: "62D36FC30DC8575745D88AD5E92C88A90DEE700572D3B5D18FC2EDACD1E7DC4F" },
      { file: "09_NCV_Level_2_Manual_Manufacturing_Engineering_Guide_85f3d7f6.json", sha256: "5F2C13D4F47A83D15AF7F204E39C31E9119B27F90C0B57A496A8FB75F3E2ED94" },
      { file: "05_NC_V_Mechatronics_Level_2_Integrated_Summative_Assessment_Task_4c380566.json", sha256: "D257B01BD2B01FD19FCF3EC31A460BD0DADFFA988792B7E3BCEBAE35A67B5B8F" },
    ],
  },

  {
    id: "life-skills-and-computer-literacy",
    subject: "Life Skills and Computer Literacy",
    stream: "NC(V) Business",
    papers: "L2 · Paper 1 & Paper 2",
    coverage: {
      level: "partial",
      docs: 1,
      sources: 7,
      chars: 297366,
      pages: 39,
      summaries: 7,
      note: "No notebook is dedicated to this subject. These numbers are the transferable Computer Basics capture only — its Windows/Office/security modules support the Computer Literacy half. The Life Skills half has zero local material.",
    },
    summary:
      "Your FIRST exam (Paper 2 on 19 Oct, then Paper 1 on 5 Nov). No dedicated notebooks exist — you get an honest gap plan plus transferable computer-literacy material from the Computer Basics capture.",
    sections: [
      {
        heading: "The honest position",
        body:
          "None of the 17 captured notebooks belongs to Life Skills and Computer Literacy — the subject digest returned zero real hits (a Manual Manufacturing file initially matched on 'safety' keywords and was excluded on inspection). Nothing in this library can be cited as Life Skills syllabus content. What follows is therefore split cleanly: what is genuinely transferable, and what must come from past papers.",
      },
      {
        heading: "Transferable: Computer Literacy side (captured)",
        body:
          "The Computer Basics capture's modules overlap the computer-literacy half of your papers — usable for definitions and how-to questions:",
        points: [
          "Input-Process-Output cycle and computer fundamentals",
          "Windows operating system basics and file handling",
          "Security measures and responsible technology use",
          "Microsoft Word: creating and managing documents",
          "Microsoft PowerPoint: creating and managing presentations",
          "Microsoft Excel: creating and managing spreadsheets",
        ],
      },
      {
        heading: "Exam logistics (from your timetable)",
        body:
          "This subject has the earliest deadline of all your papers:",
        points: [
          "Paper 2 — 19 October 2026, 09:00, 2 hours (18 days from today)",
          "Paper 1 — 5 November 2026, 13:00, 2 hours",
          "Note the order: Paper 2 is sat FIRST — plan backwards from 19 October, not from Paper 1.",
        ],
      },
      {
        heading: "How to build this guide from papers (the plan)",
        body:
          "With no local content, run the paper-first method: open the Mytvet link (QP + memo, 2021–2026 sittings — verified 30 Sep 2026), download the two most recent sittings, and reverse-engineer the structure yourself: section types, mark splits, recurring topics. Then fill gaps from your teacher's notes or the Thutong subject page. After one paper you will know more about this exam's shape than this library can currently tell you — and once you export any Life Skills material into NotebookLM captures, this guide's provenance section will list it.",
      },
      {
        heading: "Gaps & cautions",
        body:
          "Zero Life Skills content (health, safety, citizenship, careers, communication) is captured locally. The transferable list above supports only the computer-literacy component, and even there it is general material not tied to any Life Skills exam paper. Do not treat the Computer Basics depth (assembly language, Python) as examinable here — nothing proves it. Priority order: past papers (2021–2026) > teacher notes > this transferable material.",
      },
    ],
    checkQuestions: [
      { q: "When do you write Paper 2 and Paper 1 for this subject, and which comes first?", a: "Paper 2 on 19 October 2026 at 09:00 (first), Paper 1 on 5 November 2026 at 13:00 — both 2 hours." },
      { q: "How many dedicated notebooks does this subject have in the captured library?", a: "Zero — no captured notebook belongs to Life Skills and Computer Literacy." },
      { q: "Which captured material is transferable to the Computer Literacy half?", a: "The Computer Basics capture: Windows basics, file handling, security/responsible use, and Word/PowerPoint/Excel document management." },
      { q: "Where do you get the actual Life Skills papers, and how recent?", a: "From the verified Mytvet link — QP + memos for 2021–2026 sittings (link verified 30 September 2026)." },
      { q: "What is the recommended first move for a subject with no local content?", a: "Paper-first: download the two most recent sittings, reverse-engineer section structure and mark splits, then fill only the gaps you observe." },
    ],
    captures: [
      { file: "02_Computer_Basics_A_Practical_Introduction_to_Systems_and_Software_15f8ab87.json", sha256: "11382CAFCE0E731F859B53067DCA05BE29FF44C8A98D143DD40565CCD54E4681" },
    ],
  },

  {
    id: "english-fal",
    subject: "English First Additional Language",
    stream: "NC(V) Business",
    papers: "L2 · Paper 1 & Paper 2",
    coverage: {
      level: "none",
      docs: 0,
      sources: 0,
      chars: 0,
      pages: 0,
      summaries: 0,
      note: "Zero captures. This guide is logistics + verified paper links + method — no syllabus content is claimed.",
    },
    summary:
      "Second-earliest exams (29–30 Oct) and zero captured material — this guide gives you the verified paper sources, the dates, and a strict method instead of invented content.",
    sections: [
      {
        heading: "The honest position",
        body:
          "No captured notebook contains English First Additional Language material — the subject digest returned zero hits, and nothing in the 17 source captures is citable as English FAL content. This guide therefore claims no syllabus, no section structure and no set texts. Everything below is timetable fact, verified-link fact, or method.",
      },
      {
        heading: "Exam logistics (from your timetable)",
        points: [
          "Paper 1 — 29 October 2026, 09:00, 2 hours",
          "Paper 2 — 30 October 2026, 09:00, 2 hours",
          "Both land inside the week of 27–30 October alongside Mathematics P1/P2 — that is three papers in four days; plan the English work early, not the night before.",
        ],
        body: "These are the second-earliest exams after Life Skills P2 (19 October).",
      },
      {
        heading: "Verified sources for the papers themselves",
        body:
          "Both links below were fetched and confirmed live on 30 September 2026 as part of the source-registry verification pass, and they cover every NC(V) L2 sitting you need:",
        points: [
          "Mytvet — QP + memos for L2 Paper 1 & Paper 2, 2015–2026 sittings (community host of real papers)",
          "Department of Basic Education — NSC English FAL papers + memos (official; different curriculum — extra language practice only)",
        ],
      },
      {
        heading: "Method: build this guide in one session",
        body:
          "Download the two most recent Mytvet sittings and mark their structure yourself: section types (comprehension, language, writing — whatever the real papers show), mark splits per section, question styles, and which sections recur across sittings. Then allocate your 2-hour papers section-by-section using those splits. Anything you export into NotebookLM can be captured into this app later — the provenance list below will pick it up automatically once ingested.",
      },
      {
        heading: "Gaps & cautions",
        body:
          "Everything content-wise is a gap: no comprehension passages, grammar scope, writing genres or literature/set-text information exists in this library, and none is asserted here. The DBE NSC papers are a different curriculum (Grade 12 CAPS) — useful for language drilling only, never as a model of your NC(V) paper's structure.",
      },
    ],
    checkQuestions: [
      { q: "When are the English FAL papers, and how long is each?", a: "Paper 1 on 29 October 2026 at 09:00 and Paper 2 on 30 October 2026 at 09:00 — two hours each." },
      { q: "How much English FAL content does the captured library contain?", a: "None — zero notebooks and zero sources are attributable to this subject." },
      { q: "Which link holds NC(V) L2 English papers with memos, and for which years?", a: "Mytvet's English First Additional Language page — QP + memos for 2015–2026 sittings (verified 30 September 2026)." },
      { q: "Why are DBE NSC English papers only extra practice?", a: "They follow the Grade 12 CAPS/NSC curriculum, not NC(V) — good for language skills, wrong as a structural model of your paper." },
      { q: "What is the recommended first step when the library has no content for a subject?", a: "Paper-first method: download the two most recent sittings, extract section types and mark splits from the real papers, then plan your 2-hour allocation around them." },
    ],
    captures: [],
  },
];

export function guideBySubject(subject) {
  return studyGuides.find((guide) => guide.subject === subject) ?? null;
}
