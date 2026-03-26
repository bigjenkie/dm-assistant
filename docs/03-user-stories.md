# DM Assistant — User Stories

## Personas

### Marcus — The Overloaded Veteran
**Age:** 38. **Experience:** 12 years DMing. **Group:** 5 players, weekly sessions.
**Setup:** Runs homebrew campaigns with deep lore. Has a 40-page Google Doc of
campaign notes he can never find anything in during play. Uses Foundry VTT for
maps even at in-person sessions. Laptop is a 3-year-old Lenovo ThinkPad with
integrated graphics. Plays at home, dining room table.
**Pain points:** Forgets his own NPC details. Loses track of which plot hooks
are still open. Combat runs long because he's flipping through notes for stat
blocks. His quietest player, David, is clearly checked out half the time but
Marcus doesn't know how to pull him back in without it feeling forced.

### Priya — The New DM
**Age:** 24. **Experience:** 6 months DMing. **Group:** 4 players, biweekly.
**Setup:** Running Lost Mine of Phandelver (published module) with some homebrew
additions. M2 MacBook Air. Plays at a friend's apartment. Has watched a lot of
Critical Role but doesn't have the improv confidence yet.
**Pain points:** Freezes when players go off-script. Doesn't know rules well
enough to adjudicate on the fly. Terrified of the moment a player asks "what's
this NPC's name?" for someone she invented 3 sessions ago. Spends 4+ hours
prepping each session because she's afraid of being caught unprepared.

### Tomas — The Theater Kid DM
**Age:** 31. **Experience:** 5 years DMing. **Group:** 6 players, weekly.
**Setup:** Runs dramatic, story-heavy campaigns where backstories are central.
Uses unique voices for every NPC. Has an RTX 3060 gaming laptop. Plays at his
place with a Bluetooth speaker for Syrinscape music.
**Pain points:** Juggles 6 backstories and can't always find the perfect moment
to weave them in. Sometimes realizes AFTER the session that a scene would have
been perfect for connecting to a player's history. His players love the drama
but two of them check their phones during other players' spotlight moments.
Pacing is his weakness — dramatic scenes run beautifully but combat drags.

---

## User Stories

### Story 1: Marcus and the Forgotten NPC

```
As Marcus (veteran DM with deep lore)
I want to be reminded of my own NPC details when they come up in conversation
So that I stay consistent without breaking flow to search my notes

Narrative:

It's 45 minutes into the session. Marcus's party has been exploring the
ruins and they've decided to head back to town. One player says, "Let's
go talk to that merchant who sold us the bad map."

Marcus freezes internally. He created that merchant 6 sessions ago. He
knows the name is somewhere in his 40-page Google Doc but he can't
remember it. He's about to stall with "You head to the merchant
district..." when he glances at his laptop.

The notification badge is glowing: 📋 "Fendrel the Cartographer mentioned"

He clicks it. Two seconds later, a suggestion card appears:

  📋 RECALL: Fendrel the Cartographer
  Half-elf, shop in the west market. Sold the party a map to the ruins
  for 50gp — the map was intentionally misleading. Fendrel works for
  the Shadow Guild and was trying to lure adventurers into a trap.
  He doesn't know the party survived.
  [DM ONLY]

Marcus grins. "You find Fendrel in his shop. He looks up from his desk
and his face goes pale when he sees you walk in."

The table erupts. The players remember the bad map. Fendrel's reaction
tells them everything. The scene writes itself.

Without the app, Marcus would have said "You go to the merchant. What
do you want to buy?" and a potential dramatic confrontation would have
been a forgettable shopping scene.

Acceptance:
- Notification appeared because "merchant" + "map" matched keywords
  associated with the NPC "Fendrel" in the campaign context
- LLM was NOT called until Marcus clicked the notification
- The suggestion included the DM ONLY secret (Shadow Guild connection)
- Total latency from click to card: ~4 seconds (integrated GPU, local mode)
- Marcus's laptop fans did not spin up — the LLM was idle until he clicked
```

