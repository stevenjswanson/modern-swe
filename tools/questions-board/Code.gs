/**
 * Questions board — CSE 090-SE / CSE 290-SE, "Tales of Modern Software Engineering".
 *
 * A web app where enrolled students submit questions for the seminar speakers,
 * upvote each other's questions, and comment on them. Backed by the course grade
 * sheet; students never get access to that sheet themselves.
 *
 * Deployment model
 *   Standalone script, webapp executeAs USER_DEPLOYING + access DOMAIN. The script
 *   reads and writes the grade sheet as the owner, and gates every request on the
 *   viewer's address appearing in the Roster tab.
 *
 * One-time setup (see README.md)
 *   1. Script property SPREADSHEET_ID = the grade sheet's id.
 *   2. Run setupSheets() once to add the columns this app needs.
 *
 * Two rules this file exists to enforce, both of which bite this shape of app:
 *   - Columns are addressed by HEADER NAME, never by letter or index. Roster is a
 *     spilled array of two TSS exports; the day an export gains a column, anything
 *     hardcoded to "H" starts reading phone numbers into the auth gate and locks
 *     out the whole class.
 *   - Session.getEffectiveUser() is never consulted for identity. Under
 *     executeAs: USER_DEPLOYING it returns the OWNER, so the common idiom
 *     `getActiveUser().getEmail() || getEffectiveUser().getEmail()` would let every
 *     visitor through the roster gate as the instructor.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

var SHEETS = {
  QUESTIONS:   'Questions',
  SUBMISSIONS: 'Student Submissions',
  ROSTER:      'Roster',
  CONFIG:      'Config',
  EMAILS:      'Email List'
};

/**
 * Every column this app touches, by the exact header text in row 1.
 * Rename a header in the sheet -> change it here, and nowhere else.
 */
var COLS = {
  QUESTIONS: {
    ID:      'Question ID',
    TEXT:    'Question',
    CREATED: 'Created',
    HIDDEN:  'Hidden'
  },
  SUBMISSIONS: {
    ID:          'Submission ID',
    EMAIL:       "Student's email",
    ACTION:      'Action',
    QUESTION_ID: 'QuestionID',
    DATA:        'Data',
    TIMESTAMP:   'Timestamp',
    ROLE:        'Role',
    HIDDEN:      'Hidden'
  },
  ROSTER: {
    EMAIL: 'E-mail (Institution)'
  },
  CONFIG: {
    SETTING: 'Setting',
    VALUE:   'Value',
    NOTES:   'Notes'
  },
  EMAILS: {
    EMAIL: 'Email',
    ADDED: 'Date'          // the column already in the sheet, not a new one
  }
};

/** Sheets this script may write. Roster and Gradesheet are array formulas; a
 *  single stray write destroys them with no script-side undo. */
var WRITABLE_SHEETS = [SHEETS.QUESTIONS, SHEETS.SUBMISSIONS, SHEETS.CONFIG,
                       SHEETS.EMAILS];

var ACTIONS = {
  SUBMIT:   'submit',
  UPVOTE:   'upvote',
  UNUPVOTE: 'unupvote',
  COMMENT:  'comment'
};

/**
 * Course staff who may use the board although they are not enrolled.
 *
 * The deploying account (the person who owns the grade sheet) is always allowed
 * and does not need to be listed. Add TAs and readers here, lowercase.
 *
 * Staff posts are written with Role = "staff" in Student Submissions, so they can
 * be filtered out when counting participation for credit. Staff upvotes DO count
 * toward the displayed total — the number under the arrow has to match what you
 * just clicked — so exclude Role = "staff" rows if you want a student-only count.
 */
var STAFF = [
  'leporter@ucsd.edu',
];

var ROLES = { STUDENT: 'student', STAFF: 'staff' };

var LIMITS = {
  QUESTION_CHARS:        500,
  COMMENT_CHARS:         2000,
  COMMENTS_PER_QUESTION: 10,   // per student, per question
  QUESTIONS_PER_STUDENT: 25
};

/**
 * Participation scoring. These are only the fallbacks — the live values come from
 * the Config sheet, which setupSheets() creates with exactly these rows. Edit the
 * sheet, not this file.
 *
 * Period end times are wall-clock in the course timezone, so they follow the
 * daylight-saving change on 1 Nov 2026 without anyone having to think about it:
 * A and B close at 23:59:59 PDT, C at 23:59:59 PST.
 */
var SCORING_DEFAULTS = {
  periods: [
    { key: 'A', label: 'Period A', ends: '2026-09-30 23:59:59', note: 'Wednesday of week 1' },
    { key: 'B', label: 'Period B', ends: '2026-10-21 23:59:59', note: 'Wednesday of week 4' },
    { key: 'C', label: 'Period C', ends: '2026-11-11 23:59:59', note: 'Wednesday of week 7' }
  ],
  points: { question: 5, upvote: 2, comment: 1 },
  target: 15
};

var CONFIG_KEYS = {
  PERIOD_END: function (key) { return 'Period ' + key + ' ends'; },
  QUESTION:   'Points per question',
  UPVOTE:     'Points per upvote',
  COMMENT:    'Points per comment',
  TARGET:     'Points needed per period'
};

var SITE = 'https://stevenjswanson.github.io/modern-swe';
var CSS_VERSION = '1';             // bump to bust browser caches of tokens/themes
var ROSTER_CACHE_KEY = 'roster:v1';
var ROSTER_CACHE_SECONDS = 21600;  // 6h; the roster changes weekly at most

// ---------------------------------------------------------------------------
// Spreadsheet plumbing — header-name column access
// ---------------------------------------------------------------------------

function book_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) {
    throw new Error(
      'Script property SPREADSHEET_ID is not set. Open the Apps Script editor, ' +
      'go to Project Settings > Script Properties, and add it.');
  }
  return SpreadsheetApp.openById(id);
}

/**
 * Find a sheet by name, tolerating capitalisation.
 *
 * Worth doing explicitly: the mailing-list tab is spelled "Email list" in the
 * spreadsheet and "Email List" in this file, and that matched only because
 * getSheetByName happened to be forgiving. Relying on that would mean a tab
 * renamed to a different case could take a page down with a confusing error.
 */
function findSheet_(book, name) {
  var exact = book.getSheetByName(name);
  if (exact) return exact;
  var wanted = String(name).trim().toLowerCase();
  var all = book.getSheets();
  for (var i = 0; i < all.length; i++) {
    if (String(all[i].getName()).trim().toLowerCase() === wanted) return all[i];
  }
  return null;
}

function sheet_(name) {
  var s = findSheet_(book_(), name);
  if (!s) throw new Error('The spreadsheet has no sheet named "' + name + '".');
  return s;
}

/** Same as sheet_(), but refuses anything outside the write allowlist. */
function writableSheet_(name) {
  var wanted = String(name).trim().toLowerCase();
  var allowed = WRITABLE_SHEETS.some(function (n) {
    return String(n).trim().toLowerCase() === wanted;
  });
  if (!allowed) {
    throw new Error('Refusing to write to "' + name + '" — it is read-only.');
  }
  return sheet_(name);
}

/** Map header text -> 1-based column number, from a sheet's row 1. */
function headerMap_(sheet) {
  var width = sheet.getLastColumn();
  if (width < 1) return {};
  return headerMapFromRow_(sheet.getRange(1, 1, 1, width).getValues()[0]);
}

function headerMapFromRow_(row) {
  var map = {};
  for (var i = 0; i < row.length; i++) {
    var key = String(row[i]).trim();
    if (key && !(key in map)) map[key] = i + 1;   // first wins on duplicates
  }
  return map;
}

