# DM Assistant — MCP Server Companion Spec

## What This Is and What It Isn't

**The standalone Tauri app** is the live session product. It runs at the
table, listens to the mic, pushes real-time suggestions. That's what the
DM pays $35 for. It requires whisper.cpp, optionally Ollama or a Claude
API key. It's the product.

**The MCP server** is a free, open-source companion that connects the
same campaign database to Claude Desktop or claude.ai. It handles
everything the DM does *outside* the live session: prep, post-session
analysis, worldbuilding, and campaign management. It turns Claude into
a campaign-aware assistant that knows your NPCs, your players' backstories,
your plot threads, and your session history.

The MCP server is **free forever**. It's not a revenue source. It's a
force multiplier for the paid app and a free distribution channel through
Anthropic's MCP directory.

---

## Why This Makes the $35 App More Valuable

Without the MCP server, the app is a live session tool. Between sessions,
the campaign data sits in a SQLite file doing nothing.

With the MCP server, the DM opens Claude Desktop and says:

- "Help me plan tonight's session based on where we left off."
- "Generate three encounter options for the Tomb of Kael that connect
  to Drogan's missing brother."
- "My player just sent me a new backstory. Find ways to weave it into
  the main plot."
- "Summarize the last 5 sessions and identify plot threads I've dropped."
- "Create a one-page prep sheet for tonight: key NPCs, unresolved hooks,
  planned encounters, and backstory moments to watch for."

Claude has the full campaign context because the MCP server reads it from
the same SQLite database the app writes to. No copy-pasting. No "let me
give you some context." It just knows.

**This is the DM's complete workflow:**

```
Between Sessions                    During Session
┌──────────────────────────┐       ┌──────────────────────────┐
│                          │       │                          │
│  Claude Desktop + MCP    │       │  DM Assistant App        │
│                          │       │                          │
│  • Session prep          │       │  • Live transcription    │
│  • Backstory integration │       │  • Real-time suggestions │
│  • Encounter design      │  ───► │  • Panic buttons         │
│  • Worldbuilding         │       │  • Ad-hoc questions      │
│  • Post-session review   │       │  • Session export        │
│  • Plot thread analysis  │       │                          │
│  • NPC development       │       │                          │
│                          │       │                          │
│  Reads/writes campaign   │       │  Reads/writes campaign   │
│  SQLite database         │       │  SQLite database         │
│                          │       │                          │
└──────────────────────────┘       └──────────────────────────┘
         │                                    │
         └──────────── Same SQLite DB ────────┘
```

---

## Technical Architecture

### Stack

- **Framework:** FastMCP 3.x (Python) — the standard for MCP servers
- **Transport:** stdio (for Claude Desktop local connection)
- **Database:** Reads/writes the same SQLite DB the Tauri app uses
- **Distribution:** PyPI package + GitHub repo
- **Installation:** `uvx dm-assistant-mcp` or `pip install dm-assistant-mcp`

### Connection to the App's Database

The MCP server needs to know where the app's SQLite database lives.
Discovery order:

1. `DM_ASSISTANT_DB` environment variable (explicit path)
2. Default platform locations:
   - macOS: `~/Library/Application Support/dm-assistant/campaigns.db`
   - Windows: `%APPDATA%/dm-assistant/campaigns.db`
   - Linux: `~/.local/share/dm-assistant/campaigns.db`
3. If not found, the server starts in "standalone mode" and creates a
   new database (useful for users who want to use the MCP server before
   purchasing the app — this is an intentional funnel).

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "dm-assistant": {
      "command": "uvx",
      "args": ["dm-assistant-mcp"],
      "env": {
        "DM_ASSISTANT_DB": "/path/to/campaigns.db"
      }
    }
  }
}
```

The app's Settings page could include a "Copy MCP Config" button that
generates this JSON block with the correct database path pre-filled.

---

## MCP Server Implementation

### Core Server

```python
"""
DM Assistant MCP Server
Connects Claude to your campaign database for session prep,
post-session analysis, and worldbuilding.
"""

from fastmcp import FastMCP
from pathlib import Path
import sqlite3
import json
import os

