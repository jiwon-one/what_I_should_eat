/**
 * 오늘 뭐먹지? — 프론트 데모 (키워드 기반 추천)
 * 나중에 API 연결 시: fetchRecommendationFromAPI() 와 USE_API 플래그를 수정하세요.
 * API 키는 절대 이 파일에 넣지 마세요. 백엔드 + .env 에서 관리하는 것을 권장합니다.
 */

// ---------------------------------------------------------------------------
// 2단계: 외부 API 설정 (현재는 사용 안 함 — TODO 만 유지)
// ---------------------------------------------------------------------------
const API_CONFIG = {
  // TODO: 백엔드 프록시 URL 등. 실제 키는 서버/.env 에만 두세요.
  baseUrl: "",
};

/** true 로 바꾸면 아래 fetch 함수가 우선 시도됩니다 (백엔드 연결 후). */
const USE_EXTERNAL_API = false;

const LOADING_MS = 550;

/** 키워드 규칙: 첫 매칭 카테고리로 추천 (순서 있음) */
const MENU_RULES = [
  {
    keywords: ["비", "비오", "추움", "추워", "따뜻", "따스", "포근"],
    primary: "국밥",
    reason: "비나 추운 날엔 뜨끈한 국물 한 사발이 제일 위로가 돼요.",
    pool: ["국밥", "칼국수", "라면"],
  },
  {
    keywords: ["혼밥", "혼자", "간단", "간편", "빠르"],
    primary: "참치마요덮밥",
    reason: "혼밥이나 간단히 한 끼 때리기 좋은 조합이에요.",
    pool: ["김밥", "덮밥", "샌드위치"],
  },
  {
    keywords: ["친구", "같이", "회식", "여럿"],
    primary: "치킨",
    reason: "나눠 먹기 좋고 분위기도 살아나요.",
    pool: ["피자", "족발", "치킨"],
  },
  {
    keywords: ["매운", "맵게", "스트레스", "스트레스풀"],
    primary: "엽떡",
    reason: "매운 맛은 스트레스 해소에 도움이 될 때가 많아요.",
    pool: ["떡볶이", "마라탕", "제육볶음"],
  },
  {
    keywords: ["다이어트", "가볍", "살", "담백"],
    primary: "닭가슴살 샐러드",
    reason: "부담 적게 배 채우고 싶을 때 무난해요.",
    pool: ["샐러드", "포케", "닭가슴살볼"],
  },
  {
    keywords: ["돈 없", "저렴", "가성비", "가난", "살림"],
    primary: "컵밥",
    reason: "부담 없는 가격으로 한 끼 해결하기 좋아요.",
    pool: ["컵밥", "라면", "김치볶음밥"],
  },
  {
    keywords: ["우울", "우울함", "기분", "속상", "힘들"],
    primary: "치즈 돈까스",
    reason: "가끔은 든든한 튀김과 치즈가 위로가 돼요.",
    pool: ["라멘", "파스타", "햄버거"],
  },
  {
    keywords: ["저녁", "야식", "밤"],
    primary: "라멘",
    reason: "저녁이나 밤에도 부담 없이 즐기기 좋아요.",
    pool: ["쌀국수", "우동", "포케"],
  },
];

/** 키워드 없을 때 쓸 전체 후보 */
const FALLBACK_MENUS = [
  "비빔밥",
  "김치찌개",
  "된장찌개",
  "삼겹살",
  "초밥",
  "파스타",
  "햄버거",
  "샐러드",
];

/** 오늘의 추천 한마디 풀 */
const DAILY_PHRASES = [
  "오늘도 맛있게 한 끼 하세요!",
  "배고픔은 솔직한 재능이에요.",
  "어떤 메뉴도 나쁘지 않은 하루예요.",
  "천천히 씹으면 더 맛있어요.",
  "내일 메뉴도 벌써 기대돼요.",
];

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const situationInput = document.getElementById("situation-input");
const recommendBtn = document.getElementById("recommend-btn");
const againBtn = document.getElementById("again-btn");
const loadingText = document.getElementById("loading-text");
const placeholderText = document.getElementById("placeholder-text");
const resultContent = document.getElementById("result-content");
const dailyQuoteEl = document.getElementById("daily-quote");
const menuNameEl = document.getElementById("menu-name");
const menuReasonEl = document.getElementById("menu-reason");
const altListEl = document.getElementById("alt-list");

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------
function pickRandom(array) {
  const i = Math.floor(Math.random() * array.length);
  return array[i];
}