/** Resolve one header name to a column number, or fail loudly. */
function col_(map, sheetName, headerName) {
  if (!map[headerName]) {
    throw new Error(
      'Sheet "' + sheetName + '" has no column named "' + headerName + '". ' +
      'Check row 1, or update COLS in Code.gs.');
  }
  return map[headerName];
}

/**
 * Read a sheet's data rows as objects keyed by header name.
 * Only the named headers are pulled out, but all are validated to exist.
 */
function readObjects_(sheet, headerNames) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var map = headerMapFromRow_(values[0]);
  var name = sheet.getName();

  var offsets = {};
  headerNames.forEach(function (h) { offsets[h] = col_(map, name, h) - 1; });

  var out = [];
  for (var r = 1; r < values.length; r++) {
    var obj = {};
    headerNames.forEach(function (h) { obj[h] = values[r][offsets[h]]; });
    out.push(obj);
  }
  return out;
}

/**
 * Read a single column by header name. Used for Roster, where pulling all 49
 * columns on every page load would be ~10x the payload for no reason.
 */
function readColumn_(sheet, headerName) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var c = col_(headerMap_(sheet), sheet.getName(), headerName);
  var values = sheet.getRange(2, c, lastRow - 1, 1).getValues();
  return values.map(function (row) { return row[0]; });
}

/**
 * Append one row, placing each value under its header. Any column the caller does
 * not mention is left blank, so adding a column to the sheet later cannot shift
 * what this script writes.
 */
function appendByHeader_(sheet, valuesByHeader) {
  var map = headerMap_(sheet);
  var name = sheet.getName();
  var row = [];
  for (var i = 0; i < sheet.getLastColumn(); i++) row.push('');
  Object.keys(valuesByHeader).forEach(function (h) {
    row[col_(map, name, h) - 1] = valuesByHeader[h];
  });
  sheet.appendRow(row);
}

// ---------------------------------------------------------------------------
// Identity and the roster gate
// ---------------------------------------------------------------------------

/**
 * The address of the person looking at the page, lowercased.
 * Returns '' when Google will not tell us — a signed-out viewer, or one whose
 * browser picked a non-Workspace account.
 *
 * Never falls back to getEffectiveUser(): that is the OWNER under execute-as-me.
 */
function getActiveEmail_() {
  var email = Session.getActiveUser().getEmail();
  return email ? String(email).trim().toLowerCase() : '';
}

/** The account the app is deployed as. Used ONLY to gate the debugAs override. */
function ownerEmail_() {
  var email = Session.getEffectiveUser().getEmail();
  return email ? String(email).trim().toLowerCase() : '';
}

/**
 * Who this request acts as.
 *
 * debugAs lets the owner preview the board as another address — the only way to
 * exercise the rejection path, since the owner is themselves on the roster. It is
 * honoured for the owner and nobody else, and grants no privilege: an impersonated
 * address still has to clear the roster gate below.
 */
function resolveViewer_(debugAs) {
  var active = getActiveEmail_();
  if (debugAs && active && active === ownerEmail_()) {
    return { email: String(debugAs).trim().toLowerCase(), debug: true, actual: active };
  }
  return { email: active, debug: false, actual: active };
}

/** Enrolled @ucsd.edu addresses, from Roster's institution-email column. */
function rosterEmails_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(ROSTER_CACHE_KEY);
  if (hit) return JSON.parse(hit);

  var raw = readColumn_(sheet_(SHEETS.ROSTER), COLS.ROSTER.EMAIL);
  var seen = {};
  var emails = [];
  raw.forEach(function (value) {
    // Roster is ={'cse-290 students'!A2:AW59; 'cse-090 students'!A2:AW59}, so the
    // unfilled tail of each range arrives as blanks.
    var email = String(value).trim().toLowerCase();
    if (email && !seen[email]) { seen[email] = true; emails.push(email); }
  });

  cache.put(ROSTER_CACHE_KEY, JSON.stringify(emails), ROSTER_CACHE_SECONDS);
  return emails;
}

function isEnrolled_(email) {
  if (!email) return false;
  return rosterEmails_().indexOf(email) !== -1;
}

/** Course staff: the deploying account, plus anyone listed in STAFF. */
function isStaff_(email) {
  if (!email) return false;
  if (email === ownerEmail_()) return true;
  for (var i = 0; i < STAFF.length; i++) {
    if (String(STAFF[i]).trim().toLowerCase() === email) return true;
  }
  return false;
}

/** Anyone allowed to use the board at all. */
function mayUseBoard_(email) {
  return isEnrolled_(email) || isStaff_(email);
}

function roleFor_(email) {
  // Enrolment wins: if a TA is also taking the course, their work is a student's.
  return isEnrolled_(email) ? ROLES.STUDENT : ROLES.STAFF;
}

/** Moderation gate. Re-checked server-side on every staff-only call. */
function requireStaff_(debugAs) {
  var viewer = resolveViewer_(debugAs);
  if (!isStaff_(viewer.email)) {
    throw new Error('Only course staff can do that.');
  }
  return viewer;
}

/** Re-checked on every mutation. The client is not trusted. */
function requireStudent_(debugAs) {
  var viewer = resolveViewer_(debugAs);
  if (!mayUseBoard_(viewer.email)) {
    throw new Error('You are not signed in with an enrolled @ucsd.edu account.');
  }
  return viewer;
}

/**
 * FIRST FUNCTION ON PURPOSE. The Apps Script editor preselects the first function
 * in the file, and its Run dropdown silently fails to commit a selection once the
 * list is long enough to scroll — it updates the label while still running the
 * previously selected function. Keeping setup at the top means Run does the right
 * thing with no dropdown interaction. Check the Executions page if you ever run
 * something else from the editor and the result surprises you.
 */
/**
 * Add the columns this app needs, if they are not already there. Additive only:
 * existing columns keep their positions, and Roster and Gradesheet are untouched.
 */
function setupSheets() {
  var report = [];
  report.push(ensureHeaders_(SHEETS.QUESTIONS, [
    COLS.QUESTIONS.ID, COLS.QUESTIONS.TEXT,
    COLS.QUESTIONS.CREATED, COLS.QUESTIONS.HIDDEN
  ]));
  report.push(ensureHeaders_(SHEETS.SUBMISSIONS, [
    COLS.SUBMISSIONS.ID, COLS.SUBMISSIONS.EMAIL, COLS.SUBMISSIONS.ACTION,
    COLS.SUBMISSIONS.QUESTION_ID, COLS.SUBMISSIONS.DATA,
    COLS.SUBMISSIONS.TIMESTAMP, COLS.SUBMISSIONS.ROLE, COLS.SUBMISSIONS.HIDDEN
  ]));
  report.push(backfillSubmissionIds_());

  report.push(ensureConfigSheet_());
  report.push(ensureSheetWithHeaders_(SHEETS.EMAILS,
    [COLS.EMAILS.EMAIL, COLS.EMAILS.ADDED]));

  report.push(checkPublicSignIn_());

  // Fail now, loudly, rather than at the first student's page load.
  col_(headerMap_(sheet_(SHEETS.ROSTER)), SHEETS.ROSTER, COLS.ROSTER.EMAIL);
  refreshRoster();
  report.push('Roster: "' + COLS.ROSTER.EMAIL + '" found; ' +
              rosterEmails_().length + ' enrolled addresses.');

  var text = report.join('\n');
  Logger.log(text);
  return text;
}

/** Drop the roster cache — call after updating the roster mid-quarter. */
function refreshRoster() {
  CacheService.getScriptCache().remove(ROSTER_CACHE_KEY);
  return rosterEmails_().length + ' enrolled addresses.';
}

