const STORAGE_KEY = "novel-recall-board:v1";
const APP_VERSION = "0.3.0";
const RULES_VERSION = "2026-05-13-feedback-a";
const DEFAULT_FEEDBACK_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbwuu-lJ7XrmGKGV6_qzhm6cgd_V3zt7FFWLTByuNCqANdOrDjuYQTTkpX0pAt0JAYPR/exec";
const LEGACY_SAMPLE_PROJECT_NAME = "呼称と登場履歴トラッカー";
const LEGACY_SAMPLE_CHARACTER_IDS = new Set(["char_aoi", "char_mika", "char_hayate"]);
const LEGACY_SAMPLE_SCENE_IDS = new Set(["scene_01", "scene_02"]);
const MATRIX_NAME_MAX_CHARS = 8;
const TAB_ORDER = ["scenes", "source", "appellations", "overview", "timeline", "terms", "settings"];
const MOBILE_MEDIA_QUERY = "(max-width: 860px)";

const palette = ["#2f7d68", "#3068a8", "#c14d64", "#8a681a", "#5f5aa2", "#2f6f8f"];
const honorifics = ["さん", "くん", "君", "ちゃん", "様", "先生", "先輩", "後輩", "博士", "隊長", "殿"];
const nameEndingChars = "子美花華奈菜乃香莉里希音愛結優咲凛葵真歩穂沙紗那夏佳恵江代郎朗太也哉介輔助斗翔樹司平織耶望秋";
const candidateStopwords = new Set([
  "これ",
  "それ",
  "あれ",
  "ここ",
  "そこ",
  "どこ",
  "こと",
  "もの",
  "ため",
  "よう",
  "こっち",
  "そっち",
  "どっち",
  "こちら",
  "そちら",
  "久しぶり",
  "ありがとう",
  "ごめん",
  "すみません",
  "いや",
  "あ",
  "え",
  "わ",
  "お",
  "おっ",
  "えー",
  "え、あ",
  "んっ",
  "あっ、あっ",
  "はい",
  "うん",
  "あー",
  "そうか",
  "おう",
  "先輩",
  "恋愛",
  "キス",
  "セックス",
  "コート",
  "掃除フェラ",
  "散々セックス",
  "下ネタ",
  "手コキ",
  "二人",
  "様子",
  "現実",
  "欲望",
  "以上",
  "大丈夫",
  "多分",
  "挨拶",
  "特別活動",
  "正直",
  "悲鳴",
  "指導",
  "残念",
  "後日親御",
  "同",
  "可愛",
  "両サイド",
  "手マン",
  "音ゲ",
  "女子テニス",
  "こんにちは",
  "こんにちはー",
  "バイバイ",
  "oh",
  "キスミー",
  "クラス",
  "各クラス",
  "い",
  "そ",
  "ええ",
  "ううん",
  "おねー",
  "はおねー",
  "一途アピール",
  "相手ナンバーワン",
  "一旦摩耶",
  "一応貫太郎",
  "太郎",
  "双子",
]);

const sampleState = {
  projectName: "無題の作品",
  sourceText: "",
  nameExtractionMode: "strict",
  ignoredNames: [],
  profileSettings: {
    builtIns: { name: true, aliases: true, firstPerson: true, color: true, notes: true },
    customFields: [],
  },
  characters: [],
  scenes: [],
  terms: [],
  appellations: {},
  appellationHiddenCharacterIds: [],
  appellationSelectedCharacterId: "",
  selectedCharacterId: null,
  selectedSceneId: null,
  selectedTermId: null,
  activeTab: "scenes",
  feedbackClientId: "",
  feedbackProjectId: "",
  feedbackQueue: [],
};

let state = normalizeState(loadState());
let saveTimer = null;
let sourceNameCandidates = [];
let sourceAppellationCandidates = [];
let aliasesExpanded = false;
let characterDragId = "";
let sceneTextUndo = null;
let mobileCharacterListOpen = true;
let mobileSceneListOpen = true;

const els = {
  projectName: document.querySelector("#projectName"),
  characterList: document.querySelector("#characterList"),
  characterListToggleButton: document.querySelector("#characterListToggleButton"),
  addCharacterButton: document.querySelector("#addCharacterButton"),
  characterForm: document.querySelector("#characterForm"),
  characterNameField: document.querySelector("#characterNameField"),
  characterName: document.querySelector("#characterName"),
  aliasToggleButton: document.querySelector("#aliasToggleButton"),
  aliasAccordion: document.querySelector("#aliasAccordion"),
  aliasInputList: document.querySelector("#aliasInputList"),
  addAliasButton: document.querySelector("#addAliasButton"),
  characterFirstPersonField: document.querySelector("#characterFirstPersonField"),
  characterFirstPerson: document.querySelector("#characterFirstPerson"),
  characterColorField: document.querySelector("#characterColorField"),
  characterColor: document.querySelector("#characterColor"),
  characterNotesField: document.querySelector("#characterNotesField"),
  characterNotes: document.querySelector("#characterNotes"),
  customProfileFields: document.querySelector("#customProfileFields"),
  deleteCharacterConfirm: document.querySelector("#deleteCharacterConfirm"),
  deleteCharacterButton: document.querySelector("#deleteCharacterButton"),
  selectedCharacterHistory: document.querySelector("#selectedCharacterHistory"),
  tabs: [...document.querySelectorAll(".tab")],
  panels: [...document.querySelectorAll(".tab-panel")],
  statsGrid: document.querySelector("#statsGrid"),
  overviewSort: document.querySelector("#overviewSort"),
  lastSeenGrid: document.querySelector("#lastSeenGrid"),
  sourceText: document.querySelector("#sourceText"),
  sourceSceneSelect: document.querySelector("#sourceSceneSelect"),
  sourceCountWithWhitespace: document.querySelector("#sourceCountWithWhitespace"),
  sourceCountWithoutWhitespace: document.querySelector("#sourceCountWithoutWhitespace"),
  nameExtractionMode: document.querySelector("#nameExtractionMode"),
  extractNamesButton: document.querySelector("#extractNamesButton"),
  extractAppellationsButton: document.querySelector("#extractAppellationsButton"),
  clearSourceButton: document.querySelector("#clearSourceButton"),
  sourceNameCandidates: document.querySelector("#sourceNameCandidates"),
  checkAllSourceNameCandidatesButton: document.querySelector("#checkAllSourceNameCandidatesButton"),
  uncheckAllSourceNameCandidatesButton: document.querySelector("#uncheckAllSourceNameCandidatesButton"),
  addSourceNameCandidatesButton: document.querySelector("#addSourceNameCandidatesButton"),
  ignoreSourceNameCandidatesButton: document.querySelector("#ignoreSourceNameCandidatesButton"),
  ignoredNameList: document.querySelector("#ignoredNameList"),
  sendFeedbackButton: document.querySelector("#sendFeedbackButton"),
  clearSentFeedbackButton: document.querySelector("#clearSentFeedbackButton"),
  feedbackPendingBadge: document.querySelector("#feedbackPendingBadge"),
  feedbackQueueList: document.querySelector("#feedbackQueueList"),
  sourceAppellationCandidates: document.querySelector("#sourceAppellationCandidates"),
  addSourceAppellationCandidatesButton: document.querySelector("#addSourceAppellationCandidatesButton"),
  addSceneButton: document.querySelector("#addSceneButton"),
  sceneList: document.querySelector("#sceneList"),
  sceneListToggleButton: document.querySelector("#sceneListToggleButton"),
  sceneForm: document.querySelector("#sceneForm"),
  sceneTitle: document.querySelector("#sceneTitle"),
  sceneToolsToggleButton: document.querySelector("#sceneToolsToggleButton"),
  sceneTools: document.querySelector("#sceneTools"),
  sceneSummary: document.querySelector("#sceneSummary"),
  toggleReplaceButton: document.querySelector("#toggleReplaceButton"),
  replacePanel: document.querySelector("#replacePanel"),
  replaceSearch: document.querySelector("#replaceSearch"),
  replaceValue: document.querySelector("#replaceValue"),
  applyReplaceButton: document.querySelector("#applyReplaceButton"),
  indentParagraphsButton: document.querySelector("#indentParagraphsButton"),
  undoSceneTextButton: document.querySelector("#undoSceneTextButton"),
  sceneText: document.querySelector("#sceneText"),
  sceneCountWithWhitespace: document.querySelector("#sceneCountWithWhitespace"),
  sceneCountWithoutWhitespace: document.querySelector("#sceneCountWithoutWhitespace"),
  sceneCharacterChecks: document.querySelector("#sceneCharacterChecks"),
  detectCharactersButton: document.querySelector("#detectCharactersButton"),
  deleteSceneConfirm: document.querySelector("#deleteSceneConfirm"),
  deleteSceneButton: document.querySelector("#deleteSceneButton"),
  appellationForm: document.querySelector("#appellationForm"),
  fromCharacter: document.querySelector("#fromCharacter"),
  toCharacter: document.querySelector("#toCharacter"),
  appellationValue: document.querySelector("#appellationValue"),
  appellationNote: document.querySelector("#appellationNote"),
  appellationScene: document.querySelector("#appellationScene"),
  clearAppellationButton: document.querySelector("#clearAppellationButton"),
  hideSelectedMatrixCharacterButton: document.querySelector("#hideSelectedMatrixCharacterButton"),
  hiddenMatrixCharacters: document.querySelector("#hiddenMatrixCharacters"),
  appellationMatrix: document.querySelector("#appellationMatrix"),
  timelineCharacter: document.querySelector("#timelineCharacter"),
  timelinePartner: document.querySelector("#timelinePartner"),
  timelineQuery: document.querySelector("#timelineQuery"),
  timelineList: document.querySelector("#timelineList"),
  addTermButton: document.querySelector("#addTermButton"),
  termList: document.querySelector("#termList"),
  termForm: document.querySelector("#termForm"),
  termName: document.querySelector("#termName"),
  termSceneMatches: document.querySelector("#termSceneMatches"),
  addTermAliasButton: document.querySelector("#addTermAliasButton"),
  searchTermScenesButton: document.querySelector("#searchTermScenesButton"),
  termAliasList: document.querySelector("#termAliasList"),
  termDetails: document.querySelector("#termDetails"),
  deleteTermConfirm: document.querySelector("#deleteTermConfirm"),
  deleteTermButton: document.querySelector("#deleteTermButton"),
  profileFieldSettingsList: document.querySelector("#profileFieldSettingsList"),
  addProfileFieldButton: document.querySelector("#addProfileFieldButton"),
  supportButton: document.querySelector("#supportButton"),
  supportBanner: document.querySelector("#supportBanner"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput"),
  resetButton: document.querySelector("#resetButton"),
  toast: document.querySelector("#toast"),
};

bindEvents();
render();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return sampleState;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(error);
    return sampleState;
  }
}

function normalizeState(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : sampleState;
  const base = cloneState(source);
  removeLegacySampleState(base);
  base.projectName = base.projectName || "無題の作品";
  base.sourceText = base.sourceText || "";
  base.sourceSceneId = typeof base.sourceSceneId === "string" ? base.sourceSceneId : "";
  base.nameExtractionMode = ["strict", "balanced", "wide"].includes(base.nameExtractionMode) ? base.nameExtractionMode : "strict";
  base.ignoredNames = Array.isArray(base.ignoredNames) ? base.ignoredNames.filter((name) => typeof name === "string") : [];
  base.profileSettings = normalizeProfileSettings(base.profileSettings);
  base.characters = Array.isArray(base.characters) ? base.characters.filter(isPlainObject).map(normalizeCharacter) : [];
  ensureUniqueIds(base.characters, "char");
  base.scenes = Array.isArray(base.scenes) ? base.scenes.filter(isPlainObject).map((scene) => normalizeScene(scene, base)) : [];
  ensureUniqueIds(base.scenes, "scene");
  base.terms = Array.isArray(base.terms) ? base.terms.filter(isPlainObject).map((term) => normalizeTerm(term, base)) : [];
  ensureUniqueIds(base.terms, "term");
  base.appellations = normalizeAppellations(base.appellations, base);
  base.appellationHiddenCharacterIds = Array.isArray(base.appellationHiddenCharacterIds) ? base.appellationHiddenCharacterIds : [];
  base.appellationHiddenCharacterIds = base.appellationHiddenCharacterIds.filter((id) => base.characters.some((character) => character.id === id));
  base.appellationSelectedCharacterId =
    base.characters.some((character) => character.id === base.appellationSelectedCharacterId) &&
    !base.appellationHiddenCharacterIds.includes(base.appellationSelectedCharacterId)
    ? base.appellationSelectedCharacterId
    : "";
  delete base.feedbackEndpoint;
  base.feedbackClientId = base.feedbackClientId || createId("client");
  base.feedbackProjectId = base.feedbackProjectId || createId("project");
  base.feedbackQueue = Array.isArray(base.feedbackQueue) ? base.feedbackQueue.map(normalizeFeedbackItem) : [];
  base.selectedCharacterId = findCharacter(base.selectedCharacterId, base)?.id || base.characters[0]?.id || null;
  if (!base.appellationSelectedCharacterId && base.selectedCharacterId && !base.appellationHiddenCharacterIds.includes(base.selectedCharacterId)) {
    base.appellationSelectedCharacterId = base.selectedCharacterId;
  }
  base.sourceSceneId = findScene(base.sourceSceneId, base)?.id || "";
  base.selectedSceneId = findScene(base.selectedSceneId, base)?.id || base.scenes[0]?.id || null;
  base.selectedTermId = findTerm(base.selectedTermId, base)?.id || base.terms[0]?.id || null;
  base.activeTab = TAB_ORDER.includes(base.activeTab) ? base.activeTab : "scenes";
  return base;
}