function shuffleTwoOthers(primary, pool) {
  const others = pool.filter((name) => name !== primary);
  const out = [];
  const copy = [...others];
  while (copy.length && out.length < 2) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function normalizeInput(text) {
  return (text || "").trim();
}

// ---------------------------------------------------------------------------
// 1단계: 기본(로컬) 추천 로직
// ---------------------------------------------------------------------------
function findRuleByKeywords(userText) {
  const t = userText.replace(/\s/g, "");
  for (const rule of MENU_RULES) {
    const hit = rule.keywords.some((kw) => t.includes(kw));
    if (hit) return rule;
  }
  return null;
}

function buildLocalRecommendation(userText) {
  const rule = findRuleByKeywords(userText);
  const quote = pickRandom(DAILY_PHRASES);

  if (rule) {
    const alternatives = shuffleTwoOthers(rule.primary, rule.pool);
    return {
      menuName: rule.primary,
      reason: rule.reason,
      alternatives,
      dailyPhrase: quote,
      source: "keyword",
    };
  }

  const menuName = pickRandom(FALLBACK_MENUS);
  return {
    menuName,
    reason: "오늘은 이 메뉴 어떠세요? 마음에 드는 키워드를 넣으면 더 잘 맞춰 드려요.",
    alternatives: shuffleTwoOthers(menuName, FALLBACK_MENUS),
    dailyPhrase: quote,
    source: "random",
  };
}

// ---------------------------------------------------------------------------
// 2단계: API 자리 (나중에 연결 — 지금은 항상 null 반환)
// ---------------------------------------------------------------------------

/**
 * TODO: OpenAI / Gemini / Claude 등 연결 시 여기에서 fetch 호출
 * - 브라우저에 API 키를 두지 마세요. 백엔드가 .env 의 키로 호출하게 두는 방식을 권장합니다.
 * - 응답 형식은 { menuName, reason, alternatives: string[], dailyPhrase } 에 맞추면 됩니다.
 */
async function fetchRecommendationFromAPI(userText) {
  if (!USE_EXTERNAL_API || !API_CONFIG.baseUrl) {
    return null;
  }

  try {
    // TODO: 예시 구조만 유지 (URL·헤더는 실제 서비스에 맞게 수정)
    const response = await fetch(`${API_CONFIG.baseUrl}/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ situation: userText }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      menuName: data.menuName || data.menu,
      reason: data.reason || "",
      alternatives: Array.isArray(data.alternatives) ? data.alternatives.slice(0, 2) : [],
      dailyPhrase: data.dailyPhrase || pickRandom(DAILY_PHRASES),
      source: "api",
    };
  } catch (e) {
    console.warn("API 추천 실패, 로컬 로직으로 대체:", e);
    return null;
  }
}

/** API 실패 시 로컬 결과로 합류 */
async function getRecommendation(userText) {
  const apiResult = await fetchRecommendationFromAPI(userText);
  if (apiResult && apiResult.menuName) return apiResult;
  return buildLocalRecommendation(userText);
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
function setLoading(isLoading) {
  loadingText.hidden = !isLoading;
  recommendBtn.disabled = isLoading;
  recommendBtn.setAttribute("aria-busy", isLoading ? "true" : "false");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showPlaceholder() {
  placeholderText.hidden = false;
  resultContent.hidden = true;
}

function showResult(payload) {
  placeholderText.hidden = true;
  resultContent.hidden = false;

  dailyQuoteEl.textContent = `오늘의 추천 한마디 · ${payload.dailyPhrase}`;
  menuNameEl.textContent = payload.menuName;
  menuReasonEl.textContent = payload.reason;

  altListEl.innerHTML = "";
  const alts = payload.alternatives || [];
  if (alts.length === 0) {
    const li = document.createElement("li");
    li.textContent = "—";
    altListEl.appendChild(li);
  } else {
    alts.forEach((name) => {
      const li = document.createElement("li");
      li.textContent = name;
      altListEl.appendChild(li);
    });
  }
}

async function runRecommendation() {
  const text = normalizeInput(situationInput.value);

  if (!text) {
    showPlaceholder();
    placeholderText.innerHTML =
      "상황을 한 줄이라도 입력해 주세요.<br />예: 비 오는 날, 혼밥, 매운 거 땡김…";
    return;
  }

  setLoading(true);
  await delay(LOADING_MS);

  const result = await getRecommendation(text);
  showResult(result);
  setLoading(false);
}

function init() {
  showPlaceholder();

  recommendBtn.addEventListener("click", () => {
    runRecommendation();
  });

  againBtn.addEventListener("click", () => {
    runRecommendation();
  });

  situationInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runRecommendation();
    }
  });
}

init();