mcp = FastMCP(
    "DM Assistant",
    description="Campaign-aware TTRPG assistant. Connects Claude to your "
                "DM Assistant campaign database for session prep, post-session "
                "review, worldbuilding, and backstory integration."
)

def get_db_path() -> Path:
    """Discover the campaign database location."""
    if env_path := os.environ.get("DM_ASSISTANT_DB"):
        return Path(env_path)

    import platform
    system = platform.system()
    if system == "Darwin":
        default = Path.home() / "Library/Application Support/dm-assistant/campaigns.db"
    elif system == "Windows":
        default = Path(os.environ.get("APPDATA", "")) / "dm-assistant/campaigns.db"
    else:
        default = Path.home() / ".local/share/dm-assistant/campaigns.db"

    if default.exists():
        return default

    # Standalone mode: create new DB
    standalone = Path.home() / ".dm-assistant/campaigns.db"
    standalone.parent.mkdir(parents=True, exist_ok=True)
    return standalone

def get_db() -> sqlite3.Connection:
    """Get a database connection with row factory."""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn
```

### Resources (Read-Only Data for Claude's Context)

```python
# ── Campaign Resources ──────────────────────────────────────

@mcp.resource("campaign://list")
def list_campaigns() -> str:
    """List all campaigns in the database."""
    db = get_db()
    campaigns = db.execute(
        "SELECT id, name, system, updated_at FROM campaigns ORDER BY updated_at DESC"
    ).fetchall()
    db.close()
    return json.dumps([dict(c) for c in campaigns], indent=2)


@mcp.resource("campaign://{campaign_id}/context")
def get_campaign_context(campaign_id: str) -> str:
    """Get the full campaign context including setting, house rules, and notes."""
    db = get_db()
    campaign = db.execute(
        "SELECT * FROM campaigns WHERE id = ?", (campaign_id,)
    ).fetchone()
    db.close()
    if not campaign:
        return json.dumps({"error": f"Campaign '{campaign_id}' not found"})
    return json.dumps(dict(campaign), indent=2)


@mcp.resource("campaign://{campaign_id}/characters")
def get_characters(campaign_id: str) -> str:
    """Get all player characters with their backstories, bonds, flaws, and goals."""
    db = get_db()
    characters = db.execute(
        "SELECT * FROM characters WHERE campaign_id = ?", (campaign_id,)
    ).fetchall()
    db.close()
    return json.dumps([dict(c) for c in characters], indent=2)


@mcp.resource("campaign://{campaign_id}/npcs")
def get_npcs(campaign_id: str) -> str:
    """Get all NPCs including descriptions and DM-only secrets."""
    db = get_db()
    npcs = db.execute(
        "SELECT * FROM npcs WHERE campaign_id = ? ORDER BY first_appeared DESC",
        (campaign_id,)
    ).fetchall()
    db.close()
    return json.dumps([dict(n) for n in npcs], indent=2)


@mcp.resource("campaign://{campaign_id}/plot_hooks")
def get_plot_hooks(campaign_id: str) -> str:
    """Get all unresolved and resolved plot hooks and promises."""
    db = get_db()
    hooks = db.execute(
        "SELECT * FROM plot_hooks WHERE campaign_id = ? ORDER BY created_session DESC",
        (campaign_id,)
    ).fetchall()
    db.close()
    return json.dumps([dict(h) for h in hooks], indent=2)


# ── Session Resources ───────────────────────────────────────

@mcp.resource("campaign://{campaign_id}/sessions")
def get_sessions(campaign_id: str) -> str:
    """List all sessions for a campaign with dates and summaries."""
    db = get_db()
    sessions = db.execute(
        "SELECT id, session_number, started_at, ended_at, summary "
        "FROM sessions WHERE campaign_id = ? ORDER BY session_number DESC",
        (campaign_id,)
    ).fetchall()
    db.close()
    return json.dumps([dict(s) for s in sessions], indent=2)


@mcp.resource("session://{session_id}/transcript")
def get_session_transcript(session_id: str) -> str:
    """Get the full transcript from a session."""
    db = get_db()
    session = db.execute(
        "SELECT transcript_path FROM sessions WHERE id = ?", (session_id,)
    ).fetchone()
    db.close()
    if not session or not session["transcript_path"]:
        return json.dumps({"error": "No transcript found"})

    transcript_path = Path(session["transcript_path"])
    if not transcript_path.exists():
        return json.dumps({"error": f"Transcript file not found: {transcript_path}"})

    return transcript_path.read_text()