// ---------------------------------------------------------------------------
// Value coercion
// ---------------------------------------------------------------------------

/**
 * Keep Sheets from evaluating student text as a formula. A comment of "=SUM(A:A)",
 * or one that merely starts with "-1", is enough to trigger this. A leading
 * apostrophe is the standard escape and is stripped again on read.
 */
function safeCell_(text) {
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function readCell_(value) {
  var text = (value === null || value === undefined) ? '' : String(value);
  return text.charAt(0) === "'" ? text.slice(1) : text;
}

function cleanText_(raw, maxChars, label) {
  var text = String(raw === null || raw === undefined ? '' : raw)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
  if (!text) throw new Error('Your ' + label + ' is empty.');
  if (text.length > maxChars) {
    throw new Error(
      'Your ' + label + ' is ' + text.length + ' characters. The limit is ' +
      maxChars + '.');
  }
  return text;
}

/**
 * Timestamps are written in the course's own timezone (America/Los_Angeles, set in
 * appsscript.json), as ISO 8601 with an explicit offset:
 *
 *     2026-09-21T21:23:22-07:00
 *
 * Reading "9:23 PM" straight out of the sheet beats doing UTC arithmetic in your
 * head at grading time. The offset is not hardcoded: it comes out as -07:00 during
 * PDT and -08:00 once daylight time ends on 1 Nov 2026, which matters because the
 * seminar runs to 30 Nov. Keeping the offset also means the string is unambiguous
 * and still parses correctly in any browser, wherever the reader is.
 */
function timeZone_() {
  try {
    return Session.getScriptTimeZone() || 'America/Los_Angeles';
  } catch (err) {
    return 'America/Los_Angeles';
  }
}

function toLocalIso_(date) {
  try {
    return Utilities.formatDate(date, timeZone_(), "yyyy-MM-dd'T'HH:mm:ssXXX");
  } catch (err) {
    // Never lose a timestamp over a formatting problem.
    return date.toISOString();
  }
}

/** ISO 8601 string. Never a Date — Date is not a legal google.script.run return. */
function nowIso_() {
  return toLocalIso_(new Date());
}

function asIso_(value) {
  if (value instanceof Date) return toLocalIso_(value);
  return value ? String(value) : '';
}

function isTruthyFlag_(value) {
  if (value === true) return true;
  var text = String(value === null || value === undefined ? '' : value)
    .trim().toLowerCase();
  return text === 'true' || text === 'yes' || text === 'y' ||
         text === '1' || text === 'x';
}

/** This zone's UTC offset in minutes at a given instant (PDT = -420, PST = -480). */
function tzOffsetMinutes_(date) {
  try {
    var m = /^([+-])(\d{2}):(\d{2})$/.exec(Utilities.formatDate(date, timeZone_(), 'XXX'));
    if (!m) return 0;
    var mins = (+m[2]) * 60 + (+m[3]);
    return m[1] === '-' ? -mins : mins;
  } catch (err) {
    return 0;
  }
}

/**
 * Parse a deadline from the Config sheet into an instant.
 *
 * Accepts a real Date (if the cell is date-formatted), an ISO string carrying its
 * own offset, or — the form a human would actually type — a bare wall clock like
 * "2026-11-11 23:59:59", which is read in the course timezone.
 *
 * The wall-clock case is the reason for the two-step offset lookup: the offset
 * depends on the instant, and the instant depends on the offset. Guess using the
 * offset at the naive time, then re-check; one correction is enough for a
 * once-a-year DST shift.
 */
function parseCourseTime_(value) {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  var text = String(value === null || value === undefined ? '' : value).trim();
  if (!text) return null;

  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(Z|[+-]\d{2}:?\d{2})?$/.exec(text);
  if (!m) {
    var loose = new Date(text);
    return isNaN(loose.getTime()) ? null : loose;
  }
  if (m[7]) {
    var explicit = new Date(text.replace(' ', 'T'));
    return isNaN(explicit.getTime()) ? null : explicit;
  }

  var naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  var off = tzOffsetMinutes_(new Date(naive));
  var instant = naive - off * 60000;
  var check = tzOffsetMinutes_(new Date(instant));
  if (check !== off) instant = naive - check * 60000;
  return new Date(instant);
}

/**
 * Scoring configuration, from the Config sheet with SCORING_DEFAULTS as the
 * fallback. A missing sheet or an unreadable row falls back rather than breaking
 * the board; run diagnose() to see what is actually in force.
 */
function readConfig_() {
  var settings = {};
  var warnings = [];

  try {
    var sheet = findSheet_(book_(), SHEETS.CONFIG);
    if (sheet) {
      var rows = readObjects_(sheet, [COLS.CONFIG.SETTING, COLS.CONFIG.VALUE]);
      rows.forEach(function (row) {
        var key = String(row[COLS.CONFIG.SETTING]).trim();
        if (key) settings[key] = row[COLS.CONFIG.VALUE];
      });
    } else {
      warnings.push('No "' + SHEETS.CONFIG + '" sheet — using built-in defaults. Run setupSheets().');
    }
  } catch (err) {
    warnings.push('Could not read ' + SHEETS.CONFIG + ': ' + (err && err.message ? err.message : err));
  }

  function num(key, fallback) {
    if (!(key in settings)) return fallback;
    var n = Number(settings[key]);
    if (isNaN(n)) {
      warnings.push('"' + key + '" is not a number; using ' + fallback + '.');
      return fallback;
    }
    return n;
  }

  var periods = SCORING_DEFAULTS.periods.map(function (p) {
    var key = CONFIG_KEYS.PERIOD_END(p.key);
    var end = (key in settings) ? parseCourseTime_(settings[key]) : parseCourseTime_(p.ends);
    if (!end) {
      warnings.push('"' + key + '" is not a date I can read; using ' + p.ends + '.');
      end = parseCourseTime_(p.ends);
    }
    return { key: p.key, label: p.label, note: p.note, end: end };
  });

  // Out-of-order deadlines would silently misfile every event.
  for (var i = 1; i < periods.length; i++) {
    if (periods[i].end.getTime() <= periods[i - 1].end.getTime()) {
      warnings.push('Period ' + periods[i].key + ' ends before Period ' + periods[i - 1].key +
                    '; check the Config sheet.');
    }
  }

  return {
    periods: periods,
    points: {
      question: num(CONFIG_KEYS.QUESTION, SCORING_DEFAULTS.points.question),
      upvote:   num(CONFIG_KEYS.UPVOTE,   SCORING_DEFAULTS.points.upvote),
      comment:  num(CONFIG_KEYS.COMMENT,  SCORING_DEFAULTS.points.comment)
    },
    target: num(CONFIG_KEYS.TARGET, SCORING_DEFAULTS.target),
    warnings: warnings
  };
}

/** Which period an instant falls in, or -1 for "after the last deadline". */
function periodIndexFor_(periods, date) {
  if (!date) return -1;
  var t = date.getTime();
  for (var i = 0; i < periods.length; i++) {
    if (t <= periods[i].end.getTime()) return i;   // the deadline second still counts
  }
  return -1;
}

/** Numeric part of "Q007", for sorting. "Q10" must not sort before "Q9". */
function idNumber_(id) {
  var match = /^Q(\d+)$/i.exec(String(id).trim());
  return match ? parseInt(match[1], 10) : NaN;
}

// ---------------------------------------------------------------------------
// Locking
// ---------------------------------------------------------------------------

/**
 * Serialize writes. Reads deliberately take no lock — locking page loads would
 * queue all 58 students behind each other in the minute after class.
 */
function withWriteLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('The board is busy right now — try again in a moment.');
  }
  try {
    return fn();
  } finally {
    // Sheets writes are buffered. Without this flush, a write can land after the
    // next execution has already taken the lock.
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

/**
 * Fold Student Submissions into per-question state.
 *
 * Upvotes are an append-only event log: a student's current position on a question
 * is whichever of `upvote` / `unupvote` appears LAST in row order. That keeps
 * un-voting from deleting rows, which would shift indices under concurrent clicks
 * and destroy participation evidence collected for grades.
 */
function foldSubmissions_(rows, viewerEmail, includeHidden) {
  var votes = {};      // email -> questionId -> last action
  var comments = {};   // questionId -> [{text, at}]
  var mine = {
    comments: {},      // questionId -> count, for the per-question comment cap
    questions: 0,
    submits: [],       // {qid, at} — one per question this viewer proposed
    commentEvents: [], // {qid, at} — one per comment this viewer left
    lastVote: {}       // qid -> {action, at} — this viewer's final position
  };

  rows.forEach(function (row) {
    var email = String(row[COLS.SUBMISSIONS.EMAIL]).trim().toLowerCase();
    var action = String(row[COLS.SUBMISSIONS.ACTION]).trim().toLowerCase();
    var qid = String(row[COLS.SUBMISSIONS.QUESTION_ID]).trim();
    if (!email || !action) return;

    // A hidden row is treated as though it never happened: it does not show, does
    // not score, and does not count toward the per-question comment cap. Staff
    // still see hidden comments (below) so they can put one back.
    var hidden = isTruthyFlag_(row[COLS.SUBMISSIONS.HIDDEN]);

    if (action === ACTIONS.UPVOTE || action === ACTIONS.UNUPVOTE) {
      if (hidden) return;
      if (!qid) return;
      if (!votes[email]) votes[email] = {};
      votes[email][qid] = action;
      if (email === viewerEmail) {
        // Last event wins, so an upvote that was later undone scores nothing.
        mine.lastVote[qid] = { action: action, at: row[COLS.SUBMISSIONS.TIMESTAMP] };
      }

    } else if (action === ACTIONS.COMMENT) {
      if (!qid) return;
      if (hidden && !includeHidden) return;
      if (!comments[qid]) comments[qid] = [];
      comments[qid].push({
        id:     String(row[COLS.SUBMISSIONS.ID]).trim(),
        text:   readCell_(row[COLS.SUBMISSIONS.DATA]),
        at:     asIso_(row[COLS.SUBMISSIONS.TIMESTAMP]),
        hidden: hidden
      });
      if (email === viewerEmail && !hidden) {
        mine.comments[qid] = (mine.comments[qid] || 0) + 1;
        mine.commentEvents.push({ qid: qid, at: row[COLS.SUBMISSIONS.TIMESTAMP] });
      }

    } else if (action === ACTIONS.SUBMIT) {
      if (hidden) return;
      if (email === viewerEmail) {
        mine.questions++;
        mine.submits.push({ qid: qid, at: row[COLS.SUBMISSIONS.TIMESTAMP] });
      }
    }
  });

  var counts = {};
  var viewerVoted = {};
  Object.keys(votes).forEach(function (email) {
    var byQuestion = votes[email];
    Object.keys(byQuestion).forEach(function (qid) {
      if (byQuestion[qid] !== ACTIONS.UPVOTE) return;
      counts[qid] = (counts[qid] || 0) + 1;
      if (email === viewerEmail) viewerVoted[qid] = true;
    });
  });

  return { counts: counts, viewerVoted: viewerVoted, comments: comments, mine: mine };
}

/**
 * The viewer's participation score, per period.
 *
 * Only activity on questions in `scoreable` counts. A question that has been
 * deleted has no rows left at all; one that has been hidden is deliberately
 * excluded here, so hiding a question withdraws the credit for proposing it and
 * for every upvote and comment on it.
 *
 * An upvote scores in the period of the student's LAST vote event on that
 * question, and only when that event is an upvote — so a vote that was taken back
 * is worth nothing, and one that was taken back and recast counts where it now
 * stands.
 *
 * Each period is capped at the target, so there is nothing to gain from
 * upvote-farming past it. Reaching the target earns that period's badge; the
 * periods are scored independently and points are never pooled across them, so
 * a surplus in one period cannot rescue a shortfall in another.
 */
function scoreFor_(mine, scoreable, config) {
  var periods = config.periods.map(function (p) {
    return {
      key: p.key,
      label: p.label,
      note: p.note,
      endsIso: toLocalIso_(p.end),
      endsLabel: formatDay_(p.end),
      raw: 0,
      points: 0,
      target: config.target,
      counts: { questions: 0, upvotes: 0, comments: 0 }
    };
  });

  function add(at, bucket, value) {
    var i = periodIndexFor_(config.periods, parseCourseTime_(at));
    if (i < 0) return;                 // after the last deadline: earns nothing
    periods[i].raw += value;
    periods[i].counts[bucket]++;
  }

  mine.submits.forEach(function (e) {
    if (scoreable[e.qid]) add(e.at, 'questions', config.points.question);
  });
  mine.commentEvents.forEach(function (e) {
    if (scoreable[e.qid]) add(e.at, 'comments', config.points.comment);
  });
  Object.keys(mine.lastVote).forEach(function (qid) {
    var v = mine.lastVote[qid];
    if (v.action !== ACTIONS.UPVOTE) return;
    if (!scoreable[qid]) return;
    add(v.at, 'upvotes', config.points.upvote);
  });

  var now = new Date();
  var currentIndex = periodIndexFor_(config.periods, now);
  var badges = 0;
  periods.forEach(function (p, i) {
    p.points = Math.min(p.raw, p.target);      // capped
    p.earned = p.points >= p.target;           // this period's badge
    if (p.earned) badges++;
    p.current = (i === currentIndex);
    p.closed = config.periods[i].end.getTime() < now.getTime();
  });

  // The participation requirement: complete the first period, plus at least one
  // of the later ones. Expressed in terms of position rather than the literal
  // names, so it still means something if the periods in Config are renamed.
  var firstDone = periods.length > 0 && periods[0].earned;
  var laterDone = periods.slice(1).filter(function (p) { return p.earned; }).length;
  var requirementMet = firstDone && (periods.length < 2 || laterDone > 0);

  // Deliberately no cross-period total: each period is its own hurdle, and a
  // single number would suggest a surplus in one could cover a gap in another.
  return {
    periods: periods,
    badges: badges,
    badgeTarget: periods.length,
    requirementMet: requirementMet,
    firstDone: firstDone,
    laterDone: laterDone,
    values: config.points,
    target: config.target
  };
}

/** "Sep 30" — for labelling a deadline on the page. */
function formatDay_(date) {
  try {
    return Utilities.formatDate(date, timeZone_(), 'MMM d');
  } catch (err) {
    return '';
  }
}

/**
 * The whole board, as plain JSON-safe values.
 *
 * Carries no identity: no emails, no names, and deliberately no stable
 * pseudonymous author id either. In a class of 58, "author #7 wrote these four
 * comments" plus one self-identifying comment is enough to deanonymize someone.
 */
function buildBoard_(viewerEmail, includeHidden) {
  var questionRows = readObjects_(sheet_(SHEETS.QUESTIONS), [
    COLS.QUESTIONS.ID, COLS.QUESTIONS.TEXT,
    COLS.QUESTIONS.CREATED, COLS.QUESTIONS.HIDDEN
  ]);
  var submissionRows = readObjects_(sheet_(SHEETS.SUBMISSIONS), [
    COLS.SUBMISSIONS.ID, COLS.SUBMISSIONS.EMAIL, COLS.SUBMISSIONS.ACTION,
    COLS.SUBMISSIONS.QUESTION_ID, COLS.SUBMISSIONS.DATA,
    COLS.SUBMISSIONS.TIMESTAMP, COLS.SUBMISSIONS.HIDDEN
  ]);

  var folded = foldSubmissions_(submissionRows, viewerEmail, includeHidden);
  var scoreable = {};      // questions that still earn points: present and not hidden

  var questions = [];
  questionRows.forEach(function (row) {
    var id = String(row[COLS.QUESTIONS.ID]).trim();
    var text = readCell_(row[COLS.QUESTIONS.TEXT]).trim();
    if (!id || !text) return;

    // Students never see a hidden question. Staff do, so they can put it back.
    var hidden = isTruthyFlag_(row[COLS.QUESTIONS.HIDDEN]);
    if (!hidden) scoreable[id] = true;
    if (hidden && !includeHidden) return;

    questions.push({
      id: id,
      text: text,
      hidden: hidden,
      created: asIso_(row[COLS.QUESTIONS.CREATED]),
      upvotes: folded.counts[id] || 0,
      youUpvoted: !!folded.viewerVoted[id],
      yourComments: folded.mine.comments[id] || 0,
      comments: (folded.comments[id] || []).slice()
    });
  });

  questions.sort(function (a, b) {
    // Hidden ones sink to the bottom of the staff view.
    if (a.hidden !== b.hidden) return a.hidden ? 1 : -1;
    if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
    var na = idNumber_(a.id), nb = idNumber_(b.id);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;        // Q9 before Q10
    return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
  });

  return {
    questions: questions,
    yourQuestions: folded.mine.questions,
    score: scoreFor_(folded.mine, scoreable, readConfig_()),
    limits: {
      question: LIMITS.QUESTION_CHARS,
      comment: LIMITS.COMMENT_CHARS,
      commentsPerQuestion: LIMITS.COMMENTS_PER_QUESTION,
      questionsPerStudent: LIMITS.QUESTIONS_PER_STUDENT
    }
  };
}

/** Everything the page needs: identity, gate result, and the board if allowed. */
function buildPayload_(debugAs) {
  var viewer = resolveViewer_(debugAs);
  var allowed = mayUseBoard_(viewer.email);
  var payload = {
    email: viewer.email,
    enrolled: allowed,
    staff: allowed && !isEnrolled_(viewer.email),
    debug: viewer.debug,
    questions: [],
    yourQuestions: 0,
    limits: {
      question: LIMITS.QUESTION_CHARS,
      comment: LIMITS.COMMENT_CHARS,
      commentsPerQuestion: LIMITS.COMMENTS_PER_QUESTION,
      questionsPerStudent: LIMITS.QUESTIONS_PER_STUDENT
    }
  };
  if (!allowed) return payload;

  var board = buildBoard_(viewer.email, payload.staff);
  payload.questions = board.questions;
  payload.yourQuestions = board.yourQuestions;
  payload.score = board.score;
  return payload;
}

// ---------------------------------------------------------------------------
// Public API (called from the page via google.script.run)
// ---------------------------------------------------------------------------

function getBoard(debugAs) {
  requireStudent_(debugAs);
  return buildPayload_(debugAs);
}

function toggleUpvote(questionId, debugAs) {
  var viewer = requireStudent_(debugAs);
  var id = asId_(questionId);

  withWriteLock_(function () {
    var board = buildPayload_(debugAs);
    var current = findQuestion_(board, id);
    if (!current) throw new Error('That question is no longer on the board.');

    appendSubmission_(
      viewer.email,
      current.youUpvoted ? ACTIONS.UNUPVOTE : ACTIONS.UPVOTE,
      id,
      '');
  });

  return buildPayload_(debugAs);
}

function addComment(questionId, text, debugAs) {
  var viewer = requireStudent_(debugAs);
  var id = asId_(questionId);
  var comment = cleanText_(text, LIMITS.COMMENT_CHARS, 'comment');

  withWriteLock_(function () {
    var board = buildPayload_(debugAs);
    var current = findQuestion_(board, id);
    if (!current) throw new Error('That question is no longer on the board.');
    if (current.yourComments >= LIMITS.COMMENTS_PER_QUESTION) {
      throw new Error(
        'You have already left ' + LIMITS.COMMENTS_PER_QUESTION +
        ' comments on this question.');
    }

    appendSubmission_(viewer.email, ACTIONS.COMMENT, id, safeCell_(comment));
  });

  return buildPayload_(debugAs);
}

function addQuestion(text, debugAs) {
  var viewer = requireStudent_(debugAs);
  var question = cleanText_(text, LIMITS.QUESTION_CHARS, 'question');

  withWriteLock_(function () {
    var board = buildPayload_(debugAs);
    if (board.yourQuestions >= LIMITS.QUESTIONS_PER_STUDENT) {
      throw new Error(
        'You have already submitted ' + LIMITS.QUESTIONS_PER_STUDENT + ' questions.');
    }

    var questions = writableSheet_(SHEETS.QUESTIONS);
    var id = nextQuestionId_(questions);
    var created = nowIso_();

    var row = {};
    row[COLS.QUESTIONS.ID] = id;
    row[COLS.QUESTIONS.TEXT] = safeCell_(question);
    row[COLS.QUESTIONS.CREATED] = created;
    row[COLS.QUESTIONS.HIDDEN] = '';
    appendByHeader_(questions, row);

    // Authorship lives in the submissions log, so a submitted question can earn
    // credit. The Questions tab itself stays free of student identities.
    appendSubmission_(viewer.email, ACTIONS.SUBMIT, id, safeCell_(question), created);
  });

  return buildPayload_(debugAs);
}

/**
 * Staff-only: flip a question's Hidden flag. Nothing is removed — the row, its
 * votes and its comments all stay in the sheet, the question just stops showing
 * to students. Reversible.
 */
function setQuestionHidden(questionId, hidden, debugAs) {
  requireStaff_(debugAs);
  var id = asId_(questionId);
  var flag = !!hidden;

  withWriteLock_(function () {
    var sheet = writableSheet_(SHEETS.QUESTIONS);
    var map = headerMap_(sheet);
    var idCol = col_(map, SHEETS.QUESTIONS, COLS.QUESTIONS.ID);
    var hiddenCol = col_(map, SHEETS.QUESTIONS, COLS.QUESTIONS.HIDDEN);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('That question no longer exists.');

    var ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
    var target = 0;
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === id) { target = i + 2; break; }
    }
    if (!target) throw new Error('That question no longer exists.');
    sheet.getRange(target, hiddenCol).setValue(flag ? 'TRUE' : '');
  });

  var payload = buildPayload_(debugAs);
  payload.notice = flag
    ? id + ' is now hidden from students. Nothing was deleted.'
    : id + ' is visible to students again.';
  return payload;
}