---

### Story 2: Priya and the Off-Script Panic

```
As Priya (new DM running a published module)
I want immediate help when my players do something I didn't prepare for
So that I can keep the game moving instead of freezing up

Narrative:

Priya's party just cleared the Redbrand hideout. She had the next scene
prepared — they were supposed to go to Cragmaw Castle. Instead, her
rogue says: "I want to go back to the tavern and interrogate the
bartender. He was acting suspicious last time."

Priya did not prepare anything about the bartender being suspicious.
She invented him on the fly two sessions ago and gave him a name she
can't remember. Her stomach drops. She can feel the table waiting.

She hits the 🗺️ Off Script panic button.

Three seconds later (M2 MacBook Air, local mode):

  💡 IMPROV: The Suspicious Bartender
  Name: Toblen Stonehill (from your module notes). He wasn't suspicious
  — but he COULD be. He's been getting late-night visits from a hooded
  figure. If pressed, he reveals he's been paying protection money to
  someone connected to the Black Spider. This creates a new lead to
  Cragmaw Castle without railroading — the party discovers the
  connection themselves.

Priya takes a breath. "Toblen glances nervously at the back door when
you sit down. He starts polishing a glass he already cleaned twice."

The rogue's player leans forward. "I KNEW it."

The party spends 20 minutes on a scene Priya never planned, and it
naturally leads them back to the main quest. Priya looks like a genius.

Acceptance:
- The panic button used a stripped-down prompt (~800 tokens) for fast response
- The suggestion connected the improvised scene to the existing module plot
- It referenced "Toblen Stonehill" from the campaign context (module notes)
- It provided a hook that points back to the main quest (Black Spider)
- Priya never had to say "um, let me check my notes"
```

---

### Story 3: Tomas and the Phones-Out Moment

```
As Tomas (story-heavy DM with 6 players)
I want to re-engage a distracted player using their character's backstory
So that every player feels like the story is about them

Narrative:

Tomas is running a tense negotiation scene between the party and a
noble house. His two most vocal players — Kat and James — are driving
the conversation. It's great drama. But Tomas notices that Sam (who
plays a quiet half-orc barbarian named Gruuk) has been on his phone
for the last 10 minutes. Across the table, Lily (who plays a bard
named Elowen) is also disengaged — she checked out when the scene
stopped involving music or performance.

Tomas hits the 📱 Phones Out button.

Four seconds later:

  💡 PHONES OUT: Targeting Lily (Elowen)
  Elowen's backstory: her mentor, a bard named Thessaly, was last seen
  performing at a noble court before disappearing.

  Suggested hook: "Elowen — as you stand in the noble's hall, you notice
  a portrait on the wall. The woman in the painting is holding a lute
  you recognize. It's Thessaly's lute. What do you do?"

Tomas reads it, adapts it slightly to his voice: "Elowen, while the
others are talking, your eyes drift to the portraits lining the hall.
One of them stops you cold. The woman in the painting is holding a
lute with a silver rose inlaid on the neck. You've seen that lute
before. It belonged to Thessaly."

Lily's phone goes down. Her eyes go wide. "Wait, WHAT? I walk over
to the portrait. What else can I see?"

Now Lily is the center of the scene. Kat and James turn to watch.
Sam puts his phone away because something just happened. The
negotiation scene has suddenly become a personal mystery that
connects to the campaign's larger plot.

Tomas didn't plan this. The app knew that Lily had been quiet, knew
about Thessaly from the backstory, and knew they were in a noble's
hall. It connected the dots in a way that felt like Tomas had been
planning it all along.

Acceptance:
- The app identified Lily/Elowen as least active by analyzing the
  transcript for character name frequency in the last 10 minutes
- It pulled from Elowen's backstory (mentor named Thessaly, disappeared
  at a noble court)
- It generated a hook that fit the current scene (noble's hall) and
  connected to the backstory
- The hook required Lily to respond, pulling her back into the game
- Tomas adapted the suggestion to his narrative style — the app suggested,
  the DM delivered
```

