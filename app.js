const STORE_KEY = "medhist_static_data_v1";
const USER_KEY = "midhist_user";
const ATTACHMENT_DB = "medhist_static_attachments";
const FIXTURE_CLEANUP_VERSION = 3;
const PATIENT_SAMPLE_DATA_VERSION = 2;
const patientProfiles = [{
  id: "PH_LOCAL_0001",
  name: "SK ANISUR RAHAMAN",
  age: "20 years",
  gender: "Male",
  bloodGroup: "O-",
  emergencyContact: "+91-8609616259",
  lastConsultation: "Demo · 2026-10-20"
}];
const doctorProfiles = [{
  id: "DR_LOCAL_0001",
  name: "SK ANISH",
  qualification: "MBBS, MS",
  specialization: "General Surgery",
  distanceKm: 1.2,
  clinic: "MediCare+ Demo Clinic"
}, {
  id: "DR_LOCAL_0002",
  name: "Dr. Mira Sen",
  qualification: "MBBS, MD",
  specialization: "Cardiology",
  distanceKm: 2.8,
  clinic: "MediCare+ Demo Clinic"
}, {
  id: "DR_LOCAL_0003",
  name: "Dr. Rohan Das",
  qualification: "MBBS, MS",
  specialization: "Orthopedics",
  distanceKm: 3.6,
  clinic: "MediCare+ Demo Clinic"
}];

const patientSampleRecords = [
  { title: "Blood glucose reading", category: "Sugar", reportType: "Laboratory report", date: "2026-10-10", glucoseMgDl: 116, notes: "Sample reading for dashboard preview only. Not a real test result." },
  { title: "Blood glucose reading", category: "Sugar", reportType: "Laboratory report", date: "2026-10-16", glucoseMgDl: 109, notes: "Sample reading for dashboard preview only. Not a real test result." },
  { title: "Blood glucose reading", category: "Sugar", reportType: "Laboratory report", date: "2026-10-22", glucoseMgDl: 101, notes: "Sample reading for dashboard preview only. Not a real test result." },
  { title: "Blood pressure reading", category: "BP", reportType: "Vitals report", date: "2026-10-10", systolic: 134, diastolic: 86, notes: "Sample reading for dashboard preview only. Not a real measurement." },
  { title: "Blood pressure reading", category: "BP", reportType: "Vitals report", date: "2026-10-16", systolic: 126, diastolic: 82, notes: "Sample reading for dashboard preview only. Not a real measurement." },
  { title: "Blood pressure reading", category: "BP", reportType: "Vitals report", date: "2026-10-22", systolic: 121, diastolic: 79, notes: "Sample reading for dashboard preview only. Not a real measurement." },
  { title: "Cardiac / ECG report", category: "Cardiac", reportType: "ECG report", date: "2026-10-20", notes: "Sample report entry only. No ECG was performed and no clinical finding is recorded." },
  { title: "Orthopedic X-ray report", category: "Ortho", reportType: "X-ray report", date: "2026-10-21", notes: "Sample report entry only. No X-ray was taken or reviewed and no clinical finding is recorded." }
];

const patientHistorySampleRecords = [
  { title: "Previous consultation record", category: "General", reportType: "Consultation note", date: "2026-10-20", doctor: "Dr. Sample Clinician", notes: "Sample consultation entry for dashboard preview. No real examination or clinical assessment was performed." },
  { title: "Previous diagnosis record", category: "General", reportType: "Diagnosis", date: "2026-10-20", doctor: "Dr. Sample Clinician", notes: "Fictional placeholder only. No diagnosis was made and this is not medical advice." }
];

const patientSampleMedicines = [
  { name: "Metformin — sample history", condition: "Sample entry only", status: "past", dosage: "Dose not recorded; not a prescription.", date: "2026-06-15" },
  { name: "Vitamin D — sample history", condition: "Sample entry only", status: "past", dosage: "Dose not recorded; not a prescription.", date: "2026-05-20" }
];

let currentUser = null;
let dataStore;
let recordsList = [];
let medsList = [];
let activeDoctorPatient = null;
let symptomRecognition = null;
const elementCache = new Map();

function getElement(id) {
  if (!id) return null;
  if (!elementCache.has(id)) {
    elementCache.set(id, document.getElementById(id));
  }
  return elementCache.get(id);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function loadStore() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) {
    dataStore = {
      records: [],
      medicines: [],
      appointments: [],
      nextRecordId: 1,
      nextMedicineId: 1,
      nextAppointmentId: 1
    };
  } else {
    dataStore = JSON.parse(saved);
    if (!Array.isArray(dataStore.records) || !Array.isArray(dataStore.medicines)) {
      throw new Error("Saved MediCare+ data is invalid. Clear this site's storage and reload.");
    }
  }

  if (dataStore.appointments == null) dataStore.appointments = [];
  if (!Array.isArray(dataStore.appointments)) {
    throw new Error("Saved MediCare+ appointments are invalid. Clear this site's storage and reload.");
  }
  const legacyPatientId = "MH-LOCAL-0001";
  for (const item of [...dataStore.records, ...dataStore.medicines, ...dataStore.appointments]) {
    if (item.patientId === legacyPatientId) item.patientId = patientProfiles[0].id;
  }

  const legacyRecordTitles = new Set([
    "False X-Ray Scan Report", "False Cardiac Health Report", "False Sugar Pressure Summary",
    "Ambulatory Blood Pressure", "2D Echocardiogram", "HbA1c & Fasting Glucose", "Right Knee Joint X-Ray"
  ]);
  const legacyMedicineNames = new Set([
    "False Sugar Pressure Tablet", "Fake Cardiatic Control Tablet", "Demo Sugar Balance Tablet",
    "Telmisartan 40mg", "Metformin 500mg", "Glimepiride 1mg", "Atorvastatin 10mg"
  ]);
  const cleanupVersion = Number(dataStore.recordCleanupVersion) || Number(dataStore.sampleCleanupVersion) || 0;
  if (cleanupVersion < FIXTURE_CLEANUP_VERSION) {
    dataStore.records = dataStore.records.filter(record =>
      !record.isSample &&
      !record.isSimulated &&
      !record.isSimulatedDiagnosis &&
      !String(record.title || "").startsWith("Simulated ") &&
      !legacyRecordTitles.has(record.title)
    );
    dataStore.medicines = dataStore.medicines.filter(medicine => !medicine.isSample && !legacyMedicineNames.has(medicine.name));
  }
  dataStore.recordCleanupVersion = FIXTURE_CLEANUP_VERSION;
  delete dataStore.sampleCleanupVersion;
  delete dataStore.sampleDataVersion;
  dataStore.nextRecordId = Math.max(1, Number(dataStore.nextRecordId) || 1, ...dataStore.records.map(record => (Number(record.id) || 0) + 1));
  dataStore.nextMedicineId = Math.max(1, Number(dataStore.nextMedicineId) || 1, ...dataStore.medicines.map(medicine => (Number(medicine.id) || 0) + 1));
  dataStore.nextAppointmentId = Math.max(1, Number(dataStore.nextAppointmentId) || 1, ...dataStore.appointments.map(appointment => (Number(appointment.id) || 0) + 1));
  for (const record of dataStore.records) {
    if (!record.isSample || record.patientId !== patientProfiles[0].id) continue;
    if (!record.doctor) record.doctor = "Dr. Sample Clinician";
    if (record.category === "Sugar" && record.glucoseMgDl != null) {
      record.title = "Blood glucose reading";
      record.reportType = "Fasting blood glucose · sample";
      record.notes = `Sample fasting glucose value: ${record.glucoseMgDl} mg/dL. Illustrative data only; no blood test was performed.`;
    } else if (record.category === "BP" && record.systolic != null && record.diastolic != null) {
      record.title = "Blood pressure reading";
      record.reportType = "Vitals report · sample";
      record.notes = `Sample blood pressure value: ${record.systolic}/${record.diastolic} mmHg. Illustrative data only; no measurement was taken.`;
    } else if (record.category === "Cardiac") {
      record.notes = "Sample ECG report entry only. No ECG or cardiac examination was performed; no clinical finding is provided.";
    } else if (record.category === "Ortho") {
      record.notes = "Sample orthopedic X-ray report entry only. No X-ray was taken or reviewed; no image or clinical finding is provided.";
    }
  }
  if ((Number(dataStore.patientSampleDataVersion) || 0) < PATIENT_SAMPLE_DATA_VERSION) {
    for (const record of patientHistorySampleRecords) {
      if (dataStore.records.some(existing =>
        existing.isSample &&
        existing.patientId === patientProfiles[0].id &&
        existing.category === record.category &&
        existing.date === record.date &&
        existing.reportType === record.reportType
      )) continue;
      dataStore.records.push({
        ...record,
        id: dataStore.nextRecordId++,
        patientId: patientProfiles[0].id,
        doctor: record.doctor || "Dr. Sample Clinician",
        isSample: true
      });
    }
    for (const record of patientSampleRecords) {
      if (dataStore.records.some(existing =>
        existing.isSample &&
        existing.patientId === patientProfiles[0].id &&
        existing.category === record.category &&
        existing.date === record.date
      )) continue;
      dataStore.records.push({
        ...record,
        id: dataStore.nextRecordId++,
        patientId: patientProfiles[0].id,
        doctor: record.doctor || "Dr. Sample Clinician",
        isSample: true
      });
    }
    for (const medicine of patientSampleMedicines) {
      if (dataStore.medicines.some(existing =>
        existing.isSample &&
        existing.patientId === patientProfiles[0].id &&
        existing.name === medicine.name
      )) continue;
      dataStore.medicines.push({
        ...medicine,
        id: dataStore.nextMedicineId++,
        patientId: patientProfiles[0].id,
        isSample: true
      });
    }
    dataStore.patientSampleDataVersion = PATIENT_SAMPLE_DATA_VERSION;
  }

  saveStore();
}

