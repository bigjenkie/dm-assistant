Feature: DM Session Workflow
  As a Dungeon Master
  I want to manage a session through the app
  So that I can get AI-assisted suggestions during play

  Background:
    Given the app is loaded with a mock LLM provider

  # --- SESSION LIFECYCLE ---

  Scenario: App starts in idle state
    Then the status bar should show "No Session"
    And the campaign context editor should be editable
    And the panic buttons should be disabled
    And the suggestion panel should show an empty state message

  Scenario: DM starts a session
    Given the DM has entered campaign context
    When the DM clicks "Start Session"
    Then the status bar should show "Session Active"
    And the campaign context editor should be locked
    And the panic buttons should be enabled
    And a session timer should be running

  Scenario: DM ends a session
    Given a session is active
    When the DM clicks "End Session"
    Then the status bar should show "Session Ended"
    And the panic buttons should be disabled
    And the campaign context editor should remain locked

  # --- CAMPAIGN CONTEXT ---

  Scenario: DM enters campaign context before session
    When the DM types campaign context into the editor
    Then the context should be stored
    And it should be available when suggestions are generated

  Scenario: Campaign editor is locked during active session
    Given a session is active
    Then the campaign context textarea should be disabled
    And a message should indicate context is locked

  # --- TRANSCRIPT INPUT ---

  Scenario: DM adds a transcript entry during session
    Given a session is active
    When the DM types "The party enters the tavern" into the transcript input
    And clicks the Add button
    Then the transcript panel should show the entry with a timestamp
    And the input field should be cleared

  Scenario: Multiple transcript entries accumulate
    Given a session is active
    When the DM adds transcript entry "Player asks about the map"
    And the DM adds transcript entry "DM describes the merchant"
    Then the transcript panel should show 2 entries in order

  # --- PULL SUGGESTIONS ---

  Scenario: DM clicks Suggest and receives a suggestion card
    Given a session is active
    And the transcript contains "Let us go talk to the mayor"
    When the DM clicks the "Suggest" button
    Then a suggestion card should appear in the panel
    And the card should display a type icon, title, and body

  Scenario: DM clicks Suggest with irrelevant transcript
    Given a session is active
    And the transcript contains "Pass the chips"
    And the LLM will respond with NONE
    When the DM clicks the "Suggest" button
    Then no new suggestion card should appear

  # --- PANIC BUTTONS ---

  Scenario: DM clicks Phones Out panic button
    Given a session is active
    When the DM clicks the "Phones Out" panic button
    Then a suggestion card should appear with source "Panic"
    And the panic button should show a loading state while generating

  Scenario: DM clicks Need an NPC panic button
    Given a session is active
    When the DM clicks the "Need an NPC" panic button
    Then a suggestion card should appear with an NPC suggestion

  Scenario: DM clicks Recap panic button
    Given a session is active
    When the DM clicks the "Recap" panic button
    Then a suggestion card should appear with a session summary

  # --- AD-HOC QUESTIONS ---

  Scenario: DM asks a rules question
    Given a session is active
    When the DM types "How does grappling work?" in the question input
    And submits the question
    Then a suggestion card should appear with source "Q&A"
    And the question input should be cleared

  # --- SUGGESTION MANAGEMENT ---

  Scenario: DM pins a suggestion
    Given a session is active
    And a suggestion card is displayed
    When the DM clicks the pin button on the suggestion
    Then the suggestion should move to the pinned section

  Scenario: DM dismisses a suggestion
    Given a session is active
    And a suggestion card is displayed
    When the DM clicks the dismiss button on the suggestion
    Then the suggestion should be removed from the panel

  # --- STATUS BAR ---

  Scenario: Status bar shows provider info
    Then the status bar should display the provider name
    And the provider connection status should be visible

  Scenario: Status bar shows suggestion count
    Given a session is active
    And 2 suggestions have been generated
    Then the status bar should show "2 suggestions"