---

### Story 4: Marcus and the Long Combat

```
As Marcus (veteran DM who loses track of time)
I want to know when combat is dragging
So that I can wrap it up before players disengage

Narrative:

Marcus's party is fighting a group of cultists in a ruined temple.
It started exciting — dramatic terrain, falling debris, a ritual to
interrupt. But it's been 35 minutes and three cultists are still
standing with low HP, trading ineffective blows with the party's
tank while the spellcasters conserve resources.

The music shifted to combat 35 minutes ago (automatic, scene classifier
caught "roll initiative"). It's still playing. Marcus hasn't noticed
the energy dropping because he's managing initiative order.

The notification badge lights up: ⏱️

He clicks it:

  ⏱️ PACING: Combat running ~35 minutes
  The party is clearly winning. Three low-HP enemies remain. Consider:
  - Having the remaining cultists attempt to flee (forces decision)
  - The ritual partially completes, creating a new complication
  - One cultist surrenders and offers information
  Any of these ends the slog and transitions to the next beat.

Marcus picks option three. "The cultist closest to the altar drops
his weapon. 'Stop! I'll tell you everything! The ritual — it's
already begun somewhere else.'"

The party shifts from combat to interrogation. Energy comes back.
The session has somewhere to go again.

Acceptance:
- The background analyzer detected sustained combat keywords for 35
  minutes and queued a pacing notification
- The notification threshold for pacing is lower than for entity/backstory
  (it's a timer-based check, not a relevance score)
- The suggestion offered three specific options grounded in the current
  scene context (cultists, ritual, temple)
- The music system continued playing combat music throughout —
  it transitions to tension music after Marcus narrates the surrender
```

---

### Story 5: Priya and the Post-Session Sigh of Relief

```
As Priya (new DM who over-prepares)
I want a session summary I can use for next time
So that I spend less time on recaps and more time on new content

Narrative:

The session just ended. Priya's players are packing up, chatting about
what happened. It was a good session — they cleared the cave, found a
mysterious letter, and one player had a great character moment.

Priya clicks "End Session." The app asks if she wants to generate a
summary. She clicks yes.

Fifteen seconds later (Opus via Claude API — she uses Claude for
post-session because quality matters and latency doesn't):

  📜 SESSION 12 SUMMARY

  Previously on Phandelver...

  The party descended into the goblin cave, dispatching the sentries
  with a clever distraction by Aldric (who transformed a rock into a
  squeaking mouse). Deep inside, they found Sildar Hallwinter chained
  to a wall and gravely wounded. After healing him, Sildar revealed
  that Gundren Rockseeker had been taken to "someplace called Cragmaw
  Castle" by a bugbear named Klarg.

  While searching Klarg's chamber after defeating him, Mira discovered
  a coded letter bearing a spider-shaped wax seal. The party has not
  yet decoded it.

  Character moment: Aldric confided in the group that his
  transformation magic reminds him of his mother, who was a druid.
  This is the first time he's spoken about his family.

  UNRESOLVED:
  - Coded letter with spider seal (not decoded)
  - Sildar mentioned Gundren is at Cragmaw Castle
  - Aldric's mother (druid background — first mention, potential hook)

The app also auto-generated two new entries in the campaign database:
an NPC record for Sildar Hallwinter and a plot hook for the coded letter.
These will show up in the notification system next session when the
players reference them.

Priya copies the "Previously on..." section. Next session, she reads it
aloud in 30 seconds and the whole table is caught up. Her prep time for
session 13 drops from 4 hours to 2 because the app tracked what happened
and what's unresolved.

Acceptance:
- Summary was generated from the full session transcript (one LLM call)
- Used Claude Opus for quality (Priya configured post-session to use Opus)
- The summary captured key events, character moments, and unresolved threads
- New NPCs and plot hooks were added to the campaign database via the
  same LLM call (structured output)
- The MCP server can also generate this via the post_session_review prompt
  in Claude Desktop for additional analysis
```