/**
 * Staff-only: hide or unhide a single comment.
 *
 * Sets Hidden on that one row in Student Submissions. The comment stops showing to
 * students and stops counting toward its author's participation, but the row — and
 * the record that they wrote it — stays in the sheet. Reversible.
 */
function setCommentHidden(submissionId, hidden, debugAs) {
  requireStaff_(debugAs);
  var id = String(submissionId === null || submissionId === undefined ? '' : submissionId).trim();
  if (!id) throw new Error('No comment was specified.');
  var flag = !!hidden;

  withWriteLock_(function () {
    var sheet = writableSheet_(SHEETS.SUBMISSIONS);
    var map = headerMap_(sheet);
    var idCol = col_(map, SHEETS.SUBMISSIONS, COLS.SUBMISSIONS.ID);
    var actionCol = col_(map, SHEETS.SUBMISSIONS, COLS.SUBMISSIONS.ACTION);
    var hiddenCol = col_(map, SHEETS.SUBMISSIONS, COLS.SUBMISSIONS.HIDDEN);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('That comment no longer exists.');

    var width = Math.max(idCol, actionCol);
    var values = sheet.getRange(2, 1, lastRow - 1, width).getValues();
    var target = 0;
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][idCol - 1]).trim() !== id) continue;
      if (String(values[i][actionCol - 1]).trim().toLowerCase() !== ACTIONS.COMMENT) {
        throw new Error('That row is not a comment.');
      }
      target = i + 2;
      break;
    }
    if (!target) throw new Error('That comment no longer exists.');
    sheet.getRange(target, hiddenCol).setValue(flag ? 'TRUE' : '');
  });

  var payload = buildPayload_(debugAs);
  payload.notice = flag
    ? 'Comment hidden. It no longer shows to students or counts toward participation.'
    : 'Comment restored.';
  return payload;
}