@mcp.resource("session://{session_id}/suggestions")
def get_session_suggestions(session_id: str) -> str:
    """Get all AI suggestions that were generated during a session."""
    db = get_db()
    suggestions = db.execute(
        "SELECT type, title, body, dm_only, timestamp "
        "FROM suggestions WHERE session_id = ? ORDER BY timestamp",
        (session_id,)
    ).fetchall()
    db.close()
    return json.dumps([dict(s) for s in suggestions], indent=2)
```

### Tools (Actions Claude Can Perform)

```python
# ── Campaign Management Tools ───────────────────────────────

@mcp.tool()
def add_npc(
    campaign_id: str,
    name: str,
    description: str,
    secrets: str = "",
    session_number: int = 0
) -> dict:
    """Add a new NPC to the campaign. Claude can create NPCs during
    worldbuilding or prep conversations and they'll appear in the
    app's campaign database automatically."""
    import uuid
    npc_id = str(uuid.uuid4())
    db = get_db()
    db.execute(
        "INSERT INTO npcs (id, campaign_id, name, description, secrets, "
        "first_appeared, is_improvised) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (npc_id, campaign_id, name, description, secrets, session_number, False)
    )
    db.commit()
    db.close()
    return {"id": npc_id, "name": name, "status": "created"}


@mcp.tool()
def update_npc(npc_id: str, description: str = None, secrets: str = None) -> dict:
    """Update an existing NPC's description or DM-only secrets."""
    db = get_db()
    if description:
        db.execute("UPDATE npcs SET description = ? WHERE id = ?", (description, npc_id))
    if secrets:
        db.execute("UPDATE npcs SET secrets = ? WHERE id = ?", (secrets, npc_id))
    db.commit()
    db.close()
    return {"id": npc_id, "status": "updated"}


@mcp.tool()
def add_plot_hook(
    campaign_id: str,
    description: str,
    related_character: str = "",
    created_session: int = 0,
    status: str = "unresolved"
) -> dict:
    """Add a new plot hook or unresolved promise to track."""
    import uuid
    hook_id = str(uuid.uuid4())
    db = get_db()
    db.execute(
        "INSERT INTO plot_hooks (id, campaign_id, description, "
        "related_character, created_session, status) VALUES (?, ?, ?, ?, ?, ?)",
        (hook_id, campaign_id, description, related_character,
         created_session, status)
    )
    db.commit()
    db.close()
    return {"id": hook_id, "status": "created"}


@mcp.tool()
def resolve_plot_hook(hook_id: str, resolution: str, resolved_session: int) -> dict:
    """Mark a plot hook as resolved with a description of how it was resolved."""
    db = get_db()
    db.execute(
        "UPDATE plot_hooks SET status = 'resolved', resolution = ?, "
        "resolved_session = ? WHERE id = ?",
        (resolution, resolved_session, hook_id)
    )
    db.commit()
    db.close()
    return {"id": hook_id, "status": "resolved"}


@mcp.tool()
def update_campaign_context(campaign_id: str, context: str) -> dict:
    """Update the campaign's context notes. This is the raw text that
    gets fed into the live session suggestion engine."""
    db = get_db()
    db.execute(
        "UPDATE campaigns SET context = ?, updated_at = datetime('now') WHERE id = ?",
        (context, campaign_id)
    )
    db.commit()
    db.close()
    return {"campaign_id": campaign_id, "status": "context_updated"}


@mcp.tool()
def add_session_summary(session_id: str, summary: str) -> dict:
    """Add or update a session summary. Claude can generate this from
    the transcript during post-session review."""
    db = get_db()
    db.execute(
        "UPDATE sessions SET summary = ? WHERE id = ?", (summary, session_id)
    )
    db.commit()
    db.close()
    return {"session_id": session_id, "status": "summary_updated"}