---

### Story 6: Tomas and the Backstory He Almost Missed

```
As Tomas (story-heavy DM who tracks 6 backstories)
I want to be alerted when a scene naturally connects to a character's backstory
So that I never miss an opportunity to make the story personal

Narrative:

Tomas's party is investigating a burned village. He planned this as a
straightforward mystery — bandits burned the village, the party tracks
them down. Standard fare.

While describing the scene, Tomas says: "You find the remains of a
small chapel. The altar has been smashed, and the symbol of Pelor is
scorched but still visible on the wall."

The notification badge lights up: 🎭

Tomas is busy describing the scene to the other players. He doesn't
click it immediately. Two minutes later, during a pause while a player
rolls Investigation, he clicks.

  🎭 BACKSTORY: Gruuk (Sam's character)
  Gruuk's backstory: raised in a monastery of Pelor after being
  abandoned as an infant. The monks were his only family. He left
  after the monastery was attacked — he doesn't know by whom.

  This burned chapel with a Pelor symbol is a direct parallel.
  Gruuk might recognize the liturgical items, or feel a pang of
  memory. If you want to deepen it: one of the burned books
  could contain a reference to Gruuk's monastery.

Tomas hadn't made the connection. He wrote "chapel of Pelor" because
it fit the village aesthetic. But Sam wrote "monastery of Pelor" in
Gruuk's backstory three months ago. The app connected them.

Tomas turns to Sam. "Gruuk — as you step through the ruined doorway,
something tugs at you. The way the prayer mats are arranged. The
scent of the incense, even burned. This is a Pelorian chapel. It
reminds you of home."

Sam, who has been the quiet player all campaign, sits up straight.
"I... I kneel down and pick through the rubble. Is there anything
that survived?"

This is the first time Sam has initiated a scene in months. The other
players are watching, invested. Tomas decides on the spot that yes,
there IS a burned book with a reference to Gruuk's monastery. The
bandits-burned-a-village mystery just became Gruuk's personal quest.

The notification cost zero LLM calls to detect (keyword match: "Pelor"
appeared in both the transcript and Gruuk's backstory). The LLM call
only happened when Tomas clicked. The total cost of this moment — the
one that turned a generic scene into a campaign-defining character
beat — was one LLM call, 4 seconds of latency, and a $25 conference
microphone.

Acceptance:
- Background analyzer matched "Pelor" in the transcript against "Pelor"
  in Gruuk's backstory keywords — zero LLM cost for detection
- Notification badge glowed with 🎭 type and hint: "Backstory: Gruuk"
- Tomas clicked on his own schedule (2 minutes later, during a natural pause)
- The LLM suggestion connected the scene detail to the specific backstory
  and offered a concrete way to deepen the connection
- Sam's engagement changed because the scene became personal to his character
```

---

## Story Map Summary

| Story | Persona | Feature Exercised | Core Value Demonstrated |
|-------|---------|------------------|----------------------|
| 1 | Marcus | Notification → NPC recall | "I never lose track of my own world" |
| 2 | Priya | Panic button (Off Script) | "I can handle anything my players throw at me" |
| 3 | Tomas | Panic button (Phones Out) + backstory | "Every player feels like the hero of their own story" |
| 4 | Marcus | Pacing notification | "The app watches the clock so I don't have to" |
| 5 | Priya | Post-session summary + export | "Prep takes half the time because the app remembers for me" |
| 6 | Tomas | Backstory notification | "I never miss a moment that could change the campaign" |

Each story follows the same pattern:
1. Real DM problem that every DM recognizes
2. The app detects the moment (cheaply, in the background)
3. The DM chooses to engage (pull, not push)
4. The LLM generates something specific and useful
5. The DM adapts it to their voice and delivers it
6. The table experience is better because of it

**The app suggests. The DM decides. The table benefits.**