/**
 * Staff-only: delete a question outright — its row in Questions, and every row in
 * Student Submissions that refers to it.
 *
 * This is the one place the app is not append-only, and it is irreversible from
 * here (Sheets version history is the only way back). It also destroys the
 * participation record for that question: the author's `submit` row and every
 * upvote and comment on it go with it. Prefer setQuestionHidden() unless the
 * content actually has to leave the sheet.
 */
function deleteQuestion(questionId, debugAs) {
  requireStaff_(debugAs);
  var id = asId_(questionId);
  var removed = { questions: 0, submissions: 0 };

  withWriteLock_(function () {
    // Submissions first: if the second delete fails, an orphaned question row is
    // easier to spot and clean up than orphaned votes pointing at nothing.
    removed.submissions = deleteRowsMatching_(
      writableSheet_(SHEETS.SUBMISSIONS), COLS.SUBMISSIONS.QUESTION_ID, id);
    removed.questions = deleteRowsMatching_(
      writableSheet_(SHEETS.QUESTIONS), COLS.QUESTIONS.ID, id);
  });

  if (!removed.questions && !removed.submissions) {
    throw new Error('That question no longer exists.');
  }

  var payload = buildPayload_(debugAs);
  payload.notice = 'Deleted ' + id + ' — ' +
    removed.questions + ' question row and ' +
    removed.submissions + ' submission row' + (removed.submissions === 1 ? '' : 's') + '.';
  return payload;
}

