Feature: Panic Buttons
  As a Dungeon Master mid-session
  I want one-click emergency help for common problems
  So that I can keep the game moving without breaking flow

  Background:
    Given a session is active with campaign context and backstories

  # --- EXISTING (already implemented) ---

  Scenario: Phones Out — re-engage a distracted player
    When the DM clicks "Phones Out"
    Then a suggestion targets the least-active player by character name
    And the hook connects to their backstory

  Scenario: Need an NPC — generate one on the fly
    When the DM clicks "Need an NPC"
    Then a suggestion provides name, race, personality, quirk, and scene-relevant info

  Scenario: Recap — summarize session so far
    When the DM clicks "Recap"
    Then a read-aloud summary of key events is generated

  # --- NEW ---

  Scenario: Quiet Player — spotlight the least-active character
    When the DM clicks "Quiet Player"
    Then a suggestion creates a spotlight moment for the quietest character
    And the moment fits the current scene context

  Scenario: Deliberation Loop — break analysis paralysis
    When the DM clicks "Deliberation Loop"
    Then a suggestion introduces an urgency event
    And the event forces the party to act now

  Scenario: Too Easy — escalate a trivial combat
    When the DM clicks "Too Easy"
    Then a suggestion provides a combat escalation
    And the escalation fits the current encounter context

  Scenario: Too Hard — de-escalate an overwhelming combat
    When the DM clicks "Too Hard"
    Then a suggestion provides a way to reduce difficulty
    And it preserves narrative believability

  Scenario: Dead Air — break an awkward silence
    When the DM clicks "Dead Air"
    Then a suggestion provides a narrative prompt
    And the prompt is character-specific using backstories

  Scenario: Off Script — handle an unplanned tangent
    When the DM clicks "Off Script"
    Then a suggestion provides a location, NPC, or hook for the tangent
    And it connects back to the main campaign when possible

  Scenario: Energy Low — inject excitement
    When the DM clicks "Energy Low"
    Then a suggestion provides a high-energy narrative beat
    And the beat uses the current scene and characters
