const colors = {
  // Backgrounds
  backgroundDark: '#1e140d',
  backgroundPaper: '#f4ead7',
  backgroundOverlay: 'rgba(24, 16, 12, 0.12)',
  backgroundInput: 'rgba(35, 24, 16, 0.62)',
  backgroundInputLight: '#f8efdf',
  backgroundCard: '#3b1901',
  backgroundCardTransparent: '#33160000',

  // Text
  textPrimary: '#f8f1e2',
  textSecondary: '#d0c0a6',
  textMuted: '#edd9b4',
  textDark: '#573505',
  textBlack: '#000000',
  textPlaceholder: '#8f7250',
  textPlaceholderCool: '#64748b',
  textInputDark: '#4d3625',
  textParchment: '#f4ead7',
  textParchmentDark: '#3b2a1d',
  textName: '#554011',
  textRole: '#d3c2a4',
  textRoleParchment: '#e9dcc6',
  textOnTexture: '#f2e4ca',
  textOnTextureSubtle: '#efdcbb',
  textStatus: '#f3e8d0',

  // Accents
  error: '#ffcac0',
  errorDark: '#f3b3a4',
  errorInline: '#9c3f32',
  errorButton: '#b35b4a',
  errorButtonBg: '#f1d0c6',
  errorButtonText: '#6b2f25',
  success: '#5f7a45',

  // Overlay
  backgroundOverlayPanel: 'rgba(244, 234, 215, 0.98)',
  textOverlayHeading: '#4b3420',
  textOverlayBody: '#6f4e2e',
  textOverlayAccent: '#6b4a2a',

  // Pill buttons
  pillDefaultBg: '#f2e3c7',
  pillDefaultBorder: '#8a6a3a',
  pillDefaultText: '#5a4028',
  pillDangerBg: '#f1d0c6',
  pillDangerBorder: '#b35b4a',
  pillDangerText: '#6b2f25',

  // Borders
  borderLight: '#dec39e',
  borderInput: '#c2a377',
  borderCard: '#6f4e2e',
  borderCardTransparent: '#c9a87a00',
  borderOverlay: '#c9a87a',

  // Top bar
  backgroundTopBar: '#3b2a1d',
  backgroundTopBarParchment: '#f0e2c9',
  textAvatarName: '#f3e8d0',
  textAvatarNameParchment: '#5f4325',
  hpFill: 'rgba(43, 120, 50, 0.30)',

  // Combat
  backgroundCombatCard: '#2a1d14',
  combatTitle: '#f3e8d0',
  combatTitleEmbedded: '#47332a',
  combatRound: '#422c05',
  combatRoundEmbedded: '#3f270c',
  combatOutcome: '#9ad18b',
  combatOutcomeEmbedded: '#5f7a45',
  combatHealthLabel: '#e8d7bf',
  combatHealthLabelEmbedded: '#6b4a2a',
  combatHealthBarBg: '#371c0087',
  combatHealthFill: '#1ccf1669',
  combatEnemyFill: '#f4000057',
  combatHealthValue: '#d3c2a4',
  combatHealthValueEmbedded: '#6e5043',
  combatLog: '#d8c8b0',
  combatLogEmbedded: '#5a4330',
  combatWaiting: '#d3c2a4',
  combatWaitingEmbedded: '#6e5043',

  // Emote
  emoteLauncherBg: '#403108',
  emoteLauncherBorder: '#d4b020',
  errorBadgeBg: 'rgba(91, 32, 26, 0.94)',
  errorBadgeBorder: '#a53f36',
  errorBadgeText: '#f8e2dd',
  emoteMenuCircleBorder: 'rgba(229, 219, 196, 0.82)',
  emoteMenuCircleBg: 'rgba(28, 42, 46, 0.42)',
  emoteKnobBorder: '#f4ead7',
  emoteKnobBg: 'rgba(25, 77, 67, 0.9)',
  emoteBubbleBorder: '#d8c49f',
  emoteBubbleBg: 'rgba(244, 234, 215, 0.96)',
  emoteBubbleText: '#4f3824',
  emoteBubbleHighlightBg: '#244d44',
  emoteToastBg: 'rgba(34, 27, 20, 0.92)',
  emoteToastBorder: '#d4c19e',
  emoteToastName: '#d8c49f',

  // Scene options
  warningText: '#f0b872',
  riskyBadgeBg: '#6a2a1c',
  riskyBadgeText: '#f7d2c9',
  optionSelectedBorder: '#d2a869',
  optionResolvedBorder: '#8ac27a',
  optionSelectedBg: '#4b3624',
  confirmBg: '#6b4428',
  confirmBorder: '#a57a4a',
  textVoteSummary: '#c9b69a',
  textSelected: '#e2d4ba',

  // Intent
  intentConfirmedBorder: '#ffb300',

  // Tabs
  tabBg: '#2a1d14',
  tabBorder: '#7a5c3a',
  tabActiveBg: '#5a3a22',
  tabActiveBorder: '#c9a87a',
  tabText: '#d3c2a4',
  tabActiveText: '#f7f0df',

  // Action sub-text
  textSubAction: '#f0d6a7',
  textPhaseLabel: '#e0bf88',
  textDisabledAction: '#c9b69a',

  // Action card
  actionActiveBg: '#4b3624',
  actionSelectedBg: '#5a3e27',
  actionSelectedBorder: '#d9be8f',
  hpNegative: '#e39b8e',

  // Subtitle
  subtitleLight: '#f1ddbc',

  // Status tones
  statusReady: '#2f3a26',
  statusReadyBorder: '#7fbf72',
  statusReadyParchment: '#dfe9d0',
  statusWaiting: '#4a3824',
  statusWaitingBorder: '#d6b25d',
  statusWaitingParchment: '#efe3c9',
  statusNeutral: '#2f2319',
  statusNeutralBorder: '#7a5c3a',
  statusNeutralParchment: '#eadcc9',
  statusNeutralParchmentBorder: '#b48a54',
  statusOffline: '#4a2219',
  statusOfflineBorder: '#b35b4a',
  statusOfflineParchment: '#f1d0c6',

  // Story feed
  textTransition: '#7a5c39',
  textDialogue: '#413129',

  // Timed
  timedBarBg: '#4a270f66',
  timedBarFill: '#f08d2b',
  timedFinishBorder: '#a57a4a66',
  timedFinishBorderEmbedded: '#8b674866',
  timedFinishText: '#d6b48d',
  timedFinishTextEmbedded: '#7b5d46',

  // Header
  dotsButtonBg: 'rgba(36, 27, 19, 0.55)',
} as const;

export { colors };