function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(dataStore));
    return true;
  } catch (error) {
    console.error("Unable to save MediCare+ data in this browser.", error);
    alert("MediCare+ could not save data in this browser. Browser storage may be full or disabled.");
    return false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    loadStore();
  } catch (error) {
    alert(error.message);
    return;
  }

  try {
    const savedUser = JSON.parse(localStorage.getItem(USER_KEY));
    if (savedUser?.isLoggedIn && [patientProfiles[0].id, doctorProfiles[0].id].includes(savedUser?.id)) currentUser = savedUser;
  } catch (error) {
    console.warn("Clearing invalid saved MediCare+ session.", error);
    localStorage.removeItem(USER_KEY);
  }

  const dateInput = getElement("recDate");
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
  setAppointmentDateMinimum();
  updateReadingFields();

  const loginModal = getElement("loginModal");
  if (loginModal) loginModal.classList.remove("open");

  updateUserDisplay();
  getElement("authRole")?.addEventListener("change", updateLoginFields);
  updateLoginFields();
  getElement("symptomGuideForm")?.addEventListener("submit", handleSymptomGuideSubmit);
  getElement("symptomMicBtn")?.addEventListener("click", startSymptomRecognition);
  setAppView(Boolean(currentUser));
  if (currentUser) refreshDashboard();
  if (window.lucide) lucide.createIcons();
});

function refreshDashboard() {
  recordsList = getRecordsForCurrentPatient().sort((a, b) => b.date.localeCompare(a.date));
  medsList = currentUser?.role === "doctor"
    ? activeDoctorPatient
      ? dataStore.medicines.filter(medicine => medicine.patientId === activeDoctorPatient.id)
      : []
    : dataStore.medicines;
  if (currentUser?.role === "doctor") updateDoctorDashboard();

  requestAnimationFrame(() => {
    renderPatientInsights(recordsList);
    renderRecords(recordsList, "recordsContainer");
    updateCounts();
    renderMeds();
    if (currentUser?.role === "patient") {
      renderDoctorDirectory();
      renderPatientAppointments();
    }
  });
}

function setAppView(isAuthenticated) {
  document.body.classList.toggle("is-authenticated", Boolean(isAuthenticated));
  document.body.classList.toggle("doctor-mode", Boolean(isAuthenticated && currentUser?.role === "doctor"));
  const dashboard = getElement("dashboardApp");
  const home = getElement("homePage");
  if (dashboard) dashboard.setAttribute("aria-hidden", String(!isAuthenticated));
  if (home) home.setAttribute("aria-hidden", String(Boolean(isAuthenticated)));
  const doctorWorkspace = getElement("doctorWorkspace");
  const patientWorkspace = getElement("patientWorkspace");
  const isDoctor = Boolean(isAuthenticated && currentUser?.role === "doctor");
  if (!isDoctor) {
    activeDoctorPatient = null;
    document.body.classList.remove("doctor-patient-view");
  }
  if (doctorWorkspace) doctorWorkspace.setAttribute("aria-hidden", String(!isDoctor));
  if (patientWorkspace) patientWorkspace.setAttribute("aria-hidden", String(isDoctor && !document.body.classList.contains("doctor-patient-view")));
  const headerActions = document.querySelector(".nav-actions");
  if (headerActions) headerActions.classList.toggle("guest-mode", !isAuthenticated);
  if (isDoctor) updateDoctorDashboard();
  if (window.lucide) lucide.createIcons();
}

function requireLogin() {
  if (currentUser) return true;
  const loginModal = getElement("loginModal");
  if (loginModal) loginModal.classList.add("open");
  return false;
}

function openModal(id) {
  const target = getElement(id);
  const loginModal = getElement("loginModal");

  if (id !== "loginModal" && id !== "symptomGuideModal" && !currentUser) {
    if (loginModal) loginModal.classList.add("open");
    return;
  }

  if (target) {
    target.classList.add("open");
    if (window.lucide) lucide.createIcons();
  }
}

function closeModal(id) {
  const modal = getElement(id);
  if (modal) modal.classList.remove("open");
  if (id === "symptomGuideModal" && symptomRecognition) symptomRecognition.stop();
}

