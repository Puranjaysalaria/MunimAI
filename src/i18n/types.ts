export type LanguageCode = 'hi' | 'pa' | 'en' | 'mr' | 'bn' | 'gu' | 'ta';

export interface Translations {
  appName: string;
  tagline: string;
  tabs: {
    home: string;
    ledger: string;
    stock: string;
    today: string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    phoneLabel: string;
    phonePlaceholder: string;
    getOtp: string;
    otpTitle: string;
    otpSubtitle: string;
    verifyOtp: string;
    setPinTitle: string;
    setPinSubtitle: string;
    enterPinTitle: string;
    enterPinSubtitle: string;
    savePin: string;
    unlock: string;
    demoLogin: string;
    invalidPhone: string;
    invalidOtp: string;
    invalidPin: string;
    switchUser: string;
  };
  voice: {
    tapToSpeak: string;
    listening: string;
    thinking: string;
    success: string;
    noiseError: string;
    retry: string;
    cancel: string;
    confirmHaan: string;
    confirmNahi: string;
    typeFallback: string;
    typePlaceholder: string;
    micPermissionDenied: string;
    recentSuggestions: string;
  };
  ledger: {
    title: string;
    searchPlaceholder: string;
    totalOwed: string;
    totalReceived: string;
    customerCount: string;
    filterAll: string;
    filterOwed: string;
    filterSettled: string;
    remindAllOver1000: string;
    recordCustomerProof: string;
    proofPlaying: string;
    proofPlay: string;
    trustScore: string;
    creditLimit: string;
    recordPayment: string;
    giveCredit: string;
  };
  stock: {
    title: string;
    lowStockNotice: string;
    daysLeft: string;
    dailyAvg: string;
    orderFromSupplier: string;
    filterAll: string;
    filterLow: string;
    supplierOrders: string;
    reorderSuggested: string;
  };
  today: {
    title: string;
    totalSales: string;
    creditGiven: string;
    cashCollected: string;
    expenses: string;
    estimatedProfit: string;
    txCount: string;
    voiceSummaryButton: string;
  };
  confirmCard: {
    title: string;
    saleConfirm: string;
    creditConfirm: string;
    paymentConfirm: string;
    expenseConfirm: string;
    amountLabel: string;
    customerLabel: string;
    itemsLabel: string;
    speechPrompt: string;
    haanButton: string;
    nahiButton: string;
    undoButton: string;
  };
  disambiguation: {
    title: string;
    subtitle: string;
    selectPrompt: string;
  };
  proofModal: {
    title: string;
    consentNotice: string;
    instruction: string;
    recording: string;
    done: string;
    playback: string;
    save: string;
    retry: string;
  };
  reminders: {
    title: string;
    previewTitle: string;
    sendViaShare: string;
    sendViaSms: string;
    sendAllButton: string;
    upiIncluded: string;
  };
  settings: {
    title: string;
    language: string;
    shopDetails: string;
    upiId: string;
    voiceFeedback: string;
    privacy: string;
    logout: string;
    appVersion: string;
    staffRoleNotice: string;
  };
}
