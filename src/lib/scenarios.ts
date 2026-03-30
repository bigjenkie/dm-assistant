/**
 * Scenario data for the demo player.
 * Each scenario is a recorded session with transcript entries,
 * campaign context, and backstories.
 */

export type ScenarioEntry = {
  speaker: string
  text: string
  delay: number // seconds from start
}

export type Scenario = {
  id: string
  name: string
  description: string
  system: string
  context: string
  backstories: string
  entries: ScenarioEntry[]
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'hollow-king',
    name: 'Curse of the Hollow King',
    description: 'The party returns to the Charred Flagon after clearing a cultist cave. They investigate a coded letter and connect it to the Shadow Guild.',
    system: 'D&D 5e',
    context: `# Curse of the Hollow King
System: D&D 5e. Setting: Ashenmere Valley.

**NPCs:**
- Mayor Hild: Human female, mid-50s, quest giver. Offered 500gp. SECRET: Being blackmailed by the Hollow King's agents — they have her nephew.
- Fendrel the Cartographer: Half-elf, west market. Sold party a misleading map. SECRET: Shadow Guild agent, playing both sides.
- Oldroot: Ancient treant, Heartglade in Bleakwood. Spoke a prophecy about the Ashen Crown. Dying from the Hollow King's corruption.

**Locations:**
- Greyhold: Capital town. Charred Flagon tavern. Market district.
- Bleakwood Forest: Corrupted. Oldroot's Heartglade. Cult activity.
- Tomb of Kael: Sealed tomb. Phylactery rumored inside.
- Khor-Dral Mines: Dwarven silver mines. Drogan's homeland.

**Plot hooks:**
- Coded letter with spider seal (not decoded, connects to Shadow Guild)
- Sable promised to return seedling to Oldroot
- Missing silver shipment from Khor-Dral dwarven mines
- Hollow King's phylactery rumored in Tomb of Kael

**Encounters:**
- Shadow Cultist patrol: 4x Cultist (AC 12, HP 9), 1x Cult Fanatic (AC 13, HP 33, hold person)
- Mayor Hild confrontation: DC 15 Insight, DC 18 Persuasion`,
    backstories: `# Vex Thornwood (Sarah)
Half-elf Ranger, Level 6. Village destroyed by dragon Scorrath. Mother's locket. Seeks revenge. Suspicious of Sable.

# Drogan Ironvow (Mike)
Hill Dwarf Cleric of Moradin, Level 6. Exiled from Khor-Dral, framed. Seeks to clear name. Mentors Gruuk.

# Sable Nighthollow (Jordan)
Tiefling Warlock (Archfey), Level 6. Pact with archfey Whisper. DM SECRET: Whisper bound the Hollow King 200 years ago.

# Gruuk (Sam)
Half-orc Barbarian, Level 6. Raised in Pelor monastery, burned by raiders. Terrified of rage. DM SECRET: Raiders were Hollow King's agents.`,
    entries: [
      { speaker: 'DM', text: "Alright everyone, last session you cleared the cultist cave and found that coded letter. You're back in Greyhold at the Charred Flagon.", delay: 0 },
      { speaker: 'Sarah (Vex)', text: "Vex orders an ale and sits in the corner. I want to watch the door.", delay: 4 },
      { speaker: 'Jordan (Sable)', text: "I'd like to study the coded letter while we rest. Can I make an Investigation check?", delay: 9 },
      { speaker: 'DM', text: "Roll it. What do you get?", delay: 12 },
      { speaker: 'Jordan (Sable)', text: "Fourteen.", delay: 14 },
      { speaker: 'DM', text: "You can tell the cipher is sophisticated — not something a random bandit would use. The spider seal is wax, pressed with a signet ring. This is organized.", delay: 16 },
      { speaker: 'Mike (Drogan)', text: "I want to ask around town about the spider symbol. Has anyone seen it before?", delay: 22 },
      { speaker: 'DM', text: "Drogan, make a Persuasion check as you ask the locals.", delay: 25 },
      { speaker: 'Mike (Drogan)', text: "That's a seventeen.", delay: 27 },
      { speaker: 'DM', text: "An old woman at the market stalls squints at it and says 'That's a Guild mark. Shadow Guild. They used to run the smuggling routes through the valley before the disappearances started.'", delay: 29 },
      { speaker: 'Jordan (Sable)', text: "Shadow Guild? We should find Fendrel. He's a merchant — he might know about smuggling routes.", delay: 36 },
      { speaker: 'Sarah (Vex)', text: "Actually, wasn't Fendrel the one who sold us that bad map? The one that led us into the ambush?", delay: 40 },
      { speaker: 'Jordan (Sable)', text: "Oh. OH. That merchant...", delay: 44 },
      { speaker: 'Sam (Gruuk)', text: "I grip my axe. We go to Fendrel's shop.", delay: 47 },
      { speaker: 'DM', text: "Gruuk, you haven't said much. How are you feeling about heading back into this?", delay: 52 },
    ],
  },
  {
    id: 'mighty-nein',
    name: 'The Mighty Nein — Trostenwald',
    description: 'Zombie crownsguard attack the camp, then the party investigates a suspicious death at the market. Based on Critical Role C2.',
    system: 'D&D 5e',
    context: `# Campaign 2: The Mighty Nein
System: D&D 5e. Setting: Wildemount (Exandria).

**NPCs:**
- Bryce Feelid: Lawmaster of Trostenwald. Halfling, stern but fair.
- Enon Brinjay: Deceased human, early 80s. Retired, helped fishermen. Found dead under suspicious circumstances.
- Rinaldo: Traveling performer, connected to the carnival. Under suspicion.

**Locations:**
- Trostenwald: Small town, Ustaloch lake, market area, Old Mud Hole Tavern, carnival grounds.
- Ustaloch: Lake near Trostenwald. Strange creature emerged from it recently.

**Plot hooks:**
- Dead man (Enon Brinjay) at the carnival — suspicious death, possibly undead
- Water snake creature from Ustaloch — why did it surface?
- Carnival performers under suspicion — something is animating the dead
- Crownsguard zombies near camp — undead activity escalating

**Encounters:**
- 2x Zombie Crownsguard (AC 8, HP 22, slam +3, 1d6+1, Undead Fortitude)`,
    backstories: `# Caleb Widogast (Liam)
Human Wizard. Haunted — burned his parents alive under magical compulsion. Brilliant but broken. Filthy, long coat.

# Nott the Brave (Sam)
Goblin Rogue. Actually a halfling named Veth, transformed by a hag. Protective of Caleb. Drinks heavily.

# Beauregard (Marisha)
Human Monk (Cobalt Soul). Brash, confrontational. Sent away by her father. Good at gathering info.

# Jester (Laura)
Tiefling Cleric of the Traveler. Blue, cheerful, loves pastries. Sheltered upbringing. Draws constantly.

# Fjord (Travis)
Half-orc Warlock. Polite, hides his past. Patron is a sea entity (Uk'otoa). Former sailor.

# Mollymauk (Taliesin)
Tiefling Blood Hunter. Flamboyant. Woke up in a grave with no memory. Embraces the present.

# Yasha (Ashley)
Aasimar Barbarian. Tall, quiet. From Xhorhas. Connected to storms. Mourning a lost love.`,
    entries: [
      { speaker: 'DM (Matt)', text: "You watch as these two zombified guards, their brass-colored scale armor clanking as their forms rise up, looking around, peer past the shadowed darkness around the campfire.", delay: 0 },
      { speaker: 'Travis (Fjord)', text: "Son of a bitch.", delay: 4 },
      { speaker: 'DM (Matt)', text: "I would like you all to roll initiative, please.", delay: 6 },
      { speaker: 'Marisha (Beau)', text: "Natural 20!", delay: 9 },
      { speaker: 'DM (Matt)', text: "Beau at the top. You watch as they both begin to lumber in your direction. Beau, you're up.", delay: 12 },
      { speaker: 'Marisha (Beau)', text: "I turn to Jester and Molly. Fucking— we probably shouldn't kill crownsguard, even if it's a zombie.", delay: 16 },
      { speaker: 'Laura (Jester)', text: "We should probably kill the zombies because anybody that gets bitten by a zombie turns into another zombie!", delay: 20 },
      { speaker: 'Marisha (Beau)', text: "I'm going to do an elbow to the face and then another punch with the staff. Flurry of Blows.", delay: 24 },
      { speaker: 'DM (Matt)', text: "Roll for the attack.", delay: 27 },
      { speaker: 'Marisha (Beau)', text: "Oh god, this makes me so nervous. That's good! 19 for the first one.", delay: 30 },
      { speaker: 'DM (Matt)', text: "That hits. You crack the zombie across the jaw, snapping its head to the side with a wet crunch. It stumbles but keeps coming.", delay: 33 },
      { speaker: 'Laura (Jester)', text: "Let's go to, is there a market area?", delay: 40 },
      { speaker: 'DM (Matt)', text: "There's an area where people sell simple wares, vegetables, meats, and crafted goods. If you want to make an investigation check.", delay: 43 },
      { speaker: 'Laura (Jester)', text: "16.", delay: 46 },
      { speaker: 'DM (Matt)', text: "You learn the deceased man's name was Enon Brinjay, a human in his early 80s who seemed healthy for his age. He'd been retired but occasionally helped fishermen on the lake.", delay: 48 },
      { speaker: 'Taliesin (Molly)', text: "Do we know where he was staying, maybe where he was drinking?", delay: 54 },
      { speaker: 'DM (Matt)', text: "He frequently drank at The Old Mud Hole Tavern.", delay: 57 },
      { speaker: 'Travis (Fjord)', text: "I should point out this is the second connection to the Ustaloch.", delay: 61 },
      { speaker: 'Laura (Jester)', text: "It came up out of the lake for some reason. I almost died.", delay: 65 },
      { speaker: 'Marisha (Beau)', text: "I lean into Fjord's ear: There's something in the lake.", delay: 69 },
      { speaker: 'Laura (Jester)', text: "Excuse me, do you have any pastries?", delay: 73 },
    ],
  },
]