function removeLegacySampleState(base) {
  if (!isLegacySampleState(base)) return;
  base.projectName = "無題の作品";
  base.sourceText = "";
  base.ignoredNames = [];
  base.characters = [];
  base.scenes = [];
  base.terms = [];
  base.appellations = {};
  base.selectedCharacterId = null;
  base.selectedSceneId = null;
  base.selectedTermId = null;
  base.activeTab = "scenes";
}

function isLegacySampleState(base) {
  const characterIds = Array.isArray(base.characters) ? base.characters.map((character) => character.id) : [];
  const sceneIds = Array.isArray(base.scenes) ? base.scenes.map((scene) => scene.id) : [];
  return (
    base.projectName === LEGACY_SAMPLE_PROJECT_NAME &&
    characterIds.length === LEGACY_SAMPLE_CHARACTER_IDS.size &&
    sceneIds.length === LEGACY_SAMPLE_SCENE_IDS.size &&
    characterIds.every((id) => LEGACY_SAMPLE_CHARACTER_IDS.has(id)) &&
    sceneIds.every((id) => LEGACY_SAMPLE_SCENE_IDS.has(id))
  );
}

function normalizeProfileSettings(settings) {
  const builtIns = settings?.builtIns && typeof settings.builtIns === "object" ? settings.builtIns : {};
  const customFields = Array.isArray(settings?.customFields) ? settings.customFields : [];
  return {
    builtIns: {
      name: true,
      aliases: builtIns.aliases !== false,
      firstPerson: builtIns.firstPerson !== false,
      color: builtIns.color !== false,
      notes: builtIns.notes !== false,
    },
    customFields: customFields
      .filter((field) => field && typeof field === "object")
      .map((field) => ({
        id: field.id || createId("profile"),
        label: typeof field.label === "string" ? field.label : "",
      })),
  };
}

function normalizeCharacter(character) {
  const profileValues = isPlainObject(character.profileValues) ? character.profileValues : {};
  return {
    ...character,
    id: typeof character.id === "string" && character.id ? character.id : createId("char"),
    name: typeof character.name === "string" && character.name.trim() ? character.name : "無題のキャラ",
    aliases: Array.isArray(character.aliases) ? character.aliases.filter((alias) => typeof alias === "string") : [],
    firstPerson: typeof character.firstPerson === "string" ? character.firstPerson : "",
    color: typeof character.color === "string" && character.color ? character.color : "#2f7d68",
    notes: typeof character.notes === "string" ? character.notes : "",
    profileValues,
  };
}

function normalizeScene(scene, source = state) {
  const characterIds = new Set((source.characters || []).map((character) => character.id));
  return {
    ...scene,
    id: typeof scene.id === "string" && scene.id ? scene.id : createId("scene"),
    chapter: typeof scene.chapter === "string" ? scene.chapter : "",
    title: typeof scene.title === "string" && scene.title.trim() ? scene.title : "1話",
    summary: typeof scene.summary === "string" ? scene.summary : "",
    text: typeof scene.text === "string" ? scene.text : "",
    characters: Array.isArray(scene.characters) ? scene.characters.filter((id) => characterIds.has(id)) : [],
    createdAt: typeof scene.createdAt === "string" ? scene.createdAt : new Date().toISOString(),
    updatedAt: typeof scene.updatedAt === "string" ? scene.updatedAt : new Date().toISOString(),
  };
}

function normalizeTerm(term, source = state) {
  const normalized = {
    ...term,
    id: typeof term.id === "string" && term.id ? term.id : createId("term"),
    name: typeof term.name === "string" ? term.name : "",
    aliases: Array.isArray(term.aliases) ? term.aliases.filter((alias) => typeof alias === "string") : [],
    details: typeof term.details === "string" ? term.details : "",
    sceneMatches: Array.isArray(term.sceneMatches) ? term.sceneMatches : [],
  };
  normalized.sceneMatches = normalized.sceneMatches
    .filter((match) => match && findScene(match.sceneId, source))
    .map((match) => ({
      sceneId: match.sceneId,
      index: Number.isFinite(match.index) ? match.index : 0,
      matched: typeof match.matched === "string" ? match.matched : "",
    }));
  return normalized;
}

function normalizeAppellations(appellations, source = state) {
  if (!isPlainObject(appellations)) return {};
  const output = {};
  Object.entries(appellations).forEach(([fromId, row]) => {
    if (!findCharacter(fromId, source) || !isPlainObject(row)) return;
    Object.entries(row).forEach(([toId, entry]) => {
      if (!findCharacter(toId, source) || !isPlainObject(entry)) return;
      output[fromId] ||= {};
      output[fromId][toId] = {
        value: typeof entry.value === "string" ? entry.value : "",
        note: typeof entry.note === "string" ? entry.note : "",
        sceneId: findScene(entry.sceneId, source)?.id || "",
      };
    });
  });
  return output;
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function ensureUniqueIds(items, prefix) {
  const seen = new Set();
  items.forEach((item) => {
    if (!item.id || seen.has(item.id)) item.id = createId(prefix);
    seen.add(item.id);
  });
}

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function persistSoon() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, 120);
}