function getSymptomGuidance(description) {
  const urgentSymptoms = [
    /\bchest\s+(?:pain|pressure)\b/gi,
    /\b(?:(?:severe|serious|sudden)\s+)?(?:difficulty|trouble)\s+breathing\b/gi,
    /\b(?:can't|cannot|unable to)\s+breathe\b/gi,
    /\bshortness\s+of\s+breath\b/gi,
    /\b(?:face|facial)\s+droop\b|\bslurred\s+speech\b|\bsudden\s+(?:weakness|confusion)\b|\bone[- ]sided\s+weakness\b/gi,
    /\b(?:unconscious|not\s+waking|unresponsive)\b/gi,
    /\b(?:severe|heavy|uncontrolled)\s+bleeding\b/gi,
    /\b(?:seizure|convulsion)\b/gi,
    /\b(?:swollen|swelling)\s+(?:of\s+the\s+)?(?:tongue|throat)\b|\banaphylaxis\b|\bsevere\s+allergic\s+reaction\b/gi,
    /\b(?:overdose|poisoning)\b/gi,
    /\b(?:sudden|worst|severe)\s+headache\b/gi,
    /\b(?:vomit(?:ing)?\s+blood|blood\s+in\s+(?:my\s+)?(?:stool|vomit)|black\s+stools?)\b/gi,
    /\b(?:severe|sudden)\s+(?:stomach|abdominal)\s+pain\b/gi,
    /\b(?:cannot|can't|unable to)\s+(?:urinate|pass urine)\b/gi,
    /\b(?:loss of|lost)\s+(?:bladder|bowel)\s+control\b|\b(?:new|sudden)\s+(?:leg\s+)?weakness\b/gi,
    /\b(?:rash|skin rash)\b.{0,30}\b(?:blistering|peeling|purple spots)\b/gi
  ];
  const hasUrgentSymptom = urgentSymptoms.some(pattern =>
    [...description.matchAll(pattern)].some(match => {
      const beforeMatch = description.slice(0, match.index);
      return !/\b(?:no|not|never|without|denies|deny|don't have|do not have)\s+(?:any\s+)?(?:[\w'-]+\s+){0,2}$/i.test(beforeMatch);
    })
  );

  if (hasUrgentSymptom) {
    return {
      urgent: true,
      title: "Get urgent medical help now",
      message: "The symptoms you described can be warning signs of a medical emergency. This guide cannot assess how serious they are.",
      steps: [
        "Call your local emergency number or go to the nearest emergency department now.",
        "If possible, ask someone to stay with you and share when the symptoms began with the emergency team."
      ]
    };
  }

  const topicGuidance = [
    {
      title: "Fever",
      pattern: /\b(?:fever|high temperature)\b/i,
      message: "Rest, drink fluids if you can, and track your temperature and how you feel over time.",
      steps: [
        "Contact a clinician if the fever is high, lasts more than a few days, is getting worse, or affects an infant or someone with a weakened immune system.",
        "Get urgent help for confusion, a stiff neck, trouble breathing, fainting, or signs of severe dehydration."
      ]
    },
    {
      title: "Cough, cold, or sore throat",
      pattern: /\b(?:cough|cold|congestion|runny nose|sore throat)\b/i,
      message: "Rest, drink fluids as comfortable, and avoid smoke or other irritants. Warm drinks may soothe throat irritation.",
      steps: [
        "Arrange medical advice if breathing becomes difficult, symptoms worsen, a fever persists, or you are concerned because of an existing health condition.",
        "Cover coughs, wash hands, and limit close contact while you feel unwell."
      ]
    },
    {
      title: "Nausea, vomiting, or diarrhea",
      pattern: /\b(?:nausea|vomit(?:ing)?|diarr(?:hea|hoea))\b/i,
      message: "Take small, frequent sips of fluids. If you are losing fluids, an oral rehydration solution mixed exactly as its package directs may help; eat as you feel able.",
      steps: [
        "Seek prompt medical advice if you cannot keep fluids down, are urinating much less, feel faint, have severe pain, or symptoms are not improving.",
        "Blood in vomit or stool, black stool, or severe dehydration needs urgent medical assessment."
      ]
    },
    {
      title: "Headache",
      pattern: /\bheadaches?\b/i,
      message: "If it is mild and familiar, rest somewhere quiet, drink water if appropriate, and note what makes it better or worse.",
      steps: [
        "Contact a clinician for a new, recurring, worsening, or persistent headache, or if you are unsure what is safe for you.",
        "A sudden, severe headache or headache with weakness, confusion, vision loss, or trouble speaking needs urgent care."
      ]
    },
    {
      title: "Back pain",
      pattern: /\b(?:back pain|backache)\b/i,
      message: "For mild discomfort, gentle movement as tolerated and avoiding heavy lifting may be more helpful than staying in bed. A wrapped warm or cool pack may feel soothing.",
      steps: [
        "Arrange medical advice if pain is severe, follows an injury, persists, or is limiting normal activity.",
        "New leg weakness, numbness around the groin, or loss of bladder or bowel control needs urgent assessment."
      ]
    },
    {
      title: "Rash or itching",
      pattern: /\b(?:rash|itch(?:y|ing))\b/i,
      message: "Avoid any suspected new irritant, keep the area cool, and try not to scratch. Do not apply a new product if you are unsure what caused the rash.",
      steps: [
        "Contact a clinician if the rash spreads, becomes painful, looks infected, or does not improve.",
        "A rash with trouble breathing, face or throat swelling, blistering, or skin peeling needs urgent care."
      ]
    },
    {
      title: "Stomach pain",
      pattern: /\b(?:stomach|abdominal)\s+pain\b/i,
      message: "For mild discomfort, rest, take small sips of fluids, and keep track of where the pain is and whether it is changing.",
      steps: [
        "Get medical advice if pain persists, returns, worsens, or comes with fever or repeated vomiting.",
        "Sudden or severe abdominal pain, fainting, or blood in vomit or stool needs urgent assessment."
      ]
    },
    {
      title: "Pain or burning when urinating",
      pattern: /\b(?:painful|burning)\s+(?:urination|urinating|pee)\b|\bfrequent urination\b/i,
      message: "These symptoms can have different causes, so arrange an assessment with a healthcare professional rather than using leftover antibiotics or someone else's medicine.",
      steps: [
        "Seek prompt care if you also have fever, back or side pain, blood in your urine, are pregnant, or symptoms are worsening.",
        "If you cannot urinate, seek urgent medical help."
      ]
    }
  ];
  const matchedTopics = topicGuidance.filter(topic => topic.pattern.test(description)).slice(0, 2);
  if (matchedTopics.length) {
    return {
      urgent: false,
      title: `${matchedTopics.map(topic => topic.title).join(" + ")}: general self-care`,
      message: `${matchedTopics.map(topic => topic.message).join(" ")} These ideas may not fit your personal health situation.`,
      steps: [
        ...matchedTopics.flatMap(topic => topic.steps),
        "Ask a healthcare professional before starting, stopping, or changing medicines."
      ]
    };
  }

  return {
    urgent: false,
    title: "General health guidance",
    message: "A short description is not enough to identify a cause or recommend a treatment. If you feel unwell, rest, drink fluids if appropriate, and keep track of symptoms while arranging advice from a healthcare professional.",
    steps: [
      "Contact a healthcare professional if symptoms are severe, getting worse, persistent, or worrying to you.",
      "Get urgent help for chest pain, severe breathing trouble, sudden weakness, unconsciousness, or a severe allergic reaction.",
      "Do not start, stop, or change medicines based on this guide."
    ]
  };
}

function handleSymptomGuideSubmit(event) {
  event.preventDefault();
  const input = getElement("symptomInput");
  const response = getElement("symptomGuideResponse");
  const status = getElement("symptomGuideStatus");
  const title = getElement("symptomGuideResponseTitle");
  const message = getElement("symptomGuideResponseText");
  const steps = getElement("symptomGuideResponseSteps");
  const description = input?.value.trim();
  if (!description || !response || !status || !title || !message || !steps) return;

  const guidance = getSymptomGuidance(description);
  response.classList.toggle("urgent", guidance.urgent);
  title.textContent = guidance.title;
  message.textContent = guidance.message;
  steps.replaceChildren(...guidance.steps.map(step => {
    const item = document.createElement("li");
    item.textContent = step;
    return item;
  }));
  response.hidden = false;
  status.textContent = "General information only: this demo cannot diagnose, prescribe, or replace advice from a healthcare professional.";
}

function startSymptomRecognition() {
  const status = getElement("symptomGuideStatus");
  const button = getElement("symptomMicBtn");
  const input = getElement("symptomInput");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (status) status.textContent = "Speech input is not supported by this browser. Type your symptoms instead.";
    return;
  }
  if (!button || !input || !status) return;
  if (symptomRecognition) {
    symptomRecognition.stop();
    return;
  }

  const recognition = new SpeechRecognition();
  symptomRecognition = recognition;
  recognition.lang = navigator.language || "en-US";
  recognition.interimResults = false;
  recognition.onresult = event => {
    input.value = Array.from(event.results, result => result[0].transcript).join(" ").slice(0, 1000);
    status.textContent = "Speech captured. Review it for accuracy, then request general guidance.";
    input.focus();
  };
  recognition.onerror = event => {
    status.textContent = event.error === "not-allowed"
      ? "Microphone access was denied. Allow access in your browser settings or type your symptoms."
      : `Speech input failed (${event.error}). Type your symptoms instead.`;
  };
  recognition.onend = () => {
    symptomRecognition = null;
    button.querySelector("span").textContent = "Speak symptoms";
  };
  button.querySelector("span").textContent = "Listening…";
  status.textContent = "Listening. Speak your symptoms, then review the captured text.";
  try {
    recognition.start();
  } catch (error) {
    symptomRecognition = null;
    button.querySelector("span").textContent = "Speak symptoms";
    status.textContent = `Unable to start speech input (${error.message}). Type your symptoms instead.`;
  }
}