@mcp.tool()
def update_character_backstory(
    character_id: str,
    backstory: str = None,
    bonds: str = None,
    flaws: str = None,
    goals: str = None,
    notes: str = None
) -> dict:
    """Update a player character's backstory, bonds, flaws, goals, or DM notes.
    Useful after a player submits new backstory content or after a session
    where character development occurred."""
    db = get_db()
    updates = {}
    if backstory is not None: updates["backstory"] = backstory
    if bonds is not None: updates["bonds"] = bonds
    if flaws is not None: updates["flaws"] = flaws
    if goals is not None: updates["goals"] = goals
    if notes is not None: updates["notes"] = notes

    for field, value in updates.items():
        db.execute(f"UPDATE characters SET {field} = ? WHERE id = ?", (value, character_id))
    db.commit()
    db.close()
    return {"character_id": character_id, "fields_updated": list(updates.keys())}
```

### Prompts (Pre-Built DM Workflows)

```python
# ── Session Prep Prompts ────────────────────────────────────

@mcp.prompt()
def session_prep(campaign_id: str) -> str:
    """Generate a session prep brief. Loads campaign context, characters,
    NPCs, and unresolved plot hooks, then asks Claude to create a
    structured prep sheet for tonight's session."""
    return f"""Please help me prepare for tonight's TTRPG session.

First, read my campaign data:
- Use the campaign://{campaign_id}/context resource for the campaign overview
- Use the campaign://{campaign_id}/characters resource for PC backstories
- Use the campaign://{campaign_id}/npcs resource for NPC details
- Use the campaign://{campaign_id}/plot_hooks resource for unresolved threads
- Use the campaign://{campaign_id}/sessions resource to see recent session summaries

Then create a prep sheet with these sections:
1. **Where We Left Off** — Brief recap of the last session
2. **Tonight's Objectives** — 2-3 things I should try to accomplish
3. **Backstory Moments** — One opportunity per character to connect the
   session to their personal story
4. **Unresolved Hooks** — Which threads might naturally come up tonight
5. **Potential Encounters** — 2-3 encounter ideas appropriate for the
   current situation (include difficulty and mechanics)
6. **NPCs Likely to Appear** — Quick reference for NPCs they might interact with
7. **Improvisation Seeds** — 3 names, 2 locations, and 1 twist I can
   pull out if players go off-script"""


@mcp.prompt()
def post_session_review(session_id: str) -> str:
    """Analyze a completed session's transcript and generate a comprehensive
    review with summary, entity extraction, and plot thread updates."""
    return f"""I just finished a TTRPG session. Please help me review it.

First, read the session data:
- Use the session://{session_id}/transcript resource for the full transcript
- Use the session://{session_id}/suggestions resource to see what the AI
  suggested during the session

Then:
1. **Session Summary** — Write a narrative summary (200-300 words) suitable
   for reading aloud as a "previously on" at the next session
2. **Key Decisions** — List the major choices the party made
3. **New NPCs** — Identify any NPCs that were introduced or improvised.
   For each, use the add_npc tool to save them to the campaign database.
4. **Plot Thread Updates** — Which hooks were advanced, resolved, or created?
   Use the add_plot_hook and resolve_plot_hook tools to update the database.
5. **Character Moments** — Note any significant character development or
   backstory connections that occurred
6. **DM Notes** — Anything I should remember or follow up on

After the analysis, use the add_session_summary tool to save the narrative
summary to the session record."""


@mcp.prompt()
def backstory_integration(campaign_id: str, character_id: str) -> str:
    """Help the DM find ways to weave a specific character's backstory
    into the ongoing campaign."""
    return f"""Help me integrate a player character's backstory into my campaign.

First, read:
- Use campaign://{campaign_id}/context for the campaign overview
- Use campaign://{campaign_id}/characters for all character backstories
  (pay special attention to character {character_id})
- Use campaign://{campaign_id}/npcs for existing NPCs
- Use campaign://{campaign_id}/plot_hooks for current plot threads

Then suggest:
1. **Direct Connections** — NPCs, locations, or events from the character's
   backstory that could appear in the current plot
2. **Thematic Parallels** — Ways the main quest mirrors or contrasts with
   the character's personal arc
3. **Side Quest Hook** — A 1-2 session side quest rooted in the character's
   goals that doesn't derail the main plot
4. **NPC Introduction** — A new NPC connected to the character's past that
   could serve multiple story purposes
5. **Flaw Trigger** — A situation in the upcoming sessions where the
   character's flaw would naturally create drama

For any new NPCs you suggest, offer to add them to the campaign database
using the add_npc tool."""