function persistNow() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  els.projectName.addEventListener("input", () => {
    state.projectName = els.projectName.value.trimStart();
    persistSoon();
  });

  els.characterListToggleButton.addEventListener("click", () => {
    mobileCharacterListOpen = !mobileCharacterListOpen;
    updateMobileAccordions();
  });

  els.addCharacterButton.addEventListener("click", () => {
    const character = createCharacter(`新規キャラ${state.characters.length + 1}`);
    state.characters.push(character);
    state.selectedCharacterId = character.id;
    state.appellationSelectedCharacterId = character.id;
    persistNow();
    render();
    els.characterName.focus();
    els.characterName.select();
  });

  els.characterForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  [els.characterName, els.characterFirstPerson, els.characterColor, els.characterNotes].forEach((control) => {
    control.addEventListener("input", () => {
      updateSelectedCharacterFromForm();
    });
  });

  els.characterForm.addEventListener("input", (event) => {
    if (!event.target.matches("[data-alias-index], [data-custom-profile-id]")) return;
    updateSelectedCharacterFromForm();
  });

  els.characterForm.addEventListener("click", (event) => {
    const toggle = event.target.closest("#aliasToggleButton");
    if (toggle) {
      aliasesExpanded = !aliasesExpanded;
      renderAliasAccordion(selectedCharacter());
      return;
    }

    const addAlias = event.target.closest("#addAliasButton");
    if (addAlias) {
      const character = selectedCharacter();
      if (!character) return;
      character.aliases.push("");
      aliasesExpanded = true;
      persistSoon();
      renderAliasAccordion(character);
      const inputs = els.aliasInputList.querySelectorAll("[data-alias-index]");
      inputs[inputs.length - 1]?.focus();
      return;
    }

    const deleteAlias = event.target.closest("[data-delete-alias]");
    if (deleteAlias) {
      const character = selectedCharacter();
      if (!character) return;
      character.aliases.splice(Number(deleteAlias.dataset.deleteAlias), 1);
      persistSoon();
      renderAliasAccordion(character);
      renderCharacters();
    }
  });

  els.deleteCharacterButton.addEventListener("click", () => {
    const character = selectedCharacter();
    if (!character || !els.deleteCharacterConfirm.checked) return;
    state.characters = state.characters.filter((item) => item.id !== character.id);
    state.scenes = state.scenes.map((scene) => ({
      ...scene,
      characters: scene.characters.filter((id) => id !== character.id),
    }));
    delete state.appellations[character.id];
    Object.values(state.appellations).forEach((row) => delete row[character.id]);
    state.appellationHiddenCharacterIds = (state.appellationHiddenCharacterIds || []).filter((id) => id !== character.id);
    if (state.appellationSelectedCharacterId === character.id) state.appellationSelectedCharacterId = "";
    state.selectedCharacterId = state.characters[0]?.id || null;
    state.appellationSelectedCharacterId = state.selectedCharacterId || "";
    persistNow();
    render();
  });

  els.deleteCharacterConfirm.addEventListener("change", updateDeleteCharacterButtonState);

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeTab = tab.dataset.tab;
      persistNow();
      renderTabs();
    });
  });

  els.addProfileFieldButton.addEventListener("click", () => {
    state.profileSettings.customFields.push({
      id: createId("profile"),
      label: "",
    });
    persistNow();
    renderProfileSettings();
    renderCharacterForm();
    const inputs = els.profileFieldSettingsList.querySelectorAll("[data-custom-profile-label]");
    inputs[inputs.length - 1]?.focus();
  });

  els.profileFieldSettingsList.addEventListener("input", (event) => {
    const builtIn = event.target.closest("[data-built-in-profile]");
    if (builtIn) {
      state.profileSettings.builtIns[builtIn.dataset.builtInProfile] = builtIn.checked;
      persistSoon();
      renderCharacterForm();
      return;
    }

    const customLabel = event.target.closest("[data-custom-profile-label]");
    if (!customLabel) return;
    const field = state.profileSettings.customFields.find((item) => item.id === customLabel.dataset.customProfileLabel);
    if (!field) return;
    field.label = customLabel.value.trimStart();
    persistSoon();
    renderCharacterForm();
  });

  els.profileFieldSettingsList.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-profile-field]");
    if (!deleteButton) return;
    const id = deleteButton.dataset.deleteProfileField;
    state.profileSettings.customFields = state.profileSettings.customFields.filter((field) => field.id !== id);
    state.characters.forEach((character) => {
      if (character.profileValues) delete character.profileValues[id];
    });
    persistNow();
    renderProfileSettings();
    renderCharacterForm();
  });

  els.overviewSort.addEventListener("change", renderOverview);

  els.sourceText.addEventListener("input", () => {
    state.sourceText = els.sourceText.value;
    state.sourceSceneId = "";
    els.sourceSceneSelect.value = "";
    renderSourceCounts();
    persistSoon();
  });

  els.sourceSceneSelect.addEventListener("change", () => {
    const scene = findScene(els.sourceSceneSelect.value);
    state.sourceSceneId = scene?.id || "";
    if (scene) {
      state.sourceText = scene.text || "";
      sourceNameCandidates = [];
      sourceAppellationCandidates = [];
      els.sourceText.value = state.sourceText;
      renderSourceCounts();
      renderSourceNameCandidates();
      renderSourceAppellationCandidates();
    }
    persistNow();
  });

  els.nameExtractionMode.addEventListener("change", () => {
    state.nameExtractionMode = els.nameExtractionMode.value;
    sourceNameCandidates = [];
    persistNow();
    renderSourceNameCandidates();
  });

  els.extractNamesButton.addEventListener("click", () => {
    state.sourceText = els.sourceText.value;
    renderSourceCounts();
    state.nameExtractionMode = els.nameExtractionMode.value;
    sourceNameCandidates = extractCharacterCandidates(state.sourceText, state.nameExtractionMode);
    renderSourceNameCandidates();
    toast(`${sourceNameCandidates.length}件の名前候補を抽出しました`);
    persistSoon();
  });

  els.checkAllSourceNameCandidatesButton.addEventListener("click", () => {
    setSourceNameCandidateChecks(true);
  });

  els.uncheckAllSourceNameCandidatesButton.addEventListener("click", () => {
    setSourceNameCandidateChecks(false);
  });

  els.addSourceNameCandidatesButton.addEventListener("click", () => {
    const names = checkedSourceNameCandidates();
    if (!names.length) {
      toast("追加する候補がありません");
      return;
    }
    const added = addCharactersFromNames(names);
    sourceNameCandidates = sourceNameCandidates.filter((candidate) => !isRegisteredName(candidate.name) && !isIgnoredName(candidate.name));
    state.selectedCharacterId = added[0]?.id || state.selectedCharacterId;
    persistNow();
    render();
    toast(`${added.length}人をキャラクターに追加しました`);
  });

  els.ignoreSourceNameCandidatesButton.addEventListener("click", () => {
    const names = checkedSourceNameCandidates();
    if (!names.length) {
      toast("除外する候補がありません");
      return;
    }
    names.forEach((name) => ignoreNameCandidate(name, { silent: true }));
    persistNow();
    renderSourceNameCandidates();
    renderIgnoredNames();
    renderFeedbackPanel();
    toast(`${names.length}件を名前候補から除外しました`);
  });

  els.sourceNameCandidates.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ignore-name]");
    if (!button) return;
    ignoreNameCandidate(button.dataset.ignoreName);
  });

  els.sourceNameCandidates.addEventListener("change", (event) => {
    if (!event.target.matches("input[type='checkbox']")) return;
    updateSourceNameCandidateActionState();
  });

  els.ignoredNameList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-restore-name]");
    if (!button) return;
    restoreIgnoredName(button.dataset.restoreName);
  });

  els.sendFeedbackButton.addEventListener("click", () => {
    sendFeedback();
  });

  els.clearSentFeedbackButton.addEventListener("click", () => {
    clearSentFeedback();
  });

  els.extractAppellationsButton.addEventListener("click", () => {
    state.sourceText = els.sourceText.value;
    renderSourceCounts();
    sourceAppellationCandidates = extractAppellationCandidates(state.sourceText);
    renderSourceAppellationCandidates();
    toast(`${sourceAppellationCandidates.length}件の呼称候補を抽出しました`);
    persistSoon();
  });

  els.addSourceAppellationCandidatesButton.addEventListener("click", () => {
    const candidates = checkedSourceAppellationCandidates();
    if (!candidates.length) {
      toast("反映する候補がありません");
      return;
    }
    const count = applyAppellationCandidates(candidates);
    persistNow();
    render();
    toast(`${count}件を呼称表へ反映しました`);
  });

  els.clearSourceButton.addEventListener("click", () => {
    state.sourceText = "";
    state.sourceSceneId = "";
    sourceNameCandidates = [];
    sourceAppellationCandidates = [];
    persistNow();
    render();
  });

  els.sceneListToggleButton.addEventListener("click", () => {
    mobileSceneListOpen = !mobileSceneListOpen;
    updateMobileAccordions();
  });

  els.addSceneButton.addEventListener("click", () => {
    const now = new Date().toISOString();
    const episodeNumber = nextSceneEpisodeNumber();
    const scene = {
      id: createId("scene"),
      chapter: "",
      title: `${episodeNumber}話`,
      summary: "",
      text: "",
      characters: state.selectedCharacterId ? [state.selectedCharacterId] : [],
      createdAt: now,
      updatedAt: now,
    };
    state.scenes.push(scene);
    state.selectedSceneId = scene.id;
    state.activeTab = "scenes";
    persistNow();
    render();
    els.sceneTitle.focus();
    els.sceneTitle.select();
  });

  els.sceneForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  [els.sceneTitle, els.sceneSummary, els.sceneText].forEach((control) => {
    control.addEventListener("input", () => {
      if (control === els.sceneText && sceneTextUndo?.sceneId === selectedScene()?.id) {
        sceneTextUndo = null;
        updateSceneUndoButtonState();
      }
      updateSelectedSceneFromForm();
    });
  });

  els.sceneToolsToggleButton.addEventListener("click", () => {
    const expanded = els.sceneTools.hidden;
    els.sceneTools.hidden = !expanded;
    els.sceneToolsToggleButton.setAttribute("aria-expanded", String(expanded));
  });

  els.toggleReplaceButton.addEventListener("click", () => {
    const expanded = els.replacePanel.hidden;
    els.replacePanel.hidden = !expanded;
    els.toggleReplaceButton.setAttribute("aria-expanded", String(expanded));
    if (expanded) els.replaceSearch.focus();
  });

  els.applyReplaceButton.addEventListener("click", () => {
    applySceneReplacement();
  });

  els.indentParagraphsButton.addEventListener("click", () => {
    applySceneParagraphIndent();
  });

  els.undoSceneTextButton.addEventListener("click", () => {
    undoSceneTextChange();
  });

  els.sceneCharacterChecks.addEventListener("change", (event) => {
    if (!event.target.matches("input[type='checkbox']")) return;
    updateSelectedSceneFromForm({ renderChecks: false });
  });

  els.sceneCharacterChecks.addEventListener("click", (event) => {
    const button = event.target.closest("[data-scene-character-id]");
    if (!button) return;
    selectCharacterFromScenePicker(button.dataset.sceneCharacterId);
  });

  els.detectCharactersButton.addEventListener("click", () => {
    const detected = detectCharacterIds(els.sceneText.value);
    const detectedIds = new Set(detected);
    [...els.sceneCharacterChecks.querySelectorAll("input[type='checkbox']")].forEach((input) => {
      input.checked = detectedIds.has(input.value);
    });
    updateSelectedSceneFromForm({ renderChecks: false });
    toast(`${detected.length}人のチェックを有効にしました`);
  });

  els.deleteSceneButton.addEventListener("click", () => {
    const scene = selectedScene();
    if (!scene || !els.deleteSceneConfirm.checked) return;
    state.scenes = state.scenes.filter((item) => item.id !== scene.id);
    Object.values(state.appellations).forEach((row) => {
      Object.values(row).forEach((entry) => {
        if (entry.sceneId === scene.id) entry.sceneId = "";
      });
    });
    state.terms.forEach((term) => {
      term.sceneMatches = (term.sceneMatches || []).filter((match) => match.sceneId !== scene.id);
    });
    state.selectedSceneId = state.scenes[0]?.id || null;
    persistNow();
    render();
  });

  els.deleteSceneConfirm.addEventListener("change", updateDeleteSceneButtonState);

  els.appellationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const fromId = els.fromCharacter.value;
    const toId = els.toCharacter.value;
    if (!fromId || !toId) return;
    if (fromId === toId) {
      const character = findCharacter(fromId);
      if (!character) return;
      character.firstPerson = els.appellationValue.value.trim();
      persistNow();
      renderCharacterForm();
      renderAppellations();
      renderOverview();
      toast("一人称を保存しました");
      return;
    }
    state.appellations[fromId] ||= {};
    state.appellations[fromId][toId] = {
      value: els.appellationValue.value.trim(),
      note: els.appellationNote.value.trim(),
      sceneId: els.appellationScene.value,
    };
    persistNow();
    renderAppellations();
    toast("呼称を保存しました");
  });

  [els.fromCharacter, els.toCharacter].forEach((select) => {
    select.addEventListener("change", renderAppellationEditor);
  });

  els.clearAppellationButton.addEventListener("click", () => {
    const fromId = els.fromCharacter.value;
    const toId = els.toCharacter.value;
    if (!fromId || !toId) return;
    if (fromId === toId) {
      const character = findCharacter(fromId);
      if (!character) return;
      character.firstPerson = "";
      persistNow();
      renderCharacterForm();
      renderAppellations();
      renderOverview();
      return;
    }
    if (!state.appellations[fromId]) return;
    delete state.appellations[fromId][toId];
    persistNow();
    renderAppellations();
  });

  els.hideSelectedMatrixCharacterButton.addEventListener("click", () => {
    const characterId = state.appellationSelectedCharacterId;
    if (!findCharacter(characterId)) return;
    state.appellationHiddenCharacterIds ||= [];
    if (!state.appellationHiddenCharacterIds.includes(characterId)) {
      state.appellationHiddenCharacterIds.push(characterId);
    }
    state.appellationSelectedCharacterId = "";
    persistNow();
    renderMatrix();
  });

  els.hiddenMatrixCharacters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-show-matrix-character]");
    if (!button) return;
    const id = button.dataset.showMatrixCharacter;
    state.appellationHiddenCharacterIds = (state.appellationHiddenCharacterIds || []).filter((item) => item !== id);
    persistNow();
    renderMatrix();
  });

  [els.timelineCharacter, els.timelinePartner, els.timelineQuery].forEach((control) => {
    control.addEventListener("input", renderTimeline);
    control.addEventListener("change", renderTimeline);
  });

  els.addTermButton.addEventListener("click", () => {
    const term = createTerm(`新規用語${state.terms.length + 1}`);
    state.terms.push(term);
    state.selectedTermId = term.id;
    state.activeTab = "terms";
    persistNow();
    render();
    els.termName.focus();
    els.termName.select();
  });

  els.termForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  [els.termName, els.termDetails].forEach((control) => {
    control.addEventListener("input", updateSelectedTermFromForm);
  });

  els.termAliasList.addEventListener("input", (event) => {
    if (!event.target.matches("[data-term-alias-index]")) return;
    updateSelectedTermFromForm();
  });

  els.termAliasList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-term-alias]");
    if (!button) return;
    const term = selectedTerm();
    if (!term) return;
    term.aliases.splice(Number(button.dataset.deleteTermAlias), 1);
    persistNow();
    renderTermForm();
  });

  els.addTermAliasButton.addEventListener("click", () => {
    const term = selectedTerm();
    if (!term) return;
    updateSelectedTermFromForm();
    term.aliases.push("");
    persistNow();
    renderTermForm();
    const inputs = els.termAliasList.querySelectorAll("[data-term-alias-index]");
    inputs[inputs.length - 1]?.focus();
  });

  els.searchTermScenesButton.addEventListener("click", () => {
    searchSelectedTermScenes();
  });

  els.termSceneMatches.addEventListener("click", (event) => {
    const button = event.target.closest("[data-term-scene-id]");
    if (!button) return;
    goToTermScene(button.dataset.termSceneId);
  });

  els.deleteTermButton.addEventListener("click", () => {
    const term = selectedTerm();
    if (!term || !els.deleteTermConfirm.checked) return;
    state.terms = state.terms.filter((item) => item.id !== term.id);
    state.selectedTermId = state.terms[0]?.id || null;
    persistNow();
    renderTerms();
  });

  els.deleteTermConfirm.addEventListener("change", updateDeleteTermButtonState);

  els.supportButton.addEventListener("click", () => {
    const willShow = els.supportBanner.hidden;
    els.supportBanner.hidden = !willShow;
    els.supportButton.setAttribute("aria-expanded", String(willShow));
  });

  els.exportButton.addEventListener("click", exportJson);
  els.importInput.addEventListener("change", importJson);

  els.resetButton.addEventListener("click", () => {
    const ok = confirm("保存済みデータを空の作品に戻しますか？");
    if (!ok) return;
    state = normalizeState(sampleState);
    persistNow();
    render();
    toast("初期化しました");
  });

  window.matchMedia(MOBILE_MEDIA_QUERY).addEventListener("change", updateMobileAccordions);
}

function render() {
  els.projectName.value = state.projectName;
  els.sourceText.value = state.sourceText;
  els.nameExtractionMode.value = state.nameExtractionMode;
  renderSourceCounts();
  renderSourceSceneOptions();
  renderTabs();
  renderProfileSettings();
  renderCharacters();
  renderCharacterForm();
  renderSourceNameCandidates();
  renderIgnoredNames();
  renderFeedbackPanel();
  renderSourceAppellationCandidates();
  renderSceneList();
  renderSceneForm();
  renderAppellations();
  renderTimelineControls();
  renderTimeline();
  renderTerms();
  renderOverview();
  updateMobileAccordions();
}

function renderTabs() {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === state.activeTab));
  els.panels.forEach((panel) => {
    const tabName = panel.id.replace("Panel", "");
    panel.classList.toggle("active", tabName === state.activeTab);
  });
}

function isMobileLayout() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function updateMobileAccordions() {
  const mobile = isMobileLayout();
  const sync = (button, panel, open) => {
    button.setAttribute("aria-expanded", String(mobile ? open : true));
    panel.hidden = mobile ? !open : false;
  };
  sync(els.characterListToggleButton, els.characterList, mobileCharacterListOpen);
  sync(els.sceneListToggleButton, els.sceneList, mobileSceneListOpen);
}