function switchTab(tabId, button) {
  if (!requireLogin()) return;
  if (!button) return;
  document.querySelectorAll(".tab-btn").forEach(item => item.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  document.getElementById(`tab-${tabId}`)?.classList.add("active");
  const categories = {
    "cardiac-view": ["Cardiac", "cardiacSpecialGrid"],
    "sugar-view": ["Sugar", "sugarSpecialGrid"],
    "bp-view": ["BP", "bpSpecialGrid"],
    "ortho-view": ["Ortho", "orthoSpecialGrid"]
  };
  if (categories[tabId]) {
    recordsList = getRecordsForCurrentPatient().sort((a, b) => b.date.localeCompare(a.date));
    renderCategoryTo(...categories[tabId]);
  } else if (tabId === "all-records") {
    recordsList = getRecordsForCurrentPatient().sort((a, b) => b.date.localeCompare(a.date));
    renderRecords(recordsList, "recordsContainer");
    updateCounts();
  } else if (tabId === "medicines") {
    medsList = currentUser?.role === "doctor"
      ? activeDoctorPatient
        ? dataStore.medicines.filter(medicine => medicine.patientId === activeDoctorPatient.id)
        : []
      : dataStore.medicines;
    renderMeds();
  }
}

function getRecordsForCurrentPatient() {
  if (currentUser?.role === "doctor") {
    return activeDoctorPatient
      ? dataStore.records.filter(record => record.patientId === activeDoctorPatient.id)
      : [];
  }
  return [...dataStore.records];
}

const doctorSections = {
  overview: { title: "Medical Overview", description: "Patient health information and recorded reports.", reports: "all" },
  "personal-information": { title: "Personal Information", description: "Patient details currently available in the record.", fields: ["Patient name", "Age / Date of birth", "Gender", "Blood group", "Contact information", "Emergency contact"] },
  vitals: { title: "Vitals & Health Parameters", description: "Blood pressure and blood sugar reports recorded for this patient.", categories: ["BP", "Sugar"] },
  "medical-history": { title: "Complete Medical History", description: "Reports and health records saved for this patient.", reports: "all" },
  diagnoses: { title: "Previous Diagnoses", description: "Recorded diagnosis entries.", diagnosis: true, empty: "No diagnoses have been recorded." },
  medicines: { title: "Current & Previous Medicines", description: "Medicine entries saved for this patient.", medicines: true },
  "lab-reports": { title: "Blood & Laboratory Reports", description: "Laboratory reports recorded for this patient.", category: "Sugar" },
  imaging: { title: "X-Ray, CT, MRI & Imaging", description: "Imaging reports recorded for this patient.", category: "Ortho" },
  cardiac: { title: "ECG & Cardiac Reports", description: "Cardiac reports recorded for this patient.", category: "Cardiac" },
  allergies: { title: "Allergies & Reactions", description: "Allergy information recorded for this patient.", fields: ["Known allergies", "Reaction details"] },
  surgeries: { title: "Surgeries & Hospitalizations", description: "Surgery and hospital records saved for this patient.", empty: "No surgery or hospitalization records have been added." },
  vaccinations: { title: "Vaccination History", description: "Vaccination records saved for this patient.", empty: "No vaccination records have been added." },
  consultations: { title: "Previous Consultations", description: "Consultation records saved for this patient.", reportType: "Consultation note", empty: "No consultation records have been added." },
  reports: { title: "Prescriptions & Doctor Reports", description: "Reports saved for this patient.", reports: "all" },
  timeline: { title: "Medical Timeline", description: "Saved reports, ordered from newest to oldest.", reports: "all" }
};

function doctorNavigate(page, button) {
  if (!requireLogin() || currentUser?.role !== "doctor") return;
  const section = doctorSections[page];
  if (!section) return;

  document.body.classList.remove("doctor-patient-view");
  getElement("doctorWorkspace")?.setAttribute("aria-hidden", "false");
  getElement("patientWorkspace")?.setAttribute("aria-hidden", "true");
  document.querySelectorAll(".doctor-nav-item").forEach(item => item.classList.remove("active"));
  const navButton = button?.classList.contains("doctor-nav-item")
    ? button
    : document.querySelector(`.doctor-nav-item[data-doctor-page="${page}"]`);
  navButton?.classList.add("active");
  const title = getElement("doctorPageTitle");
  const description = getElement("doctorSectionDescription");
  if (title) title.textContent = section.title;
  if (description) description.textContent = section.description;
  renderDoctorSection(page);
  if (window.lucide) lucide.createIcons();
}

function renderDoctorSection(page) {
  const content = getElement("doctorRecordContent");
  const section = doctorSections[page];
  if (!content || !section) return;

  if (!activeDoctorPatient) {
    content.innerHTML = '<div class="doctor-empty-state doctor-search-required"><span><i data-lucide="search"></i></span><strong>Search for a patient first</strong><p>Enter the patient ID above to load that patient’s reports and medical history.</p></div>';
    if (window.lucide) lucide.createIcons();
    return;
  }

  const reports = [...(dataStore?.records || [])]
    .filter(record => record.patientId === activeDoctorPatient.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const reportFilter = section.categories
    ? reports.filter(record => section.categories.includes(record.category))
    : section.category
      ? reports.filter(record => record.category === section.category)
    : section.diagnosis
      ? reports.filter(record => record.reportType === "Diagnosis")
    : section.reportType
      ? reports.filter(record => record.reportType === section.reportType)
      : reports;
  const reportMarkup = items => items.length
    ? `<div class="doctor-report-list">${items.map(record => `
        <article class="doctor-report-item">
          <span class="doctor-report-icon"><i data-lucide="${record.reportType === "X-ray report" ? "scan-line" : "file-text"}"></i></span>
          <div><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.reportType || record.category)} · ${escapeHtml(record.date)} · ${escapeHtml(record.doctor || "Provider not recorded")}</small>${getRecordReading(record) ? `<p class="record-reading">${getRecordReading(record)}</p>` : ""}${record.notes ? `<p>${escapeHtml(record.notes)}</p>` : ""}</div>
          <button class="doctor-secondary-action" onclick="downloadReportPdf(${Number(record.id)})"><i data-lucide="download"></i> Open report</button>
        </article>`).join("")}</div>`
    : `<div class="doctor-empty-state"><span><i data-lucide="files"></i></span><strong>No reports recorded</strong><p>Reports added to this patient record will appear here.</p></div>`;

  if (section.reports || section.category || section.categories || section.reportType) {
    content.innerHTML = reportMarkup(reportFilter);
  } else if (section.diagnosis) {
    content.innerHTML = reportMarkup(reportFilter);
  } else if (section.medicines) {
    const medicines = (dataStore?.medicines || []).filter(medicine => medicine.patientId === activeDoctorPatient.id);
    content.innerHTML = medicines.length
      ? `<div class="doctor-report-list">${medicines.map(medicine => `<article class="doctor-report-item"><span class="doctor-report-icon"><i data-lucide="pill"></i></span><div><strong>${escapeHtml(medicine.name)}</strong><small>${escapeHtml(medicine.status === "past" ? "Previous medicine" : "Current medicine")} · ${escapeHtml(medicine.condition || "Not specified")}${medicine.date ? ` · ${escapeHtml(medicine.date)}` : ""}</small><p>${escapeHtml(medicine.dosage || "No dosage details recorded.")}</p></div></article>`).join("")}</div>`
      : `<div class="doctor-empty-state"><span><i data-lucide="pill"></i></span><strong>No medicines recorded</strong><p>Medicine entries added to this patient record will appear here.</p></div>`;
  } else if (section.fields) {
    content.innerHTML = `<div class="doctor-profile-fields doctor-section-fields">${section.fields.map(field => `<div><span>${escapeHtml(field)}</span><strong>${field === "Known allergies" ? "Not recorded — confirm with the patient." : "Not recorded"}</strong></div>`).join("")}</div>`;
  } else {
    content.innerHTML = `<div class="doctor-empty-state"><span><i data-lucide="${section.icon || "folder-open"}"></i></span><strong>${escapeHtml(section.empty || "No records have been added.")}</strong><p>Only information saved in this patient record is shown here.</p></div>`;
  }
  if (window.lucide) lucide.createIcons();
}