@mcp.prompt()
def encounter_builder(campaign_id: str, difficulty: str = "medium") -> str:
    """Design a combat or social encounter tailored to the current campaign
    state and party composition."""
    return f"""Design an encounter for my TTRPG campaign.

First, read:
- Use campaign://{campaign_id}/context for setting and current situation
- Use campaign://{campaign_id}/characters for party composition and abilities
- Use campaign://{campaign_id}/plot_hooks for relevant plot threads

Design a {difficulty} difficulty encounter that includes:
1. **Setup** — How the party encounters this situation
2. **Environment** — Map description, terrain features, lighting, hazards
3. **Enemies/NPCs** — Stat blocks or references, tactics, motivations
4. **Complications** — One twist or environmental change mid-encounter
5. **Backstory Tie-In** — How this encounter connects to at least one
   character's personal story
6. **Outcomes** — What happens on success, failure, and partial success
7. **Loot/Rewards** — Appropriate for the party's level

Make it feel specific to this campaign, not generic."""


@mcp.prompt()
def worldbuilding(campaign_id: str, topic: str) -> str:
    """Collaborative worldbuilding that stays consistent with existing lore."""
    return f"""Help me develop the worldbuilding for my campaign, specifically
about: {topic}

First, read:
- Use campaign://{campaign_id}/context for what's already established
- Use campaign://{campaign_id}/npcs for existing characters in the world
- Use campaign://{campaign_id}/plot_hooks for active storylines

Then help me develop {topic} in a way that:
- Is consistent with everything already established
- Creates hooks that connect to existing plot threads
- Includes details the players can discover organically
- Has at least one secret or hidden layer for DM-only knowledge

Present your ideas as suggestions I can accept, modify, or reject.
When I approve something, offer to update the campaign context using
the update_campaign_context tool."""


@mcp.prompt()
def recap_generator(campaign_id: str, num_sessions: int = 5) -> str:
    """Generate a campaign recap covering the last N sessions."""
    return f"""Generate a narrative recap of the last {num_sessions} sessions
of my campaign.

Read:
- Use campaign://{campaign_id}/sessions to find the most recent sessions
- For each session, use session://{{session_id}}/transcript to read what happened
- Use campaign://{campaign_id}/characters for character context

Write a recap that:
- Reads like a story, not a list of events
- Highlights character moments and growth
- Tracks major plot threads across sessions
- Notes unresolved hooks and building tensions
- Ends with the current situation and a sense of what's coming next
- Is suitable for sharing with players as a "story so far" document"""
```

### Main Entry Point

```python
if __name__ == "__main__":
    mcp.run()
```

---

## Usage Examples

### Before the Session (Prep)

**DM opens Claude Desktop, which has the MCP server configured:**

> **DM:** Help me prep for tonight's session.
>
> **Claude:** *[Uses session_prep prompt, reads campaign resources]*
>
> Here's your prep sheet for Session 8:
>
> **Where We Left Off:** The party cleared the tomb entrance, defeating
> 4 skeletons. They're standing at the sealed inner door with Drogan
> examining the Ashen Hand symbol carved into it...
>
> **Backstory Moments:**
> - *Drogan*: The Ashen Hand symbol is a direct connection to his brother
>   Borik. When he recognizes it, give him a Wisdom save — on a failure,
>   he hears his brother's voice from beyond the door.
> - *Sable*: The Hollow King's psychic reach could trigger a reaction from
>   her patron, The Whisper...
>
> *[continues with full prep sheet]*

### After the Session (Review)

> **DM:** We just finished session 8. Analyze the transcript.
>
> **Claude:** *[Uses post_session_review prompt, reads transcript]*
>
> Here's your session review. I've also:
> - Added 2 new NPCs to your database (the ghost knight and the riddle sphinx)
> - Created a new plot hook: "The ghost knight recognized Drogan's holy symbol
>   and said 'your brother wore the same one when he entered these halls'"
> - Marked the "sealed door" hook as resolved
>
> Should I save this summary to the session record?

### Between Sessions (Worldbuilding)

> **DM:** I want to develop the Hollow King's backstory. Who was he before
> he became undead?
>
> **Claude:** *[Uses worldbuilding prompt, reads campaign context]*
>
> Based on what's established — the Ashen Crown, the Tomb of Kael, and the
> cult connection — here are three options for the Hollow King's origin...
>
> Want me to update the campaign context with whichever version you prefer?

---

## How the MCP Server Drives App Sales

**The funnel:**

```
DM discovers MCP server in Anthropic's directory or GitHub
         │
         ▼