/**
 * Delete every data row whose named column equals value. Returns the count.
 *
 * Deletes bottom-up in contiguous blocks: removing a row shifts everything below
 * it up, so any index computed beforehand is only still valid if you work
 * upwards. Call inside the write lock.
 */
function deleteRowsMatching_(sheet, headerName, value) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  var c = col_(headerMap_(sheet), sheet.getName(), headerName);
  var values = sheet.getRange(2, c, lastRow - 1, 1).getValues();

  var rows = [];
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === value) rows.push(i + 2);
  }
  if (!rows.length) return 0;

  var deleted = 0;
  var end = rows.length - 1;
  while (end >= 0) {
    var start = end;
    while (start > 0 && rows[start - 1] === rows[start] - 1) start--;
    sheet.deleteRows(rows[start], end - start + 1);
    deleted += end - start + 1;
    end = start - 1;
  }
  return deleted;
}

function asId_(questionId) {
  var id = String(questionId === null || questionId === undefined ? '' : questionId).trim();
  if (!id) throw new Error('No question was specified.');
  return id;
}

function findQuestion_(board, id) {
  var found = null;
  board.questions.forEach(function (q) { if (q.id === id) found = q; });
  return found;
}

/**
 * Append one submission row, stamped with a fresh id.
 *
 * Every row gets an id because the page has to be able to name a single comment
 * — to hide it — without ever being told who wrote it. Row numbers would not do:
 * deleting a question renumbers everything below it.
 *
 * Call inside the write lock.
 */
function appendSubmission_(email, action, questionId, data, timestamp) {
  var sheet = writableSheet_(SHEETS.SUBMISSIONS);
  var row = {};
  row[COLS.SUBMISSIONS.ID] = nextSubmissionId_(sheet);
  row[COLS.SUBMISSIONS.EMAIL] = email;
  row[COLS.SUBMISSIONS.ACTION] = action;
  row[COLS.SUBMISSIONS.QUESTION_ID] = questionId;
  row[COLS.SUBMISSIONS.DATA] = data;
  row[COLS.SUBMISSIONS.TIMESTAMP] = timestamp || nowIso_();
  row[COLS.SUBMISSIONS.ROLE] = roleFor_(email);
  row[COLS.SUBMISSIONS.HIDDEN] = '';
  appendByHeader_(sheet, row);
  return row[COLS.SUBMISSIONS.ID];
}

/** Next free "S0001". Same high-water scheme as question ids. */
function nextSubmissionId_(submissionsSheet) {
  var rows = readObjects_(submissionsSheet, [COLS.SUBMISSIONS.ID]);
  var max = 0;
  rows.forEach(function (row) {
    var m = /^S(\d+)$/i.exec(String(row[COLS.SUBMISSIONS.ID]).trim());
    if (m) { var n = parseInt(m[1], 10); if (!isNaN(n) && n > max) max = n; }
  });

  var props = PropertiesService.getScriptProperties();
  var mark = parseInt(props.getProperty('LAST_SUBMISSION_NUMBER') || '0', 10);
  if (!isNaN(mark) && mark > max) max = mark;

  var n = max + 1;
  props.setProperty('LAST_SUBMISSION_NUMBER', String(n));

  var next = String(n);
  while (next.length < 4) next = '0' + next;
  return 'S' + next;
}

/**
 * Next free "Qnnn". Derived from the sheet rather than a stored counter, so it
 * stays correct if the tab is hand-edited or re-imported. Call inside the lock.
 */
function nextQuestionId_(questionsSheet) {
  var rows = readObjects_(questionsSheet, [COLS.QUESTIONS.ID]);
  var max = 0;
  rows.forEach(function (row) {
    var n = idNumber_(row[COLS.QUESTIONS.ID]);     // String()-coerced inside
    if (!isNaN(n) && n > max) max = n;
  });

  // High-water mark, so deleting the newest question does not hand its number out
  // again and make an exported sheet ambiguous. The sheet still wins when it is
  // ahead, which keeps this self-healing if the property is lost or the tab is
  // re-imported.
  var props = PropertiesService.getScriptProperties();
  var mark = parseInt(props.getProperty('LAST_QUESTION_NUMBER') || '0', 10);
  if (!isNaN(mark) && mark > max) max = mark;

  var n = max + 1;
  props.setProperty('LAST_QUESTION_NUMBER', String(n));

  var next = String(n);
  while (next.length < 3) next = '0' + next;
  return 'Q' + next;
}

// ---------------------------------------------------------------------------
// Mailing list
// ---------------------------------------------------------------------------

/**
 * The notification list is open to anyone signed in, not just the roster: people
 * who want to hear about future talks are not necessarily enrolled in the course.
 * The only gate is that we know who is asking.
 */
function requireSignedIn_(debugAs) {
  var viewer = resolveViewer_(debugAs);
  if (!viewer.email) {
    throw new Error('We could not tell who you are. Sign in with your ' +
                    'UC San Diego Google account and reload.');
  }
  return viewer;
}

/** The row number holding this address, or 0. Case-insensitive. */
function subscriptionRow_(sheet, email) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var c = col_(headerMap_(sheet), SHEETS.EMAILS, COLS.EMAILS.EMAIL);
  var values = sheet.getRange(2, c, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === email) return i + 2;
  }
  return 0;
}