function doctorOpenPatientTab(tabId) {
  if (!requireLogin() || currentUser?.role !== "doctor") return;
  if (!activeDoctorPatient) {
    const message = getElement("doctorPatientSearchMessage");
    if (message) message.textContent = "Search for a patient by ID before opening their reports.";
    getElement("doctorPatientSearch")?.focus();
    return;
  }
  const tabButton = document.querySelector(`.tab-btn[onclick^="switchTab('${tabId}'"]`);
  if (!tabButton) return;
  document.body.classList.add("doctor-patient-view");
  getElement("doctorWorkspace")?.setAttribute("aria-hidden", "true");
  getElement("patientWorkspace")?.setAttribute("aria-hidden", "false");
  switchTab(tabId, tabButton);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function doctorReturnToWorkspace() {
  if (currentUser?.role !== "doctor") return;
  document.body.classList.remove("doctor-patient-view");
  activeDoctorPatient = null;
  getElement("doctorWorkspace")?.setAttribute("aria-hidden", "false");
  getElement("patientWorkspace")?.setAttribute("aria-hidden", "true");
  refreshDashboard();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateDoctorDashboard() {
  const doctorProfile = doctorProfiles.find(profile => profile.id === currentUser?.id);
  const doctorName = doctorProfile?.name || currentUser?.name || "Doctor";
  for (const id of ["doctorName", "doctorAvatar"]) {
    const element = getElement(id);
    if (element) element.textContent = id === "doctorName" ? doctorName : doctorName.charAt(0).toUpperCase();
  }
  const credentials = getElement("doctorCredentialsDisplay");
  if (credentials) {
    credentials.textContent = doctorProfile
      ? `${doctorProfile.id} · ${doctorProfile.qualification} · ${doctorProfile.specialization}`
      : "Doctor account";
  }
  renderDoctorSection("overview");
}

function getLocalDateTimeInput(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function setAppointmentDateMinimum() {
  const dateInput = getElement("appointmentDateTime");
  if (dateInput) dateInput.min = getLocalDateTimeInput(new Date());
}

function renderDoctorDirectory(query = "") {
  const results = getElement("doctorDirectoryResults");
  const doctorSelect = getElement("appointmentDoctor");
  if (!results || !doctorSelect) return;

  const normalizedQuery = query.trim().toUpperCase();
  const doctors = normalizedQuery
    ? doctorProfiles.filter(profile => profile.id === normalizedQuery)
    : doctorProfiles;
  results.innerHTML = doctors.length
    ? doctors.map(profile => `
      <article class="doctor-directory-card">
        <div class="directory-card-top">
          <span class="directory-doctor-avatar"><i data-lucide="user-round"></i></span>
          <span class="directory-distance"><i data-lucide="map-pin"></i> Demo · ${profile.distanceKm.toFixed(1)} km</span>
        </div>
        <h3>${escapeHtml(profile.name)}</h3>
        <p class="directory-specialty">${escapeHtml(profile.specialization)}</p>
        <p>${escapeHtml(profile.qualification)}</p>
        <p class="directory-clinic">${escapeHtml(profile.clinic)}</p>
        <div class="directory-doctor-id">Doctor ID <strong>${escapeHtml(profile.id)}</strong></div>
        <button class="btn btn-primary" type="button" onclick="selectAppointmentDoctor('${escapeHtml(profile.id)}')">Request appointment</button>
      </article>`).join("")
    : '<div class="doctor-directory-empty">No demo doctor found with that ID. Check the ID and try again.</div>';

  const previousSelection = doctorSelect.value;
  doctorSelect.replaceChildren(...doctorProfiles.map(profile => {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = `${profile.name} — ${profile.specialization} (${profile.id})`;
    return option;
  }));
  if (doctorProfiles.some(profile => profile.id === previousSelection)) doctorSelect.value = previousSelection;
  if (window.lucide) lucide.createIcons();
}

function searchDoctorDirectory(event) {
  event.preventDefault();
  if (!requireLogin() || currentUser?.role !== "patient") return;
  const query = getElement("doctorDirectorySearch")?.value.trim().toUpperCase() || "";
  const message = getElement("doctorDirectoryMessage");
  if (!query) {
    if (message) message.textContent = "Enter a doctor ID to search.";
    return;
  }
  const match = doctorProfiles.some(profile => profile.id === query);
  renderDoctorDirectory(query);
  if (message) {
    message.textContent = match
      ? "Doctor found in the local demo directory. Profile and distance are illustrative."
      : "No exact doctor ID match. Check the ID or browse the nearby demo doctors.";
  }
}

function showNearbyDoctors() {
  if (!requireLogin() || currentUser?.role !== "patient") return;
  const search = getElement("doctorDirectorySearch");
  if (search) search.value = "";
  renderDoctorDirectory();
  const message = getElement("doctorDirectoryMessage");
  if (message) message.textContent = "Showing sample nearby doctors. Distances are illustrative, not based on your location.";
}

function selectAppointmentDoctor(doctorId) {
  if (!requireLogin() || currentUser?.role !== "patient") return;
  const doctor = doctorProfiles.find(profile => profile.id === doctorId);
  const select = getElement("appointmentDoctor");
  if (!doctor || !select) return;
  select.value = doctor.id;
  getElement("appointmentDateTime")?.focus();
  getElement("appointmentForm")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function requestAppointment(event) {
  event.preventDefault();
  if (!requireLogin() || currentUser?.role !== "patient") return;

  const doctorId = getElement("appointmentDoctor")?.value || "";
  const dateTimeInput = getElement("appointmentDateTime")?.value || "";
  const note = getElement("appointmentReason")?.value.trim() || "";
  const doctor = doctorProfiles.find(profile => profile.id === doctorId);
  const requestedDate = new Date(dateTimeInput);
  const message = getElement("appointmentMessage");
  if (!doctor || !dateTimeInput || Number.isNaN(requestedDate.getTime()) || requestedDate <= new Date()) {
    if (message) message.textContent = "Choose a demo doctor and a future date and time.";
    return;
  }

  dataStore.appointments.push({
    id: dataStore.nextAppointmentId++,
    patientId: currentUser.id,
    doctorId: doctor.id,
    dateTime: requestedDate.toISOString(),
    note,
    status: "Demo request",
    isSample: true
  });
  if (!saveStore()) return;

  getElement("appointmentForm")?.reset();
  setAppointmentDateMinimum();
  if (message) message.textContent = "Demo appointment request saved in this browser. It has not been sent to the doctor.";
  renderPatientAppointments();
}

function renderPatientAppointments() {
  const container = getElement("patientAppointments");
  if (!container) return;
  const appointments = (dataStore?.appointments || [])
    .filter(appointment => appointment.patientId === currentUser?.id)
    .sort((left, right) => left.dateTime.localeCompare(right.dateTime));
  container.innerHTML = appointments.length
    ? `<h4>Your saved demo requests</h4><div class="patient-appointment-list">${appointments.map(appointment => {
      const doctor = doctorProfiles.find(profile => profile.id === appointment.doctorId);
      return `<article class="patient-appointment-item">
        <span class="appointment-status">${escapeHtml(appointment.status || "Demo request")}</span>
        <strong>${escapeHtml(doctor?.name || appointment.doctorId)}</strong>
        <span>${escapeHtml(doctor?.specialization || "Demo doctor")} · ${escapeHtml(new Date(appointment.dateTime).toLocaleString())}</span>
        ${appointment.note ? `<small>${escapeHtml(appointment.note)}</small>` : ""}
      </article>`;
    }).join("")}</div>`
    : "";
}

function searchDoctorPatient(event) {
  event.preventDefault();
  if (!requireLogin() || currentUser?.role !== "doctor") return;

  const query = getElement("doctorPatientSearch")?.value.trim().toUpperCase() || "";
  const hasPatientRecord = query && (
    query === currentUser?.id ||
    dataStore.records.some(record => record.patientId === query) ||
    dataStore.medicines.some(medicine => medicine.patientId === query)
  );
  const message = getElement("doctorPatientSearchMessage");

  if (!hasPatientRecord) {
    activeDoctorPatient = null;
    const fields = {
      doctorPatientId: "No patient selected",
      doctorPatientName: "Not recorded",
      doctorPatientAge: "Not recorded",
      doctorPatientGender: "Not recorded",
      doctorPatientBloodGroup: "Not recorded",
      doctorPatientEmergencyContact: "Not recorded",
      doctorLastConsultation: "Not recorded"
    };
    for (const [id, value] of Object.entries(fields)) {
      const element = getElement(id);
      if (element) element.textContent = value;
    }
    if (message) message.textContent = query ? "No patient found for that ID. Check the ID and try again." : "Enter a patient ID to search.";
    refreshDashboard();
    return;
  }

  const patient = patientProfiles.find(profile => profile.id === query) || {
    id: query,
    name: "Not recorded",
    gender: "Not recorded",
    age: "Not recorded",
    bloodGroup: "Not recorded",
    emergencyContact: "Not recorded",
    lastConsultation: "Not recorded"
  };
  const fields = {
    doctorPatientId: patient.id,
    doctorPatientName: patient.name,
    doctorPatientAge: patient.age,
    doctorPatientGender: patient.gender,
    doctorPatientBloodGroup: patient.bloodGroup,
    doctorPatientEmergencyContact: patient.emergencyContact,
    doctorLastConsultation: patient.lastConsultation
  };
  activeDoctorPatient = patient;
  for (const [id, value] of Object.entries(fields)) {
    const element = getElement(id);
    if (element) element.textContent = value;
  }
  if (message) message.textContent = "Patient record loaded.";
  refreshDashboard();
}

function getBadge(category) {
  const badges = {
    Cardiac: '<span class="badge badge-cardiac"><i data-lucide="heart"></i> Cardiac</span>',
    Sugar: '<span class="badge badge-sugar"><i data-lucide="activity"></i> Sugar</span>',
    BP: '<span class="badge badge-bp"><i data-lucide="gauge"></i> BP</span>',
    Ortho: '<span class="badge badge-ortho"><i data-lucide="bone"></i> Orthopedic</span>'
  };
  return badges[category] || '<span class="badge badge-general">General</span>';
}

function getRecordReading(record) {
  if (record.glucoseMgDl != null && Number.isFinite(Number(record.glucoseMgDl))) {
    return `Blood glucose: ${escapeHtml(record.glucoseMgDl)} mg/dL`;
  }
  if (record.systolic != null && record.diastolic != null && Number.isFinite(Number(record.systolic)) && Number.isFinite(Number(record.diastolic))) {
    return `Blood pressure: ${escapeHtml(record.systolic)}/${escapeHtml(record.diastolic)} mmHg`;
  }
  return "";
}

function renderRecords(items, containerId) {
  const container = getElement(containerId);
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--slate-400);">No records saved in this section.</div>';
    return;
  }
  container.innerHTML = items.map(record => `
    <article class="record-card">
      <div>
        <div class="record-header">
          <h4 class="record-title">${escapeHtml(record.title)}</h4>
          ${getBadge(record.category)}
        </div>
        ${getRecordReading(record) ? `<p class="record-reading">${getRecordReading(record)}</p>` : ""}
        <div style="font-size:0.8rem;color:var(--slate-600);margin:0.25rem 0;">
          <i data-lucide="user-check" style="width:14px;display:inline;"></i> ${escapeHtml(record.doctor || "Self Log")}
        </div>
        <p class="record-details">${escapeHtml(record.notes || "No doctor commentary provided.")}</p>
      </div>
      <div>
        <button class="btn btn-outline" onclick="downloadReportPdf(${record.id})" style="display:inline-flex;margin-bottom:0.5rem;">
          <i data-lucide="download" style="width:14px;"></i> Read / Download PDF
        </button>
        ${record.fileName ? `<div style="font-size:0.75rem;color:var(--slate-600);margin-bottom:0.4rem;">Attachment name: ${escapeHtml(record.fileName)}</div>` : ""}
        <div class="record-footer">
          <span>Date: ${escapeHtml(record.date)}</span>
          <button class="btn btn-danger" style="padding:0.25rem 0.6rem;" onclick="deleteRecordItem(${record.id})" aria-label="Delete ${escapeHtml(record.title)}">
            <i data-lucide="trash-2" style="width:12px;"></i>
          </button>
        </div>
      </div>
    </article>
  `).join("");
  lucide.createIcons();
}

function loadRecords(category = "all") {
  if (!requireLogin()) return;
  recordsList = getRecordsForCurrentPatient().sort((a, b) => b.date.localeCompare(a.date));
  const visibleRecords = category === "all"
    ? recordsList
    : recordsList.filter(record => record.category === category);
  renderRecords(visibleRecords, "recordsContainer");
  updateCounts();
}

function renderCategoryTo(category, containerId) {
  renderRecords(recordsList.filter(record => record.category === category), containerId);
}

function filterRecords(category, button) {
  document.querySelectorAll("#filterPills .chip-btn").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  loadRecords(category);
}

function filterByCategory(category) {
  const allRecordsButton = document.querySelector(".tab-btn");
  switchTab("all-records", allRecordsButton);
  const chip = [...document.querySelectorAll("#filterPills .chip-btn")]
    .find(button => button.textContent.toLowerCase().includes(category.toLowerCase()));
  if (chip) chip.click();
}

function deleteRecordItem(id) {
  if (!requireLogin()) return;
  const record = dataStore.records.find(item => item.id === id);
  if (!record || (currentUser?.role === "doctor" && record.patientId !== activeDoctorPatient?.id)) return;
  if (!confirm("Delete this record from your vault?")) return;
  dataStore.records = dataStore.records.filter(record => record.id !== id);
  if (saveStore()) refreshDashboard();
}

function renderMeds() {
  const activeContainer = getElement("activeMedsContainer");
  const pastContainer = getElement("pastMedsContainer");
  if (!activeContainer || !pastContainer) return;
  const active = medsList.filter(medicine => medicine.status === "active");
  const past = medsList.filter(medicine => medicine.status === "past");
  activeContainer.innerHTML = active.length ? active.map(medicine => `
    <div class="med-item">
      <div>
        <div style="font-weight:700;">${escapeHtml(medicine.name)}</div>
        <div style="font-size:0.8rem;color:var(--slate-600);">${escapeHtml(medicine.condition)} | ${escapeHtml(medicine.dosage)}</div>
      </div>
      <div style="display:flex;gap:0.4rem;">
        <button class="btn btn-outline" title="Archive to past" style="padding:0.4rem;" onclick="toggleMedStatus(${medicine.id}, 'past')"><i data-lucide="archive" style="width:14px;"></i></button>
        <button class="btn btn-danger" title="Delete" style="padding:0.4rem;" onclick="deleteMedItem(${medicine.id})"><i data-lucide="trash-2" style="width:14px;"></i></button>
      </div>
    </div>`).join("") : '<p style="font-size:0.85rem;color:var(--slate-400);">No active medicines logged.</p>';
  pastContainer.innerHTML = past.length ? past.map(medicine => `
    <div class="med-item" style="opacity:0.85;">
      <div>
        <div style="font-weight:700;">${escapeHtml(medicine.name)}</div>
        <div style="font-size:0.8rem;color:var(--slate-600);">Past Condition: ${escapeHtml(medicine.condition)} | ${escapeHtml(medicine.dosage)}${medicine.date ? ` | Date: ${escapeHtml(medicine.date)}` : ""}</div>
      </div>
      <div style="display:flex;gap:0.4rem;">
        <button class="btn btn-outline" title="Reactivate" style="padding:0.4rem;" onclick="toggleMedStatus(${medicine.id}, 'active')"><i data-lucide="rotate-ccw" style="width:14px;"></i></button>
        <button class="btn btn-danger" title="Delete" style="padding:0.4rem;" onclick="deleteMedItem(${medicine.id})"><i data-lucide="trash-2" style="width:14px;"></i></button>
      </div>
    </div>`).join("") : '<p style="font-size:0.85rem;color:var(--slate-400);">No past illness medications recorded.</p>';
  lucide.createIcons();
}

function makeTrendChart(title, unit, points, color, valueLabel, secondarySeries = null) {
  if (!points.length) {
    return `<article class="insight-chart-card"><div class="insight-chart-heading"><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(unit)}</p></div></div><div class="insight-chart-empty">Add a report with numeric readings to see a trend.</div></article>`;
  }

  const width = 640;
  const height = 220;
  const padding = { top: 18, right: 18, bottom: 40, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = points.flatMap(point => secondarySeries ? [point.value, secondarySeries.getValue(point)] : [point.value]);
  const range = Math.max(1, Math.max(...values) - Math.min(...values));
  const minimum = Math.min(...values) - range * 0.2;
  const maximum = Math.max(...values) + range * 0.2;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: padding.left + (points.length === 1 ? chartWidth / 2 : index * chartWidth / (points.length - 1)),
    y: padding.top + (maximum - point.value) / (maximum - minimum) * chartHeight
  }));
  const path = coordinates.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const secondaryCoordinates = secondarySeries ? points.map((point, index) => ({
    ...point,
    x: coordinates[index].x,
    y: padding.top + (maximum - secondarySeries.getValue(point)) / (maximum - minimum) * chartHeight
  })) : [];
  const secondaryPath = secondaryCoordinates.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const grid = Array.from({ length: 4 }, (_, index) => {
    const y = padding.top + index * chartHeight / 3;
    const value = Math.round(maximum - index * (maximum - minimum) / 3);
    return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="trend-grid-line"/><text x="${padding.left - 9}" y="${y + 4}" text-anchor="end" class="trend-axis-label">${value}</text>`;
  }).join("");
  const dots = coordinates.map((point, index) => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="${color}" class="trend-point"><title>${escapeHtml(point.date)}: ${escapeHtml(valueLabel(point))}</title></circle>${secondarySeries ? `<circle cx="${secondaryCoordinates[index].x}" cy="${secondaryCoordinates[index].y}" r="4" fill="${secondarySeries.color}" class="trend-point"><title>${escapeHtml(point.date)}: ${secondarySeries.label} ${secondarySeries.getValue(point)} mmHg</title></circle>` : ""}<text x="${point.x}" y="${height - 12}" text-anchor="middle" class="trend-axis-label">${escapeHtml(point.date.slice(5))}</text>`).join("");
  const latest = points[points.length - 1];
  return `<article class="insight-chart-card">
    <div class="insight-chart-heading"><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(unit)}</p></div></div>
    <div class="insight-chart-summary"><strong>${escapeHtml(valueLabel(latest))}</strong><span>Latest reading · ${escapeHtml(latest.date)}</span></div>
    ${secondarySeries ? `<div class="trend-legend"><span><i style="--legend-color:${color}"></i> Systolic</span><span><i style="--legend-color:${secondarySeries.color}"></i> ${escapeHtml(secondarySeries.label)}</span></div>` : ""}
    <svg class="insight-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)} trend chart">
      ${grid}<path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${secondarySeries ? `<path d="${secondaryPath}" fill="none" stroke="${secondarySeries.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ""}${dots}
    </svg>
  </article>`;
}

function renderPatientInsights(records = recordsList) {
  const container = getElement("patientInsights");
  if (!container) return;
  const glucose = records
    .filter(record => record.glucoseMgDl != null && Number.isFinite(Number(record.glucoseMgDl)) && Number(record.glucoseMgDl) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(record => ({ date: record.date, value: Number(record.glucoseMgDl), isSample: record.isSample }));
  const pressure = records
    .filter(record => record.systolic != null && record.diastolic != null && Number.isFinite(Number(record.systolic)) && Number.isFinite(Number(record.diastolic)) && Number(record.systolic) > 0 && Number(record.diastolic) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(record => ({ date: record.date, value: Number(record.systolic), systolic: Number(record.systolic), diastolic: Number(record.diastolic), isSample: record.isSample }));
  const cardiacCount = records.filter(record => record.category === "Cardiac").length;
  const imagingCount = records.filter(record => record.category === "Ortho").length;
  container.innerHTML = `
    <div class="insight-section-heading"><div><span class="section-kicker">HEALTH AT A GLANCE</span><h2>Patient health overview</h2><p>Visual summaries of the records saved in this patient vault.</p></div></div>
    <div class="insight-chart-grid">
      ${makeTrendChart("Blood glucose", "mg/dL · saved readings by date", glucose, "#0e9f91", point => `${point.value} mg/dL`)}
      ${makeTrendChart("Blood pressure", "Systolic / diastolic · mmHg", pressure, "#7461d1", point => `${point.systolic}/${point.diastolic} mmHg`, {
        label: "Diastolic",
        color: "#ed9a45",
        getValue: point => point.diastolic
      })}
    </div>
    <div class="insight-summary-grid">
      <article class="insight-summary-card"><span class="insight-summary-icon cardiac"><i data-lucide="heart-pulse"></i></span><div><span>Cardiac records</span><strong>${cardiacCount}</strong><small>Saved cardiac / ECG entries</small></div></article>
      <article class="insight-summary-card"><span class="insight-summary-icon ortho"><i data-lucide="scan-line"></i></span><div><span>Imaging records</span><strong>${imagingCount}</strong><small>Saved orthopedic / imaging entries</small></div></article>
      <article class="insight-summary-card"><span class="insight-summary-icon records"><i data-lucide="files"></i></span><div><span>All records</span><strong>${records.length}</strong><small>Items in this patient vault</small></div></article>
    </div>`;
  if (window.lucide) lucide.createIcons();
}

function updateReadingFields() {
  const category = getElement("recCategory")?.value;
  const glucoseFields = getElement("glucoseReadingFields");
  const pressureFields = getElement("pressureReadingFields");
  if (glucoseFields) glucoseFields.hidden = category !== "Sugar";
  if (pressureFields) pressureFields.hidden = category !== "BP";
}

function toggleMedStatus(id, status) {
  if (!requireLogin()) return;
  const medicine = dataStore.medicines.find(item => item.id === id);
  if (!medicine || (currentUser?.role === "doctor" && medicine.patientId !== activeDoctorPatient?.id)) return;
  medicine.status = status;
  if (saveStore()) refreshDashboard();
}

function deleteMedItem(id) {
  if (!requireLogin()) return;
  const medicine = dataStore.medicines.find(item => item.id === id);
  if (!medicine || (currentUser?.role === "doctor" && medicine.patientId !== activeDoctorPatient?.id)) return;
  if (!confirm("Delete this medication?")) return;
  dataStore.medicines = dataStore.medicines.filter(medicine => medicine.id !== id);
  if (saveStore()) refreshDashboard();
}

function handleUploadSubmit(event) {
  event.preventDefault();
  if (!requireLogin()) return;

  const fileInput = getElement("fileInput");
  const recTitle = getElement("recTitle");
  const recCategory = getElement("recCategory");
  const recDoctor = getElement("recDoctor");
  const recNotes = getElement("recNotes");
  const recDate = getElement("recDate");
  const selectedFileName = getElement("selectedFileName");
  const glucoseInput = getElement("recGlucose");
  const systolicInput = getElement("recSystolic");
  const diastolicInput = getElement("recDiastolic");

  const file = fileInput?.files?.[0];
  const record = {
    id: dataStore.nextRecordId++,
    title: recTitle?.value.trim() || "",
    category: recCategory?.value || "General",
    doctor: recDoctor?.value.trim() || "",
    notes: recNotes?.value.trim() || "",
    date: recDate?.value || new Date().toISOString().slice(0, 10),
    fileName: file?.name || "",
    patientId: activeDoctorPatient?.id || currentUser?.id
  };
  if (record.category === "Sugar" && glucoseInput?.value) {
    const value = glucoseInput.valueAsNumber;
    if (Number.isFinite(value) && value > 0) record.glucoseMgDl = value;
  }
  if (record.category === "BP" && systolicInput?.value && diastolicInput?.value) {
    const systolic = systolicInput.valueAsNumber;
    const diastolic = diastolicInput.valueAsNumber;
    if (Number.isFinite(systolic) && systolic > 0 && Number.isFinite(diastolic) && diastolic > 0) {
      record.systolic = systolic;
      record.diastolic = diastolic;
    }
  }

  dataStore.records.push(record);
  if (!saveStore()) return;
  closeModal("uploadModal");
  event.target.reset();
  updateReadingFields();
  if (selectedFileName) selectedFileName.textContent = "";
  if (recDate) recDate.value = new Date().toISOString().slice(0, 10);
  refreshDashboard();
}

function handleFileSelected(input) {
  const file = input.files?.[0];
  const selectedFileName = getElement("selectedFileName");
  if (selectedFileName) {
    selectedFileName.textContent = file
      ? `Selected: ${file.name} (name only; the file itself is not uploaded)`
      : "";
  }
}

function handleMedSubmit(event) {
  event.preventDefault();
  if (!requireLogin()) return;

  const medName = getElement("medName");
  const medCondition = getElement("medCondition");
  const medStatus = getElement("medStatus");
  const medDosage = getElement("medDosage");
  const medDoc = getElement("medDoc");

  dataStore.medicines.push({
    id: dataStore.nextMedicineId++,
    name: medName?.value.trim() || "",
    condition: medCondition?.value || "General",
    status: medStatus?.value || "active",
    dosage: medDosage?.value.trim() || "",
    doctor: medDoc?.value.trim() || "",
    patientId: activeDoctorPatient?.id || currentUser?.id
  });

  if (!saveStore()) return;
  closeModal("addMedModal");
  event.target.reset();
  refreshDashboard();
}

function updateCounts() {
  for (const [category, id] of [["Cardiac", "cardiacCount"], ["Sugar", "sugarCount"], ["BP", "bpCount"], ["Ortho", "orthoCount"]]) {
    const count = recordsList.filter(record => record.category === category).length;
    const countNode = getElement(id);
    if (countNode) countNode.textContent = `${count} ${count === 1 ? "Record" : "Records"}`;
  }
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const loginMessage = getElement("loginMessage");
  const authEmail = getElement("authEmail");
  const authPin = getElement("authPin");
  const authName = getElement("authName");
  const authRole = getElement("authRole");
  const authPatientId = getElement("authPatientId");

  const email = authEmail?.value.trim().toLowerCase() || "";
  const password = authPin?.value || "";
  const role = authRole?.value || "patient";
  const expectedEmail = role === "doctor" ? "doctor@example.com" : "patient@example.com";

  if (email !== expectedEmail || password !== "pass123") {
    if (loginMessage) {
      loginMessage.textContent = `Demo ${role} sign-in only: use ${expectedEmail} and pass123.`;
      loginMessage.style.color = "var(--danger)";
    }
    return;
  }

  currentUser = {
    id: role === "doctor" ? doctorProfiles[0].id : patientProfiles[0].id,
    name: role === "doctor" ? doctorProfiles[0].name : patientProfiles[0].name,
    email,
    role,
    isLoggedIn: true
  };

  try {
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  } catch (error) {
    console.warn("Unable to persist MediCare+ login state.", error);
  }

  updateUserDisplay();
  closeModal("loginModal");
  setAppView(true);
  refreshDashboard();
  const patientId = role === "doctor" ? authPatientId?.value.trim() : "";
  if (patientId) {
    const searchInput = getElement("doctorPatientSearch");
    const searchForm = getElement("doctorPatientSearchForm");
    if (searchInput && searchForm) {
      searchInput.value = patientId;
      searchForm.requestSubmit();
    }
  }
}

function updateLoginFields() {
  const role = getElement("authRole")?.value || "patient";
  const authEmail = getElement("authEmail");
  const authName = getElement("authName");
  const patientIdGroup = getElement("loginPatientIdGroup");
  const patientIdInput = getElement("authPatientId");
  if (authEmail) authEmail.value = role === "doctor" ? "doctor@example.com" : "patient@example.com";
  if (authName) {
    authName.value = role === "doctor" ? doctorProfiles[0].name : patientProfiles[0].name;
    authName.readOnly = true;
  }
  if (patientIdGroup) patientIdGroup.hidden = role !== "doctor";
  if (patientIdInput && role !== "doctor") patientIdInput.value = "";
  const loginMessage = getElement("loginMessage");
  if (loginMessage) {
    loginMessage.textContent = role === "doctor"
      ? `Demo doctor: ${doctorProfiles[0].name} · ID ${doctorProfiles[0].id} · ${doctorProfiles[0].qualification}, ${doctorProfiles[0].specialization}. Sign in with doctor@example.com / pass123.`
      : `Demo patient: ${patientProfiles[0].name} · ID ${patientProfiles[0].id}. Sign in with patient@example.com / pass123. This page does not verify accounts; do not enter sensitive health information.`;
    loginMessage.style.color = "var(--slate-600)";
  }
}

function handleAuthClick() {
  if (!currentUser) {
    openModal("loginModal");
    return;
  }
  if (confirm(`Log out ${currentUser.name}?`)) {
    currentUser = null;
    localStorage.removeItem(USER_KEY);
    updateUserDisplay();
    setAppView(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function updateUserDisplay() {
  const profile = patientProfiles.find(item => item.id === currentUser?.id);
  const name = profile?.name || currentUser?.name || "Not provided";
  const patientNameDisplay = getElement("patientNameDisplay");
  const patientIdDisplay = getElement("patientIdDisplay");
  const avatarLetter = getElement("avatarLetter");
  const authBtnText = getElement("authBtnText");
  const patientAge = getElement("patientAge");
  const patientBloodGroup = getElement("patientBloodGroup");
  const patientEmergencyContact = getElement("patientEmergencyContact");
  const patientLastConsultation = getElement("patientLastConsultation");

  if (patientNameDisplay) patientNameDisplay.textContent = name;
  if (patientIdDisplay) patientIdDisplay.textContent = currentUser?.id || "Not signed in";
  if (avatarLetter) avatarLetter.textContent = name.charAt(0).toUpperCase();
  if (authBtnText) authBtnText.textContent = currentUser ? "Logout" : "Login";
  if (patientAge) patientAge.textContent = profile?.age || "Not recorded";
  if (patientBloodGroup) patientBloodGroup.textContent = profile?.bloodGroup || "Not recorded";
  if (patientEmergencyContact) patientEmergencyContact.textContent = profile?.emergencyContact || "Not recorded";
  if (patientLastConsultation) patientLastConsultation.textContent = profile?.lastConsultation || "Not recorded";
}

function pdfEscape(text) {
  return String(text).normalize("NFKD").replace(/[^\x20-\x7e]/g, "?")
    .replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function downloadReportPdf(id) {
  if (!requireLogin()) return;
  const report = dataStore.records.find(record => record.id === id);
  if (!report || (currentUser?.role === "doctor" && report.patientId !== activeDoctorPatient?.id)) {
    alert("This report is not available for the selected patient.");
    return;
  }
  const wrapText = (text, maxLength = 78) => {
    const output = [];
    let line = "";
    for (const word of String(text).split(/\s+/)) {
      if (line && `${line} ${word}`.length > maxLength) {
        output.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) output.push(line);
    return output;
  };
  const lines = [
    ["MediCare+ - Report", 18],
    ["", 10],
    ...wrapText(`Report: ${report.title}`).map(text => [text, 12]),
    ...wrapText(`Category: ${report.category}`).map(text => [text, 11]),
    ...(getRecordReading(report) ? wrapText(getRecordReading(report)).map(text => [text, 11]) : []),
    ...wrapText(`Date: ${report.date}`).map(text => [text, 11]),
    ...wrapText(`Provider: ${report.doctor || "Not specified"}`).map(text => [text, 11]),
    ["", 10],
    ["Notes:", 12],
    ...wrapText(report.notes || "No notes provided.").map(text => [text, 11])
  ];
  const pages = [];
  for (let offset = 0; offset < lines.length; offset += 34) pages.push(lines.slice(offset, offset + 34));
  const pageObjectIds = pages.map((_, index) => 4 + index * 2);
  const objects = new Array(3 + pages.length * 2);
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  pages.forEach((pageLines, index) => {
    const pageId = pageObjectIds[index];
    const contentId = pageId + 1;
    const commands = [];
    let y = 750;
    for (const [text, size] of pageLines) {
      if (text) commands.push(`BT /F1 ${size} Tf 50 ${y} Td (${pdfEscape(text)}) Tj ET`);
      y -= size >= 14 ? 25 : 19;
    }
    const stream = commands.join("\n");
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId - 1] = `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`;
  });
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  link.download = `digimedvault-report-${id}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function generateConsultSummary() {
  if (!requireLogin()) return;

  const summaryContent = getElement("summaryContent");
  if (!summaryContent) return;

  const activeMeds = medsList.filter(medicine => medicine.status === "active");
  const pastMeds = medsList.filter(medicine => medicine.status === "past");
  const countFor = category => recordsList.filter(record => record.category === category).length;
  summaryContent.innerHTML = `
    <h3 style="margin-bottom:0.5rem;">MediCare+ Consultation Brief</h3>
    <p style="font-size:0.8rem;color:var(--slate-600);margin-bottom:1rem;">Patient: <strong>${escapeHtml(currentUser.name)}</strong> | ID: <strong>${escapeHtml(currentUser.id)}</strong></p>
    <h4 style="color:var(--primary);margin-top:0.75rem;">1. Saved Records by Category</h4>
    <ul style="padding-left:1.25rem;">
      <li><strong>Cardiac:</strong> ${countFor("Cardiac")} records saved</li>
      <li><strong>Blood Sugar:</strong> ${countFor("Sugar")} records saved</li>
      <li><strong>Blood Pressure:</strong> ${countFor("BP")} records saved</li>
      <li><strong>Orthopedic:</strong> ${countFor("Ortho")} records saved</li>
    </ul>
    <h4 style="color:var(--primary);margin-top:0.75rem;">2. Active Medication Entries</h4>
    <ul style="padding-left:1.25rem;">${activeMeds.length ? activeMeds.map(m => `<li><strong>${escapeHtml(m.name)}</strong> (${escapeHtml(m.condition)}) — ${escapeHtml(m.dosage)}</li>`).join("") : "<li>None</li>"}</ul>
    <h4 style="color:var(--primary);margin-top:0.75rem;">3. Past Medication Entries</h4>
    <ul style="padding-left:1.25rem;">${pastMeds.length ? pastMeds.map(m => `<li><strong>${escapeHtml(m.name)}</strong> (${escapeHtml(m.condition)}) — ${escapeHtml(m.dosage)}</li>`).join("") : "<li>None</li>"}</ul>
    <p><strong>Review all information with the patient. This local record is not a substitute for a verified medical record.</strong></p>`;
  openModal("summaryModal");
}