Installs it (free, one command: uvx dm-assistant-mcp)
         │
         ▼
Uses it with Claude for session prep and worldbuilding
(Works in standalone mode — creates its own DB)
         │
         ▼
Realizes the database is the same format the app uses
         │
         ▼
Sees the app advertised: "Want real-time suggestions
during your session? Get the DM Assistant app."
         │
         ▼
Buys the $35 app. MCP server now reads from the app's
database. Full workflow unlocked.
```

The MCP server is a free trial of your data model and campaign management
philosophy. The DM builds their campaign in it, gets attached to the
structure, and then the app is the natural upgrade for the live session.

**What goes in the MCP server's README and PyPI description:**

> DM Assistant MCP Server connects Claude to your TTRPG campaign data.
> Use it standalone for session prep and worldbuilding, or pair it with
> the DM Assistant desktop app for a complete workflow that covers prep,
> live play, and post-session review.
>
> The MCP server is free and open source. The desktop app ($35, one-time)
> adds real-time transcription, AI suggestions during play, and panic
> buttons for common DM problems.

---

## Database Schema Additions

The MCP server needs a couple of tables the original schema didn't include:

```sql
-- Plot hooks (referenced by MCP tools)
CREATE TABLE plot_hooks (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaigns(id),
    description TEXT NOT NULL,
    related_character TEXT,       -- character name or ID
    created_session INTEGER,
    resolved_session INTEGER,
    status TEXT DEFAULT 'unresolved',  -- unresolved, resolved, abandoned
    resolution TEXT
);

-- Encounters (created during prep)
CREATE TABLE encounters (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaigns(id),
    name TEXT,
    description TEXT,
    difficulty TEXT,
    enemies TEXT,             -- JSON blob of enemy stat blocks
    environment TEXT,
    complications TEXT,
    backstory_connections TEXT,
    planned_session INTEGER,
    was_used BOOLEAN DEFAULT FALSE
);
```

These tables are created by the app's database migration and shared
between the app and the MCP server.

---

## Distribution Plan

### PyPI Package

```bash
# Install and run
uvx dm-assistant-mcp

# Or install permanently
pip install dm-assistant-mcp
dm-assistant-mcp
```

### Anthropic MCP Directory

Submit to the official MCP directory at modelcontextprotocol.io. This
gets the server listed where Claude Desktop users discover MCP servers.
The listing description emphasizes TTRPG/D&D keywords to capture the
niche audience.

### GitHub

Open source under MIT license. The README includes:
- One-command install
- Claude Desktop configuration JSON
- Usage examples with screenshots
- Link to the paid desktop app
- Contributing guidelines (prompt templates are the easiest contribution)

### Foundry VTT Community

Post in the Foundry Discord and subreddit. Many Foundry users already
use Claude and would immediately understand the value of campaign-aware
AI assistance.

---

## Build Effort

The MCP server is a **2-3 day build** once the app's database schema is
finalized. It's ~300 lines of Python with no complex dependencies. FastMCP
handles all the protocol plumbing.

| Day | Work |
|-----|------|
| 1 | Core server: resources (read campaign data, sessions, transcripts) |
| 2 | Tools (add/update NPCs, plot hooks, session summaries, backstories) |
| 3 | Prompts (session prep, post-session review, backstory integration, encounter builder, worldbuilding, recap generator), packaging and PyPI publish |

Ship it alongside or shortly after the app's beta launch. The MCP server
generates buzz in a different audience (Claude power users) than the app
launch posts (TTRPG subreddits), doubling your surface area.
