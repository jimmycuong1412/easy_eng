/**
 * ESL Grammar Rule Engine — chạy 100% local, zero network, zero cost.
 *
 * Tập trung vào lỗi phổ biến nhất của người Việt học tiếng Anh:
 * articles, subject-verb agreement, tense markers, prepositions, common collocations.
 */

export interface GrammarIssue {
  start: number;    // char index in original text
  end: number;
  message: string;  // tiếng Việt
  suggestion: string;
  severity: 'error' | 'warning' | 'info';
}

interface Rule {
  id: string;
  pattern: RegExp;
  check: (match: RegExpExecArray, text: string) => GrammarIssue | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const VOWELS = /^[aeiouAEIOU]/;
const IRREGULAR_PAST: Record<string, string> = {
  go: 'went', come: 'came', see: 'saw', do: 'did', get: 'got',
  have: 'had', make: 'made', take: 'took', give: 'gave', know: 'knew',
  think: 'thought', say: 'said', tell: 'told', bring: 'brought',
  buy: 'bought', catch: 'caught', teach: 'taught', hear: 'heard',
  feel: 'felt', keep: 'kept', leave: 'left', meet: 'met', send: 'sent',
  spend: 'spent', stand: 'stood', understand: 'understood', write: 'wrote',
  read: 'read', run: 'ran', begin: 'began', break: 'broke', choose: 'chose',
  drive: 'drove', eat: 'ate', fall: 'fell', find: 'found', forget: 'forgot',
  grow: 'grew', hold: 'held', lose: 'lost', pay: 'paid', put: 'put',
  sit: 'sat', sleep: 'slept', speak: 'spoke', swim: 'swam', win: 'won',
};
const IRREGULAR_VERBS = new Set(Object.keys(IRREGULAR_PAST));

function issue(
  match: RegExpExecArray,
  message: string,
  suggestion: string,
  severity: GrammarIssue['severity'] = 'error',
): GrammarIssue {
  return { start: match.index, end: match.index + match[0].length, message, suggestion, severity };
}

// ─── Rules ─────────────────────────────────────────────────────────────────

const rules: Rule[] = [

  // 1. "a" trước nguyên âm → "an"
  {
    id: 'a-before-vowel',
    pattern: /\ba\s+([aeiou]\w*)/gi,
    check: (m) => issue(m,
      `Dùng "an" trước từ bắt đầu bằng nguyên âm ("${m[1]}").`,
      m[0].replace(/^a\s+/, 'an '),
      'error',
    ),
  },

  // 2. "an" trước phụ âm → "a"
  {
    id: 'an-before-consonant',
    pattern: /\ban\s+([b-df-hj-np-tv-z]\w*)/gi,
    check: (m) => {
      // Ngoại lệ: "an hour", "an honest", "an heir" (h câm)
      const silent_h = /^h(our|on(est|or)|eir|erb)/i;
      if (silent_h.test(m[1])) return null;
      return issue(m,
        `Dùng "a" trước từ bắt đầu bằng phụ âm ("${m[1]}").`,
        m[0].replace(/^an\s+/, 'a '),
        'error',
      );
    },
  },

  // 3. Double spacing
  {
    id: 'double-space',
    pattern: /  +/g,
    check: (m) => issue(m, 'Có khoảng trắng thừa.', ' ', 'info'),
  },

  // 4. Thiếu dấu phẩy sau subordinate clause đầu câu (When/If/Although/Because/Since/While...)
  {
    id: 'subordinate-comma',
    pattern: /^(When|If|Although|Because|Since|While|After|Before|Unless|Even though|As soon as)\b([^,]{10,60})\s+(I|you|he|she|it|we|they|the|a|my|your|his|her|our|their)\b/im,
    check: (m) => issue(m,
      `Thường cần dấu phẩy sau mệnh đề phụ ("${m[1]}...") trước mệnh đề chính.`,
      m[0].replace(m[2] + ' ', m[2] + ', '),
      'warning',
    ),
  },

  // 5. Redundant "do not + base" sau modal (will/would/can/could/should/must)
  {
    id: 'modal-do-not',
    pattern: /\b(will|would|can|could|should|must|may|might)\s+do\s+not\b/gi,
    check: (m) => issue(m,
      `Sau "${m[1]}" dùng "not" trực tiếp, không cần "do not".`,
      m[0].replace(/do\s+not/, 'not'),
      'error',
    ),
  },

  // 6. "make" + adj thay vì "be" (make happy → be happy / feel happy)
  {
    id: 'make-adj',
    pattern: /\b(I|you|he|she|it|we|they)\s+make\s+(happy|sad|angry|tired|bored|excited|nervous|worried|scared|confused)\b/gi,
    check: (m) => issue(m,
      `"make" không đi trực tiếp với tính từ về cảm xúc của chủ thể. Dùng "feel" hoặc "am/is/are".`,
      m[0].replace('make', 'feel'),
      'warning',
    ),
  },

  // 7. "discuss about" → "discuss"
  {
    id: 'discuss-about',
    pattern: /\bdiscuss\s+about\b/gi,
    check: (m) => issue(m, '"discuss" là ngoại động từ — bỏ "about".', 'discuss', 'error'),
  },

  // 8. "married with" → "married to"
  {
    id: 'married-to',
    pattern: /\bmarried\s+with\b/gi,
    check: (m) => issue(m, 'Dùng "married to", không phải "married with".', 'married to', 'error'),
  },

  // 9. "listen" without "to" before noun/pronoun
  {
    id: 'listen-to',
    pattern: /\blisten\s+(music|songs?|radio|podcast|him|her|them|me|you|us|it)\b/gi,
    check: (m) => issue(m,
      `"listen" cần giới từ "to" trước tân ngữ.`,
      m[0].replace('listen ', 'listen to '),
      'error',
    ),
  },

  // 10. "arrive to" → "arrive at/in"
  {
    id: 'arrive-preposition',
    pattern: /\barrive\s+to\b/gi,
    check: (m) => issue(m,
      '"arrive" dùng "at" (địa điểm nhỏ) hoặc "in" (thành phố/quốc gia), không dùng "to".',
      'arrive at',
      'error',
    ),
  },

  // 11. "according to me" → "in my opinion"
  {
    id: 'according-to-me',
    pattern: /\baccording\s+to\s+(me|us)\b/gi,
    check: (m) => issue(m,
      '"according to me/us" không tự nhiên trong tiếng Anh. Dùng "in my/our opinion".',
      m[0].includes('us') ? 'in our opinion' : 'in my opinion',
      'warning',
    ),
  },

  // 12. "open/close the light/fan" → "turn on/off"
  {
    id: 'open-close-appliance',
    pattern: /\b(open|close)\s+the\s+(light|fan|TV|television|computer|air\s*con(?:ditioner)?)\b/gi,
    check: (m) => {
      const action = m[1].toLowerCase() === 'open' ? 'turn on' : 'turn off';
      return issue(m,
        `Dùng "${action} the ${m[2]}" thay vì "${m[1]} the ${m[2]}".`,
        `${action} the ${m[2]}`,
        'error',
      );
    },
  },

  // 13. "go to home/school/work" khi không có article — "go home/to school/to work"
  {
    id: 'go-home',
    pattern: /\bgo\s+to\s+home\b/gi,
    check: (m) => issue(m, 'Không dùng "to" trước "home". Nói "go home".', 'go home', 'error'),
  },

  // 14. "fun" vs "funny"
  {
    id: 'fun-funny',
    pattern: /\bvery\s+fun\b/gi,
    check: (m) => issue(m,
      '"very fun" không chuẩn. Dùng "a lot of fun" hoặc "very funny" (nếu muốn nói buồn cười).',
      'a lot of fun',
      'warning',
    ),
  },

  // 15. Missing apostrophe: "cant, dont, wont, isnt, arent, wasnt, werent, doesnt, didnt, havent, hasnt, couldnt, wouldnt, shouldnt"
  {
    id: 'missing-apostrophe',
    pattern: /\b(cant|dont|wont|isnt|arent|wasnt|werent|doesnt|didnt|havent|hasnt|couldnt|wouldnt|shouldnt|Im|Ive|Ill|Iam|youre|theyre|hes|shes|weve|theyve)\b/gi,
    check: (m) => {
      const fixes: Record<string, string> = {
        cant: "can't", dont: "don't", wont: "won't", isnt: "isn't",
        arent: "aren't", wasnt: "wasn't", werent: "weren't", doesnt: "doesn't",
        didnt: "didn't", havent: "haven't", hasnt: "hasn't", couldnt: "couldn't",
        wouldnt: "wouldn't", shouldnt: "shouldn't", im: "I'm", ive: "I've",
        ill: "I'll", iam: "I am", youre: "you're", theyre: "they're",
        hes: "he's", shes: "she's", weve: "we've", theyve: "they've",
      };
      const key = m[0].toLowerCase();
      const fix = fixes[key];
      if (!fix) return null;
      return issue(m, `Thiếu dấu nháy đơn. Viết là "${fix}".`, fix, 'error');
    },
  },

  // 16. "could you please + V" — kiểm tra base form sau modal
  {
    id: 'modal-base-form',
    pattern: /\b(can|could|will|would|shall|should|may|might|must)\s+(to\s+\w+)/gi,
    check: (m) => {
      if (/^to\s+/i.test(m[2])) {
        return issue(m,
          `Sau "${m[1]}" dùng động từ nguyên mẫu không "to". Bỏ "to".`,
          m[0].replace(/\s+to\s+/, ' '),
          'error',
        );
      }
      return null;
    },
  },

  // 17. "more + -er" redundancy
  {
    id: 'double-comparative',
    pattern: /\bmore\s+(\w+er)\b/gi,
    check: (m) => {
      const word = m[1].toLowerCase();
      // Only flag short adjectives that already have -er form
      const shortAdjs = ['bigger', 'smaller', 'faster', 'slower', 'taller', 'shorter',
        'older', 'younger', 'harder', 'easier', 'nicer', 'wider', 'deeper'];
      if (shortAdjs.includes(word)) {
        return issue(m,
          `Không dùng "more" với "${m[1]}" — dạng so sánh hơn đã có rồi.`,
          m[1],
          'error',
        );
      }
      return null;
    },
  },

  // 18. "borrow vs lend" confusion
  {
    id: 'borrow-lend',
    pattern: /\b(borrow)\s+(me|him|her|them|us)\b/gi,
    check: (m) => issue(m,
      '"borrow" có nghĩa là mượn (nhận từ người khác). Nếu cho ai mượn, dùng "lend".',
      m[0].replace('borrow', 'lend'),
      'warning',
    ),
  },
];

// ─── Public API ─────────────────────────────────────────────────────────────

export function checkGrammar(text: string): GrammarIssue[] {
  if (!text.trim()) return [];

  const issues: GrammarIssue[] = [];
  const seen = new Set<string>();   // deduplicate by position

  for (const rule of rules) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const result = rule.check(match, text);
      if (!result) continue;
      const key = `${result.start}-${result.end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push(result);
    }
  }

  // Sort by position
  return issues.sort((a, b) => a.start - b.start);
}