function renderProfileSettings() {
  const builtInLabels = {
    name: "名前",
    aliases: "あだ名",
    firstPerson: "一人称",
    color: "色",
    notes: "備考",
  };

  const builtIns = Object.entries(builtInLabels)
    .map(
      ([key, label]) => `
        <label class="settings-row">
          <input type="checkbox" data-built-in-profile="${escapeAttr(key)}" ${profileFieldVisible(key) ? "checked" : ""} ${key === "name" ? "disabled" : ""} />
          <span>${escapeHtml(label)}</span>
        </label>
      `,
    )
    .join("");

  const customFields = state.profileSettings.customFields.length
    ? state.profileSettings.customFields
        .map(
          (field) => `
            <div class="settings-row custom-setting-row">
              <input class="control" data-custom-profile-label="${escapeAttr(field.id)}" type="text" value="${escapeAttr(field.label)}" placeholder="項目名" />
              <button class="mini-button danger" type="button" data-delete-profile-field="${escapeAttr(field.id)}">削除</button>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">追加項目なし</div>`;

  els.profileFieldSettingsList.innerHTML = `
    <div class="settings-section">
      <h3>基本項目</h3>
      ${builtIns}
    </div>
    <div class="settings-section">
      <h3>追加項目</h3>
      ${customFields}
    </div>
  `;
}

function renderCharacters() {
  if (!state.characters.length) {
    els.characterList.innerHTML = `<div class="empty-state">キャラクターなし</div>`;
    return;
  }

  els.characterList.innerHTML = state.characters
    .map((character) => {
      const count = scenesForCharacter(character.id).length;
      const active = character.id === state.selectedCharacterId ? " active" : "";
      return `
        <button class="character-card${active}" type="button" draggable="true" data-character-id="${escapeAttr(character.id)}">
          <strong><span class="color-dot" style="background:${escapeAttr(character.color)}"></span>${escapeHtml(character.name)}</strong>
          <span class="character-meta">${count}シーン / ${escapeHtml(character.aliases.join("、") || "別名なし")}</span>
        </button>
      `;
    })
    .join("");

  els.characterList.querySelectorAll("[data-character-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectCharacterFromList(button.dataset.characterId);
    });
    button.addEventListener("dragstart", (event) => {
      characterDragId = button.dataset.characterId;
      button.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", characterDragId);
    });
    button.addEventListener("dragover", (event) => {
      if (!characterDragId || characterDragId === button.dataset.characterId) return;
      event.preventDefault();
      const position = characterDropPosition(event, button);
      clearCharacterDropMarkers();
      button.classList.add(position === "after" ? "drag-over-after" : "drag-over-before");
      event.dataTransfer.dropEffect = "move";
    });
    button.addEventListener("dragleave", () => {
      button.classList.remove("drag-over-before", "drag-over-after");
    });
    button.addEventListener("drop", (event) => {
      if (!characterDragId) return;
      event.preventDefault();
      const targetId = button.dataset.characterId;
      const position = characterDropPosition(event, button);
      const moved = moveCharacter(characterDragId, targetId, position);
      characterDragId = "";
      clearCharacterDropMarkers();
      if (moved) {
        persistNow();
        render();
      }
    });
    button.addEventListener("dragend", () => {
      characterDragId = "";
      clearCharacterDropMarkers();
    });
  });
}

function selectCharacterFromList(characterId) {
  if (!findCharacter(characterId)) return;
  state.selectedCharacterId = characterId;
  state.appellationSelectedCharacterId = characterId;
  state.appellationHiddenCharacterIds = (state.appellationHiddenCharacterIds || []).filter((id) => id !== characterId);
  aliasesExpanded = false;
  if (isMobileLayout()) mobileCharacterListOpen = false;
  persistNow();
  render();
}

function selectCharacterFromScenePicker(characterId) {
  if (!findCharacter(characterId)) return;
  state.selectedCharacterId = characterId;
  state.appellationSelectedCharacterId = characterId;
  state.appellationHiddenCharacterIds = (state.appellationHiddenCharacterIds || []).filter((id) => id !== characterId);
  aliasesExpanded = false;
  persistNow();
  renderCharacters();
  renderCharacterForm();
  renderSceneCharacterChecks(selectedScene());
  renderAppellations();
  renderOverview();
}

function characterDropPosition(event, element) {
  const rect = element.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2 ? "after" : "before";
}

function clearCharacterDropMarkers() {
  els.characterList.querySelectorAll(".dragging, .drag-over-before, .drag-over-after").forEach((card) => {
    card.classList.remove("dragging", "drag-over-before", "drag-over-after");
  });
}

function moveCharacter(dragId, targetId, position) {
  if (!dragId || !targetId || dragId === targetId) return false;
  const fromIndex = state.characters.findIndex((character) => character.id === dragId);
  const targetIndex = state.characters.findIndex((character) => character.id === targetId);
  if (fromIndex < 0 || targetIndex < 0) return false;

  const [moved] = state.characters.splice(fromIndex, 1);
  const targetIndexAfterRemoval = state.characters.findIndex((character) => character.id === targetId);
  const insertIndex = position === "after" ? targetIndexAfterRemoval + 1 : targetIndexAfterRemoval;
  state.characters.splice(insertIndex, 0, moved);
  return true;
}