function subscriptionState_(debugAs) {
  var viewer = resolveViewer_(debugAs);
  var state = { email: viewer.email, known: !!viewer.email, subscribed: false, notice: '' };
  if (!viewer.email) return state;
  try {
    var sheet = findSheet_(book_(), SHEETS.EMAILS);
    state.subscribed = !!(sheet && subscriptionRow_(sheet, viewer.email));
  } catch (err) {
    state.subscribed = false;
  }
  return state;
}

function getSubscription(debugAs) {
  return subscriptionState_(debugAs);
}

/**
 * The two operations, by address. Everything that reaches these has already
 * proved which address it owns — either a Workspace session (the in-domain page)
 * or a Google ID token verified against Google (the public page). Neither path
 * ever takes an address on trust from the browser.
 */
function subscribeEmail_(email) {
  withWriteLock_(function () {
    var sheet = writableSheet_(SHEETS.EMAILS);
    if (subscriptionRow_(sheet, email)) return;      // already on, nothing to do
    var row = {};
    row[COLS.EMAILS.EMAIL] = email;
    row[COLS.EMAILS.ADDED] = nowIso_();
    appendByHeader_(sheet, row);
  });
  return {
    email: email, known: true, subscribed: true,
    notice: 'Done — we will email ' + email + ' about future talks.'
  };
}

/**
 * The row is deleted rather than flagged, so the tab is always exactly the list
 * you would paste into a mail client.
 */
function unsubscribeEmail_(email) {
  withWriteLock_(function () {
    var sheet = writableSheet_(SHEETS.EMAILS);
    var row = subscriptionRow_(sheet, email);
    if (row) sheet.deleteRows(row, 1);
  });
  return {
    email: email, known: true, subscribed: false,
    notice: 'Removed. We will not email ' + email + ' about future talks.'
  };
}

function statusForEmail_(email) {
  var sheet = findSheet_(book_(), SHEETS.EMAILS);
  return {
    email: email, known: true,
    subscribed: !!(sheet && subscriptionRow_(sheet, email)),
    notice: ''
  };
}

/** Add the viewer's own address. Idempotent. */
function subscribe(debugAs) {
  var viewer = requireSignedIn_(debugAs);
  return subscribeEmail_(viewer.email);
}

/** Remove the viewer's own address. */
function unsubscribe(debugAs) {
  var viewer = requireSignedIn_(debugAs);
  return unsubscribeEmail_(viewer.email);
}

// ---------------------------------------------------------------------------
// Public sign-up endpoint (Google Identity Services)
// ---------------------------------------------------------------------------

/**
 * Verify a Google ID token and return the address it proves ownership of.
 *
 * This exists because Apps Script will not tell the script who a visitor is
 * unless they are inside this Workspace domain — so for the public page the
 * browser signs in with Google directly and hands us the resulting ID token. The
 * token is a JWT signed by Google; we check it with Google rather than trusting
 * anything the page says.
 *
 * Every one of these checks matters:
 *   aud  — the token was issued for THIS site, not some other app that could
 *          replay one of its own users' tokens here.
 *   iss  — it really came from Google.
 *   exp  — it has not expired.
 *   email_verified — the account's address is confirmed, not merely typed in.
 */
function verifyIdToken_(idToken) {
  var clientId = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID');
  if (!clientId) {
    throw new Error('Sign-in is not configured yet (no GOOGLE_CLIENT_ID). ' +
                    'Please let the organizers know.');
  }
  var token = String(idToken === null || idToken === undefined ? '' : idToken).trim();
  if (!token) throw new Error('No sign-in token was supplied.');

  var res = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
    { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    throw new Error('That sign-in could not be verified. Please try again.');
  }

  var info;
  try {
    info = JSON.parse(res.getContentText());
  } catch (err) {
    throw new Error('That sign-in could not be verified. Please try again.');
  }

  if (info.aud !== clientId) {
    throw new Error('That sign-in was issued for a different site.');
  }
  var iss = String(info.iss || '');
  if (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com') {
    throw new Error('That sign-in did not come from Google.');
  }
  if (String(info.email_verified) !== 'true') {
    throw new Error('That Google account does not have a verified email address.');
  }
  if (!info.email) {
    throw new Error('That sign-in did not include an email address.');
  }
  var expMs = parseInt(info.exp, 10) * 1000;
  if (!expMs || expMs < Date.now()) {
    throw new Error('That sign-in has expired. Please try again.');
  }

  return String(info.email).trim().toLowerCase();
}

/**
 * POST endpoint for the sign-up page on the course site.
 *
 * Body: {"action": "status" | "subscribe" | "unsubscribe", "idToken": "..."}
 *
 * Deployed so that anyone can reach it, which is safe precisely because the
 * address is taken from the verified token and never from the request.
 */
