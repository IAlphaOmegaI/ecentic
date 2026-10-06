#!/bin/bash
#
# One Codex consultation, start to finish. This is the only command the
# codex-consultant subagent runs (.claude/agents/codex-consultant.md), and the
# direct lane for a session that runs a consultation itself (CLAUDE.md
# § Consulting Codex).
#
# Why a script and not instructions: 51 consultations between 22 Sep and
# 6 Oct 2026 went through a subagent that was told, in prose, to be a courier.
# Two never launched Codex and answered the question themselves; 33 began
# reading the repository before launching; about ten rewrote the question on
# its way in; every answer was retyped by the model on its way out; one killed
# a running Codex after 14 minutes, called it 55, and reported fragments of the
# working transcript as findings. So nothing here is left to the model:
#
#   * the question is a FILE the caller wrote, piped to Codex as it is;
#   * the answer is the FILE Codex wrote, named in the hand-back and read by
#     the caller — it never passes through the subagent;
#   * the pins (model, reasoning effort, read-only sandbox), the launch, the
#     clock, the cap and the verdict are this script's;
#   * the `hook` subcommand refuses every other command the subagent tries,
#     and a hand-back that is not this script's own text.
#
#   codex-consult.sh start <brief file> [--effort <level>] [--resume <uuid>]
#   codex-consult.sh wait <run directory> [--until-done]
#   codex-consult.sh verify <answer file | run directory>
#   codex-consult.sh list
#   codex-consult.sh hook        (a Claude Code hook: the event's JSON on stdin)
#
# `start` and `wait` print a block that opens `CODEX CONSULT`. With a `STATE:`
# line the run is still going and `NEXT:` is the command to run; with a
# `STATUS:` line it is over and the block is the hand-back, word for word.
#
# The answer is the file Codex wrote in every run but one kind: a run that
# ended with no answer to hand back. Then, and only then, Codex's own session
# file is opened, and a turn it records as finished gives the answer
# (`recover`). `verify` is the caller's, before it reads an answer: is the
# file still the one this run recorded?

set -u
umask 077
# Bytes, not characters: a transcript is not always valid UTF-8, and macOS sed
# stops at the first byte that is not. That is for this script's own reading —
# Codex is started under the locale the caller had.
[ -n "${CODEX_CONSULT_LOCALE+set}" ] || export CODEX_CONSULT_LOCALE="${LC_ALL-}"
export LC_ALL=C

MODEL="gpt-6-astra"
SANDBOX="read-only"
# `ultra` is never used here, and an unknown level is refused rather than
# passed on (CLAUDE.md § Reasoning effort).
EFFORTS="low medium high xhigh max"
# The run is killed at the cap; one `wait` returns inside the Bash tool's
# default 120 s, so a call that forgets its timeout is never moved to the
# background.
CAP="${CODEX_CONSULT_CAP_SECONDS:-3300}"
WINDOW="${CODEX_CONSULT_WAIT_SECONDS:-90}"
# A second `start` for a brief that is running, or answered within this long,
# returns that run: a relaunch is a full duplicate spend.
REUSE=7200

HERE="$(cd "$(dirname "$0")" && pwd)"
SELF="$HERE/$(basename "$0")"
ROOT="$(cd "$HERE/../.." && pwd)"
RUNS="${TMPDIR:-/tmp}"
RUNS="${RUNS%/}/codex-consult"
UUID='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
COMMAND=".claude/scripts/codex-consult.sh"

meta() {
  sed -n "s/^$2=//p" "$1/meta" 2>/dev/null | head -1
}

digest() {
  { shasum -a 256 "$1" 2>/dev/null || sha256sum "$1" 2>/dev/null; } | cut -d' ' -f1
}

clock() {
  printf '%dm%02ds' $(($1 / 60)) $(($1 % 60))
}

# What Codex's own header says it is running with — the first lines of its
# output, before any of the transcript.
header() {
  head -n 20 "$1/log" 2>/dev/null | sed -n "s/^$2: //p" | head -1
}