function renderCharacterForm() {
  const character = selectedCharacter();
  const disabled = !character;
  [els.characterName, els.aliasToggleButton, els.addAliasButton, els.characterFirstPerson, els.characterColor, els.characterNotes, els.deleteCharacterConfirm].forEach((control) => {
    control.disabled = disabled;
  });
  els.deleteCharacterConfirm.checked = false;
  updateDeleteCharacterButtonState();

  els.characterNameField.hidden = !profileFieldVisible("name");
  els.aliasToggleButton.hidden = !profileFieldVisible("aliases");
  els.characterFirstPersonField.hidden = !profileFieldVisible("firstPerson");
  els.characterColorField.hidden = !profileFieldVisible("color");
  els.characterNotesField.hidden = !profileFieldVisible("notes");

  if (!character) {
    els.characterName.value = "";
    els.characterFirstPerson.value = "";
    els.characterColor.value = "#2f7d68";
    els.characterNotes.value = "";
    els.aliasAccordion.hidden = true;
    els.aliasInputList.innerHTML = "";
    els.customProfileFields.innerHTML = "";
    els.selectedCharacterHistory.innerHTML = `<div class="empty-state">未選択</div>`;
    return;
  }

  els.characterName.value = character.name;
  els.characterFirstPerson.value = character.firstPerson || "";
  els.characterColor.value = character.color || "#2f7d68";
  els.characterNotes.value = character.notes || "";
  renderAliasAccordion(character);
  renderCustomProfileFields(character);

  const scenes = scenesForCharacter(character.id);
  els.selectedCharacterHistory.innerHTML = scenes.length
    ? scenes
        .map(
          (scene) => `
            <div class="history-row">
              <strong>${escapeHtml(sceneLabel(scene))}</strong>
              <span class="muted">${escapeHtml(excerptForCharacter(scene, character) || "本文なし")}</span>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">登場なし</div>`;
}

function updateDeleteCharacterButtonState() {
  els.deleteCharacterButton.disabled = !selectedCharacter() || !els.deleteCharacterConfirm.checked;
}

function renderAliasAccordion(character) {
  const showAliases = Boolean(character && profileFieldVisible("aliases") && aliasesExpanded);
  els.aliasAccordion.hidden = !showAliases;
  els.aliasToggleButton.setAttribute("aria-expanded", String(showAliases));
  els.aliasToggleButton.textContent = showAliases ? "あだ名を閉じる" : "あだ名";
  if (!showAliases) {
    els.aliasInputList.innerHTML = "";
    return;
  }

  els.aliasInputList.innerHTML = character.aliases.length
    ? character.aliases
        .map(
          (alias, index) => `
            <div class="alias-row">
              <input class="control" data-alias-index="${index}" type="text" value="${escapeAttr(alias)}" placeholder="あだ名・別名" autocomplete="off" />
              <button class="mini-button danger" type="button" data-delete-alias="${index}">削除</button>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">あだ名なし</div>`;
}

function renderCustomProfileFields(character) {
  const fields = state.profileSettings.customFields.filter((field) => field.label.trim());
  els.customProfileFields.innerHTML = fields.length
    ? fields
        .map(
          (field) => `
            <label>
              <span>${escapeHtml(field.label)}</span>
              <input class="control" data-custom-profile-id="${escapeAttr(field.id)}" type="text" value="${escapeAttr(character.profileValues?.[field.id] || "")}" autocomplete="off" />
            </label>
          `,
        )
        .join("")
    : "";
}

function updateSelectedCharacterFromForm() {
  const character = selectedCharacter();
  if (!character) return;
  character.name = els.characterName.value.trim() || character.name;
  if (!els.aliasAccordion.hidden) {
    character.aliases = [...els.aliasInputList.querySelectorAll("[data-alias-index]")]
      .map((input) => input.value.trim())
      .filter(Boolean);
  }
  character.firstPerson = els.characterFirstPerson.value.trim();
  character.color = els.characterColor.value || character.color;
  character.notes = els.characterNotes.value.trim();
  character.profileValues ||= {};
  els.customProfileFields.querySelectorAll("[data-custom-profile-id]").forEach((input) => {
    character.profileValues[input.dataset.customProfileId] = input.value.trim();
  });
  restoreIgnoredName(character.name, { silent: true });
  persistSoon();
  renderCharacters();
  renderCharacterOptions(els.timelineCharacter, true, "すべて");
  renderCharacterOptions(els.timelinePartner, true, "指定なし");
  renderAppellations();
  renderTimeline();
  renderOverview();
}

function renderOverview() {
  const stats = {
    キャラ: state.characters.length,
    シーン: state.scenes.length,
    登場記録: state.scenes.reduce((total, scene) => total + scene.characters.length, 0),
    呼称: countAppellations(),
  };

  els.statsGrid.innerHTML = Object.entries(stats)
    .map(
      ([label, value]) => `
        <div class="stat-card">
          <span class="stat-value">${value}</span>
          <span class="stat-label">${label}</span>
        </div>
      `,
    )
    .join("");

  const lastSeen = state.characters.map((character) => {
    const scenes = scenesForCharacter(character.id);
    const scene = scenes.at(-1);
    return { character, scene, index: scene ? state.scenes.findIndex((item) => item.id === scene.id) : -1 };
  });

  if (els.overviewSort.value === "name") {
    lastSeen.sort((a, b) => a.character.name.localeCompare(b.character.name, "ja"));
  } else {
    lastSeen.sort((a, b) => b.index - a.index);
  }

  els.lastSeenGrid.innerHTML = lastSeen.length
    ? lastSeen
        .map(({ character, scene, index }) => {
          const title = scene ? sceneLabel(scene) : "未登場";
          const quote = scene ? excerptForCharacter(scene, character) : "";
          return `
            <article class="last-card">
              <div class="last-card-header">
                <strong><span class="color-dot" style="background:${escapeAttr(character.color)}"></span>${escapeHtml(character.name)}</strong>
                <span class="last-chip">${index >= 0 ? `${index + 1}番目` : "なし"}</span>
              </div>
              <p class="last-summary">${escapeHtml(scene?.summary || character.notes || "記録なし")}</p>
              <div class="scene-meta">${escapeHtml(title)}</div>
              ${quote ? `<p class="quote">${highlight(quote, namesForCharacter(character))}</p>` : ""}
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">キャラクターなし</div>`;
}

function renderSourceCounts() {
  const text = els.sourceText.value || "";
  const counts = countCharacters(text);
  els.sourceCountWithWhitespace.textContent = `空白、改行含む ${counts.withWhitespace.toLocaleString("ja-JP")}文字`;
  els.sourceCountWithoutWhitespace.textContent = `空白、改行なし ${counts.withoutWhitespace.toLocaleString("ja-JP")}文字`;
}

function renderSourceSceneOptions() {
  const current = state.sourceSceneId || "";
  els.sourceSceneSelect.innerHTML = [
    `<option value="">シーンを選択</option>`,
    ...state.scenes.map((scene) => `<option value="${escapeAttr(scene.id)}">${escapeHtml(sceneLabel(scene))}</option>`),
  ].join("");
  els.sourceSceneSelect.value = findScene(current) ? current : "";
  els.sourceSceneSelect.disabled = !state.scenes.length;
}

function renderSourceNameCandidates() {
  const candidates = sourceNameCandidates.filter((candidate) => !isRegisteredName(candidate.name) && !isIgnoredName(candidate.name));
  els.sourceNameCandidates.innerHTML = candidates.length
    ? candidates
        .map(
          (candidate) => `
            <div class="candidate-pill">
              <label class="candidate-check" aria-label="${escapeAttr(candidate.name)}を選択">
                <input type="checkbox" value="${escapeAttr(candidate.name)}" />
              </label>
              <span class="candidate-copy">
                <strong class="candidate-name">${escapeHtml(candidate.name)}</strong>
                <span class="candidate-meta">${candidate.count}回 / ${escapeHtml(candidate.reasons.join("、"))} / score ${candidate.score}</span>
              </span>
              <button class="mini-button danger" type="button" data-ignore-name="${escapeAttr(candidate.name)}">人名ではない</button>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">候補なし</div>`;
  updateSourceNameCandidateActionState();
}

function renderIgnoredNames() {
  const ignored = [...new Set(state.ignoredNames || [])].sort((a, b) => a.localeCompare(b, "ja"));
  els.ignoredNameList.innerHTML = ignored.length
    ? ignored
        .map(
          (name) => `
            <div class="ignored-name-row">
              <strong>${escapeHtml(name)}</strong>
              <button class="mini-button" type="button" data-restore-name="${escapeAttr(name)}">解除</button>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">除外語なし</div>`;
}

function renderFeedbackPanel() {
  const pending = feedbackPendingItems();
  const sent = (state.feedbackQueue || []).filter((item) => item.status === "sent");
  els.feedbackPendingBadge.textContent = `未送信 ${pending.length}`;
  els.sendFeedbackButton.disabled = !pending.length;
  els.clearSentFeedbackButton.disabled = !sent.length;

  const latest = [...(state.feedbackQueue || [])].slice(-8).reverse();
  els.feedbackQueueList.innerHTML = latest.length
    ? latest
        .map((item) => {
          const status = item.status === "sent" ? "送信済み" : "未送信";
          const decision = item.decision === "accepted_name" ? "名前" : "人名ではない";
          return `
            <div class="feedback-row">
              <div class="feedback-copy">
                <strong class="candidate-name">${escapeHtml(item.normalized || item.surface)}</strong>
                <span class="candidate-meta">${escapeHtml(decision)} / ${escapeHtml(item.reasons.join("、") || "手動")}</span>
              </div>
              <span class="feedback-status">${escapeHtml(status)}</span>
            </div>
          `;
        })
        .join("")
    : `<div class="empty-state">まだフィードバックはありません</div>`;
}

function renderSourceAppellationCandidates() {
  els.addSourceAppellationCandidatesButton.disabled = !sourceAppellationCandidates.length;
  els.sourceAppellationCandidates.innerHTML = sourceAppellationCandidates.length
    ? sourceAppellationCandidates
        .map((candidate) => {
          const from = findCharacter(candidate.fromId);
          const to = findCharacter(candidate.toId);
          return `
            <label class="appellation-candidate">
              <input type="checkbox" value="${escapeAttr(candidate.key)}" checked />
              <span>
                <strong>${escapeHtml(from?.name || "不明")} → ${escapeHtml(to?.name || "不明")}</strong>
                <span class="appellation-value">${escapeHtml(candidate.value)}</span>
                <span class="candidate-meta">${escapeHtml(candidate.excerpt)}</span>
              </span>
            </label>
          `;
        })
        .join("")
    : `<div class="empty-state">候補なし</div>`;
}

function renderSceneList() {
  if (!state.scenes.length) {
    els.sceneList.innerHTML = `<div class="empty-state">シーンなし</div>`;
    return;
  }

  els.sceneList.innerHTML = state.scenes
    .map((scene, index) => {
      const active = scene.id === state.selectedSceneId ? " active" : "";
      const names = scene.characters.map((id) => findCharacter(id)?.name).filter(Boolean);
      return `
        <button class="scene-card${active}" type="button" data-scene-id="${escapeAttr(scene.id)}">
          <strong>${index + 1}. ${escapeHtml(sceneLabel(scene))}</strong>
          <span class="scene-meta">${escapeHtml(names.join("、") || "登場キャラ未設定")}</span>
        </button>
      `;
    })
    .join("");

  els.sceneList.querySelectorAll("[data-scene-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSceneId = button.dataset.sceneId;
      if (isMobileLayout()) mobileSceneListOpen = false;
      persistNow();
      render();
    });
  });
}

function renderSceneForm() {
  const scene = selectedScene();
  const disabled = !scene;
  [
    els.sceneTitle,
    els.sceneToolsToggleButton,
    els.sceneSummary,
    els.toggleReplaceButton,
    els.replaceSearch,
    els.replaceValue,
    els.applyReplaceButton,
    els.indentParagraphsButton,
    els.undoSceneTextButton,
    els.sceneText,
    els.detectCharactersButton,
    els.deleteSceneConfirm,
  ].forEach((control) => {
    control.disabled = disabled;
  });
  els.deleteSceneConfirm.checked = false;
  updateDeleteSceneButtonState();
  updateSceneUndoButtonState();

  renderSceneCharacterChecks(scene);

  if (!scene) {
    els.sceneTitle.value = "";
    els.sceneSummary.value = "";
    els.sceneText.value = "";
    els.replaceSearch.value = "";
    els.replaceValue.value = "";
    els.replacePanel.hidden = true;
    els.toggleReplaceButton.setAttribute("aria-expanded", "false");
    els.sceneTools.hidden = true;
    els.sceneToolsToggleButton.setAttribute("aria-expanded", "false");
    renderSceneCounts();
    return;
  }

  els.sceneTitle.value = scene.title || "";
  els.sceneSummary.value = scene.summary || "";
  els.sceneText.value = scene.text || "";
  renderSceneCounts();
}

function updateDeleteSceneButtonState() {
  els.deleteSceneButton.disabled = !selectedScene() || !els.deleteSceneConfirm.checked;
}

function renderSceneCounts() {
  const text = els.sceneText.value || "";
  const counts = countCharacters(text);
  els.sceneCountWithWhitespace.textContent = `空白、改行含む ${counts.withWhitespace.toLocaleString("ja-JP")}文字`;
  els.sceneCountWithoutWhitespace.textContent = `空白、改行なし ${counts.withoutWhitespace.toLocaleString("ja-JP")}文字`;
}

function applySceneReplacement() {
  const scene = selectedScene();
  const search = els.replaceSearch.value;
  if (!scene || !search) return;
  const replacement = els.replaceValue.value;
  const before = els.sceneText.value;
  const count = countExactOccurrences(before, search);
  if (!count) {
    toast("置換対象はありません");
    return;
  }
  pushSceneTextUndo("置換");
  els.sceneText.value = before.split(search).join(replacement);
  updateSelectedSceneFromForm();
  toast(`${count.toLocaleString("ja-JP")}件を置換しました`);
}

function applySceneParagraphIndent() {
  const scene = selectedScene();
  if (!scene) return;
  const before = els.sceneText.value;
  const after = indentParagraphs(before);
  if (before === after) {
    toast("字下げする段落はありません");
    return;
  }
  pushSceneTextUndo("段落の字下げ");
  els.sceneText.value = after;
  updateSelectedSceneFromForm();
  toast("段落の字下げを反映しました");
}

function pushSceneTextUndo(label) {
  const scene = selectedScene();
  if (!scene) return;
  sceneTextUndo = {
    sceneId: scene.id,
    text: els.sceneText.value,
    label,
  };
  updateSceneUndoButtonState();
}

function undoSceneTextChange() {
  if (!sceneTextUndo) return;
  const scene = findScene(sceneTextUndo.sceneId);
  if (!scene || selectedScene()?.id !== scene.id) {
    sceneTextUndo = null;
    updateSceneUndoButtonState();
    return;
  }
  els.sceneText.value = sceneTextUndo.text;
  const label = sceneTextUndo.label || "直前操作";
  sceneTextUndo = null;
  updateSelectedSceneFromForm();
  updateSceneUndoButtonState();
  toast(`${label}を戻しました`);
}

function updateSceneUndoButtonState() {
  const scene = selectedScene();
  els.undoSceneTextButton.disabled = !scene || !sceneTextUndo || sceneTextUndo.sceneId !== scene.id;
}

function updateSelectedSceneFromForm(options = {}) {
  const scene = selectedScene();
  if (!scene) return;
  scene.chapter = "";
  scene.title = els.sceneTitle.value.trim() || scene.title || `${state.scenes.indexOf(scene) + 1}話`;
  scene.summary = els.sceneSummary.value.trim();
  scene.text = els.sceneText.value;
  scene.characters = checkedCharacterIds();
  scene.updatedAt = new Date().toISOString();
  renderSceneCounts();
  persistSoon();
  renderSceneList();
  renderSourceSceneOptions();
  renderSceneOptions(els.appellationScene);
  renderTimelineControls();
  renderTimeline();
  renderOverview();
  if (options.renderChecks) renderSceneCharacterChecks(scene);
}

function renderSceneCharacterChecks(scene) {
  if (!state.characters.length) {
    els.sceneCharacterChecks.innerHTML = `<div class="empty-state">キャラクターなし</div>`;
    return;
  }

  const selected = new Set(scene?.characters || []);
  els.sceneCharacterChecks.innerHTML = state.characters
    .map(
      (character) => {
        const active = character.id === state.selectedCharacterId ? " active" : "";
        return `
          <div class="check-pill scene-character-pill">
            <input type="checkbox" value="${escapeAttr(character.id)}" ${selected.has(character.id) ? "checked" : ""} aria-label="${escapeAttr(character.name)}を登場キャラに含める" />
            <button class="scene-character-select${active}" type="button" data-scene-character-id="${escapeAttr(character.id)}">
              <span class="color-dot" style="background:${escapeAttr(character.color)}"></span>${escapeHtml(character.name)}
            </button>
          </div>
        `;
      },
    )
    .join("");
}

function renderAppellations() {
  renderCharacterOptions(els.fromCharacter, false);
  renderCharacterOptions(els.toCharacter, false);
  renderSceneOptions(els.appellationScene);

  if (!els.fromCharacter.value && state.characters[0]) els.fromCharacter.value = state.characters[0].id;
  if (!els.toCharacter.value) els.toCharacter.value = state.characters[1]?.id || state.characters[0]?.id || "";

  renderAppellationEditor();
  renderMatrix();
}

function renderAppellationEditor() {
  const fromId = els.fromCharacter.value;
  const toId = els.toCharacter.value;
  const isFirstPerson = Boolean(fromId && toId && fromId === toId);
  const entry = isFirstPerson ? {} : state.appellations[fromId]?.[toId] || {};
  const disabled = !fromId || !toId;
  els.appellationValue.disabled = disabled;
  els.clearAppellationButton.disabled = disabled;
  els.appellationNote.disabled = disabled || isFirstPerson;
  els.appellationScene.disabled = disabled || isFirstPerson;
  els.appellationValue.placeholder = isFirstPerson ? "一人称" : "";
  els.appellationValue.value = isFirstPerson ? findCharacter(fromId)?.firstPerson || "" : entry.value || "";
  els.appellationNote.value = isFirstPerson ? "" : entry.note || "";
  els.appellationScene.value = isFirstPerson ? "" : entry.sceneId || "";
}

function renderMatrix() {
  if (!state.characters.length) {
    els.hideSelectedMatrixCharacterButton.disabled = true;
    els.hiddenMatrixCharacters.innerHTML = "";
    els.appellationMatrix.innerHTML = `<div class="empty-state">キャラクターなし</div>`;
    return;
  }

  const hiddenIds = new Set(state.appellationHiddenCharacterIds || []);
  const visibleCharacters = state.characters.filter((character) => !hiddenIds.has(character.id));
  const hiddenCharacters = state.characters.filter((character) => hiddenIds.has(character.id));
  const selectedId = findCharacter(state.appellationSelectedCharacterId) && !hiddenIds.has(state.appellationSelectedCharacterId)
    ? state.appellationSelectedCharacterId
    : "";
  if (state.appellationSelectedCharacterId !== selectedId) state.appellationSelectedCharacterId = selectedId;
  els.hideSelectedMatrixCharacterButton.disabled = !selectedId;
  els.hiddenMatrixCharacters.innerHTML = hiddenCharacters.length
    ? hiddenCharacters
        .map(
          (character) => `
            <button class="mini-button" type="button" data-show-matrix-character="${escapeAttr(character.id)}">
              ${escapeHtml(character.name)}を表示
            </button>
          `,
        )
        .join("")
    : "";

  if (!visibleCharacters.length) {
    els.appellationMatrix.innerHTML = `<div class="empty-state">表示中のキャラクターなし</div>`;
    return;
  }

  const headerClass = (id) => (id === selectedId ? " selected" : "");
  const head = visibleCharacters
    .map(
      (character) => `
        <th class="matrix-head${headerClass(character.id)}">
          <button class="matrix-character-button" type="button" title="${escapeAttr(character.name)}" data-matrix-character="${escapeAttr(character.id)}">${escapeHtml(matrixCharacterLabel(character.name))}</button>
        </th>
      `,
    )
    .join("");
  const rows = visibleCharacters
    .map((from) => {
      const cells = visibleCharacters
        .map((to) => {
          if (from.id === to.id) {
            const firstPersonLabel = from.firstPerson ? escapeHtml(from.firstPerson) : `<span class="empty-cell">一人称未入力</span>`;
            return `
              <td class="first-person-cell">
                <button type="button" data-from="${escapeAttr(from.id)}" data-to="${escapeAttr(to.id)}">
                  ${firstPersonLabel}
                </button>
              </td>
            `;
          }
          const entry = state.appellations[from.id]?.[to.id];
          const label = entry?.value ? escapeHtml(entry.value) : `<span class="empty-cell">未登録</span>`;
          return `
            <td>
              <button type="button" data-from="${escapeAttr(from.id)}" data-to="${escapeAttr(to.id)}">
                ${label}
              </button>
            </td>
          `;
        })
        .join("");
      return `
        <tr>
          <th class="row-head${headerClass(from.id)}">
            <button class="matrix-character-button" type="button" title="${escapeAttr(from.name)}" data-matrix-character="${escapeAttr(from.id)}">${escapeHtml(matrixCharacterLabel(from.name))}</button>
          </th>
          ${cells}
        </tr>
      `;
    })
    .join("");

  els.appellationMatrix.innerHTML = `<table class="matrix"><thead><tr><th>呼ぶ側＼相手</th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  els.appellationMatrix.querySelectorAll("[data-matrix-character]").forEach((button) => {
    button.addEventListener("click", () => {
      state.appellationSelectedCharacterId = button.dataset.matrixCharacter;
      state.selectedCharacterId = button.dataset.matrixCharacter;
      persistNow();
      renderCharacters();
      renderCharacterForm();
      renderMatrix();
    });
  });
  els.appellationMatrix.querySelectorAll("[data-from][data-to]").forEach((button) => {
    button.addEventListener("click", () => {
      els.fromCharacter.value = button.dataset.from;
      els.toCharacter.value = button.dataset.to;
      renderAppellationEditor();
      els.appellationValue.focus();
    });
  });
}

function matrixCharacterLabel(name) {
  const chars = [...String(name || "")];
  if (chars.length <= MATRIX_NAME_MAX_CHARS) return name || "";
  return `${chars.slice(0, MATRIX_NAME_MAX_CHARS - 1).join("")}…`;
}

function renderTimelineControls() {
  const currentCharacter = els.timelineCharacter.value || state.selectedCharacterId || "";
  const currentPartner = els.timelinePartner.value || "";
  renderCharacterOptions(els.timelineCharacter, true, "すべて");
  renderCharacterOptions(els.timelinePartner, true, "指定なし");
  els.timelineCharacter.value = findCharacter(currentCharacter) ? currentCharacter : "";
  els.timelinePartner.value = findCharacter(currentPartner) ? currentPartner : "";
}

function renderTimeline() {
  const characterId = els.timelineCharacter.value;
  const partnerId = els.timelinePartner.value;
  const query = els.timelineQuery.value.trim();
  const queryLower = query.toLocaleLowerCase("ja");

  const scenes = state.scenes.filter((scene) => {
    const hasCharacter = !characterId || scene.characters.includes(characterId);
    const hasPartner = !partnerId || scene.characters.includes(partnerId);
    const hasQuery =
      !query ||
      `${scene.title} ${scene.summary} ${scene.text}`.toLocaleLowerCase("ja").includes(queryLower);
    return hasCharacter && hasPartner && hasQuery;
  });

  els.timelineList.innerHTML = scenes.length
    ? scenes
        .map((scene, index) => {
          const names = scene.characters.map((id) => findCharacter(id)?.name).filter(Boolean).join("、");
          const excerpt = query ? excerptAround(scene.text, query) : scene.summary || scene.text.slice(0, 120);
          return `
            <article class="timeline-card">
              <strong>${index + 1}. ${escapeHtml(sceneLabel(scene))}</strong>
              <span class="scene-meta">${escapeHtml(names || "登場キャラ未設定")}</span>
              <span>${highlight(excerpt || "本文なし", query ? [query] : [])}</span>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">該当シーンなし</div>`;
}

function renderTerms() {
  renderTermList();
  renderTermForm();
}

function renderTermList() {
  if (!state.terms.length) {
    els.termList.innerHTML = `<div class="empty-state">用語なし</div>`;
    return;
  }

  els.termList.innerHTML = state.terms
    .map((term) => {
      const active = term.id === state.selectedTermId ? " active" : "";
      const aliasLabel = term.aliases.filter(Boolean).join("、") || "別名なし";
      return `
        <button class="term-card${active}" type="button" data-term-id="${escapeAttr(term.id)}">
          <strong>${escapeHtml(term.name || "無題の用語")}</strong>
          <span class="term-meta">${escapeHtml(aliasLabel)}</span>
        </button>
      `;
    })
    .join("");

  els.termList.querySelectorAll("[data-term-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTermId = button.dataset.termId;
      persistNow();
      renderTerms();
    });
  });
}