function doPost(e) {
  var out;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var email = verifyIdToken_(body.idToken);
    var action = String(body.action || 'status').trim().toLowerCase();

    if (action === 'subscribe') out = subscribeEmail_(email);
    else if (action === 'unsubscribe') out = unsubscribeEmail_(email);
    else out = statusForEmail_(email);
    out.ok = true;
  } catch (err) {
    out = { ok: false, error: (err && err.message) ? err.message : String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function doGet(e) {
  var params = (e && e.parameter) || {};
  if (String(params.page || '').trim().toLowerCase() === 'subscribe') {
    return subscribePage_(params);
  }
  return boardPage_(params);
}

/** The notification sign-up page: /exec?page=subscribe */
function subscribePage_(params) {
  var debugAs = params.debugAs || '';
  var template = HtmlService.createTemplateFromFile('Subscribe');

  try {
    template.data = subscriptionState_(debugAs);
    template.error = '';
  } catch (err) {
    template.data = { email: '', known: false, subscribed: false, notice: '' };
    template.error = err && err.message ? err.message : String(err);
  }

  template.site = SITE;
  template.cssVersion = CSS_VERSION;
  template.appUrl = appUrl_();
  template.bootJson = jsonForScript_({ data: template.data, debugAs: debugAs,
                                       error: template.error });

  return template.evaluate()
    .setTitle('Talk notifications — Tales of Modern Software Engineering')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function boardPage_(params) {
  var debugAs = params.debugAs || '';
  var template = HtmlService.createTemplateFromFile('Index');

  try {
    template.data = buildPayload_(debugAs);
    template.error = '';
  } catch (err) {
    // A misconfigured property or a renamed column must show a readable message,
    // not a raw Apps Script stack trace.
    template.data = {
      email: getActiveEmail_(), enrolled: false, staff: false, debug: false,
      questions: [], yourQuestions: 0, limits: {}
    };
    template.error = err && err.message ? err.message : String(err);
  }

  template.site = SITE;
  template.cssVersion = CSS_VERSION;
  template.appUrl = appUrl_();
  template.bootJson = jsonForScript_({
    data: template.data, debugAs: debugAs, error: template.error
  });

  return template.evaluate()
    .setTitle('Questions — Tales of Modern Software Engineering')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * This deployment's /exec URL. Used to build the account-chooser link on the
 * signed-out screen: the page runs inside a sandbox iframe, so the client's own
 * window.location is the sandbox URL, not the app's.
 */
function appUrl_() {
  try {
    return ScriptApp.getService().getUrl() || '';
  } catch (err) {
    return '';
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** JSON safe to drop inside a <script> block. */
function jsonForScript_(value) {
  // U+2028/U+2029 are literal newlines inside a JS string, so they are built
  // from char codes here rather than typed into this file.
  var LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .split(LS).join('\\u2028')
    .split(PS).join('\\u2029');
}

// ---------------------------------------------------------------------------
// One-time setup / diagnostics (run from the editor, not from the web app)
// ---------------------------------------------------------------------------


/**
 * Create the Config sheet if it is missing and seed it from SCORING_DEFAULTS.
 * Only ever adds rows that are not already there, so hand-edited values survive.
 */
/**
 * Give an id to every submission row written before the Submission ID column
 * existed, so staff can hide any comment and not just the recent ones. Fills only
 * blanks, in one write, and leaves the high-water mark above everything it saw.
 */
function backfillSubmissionIds_() {
  var sheet = writableSheet_(SHEETS.SUBMISSIONS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return SHEETS.SUBMISSIONS + ': no rows to backfill.';

  var idCol = col_(headerMap_(sheet), SHEETS.SUBMISSIONS, COLS.SUBMISSIONS.ID);
  var range = sheet.getRange(2, idCol, lastRow - 1, 1);
  var values = range.getValues();

  var max = 0;
  values.forEach(function (r) {
    var m = /^S(\d+)$/i.exec(String(r[0]).trim());
    if (m) { var n = parseInt(m[1], 10); if (!isNaN(n) && n > max) max = n; }
  });

  var filled = 0;
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim()) continue;
    max++;
    var next = String(max);
    while (next.length < 4) next = '0' + next;
    values[i][0] = 'S' + next;
    filled++;
  }

  if (filled) {
    range.setValues(values);
    var props = PropertiesService.getScriptProperties();
    var mark = parseInt(props.getProperty('LAST_SUBMISSION_NUMBER') || '0', 10);
    if (isNaN(mark) || mark < max) props.setProperty('LAST_SUBMISSION_NUMBER', String(max));
  }

  return SHEETS.SUBMISSIONS + ': ' +
    (filled ? 'gave ids to ' + filled + ' existing row' + (filled === 1 ? '' : 's') + '.'
            : 'every row already has an id.');
}

/**
 * Check the public sign-up path end to end, short of a real token.
 *
 * This deliberately makes a live UrlFetchApp call: adding the external_request
 * scope to the manifest is not the same as the owner having granted it, and a
 * deployment that has not been granted it fails only when a visitor first tries
 * to sign in. Running this from the editor triggers the consent prompt at a
 * moment someone is watching, instead of in front of a stranger.
 */
function checkPublicSignIn_() {
  var clientId = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID');
  if (!clientId) {
    return 'Public sign-in: no GOOGLE_CLIENT_ID set — /notifications/ will not work yet.';
  }
  try {
    var res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=setup-check',
      { muteHttpExceptions: true });
    // Google answers 400 for a nonsense token; that it answered at all is the point.
    return 'Public sign-in: client id set, and Google\'s token endpoint is reachable ' +
           '(HTTP ' + res.getResponseCode() + ').';
  } catch (err) {
    return 'Public sign-in: CANNOT reach Google to verify tokens — ' +
           (err && err.message ? err.message : err);
  }
}

/** Create a sheet if it is missing, then make sure it has these headers. */
function ensureSheetWithHeaders_(sheetName, headerNames) {
  var book = book_();
  var created = false;
  if (!findSheet_(book, sheetName)) {
    book.insertSheet(sheetName);
    created = true;
  }
  return (created ? sheetName + ': created. ' : '') +
         ensureHeaders_(sheetName, headerNames);
}

function ensureConfigSheet_() {
  var book = book_();
  var sheet = findSheet_(book, SHEETS.CONFIG);
  var created = false;
  if (!sheet) {
    sheet = book.insertSheet(SHEETS.CONFIG);
    created = true;
  }

  ensureHeaders_(SHEETS.CONFIG,
    [COLS.CONFIG.SETTING, COLS.CONFIG.VALUE, COLS.CONFIG.NOTES]);

  var existing = {};
  readObjects_(sheet, [COLS.CONFIG.SETTING]).forEach(function (row) {
    var key = String(row[COLS.CONFIG.SETTING]).trim();
    if (key) existing[key] = true;
  });

  var wanted = [];
  SCORING_DEFAULTS.periods.forEach(function (p) {
    wanted.push([CONFIG_KEYS.PERIOD_END(p.key), p.ends,
                 p.note + ' — wall clock in ' + timeZone_()]);
  });
  wanted.push([CONFIG_KEYS.QUESTION, SCORING_DEFAULTS.points.question, 'Proposing a question']);
  wanted.push([CONFIG_KEYS.UPVOTE,   SCORING_DEFAULTS.points.upvote,   'Upvoting a question']);
  wanted.push([CONFIG_KEYS.COMMENT,  SCORING_DEFAULTS.points.comment,  'Commenting on a question']);
  wanted.push([CONFIG_KEYS.TARGET,   SCORING_DEFAULTS.target,
               'Maximum credited per period; anything beyond this does not count']);

  var added = [];
  wanted.forEach(function (row) {
    if (existing[row[0]]) return;
    var values = {};
    values[COLS.CONFIG.SETTING] = row[0];
    values[COLS.CONFIG.VALUE] = row[1];
    values[COLS.CONFIG.NOTES] = row[2];
    appendByHeader_(sheet, values);
    added.push(row[0]);
  });

  // Deadlines are text, not dates: a bare wall clock must not be reinterpreted in
  // some other timezone by Sheets' own date handling.
  var map = headerMap_(sheet);
  var valueCol = col_(map, SHEETS.CONFIG, COLS.CONFIG.VALUE);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, valueCol, lastRow - 1, 1).setNumberFormat('@');
  }

  return SHEETS.CONFIG + ': ' +
    (created ? 'created; ' : '') +
    (added.length ? 'added ' + added.join(', ') + '.' : 'already complete.');
}

function ensureHeaders_(sheetName, headerNames) {
  var sheet = writableSheet_(sheetName);
  var map = headerMap_(sheet);
  var added = [];
  headerNames.forEach(function (name) {
    if (map[name]) return;
    var column = sheet.getLastColumn() + 1;
    sheet.getRange(1, column).setValue(name);
    map[name] = column;
    added.push(name);
  });
  return added.length
    ? sheetName + ': added ' + added.join(', ') + '.'
    : sheetName + ': already has every column.';
}

/** Print the resolved column numbers, to check a sheet edit did not break anything. */
function diagnose() {
  var lines = [];
  [[SHEETS.QUESTIONS, COLS.QUESTIONS],
   [SHEETS.SUBMISSIONS, COLS.SUBMISSIONS],
   [SHEETS.ROSTER, COLS.ROSTER]].forEach(function (pair) {
    var map = headerMap_(sheet_(pair[0]));
    Object.keys(pair[1]).forEach(function (key) {
      var header = pair[1][key];
      lines.push(pair[0] + ' / "' + header + '" -> column ' +
                 (map[header] || 'MISSING'));
    });
  });
  lines.push('Timezone: ' + timeZone_() + '  ->  ' + nowIso_());

  var cfg = readConfig_();
  lines.push('Scoring: question ' + cfg.points.question +
             ', upvote ' + cfg.points.upvote +
             ', comment ' + cfg.points.comment +
             ', target ' + cfg.target + ' per period');
  cfg.periods.forEach(function (p) {
    lines.push('  ' + p.label + ' ends ' + toLocalIso_(p.end) + '  (' + p.note + ')');
  });
  cfg.warnings.forEach(function (w) { lines.push('  WARNING: ' + w); });
  lines.push('Deployed as: ' + ownerEmail_());
  lines.push('Staff: ' + (STAFF.length ? STAFF.join(', ') : '(owner only)'));
  lines.push('Enrolled addresses: ' + rosterEmails_().length);
  var text = lines.join('\n');
  Logger.log(text);
  return text;
}