new_run() {
  mkdir -p "$RUNS" || return 1
  mktemp -d "$RUNS/$(date -u +%Y%m%dT%H%M%SZ).XXXXXX"
}

# A consultation that never started: the refusal is a record like any other,
# so the hand-back hook checks it the same way.
refuse() {
  local status="$1" reason="$2" run
  run="$(new_run)" || {
    printf 'CODEX CONSULT\nSTATUS: %s\nREASON: %s\n' "$status" "$reason"
    exit 3
  }
  {
    echo "CODEX CONSULT"
    echo "STATUS: $status"
    echo "REASON: $reason"
    echo "REPORT_FILE: $run/report"
  } > "$run/handback"
  {
    echo "status: $status"
    echo "reason: $reason"
    echo "codex was not launched"
  } > "$run/report"
  cat "$run/handback"
  # A refusal is a result to hand back, not a failed command to retry.
  exit 0
}

# The newest run of the same brief (the same resumed session, the same effort)
# that is still going or has been answered.
earlier() {
  local key="$1" now run started state
  now="$(date +%s)"
  for run in $(ls -1dt "$RUNS"/*/ 2>/dev/null); do
    run="${run%/}"
    [ "$(meta "$run" key)" = "$key" ] || continue
    started="$(meta "$run" started)"
    [ -n "$started" ] && [ $((now - started)) -le "$REUSE" ] || continue
    if [ ! -f "$run/handback" ]; then
      echo "$run"
      return 0
    fi
    state="$(sed -n 's/^STATUS: //p' "$run/handback" | head -1)"
    if [ "$state" = "complete" ]; then
      echo "$run"
      return 0
    fi
  done
  return 1
}

running() {
  local run="$1" elapsed="$2"
  echo "CODEX CONSULT"
  echo "STATE: running"
  echo "ELAPSED: $(clock "$elapsed") of at most $(clock "$(meta "$run" cap)")"
  echo "NEXT: $COMMAND wait $run"
}

# The one time Codex's session file is opened: the run has ended with no
# answer to hand back. A turn Codex recorded as finished since this run began
# carries its final message, and that is the answer. Nothing short of that is
# taken — the notes of a turn that never finished are transcript — and a
# record this cannot read (the format is Codex's own, and changes with Codex)
# recovers nothing, which leaves the run failed as it was.
recover() {
  local run="$1" rollout="$2"
  [ -n "$rollout" ] && [ -f "$rollout" ] || return 1
  command -v jq > /dev/null 2>&1 || return 1
  # Line by line, so a last line cut short by a kill costs that line alone.
  jq -R -n -j --argjson since "$(meta "$run" started)" '
    [inputs | fromjson? | objects | select(.type == "event_msg") | .payload | objects
      | select(.type == "task_complete" and (.completed_at | numbers) >= $since)
      | .last_agent_message | strings | select(length > 0)] | last // empty
  ' "$rollout" > "$run/answer.recovered" 2>/dev/null
  if [ -s "$run/answer.recovered" ]; then
    mv "$run/answer.recovered" "$run/answer.md"
    return 0
  fi
  rm -f "$run/answer.recovered"
  return 1
}

# The verdict, written once. Everything in it is read from the run's files:
# the exit record, Codex's header, the answer Codex wrote, its session file.
finish() {
  local run="$1"
  if [ ! -f "$run/handback" ]; then
    local code status reason="" cause="" recovered="" session rollout="" answer="(none)" started ended
    code="$(cat "$run/exit" 2>/dev/null)"
    started="$(meta "$run" started)"
    ended="$(stat -f %m "$run/exit" 2>/dev/null || stat -c %Y "$run/exit" 2>/dev/null || date +%s)"
    # Whatever the exit says, a run Codex did not report as read-only is not
    # a consultation: it could have written to the working tree.
    case "$(header "$run" sandbox)" in
      "" | "$SANDBOX"*) ;;
      *) code="sandbox" ;;
    esac
    session="$(header "$run" "session id")"
    [[ "$session" =~ $UUID ]] || session="unknown"

    # `cause` marks a run with no answer to hand back that may still be
    # recovered — every such ending but the sandbox's, whose answer is
    # refused, not missing.
    case "$code" in
      timeout)
        status="timeout"
        reason="no answer after $(clock "$(meta "$run" cap)") — Codex was stopped; resume the session and ask it for what it has"
        cause="Codex was stopped at $(clock "$(meta "$run" cap)")"
        ;;
      sandbox)
        status="failed"
        reason="Codex reported sandbox '$(header "$run" sandbox)', not $SANDBOX — its answer is not used; check 'git status' for anything it wrote"
        ;;
      lost)
        status="failed"
        reason="the Codex process ended without leaving an exit record"
        cause="$reason"
        ;;
      0)
        if [ -s "$run/answer.md" ]; then
          status="complete"
        else
          status="failed"
          reason="Codex exited cleanly and wrote no answer"
          cause="$reason"
        fi
        ;;
      *)
        if [ -s "$run/answer.md" ]; then
          status="partial"
          reason="Codex exited $code after writing an answer"
        else
          status="failed"
          reason="$(tail -n 60 "$run/log" 2>/dev/null |
            grep -iE 'error|failed|unauthor|denied|not found|invalid|limit|expired|refus' |
            tail -1 | sed -E 's/sk-[A-Za-z0-9_*-]+/sk-…/g' | cut -c1-240)"
          [ -n "$reason" ] || reason="Codex exited $code with no answer"
          cause="Codex exited $code with no answer file"
        fi
        ;;
    esac

    # The proof a session really ran: Codex's own rollout file, written to
    # since this run began.
    if [ "$session" != "unknown" ]; then
      rollout="$(find "$HOME/.codex/sessions" -name "rollout-*-$session.jsonl" -newer "$run/meta" 2>/dev/null | head -1)"
    fi

    if [ -n "$cause" ] && recover "$run" "$rollout"; then
      status="partial"
      reason="$cause — the answer is the final message of the turn its session file records as finished"
      recovered="yes"
    fi
    case "$status" in
      complete | partial) answer="$run/answer.md" ;;
    esac

    {
      echo "status: $status"
      [ -z "$reason" ] || echo "reason: $reason"
      echo "session: $session"
      echo "session file: ${rollout:-not found — no Codex session was written to during this run}"
      echo "model: $(header "$run" model) (asked $MODEL)"
      echo "reasoning effort: $(header "$run" "reasoning effort") (asked $(meta "$run" effort))"
      echo "sandbox: $(header "$run" sandbox) (asked $SANDBOX)"
      echo "resumed: $(meta "$run" resume)"
      echo "elapsed: $(clock $((ended - started)))"
      echo "brief: $run/brief.md sha256 $(digest "$run/brief.md")"
      if [ "$answer" != "(none)" ]; then
        echo "answer: $answer sha256 $(digest "$answer"), $(wc -w < "$answer" | tr -d ' ') words"
      fi
      [ -z "$recovered" ] || echo "recovered: yes — Codex left no answer for this run; the answer is the final message of the turn the session file records as finished"
      echo "transcript: $run/log (Codex's working output — never the answer)"
    } > "$run/report"

    {
      echo "CODEX CONSULT"
      echo "STATUS: $status"
      [ -z "$reason" ] || echo "REASON: $reason"
      echo "SESSION: $session"
      echo "ANSWER_FILE: $answer"
      echo "REPORT_FILE: $run/report"
    } > "$run/handback.new"
    mv "$run/handback.new" "$run/handback"
  fi
  cat "$run/handback"
}

# Wait up to `window` seconds for the run to end. Prints the hand-back when it
# has, the running block when it has not.
watch() {
  local run="$1" window="$2" started cap now pid deadline sandbox
  started="$(meta "$run" started)"
  cap="$(meta "$run" cap)"
  deadline=$(($(date +%s) + window))
  while :; do
    [ -f "$run/handback" ] && break
    [ -f "$run/exit" ] && break
    now="$(date +%s)"
    pid="$(cat "$run/pid" 2>/dev/null)"

    sandbox="$(header "$run" sandbox)"
    case "$sandbox" in
      "" | "$SANDBOX"*) ;;
      *)
        echo sandbox > "$run/exit"
        [ -z "$pid" ] || kill "$pid" 2>/dev/null
        break
        ;;
    esac
    if [ $((now - started)) -ge "$cap" ]; then
      echo timeout > "$run/exit"
      if [ -n "$pid" ]; then
        kill "$pid" 2>/dev/null
        sleep 2
        kill -9 "$pid" 2>/dev/null
      fi
      break
    fi
    # The runner records the exit as Codex ends; a process gone for ten
    # seconds with no record was killed from outside.
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      sleep 10
      [ -f "$run/exit" ] || echo lost > "$run/exit"
      break
    fi
    if [ -z "$pid" ] && [ $((now - started)) -ge 30 ]; then
      echo lost > "$run/exit"
      break
    fi
    if [ "$now" -ge "$deadline" ]; then
      running "$run" $((now - started))
      return 0
    fi
    sleep 3
  done
  finish "$run"
}

start() {
  local brief="" effort="${CODEX_REASONING_EFFORT:-xhigh}" resume="" run key found
  while [ $# -gt 0 ]; do
    case "$1" in
      --effort | --resume)
        [ $# -ge 2 ] || refuse rejected "$1 needs a value"
        if [ "$1" = "--effort" ]; then effort="$2"; else resume="$2"; fi
        shift 2
        ;;
      --*)
        refuse rejected "unknown option $1"
        ;;
      *)
        [ -z "$brief" ] || refuse rejected "one brief file per consultation — got a second argument"
        brief="$1"
        shift
        ;;
    esac
  done

  [ -n "$brief" ] || refuse rejected "no brief file — the caller writes the whole question to a file and dispatches with the line 'brief: <absolute path>' (CLAUDE.md § Consulting Codex); a question in the prompt is not carried"
  [ -f "$brief" ] || refuse rejected "the brief is not a file: $(printf '%s' "$brief" | cut -c1-120)"
  [ -s "$brief" ] || refuse rejected "the brief file is empty"
  case " $EFFORTS " in
    *" $effort "*) ;;
    *) refuse rejected "reasoning effort '$effort' is not one of: $EFFORTS" ;;
  esac
  if [ -n "$resume" ] && ! [[ "$resume" =~ $UUID ]]; then
    refuse rejected "--resume takes the session uuid from an earlier report's SESSION line"
  fi

  command -v codex > /dev/null 2>&1 || refuse unavailable "codex is not on PATH"
  codex login status > /dev/null 2>&1 || refuse unavailable "codex has no usable login ('codex login status' failed) — run 'codex login'"

  key="$(digest "$brief"):$resume:$effort"
  if found="$(earlier "$key")"; then
    watch "$found" 5
    return
  fi

  run="$(new_run)" || refuse unavailable "could not create a run directory under $RUNS"
  cp "$brief" "$run/brief.md"
  {
    echo "started=$(date +%s)"
    echo "effort=$effort"
    echo "resume=$resume"
    echo "cap=$CAP"
    echo "key=$key"
    echo "source=$brief"
  } > "$run/meta"

  nohup /bin/bash "$SELF" __run "$run" > /dev/null 2>&1 < /dev/null &
  # Long enough to hand back a failure that is immediate — a login that has
  # expired, a session id Codex does not know.
  watch "$run" 12
}

# The detached half: Codex itself, in the foreground of a process nothing
# waits on. The question is the brief file on stdin; the working transcript —
# megabytes of it on a hard question — goes to the log and nowhere else.
runner() {
  local run="$1" effort resume pid code
  effort="$(meta "$run" effort)"
  resume="$(meta "$run" resume)"
  cd "$ROOT" || {
    echo lost > "$run/exit"
    exit 1
  }
  if [ -n "$CODEX_CONSULT_LOCALE" ]; then
    export LC_ALL="$CODEX_CONSULT_LOCALE"
  else
    unset LC_ALL
  fi
  if [ -z "$resume" ]; then
    codex exec \
      -m "$MODEL" \
      -c "model_reasoning_effort=\"$effort\"" \
      --sandbox "$SANDBOX" \
      --cd "$ROOT" \
      --output-last-message "$run/answer.md" \
      - < "$run/brief.md" > "$run/log" 2>&1 &
  else
    # `exec resume` takes no --sandbox or --cd: the session keeps its own, and
    # the override pins it again. Never --last — with two consultations at
    # once the newest session may be the other one's.
    codex exec resume "$resume" \
      -m "$MODEL" \
      -c "model_reasoning_effort=\"$effort\"" \
      -c "sandbox_mode=\"$SANDBOX\"" \
      --output-last-message "$run/answer.md" \
      - < "$run/brief.md" > "$run/log" 2>&1 &
  fi
  pid=$!
  echo "$pid" > "$run/pid"
  wait "$pid"
  code=$?
  [ -f "$run/exit" ] || echo "$code" > "$run/exit"
}

a_run() {
  local run="${1%/}"
  case "$run" in
    /*/codex-consult/*) ;;
    *) return 1 ;;
  esac
  [ -f "$run/meta" ] || [ -f "$run/handback" ] || return 1
  echo "$run"
}

# Is the answer still the file this run recorded? The digest was taken as the
# run ended, and the caller asks again before it reads. This catches a file
# written to since — not a hand that rewrote the report beside it as well.
verify() {
  local run="$1" recorded current
  recorded="$(sed -n 's/^answer: .* sha256 \([0-9a-f]\{64\}\),.*$/\1/p' "$run/report" 2>/dev/null | head -1)"
  echo "CODEX CONSULT"
  if [ -z "$recorded" ]; then
    echo "NO ANSWER: this run recorded none — its report is $run/report"
    return 1
  fi
  current="$(digest "$run/answer.md")"
  if [ "$current" = "$recorded" ]; then
    echo "VERIFIED: $run/answer.md is the answer this run recorded (sha256 $recorded)"
    return 0
  fi
  echo "CHANGED: $run/answer.md is not the answer this run recorded (sha256 $recorded, now ${current:-no file}) — do not use it"
  return 1
}

list() {
  local run state
  for run in $(ls -1dt "$RUNS"/*/ 2>/dev/null | head -15); do
    run="${run%/}"
    if [ -f "$run/handback" ]; then
      state="$(sed -n 's/^STATUS: //p' "$run/handback" | head -1)"
    else
      state="running"
    fi
    echo "$run  $state  $(header "$run" "session id")"
  done
}