function renderTermForm() {
  const term = selectedTerm();
  const disabled = !term;
  [els.termName, els.addTermAliasButton, els.searchTermScenesButton, els.termDetails, els.deleteTermConfirm].forEach((control) => {
    control.disabled = disabled;
  });
  els.deleteTermConfirm.checked = false;
  updateDeleteTermButtonState();

  if (!term) {
    els.termName.value = "";
    els.termSceneMatches.innerHTML = `<div class="empty-state">用語を選択してください</div>`;
    els.termAliasList.innerHTML = "";
    els.termDetails.value = "";
    return;
  }

  els.termName.value = term.name || "";
  renderTermSceneMatches(term);
  renderTermAliases(term);
  els.termDetails.value = term.details || "";
}

function updateDeleteTermButtonState() {
  els.deleteTermButton.disabled = !selectedTerm() || !els.deleteTermConfirm.checked;
}

function renderTermAliases(term) {
  els.termAliasList.innerHTML = term.aliases.length
    ? term.aliases
        .map(
          (alias, index) => `
            <div class="alias-row">
              <input class="control" data-term-alias-index="${index}" type="text" value="${escapeAttr(alias)}" placeholder="別名" autocomplete="off" />
              <button class="mini-button danger" type="button" data-delete-term-alias="${index}">削除</button>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">別名なし</div>`;
}

function renderTermSceneMatches(term) {
  const matches = (term.sceneMatches || []).filter((match) => findScene(match.sceneId));
  els.termSceneMatches.innerHTML = matches.length
    ? `
      <div class="term-match-heading">登場話</div>
      <div class="term-match-list">
        ${matches
          .map((match) => {
            const scene = findScene(match.sceneId);
            return `
              <button class="mini-button term-scene-chip" type="button" data-term-scene-id="${escapeAttr(match.sceneId)}" title="${escapeAttr(match.matched || "")}">
                ${escapeHtml(scene?.title || sceneLabel(scene))}
              </button>
            `;
          })
          .join("")}
      </div>
    `
    : `<div class="empty-state">登場話なし</div>`;
}

function updateSelectedTermFromForm() {
  const term = selectedTerm();
  if (!term) return;
  term.name = els.termName.value.trim() || term.name;
  term.aliases = [...els.termAliasList.querySelectorAll("[data-term-alias-index]")]
    .map((input) => input.value.trim())
    .filter(Boolean);
  term.details = els.termDetails.value;
  persistSoon();
  renderTermList();
}

function searchSelectedTermScenes() {
  const term = selectedTerm();
  if (!term) return;
  updateSelectedTermFromForm();
  const values = termSearchValues(term);
  if (!values.length) {
    term.sceneMatches = [];
    persistNow();
    renderTermForm();
    toast("検索する用語名がありません");
    return;
  }

  term.sceneMatches = state.scenes
    .map((scene) => {
      const match = findFirstTermMatch(scene.text, values);
      return match ? { sceneId: scene.id, index: match.index, matched: match.value } : null;
    })
    .filter(Boolean);
  persistNow();
  renderTermForm();
  toast(`${term.sceneMatches.length}話で見つかりました`);
}

function termSearchValues(term) {
  return [term.name, ...(term.aliases || [])]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

function findFirstTermMatch(text, values) {
  const haystack = String(text || "").toLocaleLowerCase("ja");
  let best = null;
  values.forEach((value) => {
    const needle = value.toLocaleLowerCase("ja");
    const index = haystack.indexOf(needle);
    if (index < 0) return;
    if (!best || index < best.index || (index === best.index && value.length > best.value.length)) {
      best = { index, value };
    }
  });
  return best;
}

function goToTermScene(sceneId) {
  const scene = findScene(sceneId);
  const term = selectedTerm();
  if (!scene || !term) return;
  state.selectedSceneId = scene.id;
  state.activeTab = "scenes";
  persistNow();
  render();
  const sceneButton = [...els.sceneList.querySelectorAll("[data-scene-id]")].find((button) => button.dataset.sceneId === scene.id);
  scrollElementIntoNearestView(sceneButton);
  focusSceneTextMatch(term);
}

function focusSceneTextMatch(term) {
  const scene = selectedScene();
  if (!scene) return;
  const match = findFirstTermMatch(scene.text, termSearchValues(term));
  els.sceneText.focus();
  if (!match) return;
  els.sceneText.setSelectionRange(match.index, match.index + match.value.length);
  scrollTextareaToIndex(els.sceneText, match.index);
}

function renderCharacterOptions(select, includeEmpty = false, emptyLabel = "") {
  const previous = select.value;
  select.innerHTML = [
    includeEmpty ? `<option value="">${escapeHtml(emptyLabel)}</option>` : "",
    ...state.characters.map((character) => `<option value="${escapeAttr(character.id)}">${escapeHtml(character.name)}</option>`),
  ].join("");
  if ([...select.options].some((option) => option.value === previous)) {
    select.value = previous;
  }
}

function renderSceneOptions(select) {
  const previous = select.value;
  select.innerHTML = [
    `<option value="">なし</option>`,
    ...state.scenes.map((scene) => `<option value="${escapeAttr(scene.id)}">${escapeHtml(sceneLabel(scene))}</option>`),
  ].join("");
  if ([...select.options].some((option) => option.value === previous)) {
    select.value = previous;
  }
}

function sceneLabel(scene) {
  return [scene?.title, scene?.summary].filter(Boolean).join(" / ") || "未設定";
}

function profileFieldVisible(key) {
  if (key === "name") return true;
  return state.profileSettings?.builtIns?.[key] !== false;
}

function nextSceneEpisodeNumber() {
  const numbers = state.scenes
    .map((scene) => {
      const match = String(scene.title || "").match(/^(\d+)話$/);
      return match ? Number(match[1]) : 0;
    })
    .filter(Boolean);
  return numbers.length ? Math.max(...numbers) + 1 : state.scenes.length + 1;
}

function selectedCharacter() {
  return findCharacter(state.selectedCharacterId);
}

function selectedScene() {
  return findScene(state.selectedSceneId);
}

function selectedTerm() {
  return findTerm(state.selectedTermId);
}

function findCharacter(id, source = state) {
  return source.characters.find((character) => character.id === id) || null;
}

function findScene(id, source = state) {
  return source.scenes.find((scene) => scene.id === id) || null;
}

function findTerm(id, source = state) {
  return source.terms.find((term) => term.id === id) || null;
}

function scenesForCharacter(characterId) {
  return state.scenes.filter((scene) => scene.characters.includes(characterId));
}

function checkedCharacterIds() {
  return [...els.sceneCharacterChecks.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
}

function checkedSourceNameCandidates() {
  return [...els.sourceNameCandidates.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
}

function setSourceNameCandidateChecks(checked) {
  els.sourceNameCandidates.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = checked;
  });
  updateSourceNameCandidateActionState();
}

function updateSourceNameCandidateActionState() {
  const candidateChecks = [...els.sourceNameCandidates.querySelectorAll("input[type='checkbox']")];
  const hasCandidates = candidateChecks.length > 0;
  const hasChecked = candidateChecks.some((input) => input.checked);
  els.checkAllSourceNameCandidatesButton.disabled = !hasCandidates;
  els.uncheckAllSourceNameCandidatesButton.disabled = !hasCandidates;
  els.addSourceNameCandidatesButton.disabled = !hasChecked;
  els.ignoreSourceNameCandidatesButton.disabled = !hasChecked;
}

function checkedSourceAppellationCandidates() {
  const keys = new Set(
    [...els.sourceAppellationCandidates.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value),
  );
  return sourceAppellationCandidates.filter((candidate) => keys.has(candidate.key));
}

function createCharacter(name) {
  return {
    id: createId("char"),
    name,
    aliases: [],
    firstPerson: "",
    color: palette[state.characters.length % palette.length],
    notes: "",
    profileValues: {},
  };
}

function createTerm(name) {
  return {
    id: createId("term"),
    name,
    aliases: [],
    details: "",
    sceneMatches: [],
  };
}

function addCharactersFromNames(names, options = {}) {
  const added = [];
  names.forEach((name) => {
    const normalizedName = normalizeCandidateName(name, { allowSingle: true });
    if (!normalizedName || isRegisteredName(normalizedName)) return;
    restoreIgnoredName(normalizedName, { silent: true });
    if (options.recordFeedback !== false) {
      recordNameFeedback(normalizedName, "accepted_name");
    }
    const character = createCharacter(normalizedName);
    state.characters.push(character);
    added.push(character);
  });
  return added;
}

function detectCharacterIds(text) {
  const source = String(text || "");
  return state.characters
    .filter((character) => namesForDetection(character).some((name) => isNameDetectedInSceneText(source, name)))
    .map((character) => character.id);
}

function extractCharacterCandidates(text, mode = "strict") {
  const found = new Map();
  const threshold = extractionThreshold(mode);
  const kanjiNamePattern = `[一-龯々〆ヵヶ]{1,3}[${nameEndingChars}]`;

  const add = (rawName, reason, index = 0) => {
    const allowSingle = ["フルネーム", "敬称", "愛称", "会話呼称", "会話冒頭"].includes(reason);
    const name = normalizeCandidateName(rawName, { allowSingle });
    if (!name || isRegisteredName(name) || isIgnoredName(name)) return;
    const key = normalizeNameKey(name);
    const current = found.get(key) || { name, count: 0, reasons: new Set(), firstIndex: index };
    current.count += 1;
    current.reasons.add(reason);
    current.firstIndex = Math.min(current.firstIndex, index);
    found.set(key, current);
  };

  collectMatches(text, /[一-龯々〆ヵヶ]{1,5}[・＝=\s　]?[ァ-ヶーA-Za-zＡ-Ｚａ-ｚ]{2,10}/g, "姓名", add);
  collectMatches(text, /[ァ-ヶーA-Za-zＡ-Ｚａ-ｚ]{2,12}・[ァ-ヶーA-Za-zＡ-Ｚａ-ｚ]{2,12}/g, "姓名", add);
  collectFullNameMatches(text, add);
  collectMatches(text, new RegExp(`(${kanjiNamePattern})[ぁ-んー]{2,8}(?=だって|は|が|を|に|へ|と|も|で|から|、|。|」|』)`, "g"), "ルビ名", add, 1);
  collectMatches(text, new RegExp(`(${kanjiNamePattern})(?=は|が|を|に|へ|と|も|から|で|、|。|」|』)`, "g"), "漢字名", add, 1);
  collectMatches(text, /(?:特に|特別に|とくに)([一-龯々〆ヵヶ]{2,4})(?=は|が|を|に|へ|と|も|で|、|。|」|』)/g, "文脈名", add, 1);
  collectMatches(
    text,
    new RegExp(`([一-龯々〆ヵヶ]{1,4})(?:${honorifics.join("|")})`, "g"),
    "敬称",
    add,
    1,
  );
  collectMatches(text, new RegExp(`([ァ-ヶーA-Za-zＡ-Ｚａ-ｚ]{2,8})(?:${honorifics.join("|")})`, "g"), "敬称", add, 1);
  collectMatches(text, /([ぁ-んー]{2,6})(?:ちゃん|くん|君|さん)/g, "愛称", add, 1);
  collectVocativeSegments(text, add);
  collectMatches(text, /[「『]([^」』\n]{1,14})[、,]/g, "会話冒頭", add, 1);
  collectMatches(text, /([ァ-ヶーA-Za-zＡ-Ｚａ-ｚ]{2,12})(?=[はがをにへともで、,」』])/g, "カナ名", add, 1);

  const candidates = [...found.values()]
    .map((candidate) => ({
      ...candidate,
      reasons: [...candidate.reasons],
      score: scoreNameCandidate(candidate),
    }))
    .filter((candidate) => candidate.score >= threshold)
    .filter((candidate) => mode === "wide" || !isWeakSingleReasonCandidate(candidate))
    .sort((a, b) => b.score - a.score || b.count - a.count || a.firstIndex - b.firstIndex);

  return candidates
    .filter((candidate) => {
      if (hasStrongNameContext(candidate)) return true;
      return !candidates.some((other) => {
        return other.name !== candidate.name && other.name.includes(candidate.name) && other.count >= candidate.count;
      });
    })
    .slice(0, 30);
}

function hasStrongNameContext(candidate) {
  return candidate.reasons.some((reason) => ["フルネーム", "敬称", "愛称", "会話呼称", "文脈名"].includes(reason));
}

function extractionThreshold(mode) {
  if (mode === "wide") return 1;
  if (mode === "balanced") return 3;
  return 5;
}

function scoreNameCandidate(candidate) {
  const weights = {
    姓名: 5,
    フルネーム: 8,
    ルビ名: 5,
    漢字名: 2,
    文脈名: 5,
    敬称: 5,
    愛称: 5,
    会話呼称: 6,
    会話冒頭: 4,
    カナ名: 1,
  };
  const reasonScore = [...candidate.reasons].reduce((total, reason) => total + (weights[reason] || 0), 0);
  return reasonScore + Math.min(Math.max(candidate.count - 1, 0), 4);
}

function isWeakSingleReasonCandidate(candidate) {
  if (candidate.reasons.length !== 1) return false;
  const [reason] = candidate.reasons;
  if (reason === "カナ名") return candidate.count < 3;
  if (reason === "会話冒頭") return candidate.name.length > 4 && candidate.count < 2;
  return false;
}

function collectFullNameMatches(text, add) {
  const family = "[一-龯々〆ヵヶ]{1,4}";
  const kanjiGiven = `[一-龯々〆ヵヶ]{0,3}[${nameEndingChars}]`;
  const kanaGiven = "[ぁ-んー]{2,6}?";
  const given = `(?:${kanjiGiven}|${kanaGiven})`;
  const separators = "[\\s　・･]+";
  const boundary = "(?=です|と申|って|は|が|を|に|へ|と|も|で|、|。|」|』|$)";
  const patterns = [
    { pattern: new RegExp(`(${family})${separators}(${given})${boundary}`, "g"), addGiven: true },
    { pattern: new RegExp(`(?:私(?:は|が)?|僕(?:は|が)?|俺(?:は|が)?|名前は|[の「『、。！？\\n\\r\\s　])([一-龯々〆ヵヶ]{2,4})(${kanjiGiven})${boundary}`, "g"), addGiven: false },
  ];

  patterns.forEach(({ pattern, addGiven }) => {
    for (const match of text.matchAll(pattern)) {
      const fullName = `${match[1]}${match[2]}`;
      if (isBadFamilyName(match[1])) continue;
      add(fullName, "フルネーム", match.index || 0);
      if (addGiven) add(match[2], "フルネーム", match.index || 0);
    }
  });
}

function isBadFamilyName(value) {
  return /^(一旦|一応|剛|貫|小|大|中|高)$/.test(value);
}

function collectVocativeSegments(text, add) {
  const quotePattern = /[「『]([^」』\n]{1,80})[」』]/g;
  for (const match of text.matchAll(quotePattern)) {
    const quote = match[1] || "";
    const lead = quote.split(/[。！？!?]/)[0] || "";
    const segments = lead.split(/[、,，…]+/).map((item) => item.trim()).filter(Boolean);
    segments.slice(0, 4).forEach((segment) => {
      const cleaned = segment
        .replace(/^(え|あ|いや|ねぇ|ねえ|なあ|うん|おーい|ほら|その|この|あの)+/, "")
        .replace(/(どうした.*|おつかれ.*|お疲れ.*|待って.*|先輩.*|ちゃん先輩.*)$/g, "")
        .trim();
      if (!cleaned) return;
      if (/^[一-龯々〆ヵヶ]{2,4}$/.test(cleaned) || /^[ぁ-んー]{2,6}(?:ちゃん|くん|君|さん)$/.test(cleaned)) {
        add(cleaned, "会話呼称", match.index || 0);
      }
    });
  }
}

function collectMatches(text, pattern, reason, add, group = 0) {
  for (const match of text.matchAll(pattern)) {
    add(match[group], reason, match.index || 0);
  }
}

function normalizeCandidateName(value, options = {}) {
  let name = String(value || "")
    .trim()
    .replace(/^[\s　「『（(【\[]+/, "")
    .replace(/[\s　」』）)】\]、,。.!！?？]+$/g, "")
    .replace(/^(ねえ|なあ|あの|その|この|ほら|でも|じゃあ|さて|ところで)[、,]?/, "")
    .replace(new RegExp(`(?:${honorifics.join("|")})$`), "")
    .trim();

  name = name.replace(/\s+/g, "");
  if (/[一-龯]/.test(name)) name = name.replace(/[ー〜～]+$/g, "");
  const minLength = options.allowSingle ? 1 : 2;
  if (name.length < minLength || name.length > 14) return "";
  if (/[。！？\n\r]/.test(name)) return "";
  if (/^第[0-9０-９一二三四五六七八九十百]+章$/.test(name)) return "";
  if (/^彼女/.test(name)) return "";
  if (/(モテ|グループ|ベンチ|オーケー)$/.test(name)) return "";
  if (candidateStopwords.has(name)) return "";
  return name;
}

function normalizeNameKey(value) {
  return String(value || "").trim().toLocaleLowerCase("ja");
}

function registeredNameKeys() {
  return new Set(state.characters.flatMap(namesForCharacter).map(normalizeNameKey));
}

function isRegisteredName(name) {
  return registeredNameKeys().has(normalizeNameKey(name));
}

function ignoredNameKeys() {
  return new Set((state.ignoredNames || []).map(normalizeNameKey));
}

function isIgnoredName(name) {
  return ignoredNameKeys().has(normalizeNameKey(name));
}

function ignoreNameCandidate(name, options = {}) {
  const normalizedName = normalizeCandidateName(name, { allowSingle: true });
  if (!normalizedName || isRegisteredName(normalizedName) || isIgnoredName(normalizedName)) return;
  if (options.recordFeedback !== false) {
    recordNameFeedback(normalizedName, "rejected_name");
  }
  state.ignoredNames.push(normalizedName);
  sourceNameCandidates = sourceNameCandidates.filter((candidate) => !isIgnoredName(candidate.name));
  if (options.silent) return;
  persistNow();
  renderSourceNameCandidates();
  renderIgnoredNames();
  renderFeedbackPanel();
  toast(`「${normalizedName}」を名前候補から除外しました`);
}

function restoreIgnoredName(name, options = {}) {
  const key = normalizeNameKey(name);
  state.ignoredNames = (state.ignoredNames || []).filter((item) => normalizeNameKey(item) !== key);
  if (options.silent) return;
  persistNow();
  renderSourceNameCandidates();
  renderIgnoredNames();
  toast(`「${name}」の除外を解除しました`);
}

function normalizeFeedbackItem(item) {
  const normalized = item && typeof item === "object" ? item : {};
  return {
    id: normalized.id || createId("feedback"),
    createdAt: normalized.createdAt || new Date().toISOString(),
    appVersion: normalized.appVersion || APP_VERSION,
    rulesVersion: normalized.rulesVersion || RULES_VERSION,
    decision: normalized.decision || "accepted_name",
    surface: normalized.surface || normalized.normalized || "",
    normalized: normalized.normalized || normalized.surface || "",
    kind: normalized.kind || "unknown",
    reasons: Array.isArray(normalized.reasons) ? normalized.reasons : [],
    score: Number.isFinite(normalized.score) ? normalized.score : 0,
    countInSource: Number.isFinite(normalized.countInSource) ? normalized.countInSource : 0,
    extractionMode: normalized.extractionMode || "strict",
    sourceLength: Number.isFinite(normalized.sourceLength) ? normalized.sourceLength : 0,
    status: normalized.status === "sent" ? "sent" : "pending",
    sentAt: normalized.sentAt || "",
    lastError: normalized.lastError || "",
  };
}

function recordNameFeedback(name, decision) {
  const normalized = normalizeCandidateName(name, { allowSingle: true });
  if (!normalized) return;
  const candidate = feedbackCandidateForName(normalized);
  state.feedbackQueue ||= [];
  state.feedbackQueue.push({
    id: createId("feedback"),
    createdAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    rulesVersion: RULES_VERSION,
    decision,
    surface: candidate?.name || name,
    normalized,
    kind: feedbackCandidateKind(candidate),
    reasons: candidate?.reasons || [],
    score: candidate?.score || 0,
    countInSource: candidate?.count || countExactOccurrences(state.sourceText, normalized),
    extractionMode: state.nameExtractionMode,
    sourceLength: state.sourceText.length,
    status: "pending",
    sentAt: "",
    lastError: "",
  });
}

function feedbackCandidateForName(name) {
  const key = normalizeNameKey(name);
  return sourceNameCandidates.find((candidate) => normalizeNameKey(candidate.name) === key);
}

function feedbackCandidateKind(candidate) {
  const reasons = candidate?.reasons || [];
  if (reasons.includes("フルネーム")) return "full_name";
  if (reasons.includes("敬称")) return "honorific";
  if (reasons.includes("愛称")) return "nickname";
  if (reasons.includes("会話呼称")) return "vocative";
  if (reasons.includes("文脈名")) return "context_name";
  if (reasons.includes("ルビ名")) return "ruby_name";
  if (reasons.includes("漢字名")) return "kanji_name";
  if (reasons.includes("カナ名")) return "kana_name";
  return "unknown";
}

function feedbackPendingItems() {
  return (state.feedbackQueue || []).filter((item) => item.status !== "sent");
}

async function sendFeedback() {
  const endpoint = DEFAULT_FEEDBACK_ENDPOINT;
  const pending = feedbackPendingItems();
  if (!pending.length) {
    toast("未送信のフィードバックはありません");
    return;
  }

  els.sendFeedbackButton.disabled = true;
  const payload = createFeedbackPayload(pending);
  try {
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const sentAt = new Date().toISOString();
    const sentIds = new Set(pending.map((item) => item.id));
    state.feedbackQueue.forEach((item) => {
      if (!sentIds.has(item.id)) return;
      item.status = "sent";
      item.sentAt = sentAt;
      item.lastError = "";
    });
    persistNow();
    renderFeedbackPanel();
    toast(`${pending.length}件の送信を試みました`);
  } catch (error) {
    const message = error?.message || "送信に失敗しました";
    pending.forEach((item) => {
      item.lastError = message;
    });
    persistNow();
    renderFeedbackPanel();
    toast("フィードバックを送信できませんでした");
  }
}

function createFeedbackPayload(items) {
  return {
    app: "nobe-jishin",
    appVersion: APP_VERSION,
    rulesVersion: RULES_VERSION,
    submittedAt: new Date().toISOString(),
    clientId: state.feedbackClientId,
    projectId: state.feedbackProjectId,
    locale: navigator.language || "ja",
    feedback: items.map(serializeFeedbackItem),
  };
}

function serializeFeedbackItem(item) {
  return {
    id: item.id,
    createdAt: item.createdAt,
    appVersion: item.appVersion,
    rulesVersion: item.rulesVersion,
    decision: item.decision,
    surface: item.surface,
    normalized: item.normalized,
    kind: item.kind,
    reasons: item.reasons,
    score: item.score,
    countInSource: item.countInSource,
    extractionMode: item.extractionMode,
    sourceLength: item.sourceLength,
  };
}

function clearSentFeedback() {
  const before = state.feedbackQueue.length;
  state.feedbackQueue = state.feedbackQueue.filter((item) => item.status !== "sent");
  const removed = before - state.feedbackQueue.length;
  persistNow();
  renderFeedbackPanel();
  toast(`${removed}件の送信済み履歴を削除しました`);
}

function extractAppellationCandidates(text) {
  if (!state.characters.length) return [];
  const candidates = new Map();
  const quotePattern = /「([^」]{1,100})」|『([^』]{1,100})』/g;

  for (const match of text.matchAll(quotePattern)) {
    const quote = match[1] || match[2] || "";
    const quoteStart = match.index || 0;
    const quoteEnd = quoteStart + match[0].length;
    const fromId = inferSpeakerId(text, quoteStart, quoteEnd);
    if (!fromId) continue;

    state.characters.forEach((target) => {
      if (target.id === fromId) return;
      namesForCharacter(target).forEach((name) => {
        if (!name) return;
        const pattern = new RegExp(`${escapeRegExp(name)}(?:${honorifics.join("|")})?`, "g");
        for (const valueMatch of quote.matchAll(pattern)) {
          const value = valueMatch[0];
          if (!value || value.length < 2) continue;
          const key = `${fromId}=>${target.id}:${value}`;
          if (!candidates.has(key)) {
            candidates.set(key, {
              key,
              fromId,
              toId: target.id,
              value,
              excerpt: excerptAround(match[0], value),
            });
          }
        }
      });
    });
  }

  return [...candidates.values()].slice(0, 40);
}

function inferSpeakerId(text, quoteStart, quoteEnd) {
  const before = lastSentenceFragment(text.slice(Math.max(0, quoteStart - 160), quoteStart));
  const after = text.slice(quoteEnd, quoteEnd + 80).split(/[。！？]/)[0] || "";
  return findSpeechVerbCharacterId(before) || findSubjectCharacterId(before) || findSpeechVerbCharacterId(after);
}

function lastSentenceFragment(value) {
  const fragments = value
    .split(/[。！？]/)
    .map((fragment) => fragment.trim())
    .filter(Boolean);
  return fragments.at(-1) || "";
}

function findSubjectCharacterId(fragment) {
  let best = { id: "", index: -1 };
  state.characters.forEach((character) => {
    namesForCharacter(character).forEach((name) => {
      const pattern = new RegExp(`${escapeRegExp(name)}(?:は|が|も)`, "g");
      for (const match of fragment.matchAll(pattern)) {
        if ((match.index || 0) >= best.index) {
          best = { id: character.id, index: match.index || 0 };
        }
      }
    });
  });
  return best.id;
}

function findSpeechVerbCharacterId(fragment) {
  let best = { id: "", index: Number.MAX_SAFE_INTEGER };
  const verbs = "言った|告げた|呟いた|つぶやいた|叫んだ|尋ねた|答えた|笑った|呼んだ";
  state.characters.forEach((character) => {
    namesForCharacter(character).forEach((name) => {
      const pattern = new RegExp(`${escapeRegExp(name)}(?:は|が|も)?.{0,12}(?:${verbs})`, "g");
      for (const match of fragment.matchAll(pattern)) {
        if ((match.index || 0) < best.index) {
          best = { id: character.id, index: match.index || 0 };
        }
      }
    });
  });
  return best.id;
}

function applyAppellationCandidates(candidates) {
  candidates.forEach((candidate) => {
    state.appellations[candidate.fromId] ||= {};
    const current = state.appellations[candidate.fromId][candidate.toId];
    if (!current) {
      state.appellations[candidate.fromId][candidate.toId] = {
        value: candidate.value,
        note: "解析用本文から抽出",
        sceneId: "",
      };
      return;
    }

    const values = current.value
      .split("/")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!values.includes(candidate.value)) {
      values.push(candidate.value);
    }
    current.value = values.join(" / ");
    current.note = current.note ? `${current.note}\n解析用本文から抽出` : "解析用本文から抽出";
  });
  return candidates.length;
}

function namesForCharacter(character) {
  return [character.name, ...(character.aliases || [])].filter(Boolean);
}

function namesForDetection(character) {
  const fragments = new Set();
  namesForCharacter(character).forEach((name) => {
    const raw = String(name || "").trim();
    const compact = raw.replace(/\s+/g, "");
    if (!compact) return;
    addDetectionFragment(fragments, compact, { allowSingle: true });

    raw
      .split(/[\s　・／\/,、]+/)
      .forEach((part) => addDetectionFragment(fragments, part, { allowSingle: true }));

    const runs = compact.match(/[一-龯々〆ヵヶ]+|[ぁ-んー]+|[ァ-ヶーA-Za-zＡ-Ｚａ-ｚ]+/g) || [];
    if (runs.length > 1) {
      runs.forEach((part) => addDetectionFragment(fragments, part, { allowSingle: true }));
      return;
    }

    if (/^[一-龯々〆ヵヶ]{3,}$/.test(compact)) {
      addLikelyJapaneseNameFragments(fragments, compact);
    }
  });
  return [...fragments].sort((a, b) => b.length - a.length);
}

function addLikelyJapaneseNameFragments(fragments, compact) {
  const chars = [...compact];
  const addSlice = (start, end, options = {}) => addDetectionFragment(fragments, chars.slice(start, end).join(""), options);
  if (chars.length === 3) {
    addSlice(0, 2);
    addSlice(2, 3, { allowSingle: true });
    return;
  }
  if (chars.length === 4) {
    addSlice(0, 2);
    addSlice(2, 4);
    return;
  }
  if (chars.length === 5) {
    addSlice(0, 2);
    addSlice(0, 3);
    addSlice(2, 5);
    addSlice(3, 5);
    return;
  }
  addSlice(0, 2);
  addSlice(0, 3);
  addSlice(chars.length - 3, chars.length);
  addSlice(chars.length - 2, chars.length);
}

function addDetectionFragment(fragments, value, options = {}) {
  const fragment = String(value || "").trim();
  if (fragment.length >= 2 || (options.allowSingle && fragment.length === 1)) fragments.add(fragment);
}

function isNameDetectedInSceneText(text, name) {
  const target = String(name || "").trim();
  if (!target) return false;
  const compactText = String(text || "").replace(/[\s　]/g, "");
  if (target.length >= 3 && compactText.includes(target)) return true;
  if (hasHonorificSuffix(target) && compactText.includes(target)) return true;
  return hasSceneNameBoundaryMatch(text, target);
}

function hasHonorificSuffix(value) {
  return honorifics.some((honorific) => value.endsWith(honorific));
}

function hasSceneNameBoundaryMatch(text, name) {
  const escaped = escapeRegExp(name);
  const honorificPattern = honorifics.map(escapeRegExp).join("|");
  const followPattern = `(?:${honorificPattern}|は|が|を|に|へ|と|も|で|の|から|より|まで|、|,|。|\\.|!|！|\\?|？|…|」|』|）|\\)|】|\\]|\\s|$)`;
  if (name.length === 1) {
    const honorificMatch = new RegExp(`${escaped}(?=${honorificPattern})`, "u");
    if (honorificMatch.test(text)) return true;
    const singleNameMatch = new RegExp(`(?:^|[\\s　「『（(【\\[、,。.!！?？…])${escaped}(?=${followPattern})`, "u");
    return singleNameMatch.test(text);
  }
  return new RegExp(`${escaped}(?=${followPattern})`, "u").test(text);
}

function splitAliases(value) {
  return value
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function countAppellations() {
  const relationCount = Object.values(state.appellations).reduce((total, row) => {
    return total + Object.values(row).filter((entry) => entry?.value).length;
  }, 0);
  return relationCount + state.characters.filter((character) => character.firstPerson).length;
}

function excerptForCharacter(scene, character) {
  const names = namesForCharacter(character);
  const name = names.find((item) => scene.text.includes(item));
  return name ? excerptAround(scene.text, name) : scene.text.slice(0, 96);
}

function excerptAround(text, needle) {
  if (!text || !needle) return "";
  const index = text.toLocaleLowerCase("ja").indexOf(needle.toLocaleLowerCase("ja"));
  if (index < 0) return text.replace(/\s+/g, " ").slice(0, 120);
  const start = Math.max(0, index - 44);
  const end = Math.min(text.length, index + needle.length + 70);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ")}${suffix}`;
}

function highlight(value, needles) {
  let html = escapeHtml(value);
  needles
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .forEach((needle) => {
      const pattern = new RegExp(escapeRegExp(escapeHtml(needle)), "g");
      html = html.replace(pattern, (match) => `<mark>${match}</mark>`);
    });
  return html;
}

function exportJson() {
  persistNow();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `nobe-jishin-${date}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const [file] = event.target.files;
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = JSON.parse(String(reader.result || "{}"));
      if (!isPlainObject(imported)) {
        throw new Error("Project JSON must be an object.");
      }
      state = normalizeState(imported);
      persistNow();
      render();
      toast("読み込みました");
    } catch (error) {
      console.error(error);
      alert("JSONを読み込めませんでした");
    } finally {
      event.target.value = "";
    }
  });
  reader.readAsText(file);
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
