/**
 * Hardcoded demo campaign data for development and feasibility testing.
 * This mirrors the test-data/hollow-king/ folder contents.
 */

export const DEMO_CONTEXT = `# Curse of the Hollow King

**System:** D&D 5e
**Setting:** The Ashenmere Valley — a once-prosperous region now in decline. The capital, Greyhold, sits beneath a crumbling fortress.

**Current arc:** The party has been hired by Mayor Hild of Greyhold to investigate disappearances. They've traced a cult to the Bleakwood Forest, linked to the Hollow King — a lich supposedly destroyed 200 years ago.

**NPCs:**
- Mayor Hild: Human female, mid-50s, quest giver. Offered 500gp. SECRET: Being blackmailed by the Hollow King's agents — they have her nephew.
- Fendrel the Cartographer: Half-elf, west market. Sold party a misleading map. SECRET: Shadow Guild agent, playing both sides.
- Oldroot: Ancient treant, Heartglade in Bleakwood. Spoke a prophecy about the Ashen Crown. Dying from the Hollow King's corruption.

**Active plot hooks:**
- Coded letter with spider seal (not decoded, connects to Shadow Guild)
- Sable promised to return seedling to Oldroot
- Missing silver shipment from Khor-Dral dwarven mines
- Fendrel's Shadow Guild connection (party doesn't know)
- Hollow King's phylactery rumored in the Tomb of Kael

**Locations:**
- Greyhold: Capital town. Mayor Hild's seat. Market district. Charred Flagon tavern.
- Bleakwood Forest: Ancient forest, corrupted. Oldroot's Heartglade. Cult activity. Dangerous wildlife.
- Tomb of Kael: Sealed ancient tomb. Rumored location of the Hollow King's phylactery. Entry hidden near a dry riverbed.
- Khor-Dral Mines: Dwarven silver mines. Recent cave-ins. Possible undead incursion. Drogan's homeland.
- Charred Flagon: Tavern in Greyhold. Party's base of operations. Bartender knows local gossip.
- Shadow Guild Safehouse: Hidden in Greyhold's sewers. Fendrel's contacts operate here. Party doesn't know location yet.

**Planned encounters:**
- Shadow Cultist patrol: 4x Cultist (AC 12, HP 9), 1x Cult Fanatic (AC 13, HP 33, hold person)
- Oldroot encounter: return seedling for phylactery clue
- Mayor Hild confrontation: DC 15 Insight to detect lies, DC 18 Persuasion for confession

**House rules:** Crit = max die + roll. Healing potion = bonus action. Death saves private. Flanking = +2.`

export const DEMO_BACKSTORIES = `# Vex Thornwood (Sarah)
Half-elf Ranger, Level 6. Village destroyed by dragon Scorrath at age 14. Mother died protecting her. Carries silver locket with mother's portrait. Seeking revenge on Scorrath. Trusts wilderness over people. Closest to Drogan, suspicious of Sable, protective of Gruuk.

# Drogan Ironvow (Mike)
Hill Dwarf Cleric of Moradin, Level 6. Exiled from Khor-Dral, accused of stealing sacred relics — crime he didn't commit. Suspects mentor High Priest Thordak framed him. Defers to authority. Steady, reliable. Mentors Gruuk, debates faith with Sable.

# Sable Nighthollow (Jordan)
Tiefling Warlock (Archfey), Level 6. Pact with archfey Whisper after nearly dying in the Feywild. Hears Whisper in dreams giving cryptic instructions. Hasn't told the party. Lies by reflex. DM SECRET: Whisper originally bound the Hollow King 200 years ago. Sable's pact is part of ensuring the binding holds.

# Gruuk (Sam)
Half-orc Barbarian, Level 6. Raised in a monastery of Pelor after being abandoned. Monks were his only family. Raiders attacked and burned the monastery — Gruuk survived by raging and killing three with bare hands. Terrified of his own rage. Quiet, listens to everything. DM SECRET: Raiders were Hollow King's agents. Monastery held a fragment of the binding ritual.`

export const DEMO_TRANSCRIPT_ENTRIES = [
  { text: "Alright everyone, last session you cleared the cultist cave and found that coded letter. You're back in Greyhold at the Charred Flagon.", delay: 0 },
  { text: "Vex orders an ale and sits in the corner. I want to watch the door.", delay: 5 },
  { text: "I'd like to study the coded letter while we rest. Can I make an Investigation check?", delay: 15 },
  { text: "Roll it. What do you get?", delay: 20 },
  { text: "Fourteen.", delay: 22 },
  { text: "You can tell the cipher is sophisticated — not something a random bandit would use. The spider seal is wax, pressed with a signet ring. This is organized.", delay: 25 },
  { text: "I want to ask around town about the spider symbol. Has anyone seen it before?", delay: 35 },
  { text: "Drogan, make a Persuasion check as you ask the locals.", delay: 38 },
  { text: "That's a seventeen.", delay: 40 },
  { text: "An old woman at the market stalls squints at it and says 'That's a Guild mark. Shadow Guild. They used to run the smuggling routes through the valley before the disappearances started.'", delay: 42 },
  { text: "Shadow Guild? We should find Fendrel. He's a merchant — he might know about smuggling routes.", delay: 55 },
  { text: "Actually, wasn't Fendrel the one who sold us that bad map? The one that led us into the ambush?", delay: 60 },
  { text: "Oh. OH. That merchant...", delay: 65 },
  { text: "I grip my axe. We go to Fendrel's shop.", delay: 68 },
  { text: "Gruuk, you haven't said much. How are you feeling about heading back into this?", delay: 75 },
]
