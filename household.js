// ════════════════════════════════════════════════════════════════
//  HOUSEHOLD
//  Placeholder functions for future shared household features.
//  These will be implemented during the setup flow phase.
// ════════════════════════════════════════════════════════════════

function generateInviteCode() {
  // TODO: generate a unique invite code and store in Firestore
}

function createHousehold() {
  // TODO: create a new household document in Firestore
  //       assign householdId, store invite code, set owner
}

function joinHousehold(inviteCode) {
  // TODO: look up household by inviteCode in Firestore
  //       add current user to household members
}