# One line per decision — what the courier tried, and whether it was let.
noted() {
  mkdir -p "$RUNS" 2>/dev/null
  printf '%s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$(printf '%s' "$2" | tr '\n' ' ' | cut -c1-200)" >> "$RUNS/hook.log" 2>/dev/null
}

deny() {
  noted "refused" "${NOTE:-}"
  echo "$1" >&2
  exit 2
}

allow() {
  noted "allowed" "${NOTE:-}"
  exit 0
}

# Is this text the script's own hand-back and nothing more? On a no, WHY says
# what to send instead.
judge() {
  local message="$1" file expected given
  file="$(printf '%s\n' "$message" | sed -n 's/^REPORT_FILE: *//p' | head -1 | tr -d '\r`')"
  file="${file%/report}/handback"
  # A run is known by where its record sits, not by this process's TMPDIR:
  # the hook and the shell that ran `start` are different processes.
  case "$file" in
    /*/codex-consult/*/handback) ;;
    *) file="" ;;
  esac
  # The one hand-back with no record behind it: the script itself could not
  # be run, or could not make a run directory. Three short lines carry no
  # review.
  if [ -z "$file" ] && [ "${#message}" -le 400 ] &&
    [[ "$message" =~ ^[[:space:]]*CODEX\ CONSULT[[:space:]]+STATUS:\ (unavailable|rejected)[[:space:]]+REASON:\ [^[:cntrl:]]+[[:space:]]*$ ]]; then
    return 0
  fi
  if [ -z "$file" ] || [ ! -f "$file" ]; then
    WHY="A hand-back is the block the script printed — the one with a STATUS: line and a REPORT_FILE: line — and nothing else. If '$COMMAND wait <run directory>' still says STATE: running, run it again; if you have not run '$COMMAND start' yet, do that now. If the script itself cannot be run, hand back exactly three lines: 'CODEX CONSULT', 'STATUS: unavailable', 'REASON: <the error, on one line>'. You never write the report yourself."
    return 1
  fi
  squeeze() { tr -d '\r' | sed -e 's/[[:space:]]*$//' -e '/^```/d' -e '/^$/d'; }
  expected="$(squeeze < "$file")"
  given="$(printf '%s\n' "$message" | squeeze)"
  if [ "$expected" != "$given" ]; then
    WHY="Hand back exactly these lines and nothing before, after or between them — no summary, no findings, no notes of your own:
$expected"
    return 1
  fi
  return 0
}

# A report is refused three times, then let go: a subagent that cannot comply
# ends rather than spins, and the caller discards a report in any other shape
# (CLAUDE.md § Consulting Codex). The log keeps what was let through.
strike() {
  local count
  mkdir -p "$RUNS" 2>/dev/null
  count="$(cat "$RUNS/strikes.$1" 2>/dev/null || echo 0)"
  if [ "$count" -ge 3 ]; then
    NOTE="LET GO after three refusals — $NOTE"
    allow
  fi
  echo $((count + 1)) > "$RUNS/strikes.$1"
}

# The subagent's leash, as a Claude Code hook. Exit 2 refuses the call and
# hands the reason to the model. It fails closed: an event it cannot read is
# refused.
hook() {
  local input event tool command background message agent
  input="$(cat)"
  # Without jq the event cannot be read. No command is let through, so no
  # consultation runs; a report is — refusing it would leave the subagent with
  # no way to end, and the caller discards a report that is not the script's.
  if ! command -v jq > /dev/null 2>&1; then
    NOTE="jq is not installed"
    case "$input" in
      *'"tool_name":"Bash"'* | *'"tool_name": "Bash"'*) deny "Refused: the consultation hook needs jq, and it is not installed. Hand back exactly three lines: 'CODEX CONSULT', 'STATUS: unavailable', 'REASON: jq is not installed, so the consult script's hook cannot run'." ;;
      *) allow ;;
    esac
  fi
  event="$(printf '%s' "$input" | jq -r '.hook_event_name // empty' 2>/dev/null)"
  tool="$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null)"

  # The run is ending. Where the report travels through SubagentHandback it
  # was judged there; where it is the subagent's last message, it is judged
  # here.
  case "$event" in
    Stop | SubagentStop)
      message="$(printf '%s' "$input" | jq -r '.last_assistant_message // empty')"
      agent="$(printf '%s' "$input" | jq -r '.agent_id // .session_id // "unknown"' | tr -cd 'A-Za-z0-9_-')"
      NOTE="$event: ${#message} bytes: $message"
      if grep -Eq '"name": ?"SubagentHandback"' "$(printf '%s' "$input" | jq -r '.agent_transcript_path // empty')" 2>/dev/null; then
        allow
      fi
      judge "$message" && allow
      strike "$agent"
      deny "Not finished. Your last message is your report, and it must be the hand-back alone. $WHY"
      ;;
  esac

  case "$tool" in
    Bash)
      command="$(printf '%s' "$input" | jq -r '.tool_input.command // empty')"
      background="$(printf '%s' "$input" | jq -r '.tool_input.run_in_background // false')"
      NOTE="Bash: $command"
      # `start` and `wait` and nothing else: `list` is the caller's, and would
      # show the courier an earlier run to hand back in place of this one.
      local form='^[[:space:]]*(/bin/bash[[:space:]]+|bash[[:space:]]+)?([-A-Za-z0-9_./]*/)?\.claude/scripts/codex-consult\.sh([[:space:]]+(start|wait)([[:space:]]+[-A-Za-z0-9_./:=@+,]+)*)?[[:space:]]*$'
      command="${command#"${command%%[![:space:]]*}"}"
      command="${command%"${command##*[![:space:]]}"}"
      if ! [[ "$command" =~ $form ]] || [[ "$command" == *$'\n'* ]] || [[ "$command" == *--until-done* ]]; then
        deny "Refused. You are the courier: the only command you run is '$COMMAND start <brief file> [--effort max] [--resume <uuid>]' and then '$COMMAND wait <run directory>', each alone on its line — no cd, no pipes, no other command, and nothing that reads the brief, the repository, the answer or the log. If the prompt gave you no brief file, run '$COMMAND start' with no arguments and hand back what it prints."
      fi
      [ "$background" = "true" ] && deny "Refused. Run it in the foreground: 'wait' returns within two minutes by itself, and you run it again while it says STATE: running."
      allow
      ;;
    SubagentHandback)
      message="$(printf '%s' "$input" | jq -r '.tool_input.message // empty')"
      agent="$(printf '%s' "$input" | jq -r '.agent_id // .session_id // "unknown"' | tr -cd 'A-Za-z0-9_-')"
      NOTE="SubagentHandback: ${#message} bytes: $message"
      judge "$message" && allow
      strike "$agent"
      deny "Not delivered. $WHY"
      ;;
    *)
      NOTE="$tool"
      deny "Refused. The courier uses one tool: Bash, to run '$COMMAND'."
      ;;
  esac
}

