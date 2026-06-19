// ════════════════════════════════════════════════════════════════
//  HOUSEHOLD
//  Placeholder functions for future shared household features.
//  These will be implemented during the setup flow phase.
// ════════════════════════════════════════════════════════════════

const _HH_WORDS_A = [
  'LILAC','ROSE','EMBER','WILLOW','DAISY','MAPLE','IVY','CLOVER',
  'AMBER','HONEY','MEADOW','SUNSET','SPARROW','MOSS','FERN',
  'HAZEL','SAGE','BRIAR','LAUREL','WREN'
];

const _HH_WORDS_B = [
  'MOON','STAR','CLOUD','RIVER','SPARK','BLOOM','BREEZE','GLOW',
  'NEST','SKY','HARBOR','FIELD','GARDEN','PATH','VALE',
  'GROVE','STONE','BROOK','HAVEN','RIDGE'
];

function generateInviteCode() {
  const a   = _HH_WORDS_A[Math.floor(Math.random() * _HH_WORDS_A.length)];
  const b   = _HH_WORDS_B[Math.floor(Math.random() * _HH_WORDS_B.length)];
  const num = String(Math.floor(Math.random() * 900) + 100); // 100–999
  return `${a}-${b}-${num}`;
}

function createHousehold() {
  // TODO: create a new household document in Firestore
  //       assign householdId, store invite code, set owner
}

function joinHousehold(inviteCode) {
  // TODO: look up household by inviteCode in Firestore
  //       add current user to household members
}