# bash reads a script as it runs it, so a file rewritten mid-run — a checkout,
# a pull, an edit during a half-hour consultation — would be read from the
# wrong place by a `wait` in flight or by the detached runner. Everything from
# here is parsed before any of it runs, and nothing is read after it.
main() {
  case "${1:-}" in
    start)
      shift
      start "$@"
      ;;
    wait)
      run="$(a_run "${2:-}")" || {
        printf 'CODEX CONSULT\nSTATE: unknown\nNEXT: %s wait <the run directory "start" printed>; "%s list" shows the recent ones\n' "$COMMAND" "$COMMAND"
        exit 3
      }
      if [ "${3:-}" = "--until-done" ]; then
        watch "$run" "$((CAP + 60))"
      else
        watch "$run" "$WINDOW"
      fi
      ;;
    verify)
      # The hand-back names the answer file; its directory is the run.
      run="${2:-}"
      run="${run%/answer.md}"
      run="$(a_run "$run")" || {
        printf 'CODEX CONSULT\nNO ANSWER: not a run — pass the ANSWER_FILE a hand-back named, or its run directory\n'
        exit 3
      }
      verify "$run"
      ;;
    list)
      list
      ;;
    hook)
      hook
      ;;
    __run)
      runner "$2"
      ;;
    *)
      echo "usage: $COMMAND start <brief file> [--effort <level>] [--resume <uuid>]"
      echo "       $COMMAND wait <run directory> [--until-done]"
      echo "       $COMMAND verify <answer file | run directory>"
      echo "       $COMMAND list"
      exit 64
      ;;
  esac
}

main "$@"; exit $?
